# Cartomancer — Extraction Plan

**Goal:** stand up a new standalone, system-agnostic Foundry v14 module **`cartomancer`** = Watabou map generators ("Maphub") + DungeonDraft (DD-Pack) decor importer, with a deliberate decision on the ZIP SceneImporter/Exporter.

**Source repo (extract FROM):** `/home/patricks/FoundryV14/Data/modules/shadowdark-extras`
**New repo (extract TO):** a fresh `modules/cartomancer/` tree.

**Status of evidence:** every file path, line number, literal, and tree fact below was verified against the live tree on 2026-06-20 (`grep`/`du`/`ls`/`find`). Where a claim is from the audits and not re-verified, it is labeled "(audit)".

---

## 0. Scope decision up front

Three subsystems are extraction candidates. The decisions:

| Subsystem | Decision | Rationale |
|---|---|---|
| **Watabou Maphub** (launcher + viewer + parser + 17 MB bundles) | **MOVE** (core of Cartomancer) | Zero system coupling; only string-literal/packaging coupling. **But gated on licensing — see §3.** |
| **DD-Pack importer** (`DDPackManager/SettingsApp/PreviewApp`) | **MOVE** | Cleanest candidate; the only real seam is `reloadDecorAssets` import from `HexPainterSD`. |
| **Auto-decor** (`DungeonDecorSD.mjs` + `wall-sconce.svg`) | **MOVE** (as a reusable helper/API) | Clean-room, DI-based, one literal. Ships as a public API; **no generator code follows it.** |
| **Decor TAB** (the manual palette inside `HexPainterSD`) | **STAYS in SDX** | Not a subsystem — it is a UI affordance welded into the 2302-line hex painter. Cannot be lifted without `HexPainterSD` + `TrayApp` + `SDXCache` + `DungeonPainterSD` + biome tinting. Out of scope. |
| **ZIP Scene import/export** (`SceneExporter`/`SceneImporter`) | **MOVE in Phase C** (deferred, not v1) | "Maps in/out" fits Cartomancer thematically and is nearly agnostic. The only real seam is the SDX hex-tooltip `__sdx_hex_data__` journal, which becomes a pluggable hook. Lower priority than generators; ship after the core. |

**The `DungeonGeneratorSD` / `DungeonMultiLevelSD` dungeon generators STAY in SDX** for v1. They are the *callers* of auto-decor (direction is generator → decor), so moving decor does not drag them along. Porting a generator is an optional later phase.

---

## 1. File move-list

Legend for destination: **MOVE** = goes to Cartomancer; **STAYS** = remains in shadowdark-extras; **SPLIT** = needs a code split / shim on both sides.

### 1a. Maphub (Watabou) — core

| Source path (in SDX) | Disposition | New path in Cartomancer | Notes |
|---|---|---|---|
| `scripts/MaphubViewerApp.mjs` | MOVE | `scripts/MaphubViewer.mjs` | Drop `SD`/Maphub-internal naming optional. Rewrite `MODULE_ID` (line 21), `useLocalMaphub` read (1871), `BASE` (1882), spiral flag writes (919-921, 951), and the **stringified** `flags["shadowdark-extras"]` inside `_spiralRegionScript` (verified line 951). |
| `scripts/MaphubLauncherApp.mjs` | MOVE | `scripts/MaphubLauncher.mjs` | Rewrite PARTS template path (line 22). `externalBase` watabou URLs (79-84) are upstream, keep. |
| `scripts/MaphubSD.mjs` | MOVE | `scripts/MaphubEmbed.mjs` | Rewrite `MODULE_ID`/`LOCAL_MAPHUB_BASE` (10-11). Rename `.sdx-maphub-map` / `data-maphub-*` → `.cartomancer-map` / `data-cartomancer-*`. Document an embed snippet (the SDX emitter does not ship). |
| `scripts/maphub/OnePageParserSD.mjs` | MOVE | `scripts/maphub/OnePageParser.mjs` | Pure parser, zero coupling. Drop-in. |
| `scripts/maphub/js/**` (~13 MB) | MOVE verbatim | `scripts/maphub/js/**` | Patched Watabou bundles (`Cave/Dungeon/Dwellings/mfcg/Perilous/ToyTown2/Village.js`, `*-raw/`, `shared/`, `struct/`, `lzma-*.js`, `vendor.globals.min.js`). **DO NOT regenerate.** The `__sdx*` patch globals are the import contract (audit). |
| `scripts/maphub/to/**` | MOVE | `scripts/maphub/to/**` | Per-generator `index.html` + Assets/fonts. **5 files carry the baked literal** (verified): `cave/`, `dwellings/`, `mfcg/`, `viewer/`, `village/` index.html. `dungeon`/`realm`/`-raw` do NOT. |
| `scripts/maphub/fonts/**` | MOVE | `scripts/maphub/fonts/**` | OFL Google Fonts. **Add `OFL.txt`** (missing — verified). |
| `templates/maphub-launcher.hbs` | MOVE | `templates/maphub-launcher.hbs` | Keep the Watabou Patreon credit footer (attribution requirement). |
| `styles/maphub-launcher.css` (3916 B, verified) | MOVE | `styles/maphub-launcher.css` | Register in new `module.json` styles[]. |

