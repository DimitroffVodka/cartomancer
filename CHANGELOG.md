# Changelog

All notable changes to **Cartomancer — Map Generators** are documented here.

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
