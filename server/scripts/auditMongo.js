const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const File = require('../models/File'); // Adjust path based on your folder structure

// 1. Load Environment Variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const auditMongo = async () => {
    console.log('🚀 Connecting to MongoDB Atlas...');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        // 2. Fetch all file records
        // Note: You can filter by a specific userId if you want to be precise
        const files = await File.find({}).select('_id fileName originalPath viewablePath createdAt userId');

        if (files.length === 0) {
            console.log('\n📭 MongoDB: No file records found. The collection is empty.');
        } else {
            console.log(`\n📊 Found ${files.length} records in MongoDB:`);
            console.table(files.map(f => ({
                ID: f._id.toString().slice(-6), // Shortened for readability
                FileName: f.fileName,
                Original: f.originalPath ? '✅' : '❌',
                Viewable: f.viewablePath ? '✅' : '❌',
                User: f.userId ? f.userId.toString().slice(-6) : 'N/A',
                Date: f.createdAt.toLocaleString()
            })));
        }

    } catch (err) {
        console.error('❌ Audit Failed:', err.message);
    } finally {
        // 3. Clean Exit
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed.');
    }
};

auditMongo();