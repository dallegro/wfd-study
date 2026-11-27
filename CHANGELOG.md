# Changelog

## 1.1.0 — refactor candidate

- Separate HTML, ordered CSS, study logic, scoring, locale data, word timings, player visuals, review/exam, help, appearance and PWA logic.
- Extract 191 original MP3s without transcoding; load recordings individually and precompute waveform peaks.
- Use a versioned offline cache with full-library background precaching and HTTP byte-range support.
- Preserve existing localStorage keys and sentence order.
- Add Node core tests, Playwright smoke tests and GitHub Actions checks.
- Keep the existing interface and study behavior; comprehensive CSS consolidation and full ES-module conversion are intentionally deferred.

Validation: JavaScript syntax and 10 Node tests passed; all 191 MP3 files were compared byte-for-byte against the previous embedded audio. Actual browser testing was blocked by the local execution environment and must be completed before marking this release stable.

## 1.0.0 — previous public version

- WFD practice, memorization, dictation, review, exam, 10 languages and appearance controls.
- Installable PWA with embedded audio and locally stored learning progress.
