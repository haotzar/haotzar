import hashlib
import time
from pathlib import Path
from multiprocessing import Pool, cpu_count, freeze_support
from typing import Iterator

import requests


PDF_INPUTS = [r"F:\haotzar\books\hebrewbooks"]
MEILI_URL = "http://127.0.0.1:7700"
INDEX_NAME = "pdf_pages"
BATCH_SIZE = 500
TIMEOUT_SECONDS = 300
SKIP_EMPTY = True
WAIT_FOR_TASKS = True
WAIT_FOR_LAST_TASK_ONLY = True
TASK_POLL_INTERVAL_SECONDS = 0.5
TASK_POLL_TIMEOUT_SECONDS = 600
NUM_WORKERS = min(4, cpu_count())


def iter_pdf_paths(inputs: list[str]) -> list[Path]:
    paths: list[Path] = []
    for raw in inputs:
        p = Path(raw)
        if p.is_dir():
            paths.extend(sorted([x for x in p.rglob("*.pdf") if x.is_file()]))
        elif p.is_file() and p.suffix.lower() == ".pdf":
            paths.append(p)
        else:
            # Handle glob patterns - convert to Path first if absolute
            base_path = Path(raw)
            if base_path.is_absolute():
                # For absolute paths, use the parent directory for globbing
                parent = base_path.parent
                pattern = base_path.name
                matches = sorted([x for x in parent.glob(pattern)])
            else:
                matches = sorted([Path(x) for x in Path().glob(raw)])
            matches = [m for m in matches if m.is_file() and m.suffix.lower() == ".pdf"]
            paths.extend(matches)
    unique: dict[str, Path] = {}
    for p in paths:
        unique[str(p.resolve())] = p
    return list(unique.values())


def make_document_id(source_path: str, page_num: int) -> str:
    raw = f"{source_path}::p{page_num}".encode("utf-8", errors="ignore")
    digest = hashlib.sha1(raw).hexdigest()
    return f"p_{digest}"


def extract_pages_pymupdf(pdf_path: Path):
    import fitz  # type: ignore

    doc = fitz.open(str(pdf_path))
    try:
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            text = page.get_text("text") or ""
            yield page_index + 1, text
    finally:
        doc.close()


def extract_pages_pdfplumber(pdf_path: Path):
    import pdfplumber  # type: ignore

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            yield page_index + 1, text


def page_extractor(pdf_path: Path):
    try:
        import fitz  # noqa: F401

        return extract_pages_pymupdf
    except Exception:
        pass

    try:
        import pdfplumber  # noqa: F401

        return extract_pages_pdfplumber
    except Exception:
        pass

    raise RuntimeError(
        "Missing PDF text extraction dependency. Install one of: pymupdf (recommended) or pdfplumber."
    )


def process_single_pdf(pdf_path: Path) -> list[dict]:
    """Process a single PDF and return all its pages as documents."""
    extractor = page_extractor(pdf_path)
    documents = []
    
    try:
        for page_num, text in extractor(pdf_path):
            if SKIP_EMPTY and not text.strip():
                continue

            source_path = str(pdf_path.resolve())
            doc_id = make_document_id(source_path, page_num)
            documents.append(
                {
                    "id": doc_id,
                    "source_file": pdf_path.name,
                    "source_path": source_path,
                    "page": page_num,
                    "content": text,
                }
            )
    except Exception as e:
        print(f"Error processing PDF '{pdf_path}': {e}")
        return []
    
    return documents


def meili_create_index(meili_url: str, index_name: str, primary_key: str):
    try:
        r = requests.post(f"{meili_url}/indexes", json={"uid": index_name, "primaryKey": primary_key})
        if r.status_code in (200, 201, 202):
            print("Index created successfully")
        elif r.status_code == 409:
            print("Index already exists, continuing...")
        else:
            print(f"Warning: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Error creating index: {e}")


def meili_check_connection(meili_url: str, timeout_seconds: int) -> bool:
    try:
        r = requests.get(f"{meili_url}/health", timeout=timeout_seconds)
        return r.status_code == 200
    except Exception:
        return False


def meili_wait_for_task(
    meili_url: str,
    task_uid: str | int,
    poll_interval_seconds: float,
    timeout_seconds: float,
    progress_callback=None,
) -> tuple[bool, dict | None]:
    started = time.time()
    last_status = None
    dots = 0
    
    while True:
        elapsed = time.time() - started
        if elapsed > timeout_seconds:
            return False, None

        r = requests.get(f"{meili_url}/tasks/{task_uid}", timeout=30)
        r.raise_for_status()
        payload = r.json() or {}
        status = payload.get("status")
        
        # Show progress
        if progress_callback:
            progress_callback(status, elapsed, payload)
        elif status != last_status or dots % 3 == 0:
            dots_str = "." * ((dots % 3) + 1)
            print(f"\rמעבד אינדקס{dots_str} ({elapsed:.0f}s) - סטטוס: {status}", end="", flush=True)
            last_status = status
        
        dots += 1
        
        if status == "succeeded":
            if not progress_callback:
                print()  # New line after progress
            return True, payload
        if status == "failed":
            if not progress_callback:
                print()  # New line after progress
            return False, payload

        time.sleep(poll_interval_seconds)


