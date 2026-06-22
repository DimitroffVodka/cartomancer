# Foundry VTT Module Testing — Playbook

**Purpose:** a reusable testing approach for any Foundry VTT module or system, distilled from
cartomancer. Three layers, each for a different failure class. Copy this into a new module and
adapt the worked example at the bottom.

**Tags:** #foundryvtt #testing #quench #playbook · **Last updated:** 2026-06-22 (Foundry v14.364)

---

## TL;DR — which layer for which test

| You're testing… | Use | Why |
|---|---|---|
| A pure function (no `game`/`canvas`/documents) | **node:test** (Layer 1) | milliseconds, runs in CI, no Foundry |
| An invariant about a shipped/vendored file | **node:test** "contract test" | cheapest guard against silent breakage |
| Runtime behavior (documents, hooks, data model, canvas) | **Quench** (Layer 2) | only reproducible inside a live client |
| "Did this actually work right now?" (one-off) | **Foundry MCP bridge** (Layer 3) | drive the live client, observe real state |

Rule of thumb: **if it touches `game`/`foundry`/`canvas`/documents, it needs a real client (Layer 2/3); otherwise unit-test it (Layer 1).**

---

## Layer 1 — node:test (pure logic, zero deps)

Node's built-in runner. No `package.json`, no install, no config.

- **Run:** `node --test test/*.test.mjs` — scope to your unit files. Bare `node --test` recurses into
  every dir under `test/` (e.g. `test/e2e/`), which import Playwright/Quench and will error under Node.
- **Enabler refactor:** lift pure logic out of Foundry-coupled files into `scripts/lib/*.mjs`; the big
  file imports from the lib, and tests import the lib directly. This refactor *is* most of the work — and
  it improves the code regardless of tests.
- **Eval-time purity (critical):** a module imported under Node must **not** reference `game`,
  `foundry`, `CONST`, `canvas`, `ui` at top level — only inside functions. Otherwise the `import`
  throws in Node. Keep `lib/` and `constants` side-effect-free; access globals lazily.
- **Syntax check:** `node --check scripts/<file>.mjs` after editing.

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { myPureFn } from "../scripts/lib/thing.mjs";

