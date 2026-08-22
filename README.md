# Lyric Sync Editor

A Vue 3 + TypeScript + Vite lyric editor that keeps the original Lyric Sync Editor workflow and adds an optional timeline editing view.

## Features

- Three original tabs: lyric text editing, timing sync, and dynamic preview.
- List-first timing workflow with Space stamping, Shift+Space playback, seeking, speed control, and keyboard navigation.
- Timeline view with segment move/resize, 10ms snapping, zoom, multi-select, box selection, double-click insertion, playhead dragging, follow mode, overlap resolution, Delete, and Undo/Redo.
- LRC, SRT, and plain-text import.
- LRC/SRT export, copy, and download.
- YouTube, local audio, and no-media modes through one media controller.
- Versioned localStorage project persistence with migration from lyric_editor_save.
- Local audio files stay in the current browser session and are never stored in localStorage.
- No backend, account, cloud sync, or collaboration layer.

## Tech stack

- Vue 3
- TypeScript
- Vite
- Vitest
- Native HTML controls with project CSS; Arco Design is not used by the integrated app.

## Setup

    pnpm install
    pnpm dev

## Verification

    pnpm exec tsc --noEmit
    pnpm test
    pnpm build

The integrated app lives in D:\code\lyric-timeline-editor. The original baseline at D:\code\lyrics-sync-editor is kept unchanged.
