# NyayaBot — AI Copilot for Court Judgment Compliance

> **AI for Bharat 2 Hackathon | Theme 11: From Court Judgments to Verified Action Plans**

---

## Problem

Karnataka's Court Case Monitoring System (CCMS) auto-fetches court judgment PDFs from the High Court via API. These judgments contain critical directives — compliance requirements, appeal deadlines, departmental responsibilities — buried in 20–50 pages of dense legal text.

Officials must manually read entire documents to identify actionable items. This causes **delays, missed deadlines, and contempt-of-court risks**.

---

## Solution

NyayaBot transforms court judgment PDFs into structured, **human-verified** action plans through 4 steps:

```
CCMS Auto-Fetch / PDF Upload
    ↓
Extract — AI pulls case details, directives, parties, timelines (with source page references)
    ↓
Action Plan — for each directive: comply/appeal, deadline, responsible department
    ↓
Human Verification — officer reviews side-by-side with highlighted PDF, approves/edits/rejects
    ↓
Dashboard — department-wise view of verified actions with full audit trail
```

**Nothing is automated. AI assists — officers decide.**

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js Frontend                               │
│  - CCMS Auto-Fetch Interface                    │
│  - PDF Upload UI                                │
│  - Side-by-side Verify View (with highlights)   │
│  - Department Dashboard + Audit Trail           │
└───────────────────┬─────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────┐
│  FastAPI (Python) Backend                       │
│  - PDF extraction: PyMuPDF                      │
│  - LLM extraction: Llama 3.2 via Ollama         │
│  - Smart PDF highlighting (word-overlap match)  │
│  - Structured JSON output with confidence       │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│  SQLite Database                                │
│  - Cases, directives, verification records      │
│  - Full audit trail (every action logged)       │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 16, Tailwind CSS 4 | Rapid, modern UI development |
| UI Icons | Lucide React | Consistent SVG icon system |
| Typography | EB Garamond + Lato | Legal authority + readability |
| Backend | Python, FastAPI | AI/ML friendly, lightweight |
| PDF Parsing | PyMuPDF (fitz) | Handles digital PDFs |
| AI / LLM | Llama 3.2 (3B) via Ollama | **Self-hosted, on-premise, no data leaves govt servers** |
| Database | SQLite | Lightweight, zero-config, persistent |
| Deployment | On-premise | No cloud dependency, no vendor lock-in |

---

## Instructions to Run

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai) installed and running

### Step 1: Start Ollama and pull the model

```bash
ollama pull llama3.2:3b
ollama serve    # if not already running
```

### Step 2: Start the backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The backend will automatically:
- Create the SQLite database (`nyayabot.db`)
- Seed 2 demo cases with 6 directives and 12 audit log entries

### Step 3: Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### Step 4: Open the application

Navigate to **http://localhost:3000**

---

## Key Features

### 1. CCMS Auto-Fetch (Mock)
Simulates pulling pending judgments from Karnataka's Court Case Monitoring System. One-click to see pending cases with priority levels.

### 2. AI Directive Extraction
Upload any court judgment PDF. Llama 3.2 extracts case number, parties, order date, summary, and individual directives with confidence scores.

### 3. Smart PDF Highlighting
When verifying, the original PDF is displayed with **yellow highlights** on the exact text the AI extracted from. Uses word-overlap scoring — works even when the LLM paraphrases.

### 4. Human-in-the-Loop Verification
Split-screen view: PDF on the left, AI extraction on the right. Officers can **approve**, **edit** (change text, deadline, department, action), or **reject** each directive.

### 5. Department Dashboard
All verified actions, filterable by department and action type (comply/appeal). Deadline urgency color-coding. Only human-verified records appear.

### 6. Full Audit Trail
Every action logged: PDF uploads, AI analysis completions, directive approvals, edits, rejections. Timestamped with officer identity.

---

## Key Design Decisions

- **Open source only** — no proprietary LLM APIs; court data never leaves government infrastructure
- **Verification-first** — no directive reaches the dashboard without human approval
- **CCMS-compatible** — plugs into existing pipeline, zero system modification required
- **Auditable** — every approval/edit/rejection is logged with officer ID and timestamp
- **On-premise** — self-hosted Llama 3.2, SQLite database, no cloud dependency

---

## Project Structure

```
nyayabot/
├── frontend/              # Next.js 16 app
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Upload + CCMS fetch
│       │   ├── cases/[id]/        # Extraction results
│       │   │   └── verify/        # Human verification (split view)
│       │   ├── dashboard/         # Department action dashboard
│       │   ├── audit/             # Full audit trail
│       │   └── components/        # NavBar
│       └── globals.css            # Design system
├── backend/
│   ├── main.py                    # FastAPI + all endpoints
│   ├── requirements.txt
│   └── nyayabot.db                # SQLite (auto-created)
└── README.md
```

---

## What It Solves (Evaluation Checklist)

- [x] Extracts: case details, order date, key directives, parties, timelines
- [x] Generates: comply/appeal decision, deadline, responsible department, action type
- [x] Verifies: side-by-side with source PDF highlights, confidence scores, approve/edit/reject
- [x] Dashboard: department-wise, date-sorted, only verified records
- [x] Audit trail: every action logged with timestamp and officer identity
- [x] CCMS integration: mock auto-fetch of pending judgments
- [x] Explainable: every output linked to source page/paragraph
- [x] Decision support, not automation
- [x] Fully on-premise: no data leaves government servers

---

## 🧪 How to Demo the Prototype

1. **Open the App:** Navigate to `http://localhost:3000`.
2. **Review CCMS Integration:** Observe the mocked CCMS cases. Click one to view the Prototype Notice regarding live API ingestion limits.
3. **Manual Upload (The Core Flow):**
   - Upload any sample Judgment PDF using the manual upload box.
   - Wait ~30-60 seconds (depending on your local machine) for Llama 3.2 to extract the structured directives.
4. **Human Verification:**
   - You will be redirected to the `/verify` page.
   - Look at the split-pane viewer. Click through the directives to see the exact text highlighted in the actual PDF.
   - Notice the "Previous" and "Next" buttons allowing natural workflow.
   - **Approve** or **Edit** the directives.
   - Click **Finalize & Submit**.
5. **Dashboard Routing:**
   - Navigate to the Dashboard.
   - Verify that your newly approved directives are listed.
   - Use the *Sort By* and *Department* filters to organize compliance tasks.

---

## Custom Attachments / Deliverables
- Ensure the `PITCH_DECK.md` is converted into your presentation slides highlighting the *On-Premise Privacy* and *Human-in-the-Loop* design.
- Include a screen-recording video demonstrating the upload-to-dashboard pipeline, specifically emphasizing the physical PDF highlighting feature during verification.