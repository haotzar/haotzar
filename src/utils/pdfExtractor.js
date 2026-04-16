import * as pdfjsLib from 'pdfjs-dist';
import { initializePDFWorker } from './pdfWorkerLoader';

// חילוץ טקסט מקובץ PDF
export async function extractTextFromPDF(pdfPath) {
  try {
    console.log(`📄 מחלץ טקסט מ-PDF: ${pdfPath}`);
    
    // אתחל את ה-worker אם עדיין לא אותחל
    const workerReady = await initializePDFWorker();
    if (!workerReady) {
      throw new Error('לא ניתן לאתחל את PDF.js worker');
    }
    
    // בדיקה אם אנחנו ב-Tauri
    const isTauri = window.__TAURI__ !== undefined;
    let pdfData;
    
    if (isTauri) {
      // קריאת קובץ PDF דרך Tauri API
      try {
        const { readBinaryFile } = await import('@tauri-apps/api/fs');
        pdfData = await readBinaryFile(pdfPath);
        console.log('✅ Read PDF file via Tauri API');
      } catch (error) {
        console.error('❌ Error reading PDF via Tauri:', error);
        throw error;
      }
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
    // אתחל את ה-worker אם עדיין לא אותחל
    const workerReady = await initializePDFWorker();
    if (!workerReady) {
      throw new Error('לא ניתן לאתחל את PDF.js worker');
    }

    // בדיקה אם אנחנו ב-Tauri
    const isTauri = window.__TAURI__ !== undefined;
    let pdfData;
    
    if (isTauri) {
      // קריאת קובץ PDF דרך Tauri API
      try {
        const { readBinaryFile } = await import('@tauri-apps/api/fs');
        pdfData = await readBinaryFile(pdfPath);
        console.log('✅ Read PDF file via Tauri API');
      } catch (error) {
        console.error('❌ Error reading PDF via Tauri:', error);
        throw error;
      }
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
