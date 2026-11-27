# Architecture

## Constraints

- Static hosting without a required production build or server.
- Preserve existing study records and audio files.
- Cache the offline shell and its modules as one release.

## Module boundaries

| Module | Responsibility |
| --- | --- |
| main | Ordered feature initialization |
| study | Study session, navigation and transport state; review transitions |
| player-ui | Waveform and progress rendering |
| scoring | Pure ordered word alignment |
| study-plan | Day ranges, goal validation and resume index |
| storage | JSON persistence with graceful failure |
| review-exam | Review history, scheduled practice and timed exams |
| locales | Locale selection and translation |
| sentences / word-timings / waveforms | Content and audio metadata |
| pwa | Offline readiness and install UI |
| theme / help | Appearance and guidance |

The review module imports live bindings and calls transitions instead of reassigning another module's variables. Study remains a larger controller; its transport and DOM rendering can be extracted later.

## Development

Use Node.js 22 and a local HTTP server. Run `npm test` for core and asset checks. The browser test exercises grading, review return, theme, language, startup layout and offline audio. CI runs both.

Optional pinned Prettier commands and editor settings are provided. This migration uses conservative statement-boundary formatting; full Prettier compliance and CSS cascade consolidation are not yet enforced.

## Release

Keep HTML, module paths, service-worker precache list, readiness key and cache-count assertions in sync. Do not clear site data to update. Check installed PWA upgrades and Safari/iOS manually; monitor field LCP and CLS.
