# Village Generator — Community Usage Guide

The **Village Generator** is a free, browser-based tool that creates procedural fantasy village maps — complete with buildings, roads, farm fields, orchards, trees, ponds and rivers, palisades, terrain relief, and a named title plate. It's perfect for tabletop GMs who need a believable hamlet, village, or small town on short notice, as well as worldbuilders, writers, and anyone who just enjoys generating maps. Everything runs in your browser; nothing is installed.

- **Live generator:** https://watabou.github.io/village-generator/
- Created by **Oleg Dolya (Watabou)**, part of the **Procgen Arcana** family of generators.

---

## Getting started

When you open the link you land on a single canvas showing a freshly generated village. The whole tool is built around this one map view — there's no traditional toolbar of buttons. Instead, almost everything you do is driven from a **context menu**.

- **Desktop:** **right-click** anywhere on the map to open the menu. This is your main control surface.
- **Touch devices (phone/tablet):** use a **long-press** on the map, or the on-screen **menu button**, to open the same menu.

Core actions:

| What you want | How to do it |
|---------------|--------------|
| Generate a brand-new village | Right-click → **New village**, or **double-click** / **Shift+click** on the map |
| Reroll the current village (same settings) | Press **Enter**, or right-click → **Reroll village** |
| Pan around | Click-and-drag the map |
| Zoom | Scroll wheel (or pinch on touch) |

The core idea is simple: generate a map, then nudge it toward what you want by rerolling, changing **tags/parameters**, swapping the **style/palette**, and toggling **layers** on or off. When you like the result, **export** it.

---

## The right-click menu

This is the heart of the generator and the part that's hardest to discover, so it's documented in full below. The menu is **context-sensitive**: you get extra options when you right-click directly on a **building** versus right-clicking empty map background.

### Main menu (right-click on map background)

