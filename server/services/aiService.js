const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Generate Embedding (Vector)
// Model: text-embedding-004 (Output: 768 dimensions)
exports.generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004"});
    const result = await model.embedContent(text);
    return result.embedding.values; 
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    throw error;
  }
};

// 2. Generate Summary
// Model: gemini-1.5-flash (Fast & Free)
exports.generateSummary = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
    const prompt = `Summarize the following text in 3 concise bullet points:\n\n${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    throw error;
  }
};