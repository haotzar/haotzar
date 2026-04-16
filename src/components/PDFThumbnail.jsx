import { useEffect, useRef, useState } from 'react';
import { initializePDFWorker } from '../utils/pdfWorkerLoader';
import './PDFThumbnail.css';

const PDFThumbnail = ({ pdfPath }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);

        // אתחל את ה-worker אם עדיין לא אותחל
        const workerReady = await initializePDFWorker();
        if (!workerReady) {
          throw new Error('לא ניתן לאתחל את PDF.js worker');
        }

        // קרא את הקובץ
        const isElectron = window.electron !== undefined;
        const arrayBuffer = isElectron 
          ? window.electron.readFileAsBuffer(pdfPath)
          : await fetch(pdfPath).then(r => r.arrayBuffer());

        // טען את PDF.js
        const pdfjsLib = await import('pdfjs-dist');

        // טען את ה-PDF
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // קבל את העמוד הראשון
        const page = await pdf.getPage(1);
        
        // חשב גודל
        const canvas = canvasRef.current;
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // רנדר
        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: viewport
        }).promise;

        setLoading(false);
      } catch (err) {
        console.error('Error loading thumbnail:', err);
        setError('שגיאה בטעינת תצוגה מקדימה');
        setLoading(false);
      }
    };

    loadThumbnail();
  }, [pdfPath]);

  if (loading) {
    return <div className="pdf-thumbnail loading">טוען...</div>;
  }

  if (error) {
    return <div className="pdf-thumbnail error">{error}</div>;
  }

  return (
    <div className="pdf-thumbnail">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default PDFThumbnail;
