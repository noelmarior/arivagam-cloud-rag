const mongoose = require('mongoose');
const dotenv = require('dotenv');
const File = require('../models/File'); // Adjust path if needed

dotenv.config();

// 1. Define Dummy Data
// These are "Ghost Files" - they exist in the DB for UI testing, 
// but since we aren't uploading real PDFs, they won't have real vectors in Pinecone.
const seedFiles = [
  {
    fileName: "Project_Alpha_Specs.pdf",
    fileType: "pdf",
    content: "This is a dummy content for Project Alpha specifications...",
    summary: "• Detailed specifications for the Alpha prototype.\n• Timeline includes Q1 testing.\n• Budget constraints are highlighted.",
    pineconeId: "dummy-id-1", 
    createdAt: new Date()
  },
  {
    fileName: "Meeting_Notes_Q1.txt",
    fileType: "txt",
    content: "Meeting held on Jan 15th regarding marketing strategy...",
    summary: "• Discussed Q1 marketing goals.\n• Social media budget increased by 15%.\n• New hiring plan approved.",
    pineconeId: "dummy-id-2",
    createdAt: new Date()
  },
  {
    fileName: "React_Best_Practices.pdf",
    fileType: "pdf",
    content: "A guide to writing clean React hooks and components...",
    summary: "• Use functional components over class components.\n• Optimize re-renders with useMemo.\n• File structure recommendations.",
    pineconeId: "dummy-id-3",
    createdAt: new Date()
  }
];

const seedDB = async () => {
  try {
    // 2. Connect
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Connected to MongoDB for Seeding...");

    // 3. WIPE CLEAN (Dangerous in Prod, perfect for Dev)
    await File.deleteMany({});
    console.log("🧹 Cleared existing file metadata.");

    // 4. INSERT NEW
    await File.insertMany(seedFiles);
    console.log("🌱 Database seeded with 3 dummy files.");

    // 5. Exit
    process.exit();
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
};

seedDB();