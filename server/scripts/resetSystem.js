const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { Pinecone } = require('@pinecone-database/pinecone');

// 1. PATH FIX: Point to server/.env relative to this script
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// Import your models
const User = require('../models/User');
const File = require('../models/File');
const Folder = require('../models/Folder');
const Session = require('../models/Session');

const resetSystem = async () => {
    console.log('🚀 Starting System Reset...');
    console.log(`🔎 Reading .env from: ${envPath}`);

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing. Check if .env is actually in the server/ folder.");
        }

        // 2. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 3. Wipe Pinecone (Resetting for 3072-dimension readiness)
        if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
            try {
                const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
                const indexName = process.env.PINECONE_INDEX_NAME;
                const index = pc.index(indexName);

                console.log(`⏳ Checking data status for: ${indexName}`);
                const stats = await index.describeIndexStats();

                // If the index is already empty, don't attempt a delete (prevents 404)
                if (stats.totalRecordCount === 0) {
                    console.log('✅ Index is already empty. Skipping wipe.');
                } else {
                    // Target the default namespace specifically
                    await index.namespace('__default__').deleteAll();
                    console.log('🔥 Wiped Pinecone Index (Default Namespace)');
                }
            } catch (err) {
                // If it's still a 404, it just means the index is brand new/empty
                if (err.message.includes('404')) {
                    console.log('ℹ️ Index not yet initialized with data. Skipping wipe.');
                } else {
                    console.error('❌ Pinecone wipe failed:', err.message);
                }
            }
        }

        // 4. Wipe MongoDB Collections [cite: 2026-01-19]
        await Promise.all([
            User.deleteMany({}),
            File.deleteMany({}),
            Folder.deleteMany({}),
            Session.deleteMany({})
        ]);
        console.log('🗑️  Wiped MongoDB Collections');

        // 5. Wipe Physical Files from server/uploads
        const uploadsDir = path.resolve(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let count = 0;
            for (const file of files) {
                if (file !== '.gitkeep') {
                    fs.unlinkSync(path.join(uploadsDir, file));
                    count++;
                }
            }
            console.log(`📂 Deleted ${count} zombie files from disk`);
        }

        console.log('\n✨ System Clean. Start fresh.');

    } catch (err) {
        console.error('❌ Reset Failed:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

resetSystem();