### 1b. DD-Pack importer

| Source path | Disposition | New path | Notes |
|---|---|---|---|
| `scripts/DDPackManagerSD.mjs` | MOVE | `scripts/DDPackManager.mjs` | Rewrite `MODULE_ID` (8). Keep `SETTING_KEY="decorDungeondraftPacks"` and `DD_DECOR_BASE="decor/ddpacks"` (see §3 collision note). Harden `parsePCK` header offset. |
| `scripts/DDPackSettingsAppSD.mjs` | SPLIT → MOVE | `scripts/DDPackSettingsApp.mjs` | **Remove `import { reloadDecorAssets } from "./HexPainterSD.mjs"` (line 3).** Replace with Cartomancer API/hook. Rename `sdx.decorAssetsImported` hook (108-122) and `sdx-ddpack-*` ids/classes. |
| `scripts/DDPackPreviewAppSD.mjs` | SPLIT → MOVE | `scripts/DDPackPreviewApp.mjs` | Same: drop `HexPainterSD` import (line 2), rename hook (255-256). |

### 1c. Auto-decor

| Source path | Disposition | New path | Notes |
|---|---|---|---|
| `scripts/DungeonDecorSD.mjs` | MOVE | `scripts/DungeonDecor.mjs` | One literal `MODULE_ID` (line 1) → constant. Promote `SCONCE_TILE`, light config, tile-size factor (0.42) to an **options object** so it is theme-agnostic. Export `createDungeonOccupancy` + `generateDungeonDecor` on the public API. |
| `assets/Dungeon/decor/wall-sconce.svg` (1187 B, verified) | MOVE | `assets/decor/wall-sconce.svg` | Update `SCONCE_TILE` default path. |
| `scripts/DungeonGeneratorSD.mjs` | STAYS | — | Caller. Optional later port. |
| `scripts/DungeonMultiLevelSD.mjs` | STAYS | — | Caller. Optional later port. |

### 1d. Scene import/export (Phase C)

| Source path | Disposition | New path | Notes |
|---|---|---|---|
| `scripts/SceneExporter.mjs` | MOVE | `scripts/SceneExporter.mjs` | Rewrite `MODULE_ID` (8). Make `collectHexData` (128-134) / hex-data.json write a **hook** (`cartomancer.collectExtraBundleData`). Generalize the `modules/shadowdark` icon-skip heuristic (155). |
| `scripts/SceneImporter.mjs` | MOVE | `scripts/SceneImporter.mjs` | Rewrite `MODULE_ID` (8). Make `importHexData` (304-327) a hook (`cartomancer.applyExtraBundleData`). Rebrand dialog copy (line 27). |
| `libs/jszip.min.js` (MIT, verified header) | MOVE (copy) | `libs/jszip.min.js` | Add to new `module.json` scripts[]. Keep in SDX until SDX migration is complete. |

### 1e. New files to author in Cartomancer

| New path | Purpose |
|---|---|
| `scripts/cartomancer.mjs` | Main entry (esmodule). init/ready hooks; settings; launcher surfacing; API. |
| `scripts/constants.mjs` | `export const MODULE_ID = "cartomancer";` single source of truth. |
| `scripts/DecorBrowser.mjs` | Minimal standalone decor browser consuming `loadDDPackDecorTiles()` (replaces the `HexPainterSD` seam). |
| `styles/ddpack.css` | Optional: extract inline `<style>` from DDPack apps (or keep inline). |
| `i18n/en.json` | `CARTOMANCER.*` namespace. |
| `module.json` | New manifest (see §4). |
| `LICENSE` + `NOTICE` + `scripts/maphub/CREDITS.md` | Single chosen license; third-party notices; bundle patch/provenance notes. |
| `scripts/maphub/fonts/OFL.txt` | Missing OFL text (compliance). |

