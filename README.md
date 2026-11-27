
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
    <a href="https://github.com/dallegro/wfd-study/actions/workflows/checks.yml"><img src="https://github.com/dallegro/wfd-study/actions/workflows/checks.yml/badge.svg?branch=main" alt="App checks" /></a>
    <a href="https://github.com/dallegro/wfd-study/releases/latest"><img src="https://img.shields.io/github/v/release/dallegro/wfd-study" alt="Latest release" /></a>
  </p>
</div>

## About

wfd. combines repeated listening, active recall, dictation, and spaced review in a lightweight, offline-capable web app.

Designed for everyday learning across mobile, tablet, and desktop devices, with adaptive performance and no account required.

## Features

| Feature | Description |
| --- | --- |
| Study plan | Custom daily targets and progress tracking |
| Audio playback | Adjustable speed, repetition, intervals, and playback order |
| Background listening | System media controls and lock-screen playback on supported browsers |
| Memorization | Transcripts, translations, and synchronized word highlighting |
| Word playback | Tap individual words to listen to the corresponding original audio |
| Dictation | Word-level feedback for spelling, omissions, and incorrect words |
| Review | Spaced repetition, mistakes, learning history, and weak words |
| Exam practice | Four random sentences with timed responses |
| Appearance | System, light, and dark themes |
| Accessibility | Keyboard shortcuts, labeled controls, and responsive layouts |
| Languages | Korean, English, Cebuano, Japanese, Simplified Chinese, Hindi, Spanish, Vietnamese, Nepali, and Filipino |
| Performance | Adaptive rendering, on-demand audio loading, and optimized word playback |
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

Online practice can begin while audio is being prepared in the background.

Wait until offline readiness is confirmed before disconnecting from the internet. If offline preparation fails, reopen the app while connected.

### Background listening

Start audio playback before switching apps or locking the screen.

On supported browsers, system media controls allow you to:

- Play and pause audio.
- Navigate sentences in memorization mode.
- View the current sentence number.
- Control playback through compatible media buttons.

Dictation and review restrict external navigation to protect answers and progress.

Background playback and automatic transitions depend on browser and operating system restrictions. If playback stops, return to the app and resume.

### Word playback

Tap a word in the transcript or supported dictation feedback to hear the corresponding part of the original recording.

At normal playback speed, browsers that support an explicit playback audio session can use the current decoded sentence for low-latency word playback, including the first tap when decoding is ready. No full-sentence playback or warm-up audio is required.

The original media-element playback method remains available when:

- The browser cannot confirm the playback audio category.
- The decoded audio is not yet ready.
- Web Audio is unavailable or fails.
- A non-default playback speed is selected.

This preserves the existing pitch-corrected playback behavior at other speeds.

## Performance

wfd. is designed to reduce unnecessary processing without compromising the experience on capable devices.

### Adaptive rendering

- Preserves the browser's native refresh cadence when rendering is healthy.
- Reduces visual update frequency under sustained rendering pressure.
- Restores normal rendering cadence when performance recovers.
- Suspends unnecessary visual updates when the page is hidden.

### Audio efficiency

- Loads sentence recordings on demand.
- Uses precomputed waveforms and word timings.
- Retains only the current decoded sentence for optimized word playback.
- Cancels superseded word playback to avoid overlapping audio.
- Preserves the original recordings without additional compression.

### Resource management

- Defers sentence-list rendering until needed.
- Reuses existing sentence buttons.
- Reduces redundant DOM and system media updates.
- Adapts background download concurrency to available connection information and measured batch times.

No separate low-performance mode is required.

### Offline resilience

- Installs the app shell independently of the complete audio library.
- Reuses existing cached recordings across compatible releases.
- Resumes incomplete audio preparation.
- Falls back to online playback when cache access fails.
- Verifies offline readiness against the required cached assets.

Actual performance varies by device, browser, network, and operating system.

## Technology

- HTML and CSS
- Vanilla JavaScript with native ES modules
- HTML Audio API
- Web Audio API
- Media Session API
- Audio Session API, where supported
- Page Visibility API
- Network Information API, where supported
- localStorage
- Cache Storage API
- Service Worker and Web App Manifest
- GitHub Pages

No framework, backend, or production build step is required.

## Project structure

