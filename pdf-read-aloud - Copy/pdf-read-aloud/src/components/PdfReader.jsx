import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PdfUploader from './PdfUploader';
import PdfPageCanvas from './PdfPageCanvas';
import PlaybackControls from './PlaybackControls';
import PageNavigation from './PageNavigation';
import { loadPdfDocument, extractPageText, clearTextCache } from '../utils/pdfParser';

export default function PdfReader() {
  // Document state
  const [pdfDoc, setPdfDoc] = useState(null);
  const [filename, setFilename] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  // Current view page (navigation)
  const [currentViewPage, setCurrentViewPage] = useState(1);

  // Zoom
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // TTS state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentReadingPage, setCurrentReadingPage] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  // Current page text (loaded on-demand)
  const [currentPageText, setCurrentPageText] = useState(null);

  // Container width for responsive PDF rendering
  const [containerWidth, setContainerWidth] = useState(800);
  const viewerRef = useRef(null);

  // Speech synthesis refs
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentSentenceRef = useRef(0);
  const currentReadingPageRef = useRef(1);
  const speedRef = useRef(1);
  const selectedVoiceRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentSentenceRef.current = currentSentenceIndex; }, [currentSentenceIndex]);
  useEffect(() => { currentReadingPageRef.current = currentReadingPage; }, [currentReadingPage]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { selectedVoiceRef.current = selectedVoiceIndex; }, [selectedVoiceIndex]);

  // Current page sentences for the sentence indicator
  const currentPageSentences = useMemo(() => {
    if (currentPageText && currentPageText.pageNumber === currentReadingPage) {
      return currentPageText.sentences;
    }
    return [];
  }, [currentPageText, currentReadingPage]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const v = synthRef.current.getVoices();
      if (v.length > 0) {
        setVoices(v);
        const preferred = v.findIndex(
          (voice) =>
            voice.lang.startsWith('en') &&
            (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Natural'))
        );
        if (preferred >= 0) setSelectedVoiceIndex(preferred);
        else {
          const english = v.findIndex((voice) => voice.lang.startsWith('en'));
          if (english >= 0) setSelectedVoiceIndex(english);
        }
      }
    };
    loadVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { synthRef.current.cancel(); };
  }, []);

  // Responsive container width
  useEffect(() => {
    const updateWidth = () => {
      if (viewerRef.current) {
        setContainerWidth(viewerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [pdfDoc]);

  // Handle file upload
  const handleFileLoaded = useCallback(async (arrayBuffer, name) => {
    setIsParsing(true);
    setError(null);
    setFilename(name);
    synthRef.current.cancel();
    setIsPlaying(false);
    setIsPreparing(false);
    setShowToolbar(false);
    setCurrentReadingPage(1);
    setCurrentViewPage(1);
    setCurrentSentenceIndex(0);
    setCurrentPageText(null);
    setZoomLevel(1.0);
    clearTextCache();

    try {
      const doc = await loadPdfDocument(arrayBuffer);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error('PDF Loading Error:', err);
      setError(`Failed to open PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Page navigation
  const handlePageChange = useCallback((pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentViewPage(pageNum);
    }
  }, [totalPages]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  // ─── TTS Engine (lazy text extraction) ───

  const getPageText = useCallback(async (pageNum) => {
    if (!pdfDoc) return null;
    return await extractPageText(pdfDoc, pageNum);
  }, [pdfDoc]);

  const speakSentence = useCallback(async (sentenceIdx, pageNum) => {
    synthRef.current.cancel();

    // Lazy load text for this page
    let pageData;
    try {
      pageData = await getPageText(pageNum);
    } catch (err) {
      console.error('Text extraction error:', err);
      setIsPlaying(false);
      setIsPreparing(false);
      return;
    }

    if (!pageData || sentenceIdx >= pageData.sentences.length) {
      // Move to next page
      if (pageNum < totalPages) {
        const nextPage = pageNum + 1;
        setCurrentReadingPage(nextPage);
        setCurrentViewPage(nextPage);
        setCurrentSentenceIndex(0);
        currentReadingPageRef.current = nextPage;
        currentSentenceRef.current = 0;
        setTimeout(() => speakSentence(0, nextPage), 150);
      } else {
        setIsPlaying(false);
        setIsPreparing(false);
      }
      return;
    }

    // Update the displayed text for the sentence indicator
    setCurrentPageText(pageData);

    const text = pageData.sentences[sentenceIdx];
    if (!text || text.trim().length === 0) {
      const nextIdx = sentenceIdx + 1;
      setCurrentSentenceIndex(nextIdx);
      currentSentenceRef.current = nextIdx;
      setTimeout(() => speakSentence(nextIdx, pageNum), 50);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speedRef.current;
    if (voices.length > 0 && voices[selectedVoiceRef.current]) {
      utterance.voice = voices[selectedVoiceRef.current];
    }

    let startTimeout;

    utterance.onstart = () => {
      clearTimeout(startTimeout);
      setIsPreparing(false);
    };

    // Timeout fallback for broken/remote voices that hang
    startTimeout = setTimeout(() => {
      if (isPlayingRef.current) {
        console.warn('Speech timeout - voice engine stalled');
        synthRef.current.cancel();
        setIsPlaying(false);
        setIsPreparing(false);
        setError("Voice failed to start. Please switch to an (Offline) voice.");
        setTimeout(() => setError(null), 5000);
      }
    }, 4000);

    utterance.onend = () => {
      clearTimeout(startTimeout);
      if (!isPlayingRef.current) return;
      const nextIdx = currentSentenceRef.current + 1;
      const curPage = currentReadingPageRef.current;

      // We need to check if there are more sentences on this page
      // Use getPageText which is cached and instant for already-loaded pages
      getPageText(curPage).then((curPageData) => {
        if (curPageData && nextIdx < curPageData.sentences.length) {
          setCurrentSentenceIndex(nextIdx);
          currentSentenceRef.current = nextIdx;
          setTimeout(() => speakSentence(nextIdx, curPage), 50);
        } else if (curPage < totalPages) {
          const nextPage = curPage + 1;
          setCurrentReadingPage(nextPage);
          setCurrentViewPage(nextPage);
          setCurrentSentenceIndex(0);
          currentReadingPageRef.current = nextPage;
          currentSentenceRef.current = 0;
          setTimeout(() => speakSentence(0, nextPage), 150);
        } else {
          setIsPlaying(false);
          setIsPreparing(false);
        }
      });
    };

    utterance.onerror = (e) => {
      clearTimeout(startTimeout);
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.error('Speech error:', e);
      setIsPlaying(false);
      setIsPreparing(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [getPageText, totalPages, voices]);

  const handlePlayPause = useCallback(() => {
    if (!pdfDoc) return;
    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPreparing(false);
    } else {
      // Unlock synth on user interaction (fixes Chrome TTS bug)
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      synthRef.current.speak(unlock);

      setIsPlaying(true);
      setIsPreparing(true);
      setShowToolbar(true);
      // Start reading from whichever page is currently viewed
      const readPage = currentViewPage;
      setCurrentReadingPage(readPage);
      currentReadingPageRef.current = readPage;
      speakSentence(currentSentenceIndex, readPage);
    }
  }, [isPlaying, pdfDoc, currentSentenceIndex, currentViewPage, speakSentence]);

  const handleNext = useCallback(async () => {
    const pageData = await getPageText(currentReadingPage);
    if (!pageData) return;
    if (currentSentenceIndex < pageData.sentences.length - 1) {
      const nextIdx = currentSentenceIndex + 1;
      setCurrentSentenceIndex(nextIdx);
      currentSentenceRef.current = nextIdx;
      if (isPlaying) {
        synthRef.current.cancel();
        setTimeout(() => speakSentence(nextIdx, currentReadingPage), 50);
      }
    } else if (currentReadingPage < totalPages) {
      const nextPage = currentReadingPage + 1;
      setCurrentReadingPage(nextPage);
      setCurrentViewPage(nextPage);
      setCurrentSentenceIndex(0);
      currentReadingPageRef.current = nextPage;
      currentSentenceRef.current = 0;
      if (isPlaying) {
        synthRef.current.cancel();
        setTimeout(() => speakSentence(0, nextPage), 150);
      }
    }
  }, [currentSentenceIndex, currentReadingPage, totalPages, isPlaying, speakSentence, getPageText]);

  const handlePrev = useCallback(async () => {
    if (currentSentenceIndex > 0) {
      const prevIdx = currentSentenceIndex - 1;
      setCurrentSentenceIndex(prevIdx);
      currentSentenceRef.current = prevIdx;
      if (isPlaying) {
        synthRef.current.cancel();
        setTimeout(() => speakSentence(prevIdx, currentReadingPage), 50);
      }
    } else if (currentReadingPage > 1) {
      const prevPage = currentReadingPage - 1;
      const prevPageData = await getPageText(prevPage);
      const lastIdx = prevPageData ? Math.max(0, prevPageData.sentences.length - 1) : 0;
      setCurrentReadingPage(prevPage);
      setCurrentViewPage(prevPage);
      setCurrentSentenceIndex(lastIdx);
      currentReadingPageRef.current = prevPage;
      currentSentenceRef.current = lastIdx;
      if (isPlaying) {
        synthRef.current.cancel();
        setTimeout(() => speakSentence(lastIdx, prevPage), 150);
      }
    }
  }, [currentSentenceIndex, currentReadingPage, isPlaying, speakSentence, getPageText]);

  const handleSpeedChange = useCallback((newSpeed) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    if (isPlaying) {
      synthRef.current.cancel();
      setTimeout(() => speakSentence(currentSentenceRef.current, currentReadingPageRef.current), 50);
    }
  }, [isPlaying, speakSentence]);

  const handleVoiceChange = useCallback((voiceIdx) => {
    setSelectedVoiceIndex(voiceIdx);
    selectedVoiceRef.current = voiceIdx;
    if (isPlaying) {
      synthRef.current.cancel();
      setTimeout(() => speakSentence(currentSentenceRef.current, currentReadingPageRef.current), 50);
    }
  }, [isPlaying, speakSentence]);

  const handleClose = useCallback(() => {
    synthRef.current.cancel();
    setIsPlaying(false);
    setIsPreparing(false);
    setShowToolbar(false);
  }, []);

  const hasNextSentence = useMemo(() => {
    if (!currentPageText) return currentReadingPage < totalPages;
    const pageData = currentPageText.pageNumber === currentReadingPage ? currentPageText : null;
    if (!pageData) return currentReadingPage < totalPages;
    return currentSentenceIndex < pageData.sentences.length - 1 || currentReadingPage < totalPages;
  }, [currentSentenceIndex, currentReadingPage, currentPageText, totalPages]);

  const hasPrevSentence = useMemo(() => {
    return currentSentenceIndex > 0 || currentReadingPage > 1;
  }, [currentSentenceIndex, currentReadingPage]);

  // ─── Upload screen ───
  if (!pdfDoc) {
    return (
      <div className="reader-container">
        {isParsing ? (
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p className="loading-text">Opening PDF...</p>
          </div>
        ) : (
          <PdfUploader onFileLoaded={handleFileLoaded} />
        )}
        {error && <p className="error-message">{error}</p>}
      </div>
    );
  }

  // Effective width with zoom
  const effectiveWidth = Math.min(containerWidth - 48, 900) * zoomLevel;

  // ─── Reader view ───
  return (
    <div className="reader-container">
      {/* Top app bar */}
      <div className="reader-topbar">
        <div className="topbar-left">
          <span className="topbar-title">{filename || 'VoxReader AI'}</span>
          <span className="topbar-page-info">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </span>
        </div>
        <div className="topbar-right">
          {!showToolbar && (
            <button
              className="topbar-btn read-aloud-btn"
              onClick={() => {
                setShowToolbar(true);
                if (!isPlaying) handlePlayPause();
              }}
              title="Read Aloud"
            >
              🔊 Read Aloud
            </button>
          )}
          <label className="topbar-btn open-file-btn" htmlFor="pdf-reupload">
            Open File
          </label>
          <input
            type="file"
            id="pdf-reupload"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => handleFileLoaded(ev.target.result, file.name);
                reader.readAsArrayBuffer(file);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Error Toast */}
      {error && <div className="error-toast">{error}</div>}

      {/* Read Aloud toolbar */}
      {showToolbar && (
        <PlaybackControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          voices={voices}
          selectedVoiceIndex={selectedVoiceIndex}
          onVoiceChange={handleVoiceChange}
          hasNext={hasNextSentence}
          hasPrev={hasPrevSentence}
          onClose={handleClose}
          isReady={true}
        />
      )}

      {/* Preparing to read overlay */}
      {isPreparing && (
        <div className="preparing-overlay">
          <div className="preparing-content">
            <div className="soundwave-animation">
              <span className="soundwave-bar"></span>
              <span className="soundwave-bar"></span>
              <span className="soundwave-bar"></span>
              <span className="soundwave-bar"></span>
              <span className="soundwave-bar"></span>
            </div>
            <p className="preparing-text">Preparing to read…</p>
          </div>
        </div>
      )}

      {/* Sentence indicator */}
      {showToolbar && !isPreparing && currentPageSentences.length > 0 && (
        <div className="sentence-indicator">
          <div className="sentence-indicator-inner">
            <span className="sentence-page-badge">Page {currentReadingPage}</span>
            <p className="current-sentence-text">
              {currentPageSentences[currentSentenceIndex] || ''}
            </p>
          </div>
        </div>
      )}

      {/* Single-page PDF viewer */}
      <div className="pdf-viewer" ref={viewerRef}>
        <div className="pdf-single-page">
          <div className="pdf-page-number">Page {currentViewPage}</div>
          <PdfPageCanvas
            pdfDoc={pdfDoc}
            pageNumber={currentViewPage}
            containerWidth={effectiveWidth}
          />
        </div>
      </div>

      {/* Bottom navigation bar — Edge style */}
      <PageNavigation
        currentPage={currentViewPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
    </div>
  );
}
