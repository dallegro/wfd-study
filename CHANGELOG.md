# Changelog

## 1.3.0 — Unreleased

- Extract review scheduling and history updates into a testable model.
- Validate locally stored progress and review records before rendering.
- Verify offline readiness against the active worker's complete asset manifest.
- Add regression coverage for corrupt records, review intervals, history limits and missing cached assets.

## 1.2.0

- Adopt native ES modules and explicit study-state transitions.
- Extract study planning and storage helpers.
- Add editor configuration, architecture documentation and regression tests.

## 1.1.1

- Reserve space for startup and offline status messages.
- Add a layout-shift regression test.

## 1.1.0

- Separate application scripts, styles and audio.
- Load recordings individually and use precomputed waveform data.
- Introduce versioned offline caching with media byte-range responses.
- Add core tests, browser smoke tests and GitHub Actions.

## 1.0.0

- Initial public release with memorization, dictation, review, exam practice and offline access.
