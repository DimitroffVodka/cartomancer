# Cartomancer E2E (Playwright)

Real-browser end-to-end tests that drive a running Foundry world and assert on actual
Generator→Scene imports. Unlike the Quench batch (in-client, depends on the Quench
module), this layer is **self-contained** and can reproduce conditions Quench cannot —
notably a **backgrounded tab** (paused `requestAnimationFrame`), the exact trigger of the
dwelling flat-fallback bug.

## Prerequisites

- The Foundry **world is launched** (active) and reachable (default `http://localhost:30000`).
- Node (used elsewhere in this repo) + a one-time install:
  ```sh
  npm install
  npx playwright install chromium
  ```

## Configure (env vars)

| Var | Default | Notes |
|---|---|---|
| `FOUNDRY_URL` | `http://localhost:30000` | host/port of the running server |
| `FOUNDRY_USER` | `Gamemaster` | must be a **GM** user |
| `FOUNDRY_PASSWORD` | _(empty)_ | set if that user has a password |

## Run

```sh
npm run test:e2e          # headless
npm run test:e2e:headed   # headed — REQUIRED for the backgrounded-tab regression to be exercised
```

The first run authenticates (`auth.setup.mjs`) and caches the session under
`test/e2e/.auth/` (gitignored); later runs reuse it.

## What's covered

- `import.spec.mjs`
  - Dungeon → SQUARE-grid battlemap with walls.
  - **Dwelling backgrounded-tab regression** — multi-level + walls + stair regions while
    the Foundry tab is hidden. Skips under headless (background rAF throttling only happens
    headed); run `test:e2e:headed` to actually exercise it.

Each test deletes the scene it creates.

## Caveats

- **Single GM session.** If another GM connection is live (e.g. an MCP bridge), running as
  the same user can contend. Use a dedicated test GM, or stop the other session first.
- **Login selectors** (`auth.setup.mjs`) target Foundry v13/v14; adjust there if a future
  build changes the `/join` form.
- This is **dev-only**: `package.json` / `node_modules` are not loaded by Foundry and the
  module ships without them.
