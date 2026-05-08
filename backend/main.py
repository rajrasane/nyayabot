import os
import uuid
import json
import sqlite3
import httpx
import fitz  # PyMuPDF
from datetime import datetime
from contextlib import contextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
UPLOAD_DIR = "uploads"
DB_PATH = "nyayabot.db"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="NyayaBot API")

app.add_middleware(
    CORSMiddleware,
    # Allow localhost during development and frontend hosts in production.
    # For the MVP we allow all origins so deployed frontends (Vercel) can call the API.
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- SQLite Database -----

def init_db():
    """Initialize the SQLite database with required tables."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                pdf_path TEXT NOT NULL,
                page_count INTEGER DEFAULT 0,
                raw_text TEXT DEFAULT '',
                status TEXT DEFAULT 'uploaded',
                extraction TEXT DEFAULT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                case_number TEXT DEFAULT '',
                action TEXT NOT NULL,
                directive_id TEXT DEFAULT '',
                officer TEXT DEFAULT 'Officer',
                details TEXT DEFAULT '',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(case_id)
            );
        """)

@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def get_case(case_id: str) -> dict | None:
    """Fetch a case from the database."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        if not row:
            return None
        case = dict(row)
        if case["extraction"]:
            case["extraction"] = json.loads(case["extraction"])
        return case

def save_case(case: dict):
    """Insert or update a case in the database."""
    extraction = case.get("extraction")
    if extraction and isinstance(extraction, dict):
        extraction = json.dumps(extraction)

    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO cases (case_id, filename, pdf_path, page_count, raw_text, status, extraction)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            case["case_id"], case["filename"], case["pdf_path"],
            case.get("page_count", 0), case.get("raw_text", ""),
            case.get("status", "uploaded"), extraction
        ))

def log_audit(case_id: str, case_number: str, action: str, directive_id: str = "", officer: str = "Officer", details: str = ""):
    """Write an entry to the audit log."""
    with get_db() as conn:
        conn.execute("""
            INSERT INTO audit_log (case_id, case_number, action, directive_id, officer, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (case_id, case_number, action, directive_id, officer, details, datetime.now().isoformat()))


# ----- PDF Cache (in-memory is fine for this) -----
pdf_cache: dict = {}

# ----- Prompt -----
EXTRACTION_PROMPT = """You are a legal document analyst for the Karnataka government.
Analyze this court judgment and extract structured information.
Respond ONLY with valid JSON. No explanation, no markdown, no code blocks.

Extract this exact structure:
{{
  "case_number": "full case number from the document",
  "court": "name of the court",
  "order_date": "date in DD-MM-YYYY format",
  "petitioner": "name of petitioner/appellant",
  "respondent": "name of respondent (government dept if present)",
  "summary": "2-3 sentence plain English summary of what the court decided",
  "directives": [
    {{
      "id": "directive-1",
      "text": "CRITICAL: EXACT QUOTE from the document text showing the directive or order. DO NOT summarize.",
      "page_number": 1,
      "action_required": "comply",
      "deadline": "e.g., '6 weeks', '14 days', '10th April 2026', or 'not specified'",
      "responsible_department": "department name or 'State of Karnataka' or 'not specified'",
      "confidence": 0.85
    }}
  ]
}}

Rules:
- action_required must be either "comply" or "appeal"
- confidence must be a float between 0.0 and 1.0
- Extract ALL directives that require action from any government party
- If a field is unknown, use "not specified"
- text MUST be an EXACT substring from the document. Do not paraphrase.
- page_number should be your best estimate of where the directive appears

JUDGMENT TEXT (first 6000 characters):
{text}"""

# ----- Models -----
class DirectiveVerification(BaseModel):
    directive_id: str
    status: str  # "approved", "edited", "rejected"
    edited_text: Optional[str] = None
    edited_deadline: Optional[str] = None
    edited_department: Optional[str] = None
    edited_action: Optional[str] = None

