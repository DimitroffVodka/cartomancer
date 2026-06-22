# Watabou Generator — Live-Control API (Perilous Shores)

**Date:** 2026-06-21. **Context:** while implementing "optimal Foundry import settings per generator," reverse-engineered the *live* internals of Watabou's Perilous Shores generator running inside Cartomancer's iframe, so the module can both **read** geometry and **drive** any setting programmatically. Shipped a pixel-aligned flat-top hex import on top of it (commit `624b304`).

**Verification posture:** the flat-top force + hex import were **live-tested twice** through the Foundry MCP bridge (scenes came out `grid.type=4` HEXODDQ, `fog.mode=0`, `tokenVision=false`; screenshot showed hexes on the map at the right scale, no console errors). Alignment is **geometrically exact** (matched pitch + lattice phase, ≤~1px crop rounding) but was **not** literally pixel-diffed against the generator's own drawn grid lines (the grid layer wouldn't render into the capture). The Grid and Labels setting catalogs below are source-grounded; the other 6 categories are **not yet cataloged** (the cataloging workflow OOM-crashed — see Caution).

---

## TL;DR — the breakthrough

The Watabou generators are Haxe/OpenFL apps compiled to one minified JS bundle (`scripts/maphub/js/Perilous.js`, ~1.4 MB). Their **full class registry and live instances are reachable** from the parent Foundry window via the same-origin iframe, which means **every menu setting is drivable from code** — no synthetic canvas clicks needed. The dial we already ship (`setTilt(2)` → flat-top hexes) is just one of dozens; they all follow the same three patterns.

---

## 1. Access path (how to reach the live controller)

The iframe is same-origin (blob URL), so from the parent: `iframe.contentWindow.__maphubClasses` is the **Haxe class registry** (keys are full package names, e.g. `com.watabou.perilous.MapScene`). Key live handles:

| Handle | What it is |
|---|---|
| `MapScene.inst` | the live scene (`com.watabou.perilous.MapScene`). High-level **actions** live here. |
| `MapScene.inst.view` | the **MapView** renderer. Most **display toggles** live here. |
| `MapScene.inst.region` | the model (`com.watabou.perilous.model.Region`): mesh, geometry, generation. |
| `MapScene.inst.stage` | the OpenFL stage (display root). |
| `com.watabou.coogee.Game` | `.scene` / `.instance` — engine handles (alt route to the scene). |
| `com.watabou.system.State` (src alias `ea`) | persisted prefs: `State.get(k,def)`, `State.set(k,v)`, `State.data.h` = the settings object. |
| `com.watabou.system.URLState` | URL params: `seed`, `tags`, `w`, `h`, `name` (read via `getInt`/`get`). |
| `com.watabou.perilous.model.Region` (static) | `hexRadius=50`, `hexInner=43.30 (=R·√3/2)`, `tiltMode`. |
| `openfl.geom.Point` | needed to call `view.localToGlobal(new Point(x,y))`. |

> `maphubRealmAppInstance` on the window is only the lime bootstrap — **not** the scene. Use `MapScene.inst`.

Readiness signal: poll until `__maphubClasses?.["com.watabou.perilous.MapScene"]?.inst?.region` exists and the iframe `<canvas>` has `width>0`.

---

## 2. Three ways to drive any setting

1. **`MapScene.inst.view.<method>(...)`** — display toggles (grid, labels, clouds, trees, towns…).
2. **`MapScene.inst.<method>(...)`** — actions (`setTilt`, `applyPreset`, `rerollNames`, `rotate*`, `newRegion`…).
3. **`State.set('<key>', value)`** — persisted prefs. This is the route for **baking in** defaults; it mirrors what the in-app dialogs do on "Apply." After setting grid color/alpha/etc. via `State`, repaint with `view.drawGrid()`.

