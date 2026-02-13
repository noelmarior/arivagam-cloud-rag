
const fs = require('fs');
const path = require('path');

// 1. Mock the GoogleGenerativeAI class
class MockGoogleGenerativeAI {
    constructor(apiKey) {
        console.log("Mock GoogleGenerativeAI initialized with key:", apiKey ? "***" : "undefined");
    }
    getGenerativeModel(config) {
        return {
            generateContent: async (prompt) => {
                return {
                    response: {
                        text: () => "Mock response from Gemini"
                    }
                };
            },
            embedContent: async (text) => {
                return {
                    embedding: { values: [0.1, 0.2, 0.3] }
                };
            }
        };
    }
}

// 2. Intercept the require call for @google/generative-ai
try {
    const genAIPath = require.resolve('@google/generative-ai');
    require.cache[genAIPath] = {
        id: genAIPath,
        filename: genAIPath,
        loaded: true,
        exports: {
            GoogleGenerativeAI: MockGoogleGenerativeAI
        }
    };
    console.log("Successfully mocked @google/generative-ai");
} catch (e) {
    console.warn("Could not find @google/generative-ai to mock. The test might fail if it tries to use the real one and network/key is missing.");
    // We can't easily mock it if we can't resolve it, but we can try to proceed.
}

// 3. Import the service
const aiService = require('./services/aiService');

// 4. Run the test
async function testRateLimit() {
    console.log("Starting Rate Limit Test...");
    let successCount = 0;
    let rateLimitCount = 0;

    // Attempt 20 calls
    for (let i = 1; i <= 20; i++) {
        try {
            // We use a try-catch to catch the rate limit error
            await aiService.generateResponse("test", "context", "short");
            successCount++;
            console.log(`Request ${i}: Success`);
        } catch (error) {
            if (error.message && error.message.includes("429")) {
                rateLimitCount++;
                console.log(`Request ${i}: Rate Limited (Expected)`);
            } else {
                console.log(`Request ${i}: Error - ${error.message}`);
            }
        }
    }

    console.log("\nResults:");
    console.log(`Successful Calls: ${successCount}`);
    console.log(`Rate Limited Calls: ${rateLimitCount}`);

    if (successCount === 15 && rateLimitCount === 5) {
        console.log("SUCCESS: Rate limiter logic is working correctly (15 allowed, 5 blocked).");
    } else {
        console.error("FAILURE: Rate limiter logic is incorrect.");
        process.exit(1);
    }
}

testRateLimit();
