'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// PDF.js worker (update path if you bundle differently)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


export default function PdfPreview({ url }) {
  const [numPages, setNumPages] = useState(null);

  function onLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div style={{ border: '1px solid #ccc', overflow: 'auto', height: '600px' }}>
      <Document
        file={url}
        onLoadSuccess={onLoadSuccess}
        loading="Loading PDF…"
        error="Failed to load PDF."
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={`page_${i + 1}`}
            pageNumber={i + 1}
            width={800}       // or FORM_W in px
          />
        ))}
      </Document>
    </div>
  );
}
