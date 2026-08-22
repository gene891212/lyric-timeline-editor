# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the Vue 3 + TypeScript application code.
  - `src/App.vue` is the main UI and interaction logic.
  - `src/main.ts` bootstraps the Vue app and Arco Design Vue.
  - `src/styles.css` holds global styling and layout.
- `index.html` is the Vite entry HTML.
- Build tooling lives in `vite.config.ts` and `tsconfig.json`.

## Build, Test, and Development Commands

- `pnpm dev`: Start the local Vite dev server with HMR.
- `pnpm build`: Build the production bundle.
- `pnpm preview`: Preview the production build locally.

## Coding Style & Naming Conventions

- Use TypeScript for logic; keep component state in `script setup`.
- Indentation: 2 spaces in Vue and TS; keep lines concise.
- Naming: `camelCase` for variables/functions, `PascalCase` for types.
- CSS classes use `kebab-case` (e.g., `timeline-track`, `play-controls`).
- Prefer small, well-named helpers for parsing and time calculations.

## Testing Guidelines

- No automated tests are configured yet. If you add tests, place them under
  `tests/` or alongside features (e.g., `src/__tests__/`), and update this file.

## Commit & Pull Request Guidelines

- Commit messages in this repo are short, imperative summaries (e.g.,
  "Add YouTube sync and playback tracking").
- Keep commits scoped to one feature or fix.
- If you open a PR, include:
  - A brief description of behavior changes.
  - Screenshots or short clips for UI changes.
  - Any follow-up tasks or known limitations.

## Notes for Contributors

- The editor supports SRT/LRC import and a plain-text fallback that uses
  fixed intervals.
- YouTube sync loads the IFrame API at runtime; verify behavior in a browser.