class VerificationRequest(BaseModel):
    verifications: List[DirectiveVerification]

# ----- CCMS Mock Data -----
CCMS_PENDING = [
    {
        "ccms_id": "CCMS-KHC-2026-04187",
        "case_number": "WP No. 15234/2026",
        "court": "Karnataka High Court",
        "filing_date": "2026-04-12",
        "petitioner": "Environmental Action Group",
        "respondent": "State of Karnataka, KSPCB",
        "subject": "Industrial effluent discharge into Arkavathi river — compliance order",
        "pages": 34,
        "priority": "high",
    },
    {
        "ccms_id": "CCMS-KHC-2026-04201",
        "case_number": "WP No. 18902/2026",
        "court": "Karnataka High Court",
        "filing_date": "2026-04-18",
        "petitioner": "Karnataka State Employees Association",
        "respondent": "State of Karnataka, Finance Dept",
        "subject": "Pension revision implementation — deadline compliance",
        "pages": 22,
        "priority": "medium",
    },
    {
        "ccms_id": "CCMS-KHC-2026-04219",
        "case_number": "WP No. 20145/2026",
        "court": "Karnataka High Court",
        "filing_date": "2026-04-25",
        "petitioner": "Public Interest Foundation",
        "respondent": "BBMP, State of Karnataka",
        "subject": "Unauthorized construction demolition — contempt warning",
        "pages": 41,
        "priority": "critical",
    },
]

# ----- Routes -----

@app.get("/")
def root():
    return {"status": "NyayaBot API running", "model": OLLAMA_MODEL}


