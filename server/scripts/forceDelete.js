const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load keys correctly
const cloudinary = require('cloudinary').v2;

// Configure
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get ID from terminal
const publicId = process.argv[2];

if (!publicId) {
    console.log("❌ Please provide the Public ID!");
    console.log("Usage: node scripts/forceDelete.js <public_id>");
    process.exit(1);
}

const forceDelete = async () => {
    console.log(`💀 Attempting to FORCE DELETE: ${publicId}`);

    // Try deleting as 'image' first
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });

    if (result.result === 'not found') {
        console.log("⚠️ Not found as Image. Trying as RAW file...");
        // Try deleting as 'raw' (for PDFs, TXT, DOCX)
        result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true });
    }

    if (result.result === 'ok') {
        console.log(`✅ SUCCESS: File annihilated from the cloud.`);
    } else {
        console.log(`❌ FAILURE: Cloudinary said: ${result.result}`);
    }
};

forceDelete();