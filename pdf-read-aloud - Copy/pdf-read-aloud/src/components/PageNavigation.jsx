import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Edge-style bottom navigation bar.
 * Page prev/next + go-to-page input + zoom controls.
 */
export default function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
  zoomLevel = 1.0,
  onZoomIn,
  onZoomOut,
}) {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleGoToPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(inputValue, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setShowInput(false);
      setInputValue('');
    }
  };

  return (
    <div className="page-navigation">
      {/* Left: Page controls */}
      <div className="nav-section nav-page-controls">
        <button
          className="nav-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
        >
          <ChevronLeft size={18} />
        </button>

        {showInput ? (
          <form onSubmit={handleGoToPage} className="page-input-form">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="page-input"
              autoFocus
              onBlur={() => { setShowInput(false); setInputValue(''); }}
              placeholder={`${currentPage}`}
            />
            <span className="page-total">of {totalPages}</span>
          </form>
        ) : (
          <button
            className="page-indicator-btn"
            onClick={() => setShowInput(true)}
            title="Click to go to page"
          >
            {currentPage} <span className="page-total-inline">of {totalPages}</span>
          </button>
        )}

        <button
          className="nav-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next Page"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Right: Zoom controls */}
      <div className="nav-section nav-zoom-controls">
        <button
          className="nav-btn"
          onClick={onZoomOut}
          disabled={zoomLevel <= 0.5}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
        <button
          className="nav-btn"
          onClick={onZoomIn}
          disabled={zoomLevel >= 3.0}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
}
