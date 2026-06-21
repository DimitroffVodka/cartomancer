# One Page Dungeon Generator (1PDG) — Community Usage Guide

The **One Page Dungeon Generator** (1PDG) is a free, browser-based tool that
builds a complete dungeon map with a single click: rooms, corridors, doors,
stairs, water, secret rooms, decorative props, and short descriptive notes — all
laid out on a single page in the classic "one-page dungeon" style. It's aimed at
tabletop GMs and worldbuilders who want a ready-to-use dungeon in seconds, with
plenty of knobs to tweak the look and the layout when you want them. Everything
runs locally in your browser; nothing is uploaded.

- **Live generator:** <https://watabou.github.io/one-page-dungeon/>
- **itch.io page:** <https://watabou.itch.io/one-page-dungeon>

Created by **Oleg Dolya (Watabou)**.

---

## Getting started

When you open the page you get a single dungeon already generated on the canvas.
That's the core idea: **one button = one finished dungeon.** You don't have to
place anything by hand — you generate, then nudge the result with settings until
you like it.

**The canvas**

- The dungeon fills the screen and, by default, auto-rotates and auto-zooms to
  fit your viewport (see *Rotate-to-fit* and *Zoom-to-fit* in the View menu).
- **Pan:** click-drag (or drag with one finger on touch).
- **Zoom:** mouse wheel, or pinch on touch.
- **Generate a new dungeon:** press `Enter`, or open the menu and choose
  **New dungeon**.

**Where the controls live**

There is no permanent toolbar covered in buttons. Almost everything happens
through one menu:

- **On desktop:** **right-click** anywhere on the canvas, or click the **Menu**
  button in the top-right corner. The menu is built fresh each time you open it,
  so it always reflects the current state — active toggles show as checked.
- **On touch devices:** **long-press** the canvas, or tap the **menu button**.

Because that menu is the heart of the tool, it gets its own full reference next —
it's the centerpiece of this guide.

---

## The right-click menu (the main control surface)

Right-click (or the Menu button) is where you do *almost everything* in 1PDG:
generate, reframe, restyle, retag, and export. There's no separate settings
screen — this menu, plus the two dialogs it opens (**Tags** and **Style**), is
the entire control surface. Learn this menu and you've learned the tool.

The top-level menu looks like this:

```
Procgen Arcana            ← return to the Procgen Arcana homepage
──────────────────────────
New dungeon               ← generate a fresh dungeon
Tags...                   ← open the Tags / parameters dialog
──────────────────────────
View ▸                    ← submenu
Notes ▸                   ← submenu
Layers ▸                  ← submenu (grid, water, props, shadow, exits…)
Monochrome                ← toggle black & white rendering
Style...                  ← open the Style dialog
──────────────────────────
Save as PNG               ← quick-save a PNG to disk
Export as ▸               ← submenu: PNG, SVG, JSON, VOX, Markdown
```

### Top-level items

