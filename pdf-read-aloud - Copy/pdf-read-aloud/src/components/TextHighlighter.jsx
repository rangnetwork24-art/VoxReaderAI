import React from 'react';

/**
 * TextHighlighter is no longer used as a standalone viewer.
 * The sentence indicator is now built into PdfReader directly.
 * This component is kept for backward compatibility but can be removed.
 */
export default function TextHighlighter({ currentSentence }) {
  if (!currentSentence) return null;

  return (
    <div className="sentence-indicator">
      <p className="current-sentence-text">{currentSentence}</p>
    </div>
  );
}
