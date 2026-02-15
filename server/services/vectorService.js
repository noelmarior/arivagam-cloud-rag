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

// Batch Upsert
exports.upsertBatch = async (vectors) => {
  try {
    if (!vectors || vectors.length === 0) return;
    await index.upsert(vectors);
    console.log(`✅ Batch Upserted ${vectors.length} vectors.`);
  } catch (error) {
    console.error("Pinecone Batch Upsert Error:", error);
    throw error;
  }
};

// Query Vector
exports.queryVector = async (vector, filter = {}) => {
  try {
    const queryRequest = {
      vector: vector,
      topK: 5, // Increased to 5 for better context
      includeMetadata: true
    };

    // Apply Filter if provided (e.g., { fileId: { $in: [...] } })
    if (filter && Object.keys(filter).length > 0) {
      queryRequest.filter = filter;
    }

    const queryResponse = await index.query(queryRequest);
    return queryResponse.matches;
  } catch (error) {
    console.error("Pinecone Query Error:", error);
    throw error;
  }
};

exports.deleteVector = async (fileId) => {
  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.PINECONE_INDEX_NAME);

    // LOGIC: Starter Indexes do not support delete-by-metadata.
    // We must Query IDs first, then Delete by IDs.
    const filter = { fileId: { $eq: fileId } };

    // 1. Fetch matching vector IDs (Limit 1000 chunks max per file)
    const queryResponse = await index.query({
      vector: Array(3072).fill(0), // Use dummy vector (Dimension must match index!)
      topK: 1000,
      filter: filter,
      includeValues: false,
      includeMetadata: false
    });

    const matches = queryResponse.matches;
    if (matches.length > 0) {
      const idsToDelete = matches.map(m => m.id);
      console.log(`🔍 Found ${idsToDelete.length} vectors to delete for file ${fileId}`);

      // 2. Delete by IDs
      await index.deleteMany(idsToDelete);
      console.log(`✅ Deleted ${idsToDelete.length} vectors.`);
    } else {
      console.log(`⚠️ No vectors found for file ${fileId} to delete.`);
    }

  } catch (error) {
    console.error("❌ Pinecone Delete Error:", error.message);
    throw error;
  }
};