// server/config/validateEnv.js
const requiredVars = [
    'MONGO_URI',
    'GEMINI_API_KEY'
    // 'PINECONE_API_KEY' // Uncomment if/when you use Pinecone directly
];

const validateEnv = () => {
    const missing = requiredVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error("------------------------------------------------");
        console.error("❌ FATAL ERROR: Missing Environment Variables");
        console.error(`   Missing: ${missing.join(', ')}`);
        console.error("   Check your .env file.");
        console.error("------------------------------------------------");
        process.exit(1); // Kill the server immediately
    }
    
    console.log("✅ Environment checks passed.");
};

module.exports = validateEnv;