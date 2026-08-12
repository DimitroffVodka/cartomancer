# Changelog

All notable changes to **Cartomancer — Map Generators** are documented here.

## 0.4.3 — 2026-08-12

### Changed
- **Refreshed the bundled Perilous Shores generator to 2.0.1** (was 2.0.0, the build shipped
  under the "1.9.1 walled towns" devlog): Watabou's 2.0 line reworks saving and loading.
  `GEN_REV.realm` is bumped 2 → 3, so GMs who already downloaded the older build are offered a
  one-click re-download on load. The minified entry class drifted again (`S → R`) as it does
  most rebuilds; `exposeHaxeClasses()` recovers it structurally, so the realm-import hook is
  unaffected. This also matters more than a stale bundle usually would — the fetch path pulls
  the *live* build unpinned, so GMs downloading today already get 2.0.1.
  Live-verified on FV 14.365: a runtime `downloadGenerator("realm")` re-applies the Haxe-class
  exposure to the new build (16 files, 14/14 assets, marker re-stamped to rev 3), the fetched
  build renders, and `region2data()` extraction returns the full realm export
  (`name`/`origin`/`bp`/`layout`/`hexes`/`rivers`/`roads`/`searoutes`/`features`). Both
  location paths survive the rebuild too — `parseRealmLocations()` read 9 linked locations and
  `Region.inst.getFeatures()` + `MapScene.inst.view` produced 12 map-pin positions.

### Documentation
- **Rewrote the Perilous Shores guide for the 2.0 UI.** 2.0 restructured the interface and
  renamed a lot of controls, so the 1.9-era walkthrough no longer matched the generator:
  the *Grid* and *Details* submenus are now tabbed **windows** (`G` / `D`); *Vantage…* left the
  right-click menu and is the `V` shortcut; **Save** / **Load** joined the menu; `G` opens the
  Grid window instead of toggling the grid (`Shift+G` does that now); `N` opens Toponymy while
  `Shift+N` rerolls names; `T`/`F` open Details tabs while `Ctrl+T`/`Ctrl+F` do the old reroll
  and cycle; and *Massifs → High mountains*, *Individual trees → Discrete trees*,
  *Rugged → Rugged coastline*, *Meadows/Dangers → Show meadows/Show dangers*. Also documented
  the new **Walls** toggle and corrected the claim that there is "no import-back" into Perilous
  Shores — 2.0 loads its own JSON. Verified against the running 2.0.1 build, not the release
  notes.
- **Audited the other five generator guides against their live builds** — driving each
  generator's UI in the viewer and reading its keycode handlers and persisted defaults out of
  the build, rather than trusting devlogs. Fixes:
  - **Cave / Glade (2.1.7):** `W` opens the wall-geometry dialog and `Shift+W` toggles it (the
    guide had them the other way round); added the undocumented `D` (doors), `X` (exits),
    `H` (shading) and `0` (random palette); palette presets are `1`–`3` in Cave mode and
    `1`–`5` in Glade mode, not "Glade only"; and **Style…** / **Display ▸** appear in Cave mode
    too, which the guide said were Glade-only.
  - **City / MFCG (0.11.5):** `B` opens the Buildings style tab and `Shift+B` cycles the
    building display mode — the guide had these inverted (verified live by watching
    `display_mode` flip Lots → Hidden).
  - **Village (1.6.6):** `Enter` generates a **new** village; rerolling the current one is
    `Shift+Enter`. The guide told readers to press `Enter` to reroll, in two places.
  - **Dwellings (1.4.2):** the keyboard section was missing most of the plan-view bindings —
    added the `6`–`9`/`0` architecture presets, the `G` / `Shift+G` / `Ctrl+G` grid keys
    (including **Double grid**, which the Foundry import aligns to), `D` doors, `A` arrows,
    `P` props, `L` lights, `O` ambient occlusion, `F` fading, `X` multi-floor export and the
    arrow-key floor navigation, and corrected `R` (room labels in Plan view, reroll dimensions
    in Elevation view).
  - **One Page Dungeon (1.2.7):** checked, no changes — its menu and every shortcut still match
    the build.
- Recorded how to tell when Watabou ships a new generator build: the Lime app metadata
  (`meta.h.version`) embedded once per build is the version of record. GitHub Pages'
  `Last-Modified`/`ETag` are useless (every file carries the site-wide deploy stamp), and the
  itch.io devlog titles lag the build metadata.

## 0.4.2 — 2026-08-12

