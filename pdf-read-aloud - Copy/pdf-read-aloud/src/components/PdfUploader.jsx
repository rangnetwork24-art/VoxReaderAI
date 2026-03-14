import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

/**
 * PDF upload screen with drag-and-drop and file browser.
 */
export default function PdfUploader({ onFileLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file) => {
    setError('');
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large. Maximum size is 100MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onFileLoaded(e.target.result, file.name);
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }, [onFileLoaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    processFile(file);
    e.target.value = ''; // Reset so the same file can be re-selected
  }, [processFile]);

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <div className="upload-icon-container">
          <FileText size={48} className="upload-hero-icon" />
        </div>
        <h1 className="upload-title">VoxReader AI</h1>
        <p className="upload-subtitle">
          Open a PDF file and listen to it being read aloud — 100% free, open source.
        </p>
      </div>

      <div
        className={`upload-dropzone ${isDragging ? 'upload-dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud
          size={40}
          className={`upload-drop-icon ${isDragging ? 'upload-drop-icon-active' : ''}`}
        />
        <p className="upload-drop-text">
          {isDragging ? 'Drop your PDF here' : 'Drag & drop a PDF file here'}
        </p>
        <span className="upload-or">or</span>
        <input
          type="file"
          id="pdf-upload"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <label htmlFor="pdf-upload" className="upload-browse-btn">
          <FileText size={18} />
          Browse Files
        </label>
        {error && <p className="upload-error">{error}</p>}
      </div>

      <div className="upload-features">
        <div className="feature-item">
          <span className="feature-icon">🔊</span>
          <span>Text-to-Speech</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🎚️</span>
          <span>Speed Control</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🌐</span>
          <span>100% Free & Open Source</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🗣️</span>
          <span>Multiple Voices</span>
        </div>
      </div>
    </div>
  );
}
