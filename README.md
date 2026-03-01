<div align="center">
  <h1>Arivagam</h1>
  <h3>Deterministic RAG Engine for Academic Synthesis</h3>
</div>

---

## 🚀 The Hook: Zero-Hallucination Architecture

**Arivagam** is not just another "AI PDF Chatbot." It is a rigorously engineered, **Deterministic RAG (Retrieval-Augmented Generation) Engine** explicitly built for high-stakes academic and research synthesis. 

We completely abandon stochastic LLM JSON-formatting and fragile prompt-engineering for generating citations due to the limitation in free tier tokens. Instead, Arivagam utilizes a custom, server-side **N-gram diffing algorithm** to mathematically guarantee that any highlighted UI text is an exact, **verbatim extraction** from the user's uploaded documents. If the underlying LLM attempts to drift or paraphrase source text inappropriately, the Verbatim Engine catches it—ensuring an absolute, zero-hallucination guarantee for every provided citation.

---

> **[🖼️ VISUAL WALKTHROUGH PLACEHOLDER 1: HERO / LANDING PAGE]**
> *(Please take a high-quality screenshot of the Landing/Hero section and insert it here)*
> `![Landing Page Screenshot](./assets/landing.png)`

---

## 🛠 Tech Stack & Environment

Based on a rigorous analysis of the application architecture, Arivagam utilizes the following stack:

### Frontend
- **Framework:** React 19 (Vite)
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide React
- **Authentication:** Custom JWT with Secure HTTP-Only Cookies
- **Routing & Networking:** React Router v7, Axios
- **Markdown Parsing:** React Markdown

### Backend
- **Core:** Node.js, Express.js (v5)
- **Databases:** MongoDB (Mongoose) for relational state, **Pinecone** for Vector Embeddings
- **AI & LLMs:** Google Generative AI (Gemini)
- **Blob Storage:** Cloudinary 
- **Document Processing:** PDF-Extraction, Mammoth (DOCX), Tesseract.js (OCR), XLSX
- **Security & Mail:** JWT, bcryptjs, argon2, Google APIs (Gmail OAuth2)

### `.env.example`

```env
# ==========================================
# SERVER ENDPOINT CONFIGURATION (server/.env)
# ==========================================
PORT=5000
MONGODB_URI=mongodb://localhost:27017/arivagam_local_dev

# Vector Store
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=arivagam-index

# LLM APIs
GEMINI_API_KEY=your_google_gemini_api_key

# Blob Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloud_api_key
CLOUDINARY_API_SECRET=your_cloud_api_secret

# Security
JWT_SECRET=super_secure_random_string_for_signing_tokens

# Mail Services (Google OAuth2)
EMAIL_USERNAME=your_gmail@address.com
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REFRESH_TOKEN=your_oauth_refresh_token

# ==========================================
# CLIENT ENDPOINT CONFIGURATION (client/.env)
# ==========================================
VITE_API_URL=http://localhost:5000/api
```

---

## 🔐 Custom Authentication Architecture

Arivagam utilizes a fully independent, custom **JWT (JSON Web Token)** authentication system built entirely from scratch to ensure total data sovereignty and granular control over the security pipeline.

### Authentication Flow Blueprint

```text
       [ USER REGISTRATION ]
                 |
                 v
+-----------------------------------+
| 1. Password Regex Validation      |
| 2. Argon2id Cryptographic Hashing |
| 3. Generate SHA-256 Token         |
+-----------------------------------+
                 |
                 v
+-----------------------------------+
| Send Verification Email via       |
| Gmail OAuth2 HTTP API             |
+-----------------------------------+
                 |
                 v
       [ USER Clicks Link ]
       (Token verified, DB updated)

=========================================================================

          [ USER LOGIN ]
                 |
                 v
+-----------------------------------+
| Verify Password Hash (Argon2id)   |
| (Opportunistic upgrade if bcrypt) |
+-----------------------------------+
                 |
                 v
+---------------------------------------+
| 1. Generate Signed JWT                |
| 2. Inject into secure, httpOnly,      |
|    sameSite='none' Cookie             |
+---------------------------------------+
                 |
                 v
      [ PROTECTED API ROUTES ]
+---------------------------------------+
| `requireAuth` Middleware intercepts   |
| Cookie, decodes JWT, validates User   |
+---------------------------------------+
```

## 🗺 System Architecture Blueprint
       [ USER UPLOAD ]
             |
             v
+-----------------------------------+
|   Node.js / Express API Gateway   |
|   (multer.memoryStorage)          |
+-----------------------------------+
 | 1. Instant 202 Accepted Client Release
 +-----------------------------------------> [ CLIENT UI: Optimistic Loading ]
 |
 | 2. Promise.allSettled() Background Task Execution
 v
