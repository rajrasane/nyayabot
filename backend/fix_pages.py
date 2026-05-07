import json
import sqlite3
import os
from main import get_db, _find_best_match_in_page

def fix_pages():
    print("Fixing page numbers in DB...")
    with get_db() as conn:
        rows = conn.execute("SELECT case_id, raw_text, extraction FROM cases").fetchall()
        for row in rows:
            case_id = row['case_id']
            raw_text = row['raw_text']
            extraction_str = row['extraction']
            if not extraction_str: continue
            
            extraction = json.loads(extraction_str)
            changed = False
            
            def get_page_raw_text(raw_text: str, page_num_1indexed: int) -> str:
                import re
                pattern = rf"\[PAGE {page_num_1indexed}\](.*?)(?=\[PAGE \d+\]|$)"
                match = re.search(pattern, raw_text, re.DOTALL)
                return match.group(1).strip() if match else ""

            import re
            page_count = len(re.findall(r"\[PAGE \d+\]", raw_text))

            for d in extraction.get('directives', []):
                old_page = d.get('page_number', 1)
                best_page = old_page
                highest_overlap = -1
                
                stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'and', 'or', 'but', 'not', 'this', 'that', 'it', 'its', 'as', 'so', 'if', 'then', 'than', 'such', 'also'}
                def kw(text):
                    words = re.findall(r'\b[a-z0-9]+\b', text.lower())
                    return {w for w in words if w not in stop_words and len(w) > 2}
                
                d_kw = kw(d['text'])

                for p in range(1, page_count + 1):
                    page_text = get_page_raw_text(raw_text, p)
                    candidates = _find_best_match_in_page(d['text'], page_text)
                    if candidates:
                        c_kw = kw(candidates[0])
                        overlap = len(d_kw & c_kw)
                        if overlap > highest_overlap:
                            highest_overlap = overlap
                            best_page = p
                
                if best_page != old_page:
                    print(f"[{case_id}] Directive {d['id']} page changed from {old_page} to {best_page} (overlap: {highest_overlap})")
                    d['page_number'] = best_page
                    changed = True
            
            if changed:
                conn.execute("UPDATE cases SET extraction = ? WHERE case_id = ?", (json.dumps(extraction), case_id))
                print(f"Updated case {case_id}")

if __name__ == "__main__":
    fix_pages()