### 1f. Files that STAY in SDX (and what to remove from them)

| File | Action in SDX |
|---|---|
| `scripts/shadowdark-extras.mjs` | After migration: remove `registerMaphubHooks` import/call (86,125); remove DD-Pack settings register/menu (3116-3138) **only if SDX drops the feature** — otherwise SDX keeps its own copy; remove SceneExporter/Importer imports + context menu (69-70, 21117-21160) when Scene io moves. |
| `scripts/TrayApp.mjs` | Maphub tray button + DDPack tray button stay if SDX keeps the features; otherwise remove (953-960, 2518-2526). |
| `scripts/TraySD.mjs` | `settlement.useLocalMaphub` registration (323) — SDX keeps if SDX keeps Maphub. |
| `scripts/HexPainterSD.mjs`, `HexTooltipSD.mjs`, `DungeonBiomesSD.mjs` | STAY. Consumers of decor; not part of Cartomancer. |
| `module.json` (SDX) | Drop `styles/maphub-launcher.css` only if SDX drops Maphub. |

> **Coexistence note:** Cartomancer can be installed *alongside* SDX. They share the user-data folders `Data/decor/ddpacks/`, `Data/decor/`, `Data/maps/maphub/`, `Data/exported-scenes/`, `Data/imported-scenes/`. Keep `DD_DECOR_BASE="decor/ddpacks"` so packs interoperate (see §3 collision tradeoff). Cartomancer must NOT delete SDX's settings.

---

## 2. Dependency seams & decouple plan (ordered)

Execute in this order. Each step is independently verifiable.

### Step 1 — Single MODULE_ID source of truth
Create `scripts/constants.mjs` exporting `MODULE_ID = "cartomancer"`. Replace the 8 verified literals:
`MaphubViewerApp.mjs:21`, `MaphubSD.mjs:10`, `DDPackManagerSD.mjs:8`, `DDPackSettingsAppSD.mjs:5`, `DDPackPreviewAppSD.mjs:4`, `DungeonDecorSD.mjs:1`, `SceneExporter.mjs:8`, `SceneImporter.mjs:8`. Re-derive `LOCAL_MAPHUB_BASE` / `BASE` / `SCONCE_TILE` from it.

### Step 2 — Stringified region flag (the trap)
`MaphubViewerApp.mjs:951` contains the literal `'const conn = region?.flags?.["shadowdark-extras"]?.spiral;'` **inside a stringified `executeScript` region source** (verified). A constant rename will NOT catch this. Edit the template string to `cartomancer`. **Also** edit the writer at 919-921. **Migration caveat:** scenes imported under SDX store the old namespace in their region docs → spiral stairs silently break after rename. Mitigation: have the new script read **both** keys (`?.["cartomancer"]?.spiral ?? ?.["shadowdark-extras"]?.spiral`), OR document as a known limitation for pre-existing scenes.

### Step 3 — Asset path relocation
- Copy `scripts/maphub/` (17 MB, verified) verbatim.
- De-brand the **5 baked HTML files** (verified: `cave`, `dwellings`, `mfcg`, `viewer`, `village` `index.html`): scripted find/replace `"/modules/shadowdark-extras/scripts/maphub"` → `"/modules/cartomancer/scripts/maphub"` (BASE + all inter-generator route URLs). `dungeon`/`realm`/`-raw` need no change.
- Copy `wall-sconce.svg` → `assets/decor/`, update `SCONCE_TILE`.
- Verify zero residual: `grep -rl shadowdark-extras modules/cartomancer/` must come back empty.

### Step 4 — The HexPainterSD / decor split (critical)
`DDPackSettingsAppSD` and `DDPackPreviewAppSD` both `import { reloadDecorAssets } from "./HexPainterSD.mjs"` (verified lines 3 and 2). This is the single biggest blocker. Decouple:
1. Remove both imports.
2. After import/toggle/remove, fire `Hooks.callAll("cartomancer.decorAssetsImported")` (replaces `sdx.decorAssetsImported` at 108/121/255).
3. Author `scripts/DecorBrowser.mjs` (minimal standalone browser) that listens for that hook and calls `loadDDPackDecorTiles()` (which already returns plain tile descriptors with no host dependency — audit). 
4. Expose `game.modules.get("cartomancer").api.reloadDecorAssets()` for power users.

