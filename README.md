# AI Document Analysis Engine
This repository contains the backend for an AI-powered, RAG-based (Retrieval Augmented Generation) Document Analysis system.  
The system supports uploading documents (PDF/TXT), extracting text, generating AI summaries and embeddings, storing vectors in Pinecone, and performing semantic search over uploaded content.

This README is the **contract** between backend and frontend.

## 📦 Project Structure

root/
├── README.md
├── .gitignore
├── server/
│   ├── config/          # Database & external service configuration
│   ├── controllers/     # Request handling logic
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # AI + Vector DB logic
│   ├── uploads/         # Temporary file storage
│   ├── .env             # Environment variables (NOT committed)
│   ├── server.js        # Application entry point
│   └── package.json

## 🚀 Quick Start

### 1. Prerequisites

You must have the following installed or available:
- Node.js **v18+**
- MongoDB (Atlas or local)
- OpenAI API Key (for summaries + embeddings)
- Pinecone API Key (for vector search)

### 2. Installation

Navigate to the backend folder and install dependencies:

```bash
cd server
npm install
```

### 3. Environment Setup

Create a `.env` file inside the `server/` directory.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=workspace-index
```

⚠️ **Never commit `.env` to Git.**

### 4. Run the Server

```bash
# Development mode (auto-restart on file changes)
npm run dev
```

The server will start at:
http://localhost:5000

## 📡 API Documentation

### 1️⃣ Upload Document

Uploads a document, extracts text, generates AI summary and embeddings, stores vectors in Pinecone, and metadata in MongoDB.

**Endpoint**
```
POST /api/upload
```

**Request**
- Type: `multipart/form-data`
- Field:
  - `file`: PDF or TXT file

**Response**
```json
{
  "message": "File processed",
  "file": {
    "fileName": "example.pdf",
    "fileType": "pdf",
    "summary": "Short AI-generated summary..."
  }
}
```

**Notes**
- Only text-based PDFs are supported
- Scanned/image-only or encrypted PDFs will fail gracefully

### 2️⃣ Semantic Search

Searches documents using meaning-based (vector) similarity.

**Endpoint**
```
POST /api/search
```

**Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "query": "What is the budget for Q1?"
}
```

**Response**
```json
[
  {
    "score": 0.89,
    "fileName": "Project_Alpha.pdf",
    "summary": "Budget allocation details for Q1..."
  }
]
```

## 🧠 How the Backend Works (High-Level Flow)

```
Upload File
   ↓
Text Extraction (PDF/TXT)
   ↓
AI Summary + Embeddings (OpenAI)
   ↓
Vector Storage (Pinecone)
   ↓
Metadata Storage (MongoDB)
   ↓
Semantic Search via Query Embeddings
```

## 🛠 Available Scripts

From the `server/` directory:

- **Development Server**
  bash
  npm run dev

- **PDF Parser Test**
  bash
  node test-pdf.js
  
  Used to verify that the PDF parsing library is functioning correctly.

- **Database Seed (Optional)**
  bash
  node scripts/seed.js
  
  Clears the database and inserts dummy records for UI testing.

## 🔒 Security & Git Hygiene

Ensure your root `.gitignore` contains:

```text
node_modules
.env
.DS_Store
```

Secrets **must never** be pushed to GitHub.

## ✅ Current Capabilities

- File upload (PDF/TXT)
- Robust PDF parsing with failure handling
- AI-generated summaries
- Vector embeddings
- Semantic search using Pinecone
- MongoDB persistence
- Clean, modular backend architecture

## 🚧 Known Limitations

- Scanned/image PDFs are not supported (OCR not implemented)
- No authentication layer yet
- No rate limiting (dev-focused)

## 📌 Project Status

**Phase 4 Completed**

The backend is:
- Functional
- Documented
- Stable
- Ready for frontend integration

This README is the single source of truth.  
If someone asks a question already answered here, that’s on them.
