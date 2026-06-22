# Watabou Generators — Settings Control Catalog (Dungeon · Cave · Dwellings · City · Village)

**Date:** 2026-06-22. **Companion to** `watabou-generator-live-control-api.md` (which covers Perilous Shores in depth). This note catalogs how to read/drive the settings of the **other five** Cartomancer generators, gathered by live introspection of each generator's controller + persisted-localStorage decoding + targeted greps of the bundled JS (`scripts/maphub/js/…`).

**Verification posture:** controller method surfaces were read **live** from the running generators via the MCP bridge (each opened serially — the generators are shared singletons; never drive them concurrently). Persisted keys are from live `localStorage` + bundled-source `.set(...)` greps. Value enums are source-grounded where quoted; a few are inferred from the wiki and flagged. **Not** every call was individually executed — treat as a high-confidence map, spot-check before relying on an exact arg encoding.

---

## Big picture: two classes of generator

| Class | Generators | How to drive settings |
|---|---|---|
| **Patched** (module injects `__maphubClasses` + a controller hook) | Perilous Shores, **One Page Dungeon** (`__sdxDungeonView`), **Dwellings** (`__sdxDwellView`), **Cave/Glade** (coogee `Game.scene`) | Call named methods on the live controller (like `setTilt(2)`). |
| **Unpatched** (served `-raw`, byte-identical to watabou.github.io — no hook) | **City / MFCG**, **Village** | No method hook (only a `maphub<Gen>AppInstance` lime bootstrap). Drive via **URL params** (both honor them) + persisted `localStorage` State keys (set through the in-app dialogs). |

**Baking optimal settings, per class:** patched → call controller methods after load (the `setTilt(2)` pattern); unpatched → pass **URL params** in the launch query string (MFCG/Village read them, unlike Perilous Shores which ignored `hexes`).

Persistence is Haxe-serialized into `localStorage["<blobURL>:com.watabou.<gen>"]` (`y<len>:<str>`=string, `i<n>`=int, `t/f`=bool, `d<f>`=float, `a…h`=array, `o…g`=object, `z`=int 0).

---

## One Page Dungeon — PATCHED · `com.watabou.dungeon`
Controller: `const dv = iframe.contentWindow.__sdxDungeonView` (module: `MaphubViewerApp._getDungeonController()`). Has its **own** persistence store (`com.watabou.dungeon`), not coogee `State`. Persisted keys: `grid, gridScale, notes, secrets, water, tags, style, palette, autoRotation, seed, name`.

| Setting | Call | Values | Persists |
|---|---|---|---|
| New dungeon | `dv.newDungeon()` | action (Enter) | seed |
| Tags dialog | `dv.showTagsForm()` | layout/content params (Tab/T) | tags |
| Grid style | `dv.setGridMode(GridMode.X)` / `dv.toggleGrid()` (G) | OFF/DOTTED/DASHED/SOLID/BROKEN | `grid` |
| Small tiles / scale | `dv.toggleSmallTiles()` (Shift+G) / `dv.setGridScale(n)` | scale int (1 = small tiles) | `gridScale` |
| Notes mode | `dv.setNotesMode(NoteMode.X)` | Off/Default/Tailed/Legend/Symbols/Numbers | `notes` |
| Notes / legend toggle | `dv.toggleNotes()` (N) / `dv.toggleLegend()` (L) | bool | `notes` |
| Reroll / rearrange notes | `dv.rerollNotes()` (Shift+Space) / `dv.rearrangeNotes()` (Space) | action | — |
| Title & story | `dv.toggleTitle()` | bool | — |
| Water | `dv.toggleWater()` (W) / `dv.raiseWater()` (Shift+W) / `dv.showWaterForm()` | bool / 0–1 level | `water` |
| Props / Shadows / Exits | `dv.toggleProps()` (P) / `dv.toggleShadows()` / `dv.toggleExits()` | bool | — |
| Secret rooms | `dv.toggleSecrets()` (H) | bool | `secrets` |
| Rotate-to-fit / Zoom-to-fit | `dv.toggleRotation()` (R) / `dv.toggleZoom()` | bool | `autoRotation` |
| Style preset | `dv.stylePreset(assetIdx)` | Default/Ancient/Light/Modern/Link (keys 1–5) | `palette`/`style` |
| Monochrome (B&W) | `dv.toggleBW()` (M) | bool | — |
| Palette dialog | `dv.showPaletteForm()` (S) | colors | `palette` |

