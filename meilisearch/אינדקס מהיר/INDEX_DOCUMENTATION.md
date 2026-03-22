# תיעוד אינדקס PDF - Meilisearch

## סקירה כללית

אינדקס זה מכיל עמודים בודדים מקבצי PDF, מאונדקסים באמצעות Meilisearch לצורך חיפוש מהיר ויעיל.

## מבנה האינדקס

### שם האינדקס
```
pdf_pages
```

### מבנה מסמך (Document Schema)

כל מסמך באינדקס מייצג עמוד בודד מקובץ PDF ומכיל את השדות הבאים:

```json
{
  "id": "p_a1b2c3d4e5f6...",
  "source_file": "ספר_לדוגמה.pdf",
  "source_path": "F:\\haotzar\\books\\hebrewbooks\\ספר_לדוגמה.pdf",
  "page": 42,
  "content": "תוכן הטקסט המלא של העמוד..."
}
```

#### תיאור שדות

| שדה | סוג | תיאור | דוגמה |
|-----|-----|--------|-------|
| `id` | String | מזהה ייחודי של העמוד (SHA1 hash) | `"p_a1b2c3d4e5f6..."` |
| `source_file` | String | שם קובץ ה-PDF המקורי | `"ספר_לדוגמה.pdf"` |
| `source_path` | String | נתיב מלא לקובץ ה-PDF | `"F:\\haotzar\\books\\hebrewbooks\\ספר_לדוגמה.pdf"` |
| `page` | Integer | מספר העמוד בקובץ (מתחיל מ-1) | `42` |
| `content` | String | תוכן הטקסט המלא של העמוד | `"תוכן העמוד..."` |

### Primary Key
```
id
```

המזהה הייחודי נוצר באמצעות SHA1 hash של המחרוזת: `{source_path}::p{page_num}`

---

## API - דוגמאות שימוש

### כתובת ברירת מחדל
```
http://127.0.0.1:7700
```

### 1. חיפוש בסיסי

#### בקשה
```http
POST http://127.0.0.1:7700/indexes/pdf_pages/search
Content-Type: application/json

{
  "q": "מילת חיפוש"
}
```

#### תשובה
```json
{
  "hits": [
    {
      "id": "p_abc123...",
      "source_file": "ספר.pdf",
      "source_path": "F:\\path\\to\\ספר.pdf",
      "page": 15,
      "content": "...טקסט עם מילת חיפוש..."
    }
  ],
  "query": "מילת חיפוש",
  "processingTimeMs": 2,
  "limit": 20,
  "offset": 0,
  "estimatedTotalHits": 1
}
```

### 2. חיפוש עם פילטרים

#### חיפוש בקובץ ספציפי
```http
POST http://127.0.0.1:7700/indexes/pdf_pages/search
Content-Type: application/json

{
  "q": "מילת חיפוש",
  "filter": "source_file = 'ספר_מסוים.pdf'"
}
```

#### חיפוש בטווח עמודים
```http
POST http://127.0.0.1:7700/indexes/pdf_pages/search
Content-Type: application/json

{
  "q": "מילת חיפוש",
  "filter": "page >= 10 AND page <= 50"
}
```

### 3. חיפוש עם Pagination

```http
POST http://127.0.0.1:7700/indexes/pdf_pages/search
Content-Type: application/json

{
  "q": "מילת חיפוש",
  "limit": 50,
  "offset": 0
}
```

### 4. חיפוש עם Highlighting

```http
POST http://127.0.0.1:7700/indexes/pdf_pages/search
Content-Type: application/json

{
  "q": "מילת חיפוש",
  "attributesToHighlight": ["content"],
  "highlightPreTag": "<mark>",
  "highlightPostTag": "</mark>"
}
```

#### תשובה עם Highlighting
```json
{
  "hits": [
    {
      "id": "p_abc123...",
      "source_file": "ספר.pdf",
      "page": 15,
      "content": "טקסט רגיל...",
      "_formatted": {
        "content": "טקסט רגיל <mark>מילת חיפוש</mark> המשך טקסט..."
      }
    }
  ]
}
```