@app.get("/api/ccms/pending")
def get_ccms_pending():
    """Mock CCMS endpoint — returns pending judgments waiting to be processed."""
    return {
        "source": "Karnataka CCMS (Court Case Monitoring System)",
        "fetched_at": datetime.now().isoformat(),
        "pending_count": len(CCMS_PENDING),
        "cases": CCMS_PENDING,
    }


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Step 1: Accept PDF, extract text, store case."""
    # `file.filename` can be None according to some type checkers — guard against that.
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    case_id = str(uuid.uuid4())[:8]
    pdf_path = os.path.join(UPLOAD_DIR, f"{case_id}.pdf")

    # Save PDF
    content = await file.read()
    with open(pdf_path, "wb") as f:
        f.write(content)

    # Extract text with PyMuPDF
    doc = fitz.open(pdf_path)
    full_text = ""
    page_count = doc.page_count
    # Use explicit page loading to satisfy type checkers (Document may not be iterable in stubs).
    for page_num in range(1, page_count + 1):
        page = doc.load_page(page_num - 1)
        full_text += f"\n[PAGE {page_num}]\n{page.get_text()}"
    doc.close()

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    case = {
        "case_id": case_id,
        "filename": file.filename,
        "pdf_path": pdf_path,
        "page_count": page_count,
        "raw_text": full_text,
        "status": "uploaded",
        "extraction": None,
    }
    save_case(case)

    log_audit(case_id, "", "pdf_uploaded", details=f"Uploaded {file.filename} ({page_count} pages)")

    return {
        "case_id": case_id,
        "filename": file.filename,
        "page_count": page_count,
        "text_length": len(full_text),
        "status": "uploaded",
    }


@app.post("/api/analyze/{case_id}")
async def analyze_case(case_id: str):
    """Step 2: Send text to Ollama, get structured directives."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    text_snippet = case["raw_text"][:6000]
    prompt = EXTRACTION_PROMPT.format(text=text_snippet)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.0,
                        "num_ctx": 8192,
                        "top_k": 1,
                        "seed": 42
                    },
                },
            )
        result = response.json()
        raw_output = result.get("response", "")

        extraction = json.loads(raw_output)

        for i, d in enumerate(extraction.get("directives", [])):
            d["id"] = f"directive-{i+1}"
            d["verification_status"] = "pending"
            
            # Correct the LLM's page number guess by finding actual text overlap
            best_page = d.get("page_number", 1)
            highest_overlap = -1
            
            import re
            page_count = len(re.findall(r"\[PAGE \d+\]", case["raw_text"]))
            
            def get_page_raw_text(raw_text: str, page_num_1indexed: int) -> str:
                pattern = rf"\[PAGE {page_num_1indexed}\](.*?)(?=\[PAGE \d+\]|$)"
                match = re.search(pattern, raw_text, re.DOTALL)
                return match.group(1).strip() if match else ""
                
            stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'and', 'or', 'but', 'not', 'this', 'that', 'it', 'its', 'as', 'so', 'if', 'then', 'than', 'such', 'also'}
            def kw(text):
                words = re.findall(r'\b[a-z0-9]+\b', text.lower())
                return {w for w in words if w not in stop_words and len(w) > 2}
                
            d_kw = kw(d["text"])
            for p in range(1, page_count + 1):
                page_text = get_page_raw_text(case["raw_text"], p)
                candidates = _find_best_match_in_page(d["text"], page_text)
                if candidates:
                    c_kw = kw(candidates[0])
                    overlap = len(d_kw & c_kw)
                    if overlap > highest_overlap:
                        highest_overlap = overlap
                        best_page = p
                        
            d["page_number"] = best_page

        case["extraction"] = extraction
        case["status"] = "analyzed"
        save_case(case)

        log_audit(case_id, extraction.get("case_number", ""), "ai_analysis_complete",
                  details=f"Extracted {len(extraction.get('directives', []))} directives")

        return {
            "case_id": case_id,
            "status": "analyzed",
            "extraction": extraction,
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail=f"LLM returned invalid JSON. Raw: {raw_output[:200]}"
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Ollama timeout — model may be loading, retry in 30s")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cases/{case_id}")
def get_case_route(case_id: str):
    """Get case data including extraction and verification status."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.pop("raw_text", None)
    return case


@app.get("/api/cases")
def list_cases():
    """List all cases in the system."""
    with get_db() as conn:
        rows = conn.execute("SELECT case_id, filename, status, extraction, created_at FROM cases ORDER BY created_at DESC").fetchall()

    result = []
    for row in rows:
        case = dict(row)
        if case["extraction"]:
            ext = json.loads(case["extraction"])
            case["case_number"] = ext.get("case_number", "Unknown")
            case["directive_count"] = len(ext.get("directives", []))
        else:
            case["case_number"] = "Pending"
            case["directive_count"] = 0
        case.pop("extraction", None)
        result.append(case)

    return {"total": len(result), "cases": result}


@app.post("/api/verify/{case_id}")
def verify_case(case_id: str, body: VerificationRequest):
    """Step 3: Store officer's verification decisions."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if not case["extraction"]:
        raise HTTPException(status_code=400, detail="Case not analyzed yet")

    directives = case["extraction"].get("directives", [])
    case_number = case["extraction"].get("case_number", "")

    for v in body.verifications:
        for d in directives:
            if d["id"] == v.directive_id:
                d["verification_status"] = v.status
                if v.status == "edited":
                    if v.edited_text:
                        d["text"] = v.edited_text
                    if v.edited_deadline:
                        d["deadline"] = v.edited_deadline
                    if v.edited_department:
                        d["responsible_department"] = v.edited_department
                    if v.edited_action:
                        d["action_required"] = v.edited_action

                # Log each verification action
                log_audit(case_id, case_number, f"directive_{v.status}",
                          directive_id=v.directive_id,
                          details=f"Directive {v.directive_id}: {v.status}")
                break

    case["extraction"]["directives"] = directives
    case["status"] = "verified"
    save_case(case)

    approved_count = sum(1 for d in directives if d.get("verification_status") in ["approved", "edited"])

    log_audit(case_id, case_number, "verification_complete",
              details=f"{approved_count}/{len(directives)} directives approved")

    return {
        "case_id": case_id,
        "status": "verified",
        "approved_count": approved_count,
        "total_directives": len(directives),
    }


