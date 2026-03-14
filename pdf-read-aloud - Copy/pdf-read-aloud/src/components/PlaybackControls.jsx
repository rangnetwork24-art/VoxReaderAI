import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2 } from 'lucide-react';

/**
 * Edge-style floating Read Aloud toolbar.
 * Clean, minimal bar at the top of the viewer.
 */
export default function PlaybackControls({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  speed,
  onSpeedChange,
  voices,
  selectedVoiceIndex,
  onVoiceChange,
  hasNext,
  hasPrev,
  onClose,
  isReady,
}) {
  return (
    <div className="playback-toolbar">
      <div className="toolbar-section toolbar-left">
        <button
          className="toolbar-btn"
          onClick={onPrev}
          disabled={!hasPrev || !isReady}
          title="Previous Sentence"
        >
          <SkipBack size={18} />
        </button>

        <button
          className="toolbar-btn toolbar-play-btn"
          onClick={onPlayPause}
          disabled={!isReady}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
        </button>

        <button
          className="toolbar-btn"
          onClick={onNext}
          disabled={!hasNext || !isReady}
          title="Next Sentence"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="toolbar-section toolbar-center">
        <div className="voice-selector">
          <Volume2 size={16} className="voice-icon" />
          <select
            value={selectedVoiceIndex}
            onChange={(e) => onVoiceChange(parseInt(e.target.value, 10))}
            className="voice-dropdown"
            title="Select Voice"
          >
            {voices.map((voice, idx) => (
              <option key={idx} value={idx}>
                {voice.name} {voice.localService ? '(Offline)' : '(Online)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="toolbar-section toolbar-right">
        <div className="speed-control">
          <label className="speed-label">Speed</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="speed-slider"
            title={`Speed: ${speed}x`}
          />
          <span className="speed-value">{speed}x</span>
        </div>

        <button
          className="toolbar-btn toolbar-close-btn"
          onClick={onClose}
          title="Stop Reading"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
