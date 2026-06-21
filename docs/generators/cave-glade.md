# Cave / Glade Generator — Community Usage Guide

The **Cave / Glade Generator** is a free, browser-based map maker that produces
procedural cave systems and forest glades. It started life as a cave generator
(a natural-location cousin to the One Page Dungeon Generator), and it turned out
the same underlying map could also be rendered as a cluster of connected forest
clearings — hence the dual "Cave / Glade" identity. It's great for tabletop GMs
who need a quick, good-looking natural battlemap or location, and for anyone who
just enjoys generating maps.

- **Live generator:** <https://watabou.github.io/cave-generator/>
- **Info page:** <https://watabou.github.io/cave.html>

Made by **Oleg Dolya (Watabou)**.

---

## Getting started

When you open the generator you get a single full-screen **canvas** with a map
already drawn on it. There's no toolbar — almost everything is driven from a
menu you open yourself.

- **Generate a new map:** press `Enter`, or open the menu and choose **New map**.
  Each press makes a fresh, different cave/glade.
- **Pan:** click-and-drag (or drag with one finger on touch).
- **Zoom:** mouse wheel, or pinch on touch.
- **Open the controls:**
  - On **desktop**, the main control surface is the **right-click menu**. Right-click anywhere on the canvas to open it.
  - On **touch devices**, use a **long-press** on the canvas (or the on-screen menu button) to bring up the same menu.

The core idea: generate a map, then refine it. You tweak its size, shape, water,
entrances and grid through the menu (or keyboard shortcuts), and flip the whole
thing between a dark **Cave** look and a leafy **Glade** look. When you like it,
export it as an image.

---

## The right-click menu

This is the heart of the generator. Right-click (desktop) or long-press (touch)
to open it. The menu looks like this:

```
Rename...
Reroll
──────────────
Procgen Arcana
──────────────
New map
Rotate...
Tags...
──────────────
Grid          ▸
Shape         ▸
Display       ▸   (Glade mode only)
Style...          (Glade mode only)
──────────────
Export as     ▸
```