@app.get("/api/dashboard")
def get_dashboard():
    """Step 4: Return all approved/edited directives across all cases."""
    dashboard_items = []

    with get_db() as conn:
        rows = conn.execute("SELECT case_id, extraction FROM cases WHERE extraction IS NOT NULL").fetchall()

    for row in rows:
        case_id = row["case_id"]
        extraction = json.loads(row["extraction"])
        for d in extraction.get("directives", []):
            if d.get("verification_status") in ["approved", "edited"]:
                dashboard_items.append({
                    "case_id": case_id,
                    "case_number": extraction.get("case_number", "Unknown"),
                    "court": extraction.get("court", "Unknown"),
                    "order_date": extraction.get("order_date", "Unknown"),
                    "directive_id": d["id"],
                    "directive_text": d["text"],
                    "action_required": d.get("action_required", "comply"),
                    "deadline": d.get("deadline", "not specified"),
                    "responsible_department": d.get("responsible_department", "not specified"),
                    "confidence": d.get("confidence", 0.0),
                    "verification_status": d.get("verification_status", "approved"),
                })

    return {
        "total": len(dashboard_items),
        "items": dashboard_items,
    }


@app.get("/api/audit")
def get_audit_log():
    """Return the full audit trail for all actions in the system."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 200").fetchall()
    return {"total": len(rows), "entries": [dict(r) for r in rows]}


@app.get("/api/pdf/{case_id}")
def get_pdf(case_id: str):
    """Serve the uploaded PDF for the viewer."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    pdf_path = case["pdf_path"]
    return FileResponse(pdf_path, media_type="application/pdf")


def _find_best_match_in_page(directive_text: str, page_raw_text: str) -> list[str]:
    """
    Find sentences in the raw page text that best match the directive text.
    Uses word-overlap scoring — works even when LLM paraphrases.
    """
    import re

    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'on',
        'at', 'by', 'for', 'with', 'from', 'and', 'or', 'but', 'not', 'this',
        'that', 'it', 'its', 'as', 'so', 'if', 'then', 'than', 'such', 'also',
    }

    def keywords(text):
        words = re.findall(r'\b[a-z0-9]+\b', text.lower())
        return {w for w in words if w not in stop_words and len(w) > 2}

    directive_kw = keywords(directive_text)

    sentences = re.split(r'(?<=[.!?])\s+|\n', page_raw_text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 15]

    scored = []
    for sent in sentences:
        sent_kw = keywords(sent)
        overlap = len(directive_kw & sent_kw)
        if overlap >= 2:
            scored.append((overlap, sent))

    scored.sort(reverse=True)
    return [s for _, s in scored[:3]]


