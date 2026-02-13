const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Generate Embedding (Vector)
// Model: text-embedding-004 (Output: 768 dimensions)
exports.generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
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
// Model: gemini-1.5-flash (Fast & Free)
exports.generateSummary = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Summarize the following text in 3 concise bullet points:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    throw error;
  }
};

// 3. THE NEW HYBRID LOGIC ENGINE
exports.generateResponse = async (userMessage, contextText, lengthInstruction) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
         - If the question is completely unrelated (e.g., asking about Biology when sources are about Computer Science), you MUST reply exactly:
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
    return "I'm having trouble analyzing the documents right now. Please try again.";
  }
};