The **Display** submenu and the **Style...** item only appear when you're in
**Glade mode** (toggle modes with the `F` key — see [Cave vs. Glade mode](#cave-vs-glade-mode)).
Everything else is always available.

### Top-level items

| Item | What it does |
|------|--------------|
| **Rename...** | Opens a dialog to type a custom name for the cave/glade. The name is shown as the map's title (show or hide the title with the `T` key). Use it when you want a labelled, named location instead of the auto-generated name. |
| **Reroll** | Generates a new random *name* only — the map geometry stays exactly the same. Handy when you like the map but not the name it was given. |
| **Procgen Arcana** | Leaves the generator and returns to Watabou's Procgen Arcana homepage (the hub for all his generators). |
| **New map** | Generates a completely fresh cave/glade from scratch. Same as pressing `Enter`. |
| **Rotate...** | Opens a dialog to rotate the whole map. Useful for fitting the layout to a particular page or screen orientation before exporting. (Keyboard: `R`.) |
| **Tags...** | Opens the **Tags / Parameters** dialog — the main way to steer what kind of map you get (size, layout, entrances, water). Covered in detail in [Settings & parameters](#settings--parameters). (Keyboard: `Tab`.) |

### Grid submenu

Controls the grid overlay drawn on the map. Pick one of the three styles, or
open the customisation dialog.

| Item | What it does |
|------|--------------|
| **Square** | Overlays a square grid — the usual choice for grid-based tabletop play. |
| **Hexagonal** | Overlays a hexagonal grid. |
| **Hidden** | Turns the grid off entirely (clean, gridless map). |
| **Customize...** | Opens a grid-styling dialog for the grid's **line colour** and **stroke width**. This option is available when the **Square** grid is the active style. |

Tip: the `G` key cycles the grid through Square → Hexagonal → Hidden, so you
don't have to open the menu to switch. With a Square grid active, `Shift` + `G`
jumps straight to the **Customize...** dialog.

### Shape submenu

Controls the *physical form* of the cave walls — how rough, distorted and
flooded they are, and whether tunnels are narrow.

| Item | What it does |
|------|--------------|
| **Narrow tunnels** | A toggle. When on, the passages connecting chambers are drawn thin and tunnel-like; when off, they're wider and more open. (Keyboard: `N`.) |
| **Geometry...** | Opens the **wall geometry** dialog (see below). |
| **Water...** | Opens the **water level** dialog (see below). |

#### Geometry dialog

Three controls that shape how natural and irregular the walls look:

| Control | What it does |
|---------|--------------|
| **Distortion** | How irregular and warped the overall cave outline is. Low = smoother, more rounded chambers; high = more jagged, unpredictable shapes. |
| **Bumpiness** | How bumpy versus "even" the wall surface is along its edges. |
| **Roughness** | The fine surface roughness of the walls — smooth versus rough/craggy. |

Each also has a keyboard shortcut that flips it between off and on:

- `W` — toggle overall geometry (turns distortion, bumpiness and roughness all on or all off at once).
- `E` — toggle evenness/bumpiness.
- `M` — toggle smooth versus rough walls (roughness).

#### Water dialog

Opens a form that sets how much of the cave floor is flooded. Raise the level to
turn the map into a partly- or mostly-submerged cavern; lower it for a dry cave.

- Keyboard: `]` raises the water level, `[` lowers it.
- Water can also be set through the `dry` / `wet` / `flooded` tags (see [Tags](#tags--parameters)).

### Display submenu (Glade mode only)

This submenu **only appears in Glade mode** — it's hidden while you're in Cave
mode. It collects Glade-specific visual toggles for how the forest/clearing is
drawn (things like foliage and tree styling). Switch to Glade mode with `F` to
reveal it.

> Note: the exact toggles inside **Display** are Glade-only and can vary between
> versions of the generator. Switch `F` on and open the submenu to see what your
> build offers.

### Style... (Glade mode only)

Also Glade-only. Opens a **Style** dialog for the glade's overall look —
primarily its **colour palette**. The generator ships with several built-in
style presets you can load with the number keys `1`–`5` (for example a default
look, an ink/line look, and a more vivid colour look). (Keyboard: `S` opens the
Style dialog while in Glade mode.) Cave mode uses a fixed dark cave styling and
does not expose palette presets.

### Export as submenu

| Item | What it does |
|------|--------------|
| **PNG** | Saves the map as a raster image (see [Export & sharing](#export--sharing)). |
| **SVG** | Saves the map as scalable vector graphics. |

### Cave vs. Glade mode

Not a menu item, but the single biggest visual switch: press `F` to flip the map
between the two render styles.

- **Cave mode** (default): dark background, solid rock walls — reads as an
  underground cavern.
- **Glade mode**: lighter background with tree/forest edges — the same map reads
  as a set of forest clearings. Switching to Glade mode also unlocks the
  **Display** submenu and **Style...** dialog described above.

The underlying map geometry is identical in both modes; only the rendering
changes, so you can design once and present it either way.

---

## Settings & parameters

### Tags / Parameters

Open with **Tags...** in the menu or the `Tab` key. Tags are short keywords that
bias the generator toward a particular kind of map. Each tag has a built-in
description in the dialog — `Shift`-click a tag to read what it does. There are
four groups:

**Size**

| Tag | Effect |
|-----|--------|
| `small` | Single cave or a small cave system |
| `medium` | Medium-sized cave system |
| `large` | Large cave system |
| `huge` | Huge cave system |

**Layout / topology**

| Tag | Effect |
|-----|--------|
| `burrows` | Lots of tunnels |
| `cavities` | Round-ish, compact caves |
| `chambers` | Several caverns of similar size with few tunnels |
| `chaotic` | Irregular caves with column-like features |
| `coral` | Coral-like branching caves |
| `hub` | One central cavern with several smaller ones around it |
| `string` | A sequence of areas with no branching |
| `tree` | A topological tree — branches but no loops |
| `varied` | Caves of very different shapes |
| `connected` | Lots of loops, including short ones |
| `tight` | Caves spawned close together, with little space between them |

**Entrances**

| Tag | Effect |
|-----|--------|
| `sealed` | No entrances |
| `entrance` | A single entrance |
| `passage` | Two entrances |
| `junction` | Many entrances |
| `road` | A road connecting one entrance to another |

**Water**

| Tag | Effect |
|-----|--------|
| `dry` | No water |
| `wet` | Some water |
| `flooded` | Most of the floor covered with water |

Combine tags freely — e.g. `large hub flooded junction` for a big central
flooded cavern with many ways in. Tags travel in the page URL, so a map's tags
are part of its shareable address (see [Permalinks](#permalinks--saving-a-map)).

### Style / palette options

In **Glade mode** the map's colours come from a **palette/style preset**. Load
presets with the number keys `1`–`5`, or open the **Style...** dialog from the
menu. Cave mode uses the fixed dark cave styling and doesn't expose palette
presets.

### What changes the output, at a glance

| Setting | Where | Effect |
|---------|-------|--------|
| Size / layout / entrances / water | Tags dialog (`Tab`) | The kind, scale and connectivity of the map |
| Distortion / bumpiness / roughness | Shape → Geometry | How natural/irregular the walls look |
| Water level | Shape → Water (`[` / `]`) | How much floor is flooded |
| Narrow tunnels | Shape → Narrow tunnels (`N`) | Thin versus wide passages |
| Grid type & styling | Grid submenu (`G`, `Shift`+`G`) | Square / hex / none, plus line colour & width |
| Cave versus Glade | `F` | Dark cavern look versus forest-clearing look |
| Glade palette | Style... / `1`–`5` (Glade only) | Colour scheme of the glade |
| Rotation | Rotate... (`R`) | Orientation of the whole map |

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Generate a new map |
| `Tab` | Open the Tags / Parameters dialog |
| `F` | Toggle Cave ↔ Glade mode |
| `G` | Cycle grid: Square → Hexagonal → Hidden |
| `Shift` + `G` | Open the grid Customize dialog (Square grid only) |
| `W` | Toggle wall geometry (distortion + bumpiness + roughness on/off) |
| `E` | Toggle even / bumpy walls |
| `M` | Toggle smooth / rough walls |
| `N` | Toggle narrow tunnels |
| `[` | Lower the water level |
| `]` | Raise the water level |
| `R` | Open the Rotate dialog |
| `S` | Open the Style dialog (Glade mode only) |
| `T` | Show / hide the map title |
| `1`–`5` | Load a style / palette preset (Glade mode only) |

---

## Export & sharing

### Image export

Use **Export as ▸** in the menu and pick a format:

| Format | Best for |
|--------|----------|
| **PNG** | A ready-to-use raster image — drop it straight into a VTT, slides, or a document. The export frames the map with roughly 20% padding around its extent and renders at a high resolution, so it stays crisp when zoomed. |
| **SVG** | A vector file — ideal if you want to scale the map to any size without quality loss, or edit it afterwards in vector software (Inkscape, Illustrator, Affinity Designer). |

> Note: as of the current version there is **no JSON / structured data export** —
> the generator outputs images only.

### Permalinks & saving a map

The map's configuration — including its tags — lives in the **page URL**, and
the generator can produce a **permalink** for any map. Copy the address from
your browser's bar (or use the permalink) to save or share a specific map;
opening that URL reproduces the same setup. This is the simplest way to bookmark
a map you like or send it to a co-GM, since there's no built-in save slot.

---

## Tips & tricks

- **Learn the toggles, skip the menu.** `Enter` for a new map, `Tab` for tags,
  `F` to flip Cave/Glade, `G` for the grid, `[` / `]` for water — these cover
  most of your workflow without ever opening the right-click menu.
- **Design in one mode, present in the other.** Because Cave and Glade share the
  same geometry, you can lay out a location as a cave, then hit `F` to see if it
  works better as a forest glade (or vice-versa) before exporting.
- **Read what a tag does before you commit.** In the Tags dialog, `Shift`-click
  a tag to see its built-in description, then stack several together — combine
  size, layout, entrance and water tags to dial in exactly the location you
  want, and mash `Enter` to roll variations within those constraints.
- **Reroll the name, keep the map.** If the geometry is perfect but the name is
  off, use **Reroll** (name only) instead of **New map** (which regenerates
  everything).
- **Set the grid before you export** so the grid lines render at the right colour
  and weight for your table or VTT. Use **Grid → Customize...** (or `Shift` + `G`
  with a Square grid) to match your background.
- **Export SVG for flexibility, PNG for convenience.** If you might resize or
  recolour the map later, take the SVG; if you just need it on the table now,
  PNG is faster to drop in.
- **Use the URL as your save file.** There's no save slot — instead, bookmark or
  copy the permalink of any map you want to keep, since it encodes the tags and
  setup.
- **Hide the grid for handouts.** Set the grid to **Hidden** and toggle the title
  off with `T` for a clean, gridless illustration suitable for player handouts.
