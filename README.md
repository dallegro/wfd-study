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
| Typing | Copy the visible sentence with live character feedback and automatic repetition |
| Dictation | Word-level feedback for spelling, omissions, and incorrect words |
| Review | Spaced repetition, mistakes, learning history, and read-only cumulative word-error analysis (sentence/position-aware records retained internally) |
| Record management | Export and restore JSON learning records across browsers using the same dataset |
| Exam practice | Four random sentences with timed responses |
| Appearance | System, light, and dark themes |
| Accessibility | Keyboard shortcuts, labeled controls, and responsive layouts |
| Languages | Korean, English, Cebuano, Japanese, Simplified Chinese, Hindi, Spanish, Vietnamese, Nepali, and Filipino |
| Performance | Adaptive rendering, on-demand audio loading, and optimized word playback |
| Offline | Installable PWA with locally cached recordings |

## Getting started

1. [Open wfd.](https://dallegro.github.io/wfd-study/)
2. Set your daily target and select a study session.
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

At normal playback speed, Web Audio uses the current decoded sentence for optimized word playback when the audio and output context are ready.

The optional Audio Session API configures playback output where supported. Lack of Audio Session support alone does not disable optimized playback on desktop or Android.

No full-sentence playback or additional user setup is required.

The original media-element playback method remains available when:

- An Apple mobile environment is detected but the playback audio category cannot be configured.
- The decoded audio is not yet ready.
- Audio output initialization is still in progress.
- Web Audio is unavailable or fails to initialize.
- A non-default playback speed is selected.

If audio initialization exceeds the 350 ms startup threshold, the current word uses native playback while initialization may continue. Subsequent words can reuse the output context once it is ready.

This approach avoids unnecessary context recreation and preserves the existing pitch-corrected playback behavior at other speeds.

Apple mobile device detection is a best-effort compatibility measure. Actual playback behavior varies by device, browser, and operating system.

### Typing practice (v1.5.0 preview)

In Memorise, turn on Typing. Start the existing player to repeat the current sentence; copy the visible English text exactly, including case and punctuation. Correct entries clear automatically and increment an independent per-sentence counter. Set a goal of 3, 5, 10 or unlimited repetitions under Practice settings. Navigation remains manual. Typing playback preferences are separate from normal study playback; typing counts do not mark memorisation or dictation complete. Mark a sentence memorised yourself in either memorisation practice style.

## Performance

wfd. is designed to reduce unnecessary processing while preserving responsiveness on capable devices.

### Adaptive rendering

- Preserves the browser's native refresh cadence when rendering is healthy.
- Reduces visual update frequency under sustained rendering pressure.
- Restores normal rendering cadence when performance recovers.
- Suspends unnecessary visual updates when the page is hidden.

### Audio efficiency

- Loads sentence recordings on demand.
- Uses precomputed waveforms and word timings.
- Retains only the current decoded sentence for optimized word playback.
- Reuses initialized audio contexts during foreground playback.
- Cancels superseded word playback to avoid overlapping audio.
- Prevents expired playback requests from restarting after delayed initialization.
- Preserves the original recordings without additional compression.

### Resource management

- Defers sentence-list rendering until needed.
- Reuses existing sentence buttons.
- Reduces redundant DOM and system media updates.
- Adapts background download concurrency to available connection information and measured batch times.
- Releases the word audio output context when the page enters the background.

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
│   └── v1.5.0/
│       ├── src/
│       │   ├── main.js
│       │   ├── typing.js
│       │   ├── typing-model.js
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

Requires Node.js 22 for automated core tests and Python 3 for the local development server.

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

The current release includes 43 automated core tests covering:

- Dictation scoring and data integrity.
- Study planning and local storage.
- Review scheduling and learning history.
- Offline cache integrity and recovery.
- Media controls and playback state.
- Adaptive rendering and download concurrency.
- Word audio initialization and lifecycle.
- Delayed initialization, context reuse, cancellation, and fallback behavior.

Browser integration checks cover:

- Mobile and desktop layouts.
- Learning progress and navigation.
- Theme and language settings.
- Dictation, review, and exam workflows.
- Offline playback.
- First-word playback without full-sentence playback.
- Rapid word selection.
- Audio context reuse after delayed initialization.
- Playback compatibility and native fallback.
- Foreground restoration.
- System media controls.
- Simulated slow CPU and network conditions.

GitHub Actions runs automated checks using Chromium, Firefox, and WebKit.

The local test server supports HTTP byte-range requests for media seeking. Firefox CI uses a virtual audio output to support media playback testing.

Browser-engine tests and simulated performance conditions do not replace physical-device testing. Actual audio output, mobile playback latency, memory usage, battery consumption, and older OS compatibility require further measurement.

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
- Audio playback behavior depends on browser and operating system support.
- Background playback and automatic transitions are subject to system restrictions.
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

지원되는 브라우저에서는 현재 문장의 음원을 미리 준비하여 단어별 재생 지연을 줄입니다.

음원 준비나 오디오 초기화가 완료되지 않은 경우 기존 재생 방식을 사용하며, 준비가 완료되면 이후 단어부터 최적화된 재생 방식으로 자동 전환합니다.

기기 및 브라우저 호환성과 음질을 유지하기 위해 일부 환경과 기본 배속 이외의 재생에서는 기존 재생 방식이 적용됩니다.

지원되는 환경에서는 다른 앱을 사용하거나 화면을 잠근 상태에서도 음성을 들을 수 있습니다. 백그라운드 연속 재생 및 미디어 제어는 기기와 브라우저에 따라 다를 수 있습니다.

### 성능 최적화

기기의 실제 렌더링 상태와 네트워크 환경에 따라 화면 갱신 및 음원 다운로드를 자동으로 조절합니다.

오디오 초기화 및 재생 상태에 따라 적절한 재생 방식을 선택하며, 준비된 음원과 오디오 컨텍스트를 재사용하여 불필요한 처리를 줄입니다.

별도의 저사양 모드 설정 없이 다양한 기기에서 학습할 수 있도록 설계되었습니다.

실제 재생 속도와 호환성은 기기, 브라우저 및 운영체제에 따라 달라질 수 있습니다.

### 오프라인 학습

최초 오프라인 준비가 완료되면 인터넷 연결 없이 학습할 수 있습니다.

학습 기록은 현재 브라우저에 저장됩니다. 복습 → 기록 관리에서 JSON으로 내보내거나 불러올 수 있습니다. 불러오면 현재 암기·채점·타이핑 기록을 교체합니다. 자동 동기화는 제공하지 않습니다.

암기 완료를 처음 표시하면 24시간 뒤 첫 복습이 예정됩니다. 기존 암기 표시 중 채점 이력이 없는 문장은 업데이트 시점부터 24시간 뒤로 예정됩니다. 취약 단어는 과거 누적 오류 횟수를 높은 순으로 표시하는 분석 전용 목록입니다. 학습 이력은 답안과 채점 결과를 확인하는 읽기 전용 목록입니다. 복습 예정과 오답 탭에서 문장을 복습합니다. 단어별 최근 오류와 위치 정보는 내부에 보존됩니다. 과거 기록에서 위치를 확인할 수 없는 경우 추정하지 않습니다.

## Credits

Designed & developed by [Daseul Kim (김다슬)](https://github.com/dallegro) · [@ektmfdl](https://www.instagram.com/ektmfdl/)

Learning materials and audio: Banditbul Education (Nov 19).

Third-party materials remain subject to their respective rights. Attribution does not establish redistribution permission.

Independent practice tool. Not affiliated with or endorsed by Pearson.

<div align="center">
  <sub>Built for learners, by a learner.</sub>
</div>