The auto-decor module (`DungeonDecorSD`) has **zero internal imports** — no split needed, just the constant + options object.

### Step 5 — Re-home settings
Register in `cartomancer.mjs` `init`: `settlement.useLocalMaphub` (was `TraySD.mjs:323`), `customDecorAssets` (Array, world), `decorDungeondraftPacks` (Array, world), and `registerMenu("decorDungeondraftPacksMenu", {type: DDPackSettingsApp, restricted:true})`. Keep `MaphubViewerApp`'s read (`:1871`) in sync. Consider defaulting `useLocalMaphub` to **true** (local is mandatory for import — §3).

### Step 6 — Replace the tray launcher with a standalone entry point
The SDX tray (`TrayApp.mjs:953-960`, `tray.hbs:52`) and DD-Pack tray button (`TrayApp.mjs:2518-2526`) won't exist. Replace with:
- **Primary:** Scene Controls button via `getSceneControlButtons` (v13/v14 shape differs — verify on target) → `new MaphubLauncher().render(true)` (GM-gated).
- **Settings:** the DD-Pack `registerMenu`.
- **API/macro:** `game.modules.get("cartomancer").api = { openLauncher, openGenerator(type), openViewer(opts), openDDPackSettings, reloadDecorAssets, generateDungeonDecor, createDungeonOccupancy }`.
- Drop the `HexTooltipSD` context-menu entry (SDX-specific).

### Step 7 — Build the main entry
`cartomancer.mjs`: `Hooks.once("init", …)` registers settings + API skeleton; `Hooks.once("ready", …)` calls `registerMaphubHooks()` (keep journal-embed) and registers the Scene Controls hook. Gate nothing on `game.system.id`. Remove dependence on `shadowdark-extras.mjs`.

### Step 8 — Bundle-contract identifiers (leave as-is for v1)
`__sdxDungeonView` / `__sdxDwellView` / `__maphubClasses` / `__getRenderTransform` appear in BOTH the `.mjs` readers AND the minified bundles + `index.html` saveAs hooks (audit). **Do not rename** — they are not user-visible and renaming requires re-patching 17 MB of minified Haxe. Capture the patch points in `scripts/maphub/CREDITS.md` build notes.

### Step 9 — Strings & attribution
Window titles, notifications, README → Cartomancer. **Keep** Watabou attribution footer. Add `NOTICE` for MIT/BSD/Apache libs; add `OFL.txt`; resolve the root license contradiction (§3).

### Step 10 — Scene io seam (Phase C)
Convert `collectHexData`/`importHexData` to the `cartomancer.collectExtraBundleData` / `cartomancer.applyExtraBundleData` hooks. SDX can register a listener to keep its hex tooltips working. Generalize the `modules/shadowdark` icon-skip heuristic.

### Step 11 — Verify (per §5)
`node --check` every copied `.mjs`; `grep -rl shadowdark` the new tree (expect empty); live-test in a NON-shadowdark world.

---

## 3. Licensing summary + recommended architecture

### 3.1 The blocking reality
**Local same-origin bundling is mandatory, not a preference.** `MaphubViewerApp` builds a sandboxed iframe with `allow-same-origin` pointing at the **local** `to/<gen>/index.html`, then reads pixels and live Haxe model state across the frame boundary (`iframe.contentDocument`, `__maphubClasses`, `exportPNG()`, `__getRenderTransform`). A **cross-origin** `watabou.github.io` iframe taints the canvas and blocks `contentDocument` — so the scene/wall/stairs import features are **technically impossible** hosted. You cannot dodge licensing by pointing at the hosted pages.

### 3.2 Per-generator licensing & recommended architecture

