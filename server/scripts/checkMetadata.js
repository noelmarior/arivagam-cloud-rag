const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pinecone } = require('@pinecone-database/pinecone');

const checkMetadata = async () => {
    console.log(`🚀 Starting Global Audit...`);
    try {
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX_NAME);

        // Fetch ANY 10 vectors to see their internal structure
        const queryResponse = await index.namespace('').query({
            vector: Array(3072).fill(0), // Dummy vector for broad discovery
            topK: 10,
            includeMetadata: true
        });

        if (queryResponse.matches.length === 0) {
            console.log("❌ The Index is TOTALLY EMPTY. Your upload logs lied or used a different Index.");
            return;
        }

        const report = queryResponse.matches.map(match => {
            const m = match.metadata || {};
            return {
                "File Name": m.fileName || 'MISSING',
                "Session ID": m.sessionId || 'MISSING',
                "File ID": m.fileId || 'MISSING',
                "Text Size": m.text ? `${m.text.length} chars` : 'EMPTY'
            };
        });

        console.table(report);

    } catch (err) {
        console.error('❌ Audit Error:', err.message);
    }
};

checkMetadata();