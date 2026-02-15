const { Pinecone } = require('@pinecone-database/pinecone');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const auditVectorSync = async () => {
    console.log('📡 Connecting to Pinecone Index...');

    try {
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX_NAME);

        // 1. Fetch Index Statistics
        const stats = await index.describeIndexStats();
        const totalCount = stats.totalRecordCount || 0;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 TOTAL VECTORS IN INDEX: ${totalCount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (totalCount === 0) {
            console.log('🟢 STATUS: Index is EMPTY. (Ideal after resetSystem.js)');
        } else {
            console.log(`🟡 STATUS: Index contains ${totalCount} records.`);
            console.log('👉 If you just deleted a file, this number should have decreased.');
        }

    } catch (err) {
        console.error('❌ Audit Failed:', err.message);
    }
};

auditVectorSync();