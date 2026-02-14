const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

// 1. Load Environment Variables
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const inspectVectors = async () => {
    console.log('🚀 Starting Vector Inspection...');

    const vectorIds = ['6990801a00ad677f7139bf50', '69907d3600ad677f7139bf2a'];

    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
        console.error('❌ Missing Pinecone configuration in .env');
        process.exit(1);
    }

    try {
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX_NAME);

        console.log(`📡 Fetching from index: ${process.env.PINECONE_INDEX_NAME}`);

        // 3. Fetch Vectors (latest SDK uses .records)
        const response = await index.namespace('').fetch(vectorIds);

        vectorIds.forEach(id => {
            // Note: In newer SDKs, records is an object indexed by ID
            const record = response.records[id];

            if (record) {
                console.log(`\n✅ Vector Found: ${id}`);
                console.log('------------------------------------------------');

                const meta = record.metadata || {};
                console.log(`👉 Session ID:  ${meta.sessionId || 'MISSING'}`);
                console.log(`👉 File ID:     ${meta.fileId || 'MISSING'}`);
                console.log(`👉 File Name:   ${meta.fileName || 'MISSING'}`);

                const textContent = meta.text || '';
                console.log(`👉 Text Length:  ${textContent.length}`);
                console.log(`👉 Text Preview: ${textContent.substring(0, 100)}...`);

                if (!textContent) {
                    console.warn('⚠️  WARNING: This vector has NO text content. RAG will fail.');
                }
            } else {
                console.log(`\n❌ Vector NOT Found: ${id} (Check if it was uploaded to a different namespace)`);
            }
        });

    } catch (err) {
        console.error('❌ Inspection Failed:', err.message);
    }
};

inspectVectors();