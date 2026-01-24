# Project Status

## Current State
- Vue 3 + TypeScript + Vite project with Arco Design Vue UI.
- Timeline editor supports drag, resize, multi-select box, playhead, zoom, and snapping (100ms).
- Import: SRT, LRC, and plain text (fixed 3s per line).
- Export: SRT and LRC with copy/download.
- Fake playback with play/pause/stop, auto-scroll, and active segment highlight.
- YouTube sync panel: load video, sync playhead with video time, and expand timeline to video duration.

## Key Files
- `src/App.vue`: core UI, timeline logic, import/export, playback, and YouTube integration.
- `src/styles.css`: layout and timeline styling.
- `AGENTS.md`: contributor guide.

## Recent Commits
- `53338ac` Initial lyric timeline editor
- `df333e9` Add plain text import and overlap tools
- `2a61073` Add YouTube sync and playback tracking

## TODO / Next Steps
- Decide if plain-text import interval should be configurable.
- Add YouTube time offset control (optional).
- Add project save/load (JSON) if needed.
- Add selection-only overlap resolve or gap settings if desired.
