const Session = require('../models/Session');
const File = require('../models/File');
const vectorService = require('../services/vectorService');
const aiService = require('../services/aiService');

// server/controllers/chatController.js

// 1. INITIALIZE A NEW SESSION
exports.initializeSession = async (req, res) => {
  try {
    const { fileIds } = req.body;
    const userId = req.auth.userId;

    if (!fileIds || fileIds.length === 0) {
      return res.status(400).json({ error: "No files selected." });
    }

    // A. Fetch file details
    const files = await File.find({ _id: { $in: fileIds }, userId });

    // B. Generate Title & Summary
    const combinedSummaries = files.map(f => f.summary).join("\n\n");

    // Improved Prompt: Explicitly asks for NO markdown
    const prompt = `
      Analyze these document summaries:
      ${combinedSummaries.substring(0, 5000)} 
      
      Task:
      1. Create a short, catchy title (max 6 words).
      2. Write a 2-sentence welcome message explaining what these docs cover.
      3. Return ONLY valid JSON matching this structure: { "title": "...", "summary": "..." }
      4. Do NOT use markdown formatting like \`\`\`json. Just return the raw JSON object.
    `;

    // Default Fallback
    let aiData = {
      title: "Study Session",
      summary: "I've loaded your files. How can I help you with them?"
    };

    try {
      // Call AI
      const raw = await aiService.generateRaw(prompt);
      console.log("🔹 AI Raw Response:", raw);

      if (raw && typeof raw === 'string') {
        // --- CLEANER LOGIC ---
        let cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
          try {
            aiData = JSON.parse(cleanJson);
          } catch (p) {
            console.warn("⚠️ JSON Parse Error:", p.message);
          }
        }
      } else {
        console.warn("⚠️ AI returned null/invalid.");
      }
    } catch (e) {
      console.warn("⚠️ AI Parsing Failed:", e.message);
      console.warn("Using default title/summary.");
    }

    // C. Create Session in DB
    const newSession = new Session({
      name: aiData.title,
      userId,
      sourceFiles: fileIds,
      aiTitle: aiData.title,
      aiSummary: aiData.summary,
      messages: []
    });

    await newSession.save();
    res.status(201).json(newSession);

  } catch (error) {
    console.error("Init Session Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2. SEND MESSAGE
exports.sendMessage = async (req, res) => {
  try {
    const { sessionId, message, styleInstruction } = req.body;
    const userId = req.auth.userId;

    // A. Verify Session
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    // B. Build Context via RAG (Vector Search)
    // 1. Generate Embedding for User Query
    const queryVector = await aiService.generateEmbedding(message);

    let contextData = "";

    if (queryVector) {
      // 2. Search Pinecone (Filter by fileIds in this session)
      // This solves the "Missing Session ID" issue because we filter by fileId, which always exists!
      const vectorMatches = await vectorService.queryVector(queryVector, {
        fileId: { $in: session.sourceFiles.map(id => id.toString()) }
      });

      // 3. Construct Context from Matches
      // We deduplicate based on text to avoid repeating the same chunk
      const uniqueTexts = [...new Set(vectorMatches.map(match => match.metadata.text))];
      contextData = uniqueTexts.join("\n\n---\n\n");

      console.log(`🔍 RAG Retrieved ${uniqueTexts.length} chunks for context.`);
    } else {
      console.warn("⚠️ Failed to generate embedding for query. Falling back to empty context.");
    }

    // C. Define Instruction (The Override Logic)
    const finalInstruction = styleInstruction || "Keep it concise and direct (approx 2 sentences).";

    // D. Call AI
    const aiResponseText = await aiService.generateResponse(message, contextData, finalInstruction);

    // E. Save & Return
    const newMessage = { role: 'user', content: message };
    const aiMessage = { role: 'assistant', content: aiResponseText };

    session.messages.push(newMessage, aiMessage);
    session.lastActive = Date.now();
    await session.save();

    res.json(session.messages[session.messages.length - 1]);

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 3. UPDATE LAST MESSAGE (When Generation is Stopped)
exports.updateLastMessage = async (req, res) => {
  try {
    const { sessionId, content } = req.body;
    const userId = req.auth.userId;

    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.messages.length > 0) {
      const lastMessageIndex = session.messages.length - 1;
      const lastMessage = session.messages[lastMessageIndex];

      if (lastMessage.role === 'assistant') {
        session.messages[lastMessageIndex].content = content;
        await session.save();
        return res.json(session.messages[lastMessageIndex]);
      }
    }

    res.status(400).json({ error: "Last message is not an assistant message." });

  } catch (error) {
    console.error("Update Last Message Error:", error);
    res.status(500).json({ error: error.message });
  }
};