`setGridMode`/`setNotesMode` take Haxe **enum** values (persisted as the enum string); the `toggle*` methods are the easy headless route. **Import:** module already forces axis-align; cleanest battlemap = Notes **Off** + Title **off** + Monochrome (see wiki "Recommended settings").

## Cave / Glade — PATCHED · coogee · `com.watabou.cave`
Controller: `const C = iframe.contentWindow.__maphubClasses; const sc = C["com.watabou.coogee.Game"].scene; const v = sc.view;` Scene class `com.watabou.cave.scenes.MapScene`; uses coogee `State`. Persisted keys: `glade, grid, water, waterSeed, palette, style, tags, name, seed`.

| Setting | Call | Values | Persists |
|---|---|---|---|
| Cave ↔ Glade mode | `sc.toggleGlade()` (F) — `switchScene` | bool | `glade` |
| Grid type | grid menu (getViewMenu) / `v.addGrid()` | square / hex / hidden | `grid` |
| Water | `v.toggleWater()` / Water dialog | bool / level | `water`,`waterSeed` |
| Shading / Exits / Doors / Steps / Rubble | `v.toggleShading()` / `v.toggleExits()` / `v.toggleDoors()` / `v.toggleSteps()` / `v.toggleRubble()` | bool | — |
| Style / palette | `sc.showStyle()` / `sc.applyPalette(p)` / `sc.loadPalette()` | presets (Glade mode) | `palette`,`style` |
| Shape (Narrow tunnels, Geometry: distortion/bumpiness/roughness, Water level) | Tags / Geometry / Water dialogs | — | `tags` |

Grid-type, Glade, and the Geometry/Water/Tags dialogs are partly driven via menu closures rather than top-level named methods. **Import:** module aligns a square grid; Cave mode + **Square** grid recommended (wiki).

## Dwellings — PATCHED · `com.watabou.house`
Controller: `const dv = iframe.contentWindow.__sdxDwellView` (module: `_getDwellController()`). Own store `com.watabou.house`. Persisted keys: `architecture, grid, doors, labels, doubleGrid, arrows, props, lights, fading, colorize, style, tags, floors, name, seed, plan, entrance`.

| Setting | Call | Values | Persists |
|---|---|---|---|
| Floor (multi-level) | `dv.setFloor(n)` | int | — |
| Reroll / reroll rooms | `dv.reroll()` / `dv.rerollRooms()` | action | seed |
| Grid style / visible / double | `dv.toggleGridMode()` / `dv.toggleGridVisible()` / `dv.toggleDoubleGrid()` | solid/none · bool · bool | `grid`,`doubleGrid` |
| Doors | `dv.toggleDoors()` | simple / none | `doors` |
| Labels | `dv.toggleLabels()` / `dv.labelsShown()` / `dv.labelsNumbers()` / `dv.labelsHidden()` | shown/numbers/hidden | `labels` |
| Arrows / Props / AO (shading) / Lights | `dv.toggleArrows()` / `dv.toggleProps()` / `dv.toggleAO()` / `dv.toggleLights()` | bool | `arrows`,`props`,`lights` |
| Roof (elevation view) | `dv.setRoofMode()` / `dv.toggleRoofShading()` / `dv.toggleRoofFading()` / `dv.toggleRoofShrinking()` | — | `fading` |
| Architecture | `dv.applyArchitecture(a)` / `dv.applyArchiPreset(p)` | modern / logs / … | `architecture` |
| Colors / style | `dv.applyColors()` / `dv.showColors()` | presets Natural/Wooden/Plain/Blueprint/B&W | `style`,`colorize` |
| Name | `dv.editName()` | text | `name` |

Tags (size/height/shape/rooms/windows) + `floors`, `plan`, `entrance` are URL params too. **Import:** battlemap, square grid; multi-floor levels + walls + stair regions handled by the module.

