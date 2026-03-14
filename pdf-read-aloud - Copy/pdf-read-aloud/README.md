# VoxReader AI

VoxReader AI is an intelligent, completely free, and open-source PDF reader designed to read and vocalize PDF documents right in your browser. 

It features an Edge-browser-inspired reading interface, on-the-fly local text extraction, and robust text-to-speech engine integration with offline voice support.

## Features

- **Blazing Fast Single-Page Viewer**: Optimized to open PDFs of any size (even 10,000+ pages) without crashing memory.
- **Lazy Text Extraction**: Analyzes and caches text instantly only for the page you are viewing.  
- **Edge-Style Navigation**: Smooth navigation bar with precise page-jump functionality and dynamic zoom controls.
- **Smart Text-to-Speech (TTS)**: Built-in TTS functionality with adjustable playback speeds up to 3x.
- **Voice Labeling**: Clearly differentiates between `(Online)` and `(Offline)` voices for robust reading without an internet connection.
- **100% Free & Open Source**: Run it securely on your local device.

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Open the displayed localhost URL in your browser.

## Tech Stack
- React
- Vite
- pdfjs-dist
- Web Speech API (Synthesis)

## License
[MIT License](LICENSE) - Copyright (c) 2026 Kaushik Ghosh
