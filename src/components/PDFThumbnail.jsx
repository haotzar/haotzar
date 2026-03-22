import { useEffect, useRef, useState } from 'react';
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

        // קרא את הקובץ
        const isElectron = window.electron !== undefined;
        const arrayBuffer = isElectron 
          ? window.electron.readFileAsBuffer(pdfPath)
          : await fetch(pdfPath).then(r => r.arrayBuffer());

        // טען את PDF.js מה-window (כבר נטען ב-viewer)
        const pdfjsLib = await import('pdfjs-dist');
        
        // השתמש ב-worker מ-CDN שתואם לגרסה
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
