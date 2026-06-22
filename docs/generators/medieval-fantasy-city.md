# Medieval Fantasy City Generator (MFCG) — Community Usage Guide

The **Medieval Fantasy City Generator** ("MFCG") is a free, browser-based tool that draws top-down maps of medieval and fantasy cities — complete with walls, castles, districts, rivers, bridges, plazas, farmland, and street-level building layouts. Give it a click and it generates a whole settlement; then you can rename it, restyle it, zoom into a single district, and export the result as an image, vector, or data file. It is aimed at game masters, worldbuilders, writers, and anyone who needs a believable city map in seconds.

- **Live generator:** https://watabou.github.io/city-generator/
- Created by **Oleg Dolya (Watabou)**.

---

## Getting started

When you open the link you land on a single full-screen **canvas** with a freshly generated city already drawn on it. There is no big toolbar — almost everything is driven from a context menu.

**The core idea:** generate a city, tweak it through the menus and windows, then export it.

### Generate, pan, zoom

| Action | How |
|--------|-----|
| **Generate a brand-new city** | Press `Enter`, or open the menu and choose **New city** |
| **Pan** | Click-and-drag the empty map background |
| **Zoom** | Mouse wheel (or pinch on touch) |
| **Open the main menu** | **Right-click** the map (desktop), or use the **Menu** button in the top-right corner |

### Desktop vs. touch

- **On desktop**, the main controls live in the **right-click menu**. Right-click empty map for the general menu; right-click a ward, building, or district for extra, context-specific actions.
- **On touch devices**, use a **long-press**, or tap the **Menu** button in the top-right corner to reach the same options.

Most settings live in three movable, hideable windows — **Generate**, **Settlement**, and **Style** — which you open from the right-click menu (or with keyboard shortcuts). Their positions are remembered between sessions, and you can collapse each window by clicking its header.

---

## The right-click menu

This is the heart of MFCG. The menu is **context-sensitive**: it shows different items depending on whether you right-clicked empty map or a specific feature (a ward, building, or district).

### Map-background menu

Right-click an empty part of the map (or press the **Menu** button) to get the general menu:

