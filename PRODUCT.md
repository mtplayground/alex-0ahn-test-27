# Product Snapshot

## What This Project Is

`alex-0ahn-test-27` is a client-side fluid playground built with Vite and TypeScript. It renders a stable-fluids style density and velocity simulation to a full-screen canvas and layers a floating control surface on top for live tuning and demos.

## What It Does Today

- Shows visible fluid immediately on first load by seeding a centered startup density and velocity pulse.
- Lets the user inject density and motion with pointer dragging on the canvas.
- Displays a short onboarding hint, `Drag on the canvas to inject fluid`, that fades after first interaction or after a few seconds of idle time.
- Renders the density field with a brighter default water-blue palette and supports an alternate amber-heat theme.
- Exposes live controls for brush strength, viscosity, diffusion, decay, resolution, theme, pause/resume, velocity overlay, and reset.
- Preserves simulation state across responsive grid rebuilds and manual resolution changes.
- Tracks rolling FPS, shows average FPS, and automatically downgrades simulation resolution when performance stays low.

## User-Facing Conventions

- The app is canvas-first and interaction-first: the page opens with visible motion rather than an empty field.
- `Reset fluid` restores the seeded baseline state instead of a blank canvas.
- Resolution presets are `64`, `96`, and `128`, then scaled against the viewport.
- Default visual language is cool, glassy, and high-contrast; the onboarding hint matches the control panel styling.

## Architecture

- `src/app.ts` is the composition root for:
  app lifecycle, simulation creation/rebuild, canvas redraws, control-panel bindings, onboarding hint state, and performance fallback.
- `src/sim/` contains the simulation core:
  grid storage, boundary handling, diffusion/advection/projection, and the top-level `Simulation` API.
- `src/render/` contains density rendering, palette/theme mapping, and the optional velocity-vector overlay.
- `src/input/` maps pointer events into simulation-space density and velocity injection.
- `src/config/defaults.ts` centralizes shared interactive/render defaults such as brush strength and density render scale.
- `src/performance/PerformanceMonitor.ts` encapsulates rolling FPS tracking and downgrade decisions.

## Tooling And Validation

- Build/dev stack: Vite + TypeScript.
- Lint/format: ESLint flat config + Prettier.
- Tests:
  - Vitest for unit coverage of app wiring, simulation primitives, rendering, input, and performance logic.
  - Playwright Chromium for critical end-to-end behavior.
- Current browser coverage includes:
  - visible seeded fluid on first load, validated by center-vs-corner brightness sampling instead of a single weak luma threshold,
  - onboarding hint visibility and dismissal,
  - drag-to-render change,
  - control-panel impact on rendering,
  - reset returning near the seeded baseline.

## Current Constraints

- This is a browser-only app with no backend, auth, or persistence layer.
- The default branch is `main`.
