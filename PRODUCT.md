# Product Snapshot

## What This Project Is

`alex-0ahn-test-27` is a browser-based 2D fluid playground built with Vite and TypeScript. It renders a stable-fluids style density and velocity simulation to a full-screen canvas and exposes a floating control panel for live tuning.

## What It Does Today

- Renders a full-screen density field to `ImageData` on a canvas.
- Lets the user inject density and velocity with mouse or touch dragging.
- Supports an optional velocity-vector overlay for debugging and demos.
- Provides live controls for viscosity, diffusion, decay, requested resolution, theme, pause/resume, and reset.
- Rebuilds the simulation grid on viewport resize and on manual resolution changes without reloading the page.
- Preserves fluid state across responsive grid rebuilds by resampling density and velocity.
- Tracks rolling FPS, shows average FPS in the HUD, and automatically steps resolution down when performance stays low.

## User-Facing Conventions

- Default theme is `water-blue`; alternate theme is `amber-heat`.
- The simulation uses a requested resolution (`64`, `96`, `128`) that is then scaled to the current viewport.
- The app prefers interactive continuity: control changes are applied live, and reset is the explicit way to clear the field.

## Architecture

- `src/app.ts` owns app composition, UI bindings, simulation lifecycle, performance fallback, and canvas redraw flow.
- `src/sim/` contains the simulation core:
  `Grid`, boundary helpers, core Stam steps, incompressibility projection, and the top-level `Simulation` API.
- `src/render/` contains density rendering, palette/theme mapping, and the optional velocity overlay renderer.
- `src/input/` maps pointer input into simulation-space density and velocity injection.
- `src/performance/PerformanceMonitor.ts` encapsulates rolling FPS monitoring and downgrade triggering state.

## Tooling And Validation

- Build/dev stack: Vite + TypeScript.
- Lint/format: ESLint flat config + Prettier.
- Tests:
  - Vitest for unit tests.
  - Playwright Chromium for critical end-to-end canvas behavior.
- Production bundle validation and a preview screenshot archive are documented in `README.md` and `docs/preview-home.png`.

## Current Constraints

- This is a client-only app; there is no backend or persistence layer.
- The living branch/default branch is `main`.