| Item | What it does | When to use it |
|------|-------------|----------------|
| **Procgen Arcana** | Returns to the Procgen Arcana homepage (Watabou's hub of generators). | When you want to jump to another generator. |
| **New village** | Generates a completely fresh village from scratch (new seed). | Starting over; you don't like the current one. |
| **Reroll village** | Regenerates the village keeping your current parameters/tags. | You like the settings but want a different layout. |
| **Rename village...** | Opens a dialog to type a custom name for the village. | Replacing the random name with your own. |
| **Parameters...** | Opens the **Tags / Parameters** dialog (also via `Tab`). | Controlling size, water, roads, palisade, etc. |
| **Layers ▸** | Submenu to show/hide individual map layers (see below). | Cleaning up the map or toggling features. |
| **Style settings...** | Opens the **Style settings** dialog (also via `C`). | Changing colors, palette presets, line styles. |
| **Export as ▸** | Submenu: **PNG / SVG / JSON** (see Export section). | Saving the map out of the browser. |

### Building menu (right-click on a building)

When you right-click directly on a building, these extra items appear **at the top** of the menu, above the standard items listed above:

| Item | What it does | When to use it |
|------|-------------|----------------|
| **Open in Dwellings** | Opens that specific building in Watabou's **Dwellings** generator to produce an interior floorplan. | When you need the inside of a particular house or shop. |
| **Mark / Unmark** | Marks (or unmarks) this single house as a **numbered house** — it gets an index number drawn on the map. | Calling out a keyed location for a map legend. |
| **Mark all / Unmark all** | Marks (or unmarks) **every** building at once. | Numbering the whole village, or clearing all numbers. |

Numbered houses display their index number directly on the map, which makes it easy to write a matching numbered key ("1 — the inn, 2 — the smithy…").

### Layers submenu

Each entry toggles a part of the map on or off. All toggles are **on by default** unless noted. Hiding layers is useful both for a cleaner look and for producing variant images (for example, hide buildings to get a pure wilderness/terrain map).

| Layer | What it controls | Default |
|-------|------------------|---------|
| **Relief** | Terrain relief / hill shading. | On |
| **Fields** | Farm fields around the village. | On |
| **Shading** | General ground shading. | On |
| **Orchards** | Orchard trees (distinct from wild trees). | On |
| **Shadows** | Drop shadows under buildings and trees. | On |
| **Buildings** | The buildings themselves. | On |
| **Roads** | The road network. | On |
| **Driveways** | Short paths from roads to buildings. Disabled (greyed out) when **Buildings** are hidden. | On |
| **Title** | The village name plate. | On |
| **Spotlight...** | Opens the **Dramatic light** dialog (see below). | — |
| **Trees ▸** | Tree submenu (see below). | — |

### Trees submenu

Controls tree density and rendering. The top group sets how many trees appear; the lower entries reroll and restyle them.

| Item | What it does |
|------|-------------|
| **None** | No wild trees. |
| **Some** | Sparse trees scattered around the village. |
| **Many** | Dense tree cover. |
| **Reroll** | Regenerates just the tree placement (a separate tree seed), leaving the rest of the village untouched. |
| **Shading** | Toggles shading on the trees. |

Because trees have their own seed, you can keep a layout you like and reroll only the foliage. The chosen density is remembered, and rerolling trees updates the page URL so the exact foliage is captured in the permalink.

### Rename village dialog

Reached via **Rename village...**. A simple text field where you replace the auto-generated name. The new name shows on the title plate (if the Title layer is on) and is carried into exports.

### Spotlight / Dramatic light dialog

Reached via **Layers → Spotlight...** (or `Shift+L`; plain `L` toggles the effect on/off). This adds a cinematic lighting overlay to the map. It offers three position modes:

- **Center** — a radial glow from the middle of the map.
- **Heart** — light weighted toward the village center.
- **Sun** — directional light coming from one side.

Typical controls in the dialog include: **Position** (the mode above), **Size**, **Light color**, **Intensity**, **Saturation**, a matching set for the **Shadow** (color / intensity / saturation), and an **Enable** checkbox. Use it for atmospheric "dusk / lantern-lit" renders.

---

## Settings & parameters

Two dialogs change the output: **Parameters (tags)** and **Style settings**.

### Tags / Parameters

Open with **Parameters...** or the `Tab` key. Villages are shaped by a list of **tags** — short keywords that switch features on or off and steer the layout. The tags with confirmed built-in descriptions are:

| Tag | Effect |
|-----|--------|
| `crossroads` | Layout built around a crossroads or T-junction. |
| `dead end` | The highway ends at the village rather than passing through. |
| `isolated` | No highway at all — only trails reach the village. |
| `palisade` | A defensive palisade (wooden wall) surrounds the village. |
| `pond` | Adds small ponds within the village. |
| `no orchards` | Suppresses orchards. |

Additional tags appear in the generator for **size** (hamlet / village / town), for **water features**, and likely for **setting/context** (`walled`, `fishing`, `farming`, `forested`, `mountain`, `coastal`). The size tags are the simplest way to scale the settlement up or down. *(Some of these context tags are inferred from the generator's code; their exact behavior may vary — experiment and see.)*

Tags are reflected in the page URL, so a configured village can be shared as a link (see Export & sharing).

### Style settings

Open with **Style settings...** or the `C` key. The dialog is titled **Style settings** and is organized into tabs. At the top you'll find quick **presets**, selectable by number key (these work both inside the dialog and directly on the map):

| Key | Preset |
|-----|--------|
| `1` | Default |
| `2` | Sand |
| `3` | Cold |
| `4` | Night |
| `5` | B&W |
| `6` | Minimal |
| `0` | Random |

Within the tabs you can fine-tune colors and rendering:

**Terrain tab** — Ground color, **Relief** rendering style (e.g. Hachures), Stone color, Wood color.

**Houses tab** — **Roofs** fill color, roof **Hatching** color, **Color variance** (how much roofs vary building-to-building, default ~0.2), **Roof slope** (pitch, default ~0.5), and **Roof type** (shape, e.g. Gable).

**Roads tab** — road **Color**, **Wide** main-road width (0–8, default 6), **Narrow** side-road width (0–8, default 2), **Outlining** style (Hard / Soft / None, default Hard), and a **Merge** checkbox to merge overlapping roads (on by default).

**Fields tab** — field **Background** color, **Furrows** (plow-line) color, **Color variance** (default ~0.2), and **Outlining** (Hard / Soft / None, default Soft).

**Water tab** — **Shallow water** color (default ~#5B9AC6), **Deep water** color (default ~#4C85B5), number of shallow depth bands (default 1), and a tide-line color (default ~#A3C9D4).

Beyond the tabs, the palette also drives things like ink/linework color, paper color, stroke widths, tree foliage/detail colors and variance, tree shape (default "Cotton"), shadow color/length/angle, the dramatic-light color, and the fonts used for the title, population figure, and house numbers. Most users won't need these, but they're there if you want full control over the look.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Open Parameters / Tags dialog |
| `Enter` | Reroll village |
| `0` | Random style |
| `1` | Default style |
| `2` | Sand style |
| `3` | Cold style |
| `4` | Night style |
| `5` | B&W style |
| `6` | Minimal style |
| `B` | Toggle Buildings (wilderness mode) |
| `C` | Open Style settings |
| `E` | Toggle Relief |
| `F` | Toggle Fields |
| `H` | Toggle Shading (ground) |
| `L` | Toggle Dramatic light (`Shift+L` opens the edit dialog) |
| `N` | Toggle Title |
| `O` | Toggle Orchards |
| `R` | Toggle Roads |
| `S` | Toggle Shadows |
| `T` | Toggle / reroll Trees (`Shift+T` rerolls trees only) |
| double-click / Shift+click | New village |

---

## Export & sharing

Use **Export as ▸** from the right-click menu. Three formats are offered:

| Format | What you get | Best for |
|--------|--------------|----------|
| **PNG** | A flat raster image of the current map. | Dropping into documents, VTT scene backgrounds, sharing a finished picture. |
| **SVG** | A vector version of the map. | Scaling to any size without quality loss, editing in vector software (Inkscape, Illustrator). |
| **JSON** | The structured village data — buildings, roads, fields, water, palisade segments, and numbered houses. | Importing into other tools, programmatic use, or any pipeline that reads the village layout. |

### Permalinks & seeds

Your current village (its seed, tags, and tree seed) is encoded in the page URL. **Copy the address bar** to save or share an exact village — anyone opening that link gets the same map. Rerolling trees or changing tags updates the URL accordingly, so the link always reflects what you're looking at.

---

## Tips & tricks

- **Lock a layout, vary the details.** Found a road/building arrangement you like? Don't press Reroll. Instead reroll just the **trees** (`Shift+T`) or tweak the **style** (`C`) to get variations without losing the layout.
- **Wilderness maps for free.** Toggle **Buildings** off (`B`) to get a clean terrain/forest map — handy for "the village burned down" or pure-landscape scenes.
- **Number your key locations.** Right-click a building → **Mark** to stamp an index number on it, then write a matching legend. **Mark all** numbers the whole settlement at once.
- **Scale with size tags.** Use the hamlet / village / town size tags in the Parameters dialog rather than rerolling repeatedly to hit the size you want.
- **Atmosphere in one keystroke.** Try the **Night** style (`4`) plus **Dramatic light** (`L`) for a moody, lantern-lit render.
- **Export SVG when in doubt.** SVG scales cleanly and stays editable; export PNG only when you need a finished flat image.
- **Save the link, not just the file.** The URL is a full permalink to the exact village — bookmarking it is the lightest way to "save" a map you might want to revisit or regenerate.
- **Need interiors?** Right-click a specific building → **Open in Dwellings** to generate a floorplan for that house, instead of inventing one by hand.