**State persistence format:** `State.data.h` is Haxe-serialized into `localStorage["<blobURL>:com.watabou.perilous"]` as e.g. `oy4:gridi2y4:tilti2g` = `{grid:2, tilt:2}` (`y<len>:<str>`=string, `i<n>`=int, `z`=int 0, `t/f`=bool, `d<f>`=float, `g`=end object, `h`=end array). The key is per-blob, so seeding it pre-load is impractical — **call the setter methods after load instead** (what we do).

Minified source aliases worth knowing: `ea`=State, `J`=MapView static, `ac`=label-mode enum, `ia`=namer, `oe`=grid layer, `w.black`=ink color. Methods are preserved as `name:function(...)` — grep for them.

---

## 3. Flat-top hexes (shipped)

- **`MapScene.inst.setTilt(2)` → flat-top** (exported `region` layout becomes `"odd-q"`). `tilt 0/1/3` give pointy variants (`even-r`/`odd-r`). `setTilt` internally does `State.set("tilt", n)` so it persists; re-tilts the **current** map (no content change).
- Its URL-persist step can **throw on a blob: URL** — harmless, the tilt still applies. Wrap in `try/catch`.
- The URL `hexes` param is **ignored** in fetch/blob mode (never reaches `bp.hexes`) — the live `setTilt` API is the reliable lever.
- `meshAngle` (≈ −0.37 rad) only applies to **warped** mode; in flat/pointy the lattice is axis-aligned, so a Foundry hex grid lines up.

Implemented as `_forceRealmFlatTop()` + `_forceRealmFlatTopWhenReady()` in `scripts/MaphubViewerApp.mjs` (forces flat-top on generator load; a manual switch to Pointy is respected, Warped falls back to gridless).

## 4. Pixel-perfect hex-grid alignment (shipped)

Recipe in `_getRealmAlignSource()` + the realm branch of `_importScene()`:

1. **Geometry from the mesh:** `region.dcel.faces[i].data.center` = hex centre (model coords); `hexRadius=50`; flat-top pitch col=`1.5R=75`, row=`√3R≈86.6`, half-row offset `√3R/2≈43.3`; lattice centred on model origin. (`region.cols/rows = ceil(√2·max(w,h)/2 / pitch)` — oversized ×√2 to cover rotation.)
2. **Model→image transform:** `view.localToGlobal(new Point(mx,my))` → CSS px; **× dpr** (`canvas.width/clientWidth`) → captured-PNG backing px. Uniform scale, no rotation. Read it **at capture time** (after `_maximizeForCapture`).
3. **Layout → Foundry grid type:** `odd-r→HEXODDR(2)`, `even-r→HEXEVENR(3)`, `odd-q→HEXODDQ(4)`, `even-q→HEXEVENQ(5)`.
4. **Match pitch:** Foundry HEXODDQ for `grid.size=S` → colPitch `0.866·S`, rowPitch `S`, oddColShift `S/2`, `sizeX=1.1547·S`. Set **`S = √3·R·s_img`** (native row pitch in px). Round S to int and **rescale the image by `f = S/nativeS`** so the match is exact (no drift).
5. **Phase-align:** build `new foundry.grid.HexagonalGrid({size:S, columns:isFlat, even:isEven})`, map a sample hex centre to scaled px `G`, then `shift = G − grid.getCenterPoint(grid.getOffset(G))`. Feed `(f, shiftX, shiftY)` to `_renderAlignedImage` (same crop machinery as Dungeon/Cave). One Foundry hex = one map hex.

---

## 5. Recovered setting catalogs (source-grounded)

Two of eight categories survived the cataloging crash. Both confirmed against `Perilous.js`.

