
<div align="center">
  <img src="./icon-192.png" width="80" height="80" alt="wfd. app icon" />
  <h1>wfd.</h1>
  <p><strong>Listen. Recall. Repeat.</strong></p>
  <p>A Write from Dictation practice app for PTE learners.</p>
  <p>
    <a href="https://dallegro.github.io/wfd-study/">Open the app</a> ·
    <a href="#getting-started">Getting started</a> ·
    <a href="#한국어-안내">한국어 안내</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Platform-Web%20%2F%20PWA-625CE0" alt="Web and PWA" />
    <img src="https://img.shields.io/badge/Study-WFD%20191-625CE0" alt="191 sentences" />
    <img src="https://img.shields.io/badge/JavaScript-ES%20Modules-625CE0" alt="JavaScript ES Modules" />
    <img src="https://github.com/dallegro/wfd-study/actions/workflows/checks.yml/badge.svg?branch=main" alt="App checks" />
  </p>
</div>

## About

wfd. combines repeated listening, active recall, dictation, and spaced review in a lightweight, offline-capable web app. No account required.

## Features

| Feature | Description |
| --- | --- |
| Study plan | Custom daily targets and progress tracking |
| Audio playback | Adjustable speed, repetition, intervals, and playback order |
| Memorization | Transcripts, translations, and synchronized word highlighting |
| Dictation | Word-level feedback and individual word playback |
| Review | Spaced repetition, mistakes, learning history, and weak words |
| Exam practice | Four random sentences with timed responses |
| Appearance | System, light, and dark themes |
| Accessibility | Keyboard shortcuts, labeled controls, and responsive layouts |
| Languages | Korean, English, Cebuano, Japanese, Chinese, Hindi, Spanish, Vietnamese, Nepali, and Filipino |
| Offline | Installable PWA with locally cached recordings |

## Getting started

1. [Open wfd.](https://dallegro.github.io/wfd-study/)
2. Set your daily target and select a study day.
3. Listen and study in **Memorize** mode.
4. Practice recall in **Dictation** mode.
5. Revisit mistakes in **Review** or test yourself in **Exam**.

### Install as an app

- **iOS / iPadOS:** Safari → Share → Add to Home Screen
- **Android / Desktop:** Install app or Add to Home Screen, where supported.

Open the app online and wait for offline readiness before disconnecting.

## Technology

- HTML and CSS
- Vanilla JavaScript with native ES modules
- HTML Audio API
- localStorage
- Service Worker and Web App Manifest
- GitHub Pages

No framework, backend, or production build step is required.

## Project structure

```text
wfd-study/
├── app/
│   └── v1.3.0/
│       ├── src/
│       └── styles/
├── audio/
├── docs/
├── tests/
├── .github/workflows/
├── index.html
├── sw.js
├── manifest.webmanifest
├── package.json
├── CHANGELOG.md
└── README.md
```

Previous versioned assets are retained for compatibility.

## Development

Requires Node.js 22 for automated tests.

Run locally:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Run core tests:

```sh
npm test
```

See [Architecture](docs/ARCHITECTURE.md) for module responsibilities, browser testing, and release procedures.

See [Changelog](CHANGELOG.md) for version history.

## Privacy & limitations

- Learning records and preferences are stored locally in the browser.
- Clearing browser data may erase learning records.
- Learning records are not synchronized across devices.
- Cloudflare Web Analytics measures site usage and performance.
- Dictation feedback is for practice and does not represent official Pearson scores.
- Word-level audio playback may not perfectly isolate individual words.

## 한국어 안내

PTE WFD 191문장을 반복 듣기, 암기, 받아쓰기, 복습 및 실전 연습으로 학습할 수 있는 웹앱입니다.

일일 학습량과 학습 회차를 설정하고, 암기 모드에서 문장을 학습한 뒤 받아쓰기 모드에서 기억을 점검하세요. 오답과 학습 기록은 복습 메뉴에서 확인할 수 있습니다.

학습 기록은 현재 브라우저에 저장되며, 최초 오프라인 준비가 완료되면 인터넷 연결 없이 학습할 수 있습니다.

## Credits

Designed & developed by [Daseul Kim (김다슬)](https://github.com/dallegro) · [@ektmfdl](https://www.instagram.com/ektmfdl/)

Learning materials and audio: Banditbul Education (Nov 19). Third-party materials remain subject to their respective rights. Attribution does not establish redistribution permission.

Independent practice tool. Not affiliated with or endorsed by Pearson.

<div align="center">
  <sub>Built for learners, by a learner.</sub>
</div>
