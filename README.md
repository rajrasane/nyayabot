# NyayaBot — AI Copilot for Court Judgment Compliance

> **AI for Bharat 2 Hackathon | Theme 11: From Court Judgments to Verified Action Plans**

---

## Problem

Karnataka's Court Case Monitoring System (CCMS) auto-fetches court judgment PDFs from the High Court via API. These judgments contain critical directives — compliance requirements, appeal deadlines, departmental responsibilities — buried in 20–50 pages of dense legal text.

Officials must manually read entire documents to identify actionable items. This causes delays, missed deadlines, and contempt risks.

---

## Solution

NyayaBot transforms court judgment PDFs into structured, **human-verified** action plans through 4 steps:

```
PDF Upload
    ↓
Extract — AI pulls case details, directives, parties, timelines (with source page references)
    ↓
Action Plan — for each directive: comply/appeal, deadline, responsible department
    ↓
Human Verification — officer reviews side-by-side with highlighted PDF, approves/edits/rejects
    ↓
Dashboard — department-wise view of verified actions and deadlines
```

**Nothing is automated. AI assists — officers decide.**

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js Frontend                               │
│  - PDF Upload UI                                │
│  - Side-by-side Verify View (react-pdf)         │
│  - Department Dashboard                         │
└───────────────────┬─────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────┐
│  FastAPI (Python) Backend                       │
│  - PDF extraction: PyMuPDF + Tesseract OCR      │
│  - LLM extraction: Llama 3.1 via Ollama         │
│  - Structured output: JSON with confidence      │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│  PostgreSQL Database                            │
│  - Cases, directives, verification records      │
│  - Full audit trail                             │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14, Tailwind CSS | Rapid UI development |
| PDF Viewer | react-pdf | Side-by-side verification view |
| Backend | Python, FastAPI | AI/ML friendly, lightweight |
| PDF Parsing | PyMuPDF + Tesseract OCR | Handles digital + scanned PDFs |
| AI / LLM | Llama 3.1 via Ollama | **Self-hosted, on-premise, no data leaves govt servers** |
| Database | PostgreSQL | Open source, government standard |
| Deployment | On-premise | No cloud dependency, no vendor lock-in |

---

## Key Design Decisions

- **Open source only** — no proprietary LLM APIs; court data never leaves government infrastructure
- **Verification-first** — no directive reaches the dashboard without human approval
- **CCMS-compatible** — plugs into existing pipeline, zero system modification required
- **Auditable** — every approval/edit/rejection is logged with officer ID and timestamp

---

## What It Solves (Evaluation Checklist)

- [x] Extracts: case details, order date, key directives, parties, timelines
- [x] Generates: comply/appeal decision, deadline, responsible department, action type
- [x] Verifies: side-by-side with source PDF highlights, confidence scores, approve/edit/reject
- [x] Dashboard: department-wise, date-sorted, only verified records
- [x] Handles: scanned + digital PDFs
- [x] Explainable: every output linked to source page/paragraph
- [x] Decision support, not automation

---

## Project Structure

```
nyayabot/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages: upload, verify, dashboard
│       └── components/
├── backend/           # FastAPI + AI pipeline
│   ├── main.py
│   └── requirements.txt
└── README.md
```

---

## Status

> Round 1 — Idea Submission (April 2026)

Phase 2 (prototype build): April 28 – May 4
Phase 3 (onsite hackathon): May 15–16, Taj Yeshwantpur, Bengaluru
