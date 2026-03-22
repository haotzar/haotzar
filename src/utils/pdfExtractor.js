import * as pdfjsLib from 'pdfjs-dist';

// הגדרת worker path - שימוש ב-worker מקומי מתיקיית public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// חילוץ טקסט מקובץ PDF
export async function extractTextFromPDF(pdfPath) {
  try {
    console.log(`📄 מחלץ טקסט מ-PDF: ${pdfPath}`);
    
    // בדיקה אם אנחנו ב-Tauri
    const isTauri = window.__TAURI__ !== undefined;
    let pdfData;
    
    if (isTauri) {
      // קריאת קובץ PDF דרך Tauri API
      const { readBinaryFile } = window.__TAURI__.fs;
      pdfData = await readBinaryFile(pdfPath);
    } else {
      // במצב פיתוח - טען דרך fetch
      const response = await fetch(pdfPath);
      pdfData = await response.arrayBuffer();
    }
    
    // טעינת ה-PDF
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      verbosity: 0, // הפחת הודעות debug
      isEvalSupported: false, // ביטחון - ללא eval
    });
    const pdf = await loadingTask.promise;
    
    const numPages = pdf.numPages;
    console.log(`📖 PDF מכיל ${numPages} עמודים`);
    
    let fullText = '';
    
    // חילוץ טקסט מכל עמוד
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // חיבור כל פריטי הטקסט
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
        
        // עדכון התקדמות כל 10 עמודים
        if (pageNum % 10 === 0) {
          console.log(`  ✓ עיבד ${pageNum}/${numPages} עמודים`);
        }
      } catch (error) {
        console.error(`⚠️ שגיאה בעמוד ${pageNum}:`, error.message);
      }
    }
    
    console.log(`✅ חילוץ הושלם: ${fullText.length} תווים`);
    return fullText;
  } catch (error) {
    console.error(`❌ שגיאה בחילוץ PDF:`, error);
    return '';
  }
}

// בדיקה אם קובץ PDF מכיל טקסט
export async function hasPDFText(pdfPath) {
  try {
    // בדיקה אם אנחנו ב-Tauri
    const isTauri = window.__TAURI__ !== undefined;
    let pdfData;
    
    if (isTauri) {
      // קריאת קובץ PDF דרך Tauri API
      const { readBinaryFile } = window.__TAURI__.fs;
      pdfData = await readBinaryFile(pdfPath);
    } else {
      // במצב פיתוח - טען דרך fetch
      const response = await fetch(pdfPath);
      pdfData = await response.arrayBuffer();
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    // בדוק את העמוד הראשון
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    
    return textContent.items.length > 0;
  } catch (error) {
    console.error('שגיאה בבדיקת PDF:', error);
    return false;
  }
}