| Generator | Origin | License status | Bundle publicly? | Recommended architecture |
|---|---|---|---|---|
| **MFCG / City** (`mfcg.js`) | voluminor/maphub binary; *algorithm* is GPL-3 TownGeneratorOS | Binary carries no GPL notice/source | Conditional | **Compile your own from-source GPL-3 TownGeneratorOS build**, ship source + GPL notice. Only clean open lineage. |
| **Cave** (`Cave.js`) | voluminor/maphub | No license | **NO** | Get written permission from voluminor (+ Watabou) **or drop**. |
| **Dwellings** (`Dwellings.js`) | voluminor/maphub | No license | **NO** | Permission or drop. No open equivalent. |
| **Village** (`Village.js`) | voluminor/maphub | No license | **NO** | Permission or drop. |
| **City Viewer** (`ToyTown2.js`) | voluminor/maphub | No license | **NO** | Permission or drop. |
| **Dungeon / One Page** (`Dungeon.js`) | Watabou closed hosted build | No redistribution grant | **NO** | Written permission from Watabou or drop. |
| **Realm / Perilous Shores** (`Perilous.js`) | Watabou closed hosted build | No redistribution grant | **NO** | Written permission from Watabou or drop. |
| **`*-raw` variants** | same as parents | same | same as parent | Not a separate license — second copy. |

**Bundled libs (safe, with compliance fixes):** JSZip (MIT), rot.js (BSD-3 — reproduce notice), howler/FileSaver/pako (MIT), fontsloader (Apache-2.0 — `libs/LICENSE` covers it), LZMA-JS (re-fetch headered copy), OpenFL/Lime/Haxe runtime under `shared/`+`struct/` (MIT — the runtime is fine; only the generator logic on top is the problem). Fonts are OFL (add `OFL.txt`).

### 3.3 Recommended publishing architecture
- **PER-generator decision, not all-or-nothing.** Ship only what you have rights to.
- **Bundle = mandatory** for any generator with import features (capture needs same-origin). There is no hosted fallback that preserves import.
- **Recommended public v1 release contents:**
  1. **MFCG/City** — bundle a *self-compiled from-source GPL-3 build* + source + GPL notice. (Accept that this bundle dir becomes GPL; keep it isolated so it does not force the whole module to GPL — or make the whole module GPL-3 and resolve the root MIT/AGPL contradiction accordingly.)
  2. **Everything else (Cave/Dungeon/Dwellings/Village/Perilous/Viewer)** — **gated behind explicit user opt-in / not bundled** until written permission is obtained from Watabou and voluminor. Until then, ship them as a separate "import your own" path or omit.
- **Module's own license:** delete one of the contradictory root files (`LICENSE` MIT vs `LICENSE.txt` AGPL-3). If you bundle any GPL build, the module license must be GPL-compatible — that conflicts with MIT, so the choice is forced by the generator decision. Resolve generators first, then pick the license.
- **System-agnostic ≠ license-clean.** Removing Shadowdark deps does nothing for the Watabou/voluminor redistribution problem. These are orthogonal.

> **Architect's recommendation:** Phase A/B can proceed as **private/internal** Cartomancer (same legal posture as today's in-house SDX feature). **Do NOT make the repo public or list it on a package registry** until §3.2 permissions are resolved. Treat licensing as a hard gate on Phase D, not on building the module.

---

## 4. Cartomancer module skeleton

### 4.1 `module.json`
```json
{
  "id": "cartomancer",
  "title": "Cartomancer — Map Generators & Decor Importer",
  "description": "System-agnostic Watabou map generators (Realm/City/Village/Cave/Dungeon/Dwellings) with scene/wall/stairs import, plus a DungeonDraft pack decor importer. No system required.",
  "version": "0.1.0",
  "compatibility": { "minimum": "13", "verified": "14" },
  "authors": [{ "name": "gmdima" }],
  "relationships": {},
  "esmodules": ["scripts/cartomancer.mjs"],
  "scripts": ["libs/jszip.min.js"],
  "styles": [
    "styles/maphub-launcher.css",
    "styles/ddpack.css"
  ],
  "languages": [
    { "lang": "en", "name": "English", "path": "i18n/en.json" }
  ],
  "packs": [],
  "url": "",
  "manifest": "",
  "download": ""
}
```
Notes:
- **`relationships: {}`** — NO `systems`, NO `requires`. Verified: Maphub/DD-Pack use none of SDX's required modules (socketlib/lib-wrapper/sequencer/portal-lib/tokenmagic).
- **`scripts[]`** only needed if keeping JSZip as a global (Phase C). Omit until Scene io lands, or convert JSZip to an ESM import.
- **`packs: []`** — Cartomancer ships no compendium packs.
- `esmodules` is a single entry; everything else loads via the import graph + dynamic `import()`, matching the current SDX pattern.

