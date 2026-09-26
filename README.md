# VisualMind AI — Automated Visual Knowledge Extraction Engine

> **Production-grade web platform that solves student cognitive overload by ingesting dense academic presentation slides (`.pptx`) and course textbooks (`.pdf`), extracting structural relationships, and automatically rendering them as interactive, non-overlapping Mermaid.js flowcharts, hierarchical mind maps, process decision trees, and micro-cheatsheets with slide-level source tracing.**

---

## 🚀 Key Features

* **Document Ingestion Pipeline:** Multi-file drag-and-drop support for `.pdf` and `.pptx` up to 30MB; automated text extraction, section identification, slide title parsing, and speaker note extraction.
* **AI Knowledge Extraction Engine:** Uses `@google/genai` (Official Google Gen AI SDK) with structured JSON generation (`responseSchema`) using `gemini-2.5-flash` for high-speed structural parsing.
* **Dynamic Visual Diagram Renderer:** Interactive rendering of generated **Mermaid.js** charts (Flowcharts, Mindmaps, Sequence Diagrams, State Diagrams) with panning, zooming, layout auto-fit, and node selection.
* **Source Node Tracing:** Clicking any generated diagram node opens a "Source Drawer" displaying the exact slide number, page excerpt, and original lecture context from which the node was derived.
* **Micro-Cheatsheet & Formula Bar:** Interactive side-panel providing distilled key definitions, core equations/formulas, and flashcard-ready bullet points.
* **Export & Sharing Suite:** Export diagrams directly to PNG, high-resolution SVG, vector PDF, or clean Markdown notes; generate public shareable links (`/share/:publicSlug`).
* **Active Recall Quiz Generator:** Auto-generates 5-question micro-quizzes derived directly from the generated visual concept nodes to test comprehension.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18+, TypeScript, Vite, Tailwind CSS, Lucide React, `mermaid`, `react-zoom-pan-pinch`, `html2canvas`, `jspdf` |
| **Backend** | Node.js v24+ with Express.js (TypeScript, ESM), `pdf-parse`, `JSZip` XML parser for PPTX, `multer`, `helmet`, `cors`, `express-rate-limit` |
| **AI Integration** | `@google/genai` (Official Google Gen AI SDK) using `gemini-2.5-flash` and `gemini-2.5-pro` with structured JSON schemas |
| **Database & Auth** | Supabase Cloud PostgreSQL, Supabase Auth (`@supabase/supabase-js`), Row-Level Security (RLS) policies |

---

## 🗄️ Database Setup & Migrations (Supabase Cloud PostgreSQL)

The database migration file containing all table creation scripts, Row Level Security (RLS) policies, and seed data is located at:
`supabase/migrations/001_initial_schema.sql`

### Tables Created:
1. `public.profiles` — User profile, institution, degree program.
2. `public.documents` — Uploaded documents, slide metadata, raw extracted text array.
3. `public.knowledge_maps` — Mermaid diagram syntax, concept nodes, cheatsheets, sharing slugs.
4. `public.quizzes` — 5-question active recall assessments linked to map nodes.

### Running Migrations:
Option 1: **Automated Migration Runner (Direct PostgreSQL Connection)**
1. In your `.env`, set `DATABASE_URL` (found in your Supabase Dashboard under `Project Settings -> Database -> Connection String URI`):
   ```env
   DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
2. Execute the runner:
   ```bash
   npm run db:migrate
   ```

Option 2: **Supabase Dashboard SQL Editor**
1. Copy the contents of `supabase/migrations/001_initial_schema.sql`.
2. Open your [Supabase Cloud Project Dashboard](https://supabase.com/dashboard) -> **SQL Editor**.
3. Paste the SQL script and click **Run**.

---

## ⚙️ Environment Configuration (`.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# GOOGLE GEN AI API (Official Google Gen AI SDK @google/genai)
# Get your API key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# SUPABASE CLOUD CONFIGURATION
# Found under Supabase Dashboard -> Project Settings -> API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Optional: Direct Postgres URI for automated migrations
# DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## 💻 Running the Application

### 1. Development Mode (Server + Client concurrently):
```bash
npm run dev
```
* **Frontend:** http://localhost:5173
* **Backend API:** http://localhost:5000/api/v1
* **Health Check:** http://localhost:5000/health

### 2. Standalone Server Mode:
```bash
npm run server
```

### 3. Production Build & Static Preview:
```bash
npm run build
npm run preview
```

---

## 🧪 Testing the Experience
1. Navigate to the application.
2. Click **"Try Sample Lecture (OS Scheduling)"** or **"Interactive Demo"** to immediately launch the pre-seeded Stanford CS140 lecture map.
3. Click any node (e.g., **"Round Robin RR"**) on the Mermaid diagram:
   * The **Source Drawer** opens instantly, displaying the exact text from **Slide #14** and the instructor's speaker notes.
4. Click **"Launch Active Recall Quiz"** to take an auto-generated 5-question test grounded in the diagram nodes.
5. Use the **Export Toolbar** to export high-res PNG, vector SVG, PDF, or toggle a public share link.