### Added
- **Dungeon journals now open with an Overview page.** It leads with the dungeon's name and
  the generator's own description (the "hook"), then indexes every room as a link to that
  room's page. The room index is written in a second pass after the entry is created, since
  a `@UUID` link needs page ids that don't exist until then. Previously an overview page was
  only created when the generator happened to produce a description, carried no heading, and
  never linked anything.
- The journal is also built when a dungeon imports with **no** numbered rooms at all. It
  used to be skipped entirely unless the scene ended up with Note pins, so a dungeon's
  description could be silently dropped.

### Changed
- **Imported dungeons are named after the dungeon, not `Dungeon Map <timestamp>`.** The One
  Page Dungeon export exposes the generated name as `title` (the generator's `story.name` —
  the same string printed at the top of the page), and both the scene and its journal now
  take it. The timestamp label remains as a fallback for when the name can't be read.
  Realm-location dungeons are unaffected: they keep the name the realm gave the location.
- **Room pages sort in room order.** Pages created in one batch all shared `sort: 0`, which
  left the sheet's room order up to document-id ordering; each room page now carries an
  explicit sort key. Page titles are also built from the first *sentence* of the room
  description with an ellipsis, rather than the first line hard-cut at 60 characters.

## 0.4.1 — 2026-07-14

### Changed
- **Refreshed the bundled Perilous Shores generator to 1.9.1 "walled towns"** (was 1.9.0):
  towns and cities can now generate functional defensive walls. `GEN_REV.realm` is bumped
  1 → 2, so GMs who already downloaded the 1.9.0 build are offered a one-click re-download on
  load. The build's minified entry class drifted (`U → S`) as it does most rebuilds;
  `exposeHaxeClasses()` recovers it structurally, so the realm-import hook is unaffected.
  Live-verified on FV 14.364 — the 1.9.1 build renders, a runtime re-download re-applies the
  Haxe-class exposure cleanly, and `region2data()` extraction returns the full realm export
  (`name`/`origin`/`bp`/`hexes`/…) with both the `Region.inst` and `MapScene.inst` location-pin
  paths intact.

### Fixed
- **Bundled Maphub generator pages broke on Foundry installs served under a route prefix**
  (e.g. `/foundry/`). Every generator page hardcoded `/modules/cartomancer/...` — the
  classic-script `BASE` constant and the `lime.embed()` cross-generator route URLs — so a
  prefixed install requested paths that don't exist. Each script scope now computes
  `BASE` from `document.baseURI`, which resolves correctly both when the page is served
  directly and inside the `<base>`-tagged blob wrapper used on Foundry 14 (which serves
  module `.html` as `text/plain`). The classic IIFE and the `<script type="module">` are
  isolated scopes, so each declares its own `BASE` — a single shared declaration is a
  silent, iframe-only `ReferenceError` (the exact bug that blanked the sibling module's
  Cave generator for weeks). Fixed pages: cave, dwellings, mfcg, village, viewer.
- **Route prefix was also dropped by the generator URL builders.** `MaphubViewerApp`
  (bundled-page blob URL and saved-state fetch), `GeneratorFetcher` (shipped-loader fetch,
  `../../` asset rewrite, blob `<base href>`, marker read), and `MaphubSD` journal
  placeholders now build URLs via `foundry.utils.getRoute()` instead of concatenating
  `origin + "/modules/..."`. On installs without a prefix `getRoute()` is an identity
  transform, so behavior there is unchanged.

## 0.4.0 — 2026-06-24

### Added
- **Generator update prompts.** When the module ships a refreshed generator build, a GM who
  already downloaded that generator is offered a one-click re-download on load. It's gated on
  a module-controlled revision, so it fires once per update — not every world load — and never
  chases upstream changes you haven't validated. Your current copy keeps working until you
  accept, and the staleness check is fully local (no network until you click **Update now**).

### Fixed
- **Perilous Shores realm download, broken by Watabou's 1.9.0 rebuild.** The rebuild renamed
  the minified entry symbol our download hook anchored on, so fetching the realm generator
  failed with "hook anchor not found". The realm (and cave) hooks now recover the symbols from
  the bundle's own structure instead of hardcoding them, surviving this rebuild and future ones.

### Changed
- **Refreshed the bundled Perilous Shores to 1.9.0** — denser, larger mountains ("Massifs"),
  schematic **Heraldic** town icons, coastal **lighthouses**, and more prominent flags.
- **Perilous Shores guide** updated for the new 1.9.0 controls (Massifs, Heraldic, Harbours),
  plus an import note that the larger mountains can crowd roads and settlements.

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
