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
       const raw = await aiService.generateResponse(prompt, "");
       console.log("🔹 AI Raw Response:", raw); // Log it so we can see what the AI sent

       // --- CLEANER LOGIC ---
       // 1. Remove markdown code blocks if present
       let cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
       
       // 2. Extract only the part between { and }
       const firstBrace = cleanJson.indexOf('{');
       const lastBrace = cleanJson.lastIndexOf('}');
       
       if (firstBrace !== -1 && lastBrace !== -1) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
          aiData = JSON.parse(cleanJson); // Parse the cleaned string
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
    // CHANGE: We now accept 'styleInstruction' directly from the frontend
    const { sessionId, message, styleInstruction } = req.body; 
    const userId = req.auth.userId;

    // A. Verify Session
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    // B. Build Context
    const files = await File.find({ _id: { $in: session.sourceFiles } });
    const contextData = files.map(f => `[Source: ${f.fileName}]\n${f.content || f.summary}`).join("\n\n");

    // C. Define Instruction (The Override Logic)
    // If user sent a custom style, use it. Otherwise, use a default "Concise" mode.
    const finalInstruction = styleInstruction || "Keep it concise and direct (approx 2 sentences).";

    // D. Call AI
    const aiResponseText = await aiService.generateResponse(message, contextData, finalInstruction);

    // E. Save & Return
    const newMessage = { role: 'user', content: message };
    const aiMessage = { role: 'assistant', content: aiResponseText };

    session.messages.push(newMessage, aiMessage);
    session.lastActive = Date.now();
    await session.save();

    res.json(aiMessage);

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
};