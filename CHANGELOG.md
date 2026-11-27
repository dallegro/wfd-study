
# Changelog

All notable changes to wfd. are documented in this file.

## 1.4.3 — Unreleased

### Fixed
- Initialize the optional playback audio session for word-only playback without claiming system media controls.
- Use the native player until media playback has made progress, including after returning from the background.
- Fall back on failed, interrupted or prematurely ended Web Audio playback instead of reporting false completion.
- Bound native word playback startup, cancel stale callbacks, and preserve user-selected seek positions.

### Tests
- Expanded core test coverage from 31 to 36 tests.
- Added cold-start, output category, foreground restoration, early-end, watchdog and rejected-resume regression coverage.
- Physical iOS audio output still requires retesting.

## [1.4.2] - 2026-11-27

### Changed
- Introduced Web Audio API support for individual word playback.
- Prepared only the current sentence to minimize memory usage.
- Reduced repeated audio seeking when selecting words.
- Cancelled previous word playback when another word is selected.
- Preserved synchronized word highlighting and playback position.

### Compatibility
- Retained media-element playback when Web Audio is unavailable or decoding is incomplete.
- Preserved existing pitch-corrected playback at non-default speeds.
- Maintained original recordings, word timings, learning records, and preferences.
- Preserved full-sentence playback and offline support.

### Tests
- Expanded core test coverage from 28 to 31 tests.
- Added decoded-buffer lifecycle, rapid selection, and fallback regression tests.
- Passed Chromium, Firefox, and WebKit CI checks.
- Physical mobile playback latency remains to be measured.

## [1.4.1] - 2026-11-27

### Changed
- Introduced adaptive rendering based on runtime performance.
- Preserved native refresh cadence when rendering is healthy.
- Reduced visual update frequency under sustained rendering pressure.
- Restored normal rendering cadence when performance recovers.
- Suspended unnecessary visual updates when the page is hidden.
- Deferred sentence-list rendering and reused existing DOM elements.
- Reduced redundant system media updates.

### Offline & Compatibility
- Separated app-shell installation from audio preparation.
- Introduced adaptive audio download concurrency from two to eight concurrent requests.
- Reused existing cached recordings where available.
- Improved recovery from incomplete downloads.
- Preserved online playback when cache access fails.
- Improved compatibility with older browser APIs.

### Tests
- Expanded core test coverage from 20 to 28 tests.
- Added adaptive rendering and download concurrency tests.
- Added simulated slow CPU and network testing.
- Passed Chromium, Firefox, and WebKit CI checks.
- Physical-device performance and older OS compatibility remain to be verified.

## [1.4.0] - 2026-11-27

### Added
- Media Session integration for system media controls.
- Audio Session support where available.
- Lock-screen playback metadata and sentence navigation.

### Fixed
- Improved recovery from interrupted playback and delayed repeat transitions.
- Protected dictation drafts from external navigation.
- Isolated exam playback from practice media controls.

### Tests
- Expanded core test coverage from 18 to 20 tests.
- Added cross-browser playback regression tests.
- Passed Chromium, Firefox, and WebKit CI checks.

### Compatibility
- Preserved existing learning records, preferences, and recordings.
- Retained playback support for browsers without media session APIs.
- Background playback remains subject to browser and operating system restrictions.

## [1.3.0] - 2026-11-27

### Changed
- Extracted review scheduling and history into a dedicated module.
- Improved validation of locally stored learning records.
- Strengthened offline cache verification.
- Simplified project documentation.

### Tests
- Expanded core test coverage from 13 to 18 tests.
- Added regression tests for review intervals, history limits, malformed records, and incomplete caches.

## [1.2.0] - 2026-11-27

### Changed
- Migrated to native ES modules.
- Introduced explicit study-state transitions.
- Separated study planning and storage logic.

### Added
- EditorConfig and Prettier configuration.
- Architecture documentation.
- Additional regression tests.

## [1.1.1] - 2026-11-27

### Fixed
- Improved initial layout stability.
- Reserved space for dynamic status messages.

### Tests
- Added a layout-shift regression test.

## [1.1.0] - 2026-11-27

### Changed
- Separated application scripts, styles, and audio assets.
- Introduced on-demand audio loading.
- Added precomputed waveform data.
- Improved offline caching and media byte-range support.

### Added
- Automated core tests.
- Playwright browser tests.
- GitHub Actions workflow.

## [1.0.0] - 2026-11-27

### Added
- Initial public release.
- Memorization and dictation modes.
- Audio playback and repetition controls.
- Daily study plans and progress tracking.
- Review and exam practice.
- Multilingual interface.
- Offline PWA support.

[1.4.2]: https://github.com/dallegro/wfd-study/releases/tag/v1.4.2
[1.4.1]: https://github.com/dallegro/wfd-study/releases/tag/v1.4.1
[1.4.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.4.0
[1.3.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.3.0
[1.2.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.2.0
[1.1.1]: https://github.com/dallegro/wfd-study/pull/2
[1.1.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.1.0
[1.0.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.0.0