test("does the thing", () => {
  assert.equal(myPureFn(2), 4);
});
```

**Highest-leverage pattern — the "contract test".** Assert invariants about files you ship or vendor,
so an upstream change fails the suite instead of silently degrading at runtime. Example: a vendored
third-party bundle must still contain the anchor string your runtime patch depends on; a config JSON
must have expected keys. Pure `readFileSync` + `assert.ok(src.includes(...))`. No Foundry needed.

---

## Layer 2 — Quench (in-client integration)

[Quench](https://github.com/Ethaks/FVTT-Quench) is the community-standard in-client test runner
(Mocha/Chai running inside Foundry). Install it as a module; enable only in your dev world.

**Register batches dev-gated** so the test code never loads for normal users:

```js
// in your module's entry esmodule
Hooks.on("quenchReady", async (quench) => {
  const { registerMyBatches } = await import("../test/quench/my.batch.mjs"); // loads only when Quench is active
  registerMyBatches(quench);
});
```

```js
// test/quench/my.batch.mjs
export function registerMyBatches(quench) {
  quench.registerBatch("mymodule.feature", (context) => {     // key MUST start with your package id
    const { describe, it, assert, before, after, afterEach } = context;
    const created = [];
    afterEach(async function () {                              // leave the world as you found it
      if (created.length) await Document.deleteDocuments(created.splice(0));
    });
    describe("feature", function () {
      it("does X in a real client", async function () {
        this.timeout(60000);                                   // raise above Mocha's 2s default for slow ops
        const doc = await SomeDocument.create({ /* … */ });
        created.push(doc.id);
        assert.isAbove(doc.someComputedThing, 0);
      });
    });
  }, { displayName: "My Module: feature" });
}
```

- **Context provides:** `describe, it, before, beforeEach, after, afterEach, assert, expect, should, utils`.
- Use `function () {}` (not arrows) so `this.timeout(ms)` works.
- **Always clean up** created documents (afterEach) and restore any settings you change (before/after).
- **Run:** beaker icon → Run, or `quench.runBatches("**")` / `quench.runBatches(["mymodule.feature"], { json: true })`.

### Quench on Foundry v14 — hard-won gotchas (2026-06)

- **0.10.0 (last official, Apr 2025, min v13) is broken on v14.** Its snapshot manager
  (`QuenchSnapshotManager.loadBatchSnaps`) uses a removed `FilePicker` path → the run wedges
  (`failures:1, tests:0`, runner stuck `state:"running"`, blocking all later runs). Fix: use a
  v14-patched build. Locally this was a one-line bump of `module.json` `compatibility.verified` to
  `"14"` (→ "0.10.1"); the wedge cleared.
- **Results window must be open before a run.** `runBatches()` throws
  `Cannot read properties of undefined (reading 'querySelector')` in
  `QuenchResults.handleRunBegin → _setElementDisabled` when the window isn't rendered → `failures:1,
  tests:0`. Workaround: enable the **`quench.autoShowQuenchWindow`** setting (window auto-opens), or
  click the beaker before running. Only bites headless/programmatic runs; clicking Run in the UI is fine.
- **Snapshot assertions** (`toMatchSnapshot`) still ride the deprecated FilePicker path — treat as
  risky/untested on v14; avoid until verified.
- Until an official v14 release ships, you're carrying a **local fork** — watch upstream so you can drop it.

---

## Layer 3 — Driving a live Foundry headlessly (Foundry MCP bridge)

For verifying runtime-only behavior without clicking, or from an agent. Tools:
`mcp__foundry-vtt__evaluate` (run JS in the client), `reload_foundry`, `get_scene`,
`get_scene_placeables`, `get_console_errors`.

Gotchas learned the hard way:

- **A hidden page pauses `requestAnimationFrame`.** When the Foundry tab is `document.hidden`
  (backgrounded / headless), the browser fully stops rAF. Anything driven by the render loop
  (PixiJS/WebGL/OpenFL canvases, fit animations) won't repaint → blank captures, stuck transitions.
  Force a synchronous paint where the engine allows it (OpenFL: walk to the `Stage` and call
  `__renderAfterEvent()`), or run with the window actually visible.
- **Main-thread-blocking work starves in-call poll loops.** A heavy synchronous op (image warp, big
  loop) blocks the event loop, so a `setTimeout` poll *inside one `evaluate`* never ticks and the
  bridge times out. Pattern: kick the work fire-and-forget, store progress/results on a `window.__x`
  global, and read it with separate **immediate, non-looping** `evaluate` calls.
- **Reload to clear wedged state** (stuck test runner, leaked globals, half-finished runs).
- **Console may be flooded** by an unrelated active system/module — filter when reading
  `get_console_errors`, and don't attribute that noise to the module under test.

---

## Worked example — cartomancer

- **Layer 1:** `scripts/lib/grid.mjs` (pure grid math + generator-state parsing) ←
  `test/grid.test.mjs`, `test/parse-state.test.mjs`. Plus `test/import-contract.test.mjs` (contract
  test: every shipped generator bundle still contains its `__sdx*` / `__maphubClasses` patch global).
- **Layer 2:** `test/quench/import.batch.mjs`, registered via the `quenchReady` hook in
  `scripts/cartomancer.mjs`. Opens a generator, runs a real import, asserts the resulting Scene
  (square grid + walls; Small Tiles ~2× cells; dwelling = multi-level + walls + stair regions);
  `afterEach` deletes the test scenes. **3/3 green on v14 + Quench 0.10.1 with the window open.**
- **Layer 3:** used throughout to verify imports and to find/fix a real bug — the dwelling import fell
  back to a flat image because `document.hidden` paused rAF during per-floor capture; fixed by forcing
  an OpenFL `Stage.__renderAfterEvent()` before grabbing the canvas.

---

## New-module checklist

1. Extract pure logic into `scripts/lib/*.mjs` (no eval-time Foundry globals).
2. Add `test/*.test.mjs` and run `node --test`. Include a **contract test** for any vendored/external asset.
3. Add a Quench batch for runtime behavior; dev-gate it via the `quenchReady` hook.
4. In your dev world: enable Quench + **`autoShowQuenchWindow`**.
5. Clean up every document/setting your tests touch (afterEach/after).
6. For ad-hoc runtime checks, drive via the Foundry MCP bridge — mind the rAF/hidden and
   main-thread-blocking gotchas above.
