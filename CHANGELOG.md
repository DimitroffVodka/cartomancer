# Changelog

All notable changes to **Cartomancer — Map Generators** are documented here.

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
