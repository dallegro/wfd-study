
# Changelog

## 1.4.0 — Unreleased

- Add optional OS media controls for practice playback, with neutral sentence-number metadata.
- Request playback audio-session behavior where supported.
- Recover overdue repeat transitions on foreground return without overriding an explicit pause.
- Protect dictation drafts and exam playback from lock-screen navigation.
- Add playback regression checks for Chromium, Firefox and WebKit. Physical-device background playback still depends on the browser and OS.

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

[1.3.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.3.0
[1.2.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.2.0
[1.1.1]: https://github.com/dallegro/wfd-study/pull/2
[1.1.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.1.0
[1.0.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.0.0
