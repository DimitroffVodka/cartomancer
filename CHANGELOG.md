# Changelog

All notable changes to **Cartomancer — Map Generators** are documented here.

## 0.3.1 — 2026-06-23

### Changed
- **DungeonDraft decor packs are now shared across every world.** The pack registry is
  derived from the on-disk `_index.json` files under `Data/decor/ddpacks/` (user-data
  level) instead of a per-world setting, so a pack imported in one world is available in
  all of them and never needs re-uploading. Enable/disable and remove states persist into
  each pack's `_index.json`, making them global too.

### Fixed
- **Dungeon Note pins now link to a Journal entry.** Imported One Page Dungeon scenes wire
  each Note pin to its journal so clicking a pin opens the linked entry.

## 0.3.0 — 2026-06-22

### Added
- **Perilous Shores → flat-top hex scenes.** Realm maps import as a Foundry **flat-top
  hex grid** (`HEXODDQ`) aligned to the generator's own hexes: Cartomancer defaults the
  generator to flat-top hexes, reads its hex radius + render transform, matches Foundry's
  `grid.size` to the native hex pitch, and phase-aligns the lattice so **one Foundry hex =
  one map hex**. Imported fully revealed for hexcrawling. (Pointy-topped follows too;
  warped is left gridless.)
- **Dwellings default to "Double grid"** (2× density) when opened, and the import follows
  it — one small cell per Foundry square, with walls on the coarse building lines. Turn it
  off in the generator and the import respects that.
- **Per-generator scene defaults on import**: battlemaps (One Page Dungeon, Cave / Glade,
  Dwellings) import with a **square** grid + fog/token-vision for tactical play; the
  settlement overviews (City / MFCG, Village) import **gridless** and **fully revealed**.
  Previously every imported scene inherited the world's default grid type. *"Set as
  Background" on an existing scene is unchanged.*
- **Wiki**: every generator guide gained a *Recommended settings for Foundry import*
  section — what Cartomancer sets automatically, plus the in-generator menu settings that
  capture cleanly.
- **Test suite**: a zero-dependency `node:test` suite for the grid/parse helpers and the
  generator import-contract, an in-client Quench batch, and a Playwright harness covering
  the dwelling hidden-window regression.

### Fixed
- **Imports preserve your manual edits.** Importing no longer rebuilds the generator from
  its seed/permalink — it captures the live, edited map, so renamed features, added towns,
  paintings, and other tweaks survive (previously they were lost whenever the generator
  window was detached). One Page Dungeon reads its data directly from the live controller,
  so it stays edit-preserving while detached too.
- **One Page Dungeon "Small Tiles"** now imports at the right density — the Foundry grid
  matches the displayed 2× grid (one small tile per square) instead of being twice too
  coarse.
- **Dwelling capture in a hidden / background window**: force a synchronous OpenFL render
  so a detached or backgrounded generator still produces a real frame, instead of a blank
  capture that dropped to the flat fallback image.
- Imported scenes set fog exploration via the correct **`fog.mode`** field. Foundry v13+
  renamed it from the old top-level `fogExploration` (which was silently dropped), so
  overview maps now reliably import fully revealed.
- Removed the iframe `sandbox` attribute on the generator viewer. The framed content is
  the module's own first-party generator and the parent reads it same-origin, so the
  sandbox isolated nothing while tripping Chrome's *"can escape its sandboxing"* console
  warning.

## 0.2.3 — 2026-06-21

### Fixed
- **Generator fonts in fetch mode**: every loader now uses the module's bundled fonts
  (resolved to absolute paths) instead of per-generator asset fonts that weren't
  downloaded — fixes the `ShareTech`/`ShareTechMono` 404s on the Dungeon and Dwellings
  generators. Removed dead `Grenze`/`Neuton` `@font-face` refs (those fonts don't exist
  on Watabou's site either).
- **License-clean package**: the lean ZIP now also excludes the Dungeon's lowercase
  `assets/` directory (Watabou data that 0.2.0–0.2.2 shipped by mistake) — the Dungeon's
  data is fetched on first use like every other generator.

## 0.2.2 — 2026-06-21

### Fixed
- Removed a harmless console 404: the "load saved map state" check now uses a real file
  listing instead of a HEAD request, so opening a fresh (never-saved) map no longer logs a
  `maps/maphub/…json` 404.
- Cave / Glade fonts now load in fetch mode (the loader points at the module's bundled
  fonts instead of un-fetched generator assets).

## 0.2.1 — 2026-06-21

### Fixed
- **Lean build on a fresh server**: generators no longer fall back to the (absent) bundled
  loader. `bundleExists` now uses a reliable file listing instead of a HEAD request — some
  servers answer HEAD `200` for missing files, which suppressed the first-use download
  prompt and 404'd on `js/*.js`.
- **Fonts** now load in fetch-on-first-use mode: the loader's `../../` relative paths are
  rewritten to absolute module paths (they previously resolved wrong under the blob base).
- Silenced the harmless `.json5` upload warning — Dwellings' style files are saved as
  `.txt` directly (and the JS manifest is repointed) instead of attempting a rejected upload.

## 0.2.0 — 2026-06-21

### Added
- **Fetch-on-first-use for all six generators** (Realm / Perilous Shores, City / MFCG,
  Village, Cave & Glade, One Page Dungeon, Dwellings). The module no longer has to bundle
  Watabou's compiled generators — it downloads each one from `watabou.github.io` into your
  local data on first use, applies its hooks on your device, and then runs it locally and
  **offline**, with all import features intact. Trigger it from *Settings → Cartomancer →
  Download Generators*, or accept the one-time prompt the first time you open a generator.
- **Community usage wiki** for Watabou's generators under [`docs/generators/`](docs/generators/),
  focused on the right-click / context-menu settings that lack a good public reference.

### Fixed
- **Dwelling stair regions**: they no longer clutter the play view (now shown only on the
  Regions layer), no longer get misplaced off the staircase, and a single staircase serving
  3+ levels now gives one up/down prompt instead of duelling level-change prompts.
- **Cave** scenes are now named from the generator (e.g. *"Obsidian Pits"*) instead of a
  generic `Cave Map <timestamp>`.

## 0.1.0

- Initial release: run Watabou's map generators inside Foundry with one-click scene import
  (walls, doors, multi-level floors, stair regions); realm full-import (Scene/Journal folder,
  Note pins, cross-linked journals, on-demand seeded location scenes, dungeon room keys);
  DungeonDraft decor importer + browser; window detach/attach that preserves the map.