### Grid & coordinates
| Setting | Call | Values | State key (default) |
|---|---|---|---|
| Grid mode | `view.setGrid(n)` | 0 hidden / 1 under / 2 above | `grid` (0) |
| Toggle grid | `view.toggleGrid()` | flips 0↔1 only (hotkey G) | `grid` |
| **Hex numbers** | `view.toggleNumbers()` | on/off; also forces grid visible (hotkey N) | `hexNumbers` (false) |
| Ocean-tile grid | `view.toggleOceanTiles()` | bool; auto-shows grid | `oceanTiles` (false) |
| Use ink color | `State.set('useInkColor', true)` | bool (grid+numbers use map ink) | `useInkColor` (false) |
| Grid/number color | `State.set('numbersColor', 0x00CCFF)` | RGB int (colors **both**) | `numbersColor` (52479=cyan) |
| Grid opacity | `State.set('gridAlpha', 0.6)` | 0–1 | `gridAlpha` (0.4) |
| Number size | `State.set('numbersSize', 14)` | int 8–18 | `numbersSize` (14) |
| Number position | `State.set('numbersPos','Center')` | Top/Bottom/Center | `numbersPos` ('Top') |

Repaint after `State` color/alpha changes with `view.drawGrid()`. (`view.addNumbers()`/`view.drawGrid()` are internal repaint helpers, not settings.)

### Labels & toponymy
| Setting | Call | Values | State key (default) |
|---|---|---|---|
| Label mode | `view.setLabels('straight')` | hidden/straight/arced/curved (string enum) | `labels` ('arced') |
| Cycle labels | `view.toggleLabels()` | — (hotkey L) | `labels` |
| Reroll names | `inst.rerollNames()` | action (text only) | — |
| Open toponymy dialog | `inst.showToponymy()` | UI (Shift+N) | — |
| Use naming language | `State.set('useConlang', true)` | bool | `useConlang` (false) |
| Append terrain noun | `State.set('terrNoun', true)` | bool | `terrNoun` (false) |
| Naming-language preset | *(in-memory `ia.lang` only)* | Common/Elvish/Exotic/Alien/Random | **not persisted** — cold-starts to Common |

Other State keys already seen in localStorage (categories not yet cataloged): `tags`, `pinTowns`, `seaRoutes`, `showSuburbs`, `uniformTowns`, `outlineTowns`, `hollowRivers`.

---

## 6. Open work

- **Catalog the remaining 6 Perilous Shores categories** — Terrain/rivers, Trees/forests, Towns, Elements (header/matte/compass/clouds/light), Style/palette, Geometry/generation. Method clusters already mapped (e.g. `view.toggleClouds`, `view.setForestType`, `view.toggleTownsEx`, `inst.applyPreset`, `inst.setShading`, `inst.setVantage`, `inst.toggleDistortion`). Do it **inline** (serial grep), not via mass agent fan-out.
- **Other 5 generators** (City/MFCG, Village, One Page Dungeon, Cave/Glade, Dwellings) — apply the optimal-import treatment one at a time. Each has its own `__maphubClasses` namespace (e.g. `com.watabou.dungeon`, `com.watabou.mfcg`, `com.watabou.house`).
- **"Optimal flat-top-hex import config" for Perilous Shores** — once cataloged, decide which `State.set`/`view.*` calls to bake on load alongside `setTilt(2)`.

## 7. Caution (learned the hard way)

- The **live generator is a shared singleton** (`MapScene.inst` = the last-opened iframe). Concurrent agents/eval calls that mutate it corrupt each other — keep generator-internals work **serial**.
- The settings-cataloging step was attempted as a 17-agent workflow and **OOM-killed the desktop app**. Keep this kind of analysis inline, or cap fan-out hard. Partial results (Grid + Labels) were recovered from `.claude/.../subagents/workflows/wf_b5aef914-305/`.

## Pointers
- Code: `scripts/MaphubViewerApp.mjs` — `_getRealmAlignSource`, `_forceRealmFlatTop`, `_forceRealmFlatTopWhenReady`, realm branch in `_importScene`, `gridType` param in `_createImageScene`.
- Commit: `624b304` (per-generator import defaults + Perilous Shores flat-top hex grid + `fog.mode` fix + iframe sandbox removal).
- Wiki: `docs/generators/perilous-shores.md` (user-facing version of the hex import).
