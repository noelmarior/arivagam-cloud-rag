const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Generate Embedding (Vector)
// Model: gemini-embedding-001 (Output: 3072 dimensions)
exports.generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const cleanText = text.replace(/\0/g, '').trim().substring(0, 9000);
    const result = await model.embedContent(cleanText);
    const vector = result.embedding.values;
    if (!vector || vector.length === 0) return null;
    return vector;
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    return null;
  }
};

// 2. Generate Summary
// Model: gemini-2.5-flash (Fast & Free)
exports.generateSummary = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Summarize the following text in 3 concise bullet points:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Summary Error:", error);

    // Dynamic 429 Error Handling
    if (error.message?.includes('429') || error.status === 429) {
      // 1. Get current time in IST (UTC + 5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istTime = new Date(utcTime + istOffset);

      // 2. Set Target: 1:30 PM (13:30) IST
      const resetTime = new Date(istTime);
      resetTime.setHours(13, 30, 0, 0);

      // 3. If passed 1:30 PM, target tomorrow
      if (istTime > resetTime) {
        resetTime.setDate(resetTime.getDate() + 1);
      }

      // 4. Calculate Duration
      const diffMs = resetTime - istTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `Not able to produce AI Summary due to daily rate limit, try deleting and uploading again after ${hours} hrs ${mins} mins`;
    }

    throw error;
  }
};

// Rate Limiter Logic
let requestCount = 0;
// Reset counter every 60 seconds
setInterval(() => {
  requestCount = 0;
}, 60000);

// 3. Raw Generation (No System Persona) - For JSON tasks
exports.generateRaw = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Raw Gen Error:", error);
    return null;
  }
};

// 3. THE NEW HYBRID LOGIC ENGINE
exports.generateResponse = async (userMessage, contextText, lengthInstruction) => {
  // Rate Limit Check
  if (requestCount >= 15) {
    throw new Error("429: Too many requests. Please wait a minute and try again.");
  }
  requestCount++;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // The "Brain" of your application
    const prompt = `
      You are a strict but helpful academic tutor. You have access to specific SOURCE MATERIALS provided below.
      
      --------------------------
      SOURCE MATERIALS:
      ${contextText.substring(0, 30000)} 
      --------------------------

      USER QUESTION: "${userMessage}"
      
      TARGET LENGTH/STYLE: ${lengthInstruction}

      YOUR INSTRUCTIONS (STRICT EXECUTION ORDER):

      1. **RELEVANCE GUARDRAIL**: 
         - First, analyze if the USER QUESTION is related to the topics, concepts, or keywords found in the SOURCE MATERIALS.
         - If the question is completely unrelated (e.g., asking about Biology when sources are about Computer Science), you MUST reply exactly (ensure space between "I" and "cannot"):
           "I cannot find information about this topic in the provided sources. Please ask something related to your materials."
         - Do NOT attempt to answer off-topic questions.

      2. **HYBRID ANSWERING (The Gap-Filling Rule)**:
         - If the question IS relevant, check the volume of information available in the sources.
         - **Scenario A (Sufficient Info):** If the sources have enough detail to meet the TARGET LENGTH, use ONLY the sources.
         - **Scenario B (Insufficient Info):** If the sources mention the topic but are too brief (e.g., source has 30 words, target is 120 words), you MUST **fill the gap** using your own general knowledge.
         - **Crucial:** Blend the source info and your knowledge seamlessly. Do not say "I am adding this..." or "The source is short." Just write a cohesive, high-quality answer.
      
      3. **FORMATTING**:
         - Use **bold** for key terms.
         - Use bullet points for lists.
         - Adhere strictly to the TARGET LENGTH.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();

  } catch (error) {
    console.error("AI Response Error:", error);

    // 1. Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);

    // 2. Set the target to today at 13:30 (1:30 PM)
    const resetTime = new Date(istTime);
    resetTime.setHours(13, 30, 0, 0);

    // 3. If it's already past 13:30, the reset is tomorrow (though 429s usually reset daily)
    if (istTime > resetTime) {
      resetTime.setDate(resetTime.getDate() + 1);
    }

    // 4. Calculate Difference
    const diffMs = resetTime - istTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeString = `${diffHours} hrs ${diffMins} mins`;

    return `Maximum number of requests exceeded. Please try again in ${timeString}.`;
  }
};