| Item | What it does |
|------|--------------|
| **Procgen Arcana** | Takes you back to the Procgen Arcana hub page (the collection of Watabou's generators). Use it to switch tools. |
| **New dungeon** | Generates a brand-new random dungeon, respecting whatever tags and style you currently have set. Same as pressing `Enter`. |
| **Tags...** | Opens the Tags dialog, where you control the *layout and content* of the dungeon (size, shape, water, theme, secrets, and so on). Keyboard: `Tab` or `T`. Covered in [Settings & parameters](#settings--parameters). |
| **Monochrome** | Toggles pure black-and-white rendering. When on, all color is dropped and the map draws as black ink on white. Great for printing or a stark hand-drawn look. Keyboard: `M`. |
| **Style...** | Opens the Style dialog, where you control the *appearance* (colors, line weights, hatching, fonts, shadow). Keyboard: `S`. Covered in [Settings & parameters](#settings--parameters). |
| **Save as PNG** | Immediately saves the current map as a PNG image, no dialog. Keyboard: `E`. For a PNG with a custom resolution, use **Export as ▸ PNG...** instead. |

### View ▸ submenu

Controls how the map is framed on screen. These are display-only toggles — they
don't change the dungeon itself.

| Item | What it does | Default |
|------|--------------|---------|
| **Rotate-to-fit** | Automatically rotates the dungeon to the angle that best fills your viewport. Turn it off if you want the map kept at its natural orientation. Keyboard: `R`. | On |
| **Zoom-to-fit** | Automatically zooms so the dungeon fills the width of the viewport. Turn it off to keep your own manual zoom level. | On |
| **Full screen** | Toggles browser fullscreen mode for a distraction-free view. | Off |
| **Secret rooms** | Shows or hides secret rooms on the map. With it on you (the GM) can see the hidden rooms and their secret doors; turn it off to preview what players would see. Keyboard: `H`. | On |

### Notes ▸ submenu

Controls the room descriptions — the little blurbs the generator writes for each
room — and how they're drawn on the page.

**Actions** (top of the submenu):

| Item | What it does |
|------|--------------|
| **Reroll notes** | Regenerates the *text* of the room descriptions while keeping the same map. Use it when you like the layout but want different room flavor. Hidden in the Symbols / Numbers / Off note modes (which have no text). Keyboard: `Shift+Space`. |
| **Rearrange notes** | Re-randomizes where the note blocks sit on the page (their positions and connecting lines), without changing the text. Only available in the Default and Tailed modes. Keyboard: `Space`. |

**Note display modes** (pick one):

| Mode | What you get |
|------|--------------|
| **Off** | No notes shown at all — just the map. |
| **Default** | Room descriptions as text blocks, connected to their rooms by lines. *(This is the default mode.)* |
| **Tailed** | Note blocks with thin "tail" lines pointing to each room. |
| **Legend** | Notes collected into a sidebar legend instead of floating on the map. Keyboard: `L`. |
| **Symbols** | Rooms marked with little symbols indicating their type, no text. |
| **Numbers** | Rooms shown as numbered circles (keyed-list style), no inline text. |

Tip: `N` toggles notes on and off.

### Layers ▸ submenu

Turns individual visual layers on and off, and houses the grid and water-level
controls. These mostly affect what's *drawn*, not the dungeon's structure.

**Grid ▸** (sub-submenu) — choose the grid line style:

| Item | What it does | Default |
|------|--------------|---------|
| **Off** | No grid. | — |
| **Dotted** | Grid drawn with dotted lines. | ✓ default |
| **Dashed** | Grid drawn with dashed lines. | |
| **Solid** | Grid drawn with solid lines. | |
| **Broken** | Grid drawn with broken / interrupted lines for a sketchier look. | |
| **Small tiles** | Doubles the grid density (half-size cells, two per normal cell). Useful for finer alignment. Keyboard: `Shift+G`. | Off |

Tip: `G` toggles the grid on and off.

**Other Layers items:**

| Item | What it does | Default |
|------|--------------|---------|
| **Title & story** | Shows or hides the dungeon's title and the short story / intro text block. | On |
| **Water** | Shows or hides the water / flooding overlay. Keyboard: `W`. | On |
| **Props** | Shows or hides decorative props — cracks, rubble, coffins, altars, wells, tapestries, dead bodies, and so on. Keyboard: `P`. | On |
| **Shadow** | Shows or hides the soft drop shadow drawn under the dungeon. | On |
| **Exits** | Shows or hides the markers for open exits that lead off the edge of the map. | On |
| **Water level...** | Opens a slider to adjust how flooded the dungeon is. See below. | — |

#### Water level dialog

A slider running from **0.0** (no water) to **1.0** (heavily flooded), defaulting
to about **0.1**. Higher values flood more rooms and corridors. The `wet`, `dry`,
and `flooded` tags also influence the water level, so this slider and those tags
work together. Keyboard: `Shift+W` raises the water level.

### Save as PNG / Export as ▸

The bottom block handles getting your dungeon out of the browser. **Save as
PNG** is the quick one-click option. **Export as ▸** opens a submenu with every
format (PNG, SVG, JSON, VOX, Markdown) — see the full
[Export & sharing](#export--sharing) section.

---

## Settings & parameters

Two dialogs do the heavy lifting: **Tags** (what the dungeon *is*) and **Style**
(how it *looks*). Both are opened from the right-click menu.

### Tags (layout & content parameters)

Open with **Tags...** in the menu, or press `Tab` (also `T`). Tags are simple
keywords that bias generation. Many come in opposing pairs, and the dialog
automatically resolves conflicts — turning on one tag clears the tag it conflicts
with. **Shift-click a tag in the dialog to read its built-in description.** There
are 26 public tags.

Tags apply to the *next* dungeon you generate, so set them, then press `Enter` or
choose **New dungeon**.

**Layout / shape**

| Tag | Effect | Conflicts with |
|-----|--------|----------------|
| `chaotic` | No symmetry — irregular layouts. | `ordered` |
| `ordered` | More symmetry and regularity. | `chaotic` |
| `winding` | More corridors connecting rooms. | `compact` |
| `compact` | No corridors; rooms connect directly. | `winding` |
| `cramped` | Smaller rooms. | `spacious` |
| `spacious` | More large rooms. | `cramped` |
| `string` | A sequence of rooms with little or no branching. (Renamed `linear` in newer builds — both names refer to the same layout.) | — |
| `round` | More round rooms. | `square` |
| `square` | No round rooms. | `round` |
| `colonnades` | More pillared corridors / colonnades. | — |

**Size**

| Tag | Effect |
|-----|--------|
| `large` | Larger dungeon. |
| `medium` | Normal-sized dungeon. |
| `small` | Smaller dungeon. |

**Depth / verticality**

| Tag | Effect | Conflicts with |
|-----|--------|----------------|
| `flat` | No steps / level changes. | `deep` |
| `deep` | Many steps. | `flat` |
| `multi-level` | Adds stairs down at the last room (sets up a connected lower level). | `single-level` |
| `single-level` | Strictly no stairs down. | `multi-level` |

**Secrets**

| Tag | Effect | Conflicts with |
|-----|--------|----------------|
| `secret` | More secret rooms. | `no secrets` |
| `no secrets` | No secret rooms. | `secret` |

**Danger / content**

| Tag | Effect |
|-----|--------|
| `treasure` | More valuable or exotic loot. |
| `dangerous` | More dead bodies. |

**Water**

| Tag | Effect | Conflicts with |
|-----|--------|----------------|
| `wet` | Some water. | `dry` |
| `dry` | No water. | `wet` |
| `flooded` | Lots of water. | — |

**Theme / flavor**

| Tag | Effect |
|-----|--------|
| `temple` | Adds some altars. |
| `tomb` | Adds coffins, fewer fountains. |
| `dwelling` | A throne in the last room, more wells and tapestries. |
| `crumbling` | More cracks and rubble. |

**Entrance**

| Tag | Effect | Conflicts with |
|-----|--------|----------------|
| `backdoor` | Adds an alternative (rear) entrance. | `no backdoor` |
| `no backdoor` | No alternative entrance. | `backdoor` |

### Style (appearance)

Open with **Style...** in the menu, or press `S`. There are five built-in
presets, switchable with keys `1`–`5`: **Default**, **Ancient**, **Light**,
**Modern**, and **Link**. Beyond the presets, the dialog is organized into tabs.

**Colors**

| Setting | Controls |
|---------|----------|
| **Ink** | The linework / detail color. |
| **Shading** | The hatching / shadow color. |
| **Water** | The water / flood fill color. |
| **Floor** | The floor background color. |
| **Paper** | The page / paper background color. |

**Strokes** (line weights; thin/hatching/normal run roughly 0.1–4, thick up to 6)

| Setting | Controls |
|---------|----------|
| **Thin** | Weight of thin strokes. |
| **Hatching** | Weight of the hatching lines. |
| **Normal** | Weight of normal strokes. |
| **Thick** | Weight of thick strokes (walls). |

**Shadow**

| Setting | Controls |
|---------|----------|
| **Color** | Shadow color. |
| **Distance** | Shadow offset / distance (about 0.1–0.5). |

**Hatching** — controls the signature cross-hatch shading (based on Dyson-style
hatching, the look of classic hand-drawn dungeon maps):

| Setting | Values | Default |
|---------|--------|---------|
| **Style** | Default, Stonework, Bricks, Dots, None | Default |
| **Strokes** | 2–5 strokes per hatch | 3 |
| **Size** | Size of the hatch clusters | ~0.33 |
| **Distance** | Spacing between hatch clusters | — |

**Text** — each font opens its own dialog with typeface, size, bold, and italic:

| Setting | Controls |
|---------|----------|
| **Title** | The dungeon title font. |
| **Story** | The intro / story text font. |
| **Notes** | The room description font. |
| **Legend** | The legend / room-number font. |

### URL parameters

The generator reads parameters from the page URL, which is what makes
permalinks and reproducible dungeons possible:

- The page encodes the current **seed** in the URL, so copying the address bar
  gives you a link that reproduces *that exact dungeon*. (Use the
  `watabou.github.io` build for reliable seed support.)
- An `export=` parameter exists for URL-driven export workflows.

If you just want to share a specific dungeon, the simplest approach is to copy
the URL after generating one (see Export & sharing).

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Tab` or `T` | Open the Tags dialog |
| `Enter` | New dungeon (random) |
| `Space` | Rearrange notes (re-randomize note positions) |
| `Shift+Space` | Reroll notes (new description text) |
| `1` | Default style — `Shift+1`: grid scale 1 |
| `2` | Ancient style — `Shift+2`: grid scale 2 |
| `3` | Light style |
| `4` | Modern style |
| `5` | Link style |
| `E` | Save as PNG — `Shift+E`: export PNG with the cell-size dialog |
| `G` | Toggle grid — `Shift+G`: small tiles |
| `H` | Toggle secret rooms |
| `J` | Export JSON |
| `L` | Toggle legend |
| `M` | Toggle monochrome (black & white) |
| `N` | Toggle notes |
| `P` | Toggle props |
| `R` | Toggle rotate-to-fit |
| `S` | Open the Style dialog |
| `W` | Toggle water — `Shift+W`: raise water level |

---

## Export & sharing

Get to these through **Save as PNG** (quick) or **Export as ▸** in the
right-click menu.

| Format | What it is / how to use it |
|--------|----------------------------|
| **PNG...** | Opens an "Export as PNG" dialog where you set **Cell size in pixels** (10–200, in steps of 3, default 70). Larger cell sizes mean a higher-resolution image. This is the export to use when you want the map's grid to line up with a virtual tabletop grid. |
| **Save as PNG** | One-click PNG at the default resolution, no dialog. Keyboard `E`. |
| **SVG** | Vector export — scales to any size without blurring. Good for printing large or editing in vector software. |
| **JSON** | Structured data describing the dungeon (rooms, doors, stairs, water, descriptions). Used by tools that import 1PDG dungeons. Keyboard `J`. |
| **VOX** | A 3D voxel model in MagicaVoxel format, if you want to view or build the dungeon in 3D. |
| **Markdown** | A clean, human-readable write-up of the dungeon — room numbers, descriptions, connections, stairs, and water notes. Ideal to paste into notes, a wiki, or a campaign journal. |

**Permalinks & seeds.** After generating a dungeon you like, copy the browser's
URL — it carries the seed, so anyone opening that link gets the same dungeon.
This is the easiest way to share or re-open a specific map. Use the
`watabou.github.io` version for dependable seed support.

**Persistent settings.** Your chosen style and tags are remembered between
sessions (stored locally in your browser), so the next dungeon you generate keeps
the look and parameters you set last time.

---

## Tips & tricks

- **Generate first, tweak second.** Hit `Enter` repeatedly until you get a base
  layout you like, *then* open Tags and Style to refine it. Most tags only take
  effect on the next generated dungeon.
- **Tags shape the dungeon; Style shapes the drawing.** If you want different
  rooms, use Tags. If you want a different look, use Style. They're independent.
- **Save the dungeon, not just the picture.** The URL preserves the exact
  dungeon via its seed — bookmark or copy it before you move on, because a new
  generation overwrites the current one.
- **Match a VTT grid with PNG cell size.** Use **Export as ▸ PNG...** and set the
  cell size to your virtual tabletop's pixel-per-cell value so the map's grid
  aligns out of the box.
- **Clean battle-map exports.** Turn off **Title & story**, **Props**, and
  **Notes** (or use `Shift+E`) when you want a bare map with no descriptive
  clutter overlaid.
- **Preview the player's view.** Toggle **Secret rooms** off (`H`) to see what
  players would see without the hidden areas revealed.
- **Like the map, not the flavor?** Use **Reroll notes** to get fresh room
  descriptions without disturbing the layout. Use **Rearrange notes** if the note
  blocks overlap awkwardly.
- **Reach for the keyboard.** The single-key shortcuts (`G`, `W`, `P`, `N`, `H`,
  `M`, `R`, `1`–`5`) are far faster than reopening the menu for repeated toggles.
- **Monochrome for printing.** `M` gives crisp black-on-white output that prints
  cleanly and photocopies well.
- **Water is two controls.** The water tags (`wet` / `dry` / `flooded`) set a
  baseline, and the **Water level...** slider fine-tunes it — use both together
  if the default flooding isn't what you want.
