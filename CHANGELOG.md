
# Changelog

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

[1.4.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.4.0
[1.3.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.3.0
[1.2.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.2.0
[1.1.1]: https://github.com/dallegro/wfd-study/pull/2
[1.1.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.1.0
[1.0.0]: https://github.com/dallegro/wfd-study/releases/tag/v1.0.0
