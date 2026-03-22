import sqlite3
import requests
import time

print("Starting books indexing...")

# הגדרות
DB_PATH = "seforim.db"
MEILI_URL = "http://127.0.0.1:7700"
INDEX_NAME = "books"
BATCH_SIZE = 1000

# התחברות למסד נתונים
print(f"Connecting to {DB_PATH}...")
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# ספירת ספרים
total_books = cur.execute("SELECT COUNT(*) FROM book").fetchone()[0]
print(f"Found {total_books:,} books")

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

# קריאת ספרים
print("Fetching books from database...")
cur.execute("SELECT id, title, heShortDesc, totalLines, volume FROM book")

books = []
for row in cur.fetchall():
    books.append({
        "id": row[0],
        "title": row[1],
        "heShortDesc": row[2],
        "totalLines": row[3],
        "volume": row[4]
    })

print(f"Fetched {len(books):,} books")

# העלאה ל-Meilisearch בקבוצות
print(f"Uploading to Meilisearch in batches of {BATCH_SIZE}...")
uploaded = 0

for i in range(0, len(books), BATCH_SIZE):
    batch = books[i:i+BATCH_SIZE]
    
    try:
        r = requests.post(f"{MEILI_URL}/indexes/{INDEX_NAME}/documents", json=batch, timeout=60)
        r.raise_for_status()
        result = r.json()
        task_uid = result.get("taskUid") or result.get("uid")
        
        uploaded += len(batch)
        print(f"Uploaded {len(batch)} books (total: {uploaded:,}/{len(books):,}) - Task: {task_uid}")
        
    except Exception as e:
        print(f"Error uploading batch: {e}")
        break

conn.close()
print(f"\nDone! Total books uploaded: {uploaded:,}")