```text
wfd-study/
├── app/
│   └── v1.4.3/
│       ├── src/
│       │   ├── main.js
│       │   ├── study.js
│       │   ├── study-plan.js
│       │   ├── player-ui.js
│       │   ├── word-audio.js
│       │   ├── media-session.js
│       │   ├── adaptive-performance.js
│       │   ├── review-exam.js
│       │   ├── review-model.js
│       │   ├── scoring.js
│       │   ├── storage.js
│       │   ├── pwa.js
│       │   ├── locales.js
│       │   ├── sentences.js
│       │   ├── word-timings.js
│       │   ├── waveforms.js
│       │   ├── theme.js
│       │   └── help.js
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
python3 tests/http_server.py 8000
```

Open `http://localhost:8000`.

Run core tests:

```sh
npm test
```

### Testing

The current release includes 37 automated core tests covering:

- Dictation scoring and data integrity.
- Study planning and local storage.
- Review scheduling and learning history.
- Offline cache integrity and recovery.
- Media controls and playback state.
- Adaptive rendering and download concurrency.
- Word audio lifecycle and fallback behavior.

Browser integration checks cover:

- Mobile and desktop layouts.
- Learning progress and navigation.
- Theme and language settings.
- Dictation, review, and exam workflows.
- Offline playback.
- Rapid word selection.
- System media controls.
- Simulated slow CPU and network conditions.

GitHub Actions runs automated checks using Chromium, Firefox, and WebKit.

Browser-engine tests and simulated performance conditions do not replace physical-device testing. Actual mobile playback latency, memory usage, battery consumption, and older OS compatibility require further measurement.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Module responsibilities, testing, and release procedures.
- [Changelog](CHANGELOG.md) — Version history and notable changes.
- [Releases](https://github.com/dallegro/wfd-study/releases) — Published versions.

## Privacy & limitations

- Learning records and preferences are stored locally in the browser.
- No account is required.
- Clearing browser data may erase learning records.
- Learning records are not synchronized across devices.
- Cloudflare Web Analytics measures site usage and performance.
- Dictation feedback is for practice and does not represent official Pearson scores.
- Word-level audio playback may not perfectly isolate individual words.
- Background playback depends on browser and operating system support.
- Offline storage is subject to browser storage policies and available device storage.

## 한국어 안내

PTE WFD 191문장을 반복 듣기, 암기, 받아쓰기, 복습 및 실전 연습으로 학습할 수 있는 웹앱입니다.

### 학습 방법

1. 일일 학습량과 학습 회차를 설정합니다.
2. 암기 모드에서 음성을 듣고 문장을 학습합니다.
3. 받아쓰기 모드에서 기억한 문장을 입력합니다.
4. 채점 결과를 확인하고 틀린 단어를 학습합니다.
5. 복습 또는 실전 연습으로 학습 내용을 점검합니다.

### 음성 재생

문장 속 단어를 누르면 원본 음원의 해당 구간을 들을 수 있습니다.

지원되는 브라우저에서는 현재 문장의 음원을 미리 준비하여 단어별 재생 지연을 줄입니다. 음원이 준비되지 않았거나 다른 배속을 사용하는 경우 기존 재생 방식이 적용됩니다.

지원되는 환경에서는 다른 앱을 사용하거나 화면을 잠근 상태에서도 음성을 들을 수 있습니다. 백그라운드 연속 재생 및 미디어 제어는 기기와 브라우저에 따라 다를 수 있습니다.

### 성능 최적화

기기의 실제 렌더링 상태와 네트워크 환경에 따라 화면 갱신 및 음원 다운로드를 자동으로 조절합니다.

별도의 저사양 모드 설정 없이 다양한 기기에서 학습할 수 있도록 설계되었습니다.

### 오프라인 학습

최초 오프라인 준비가 완료되면 인터넷 연결 없이 학습할 수 있습니다.

학습 기록은 현재 브라우저에 저장됩니다. 브라우저 데이터를 삭제하면 학습 기록이 사라질 수 있습니다.

## Credits

Designed & developed by [Daseul Kim (김다슬)](https://github.com/dallegro) · [@ektmfdl](https://www.instagram.com/ektmfdl/)

Learning materials and audio: Banditbul Education (Nov 19).

Third-party materials remain subject to their respective rights. Attribution does not establish redistribution permission.

Independent practice tool. Not affiliated with or endorsed by Pearson.

<div align="center">
  <sub>Built for learners, by a learner.</sub>
</div>
