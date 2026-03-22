#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Meilisearch Indexer - אינדקס מאוחד לקבצי PDF ומסדי נתונים של אוצריא
תומך בפרמטרי command line מלאים עם טיפול שגיאות מקיף
"""

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import time
from pathlib import Path
from multiprocessing import Pool, cpu_count, freeze_support
from typing import Optional, Dict, Any, List, Iterator

try:
    import requests
except ImportError:
    print("Error: 'requests' module not found. Install it with: pip install requests")
    sys.exit(1)

# לא משתמשים ב-master key - רק לשימוש מקומי
DEFAULT_MASTER_KEY = None


def sanitize_index_name(name: str) -> str:
    """
    המרת שם אינדקס לפורמט תקין עבור Meilisearch
    מאפשר רק: אותיות אנגליות, מספרים, מקף (-) וקו תחתון (_)
    """
    import unicodedata
    import re
    
    # המרת תווים עבריים לטרנסליטרציה אנגלית (אופציונלי)
    # אם יש תווים לא-ASCII, נשתמש ב-transliteration פשוט
    result = []
    for char in name:
        if char.isascii() and (char.isalnum() or char in '-_'):
            result.append(char)
        elif char == ' ':
            result.append('_')
        else:
            # תווים לא תקינים - נדלג עליהם או נמיר ל-_
            continue
    
    sanitized = ''.join(result)
    
    # אם השם ריק אחרי הסניטציה, נשתמש בהאש
    if not sanitized:
        sanitized = f"index_{hashlib.md5(name.encode()).hexdigest()[:8]}"
    
    # ודא שהשם מתחיל באות או מספר
    if sanitized and not sanitized[0].isalnum():
        sanitized = 'idx_' + sanitized
    
    return sanitized


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


class MeilisearchIndexer:
    """מחלקה ראשית לניהול אינדוקס Meilisearch"""
    
    def __init__(self, meili_url: str, api_key: Optional[str] = None, verbose: bool = False):
        self.meili_url = meili_url.rstrip('/')
        self.verbose = verbose
        self.headers = {}
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'
    
    def log(self, message: str, level: str = 'info'):
        """הדפסת הודעות עם צבעים"""
        if not self.verbose and level == 'debug':
            return
        
        color = {
            'info': Colors.OKBLUE,
            'success': Colors.OKGREEN,
            'warning': Colors.WARNING,
            'error': Colors.FAIL,
            'debug': Colors.OKCYAN
        }.get(level, '')
        
        print(f"{color}{message}{Colors.ENDC}")
    
    def check_connection(self, timeout: int = 10) -> bool:
        """בדיקת חיבור לשרת Meilisearch"""
        try:
            r = requests.get(f"{self.meili_url}/health", headers=self.headers, timeout=timeout)
            return r.status_code == 200
        except requests.exceptions.Timeout:
            self.log(f"שגיאה בחיבור ל-Meilisearch: Timeout אחרי {timeout} שניות", 'error')
            return False
        except requests.exceptions.ConnectionError:
            self.log(f"שגיאה בחיבור ל-Meilisearch: לא ניתן להתחבר לשרת", 'error')
            return False
        except Exception as e:
            self.log(f"שגיאה בחיבור ל-Meilisearch: {e}", 'error')
            return False
    
    def create_index(self, index_name: str, primary_key: str) -> bool:
        """יצירת אינדקס חדש"""
        try:
            # סניטציה של שם האינדקס
            original_name = index_name
            index_name = sanitize_index_name(index_name)
            
            if original_name != index_name:
                self.log(f"שם האינדקס שונה מ-'{original_name}' ל-'{index_name}' (דרישת Meilisearch)", 'warning')
            
            self.log(f"יוצר אינדקס '{index_name}'...", 'info')
            r = requests.post(
                f"{self.meili_url}/indexes",
                headers=self.headers,
                json={"uid": index_name, "primaryKey": primary_key},
                timeout=30
            )
            
            if r.status_code in (200, 201, 202):
                self.log(f"אינדקס '{index_name}' נוצר בהצלחה", 'success')
                return True
            elif r.status_code == 409:
                self.log(f"אינדקס '{index_name}' כבר קיים, ממשיך...", 'warning')
                return True
            else:
                self.log(f"שגיאה ביצירת אינדקס: {r.status_code} - {r.text}", 'error')
                return False
        except Exception as e:
            self.log(f"שגיאה ביצירת אינדקס: {e}", 'error')
            return False

    def wait_for_task(self, task_uid: int, poll_interval: float = 0.5, timeout: float = 600) -> bool:
        """המתנה לסיום משימה"""
        url = f"{self.meili_url}/tasks/{task_uid}"
        started = time.time()
        dots = 0
        
        while True:
            elapsed = time.time() - started
            if elapsed > timeout:
                self.log(f"תם הזמן אחרי {timeout} שניות", 'error')
                return False
            
            try:
                r = requests.get(url, headers=self.headers, timeout=30)
                r.raise_for_status()
                task = r.json()
                status = task.get("status")
                
                # הצגת התקדמות
                dots_str = "." * ((dots % 3) + 1)
                print(f"\rמעבד{dots_str} ({elapsed:.0f}s) - סטטוס: {status}   ", end="", flush=True)
                dots += 1
                
                if status == "succeeded":
                    print()  # שורה חדשה
                    return True
                elif status == "failed":
                    print()
                    self.log(f"משימה נכשלה: {json.dumps(task, ensure_ascii=False)}", 'error')
                    return False
                elif status == "canceled":
                    print()
                    self.log("משימה בוטלה", 'warning')
                    return False
                
                time.sleep(poll_interval)
            except Exception as e:
                self.log(f"שגיאה בבדיקת סטטוס משימה: {e}", 'error')
                return False
    
    def upload_documents(self, index_name: str, documents: List[Dict], timeout: int = 300, max_retries: int = 3) -> Optional[int]:
        """העלאת מסמכים לאינדקס עם retry logic"""
        index_name = sanitize_index_name(index_name)
        
        for attempt in range(max_retries):
            try:
                r = requests.post(
                    f"{self.meili_url}/indexes/{index_name}/documents",
                    headers=self.headers,
                    json=documents,
                    timeout=timeout
                )
                r.raise_for_status()
                result = r.json()
                return result.get("taskUid") or result.get("uid")
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # 2, 4, 6 שניות
                    self.log(f"⚠️ שגיאת חיבור (ניסיון {attempt + 1}/{max_retries}), ממתין {wait_time} שניות...", 'warning')
                    time.sleep(wait_time)
                else:
                    self.log(f"❌ שגיאה בהעלאת מסמכים אחרי {max_retries} ניסיונות: {e}", 'error')
                    return None
            except Exception as e:
                self.log(f"שגיאה בהעלאת מסמכים: {e}", 'error')
                return None
        
        return None

    def get_index_stats(self, index_name: str) -> Optional[Dict]:
        """קבלת סטטיסטיקות אינדקס"""
        try:
            index_name = sanitize_index_name(index_name)
            r = requests.get(f"{self.meili_url}/indexes/{index_name}/stats", headers=self.headers, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            self.log(f"שגיאה בקבלת סטטיסטיקות: {e}", 'error')
            return None
    
    def delete_index(self, index_name: str) -> bool:
        """מחיקת אינדקס"""
        try:
            original_name = index_name
            index_name = sanitize_index_name(index_name)
            if original_name != index_name:
                self.log(f"מחפש אינדקס '{index_name}' (מומר מ-'{original_name}')", 'info')
            self.log(f"מוחק אינדקס '{index_name}'...", 'warning')
            r = requests.delete(f"{self.meili_url}/indexes/{index_name}", headers=self.headers, timeout=30)
            if r.status_code in (200, 202, 204):
                self.log(f"אינדקס '{index_name}' נמחק בהצלחה", 'success')
                return True
            elif r.status_code == 404:
                self.log(f"אינדקס '{index_name}' לא קיים", 'warning')
                return True
            else:
                self.log(f"שגיאה במחיקת אינדקס: {r.status_code} - {r.text}", 'error')
                return False
        except Exception as e:
            self.log(f"שגיאה במחיקת אינדקס: {e}", 'error')
            return False


class OtzariaIndexer:
    """אינדוקס לספרי אוצריא מ-SQLite"""
    
    def __init__(self, indexer: MeilisearchIndexer, db_path: str):
        self.indexer = indexer
        self.db_path = db_path
    
    def index_books(self, index_name: str, batch_size: int = 1000, wait_tasks: bool = True) -> bool:
        """יצירת אינדקס ספרים"""
        try:
            self.indexer.log(f"מתחבר למסד נתונים: {self.db_path}", 'info')
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # ספירת ספרים
            total_books = cur.execute("SELECT COUNT(*) FROM book").fetchone()[0]
            self.indexer.log(f"נמצאו {total_books:,} ספרים", 'info')
            
            # יצירת אינדקס
            if not self.indexer.create_index(index_name, "id"):
                return False
            
            # קריאת ספרים
            self.indexer.log("קורא ספרים ממסד הנתונים...", 'info')
            cur.execute("SELECT id, title, heShortDesc, totalLines, volume FROM book")
            
            books = []
            for row in cur.fetchall():
                books.append({
                    "id": row[0],
                    "title": row[1] or "",
                    "heShortDesc": row[2] or "",
                    "totalLines": row[3] or 0,
                    "volume": row[4] or ""
                })
            
            self.indexer.log(f"נקראו {len(books):,} ספרים", 'success')
            
            # העלאה לאינדקס
            uploaded = 0
            task_uids = []
            
            for i in range(0, len(books), batch_size):
                batch = books[i:i+batch_size]
                task_uid = self.indexer.upload_documents(index_name, batch)
                
                if task_uid is None:
                    self.indexer.log("שגיאה בהעלאת batch", 'error')
                    conn.close()
                    return False
                
                task_uids.append(task_uid)
                uploaded += len(batch)
                self.indexer.log(f"הועלו {len(batch)} ספרים (סה\"כ: {uploaded:,}/{len(books):,}) - Task: {task_uid}", 'info')

            # המתנה למשימות
            if wait_tasks and task_uids:
                self.indexer.log("\nממתין לסיום עיבוד האינדקס...", 'info')
                last_task = task_uids[-1]
                if not self.indexer.wait_for_task(last_task):
                    conn.close()
                    return False
                self.indexer.log("עיבוד האינדקס הושלם בהצלחה!", 'success')
            
            conn.close()
            
            # הצגת סטטיסטיקות
            stats = self.indexer.get_index_stats(index_name)
            if stats:
                self.indexer.log(f"\nסטטיסטיקות אינדקס:", 'info')
                self.indexer.log(f"  מספר מסמכים: {stats.get('numberOfDocuments', 0):,}", 'info')
            
            return True
            
        except sqlite3.Error as e:
            self.indexer.log(f"שגיאת SQLite: {e}", 'error')
            return False
        except Exception as e:
            self.indexer.log(f"שגיאה כללית: {e}", 'error')
            return False
    
    def index_lines(self, index_name: str, batch_size: int = 2000, wait_tasks: bool = False) -> bool:
        """יצירת אינדקס שורות טקסט"""
        try:
            self.indexer.log(f"מתחבר למסד נתונים: {self.db_path}", 'info')
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # ספירת שורות
            total_lines = cur.execute("SELECT COUNT(*) FROM line").fetchone()[0]
            self.indexer.log(f"נמצאו {total_lines:,} שורות", 'info')
            self.indexer.log("אזהרה: זה עלול לקחת זמן רב!", 'warning')
            
            # יצירת אינדקס
            if not self.indexer.create_index(index_name, "id"):
                return False
            
            # קריאת שורות
            self.indexer.log("מעבד שורות...", 'info')
            cur.execute("SELECT id, bookId, lineIndex, content, heRef FROM line")
            
            uploaded = 0
            batch = []
            task_uids = []
            started_at = time.time()
            
            for row in cur:
                batch.append({
                    "id": row[0],
                    "bookId": row[1] or 0,
                    "lineIndex": row[2] or 0,
                    "content": row[3] or "",
                    "heRef": row[4] or ""
                })
                
                if len(batch) >= batch_size:
                    task_uid = self.indexer.upload_documents(index_name, batch)
                    
                    if task_uid is None:
                        conn.close()
                        return False
                    
                    task_uids.append(task_uid)
                    uploaded += len(batch)
                    progress = (uploaded / total_lines) * 100
                    elapsed = time.time() - started_at
                    rate = uploaded / elapsed if elapsed > 0 else 0
                    self.indexer.log(
                        f"הועלו {len(batch)} שורות (סה\"כ: {uploaded:,}/{total_lines:,} - {progress:.1f}%) - {rate:.1f} שורות/שניה",
                        'info'
                    )
                    batch = []
            
            # העלאת batch אחרון
            if batch:
                task_uid = self.indexer.upload_documents(index_name, batch)
                if task_uid:
                    task_uids.append(task_uid)
                    uploaded += len(batch)
                    self.indexer.log(f"הועלו {len(batch)} שורות (סה\"כ: {uploaded:,}/{total_lines:,})", 'info')

            # המתנה למשימות
            if wait_tasks and task_uids:
                self.indexer.log("\nממתין לסיום עיבוד האינדקס...", 'info')
                last_task = task_uids[-1]
                if not self.indexer.wait_for_task(last_task):
                    conn.close()
                    return False
                self.indexer.log("עיבוד האינדקס הושלם בהצלחה!", 'success')
            
            conn.close()
            
            # הצגת סטטיסטיקות
            stats = self.indexer.get_index_stats(index_name)
            if stats:
                self.indexer.log(f"\nסטטיסטיקות אינדקס:", 'info')
                self.indexer.log(f"  מספר מסמכים: {stats.get('numberOfDocuments', 0):,}", 'info')
            
            total_time = time.time() - started_at
            self.indexer.log(f"\nסה\"כ זמן: {total_time:.1f} שניות", 'info')
            
            return True
            
        except sqlite3.Error as e:
            self.indexer.log(f"שגיאת SQLite: {e}", 'error')
            return False
        except Exception as e:
            self.indexer.log(f"שגיאה כללית: {e}", 'error')
            return False


class PDFIndexer:
    """אינדוקס לקבצי PDF"""
    
    def __init__(self, indexer: MeilisearchIndexer, num_workers: Optional[int] = None):
        self.indexer = indexer
        self.num_workers = num_workers or min(4, cpu_count())
    
    @staticmethod
    def make_document_id(source_path: str, page_num: int) -> str:
        """יצירת ID ייחודי לעמוד"""
        raw = f"{source_path}::p{page_num}".encode("utf-8", errors="ignore")
        digest = hashlib.sha1(raw).hexdigest()
        return f"p_{digest}"
    
    @staticmethod
    def extract_pages_pymupdf(pdf_path: Path) -> Iterator[tuple[int, str]]:
        """חילוץ טקסט באמצעות PyMuPDF"""
        import fitz
        
        doc = fitz.open(str(pdf_path))
        try:
            for page_index in range(doc.page_count):
                page = doc.load_page(page_index)
                text = page.get_text("text") or ""
                yield page_index + 1, text
        finally:
            doc.close()
    
    @staticmethod
    def extract_pages_pdfplumber(pdf_path: Path) -> Iterator[tuple[int, str]]:
        """חילוץ טקסט באמצעות pdfplumber"""
        import pdfplumber
        
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page_index, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                yield page_index + 1, text

    def get_extractor(self):
        """בחירת ספריית חילוץ PDF זמינה"""
        try:
            import fitz
            return self.extract_pages_pymupdf
        except ImportError:
            pass
        
        try:
            import pdfplumber
            return self.extract_pages_pdfplumber
        except ImportError:
            pass
        
        raise RuntimeError(
            "חסרה ספריית חילוץ PDF. התקן אחת מהאפשרויות:\n"
            "  pip install pymupdf (מומלץ)\n"
            "  pip install pdfplumber"
        )
    
    @staticmethod
    def process_single_pdf(args: tuple) -> tuple[str, List[Dict], Optional[str]]:
        """עיבוד PDF בודד (לשימוש ב-multiprocessing)"""
        pdf_path, skip_empty = args
        
        try:
            # בחירת extractor
            try:
                import fitz
                extractor = PDFIndexer.extract_pages_pymupdf
            except ImportError:
                import pdfplumber
                extractor = PDFIndexer.extract_pages_pdfplumber
            
            documents = []
            source_path = str(pdf_path.resolve())
            
            for page_num, text in extractor(pdf_path):
                if skip_empty and not text.strip():
                    continue
                
                doc_id = PDFIndexer.make_document_id(source_path, page_num)
                documents.append({
                    "id": doc_id,
                    "source_file": pdf_path.name,
                    "source_path": source_path,
                    "page": page_num,
                    "content": text
                })
            
            return pdf_path.name, documents, None
            
        except Exception as e:
            return pdf_path.name, [], str(e)

    def find_pdf_files(self, inputs: List[str]) -> List[Path]:
        """איתור קבצי PDF מרשימת נתיבים/תבניות"""
        paths = []
        
        for raw in inputs:
            p = Path(raw)
            
            if p.is_dir():
                # תיקייה - חיפוש רקורסיבי
                found = sorted([x for x in p.rglob("*.pdf") if x.is_file()])
                paths.extend(found)
                self.indexer.log(f"נמצאו {len(found)} קבצי PDF בתיקייה: {raw}", 'debug')
            
            elif p.is_file() and p.suffix.lower() == ".pdf":
                # קובץ בודד
                paths.append(p)
                self.indexer.log(f"נמצא קובץ PDF: {raw}", 'debug')
            
            else:
                # תבנית glob
                try:
                    if p.is_absolute():
                        parent = p.parent
                        pattern = p.name
                        matches = sorted([x for x in parent.glob(pattern) if x.is_file() and x.suffix.lower() == ".pdf"])
                    else:
                        matches = sorted([x for x in Path().glob(raw) if x.is_file() and x.suffix.lower() == ".pdf"])
                    
                    paths.extend(matches)
                    self.indexer.log(f"נמצאו {len(matches)} קבצי PDF בתבנית: {raw}", 'debug')
                except Exception as e:
                    self.indexer.log(f"שגיאה בחיפוש תבנית '{raw}': {e}", 'warning')
        
        # הסרת כפילויות
        unique = {}
        for p in paths:
            unique[str(p.resolve())] = p
        
        return list(unique.values())
    
    def index_pdfs(
        self,
        index_name: str,
        pdf_inputs: List[str],
        batch_size: int = 500,
        skip_empty: bool = True,
        wait_tasks: bool = True
    ) -> bool:
        """יצירת אינדקס לעמודי PDF"""
        
        # איתור קבצים
        pdf_paths = self.find_pdf_files(pdf_inputs)
        
        if not pdf_paths:
            self.indexer.log("לא נמצאו קבצי PDF", 'error')
            return False
        
        self.indexer.log(f"נמצאו {len(pdf_paths):,} קבצי PDF", 'success')
        self.indexer.log(f"משתמש ב-{self.num_workers} תהליכי עבודה", 'info')
        
        # בדיקת ספריית חילוץ
        try:
            self.get_extractor()
        except RuntimeError as e:
            self.indexer.log(str(e), 'error')
            return False
        
        # יצירת אינדקס
        if not self.indexer.create_index(index_name, "id"):
            return False

        # עיבוד קבצים
        batch = []
        uploaded_pages = 0
        started_at = time.time()
        task_uids = []
        session = requests.Session()
        if self.indexer.headers:
            session.headers.update(self.indexer.headers)
        
        # עיבוד מקבילי עם imap_unordered לשחרור זיכרון מהר יותר
        with Pool(processes=self.num_workers) as pool:
            args_list = [(pdf_path, skip_empty) for pdf_path in pdf_paths]
            
            for pdf_i, (pdf_name, documents, error) in enumerate(
                pool.imap_unordered(self.process_single_pdf, args_list, chunksize=1), start=1
            ):
                if error:
                    self.indexer.log(f"[{pdf_i:,}/{len(pdf_paths):,}] שגיאה ב-{pdf_name}: {error}", 'error')
                    continue
                
                if not documents:
                    self.indexer.log(f"[{pdf_i:,}/{len(pdf_paths):,}] {pdf_name} - אין עמודים", 'warning')
                    continue
                
                self.indexer.log(f"[{pdf_i:,}/{len(pdf_paths):,}] עובד {pdf_name} ({len(documents)} עמודים)", 'info')
                
                # העלה מיד במקום לצבור ב-batch גדול
                batch.extend(documents)
                
                # העלאה כשה-batch מלא
                while len(batch) >= batch_size:
                    upload_batch = batch[:batch_size]
                    batch = batch[batch_size:]
                    
                    try:
                        r = session.post(
                            f"{self.indexer.meili_url}/indexes/{index_name}/documents",
                            json=upload_batch,
                            timeout=300
                        )
                        r.raise_for_status()
                        result = r.json()
                        task_uid = result.get("taskUid") or result.get("uid")
                        task_uids.append(task_uid)
                        
                        uploaded_pages += len(upload_batch)
                        elapsed = time.time() - started_at
                        rate = uploaded_pages / elapsed if elapsed > 0 else 0
                        self.indexer.log(
                            f"הועלו {len(upload_batch)} עמודים (סה\"כ: {uploaded_pages:,}) - {rate:.1f} עמודים/שניה",
                            'info'
                        )
                        
                        # שחרר זיכרון
                        del upload_batch
                    except Exception as e:
                        self.indexer.log(f"שגיאה בהעלאת batch: {e}", 'error')
                        return False
                
                # שחרר זיכרון של המסמכים שכבר עובדו
                del documents
        
        # העלאת batch אחרון
        if batch:
            try:
                r = session.post(
                    f"{self.indexer.meili_url}/indexes/{index_name}/documents",
                    json=batch,
                    timeout=300
                )
                r.raise_for_status()
                result = r.json()
                task_uid = result.get("taskUid") or result.get("uid")
                task_uids.append(task_uid)
                uploaded_pages += len(batch)
                self.indexer.log(f"הועלו {len(batch)} עמודים (סה\"כ: {uploaded_pages:,})", 'info')
                del batch
            except Exception as e:
                self.indexer.log(f"שגיאה בהעלאת batch אחרון: {e}", 'error')
                return False

        # המתנה למשימות
        if wait_tasks and task_uids:
            self.indexer.log("\nממתין לסיום עיבוד האינדקס...", 'info')
            last_task = task_uids[-1]
            if not self.indexer.wait_for_task(last_task):
                return False
            self.indexer.log("עיבוד האינדקס הושלם בהצלחה!", 'success')
        
        # הצגת סטטיסטיקות
        stats = self.indexer.get_index_stats(index_name)
        if stats:
            self.indexer.log(f"\nסטטיסטיקות אינדקס:", 'info')
            self.indexer.log(f"  מספר מסמכים: {stats.get('numberOfDocuments', 0):,}", 'info')
        
        total_time = time.time() - started_at
        avg_rate = uploaded_pages / total_time if total_time > 0 else 0
        self.indexer.log(f"\nסה\"כ עמודים: {uploaded_pages:,}", 'success')
        self.indexer.log(f"סה\"כ זמן: {total_time:.1f} שניות ({avg_rate:.1f} עמודים/שניה)", 'info')
        
        return True


def create_parser() -> argparse.ArgumentParser:
    """יצירת parser לפרמטרי command line"""
    parser = argparse.ArgumentParser(
        description='Meilisearch Indexer - אינדקס מאוחד לקבצי PDF ואוצריא',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
דוגמאות שימוש:

  # אינדקס ספרים מאוצריא
  python indexer.py books --db seforim.db --index my_books

  # אינדקס שורות מאוצריא
  python indexer.py lines --db seforim.db --index my_lines --batch-size 10000

  # אינדקס קבצי PDF מתיקייה
  python indexer.py pdf --input "F:\\books\\hebrewbooks" --index pdf_pages

  # אינדקס קבצי PDF עם הגדרות מותאמות
  python indexer.py pdf --input "F:\\books" --index my_pdfs --batch-size 1000 --workers 8

  # מחיקת אינדקס
  python indexer.py delete --index old_index

  # עם API key
  python indexer.py books --db seforim.db --index books --api-key YOUR_KEY

  # עם URL מותאם
  python indexer.py books --db seforim.db --index books --url http://localhost:8080
        """
    )
    
    parser.add_argument(
        'command',
        choices=['books', 'lines', 'pdf', 'delete', 'stats'],
        help='פעולה לביצוע: books (אינדקס ספרים), lines (אינדקס שורות), pdf (אינדקס PDF), delete (מחיקת אינדקס), stats (סטטיסטיקות)'
    )
    
    parser.add_argument(
        '--url',
        default='http://127.0.0.1:7700',
        help='כתובת שרת Meilisearch (ברירת מחדל: http://127.0.0.1:7700)'
    )
    
    parser.add_argument(
        '--api-key',
        default=None,
        help='API key של Meilisearch (ברירת מחדל: משתנה סביבה MEILI_MASTER_KEY או ערך מוגדר בקוד)'
    )
    
    parser.add_argument(
        '--index',
        required=True,
        help='שם האינדקס ליצירה/שימוש'
    )

    # פרמטרים לאוצריא (books/lines)
    parser.add_argument(
        '--db',
        help='נתיב למסד נתונים של אוצריא (seforim.db) - נדרש ל-books/lines'
    )
    
    # פרמטרים ל-PDF
    parser.add_argument(
        '--input',
        action='append',
        help='נתיב לקובץ PDF, תיקייה, או תבנית glob (ניתן לציין מספר פעמים) - נדרש ל-pdf'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=None,
        help='מספר מסמכים בכל batch (ברירת מחדל: 1000 לספרים, 5000 לשורות, 500 ל-PDF)'
    )
    
    parser.add_argument(
        '--workers',
        type=int,
        default=None,
        help='מספר תהליכי עבודה מקבילים ל-PDF (ברירת מחדל: min(4, cpu_count))'
    )
    
    parser.add_argument(
        '--skip-empty',
        action='store_true',
        default=True,
        help='דלג על עמודי PDF ריקים (ברירת מחדל: כן)'
    )
    
    parser.add_argument(
        '--no-skip-empty',
        action='store_false',
        dest='skip_empty',
        help='אל תדלג על עמודי PDF ריקים'
    )
    
    parser.add_argument(
        '--wait',
        action='store_true',
        default=True,
        help='המתן לסיום עיבוד האינדקס (ברירת מחדל: כן)'
    )
    
    parser.add_argument(
        '--no-wait',
        action='store_false',
        dest='wait',
        help='אל תמתין לסיום עיבוד האינדקס'
    )
    
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='הצג הודעות מפורטות (debug)'
    )
    
    return parser



