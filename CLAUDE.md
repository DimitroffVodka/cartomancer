# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cartomancer is a **system-agnostic Foundry VTT module** (v13 min / v14 verified) that runs
[Watabou](https://watabou.itch.io)'s map generators *inside* Foundry — in same-origin iframes —
and imports the result as a playable scene (walls, doors, multi-level floors, stair regions). It
also imports DungeonDraft `.dungeondraft_pack` object packs as placeable decor. GM-only.

The repo lives at `FoundryV14/Data/modules/cartomancer` — it **is** the installed module; Foundry
loads it directly. It was extracted from `shadowdark-extras` (hence vestigial `SD` / `sdx` / `maphub`
naming, see Conventions).

## Build / test / run

No bundler, transpiler, or linter, and no `package.json` — source is plain ES modules (`.mjs`)
loaded directly by Foundry via `esmodules` in `module.json`. There is, however, a **zero-dependency
unit-test suite** (Node's built-in runner) for the pure logic.

- **Unit tests:** `node --test test/*.test.mjs` (zero deps, zero config; scoped to the unit files so it
  doesn't recurse into the Quench/Playwright dirs under `test/`, which import test frameworks). Covers the
  pure grid/parse helpers in [`scripts/lib/grid.mjs`](scripts/lib/grid.mjs) and the generator
  **import-contract** — it asserts each shipped bundle still carries its `__sdx*` / `__maphubClasses`
  patch global, so a Watabou rebuild that shifts a patch anchor fails the suite instead of silently
  degrading imports. Only pure, Foundry-free logic is testable this way; keep new such logic in
  `scripts/lib/` so it stays covered.
- **Integration tests (in-client):** a Quench batch at [`test/quench/import.batch.mjs`](test/quench/import.batch.mjs)
  exercises real Generator→Scene imports (dungeon square-grid + walls, Small Tiles 2× density, dwelling
  multi-level + stair regions). It registers only when the **Quench** module is active (dev-only — see
  the `quenchReady` hook in `scripts/cartomancer.mjs`), so it never loads for normal users. Run it from
  the Quench UI (beaker icon) or `quench.runAllBatches()`.
- **Syntax check:** `node --check scripts/<file>.mjs` (in the permission allow-list). Run after editing any `.mjs`.
- **Verify runtime behavior:** reload Foundry (the world at `localhost:30000` in dev). A live **Foundry
  MCP bridge** is available — use `mcp__foundry-vtt__*` tools (`evaluate`, `reload_foundry`,
  `get_console_errors`, `get_scene`, `get_scene_placeables`) to drive the running instance and verify
  imports (capture/walls/levels) that the unit tests can't reach, rather than clicking through the UI.
- **Entry / API:** GM opens the launcher from Scene Controls (drafting-compass icon in the Tokens
  group) or `game.modules.get("cartomancer").api.openLauncher()`. The full public API object is
  assembled on the `ready` hook in `scripts/cartomancer.mjs`.

## Architecture — the big picture

The non-obvious core is **how the module controls and captures third-party generators**. Read
[`dev/watabou-generator-live-control-api.md`](dev/watabou-generator-live-control-api.md) before
touching generator control or scene import — it reverse-engineers the live internals.

**1. Bundles + iframes.** Watabou's generators are Haxe/OpenFL apps compiled to large minified JS
bundles in `scripts/maphub/js/**` (~13 MB). They are served from the module's own static path, so
the iframes are **same-origin** — which is the whole trick: cross-origin hosted pages can't be
captured or scripted, but local ones can. **Never regenerate or hand-edit these bundles.**

**2. The import contract = patched globals.** Each bundle is patched with a tiny anchored string
injection that exposes its live controller on the iframe `window`:
- `__maphubClasses` — Haxe class registry (Realm/Perilous Shores, Cave) → `MapScene.inst`, `.view`, `.region`, etc.
- `__sdxDungeonView` — One Page Dungeon live view controller.
- `__sdxDwellView` — Dwellings live view controller.

These globals are **the contract** between the module and the generators. The module reads geometry
and drives every generator setting through them (no synthetic clicks). The `__sdx*` names are a
holdover from the source module — keep them; they must match the patches.

**3. `scripts/cartomancer.mjs`** — entry point. Registers settings on `init`, wires
`game.modules.get("cartomancer").api` on `ready`, adds the Scene Control buttons, and lazy-imports
the app modules via dynamic `import()`. All public entry functions are GM-gated.

**4. `scripts/MaphubViewerApp.mjs`** (~2700 lines — the engine). An `ApplicationV2` that hosts the
generator iframe and performs scene import. It reads live geometry via the patched globals, captures
the rendered map to PNG (uploaded to `Data/`), then builds a Foundry scene with the right grid,
walls, levels, doors, and stair regions. Domain knowledge concentrated here:
- **Grid alignment is the recurring problem.** Generators render cells at *non-integer* pixel sizes;
  Foundry's `grid.size` is an integer anchored at canvas (0,0). The import code rescales/crops the
  captured image so the generator's cells coincide with Foundry's grid lines (no offset drift).
- **Per-generator import defaults:** Dungeon / Cave / Dwellings → SQUARE grid + walls + fog/vision
  (battlemaps); Realm / City / Village → plain image scenes (gridless handouts). Realm can import as
  a pixel-aligned **flat-top hex** grid.
- **Grid density follows the generator's own setting:** Dungeon "Small Tiles" (`gridScale` 2) and
  Dwellings "Double Grid" (2×) halve the Foundry grid to match. Both defaults are forced on open
  (`_forceRealmFlatTopWhenReady`, `_forceDwellDoubleGridWhenReady`).
- **Capture live, never rebuild from the permalink** — this preserves the user's manual edits.
  Dungeon reads `dungeon.getData()` directly (works even while the window is detached).
- **HiDPI:** walls/geometry scale to backing px via `devicePixelRatio`.

**5. `scripts/MaphubSD.mjs`** — a separate concern: a `MutationObserver` that swaps
`.sdx-maphub-map[data-maphub-type]` placeholder divs (embedded in journal HTML) for inline generator
iframes. Input is untrusted, so it validates `type` as a bare slug and only allows
`https://watabou.github.io` external URLs.

**6. `scripts/RealmImporter.mjs`** — Realm (Perilous Shores) → a Foundry **folder**: the realm scene
plus Note pins and cross-linked journals per location. Each location's map is generated on demand
from its own seed via one delegated click listener (`registerHooks`); a dungeon's room key is folded
into its journal.

**7. `scripts/GeneratorFetcher.mjs`** — **fetch-on-first-use**. Downloads each generator's JS + assets
from `watabou.github.io` into `Data/cartomancer-generators/`, **re-applying the same import-contract
patches** (see `MANIFESTS`). Downloaded copies are preferred over the bundled ones. This is the
license-clean path: a distributed build can ship without Watabou's code. Uploads go through Foundry's
`FilePicker`, which blocks some extensions (`.woff`, `.json5`) — handled/tolerated in the manifests.

**8. DungeonDraft decor** — `DDPackManagerSD.mjs` (parse/extract PCK packs into `Data/decor/ddpacks/`),
`DDPackSettingsAppSD.mjs` + `DDPackPreviewAppSD.mjs` (import UI), `DecorBrowserApp.mjs` (browse +
drag onto scene as tiles). World setting `decorDungeondraftPacks`. **No art is bundled.**

**9. `scripts/maphub/OnePageParserSD.mjs`** — pure parser: One Page Dungeon JSON → rooms/walls/doors
geometry. Used by the dungeon import path; zero coupling.

## Settings (registered in `cartomancer.mjs`)

- `settlement.useLocalMaphub` (world, default **true**) — run bundled generators locally; **required
  for import** (hosted pages can't be captured cross-origin). Off = view-only via watabou.github.io.
- `openGeneratorsDetached` (client, default false).
- `decorDungeondraftPacks` (world, hidden array) — imported DD pack registry.
- Two `registerMenu` stubs: *Manage Packs* and *Download Generators*.

## Conventions

- **Foundry v13+ ApplicationV2 API only** — `foundry.applications.api.{ApplicationV2,
  HandlebarsApplicationMixin, DialogV2}`, `foundry.applications.apps.FilePicker.implementation`,
  `foundry.grid.HexagonalGrid`, `foundry.utils.*`. No legacy v1 `Application` / jQuery patterns.
- **`SD` / `sdx-` / `maphub` / `__sdx*` names are vestigial** from the `shadowdark-extras` source.
  Keep existing ones (the `__sdx*` globals are part of the patch contract); new files drop the suffix
  (`cartomancer.mjs`, `RealmImporter.mjs`, `GeneratorFetcher.mjs`, `DecorBrowserApp.mjs`).
- **Module id** comes from `scripts/constants.mjs` (`MODULE_ID`), though some files also hardcode the
  literal `"cartomancer"` — match whatever the file already does.
- **Commits: Conventional Commits with scopes** — `feat(dwellings):`, `fix(import):`, `docs(dev):`,
  and `release: x.y.z — summary` for version bumps (bump `version` + `download` URL in `module.json`,
  update `CHANGELOG.md`).
- Everything user-facing is **GM-only**.

## Licensing constraint (affects releasing)

Per [`dev/LICENSING.md`](dev/LICENSING.md), the bundled generators (except the GPL-3 City) need the
authors' permission to redistribute. The repo must **not** be listed on a package registry yet, and
the fetch-on-first-use path exists specifically so a distributed build can ship **without** Watabou's
code. The generated *maps* are already free; the gate is only on shipping the generator *app code*.

## Key dev docs

- [`dev/watabou-generator-live-control-api.md`](dev/watabou-generator-live-control-api.md) — live-control / hex-import internals (read first for generator work).
- [`dev/watabou-generators-settings-catalog.md`](dev/watabou-generators-settings-catalog.md) — per-generator setting catalogs.
- [`dev/cartomancer-extraction-plan.md`](dev/cartomancer-extraction-plan.md) — extraction-from-SDX plan + phase roadmap (A–D).
- [`docs/generators/*.md`](docs/generators) — per-generator usage guides.
