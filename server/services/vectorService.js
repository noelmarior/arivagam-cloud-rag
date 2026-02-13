const { Pinecone } = require('@pinecone-database/pinecone');
const dotenv = require('dotenv');
dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Upsert (Upload) Vector
exports.upsertVector = async (id, vector, metadata) => {
  try {
    await index.upsert([{
      id: id,
      values: vector,
      metadata: metadata // Store basic info like filename inside Pinecone too
    }]);
    console.log(`Vector ${id} upserted.`);
  } catch (error) {
    console.error("Pinecone Upsert Error:", error);
    throw error;
  }
};

// Query Vector
exports.queryVector = async (vector) => {
  try {
    const queryResponse = await index.query({
      vector: vector,
      topK: 3, // Return top 3 results
      includeMetadata: true
    });
    return queryResponse.matches;
  } catch (error) {
    console.error("Pinecone Query Error:", error);
    throw error;
  }
};

exports.deleteVector = async (id) => { await index.deleteOne(id); };