### 4.2 Init entry-point design (`scripts/cartomancer.mjs`)
```
import { MODULE_ID } from "./constants.mjs";
import { registerMaphubHooks } from "./MaphubEmbed.mjs";

Hooks.once("init", () => {
  // settings
  game.settings.register(MODULE_ID, "settlement.useLocalMaphub", { scope:"world", config:true, type:Boolean, default:true });
  game.settings.register(MODULE_ID, "customDecorAssets", { scope:"world", config:false, type:Array, default:[] });
  game.settings.register(MODULE_ID, "decorDungeondraftPacks", { scope:"world", config:false, type:Array, default:[] });
  game.settings.registerMenu(MODULE_ID, "decorDungeondraftPacksMenu", { restricted:true, /* type: stub → DDPackSettingsApp */ });
  // public API skeleton (filled in ready)
});

Hooks.once("ready", () => {
  registerMaphubHooks();                     // journal-embed MutationObserver
  game.modules.get(MODULE_ID).api = {
    openLauncher, openGenerator, openViewer, openDDPackSettings,
    reloadDecorAssets, generateDungeonDecor, createDungeonOccupancy
  };
});

// Scene Controls launcher (primary entry) — verify v13 vs v14 hook shape
Hooks.on("getSceneControlButtons", (controls) => { /* add GM-gated Cartomancer tool → openLauncher() */ });
```

**Three launch surfaces:**
1. **Scene Controls button** (primary) — `getSceneControlButtons`, GM-gated.
2. **Settings menu** — "Manage DungeonDraft Packs" via `registerMenu`.
3. **Macro/API** — `game.modules.get("cartomancer").api.*`.

### 4.3 Settings to carry over
| Key | Scope | Type | Default | Source | Purpose |
|---|---|---|---|---|---|
| `settlement.useLocalMaphub` | world | Boolean | **true** (changed) | `TraySD.mjs:323` | Local vs external iframe; local mandatory for import. |
| `customDecorAssets` | world | Array | `[]` | `shadowdark-extras.mjs:3108` | User-registered decor tiles. |
| `decorDungeondraftPacks` | world | Array | `[]` | `shadowdark-extras.mjs:3116` | DD-Pack registry. |
| `decorDungeondraftPacksMenu` | (menu) | — | — | `shadowdark-extras.mjs:3124` | Launch DDPackSettingsApp. |

(`hexPainter.customTileWidth/Height/poiScale` from `TraySD.mjs:302-323` are Decor-TAB-only — **not** carried.)

### 4.4 Asset / folder layout
```
modules/cartomancer/
  module.json
  LICENSE                      (single, chosen per §3)
  NOTICE                       (MIT/BSD/Apache third-party notices)
  README.md
  i18n/en.json                 (CARTOMANCER.* namespace)
  scripts/
    cartomancer.mjs            (entry)
    constants.mjs              (MODULE_ID)
    MaphubViewer.mjs
    MaphubLauncher.mjs
    MaphubEmbed.mjs
    DDPackManager.mjs
    DDPackSettingsApp.mjs
    DDPackPreviewApp.mjs
    DecorBrowser.mjs           (new — replaces HexPainter seam)
    DungeonDecor.mjs
    SceneExporter.mjs          (Phase C)
    SceneImporter.mjs          (Phase C)
    maphub/
      OnePageParser.mjs
      CREDITS.md               (provenance + __sdx* patch-point build notes)
      js/    (~13 MB bundles, verbatim)
      to/    (per-generator index.html + Assets)
      fonts/ (woff + OFL.txt)
  templates/maphub-launcher.hbs
  styles/maphub-launcher.css
  styles/ddpack.css
  assets/decor/wall-sconce.svg
  libs/jszip.min.js            (Phase C)
```
**User-data paths (unchanged, shared with SDX):** `Data/decor/`, `Data/decor/ddpacks/<packId>/`, `Data/maps/maphub/`, `Data/exported-scenes/`, `Data/imported-scenes/`.

---

## 5. Phased roadmap (smallest-first)

