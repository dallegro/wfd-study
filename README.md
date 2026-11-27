<div align="center">
  <img src="./icon-192.png" width="80" height="80" alt="wfd. app icon" />
  <h1>wfd.</h1>
  <p><strong>Listen. Recall. Repeat.</strong></p>
  <p>A focused Write from Dictation practice app for PTE learners.</p>
  <p><a href="https://dallegro.github.io/wfd-study/">Open the app</a> · <a href="#getting-started">Getting started</a> · <a href="#한국어-안내">한국어 안내</a></p>
  <p><img src="https://img.shields.io/badge/Platform-Web%20%2F%20PWA-625CE0" alt="Web and PWA" /> <img src="https://img.shields.io/badge/Study-WFD%20191-625CE0" alt="191 sentences" /> <img src="https://img.shields.io/badge/Built%20with-Vanilla%20JS-625CE0" alt="Vanilla JavaScript" /></p>
</div>

---

## About

**wfd.** is an independent learning tool designed to make repeated listening, active recall and dictation practice easier. It brings audio, transcripts, feedback and review into one lightweight interface, without requiring an account.

## Features

| Feature | Description |
| --- | --- |
| Study plan | Choose a daily sentence target and study day. |
| Audio player | Repeat one sentence or play the day's set, with speed, interval, order and loop controls. |
| Memorization | Read the transcript and translation, follow word highlighting and replay word-level audio clips. |
| Dictation | Type what you hear and compare correct, missing and extra words. |
| Review | Revisit errors and scheduled reviews; inspect locally stored learning history. |
| Exam practice | Four randomly selected sentences with timed responses and results. |
| Appearance | Follow the system theme or choose light or dark mode. |
| Accessibility | Keyboard shortcuts, visible focus, labeled controls and responsive layout. |
| Languages | Korean, English, Cebuano, Japanese, Simplified Chinese, Hindi, Spanish, Vietnamese, Nepali and Filipino. |
| Offline access | Installable PWA with individual MP3 playback and a complete offline cache after initial setup. |

## Getting started

1. Open [wfd.](https://dallegro.github.io/wfd-study/).
2. Choose a study day and adjust the daily target in the sentence list.
3. Use **Memorize** to listen and study the transcript, or **Dictation** to practice recall.
4. Check your answer, replay difficult words and move to the next sentence.
5. Open **Review / Learning history** or **Exam mode** to revisit learning progress.

Use the appearance icon in the header to cycle through **System → Light → Dark**. The preference is saved on your device when browser storage is available. The help and keyboard icons explain the learning controls.

### Install as an app

- **iPhone / iPad:** Open in Safari, use Share → Add to Home Screen.
- **Desktop / Android:** Use the browser's Install app or Add to Home Screen option when available.

Open the app online first and wait for offline readiness before disconnecting. The service worker prepares all 191 recordings in the background; the study interface does not wait for that download. Installation and offline behavior depend on browser support and available storage.

## Technology

HTML, CSS and vanilla JavaScript · HTML audio playback with precomputed waveform peaks · localStorage · Service Worker · Web App Manifest · GitHub Pages.

```text
wfd-study/
├── index.html              # Interface and ordered script entry points
├── app/v1.1.0/
│   ├── styles/             # Base, components and layout (ordered cascade)
│   └── src/                # Study, player, scoring, review, exam, theme, help
│       ├── sentences.js    # Sentences and translations (no audio payload)
│       ├── word-timings.js # Original word-alignment timings
│       ├── waveforms.js    # Precomputed audio peak amplitudes
│       └── locales.js     # Core interface translations
├── audio/                  # 191 original MP3 recordings
├── tests/                  # Node unit tests and Playwright browser smoke test
├── .github/workflows/      # Continuous integration checks
├── manifest.webmanifest
├── sw.js                   # Versioned offline cache and media range responses
├── icon-192.png
├── icon-512.png
├── apple-touch-icon.png
├── CHANGELOG.md
└── README.md
```

To run locally, serve this folder over HTTP (rather than opening a file URL) for PWA testing:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. No build step is required. Production deployment uses HTTPS.

## Architecture & quality

The app remains framework-free and requires no production build step. The main UI loads versioned CSS and ordered deferred JavaScript files. The original application state is shared by these scripts for compatibility; this is an incremental refactor, not a full ES-module rewrite. Audio files are fetched individually and waveform peaks are calculated in advance, eliminating runtime waveform decoding. The service worker installs a complete release together and supports cached MP3 byte ranges for media playback.

Run the core tests using Node.js 22:

```bash
node --test tests/core.test.cjs
```

Run the browser smoke test with a local HTTP server running:

```bash
pip install playwright==1.57.0
python -m playwright install chromium
python tests/browser_smoke.py
```

GitHub Actions is configured to run syntax, core and browser checks. Review the first browser CI result before publishing a stable release. When changing versioned assets, update the release directory and references in HTML, the service worker and the readiness check together. Reload after a new service worker takes control to see the updated interface. Existing learning records use the same localStorage keys; do not clear site data to update the app.

## Privacy & limitations

Learning history and preferences are stored locally in the browser. Clearing site data can erase them. Cloudflare Web Analytics is included for site usage and performance measurement. The app's word-comparison results are practice feedback, not official Pearson scores. Word-level audio clips may not perfectly isolate individual words.

## 한국어 안내

PTE WFD 191문장을 반복 듣기, 암기, 받아쓰기, 복습, 실전 연습으로 학습할 수 있는 웹앱입니다. 학습 날짜와 일일 학습량을 설정하고, 암기 모드에서 음성과 원문을 확인한 뒤 받아쓰기 모드로 기억을 점검하세요. 복습 및 학습 기록에서 틀린 문장을 다시 학습할 수 있습니다.

상단 화면 테마 버튼을 누르면 시스템 설정, 라이트, 다크 모드 순서로 전환됩니다. 학습 기록과 테마 설정은 브라우저에 저장됩니다. 오프라인 학습은 최초 온라인 연결 및 캐시 준비가 필요합니다.

## Credits

Designed & developed by **[Daseul Kim (김다슬)](https://github.com/dallegro)** · [@ektmfdl](https://www.instagram.com/ektmfdl/)

Learning materials and audio: Banditbul Education (Nov 19). Third-party materials remain subject to their respective rights; attribution does not establish redistribution permission.

Independent practice tool. Not affiliated with or endorsed by Pearson.

<div align="center"><sub>Built for learners, by a learner.</sub></div>
