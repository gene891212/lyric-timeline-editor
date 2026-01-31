# Lyric Timeline Editor

A Vue 3 + TypeScript lyric timeline editor with drag/resize, multi-select, SRT/LRC import, and YouTube sync.

Live Demo: https://gene891212.github.io/lyric-timeline-editor/

## Features
- Drag, resize, multi-select, and snap editing on a timeline
- Import SRT/LRC or plain text (one line per lyric)
- Export to SRT or LRC
- Optional YouTube sync for timeline playback
- Left-side lyric list with inline time/text editing

## Usage
1. Click **Import SRT/LRC** to upload an SRT/LRC file or paste text (one line per lyric).
2. Drag segments to move or resize them.
3. Use the left list to edit times/text, play a segment, or delete it.
4. Paste a YouTube URL and click **Load** to sync with video time.
5. Click **Export** to copy or download SRT/LRC.

## Tech Stack
- Vue 3 + TypeScript
- Arco Design Vue
- Vite
- pnpm

## Project Structure
- `src/App.vue`: Main UI and timeline logic
- `src/styles.css`: Global styles
- `src/main.ts`: App bootstrap
- `index.html`: Vite entry

## Setup
```bash
pnpm install
```

## Development
```bash
pnpm dev
```

## Build
```bash
pnpm build
```

## Preview
```bash
pnpm preview
```

## Shortcuts
- Space: Play/Pause
- + / -: Zoom In/Out
- Ctrl/Cmd + Z: Undo
- Shift + Ctrl/Cmd + Z: Redo
- Delete / Backspace: Delete segment