@app.get("/api/pdf/{case_id}/highlight/{directive_id}")
def get_highlighted_pdf(case_id: str, directive_id: str):
    """Serve PDF with yellow highlights using smart word-overlap matching."""
    from fastapi.responses import Response

    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cache_key = f"{case_id}:{directive_id}"
    if cache_key in pdf_cache:
        return Response(
            content=pdf_cache[cache_key],
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"},
        )

    if not case["extraction"]:
        raise HTTPException(status_code=400, detail="Not analyzed yet")

    directives = case["extraction"].get("directives", [])
    directive = next((d for d in directives if d["id"] == directive_id), None)

    if not directive:
        return FileResponse(case["pdf_path"], media_type="application/pdf")

    doc = fitz.open(case["pdf_path"])
    directive_text = directive.get("text", "")
    target_page = directive.get("page_number", 1) - 1
    target_page = max(0, min(target_page, len(doc) - 1))

    highlighted = False
    raw_text = case.get("raw_text", "")

    def get_page_raw_text(raw_text: str, page_num_1indexed: int) -> str:
        import re
        pattern = rf"\[PAGE {page_num_1indexed}\](.*?)(?=\[PAGE \d+\]|$)"
        match = re.search(pattern, raw_text, re.DOTALL)
        return match.group(1).strip() if match else ""

    for search_page_idx in [target_page] + [i for i in range(len(doc)) if i != target_page]:
        page_raw = get_page_raw_text(raw_text, search_page_idx + 1)
        candidates = _find_best_match_in_page(directive_text, page_raw)

        page = doc[search_page_idx]
        for candidate in candidates:
            for length in [len(candidate), 80, 50, 40]:
                snippet = candidate[:length].strip()
                if len(snippet) < 10:
                    continue
                # Some type stubs may not expose `search_for` on Page; call defensively.
                instances = []
                search_fn = getattr(page, "search_for", None)
                if callable(search_fn):
                    try:
                        instances = search_fn(snippet, quads=True)
                    except TypeError:
                        # Older PyMuPDF versions may not support `quads` kwarg.
                        instances = search_fn(snippet)
                if instances:
                    for inst in instances:
                        annot = page.add_highlight_annot(inst)
                        annot.set_colors(stroke=[1, 0.85, 0])
                        annot.update()
                    highlighted = True
                    break
            if highlighted:
                break
        if highlighted:
            break

    if not highlighted:
        page = doc[target_page]
        rect = fitz.Rect(40, 40, 400, 65)
        annot = page.add_freetext_annot(
            rect,
            "AI extracted directive from this page",
            fontsize=9,
            fill_color=[1, 1, 0.6],
        )
        annot.update()

    pdf_bytes = doc.tobytes()
    doc.close()

    pdf_cache[cache_key] = pdf_bytes

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )


# ----- Startup: Initialize DB + Seed demo data -----