+-----------------------------------------------------------------------+
|                       PARALLEL WORKER THREADS                         |
|                                                                       |
|  +--------------------+   +--------------------+   +---------------+  |
|  |  Storage Worker    |   | Embedding Worker   |   | Summary Worker|  |
|  |  (Cloudinary Blob) |   | (Pinecone Vector)  |   | (Gemini LLM)  |  |
|  +--------------------+   +--------------------+   +---------------+  |
+-----------------------------------------------------------------------+
                               |
                               v
                       [ 3. Sync & Validate ] 
         (Did any API throttle? Did a 3rd party service timeout?)
                               |
            +------------------+------------------+
            |                                     |
    [ SUCCESS STATE ]                     [ FAILSAFE TRIGGERED ]
    Commit DB Records                 Initiate Automated Rollback:
    Push Event to Client              1. Delete orphaned Cloudinary Blobs
                                      2. Wipe stale Pinecone Vectors
                                      3. Drop pending DB entry
                                      4. Notify Client of partial failure

=========================================================================

       [ CHAT QUERY ]
             |
             v
+-------------------------------+       +-------------------------------+
|  Pinecone Context Retrieval   | ----> |   LLM Synthesis (Gemini)      |
+-------------------------------+       +-------------------------------+
                                                       |
                                                       v
                                        +-------------------------------+
                                        |  Verbatim Extraction Engine   |
                                        |  (Server-Side N-Gram Diffing) |
                                        +-------------------------------+
                                                       |
                                                       v
                                        [ VALIDATED DETERMINISTIC CITATION ]
                                        (Sent to Client)