def validate_args(args: argparse.Namespace) -> bool:
    """בדיקת תקינות הפרמטרים"""
    
    if args.command in ('books', 'lines'):
        if not args.db:
            print(f"{Colors.FAIL}שגיאה: --db נדרש עבור פקודת '{args.command}'{Colors.ENDC}")
            return False
        
        db_path = Path(args.db)
        if not db_path.exists():
            print(f"{Colors.FAIL}שגיאה: קובץ מסד נתונים לא נמצא: {args.db}{Colors.ENDC}")
            return False
        
        if not db_path.is_file():
            print(f"{Colors.FAIL}שגיאה: {args.db} אינו קובץ{Colors.ENDC}")
            return False
    
    if args.command == 'pdf':
        if not args.input:
            print(f"{Colors.FAIL}שגיאה: --input נדרש עבור פקודת 'pdf'{Colors.ENDC}")
            return False
    
    return True


def main() -> int:
    """פונקציה ראשית"""
    parser = create_parser()
    args = parser.parse_args()
    
    # בדיקת תקינות פרמטרים
    if not validate_args(args):
        return 1
    
    # קביעת API key: פרמטר > משתנה סביבה > ברירת מחדל
    api_key = args.api_key or os.getenv('MEILI_MASTER_KEY') or DEFAULT_MASTER_KEY
    
    # יצירת indexer
    indexer = MeilisearchIndexer(args.url, api_key, args.verbose)
    
    # בדיקת חיבור
    indexer.log(f"בודק חיבור ל-Meilisearch: {args.url}", 'info')
    
    # נסה להתחבר עד 5 פעמים עם המתנה
    connected = False
    for attempt in range(1, 6):
        indexer.log(f"ניסיון חיבור {attempt}/5...", 'info')
        if indexer.check_connection(timeout=5):
            connected = True
            break
        if attempt < 5:
            indexer.log(f"ממתין 3 שניות לפני ניסיון נוסף...", 'info')
            time.sleep(3)
    
    if not connected:
        indexer.log(
            f"לא ניתן להתחבר ל-Meilisearch בכתובת: {args.url}\n"
            "ודא ש-Meilisearch רץ: ./meilisearch.exe",
            'error'
        )
        return 1
    
    indexer.log("חיבור תקין ל-Meilisearch", 'success')
    
    # ביצוע הפקודה
    try:
        if args.command == 'books':
            batch_size = args.batch_size or 1000
            otzaria = OtzariaIndexer(indexer, args.db)
            success = otzaria.index_books(args.index, batch_size, args.wait)
            return 0 if success else 1
        
        elif args.command == 'lines':
            batch_size = args.batch_size or 1000  # הקטנתי מ-5000 ל-1000 ליציבות
            otzaria = OtzariaIndexer(indexer, args.db)
            success = otzaria.index_lines(args.index, batch_size, args.wait)
            return 0 if success else 1
        
        elif args.command == 'pdf':
            batch_size = args.batch_size or 500
            pdf_indexer = PDFIndexer(indexer, args.workers)
            success = pdf_indexer.index_pdfs(
                args.index,
                args.input,
                batch_size,
                args.skip_empty,
                args.wait
            )
            return 0 if success else 1

        elif args.command == 'delete':
            success = indexer.delete_index(args.index)
            return 0 if success else 1
        
        elif args.command == 'stats':
            stats = indexer.get_index_stats(args.index)
            if stats:
                indexer.log(f"\nסטטיסטיקות אינדקס '{args.index}':", 'info')
                indexer.log(f"  מספר מסמכים: {stats.get('numberOfDocuments', 0):,}", 'info')
                indexer.log(f"  מאונדקס: {not stats.get('isIndexing', False)}", 'info')
                
                field_dist = stats.get('fieldDistribution', {})
                if field_dist:
                    indexer.log(f"  התפלגות שדות:", 'info')
                    for field, count in field_dist.items():
                        indexer.log(f"    {field}: {count:,}", 'info')
                
                return 0
            else:
                indexer.log(f"לא ניתן לקבל סטטיסטיקות עבור אינדקס '{args.index}'", 'error')
                return 1
        
        else:
            indexer.log(f"פקודה לא מוכרת: {args.command}", 'error')
            return 1
    
    except KeyboardInterrupt:
        indexer.log("\n\nהופסק על ידי המשתמש", 'warning')
        return 130
    except Exception as e:
        indexer.log(f"שגיאה לא צפויה: {e}", 'error')
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    freeze_support()
    sys.exit(main())
