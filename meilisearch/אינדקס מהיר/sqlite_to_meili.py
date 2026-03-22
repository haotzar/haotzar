import argparse
import json
import sqlite3
import time
from typing import Any, Dict, List, Optional

import requests


def wait_for_task(base_url: str, task_uid: int, headers: Dict[str, str], poll_interval: float = 0.2) -> None:
    url = f"{base_url}/tasks/{task_uid}"
    while True:
        r = requests.get(url, headers=headers, timeout=60)
        r.raise_for_status()
        task = r.json()
        status = task.get("status")
        if status in ("succeeded", "failed", "canceled"):
            if status != "succeeded":
                raise RuntimeError(
                    f"Task {task_uid} ended with status={status}: {json.dumps(task, ensure_ascii=False)}"
                )
            return
        time.sleep(poll_interval)


def ensure_index(base_url: str, index_uid: str, primary_key: Optional[str], headers: Dict[str, str]) -> None:
    url = f"{base_url}/indexes"
    payload: Dict[str, Any] = {"uid": index_uid}
    if primary_key:
        payload["primaryKey"] = primary_key

    r = requests.post(url, headers=headers, json=payload, timeout=60)
    if r.status_code in (200, 201, 202):
        return
    if r.status_code == 409:
        return
    r.raise_for_status()


def fetch_in_batches(conn: sqlite3.Connection, query: str, batch_size: int):
    cur = conn.cursor()
    cur.execute(query)
    col_names = [d[0] for d in cur.description]

    while True:
        rows = cur.fetchmany(batch_size)
        if not rows:
            break
        docs: List[Dict[str, Any]] = []
        for row in rows:
            doc: Dict[str, Any] = {}
            for i, v in enumerate(row):
                doc[col_names[i]] = v
            docs.append(doc)
        yield docs


def main() -> None:
    p = argparse.ArgumentParser(description="Export SQLite rows to Meilisearch index")
    p.add_argument("--db", required=True, help="Path to SQLite .db file")
    p.add_argument(
        "--query",
        required=True,
        help="SQL query that returns rows to index, e.g. SELECT id,title,body FROM docs",
    )
    p.add_argument("--index", required=True, help="Meilisearch index uid, e.g. documents")
    p.add_argument("--primary-key", default=None, help="Primary key field in docs, e.g. id")
    p.add_argument("--meili-url", default="http://127.0.0.1:7700", help="Meilisearch base URL")
    p.add_argument("--api-key", default=None, help="Meilisearch master key (optional)")
    p.add_argument("--batch-size", type=int, default=5000, help="Rows per upload batch")
    p.add_argument("--wait-tasks", action="store_true", help="Wait for each indexing task to finish")
    args = p.parse_args()

    headers: Dict[str, str] = {}
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"

    ensure_index(args.meili_url, args.index, args.primary_key, headers)

    conn = sqlite3.connect(args.db)

    total = 0
    t0 = time.time()

    for docs in fetch_in_batches(conn, args.query, args.batch_size):
        url = f"{args.meili_url}/indexes/{args.index}/documents"
        r = requests.post(url, headers=headers, json=docs, timeout=300)
        r.raise_for_status()
        res = r.json()
        task_uid = res.get("taskUid") or res.get("uid")

        total += len(docs)
        elapsed = time.time() - t0
        rate = total / elapsed if elapsed > 0 else 0
        print(f"Uploaded {len(docs)} docs (total={total}, {rate:.1f} docs/sec), task={task_uid}")

        if args.wait_tasks and task_uid is not None:
            wait_for_task(args.meili_url, int(task_uid), headers)

    conn.close()
    print(f"Done. Total docs uploaded: {total}")


if __name__ == "__main__":
    main()