def meili_get_index_stats(meili_url: str, index_name: str) -> dict | None:
    try:
        r = requests.get(f"{meili_url}/indexes/{index_name}/stats", timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def upload_batch(meili_url: str, index_name: str, batch: list[dict], timeout_seconds: int):
    r = requests.post(
        f"{meili_url}/indexes/{index_name}/documents",
        json=batch,
        timeout=timeout_seconds,
    )
    r.raise_for_status()
    result = r.json()
    return result.get("taskUid") or result.get("uid")


def upload_batch_session(
    session: requests.Session,
    meili_url: str,
    index_name: str,
    batch: list[dict],
    timeout_seconds: int,
):
    r = session.post(
        f"{meili_url}/indexes/{index_name}/documents",
        json=batch,
        timeout=timeout_seconds,
    )
    r.raise_for_status()
    result = r.json()
    return result.get("taskUid") or result.get("uid")


def main() -> int:
    pdf_paths = iter_pdf_paths(PDF_INPUTS)
    if not pdf_paths:
        print("No PDF files found.")
        return 2

    print("Starting PDF page indexing...")
    print(f"Found {len(pdf_paths):,} PDF files")
    print(f"Using {NUM_WORKERS} worker processes")

    if not meili_check_connection(MEILI_URL, timeout_seconds=10):
        print(
            "Meilisearch is not reachable. Please start Meilisearch or update MEILI_URL in this script."
        )
        print(f"MEILI_URL: {MEILI_URL}")
        return 1

    # Test that we can extract from at least one PDF
    _ = page_extractor(pdf_paths[0])

    print(f"Creating index '{INDEX_NAME}'...")
    meili_create_index(MEILI_URL, INDEX_NAME, primary_key="id")

    batch: list[dict] = []
    uploaded_pages = 0
    started_at = time.time()
    task_uids: list[str | int] = []
    session = requests.Session()

    # Process PDFs in parallel
    with Pool(processes=NUM_WORKERS) as pool:
        for pdf_i, documents in enumerate(pool.imap(process_single_pdf, pdf_paths), start=1):
            if not documents:
                continue
            
            pdf_name = documents[0]["source_file"]
            print(f"[{pdf_i:,}/{len(pdf_paths):,}] Processed {pdf_name} ({len(documents)} pages)")
            
            # Add documents to batch
            batch.extend(documents)
            
            # Upload when batch is full
            while len(batch) >= BATCH_SIZE:
                upload_batch_data = batch[:BATCH_SIZE]
                batch = batch[BATCH_SIZE:]
                
                try:
                    task_uid = upload_batch_session(session, MEILI_URL, INDEX_NAME, upload_batch_data, TIMEOUT_SECONDS)
                    task_uids.append(task_uid)
                    uploaded_pages += len(upload_batch_data)
                    elapsed = max(time.time() - started_at, 0.001)
                    rate = uploaded_pages / elapsed
                    print(
                        f"Uploaded {len(upload_batch_data)} pages (total: {uploaded_pages:,}) - Task: {task_uid} - {rate:.1f} pages/sec"
                    )
                except Exception as e:
                    print(f"Error uploading batch: {e}")
                    return 1

    # Upload remaining batch
    if batch:
        try:
            task_uid = upload_batch_session(session, MEILI_URL, INDEX_NAME, batch, TIMEOUT_SECONDS)
            task_uids.append(task_uid)
            uploaded_pages += len(batch)
            print(f"Uploaded {len(batch)} pages (total: {uploaded_pages:,}) - Task: {task_uid}")
        except Exception as e:
            print(f"Error uploading final batch: {e}")
            return 1

    if WAIT_FOR_TASKS and task_uids:
        if WAIT_FOR_LAST_TASK_ONLY:
            last_uid = task_uids[-1]
            print("\nממתין לסיום עיבוד האינדקס ב-Meilisearch...")
            print("(זה יכול לקחת זמן תלוי בכמות הנתונים)")
            try:
                ok, payload = meili_wait_for_task(
                    MEILI_URL,
                    last_uid,
                    poll_interval_seconds=TASK_POLL_INTERVAL_SECONDS,
                    timeout_seconds=TASK_POLL_TIMEOUT_SECONDS,
                )
                if not ok:
                    print(f"\nמשימה נכשלה: {last_uid}")
                    if payload is not None:
                        print(f"פרטי משימה: {payload}")
                    else:
                        print(f"תם הזמן אחרי {TASK_POLL_TIMEOUT_SECONDS} שניות.")
                    return 1
                else:
                    print("\nעיבוד האינדקס הושלם בהצלחה!")
            except Exception as e:
                print(f"\nשגיאה בהמתנה למשימה {last_uid}: {e}")
                return 1
        else:
            print(f"Waiting for {len(task_uids):,} Meilisearch tasks to complete...")
            for i, task_uid in enumerate(task_uids, start=1):
                try:
                    ok, payload = meili_wait_for_task(
                        MEILI_URL,
                        task_uid,
                        poll_interval_seconds=TASK_POLL_INTERVAL_SECONDS,
                        timeout_seconds=TASK_POLL_TIMEOUT_SECONDS,
                    )
                    if not ok:
                        print(f"Task did not succeed: {task_uid} ({i:,}/{len(task_uids):,})")
                        if payload is not None:
                            print(f"Task payload: {payload}")
                        else:
                            print(
                                f"Task timed out after {TASK_POLL_TIMEOUT_SECONDS} seconds."
                            )
                        return 1
                except Exception as e:
                    print(f"Error while waiting for task {task_uid}: {e}")
                    return 1

    stats = meili_get_index_stats(MEILI_URL, INDEX_NAME)
    if stats is not None:
        print(f"Index stats: {stats}")

    elapsed_total = time.time() - started_at
    print(f"\nDone! Total pages uploaded: {uploaded_pages:,}")
    print(f"Total time: {elapsed_total:.1f} seconds ({uploaded_pages/elapsed_total:.1f} pages/sec)")
    return 0


if __name__ == "__main__":
    freeze_support()
    raise SystemExit(main())