### 5. חיפוש עם מיון

```http
POST http://127.0.0.1:7700/indexes/pdf_pages/search
Content-Type: application/json

{
  "q": "מילת חיפוש",
  "sort": ["page:asc"]
}
```

### 6. קבלת מסמך לפי ID

```http
GET http://127.0.0.1:7700/indexes/pdf_pages/documents/p_abc123...
```

---

## דוגמאות קוד

### Python

```python
import requests

MEILI_URL = "http://127.0.0.1:7700"
INDEX_NAME = "pdf_pages"

# חיפוש בסיסי
def search_pdf_pages(query: str, limit: int = 20):
    response = requests.post(
        f"{MEILI_URL}/indexes/{INDEX_NAME}/search",
        json={
            "q": query,
            "limit": limit,
            "attributesToHighlight": ["content"]
        }
    )
    return response.json()

# חיפוש בקובץ ספציפי
def search_in_file(query: str, filename: str):
    response = requests.post(
        f"{MEILI_URL}/indexes/{INDEX_NAME}/search",
        json={
            "q": query,
            "filter": f"source_file = '{filename}'"
        }
    )
    return response.json()

# שימוש
results = search_pdf_pages("תורה")
for hit in results["hits"]:
    print(f"קובץ: {hit['source_file']}, עמוד: {hit['page']}")
    print(f"תוכן: {hit['content'][:100]}...")
```

### JavaScript / TypeScript

```javascript
const MEILI_URL = "http://127.0.0.1:7700";
const INDEX_NAME = "pdf_pages";

// חיפוש בסיסי
async function searchPdfPages(query, limit = 20) {
  const response = await fetch(`${MEILI_URL}/indexes/${INDEX_NAME}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      limit: limit,
      attributesToHighlight: ['content']
    })
  });
  
  return await response.json();
}

