# alex-0ahn-test-27

Vite + TypeScript project scaffold for the fluid playground application.

## Requirements

- Node.js 20+
- pnpm 10+

## Development

```bash
pnpm install
pnpm dev
pnpm lint
pnpm format
pnpm test:unit
pnpm test:e2e
```

The Vite dev server is configured to listen on `0.0.0.0:8080`.

## Build

```bash
pnpm build
pnpm preview
```

## Testing

- `pnpm test:unit` runs Vitest in a `jsdom` environment.
- `pnpm test:e2e` runs the Playwright Chromium smoke test against a local Vite server.

## Environment

Copy `.env.example` to `.env.local` to override local settings.