```

> **[🖼️ VISUAL WALKTHROUGH PLACEHOLDER 2: DASHBOARD / UPLOAD FLOW]**
> *(Please take a high-quality screenshot of the Dashboard showing Optimistic Uploads in action and insert it here)*
> `![Dashboard Screenshot](./assets/dashboard.png)`

---

### Security & Reliability Profile:
1. **Stateless JWT Login:** Upon verified login, the server generates a JWT signed with a private `JWT_SECRET`.
2. **Strict HTTP-Only Cookies:** *Crucially*, the JWT is never sent to the client's Javascript scope. It is injected directly into a `secure`, `sameSite: 'none'`, `httpOnly` cookie. This strictly mathematically mitigates **XSS (Cross-Site Scripting)** attacks because malicious client-side JS simply cannot read the token.
3. **Opportunistic Password Hashing:** By owning the Auth layer, we gained the exact control needed to implement a seamless migration path for dynamic security standards. If a legacy user logs in with an old `bcrypt` hash, the system authenticates them and automatically upgrades their database record to the modern `argon2id` standard in the background without interrupting the user experience.

> **[🖼️ VISUAL WALKTHROUGH PLACEHOLDER 3: REGISTRATION & AUTHENTICATION]**
> *(Please take a screenshot of the Login or Registration UI, perhaps showing the Email Verification flow, and insert it here)*
> `![Auth Screenshot](./assets/auth.png)`

---

## ⚙️ Engineering Achievements

- **Universal Multi-Format Parser:** A robust ingestion pipeline utilizing varying strategies (`pdf-extraction` for PDFs, `tesseract.js` for image OCR, `mammoth` for DOCX, and `xlsx` for spreadsheets). All documents are unified into clean UTF-8 text buffers entirely in RAM before routing.
- **Asynchronous Pipeline & Optimistic UI:** The server aggressively releases the client thread immediately after parsing the file buffer (`202 Accepted`). Expensive operations (embedding, remote blob storage, summary generation) run headlessly via `Promise.allSettled`, providing a fast, non-blocking UI experience on the frontend (powered by Framer Motion).
- **N-Gram Verbatim Extractor:** Eliminated the industry-standard reliance on LLMs to generate citation text. Using an in-memory N-Gram diffing (`textMatcher`) pass over the RAG context guarantees that the highlighted fragments (`<u>` tags) rendered in the Typewriter UI are mathematically present in the source material, providing 100% resistance to citation hallucinations.
- **Automated Distributed Rollback:** Dealing with 3 parallel third-party APIs (MongoDB, Cloudinary, Pinecone) inherently creates distributed transaction risks. Our failsafe logic guarantees that if *any* single service throttles (e.g., Pinecone rate limits), the `FileController` automatically triggers cleanup: wiping orphaned Cloudinary blobs, cleaning stale Pinecone vectors, and dropping pending DB states to prevent storage leaks.
- **Dynamic Context Injection:** Chat sessions enforce isolation by filtering Pinecone Vector queries strictly against the active session's document IDs (`$in: session.sourceFiles`). The retrieved fragments are dynamically deduplicated before feeding the GEMINI LLM to optimize token consumption.
- **Opportunistic Password Hashing:** A seamless migration path for dynamic security standards. If a user logs in with a legacy `bcrypt` hash, the system authenticates them and automatically upgrades their database record to the modern `argon2id` standard in the background without interrupting the user experience.
- **Dynamic API Rate Limit Recovery:** What happens when an LLM API hard-limits during a demo? The Hybrid Logic Engine calculates exactly when heavily-throttled free-tier APIs (like Gemini) will reset relative to the server's local timezone (IST), reporting an exact "Try again in X hours Y mins" metric to the end user instead of crashing with a generic `500 Internal Server Error`.

> **[🖼️ VISUAL WALKTHROUGH PLACEHOLDER 4: CHAT VIEW & HIGHLIGHTED CITATIONS]**
> *(Please take a screenshot of the Chat interface showing the highlighted N-gram extracted citations and insert it here)*
> `![Chat Screenshot](./assets/chat.png)`

---

## ⚖️ Deliberate Trade-offs & The "100% Free-Tier" Architecture

Arivagam is deliberately architected to run entirely on **$0/month infrastructure**. Every component—from the frontend hosting (Vercel), to the backend (Render Web Service Free Tier), database (MongoDB Atlas Free), vector store (Pinecone Starter), blob storage (Cloudinary Free), and the LLM engine itself (Gemini 2.5 Flash Free Tier)—operates under strict, highly restrictive quotas. 

This required extreme calculated compromises to keep the system stable during demonstrations without incurring billing:

1. **The "30k API Quota Cutoff" (Free Tier LLM Constraints):** 
   - *The Compromise:* Extracted text is aggressively truncated at approximately 25,000 tokens before hitting the embedding model.
   - *The 'Why':* Free/Tier-1 API accounts strict Requests-Per-Minute (RPM) limits result in abrupt `429 Too Many Requests` errors when batching large PDFs. Implementing a hard ceiling ensures that the core application loop remains stable.
   - *The Production Solution:* Upgrading to Google Cloud Vertex AI (Paid) or an enterprise OpenAI tier removes these batching restrictions, allowing us to ingest documents of theoretically unlimited lengths seamlessly in the background pipeline.

2. **The "Memory RAM Trap" (`multer.memoryStorage` & Render Constraints):**
   - *The Compromise:* Files are buffered entirely in V8's heap memory (RAM) before transmission to Cloudinary, bypassing the local filesystem entirely. 
   - *The 'Why':* Render's Free Web Services use stateless ephemeral storage. If we used `multer.diskStorage`, any temporary file written to disk risks being wiped if Render spins down the underlying container mid-process. Buffering in RAM guarantees maximum I/O speed. However, this poses a massive Out-Of-Memory (OOM) risk in a true production scale-out environment where concurrent file uploads could quickly exceed Node's 512MB free-tier memory limit.
   - *The Production Solution:* Purchasing a persistent disk volume on Render (or AWS EC2), or implementing Direct-to-S3 signed URL uploads directly from the React client, entirely bypassing the Node.js memory heap.

3. **Dynamic API Rate Limit Recovery (Handling Free Tier Crashes):** 
   - *The Compromise:* What happens when Gemini 429 hard-limits you mid-demo because you exceeded the 15 RPM free allowance?
   - *The 'Why':* The Hybrid Logic Engine calculates exactly when heavily-throttled free-tier APIs will reset relative to the server's local timezone (IST), reporting an exact "Try again in X hours Y mins" metric to the end user instead of crashing with a generic `500 Internal Server Error`.
   - *The Production Solution:* Purchasing a Pay-As-You-Go API tier completely eliminates rate limits, removing the need for this complex fallback logic entirely.

---

> **[🖼️ VISUAL WALKTHROUGH PLACEHOLDER 5: ARCHIVE & SEARCH]**
> *(Please take a screenshot of the Archive or Search functionality to show state management in action and insert it here)*
> `![Archive/Search Screenshot](./assets/archive.png)`

---

## 💻 Local Setup

Run the following commands to instantly boot the environment. Ensure you have populated the `.env` files in both directories according to the `.env.example` above.

```bash
# Clone the repository
git clone https://github.com/your-username/arivagam.git
cd arivagam

# Setup and run the Server (Terminal 1)
cd server
npm install
npm run dev

# Setup and run the Client (Terminal 2)
cd client
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.
