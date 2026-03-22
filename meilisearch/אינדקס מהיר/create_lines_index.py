import sqlite3
import requests
import time

print("Starting lines indexing...")
print("WARNING: This may take a long time and use a lot of memory!")

# הגדרות
DB_PATH = "seforim.db"
MEILI_URL = "http://127.0.0.1:7700"
INDEX_NAME = "lines"
BATCH_SIZE = 5000

# התחברות למסד נתונים
print(f"Connecting to {DB_PATH}...")
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# ספירת שורות
total_lines = cur.execute("SELECT COUNT(*) FROM line").fetchone()[0]
print(f"Found {total_lines:,} lines")

# יצירת אינדקס
print(f"Creating index '{INDEX_NAME}'...")
try:
    r = requests.post(f"{MEILI_URL}/indexes", json={"uid": INDEX_NAME, "primaryKey": "id"})
    if r.status_code in (200, 201, 202):
        print("Index created successfully")
    elif r.status_code == 409:
        print("Index already exists, continuing...")
    else:
        print(f"Warning: {r.status_code} - {r.text}")
except Exception as e:
    print(f"Error creating index: {e}")

# קריאת שורות בקבוצות (כדי לא לטעון הכל לזיכרון)
print("Processing lines in batches...")
cur.execute("SELECT id, bookId, lineIndex, content, heRef FROM line")

uploaded = 0
batch = []

for row in cur:
    batch.append({
        "id": row[0],
        "bookId": row[1],
        "lineIndex": row[2],
        "content": row[3],
        "heRef": row[4]
    })
    
    if len(batch) >= BATCH_SIZE:
        try:
            r = requests.post(f"{MEILI_URL}/indexes/{INDEX_NAME}/documents", json=batch, timeout=300)
            r.raise_for_status()
            result = r.json()
            task_uid = result.get("taskUid") or result.get("uid")
            
            uploaded += len(batch)
            progress = (uploaded / total_lines) * 100
            print(f"Uploaded {len(batch)} lines (total: {uploaded:,}/{total_lines:,} - {progress:.1f}%) - Task: {task_uid}")
            
            batch = []
            
        except Exception as e:
            print(f"Error uploading batch: {e}")
            break

# העלאת הקבוצה האחרונה
if batch:
    try:
        r = requests.post(f"{MEILI_URL}/indexes/{INDEX_NAME}/documents", json=batch, timeout=300)
        r.raise_for_status()
        result = r.json()
        task_uid = result.get("taskUid") or result.get("uid")
        
        uploaded += len(batch)
        print(f"Uploaded {len(batch)} lines (total: {uploaded:,}/{total_lines:,}) - Task: {task_uid}")
        
    except Exception as e:
        print(f"Error uploading final batch: {e}")

conn.close()
print(f"\nDone! Total lines uploaded: {uploaded:,}")
