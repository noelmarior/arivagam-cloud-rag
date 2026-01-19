const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testLibrary() {
  console.log("1. Inspecting Library...");
  console.log("   Type:", typeof pdfParse);
  console.log("   Keys:", Object.keys(pdfParse));

  try {
    console.log("\n2. Creating Dummy PDF Buffer...");
    // This reads package.json just to get some bytes, 
    // BUT pdf-parse needs real PDF headers. 
    // So we will try to read the file you actually have.
    
    // REPLACE THIS FILENAME with the exact name of a PDF inside your server folder
    // If you don't have one, copy 'DAA Unit 1 t.pdf' into the server folder.
    const pdfPath = './test.pdf'; 
    
    if (!fs.existsSync(pdfPath)) {
        console.log("❌ Error: test.pdf not found. Please put a PDF file named 'test.pdf' in the server folder.");
        return;
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    console.log(`   Read file. Size: ${dataBuffer.length} bytes.`);

    console.log("\n3. Attempting Parse...");
    const data = await pdfParse.PDFParse(dataBuffer);
    
    console.log("✅ SUCCESS!");
    console.log("   Text Preview:", data.text.substring(0, 100));

  } catch (error) {
    console.error("\n❌ CRASH REPORT:");
    console.error(error);
  }
}

testLibrary();