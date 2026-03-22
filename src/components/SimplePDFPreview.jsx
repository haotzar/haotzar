import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './SimplePDFPreview.css';

// הגדר את ה-worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SimplePDFPreview = ({ pdfPath }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let pdfDoc = null;
    let renderTask = null;

    const loadAndRenderPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // קרא את הקובץ
        const isElectron = window.electron !== undefined;
        let pdfData;

        if (isElectron) {
          const arrayBuffer = window.electron.readFileAsBuffer(pdfPath);
          pdfData = new Uint8Array(arrayBuffer);
        } else {
          const response = await fetch(pdfPath);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          pdfData = new Uint8Array(arrayBuffer);
        }

        // טען את ה-PDF
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        pdfDoc = await loadingTask.promise;

        // קבל את העמוד הראשון
        const page = await pdfDoc.getPage(1);

        // חשב את הגודל המתאים
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.0 });
        
        // התאם את הגודל לרוחב הזמין
        const containerWidth = canvas.parentElement.clientWidth - 40; // 40px padding
        const scale = Math.min(containerWidth / viewport.width, 2.0); // מקסימום scale של 2
        const scaledViewport = page.getViewport({ scale });

        // הגדר את גודל הקנבס
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // רנדר את העמוד
        const context = canvas.getContext('2d');
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF preview:', err);
        setError('לא ניתן לטעון את התצוגה המקדימה');
        setLoading(false);
      }
    };

    loadAndRenderPDF();

    // ניקוי
    return () => {
      if (renderTask) {
        renderTask.cancel().catch(() => {});
      }
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [pdfPath]);

  if (loading) {
    return (
      <div className="simple-pdf-preview loading">
        <div className="loading-spinner"></div>
        <p>טוען תצוגה מקדימה...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simple-pdf-preview error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="simple-pdf-preview">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default SimplePDFPreview;