def seed_demo_data():
    """Pre-load demo cases so the dashboard looks populated on first visit."""
    with get_db() as conn:
        existing = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
        if existing > 0:
            return  # already seeded

    # Demo Case 1: Environment compliance
    case1 = {
        "case_id": "demo-001",
        "filename": "WP_15234_2026_Environment.pdf",
        "pdf_path": "uploads/demo-001.pdf",
        "page_count": 34,
        "raw_text": "[DEMO CASE — seeded data]",
        "status": "verified",
        "extraction": {
            "case_number": "WP No. 15234/2026",
            "court": "Karnataka High Court",
            "order_date": "12-04-2026",
            "petitioner": "Environmental Action Group",
            "respondent": "State of Karnataka, KSPCB",
            "summary": "The court directed KSPCB to ensure immediate closure of industrial units discharging untreated effluent into the Arkavathi river. The State government was ordered to constitute a monitoring committee within 30 days.",
            "directives": [
                {
                    "id": "directive-1",
                    "text": "KSPCB shall issue closure notices to all industrial units found discharging untreated effluent into the Arkavathi river within 14 days of this order.",
                    "page_number": 28,
                    "action_required": "comply",
                    "deadline": "within 14 days of order",
                    "responsible_department": "KSPCB (Karnataka State Pollution Control Board)",
                    "confidence": 0.92,
                    "verification_status": "approved"
                },
                {
                    "id": "directive-2",
                    "text": "The State Government shall constitute a monitoring committee headed by an officer not below the rank of Additional Secretary to oversee compliance.",
                    "page_number": 29,
                    "action_required": "comply",
                    "deadline": "within 30 days of order",
                    "responsible_department": "Department of Environment and Ecology",
                    "confidence": 0.88,
                    "verification_status": "edited"
                },
                {
                    "id": "directive-3",
                    "text": "A compliance report shall be filed before this court on the next date of hearing.",
                    "page_number": 31,
                    "action_required": "comply",
                    "deadline": "15-06-2026",
                    "responsible_department": "State of Karnataka",
                    "confidence": 0.85,
                    "verification_status": "approved"
                }
            ]
        }
    }
    save_case(case1)
    log_audit("demo-001", "WP No. 15234/2026", "pdf_uploaded", details="Demo: Environment compliance case (34 pages)")
    log_audit("demo-001", "WP No. 15234/2026", "ai_analysis_complete", details="Extracted 3 directives")
    log_audit("demo-001", "WP No. 15234/2026", "directive_approved", directive_id="directive-1", details="Officer approved closure notice directive")
    log_audit("demo-001", "WP No. 15234/2026", "directive_edited", directive_id="directive-2", officer="Addl. Secy, Env.", details="Officer edited deadline: 30 days → 45 days")
    log_audit("demo-001", "WP No. 15234/2026", "directive_approved", directive_id="directive-3", details="Officer approved compliance report directive")
    log_audit("demo-001", "WP No. 15234/2026", "verification_complete", details="3/3 directives approved")

    # Demo Case 2: Pension revision
    case2 = {
        "case_id": "demo-002",
        "filename": "WP_18902_2026_Pension.pdf",
        "pdf_path": "uploads/demo-002.pdf",
        "page_count": 22,
        "raw_text": "[DEMO CASE — seeded data]",
        "status": "verified",
        "extraction": {
            "case_number": "WP No. 18902/2026",
            "court": "Karnataka High Court",
            "order_date": "18-04-2026",
            "petitioner": "Karnataka State Employees Association",
            "respondent": "State of Karnataka, Finance Department",
            "summary": "The court ordered the Finance Department to implement the revised pension scheme for retired employees within 60 days, and to clear all pending arrears within 90 days. Failure to comply was warned with contempt proceedings.",
            "directives": [
                {
                    "id": "directive-1",
                    "text": "The Finance Department shall implement the revised pension scheme as notified in GO No. FD 15 PSN 2025 within 60 days.",
                    "page_number": 18,
                    "action_required": "comply",
                    "deadline": "within 60 days of order",
                    "responsible_department": "Finance Department",
                    "confidence": 0.94,
                    "verification_status": "approved"
                },
                {
                    "id": "directive-2",
                    "text": "All pending pension arrears for the period January 2025 to March 2026 shall be disbursed within 90 days.",
                    "page_number": 19,
                    "action_required": "comply",
                    "deadline": "within 90 days of order",
                    "responsible_department": "Finance Department, Treasury",
                    "confidence": 0.91,
                    "verification_status": "approved"
                },
                {
                    "id": "directive-3",
                    "text": "The respondent department may file a review petition within 30 days if implementation challenges are identified.",
                    "page_number": 20,
                    "action_required": "appeal",
                    "deadline": "within 30 days of order",
                    "responsible_department": "Finance Department",
                    "confidence": 0.78,
                    "verification_status": "rejected"
                }
            ]
        }
    }
    save_case(case2)
    log_audit("demo-002", "WP No. 18902/2026", "pdf_uploaded", details="Demo: Pension revision case (22 pages)")
    log_audit("demo-002", "WP No. 18902/2026", "ai_analysis_complete", details="Extracted 3 directives")
    log_audit("demo-002", "WP No. 18902/2026", "directive_approved", directive_id="directive-1", details="Officer approved pension scheme implementation")
    log_audit("demo-002", "WP No. 18902/2026", "directive_approved", directive_id="directive-2", details="Officer approved arrears disbursement")
    log_audit("demo-002", "WP No. 18902/2026", "directive_rejected", directive_id="directive-3", details="Officer rejected review petition recommendation")
    log_audit("demo-002", "WP No. 18902/2026", "verification_complete", details="2/3 directives approved")

    print("✅ Demo data seeded (2 cases, 6 directives, 12 audit entries)")


@app.on_event("startup")
def startup():
    init_db()
    seed_demo_data()