## City / MFCG — UNPATCHED · `com.watabou.mfcg`
**No method hook** (`maphubMfcgAppInstance` bootstrap only). Drive via **URL params** (honored) + persisted `com.watabou.mfcg` keys (set through Generate/Settlement/Style dialogs). URL-readable: `size, seed, population, gates, tintMethod, tintStrength, weathering` (+ the permalink encodes tags+size).

| Group | Keys / settings | Values |
|---|---|---|
| Generation (bool tags) | `random, citadel, urban_castle, walls, river, coast, temple, plaza, shantytown, farms, green, hub` | true/false |
| Generation (numeric) | `gates` (-1=auto), `size`, `seed`, `population` | int |
| Buildings | `display_mode`, `towers`, `lots_method`, `processing` | Block/Lots/Complex/Hidden · Round/Square/Open · Twisted/… · None/Offset |
| Elements | `title, scale_bar, compass, emblem` (+`emblem_coa`,`emblem_seed`), `grid`, `districts` (label mode), `landmarks`, `text_size` | bool · Hidden/Icon/Legend · int |
| Graphics | `thin_lines`, `tintMethod` (Spectrum/Brightness/Overlay), `tintStrength`, `weathering` | bool · enum · 0–100 |
| Outlines | `outline_solids, outline_buildings, outline_water, outline_roads, outline_trees, outline_fields` | bool |
| Misc | `show_alleys`, trees/forests, farm fields, `colors`/`style` (color scheme), `city_name` | bool · scheme |

**Import:** gridless overview (module default). For a clean handout: `display_mode=Lots`/`Complex`, `scale_bar`/`compass`/`grid` off. Bake via URL params (MFCG honors them).

## Village — UNPATCHED · `com.watabou.village`
**No method hook.** Drive via **URL params** (honored — many style floats/strings are URL-readable) + persisted localStorage State.

| Group | Keys / settings | Values |
|---|---|---|
| Layers (bool) | `relief, fields, shading, orchards, shadows, buildings, roads, driveways, title` | true/false |
| Trees | `trees`, `shade_trees`, `treeShape`, `treeVariance` | None/Some/Many · bool · enum · float |
| Style preset | `style` | Default/Sand/Cold/Night/B&W/Minimal/Random (keys 1–6 / 0) |
| Houses | `roofType`, `roofSlope`, `roofVariance`, color variance | enum · float |
| Roads | `largeRoad`, `smallRoad` (widths), `outlineRoads` (Hard/Soft/None), `mergeRoads` | float · enum · bool |
| Fields / terrain | `relief` (style, e.g. Hachures), `fieldVariance`, `outlineFields` (Hard/Soft/None) | enum · float |
| Water / shadow / strokes | `shallowBands`, `shadowAngle`, `shadowLength`, `strokeNormal`, `strokeThin` | int · float |
| Generation | `pop` (size), `seed`, `tags` (crossroads/dead end/isolated/palisade/pond/no orchards + size) | int · array |
| Misc | `dramatic` (light), `marked` (numbered houses), `hidePopulation`, `name` | bool · text |

**Import:** gridless overview (module default). Bake via URL params (Village honors `pop`, `seed`, `trees`, and the style floats/strings).

---

## How this was obtained (method)
1. Open the generator via `MaphubViewerApp` on the MCP bridge; wait for canvas + (if patched) `__maphubClasses`.
2. Patched: dump the controller's prototype methods + own fields + `State.data` + the `com.watabou.<gen>` localStorage entry. Controller = `__sdxDungeonView` / `__sdxDwellView` / `Game.scene`.
3. Unpatched (no `__maphubClasses`): decode the persisted `localStorage` object + grep the bundled JS for `.set("…")` (persisted keys), `getInt/getString/getBool/getFloat("…")` (URL params), and value-enum string literals.
4. Cross-reference each generator's wiki guide (`docs/generators/*.md`) for the human meaning + option lists.

## Caution
- **Serial only.** Each generator's controller is a shared singleton; the cataloging workflow that fanned out 17 agents OOM-killed the desktop app. Do generator-internals work inline/serial.
- **Enum args** on patched setters (`setGridMode`, `setNotesMode`, `setRoofMode`, `applyArchitecture`) take Haxe enum values — prefer the `toggle*` methods or set via the persisted key for deterministic headless control; spot-check the exact arg before baking.
