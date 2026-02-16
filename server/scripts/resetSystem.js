const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pinecone } = require('@pinecone-database/pinecone');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

        // 5. Wipe Cloudinary Files (The "Nuke" Option) ☁️
        console.log("☁️  Cleaning up Cloudinary storage...");

        // Helper function to delete resources
        const deleteResources = async (resourceType) => {
            try {
                // 1. Fetch resources with the specific prefix (folder)
                const result = await cloudinary.api.resources({
                    type: 'upload',
                    prefix: 'arivagam_uploads/', // ✅ FIX: Added slash to target folder contents
                    resource_type: resourceType,
                    max_results: 500
                });

                if (!result.resources || result.resources.length === 0) {
                    return 0;
                }

                // 2. Extract Public IDs
                const publicIds = result.resources.map(res => res.public_id);

                // 3. Delete them
                if (publicIds.length > 0) {
                    // api.delete_resources is the Admin API method
                    const delResult = await cloudinary.api.delete_resources(publicIds, {
                        resource_type: resourceType,
                        invalidate: true
                    });

                    // Count successful deletions
                    // Cloudinary returns { deleted: { "id1": "deleted", "id2": "not_found" } }
                    const count = Object.values(delResult.deleted).filter(status => status === 'deleted').length;
                    return count;
                }
                return 0;

            } catch (innerErr) {
                // ✅ FIX: Better error logging
                // Sometimes error is just a string, sometimes an object
                const msg = innerErr.error ? innerErr.error.message : (innerErr.message || JSON.stringify(innerErr));
                console.warn(`⚠️  Could not wipe ${resourceType} files: ${msg}`);
                return 0;
            }
        };

        try {
            // Run for Images
            const deletedImages = await deleteResources('image');

            // Run for Raw files (PDFs, TXT, DOCX)
            const deletedRaw = await deleteResources('raw');

            const totalCloudDeleted = deletedImages + deletedRaw;

            if (totalCloudDeleted > 0) {
                console.log(`☁️  Deleted ${totalCloudDeleted} zombie files from Cloudinary (${deletedImages} images, ${deletedRaw} raw files).`);
            } else {
                console.log("☁️  Cloudinary storage is already clean.");
            }

        } catch (cloudErr) {
            console.error("❌ Cloudinary cleanup fatal error:", cloudErr);
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