const path = require('path');
// ✅ FIX: Use __dirname to find .env relative to THIS file, not the command line
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const publicId = process.argv[2]; // Get ID from command line

if (!publicId) {
    console.error("❌ Please provide a Public ID!");
    console.log("Usage: node scripts/checkCloud.js <public_id>");
    process.exit(1);
}

const checkFile = async () => {
    console.log(`🔎 Checking Cloudinary for: ${publicId}...`);

    try {
        // Try to get details of the file (image or raw)
        // We check both types because we store PDFs as 'raw' and Images as 'image'
        try {
            const res = await cloudinary.api.resource(publicId);
            console.log(`✅ FOUND (Image/PDF): ${res.secure_url}`);
            console.log(`   - Format: ${res.format}`);
            console.log(`   - Size: ${res.bytes} bytes`);
        } catch (e) {
            // If image search fails, try raw
            const resRaw = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
            console.log(`✅ FOUND (Raw File): ${resRaw.secure_url}`);
            console.log(`   - Size: ${resRaw.bytes} bytes`);
        }

    } catch (error) {
        if (error.error && error.error.http_code === 404) {
            console.log("❌ STATUS: File NOT FOUND on Cloudinary (Deleted).");
        } else {
            console.error("⚠️ Error checking Cloudinary:", error.message || error);
        }
    }
};

checkFile();