### Phase A — Scaffold + Watabou generators (the core)
**Do:** create module skeleton (§4); `constants.mjs`; move Maphub files (1a) + the 17 MB tree; de-brand 5 baked HTMLs + constants + the stringified region script (steps 1-3, 6, 7); Scene Controls launcher; settings (5).
**Verify:**
- `node --check` all copied `.mjs`.
- `grep -rl shadowdark modules/cartomancer/` → **empty**.
- In a **Simple Worldbuilding** world: launcher opens from Scene Controls (GM); each generator loads its **local** iframe; One Page Dungeon imports as a scene with walls/notes; a dwelling imports as a **multi-level** scene with **spiral-staircase regions** that fire under the NEW flag namespace; realm/city/village image-only import; `maphub_save_json` round-trips to `Data/maps/maphub/`.

### Phase B — DD-Pack + decor
**Do:** move DD-Pack files (1b); cut the `HexPainterSD` seam (step 4); author `DecorBrowser.mjs`; move auto-decor (1c) with options-object + sconce relocation; harden `parsePCK`.
**Verify:**
- A `.dungeondraft_pack` scans → previews → extracts into `Data/decor/ddpacks/<id>/objects/...` → appears in the new decor browser.
- Toggling/removing a pack fires `cartomancer.decorAssetsImported`; browser refreshes.
- `api.generateDungeonDecor(...)` with a hand-built layout places a sconce light+tile from the relocated SVG (no broken texture).

### Phase C — Scene io
**Do:** move `SceneExporter`/`SceneImporter` (1d); JSZip; hooks for hex data (step 10); `getSceneContextOptions` menu; generalize icon-skip heuristic.
**Verify:** export a scene (tokens/actors/journals/images) from a non-Shadowdark world → import into a fresh world → assets land under `imported-scenes/`, `token.actorId` and `note.entryId` remap, scene renders; (if SDX listener registered) hex data round-trips via hook.

### Phase D — Licensing / publish gate
**Do:** resolve §3 — obtain Watabou + voluminor permission OR drop those generators; self-compile GPL MFCG from source; add `OFL.txt`, `NOTICE`, rot.js BSD notice, headered LZMA-JS; delete contradictory root license; correct the README "TownGeneratorOS GPL" misstatement; `CREDITS.md` patch notes.
**Verify:** `find scripts/maphub -iname '*license*'` shows the required notices present; README claims match shipped files; chosen module license is consistent with every bundled artifact. **Only after this passes** may the repo go public / be registry-listed.

---

## 6. Open questions / risks for the user

**Licensing (the gate):**
1. **Will you pursue written redistribution permission from Watabou and voluminor**, or ship only a self-compiled GPL MFCG and drop Cave/Dungeon/Dwellings/Village/Perilous/Viewer for v1? This decision determines the whole Phase D shape and the module's own license.
2. **MIT vs GPL for Cartomancer itself** — bundling any GPL build forces a GPL-compatible module license, killing the MIT option. Confirm the intended license posture.
3. **Public vs private** — recommend keeping Cartomancer private/internal through Phases A–C (same legal posture as today). Confirm you do not intend to publish before Phase D.

**Technical:**
4. **DD_DECOR_BASE collision tradeoff** — keep `decor/ddpacks` (interoperate with an installed SDX, but two registries point at one folder) vs namespace `cartomancer/ddpacks` (clean, but users re-import packs). Recommendation: **keep** `decor/ddpacks` and treat the registry as additive; confirm.
5. **Spiral-region migration** — pre-existing SDX-imported dwelling scenes carry `flags["shadowdark-extras"].spiral` in stored region scripts. Read both keys (safe, recommended) or accept that old scenes' spiral stairs break? 
6. **`getSceneControlButtons` v13 vs v14 shape** — the hook signature/structure differs; must be verified against the live v14 target (no existing Scene Controls entry to copy from).
7. **Bundle re-patch fragility** — if Watabou bundles are ever updated from upstream, the `__sdx*` patches must be re-applied or import breaks silently. Acceptable to freeze bundles at current builds for v1?
8. **Decor TAB** — confirm it stays out of scope (it is welded into `HexPainterSD`; extracting it pulls in 5+ sibling modules + the SDX tray). Cartomancer ships only the minimal `DecorBrowser`.
9. **Scene io item-restore** — `SceneImporter` intentionally skips world/unlinked Items (relies on actor-embedded items). Document, or fix in Cartomancer?
10. **Server/static assumptions** — local-iframe embedding relies on Foundry serving `modules/<id>/...` HTML same-origin without `X-Frame-Options`; the Blob-`<base>` fallback covers text/plain MIME but some reverse-proxy/S3 setups may still break. Confirm the deploy target before publish.