| Item | What it does |
|------|--------------|
| **Zoom out** | *Only appears in District View.* Returns from a single-district view back to the whole city. |
| **New city** | Generates a fresh city from scratch (same as pressing `Enter`). |
| **Warp** | Opens the **Warp** scene — an interactive tool for distorting the map's shape (see below). |
| **Colors...** | Opens the **Color scheme** dialog for recoloring the whole map (see below). |
| **Export as ▸** | Submenu: **PNG**, **SVG**, or **JSON** (see *Export & sharing*). |
| **Generate** | Shows/hides the **Generate** window (city features, size, roads). |
| **Settlement** | Shows/hides the **Settlement** window (name, info, points of interest, sharing). |
| **Style** | Shows/hides the **Style** window (all visual options). |
| **Procgen Arcana** | Returns to the Procgen Arcana homepage (the hub for Watabou's generators). |

### Feature menu (right-click a ward, building, or district)

When you right-click an actual feature on the map, these extra items appear **above** the general menu:

| Item | What it does | When it shows |
|------|--------------|---------------|
| **Add landmark** | Places a named landmark (a marker pin) at the clicked spot, then opens a dialog to name it. If landmarks were set to *Hidden*, this automatically switches them to *Icon* mode so the new pin is visible. | Always (on a feature) |
| **Reroll geometry** | Regenerates just this ward's internal layout (its streets and building shapes) while keeping the rest of the city untouched. Handy for fixing an ugly or empty-looking block. | Only on wards that can be rerolled |
| **Open in Dwellings** | Opens the clicked building/lot in Watabou's **Dwellings** generator so you can produce a detailed floor plan for that exact footprint. The building's shape and a "tall" hint are passed along, so you get a multi-floor interior matching the building you clicked. | Only when **Display mode** shows individual buildings (i.e. *Lots* or *Complex*) — never in *Block* mode |
| **Zoom in** | Enters **District View**: the clicked district fills the screen and the rest of the city is hidden. | Only when you click a district |

> Tip: most of these also have shortcuts — `Shift+click` a district to zoom in, and `Ctrl/Cmd+click` a ward to reroll its geometry without opening the menu.

### Warp scene

Open it with right-click → **Warp** (or press `W`). This drops you into a separate mesh-editing scene where you can push, pull, and twist the city's underlying shape. It changes how the map *looks* but does **not** change the city's topology — it never merges or splits blocks, just distorts them visually. (Because of this, a warped map's geometry may not line up neatly with a square VTT grid.)

**Warp tools:**

| Key | Tool | Effect |
|-----|------|--------|
| `D` | **Displace** | Drag vertices to move them around. |
| `R` | **Rotate** | Rotate areas of the mesh. |
| `L` | **Liquify** | Stretch and smear the mesh. |
| `B` | **Bloat** | Push areas outward (expand). |
| `P` | **Pinch** | Pull areas inward (the opposite of Bloat). |
| `M` | **Measure** | Measure distances on the map. |
| `E` | **Equalize** | Smooth the mesh back toward a regular, even grid. |

**Warp scene right-click menu:**

| Item | What it does |
|------|--------------|
| **Land** / **Water** | Switch the current paint mode between land and water. |
| **Parameters...** | Change the canvas size. |
| **Image...** | Load an image to use as a warp mask. |
| **Submit...** | Apply your warp and return to the city. |
| **Discard** | Throw away the warp changes and return. |
| **Rotate ▸** | Rotate the whole thing: 180°, 90° clockwise, or 90° counter-clockwise. (Horizontal/vertical flip exist in the code but are not active.) |
| **Clear** | Reset the mesh to its starting state. |
| **Invert** | Invert the current distortions. |
| **Melt** | Randomize the warp. |
| **Undo** | Undo the last warp operation. |

### District View

Enter it by right-clicking a district → **Zoom in**, or by `Shift+click`ing a district. The view fills with that one district and hides the rest of the city — useful for producing a close-up, district-scale map.

In District View you can still reroll, warp, and change visual options, and the district border is drawn as a thick, semi-transparent dashed line. Note these limits:

- **PNG/SVG export** exports only the **visible district**.
- **JSON export still exports the whole city**, not just the district.

Exit with the **Zoom out** menu item (it appears at the top of the menu in this mode) or by `Shift+click`ing anywhere.

---

## Settings & parameters

Three windows hold the bulk of the settings. Open them from the right-click menu or by keyboard.

### Generate window  (right-click → **Generate**, or `G` / `Tab`)

**Features** — toggle which features a city can have. Turn on **Random** to let MFCG pick features randomly each time you generate.

| Toggle | What it adds |
|--------|--------------|
| **Random** | When on, features are chosen randomly for each new city. |
| **Citadel** | A large central castle / fortress. |
| **Temple** | A large central religious building. |
| **Inner castle** | A castle placed inside the city, not built into the outer wall. |
| **Plaza** | A central open square. |
| **Walls** | Perimeter city walls. |
| **Shanty town** | An irregular, ramshackle outer district. |
| **River** | A river running through the city. |
| **Coast** | Puts the city on a coastline. |
| **Greens** | Parks and green open spaces. |

**Roads tab** — controls road-generation parameters.

**Size** — set how big the city is (roughly, in "patches"):

| Button | Approx. size |
|--------|--------------|
| **Small** | ~10–20 patches |
| **Medium** | ~20–40 patches |
| **Large** | ~40–60 patches |
| **Custom** | Type an exact number |
| **Rebuild** | Regenerate using the current size and feature settings |

### Settlement window  (right-click → **Settlement**, or `T`)

| Control | What it does |
|---------|--------------|
| **City name** | Editable text field; press Enter to commit a new name. |
| **Town info** | Read-only stats about the city (counts of districts, wards, buildings, etc.). |
| **Reroll names** | **Town** rerolls the city name; **Districts** rerolls all district names. |
| **Points of interest** | **Load** imports POI names from a JSON array of strings; **Clear** removes all POIs. |
| **Warp** | Opens the Warp scene. |
| **Overworld** | Sends the city's parameters to Azgaar's *Fantasy Map Generator* (a bridge from city scale to world-map scale). |
| **Permalink** | Copies the city's URL to the clipboard. *Note: the permalink stores the seed/tags/size, but not your manual edits.* |
| **Export** | PNG, SVG, or JSON export (see below). |

### Style window  (right-click → **Style**, or `S`)

Six tabs control every visual aspect of the map. Set these before exporting.

**Graphics**

- **Color scheme** — opens the full Color scheme dialog.
- **Thin lines** — render thinner strokes.
- **Tint districts** — apply soft, watercolor-style tints to districts.
- **Weathered roofs** — vary roof colors building to building.

**Elements**

- **Font size** — Small / Medium / Large.
- **Districts** — district-label mode: Hidden / Straight / Curved / Legend. *(Defaults to Curved.)*
- **Landmarks** — landmark display: Hidden / Icon / Legend. *(Defaults to Icon; Hidden flips to Icon automatically when you add a landmark.)*
- **Title** — show/hide the city name. *(On by default.)*
- **Scale bar** — show/hide the scale bar. *(Off by default.)*
- **Emblem** — show/hide the coat of arms (from the Armoria integration). *(Off by default.)*
- **Grid** — show/hide a grid overlay (also `D`). *(Off by default.)*
- **Compass** — show/hide the compass rose. *(Off by default.)* Right-click the compass itself for **Reroll / Reset / Hide**.

**Buildings**

- **Display mode** — Block / Lots / Complex / Hidden. This dramatically changes how buildings are drawn. *Lots* and *Complex* show individual buildings (and unlock **Open in Dwellings**); *Block* draws each ward as one solid mass; *Hidden* leaves buildings out entirely for street-map looks.
- **Processing** — None / Offset. How lots are processed after generation.
- **Roofs** — Plain / Hip / Gable. Roof rendering style.
- **Raised** — gives buildings a slight raised, 3D look.
- **Solids** — draws large buildings as solid blocks of wall color.

**Outline** — per-element outline toggles for Buildings, Solids, Water, Roads, Trees, and Fields, plus a **Toggle all** button.

**Text** — font selectors for Title, Labels, Legend, Pins, and Elements. Each opens a font dialog with face, size, bold, and italic controls.

**Misc**

- **Show alleys** — render alleys / minor roads (also `A`). *(Off by default. Alleys only appear in JSON export when this is on.)*
- **Show trees** — render city trees. *(Off by default.)*
- **Show forests** — render surrounding forests. *(Off by default; only available when *Show trees* is on.)*
- **Towers** — tower shape: Round / Square / Open.
- **Farm fields** — Furrows / Plain / Hidden.

### Color scheme dialog  (right-click → **Colors...**, or `C`)

Six built-in presets, selectable with keys `1`–`6`: **Default, Ink, Black & White, Vivid, Natural, Modern**.

**Colors tab** — ten color slots:

| Label | Controls |
|-------|----------|
| **Paper** | Background paper color |
| **Ink** | Linework / detail color |
| **Roofs** | Building roof color |
| **Water** | Water / river fill |
| **Greens** | Parks / green spaces |
| **Roads** | Road color |
| **Walls** | City wall color |
| **Trees** | Tree / forest color |
| **Labels** | Text / label color |
| **Elements** | Compass, scale bar, and similar elements |

**Tints tab**

- **Method** — Spectrum / Brightness / Overlay (the algorithm used to tint districts).
- **Strength (%)** — 0–100, how strong the district tint is.
- **Weathering (%)** — 0–100, how much roof colors vary.

The dialog also has **Load / Save / Preset** buttons so you can save a color scheme to a `.json` file and reuse it for a consistent look across many maps.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Enter` | New city (generate) |
| `G` or `Tab` | Toggle the Generate window |
| `T` | Toggle the Settlement window |
| `S` | Toggle the Style window |
| `C` | Open the Color scheme dialog |
| `W` | Open the Warp scene |
| `1` | Default color scheme |
| `2` | Ink color scheme |
| `3` | Black & White color scheme |
| `4` | Vivid color scheme |
| `5` | Natural color scheme |
| `6` | Modern color scheme |
| `A` | Toggle alleys |
| `B` | Cycle building display mode (`Shift+B` opens the Buildings style tab) |
| `D` | Toggle the grid |
| `E` | Open the Elements style tab |
| `L` | Cycle district-label mode (Curved → Legend → Hidden → Straight) |
| `N` | Toggle thin lines |
| `O` | Open the Outlines style tab |
| `Shift+click` | Enter District View on the clicked district |
| `Ctrl/Cmd+click` | Reroll the clicked ward's geometry |

---

## Export & sharing

Reach exports through right-click → **Export as ▸**, or the **Export** dropdown in the Settlement window.

| Format | Use it for |
|--------|------------|
| **PNG** | A ready-to-use raster image of the map — drop it straight into a VTT, document, or handout. |
| **SVG** | A scalable vector version that stays crisp at any zoom and can be edited in vector software. Prefer SVG when you need very high resolution. |
| **JSON** | A structured data file describing the city's features (roads, districts, buildings, etc.). For tools that import city data. |

### What JSON contains

JSON export includes more or less detail depending on your settings:

- **Alleys** are only included when **Show alleys** is on.
- **Trees** are only included when **Show trees** is on.
- **Forests** are only included when **Show forests** is on.
- District **descriptions** are included.
- In **District View**, JSON still exports the **whole city**, not just the focused district (only PNG/SVG honor the district view).

### Permalinks (Settlement → Permalink)

**Permalink** copies the city's URL to your clipboard so you can reopen the same generated city later or share it. Important caveat: a permalink encodes the **seed, tags, and size** — that is, the *generation parameters* — but it does **not** save your manual edits. Renamed districts, added landmarks, and POI locations are **not** stored in the URL. (The one manual change that does carry over is the city name.) For a reproducible record of an edited map, export JSON or save the image instead.

### Overworld export (Settlement → Overworld)

Sends the city's parameters over to **Azgaar's Fantasy Map Generator**, a handy bridge if you want to place your city into a larger world map.

---

## What's on by default

When a city first loads, the map shows the bare essentials and most overlays start switched **off**. Knowing this saves a lot of "where did my labels go?" confusion:

| Overlay | Default | Turn it on with |
|---------|---------|-----------------|
| **City title** | On | Style → Elements → Title |
| **District labels** | On (Curved) | Style → Elements → Districts, or `L` |
| **Landmark pins** | On (Icon) | Style → Elements → Landmarks |
| **Scale bar** | Off | Style → Elements → Scale bar |
| **Emblem** (coat of arms) | Off | Style → Elements → Emblem |
| **Grid** | Off | Style → Elements → Grid, or `D` |
| **Compass** | Off | Style → Elements → Compass |
| **Alleys** | Off | Style → Misc → Show alleys, or `A` |
| **Trees** | Off | Style → Misc → Show trees |
| **Forests** | Off | Style → Misc → Show forests (needs Trees on) |

These overlay choices are saved in your browser, so they persist between sessions.

---

## Recommended settings for Foundry import (Cartomancer)

A city map is an overview/handout, not a tactical grid, so Cartomancer imports it differently from the battlemap generators.

**What Cartomancer sets automatically**
- A **gridless** scene (no square grid overlaid on the city), **fully revealed** — fog-of-war and token-vision are turned **off** so the whole city is visible as a handout.

**Set these in the generator before *Import Scene***
- Frame the **whole city** in view at a good zoom before importing — Cartomancer captures at high resolution, but what's framed is what's captured.
- **Style → Elements**: keep **Scale bar**, **Compass**, and **Grid** (`D`) **off** (they're off by default) so nothing overlays the handout. Keep **Title** on or off to taste.
- Pick a **Color scheme** (`1`–`6`) you like; **Buildings ▸ Display mode → Lots** or **Complex** gives the most detailed, handout-quality city.
- If you want the sharpest possible result, export **SVG** from the generator and rasterize it large, then use that image — see [Export & sharing](#export--sharing).

---

## Tips & tricks

- **Press `Enter` to reroll the whole city.** It is the fastest way to spin through options until something catches your eye.
- **Fix one bad block instead of rerolling everything.** If a single ward looks empty or wrong, `Ctrl/Cmd+click` it (or right-click → **Reroll geometry**) to regenerate just that ward.
- **Style first, export second.** All visual choices — color scheme, display mode, outlines, labels, alleys/trees/forests — should be set before you export, since they bake into the PNG/SVG.
- **Save a color scheme for campaign consistency.** Use **Colors... → Save** to keep a `.json` palette and reload it on every city so your whole world shares one look.
- **Want a street-level look?** Set **Buildings → Display mode** to *Lots* or *Complex* and turn on **Show alleys** (`A`). This also unlocks **Open in Dwellings** so you can generate floor plans for individual buildings.
- **Use District View for close-ups.** `Shift+click` a district to zoom in, then export PNG/SVG for a district-scale map — just remember JSON still dumps the whole city.
- **Permalinks aren't a save button.** They reproduce the generated city, not your hand edits. If you've renamed districts, added landmarks, or placed POIs, keep the image/JSON — those edits won't survive a permalink round-trip.
- **Need maximum resolution?** Reach for **SVG**. It scales infinitely and avoids any raster-size limits (this is especially worth doing for forest-heavy maps, where raster output can come out lower-resolution).
- **Don't treat the scale as exact.** MFCG's dimensions are stylized, not surveyed — great for atmosphere, not for literal real-world measurements.
- **Grid overlay vs. your VTT grid.** You can bake in a grid with `D`, but if you import the map into a VTT that draws its own grid, the two may not line up — usually best to leave MFCG's grid off and let the VTT handle alignment.