// חיפוש עם פילטר
async function searchInFile(query, filename) {
  const response = await fetch(`${MEILI_URL}/indexes/${INDEX_NAME}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      filter: `source_file = '${filename}'`
    })
  });
  
  return await response.json();
}

// שימוש
searchPdfPages("תורה").then(results => {
  results.hits.forEach(hit => {
    console.log(`קובץ: ${hit.source_file}, עמוד: ${hit.page}`);
    console.log(`תוכן: ${hit.content.substring(0, 100)}...`);
  });
});
```

### C# / .NET

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

public class MeilisearchClient
{
    private readonly HttpClient _httpClient;
    private const string MEILI_URL = "http://127.0.0.1:7700";
    private const string INDEX_NAME = "pdf_pages";

    public MeilisearchClient()
    {
        _httpClient = new HttpClient();
    }

    public async Task<SearchResult> SearchPdfPages(string query, int limit = 20)
    {
        var searchRequest = new
        {
            q = query,
            limit = limit,
            attributesToHighlight = new[] { "content" }
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(
            $"{MEILI_URL}/indexes/{INDEX_NAME}/search",
            content
        );

        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<SearchResult>(responseJson);
    }

    public async Task<SearchResult> SearchInFile(string query, string filename)
    {
        var searchRequest = new
        {
            q = query,
            filter = $"source_file = '{filename}'"
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(
            $"{MEILI_URL}/indexes/{INDEX_NAME}/search",
            content
        );

        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<SearchResult>(responseJson);
    }
}

// שימוש
var client = new MeilisearchClient();
var results = await client.SearchPdfPages("תורה");

foreach (var hit in results.Hits)
{
    Console.WriteLine($"קובץ: {hit.SourceFile}, עמוד: {hit.Page}");
    Console.WriteLine($"תוכן: {hit.Content.Substring(0, 100)}...");
}
```

---

## הגדרות מתקדמות

### Filterable Attributes

כדי להשתמש בפילטרים, יש להגדיר את השדות הבאים כ-filterable:

```http
PATCH http://127.0.0.1:7700/indexes/pdf_pages/settings
Content-Type: application/json

{
  "filterableAttributes": [
    "source_file",
    "source_path",
    "page"
  ]
}
```

### Sortable Attributes

כדי למיין תוצאות:

```http
PATCH http://127.0.0.1:7700/indexes/pdf_pages/settings
Content-Type: application/json

{
  "sortableAttributes": [
    "page",
    "source_file"
  ]
}
```

### Searchable Attributes

הגדרת סדר עדיפות לחיפוש:

```http
PATCH http://127.0.0.1:7700/indexes/pdf_pages/settings
Content-Type: application/json

{
  "searchableAttributes": [
    "content",
    "source_file"
  ]
}
```

---

## טיפים לשימוש

### 1. חיפוש מהיר בעברית
Meilisearch תומך בעברית out-of-the-box. אין צורך בהגדרות מיוחדות.

### 2. Typo Tolerance
Meilisearch מטפל אוטומטית בשגיאות הקלדה. אפשר להגדיר:

```http
PATCH http://127.0.0.1:7700/indexes/pdf_pages/settings
Content-Type: application/json

{
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": {
      "oneTypo": 5,
      "twoTypos": 9
    }
  }
}
```

### 3. Pagination יעילה
לתוצאות רבות, השתמש ב-pagination:

```python
def get_all_results(query: str, page_size: int = 100):
    offset = 0
    all_hits = []
    
    while True:
        response = requests.post(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/search",
            json={
                "q": query,
                "limit": page_size,
                "offset": offset
            }
        )
        data = response.json()
        hits = data["hits"]
        
        if not hits:
            break
            
        all_hits.extend(hits)
        offset += page_size
        
        if len(hits) < page_size:
            break
    
    return all_hits
```

### 4. חיפוש מתקדם עם אופרטורים

```json
{
  "q": "תורה AND משה",
  "filter": "(page >= 10 AND page <= 50) OR source_file = 'חשוב.pdf'"
}
```

---

## סטטיסטיקות אינדקס

### קבלת מידע על האינדקס

```http
GET http://127.0.0.1:7700/indexes/pdf_pages/stats
```

#### תשובה
```json
{
  "numberOfDocuments": 15420,
  "isIndexing": false,
  "fieldDistribution": {
    "id": 15420,
    "source_file": 15420,
    "source_path": 15420,
    "page": 15420,
    "content": 15420
  }
}
```

---

## פתרון בעיות נפוצות

### 1. Meilisearch לא מגיב
```bash
# בדוק שה-service רץ
curl http://127.0.0.1:7700/health

# אם לא, הפעל:
./meilisearch.exe
```

### 2. תוצאות חיפוש ריקות
- ודא שהאינדקס הושלם (בדוק `isIndexing: false`)
- בדוק שהשאילתה נכונה
- נסה חיפוש פשוט יותר

### 3. פילטרים לא עובדים
- ודא ש-`filterableAttributes` מוגדר נכון
- בדוק syntax של הפילטר

---

## ביצועים

### זמני תגובה טיפוסיים
- חיפוש פשוט: 1-5ms
- חיפוש עם פילטרים: 2-10ms
- חיפוש עם highlighting: 3-15ms

### המלצות
- השתמש ב-`limit` סביר (20-100)
- הימנע מ-`offset` גבוה מאוד (>10,000)
- השתמש בפילטרים לצמצום תוצאות

---

## קישורים שימושיים

- [Meilisearch Documentation](https://docs.meilisearch.com/)
- [Search API Reference](https://docs.meilisearch.com/reference/api/search.html)
- [Filtering Guide](https://docs.meilisearch.com/learn/advanced/filtering.html)
- [Meilisearch SDKs](https://docs.meilisearch.com/learn/what_is_meilisearch/sdks.html)

---

## תמיכה

לשאלות או בעיות, פנה למפתח המערכת או עיין בתיעוד הרשמי של Meilisearch.

**גרסת מסמך:** 1.0  
**תאריך עדכון אחרון:** מרץ 2026
