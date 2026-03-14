import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders a single PDF page to a canvas element.
 * Handles hi-DPI scaling for crisp text.
 */
export default function PdfPageCanvas({ pdfDoc, pageNumber, containerWidth }) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !pageNumber || !containerWidth) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        // Cancel any in-progress render
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // ignore
          }
        }

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Calculate scale to fit container width
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth - 4) / unscaledViewport.width; // small padding
        const viewport = page.getViewport({ scale });

        // Set canvas dimensions for hi-DPI
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        setDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) {
          console.error('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, containerWidth]);

  return (
    <div className="pdf-page-wrapper" style={{ width: dimensions.width || '100%' }}>
      <canvas
        ref={canvasRef}
        className="pdf-page-canvas"
        style={{
          display: 'block',
          margin: '0 auto',
          borderRadius: '2px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
}
