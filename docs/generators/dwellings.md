# Dwellings Generator — Community Usage Guide

**Dwellings** is a free, browser-based procedural generator that creates floor plans for houses and other buildings: multi-floor interiors complete with rooms, walls, doors, stairs, furniture, windows, lighting, and even a side-on elevation view of the exterior. It's aimed at tabletop GMs, worldbuilders, writers, and anyone who needs a believable building layout in a couple of clicks — no drawing required. It is part of the **Procgen Arcana** family and is the generator that opens when you click through a building in the Medieval Fantasy City Generator, Village Generator, or Neighbourhood Generator.

- **Live generator:** https://watabou.github.io/dwellings/
- Created by **Oleg Dolya (Watabou)**.

---

## Getting started

When you open the link, you land on a single full-window **canvas** showing one generated building's floor plan, viewed top-down. There's no big toolbar full of buttons — almost everything lives in a **menu**, and the whole app is driven from there plus a handful of keyboard shortcuts.

**The core idea:** every building is generated from a random seed plus a set of *tags* (small/large, tall, has a basement, and so on). Generate, tweak the tags, generate again until you like it, then export. Each new building gets a random name as well.

**Generate a new building**

- Press **Enter**, or
- Open the menu and choose **New house**.

Keep pressing Enter to roll through buildings until one fits.

**Pan, zoom, and navigate**

- **Drag** the canvas to pan.
- **Mouse wheel / pinch** to zoom in and out.
- At the **bottom of the screen** there's a **floor selector** — click it to move between floors (basement, ground floor, upper floors, roof). See [Multi-floor buildings](#multi-floor-buildings).

**How to open the controls**

Dwellings is driven from a single **menu** rather than a permanent button bar:

- **On desktop:** click the **Menu button** in the corner of the toolbar to open it. The button sits **top-left in plan view** and **top-right in elevation view**.
- **On touch devices:** tap the **menu button** to open the same menu.

The menu is the heart of the app, so it gets its own full reference below.

---

## The menu (settings reference)

This is the most important section. The menu is where every setting lives, and it **changes depending on which view you're in** — the normal top-down **Plan view**, or the side-on **Elevation view**. Both are documented here in full: every item and every submenu.

### Plan view menu (the main menu)

This is what you see by default.

| Item | What it does |
|------|--------------|
| **Procgen Arcana** | Returns to the Procgen Arcana homepage, where you can reach Watabou's other generators. |
| **New house** | Generates a fresh, random building. Same as pressing **Enter**. |
| **Parameters…** | Opens the **Tags / Parameters** dialog, where you control size, height, layout, and other generation options. See [Settings & parameters](#settings--parameters). Also opens with **Tab** or **T**. |
| **Elevation** | Switches to the side-on **Elevation view** of the building's exterior. Also **E**. |
| **Blueprint** | Opens the **Blueprint editor**, where you can paint a custom building footprint. Also **B**. |
| **Rooms ▸** | Submenu — choose the *kind* of rooms / interior theme. See below. |
| **Walls ▸** | Submenu — choose the architectural / wall style preset. See below. |
| **Layers ▸** | Submenu — toggle which layers are shown (floor, furniture, labels, etc.). See below. |
| **Style…** | Opens the **Style** dialog (colors and line settings). Also **S**. |
| **Fullscreen** | Toggles fullscreen mode for a distraction-free canvas. |
| **Export ▸** | Submenu — save the building as an image, vector, or data file. See below and [Export & sharing](#export--sharing). |

#### Rooms ▸ submenu

Controls the *type and theme* of rooms placed in the building. The available options depend on the generator version, but include the standard room set plus themed sets such as a **Gothic** room set (added in a 2025 update). Pick a theme here to change the character and naming of the rooms (e.g. plain residential vs. a more ornate, gothic feel). There's also room-type cross-pollination with Watabou's Taverns generator, so tavern-style rooms may appear as an option.

#### Walls ▸ submenu

Controls the architectural style preset — wall thickness, corner styling, and how doors and windows are drawn.

| Option | Effect |
|--------|--------|
| **Simple** | Basic, thin rectangular walls — the plain default look. |
| **Castle** | Thick stone walls, suited to keeps and fortifications. |
| **Log house** | Log-cabin construction style. |
| **Modern** | Contemporary architecture. |
| **Sci-fi** | Futuristic / science-fiction styling. |

Switching wall style re-skins the same layout, so you can keep a plan you like and just change how it's built.

#### Layers ▸ submenu

Toggles which **layers** are drawn on the canvas (and, by extension, what's included when you export). The toggles include:

- **Floor** — the floor plan itself (rooms and walls).
- **Props** — furniture and fittings (tables, beds, etc.).
- **Annotations** — room labels / text.

Turn off props for a clean empty shell, or turn off labels for an unlabelled map. These same three layers can be toggled independently in the **Advanced export** dialog, so you can show everything on screen but export only some layers.

#### Export ▸ submenu

| Option | What it does |
|--------|--------------|
| **as PNG** | Saves the current floor as a PNG image. |
| **as SVG** | Saves the current floor as a scalable SVG vector. |
| **as JSON** | Saves the building as structured data (rooms, dimensions, etc.). Useful for importing into other tools. |
| **Advanced…** | Opens the multi-floor export dialog (resolution, floor range, grid layout, per-layer toggles). |

See [Export & sharing](#export--sharing) for the full breakdown, including the Advanced dialog.

### Elevation view menu (side-on view)

When you switch to **Elevation view** (menu → *Elevation*, or **E**), you see the building from the side — rooflines, windows, and floor levels. The menu changes to suit that mode, and its button moves to the **top-right** corner.

| Item | What it does |
|------|--------------|
| **Floor plans** | Switches back to the top-down **Plan view**. Also **E**. |
| **Blueprint** | Opens the **Blueprint editor**. Also **B**. |
| **Reroll** | Rerolls the building's exterior dimensions and fortification. Also **R**. |
| **Fortified** | Toggles a fortified (battlement / keep-like) appearance on the exterior. |
| **Dark** | Toggles a dark color mode for the elevation drawing. Also **D**. |
| **Fade** | Toggles a fading / depth effect that softens distant parts of the building. Also **F**. |
| **Fullscreen** | Toggles fullscreen mode. |

In elevation view you can also use the **left / right arrow keys** to rotate around the building and view it from each of its four sides.

> **Note:** there's no Parameters, Rooms, Walls, Layers, or Style item in the elevation menu — those live in the plan-view menu. Switch back with **Floor plans** (or **E**) to reach them.

### Blueprint editor

Reached via **Blueprint** in either menu (or **B**). This lets you **paint a custom footprint** for the building instead of accepting the random shape — handy when you want the plan to fit a specific lot or polygon. When other Procgen Arcana generators (City, Village, Neighbourhood) hand a building over to Dwellings, that building's outline is passed in as the footprint here, so the interior fits the shape you clicked. The painted footprint is also what gets stored in the `plan` URL parameter (see [URL parameters](#settings--parameters)).

### Style dialog

Reached via **Style…** (or **S**, plan view only). This controls the look of the drawing — colors and line work — without changing the layout.

There are five built-in **presets**, also bound to number keys:

| Key | Preset |
|-----|--------|
| **1** | Natural |
| **2** | Wooden |
| **3** | Plain |
| **4** | Blueprint |
| **5** | Black & white |

**Colors tab** — each element of the drawing has its own color swatch:

| Label | Controls |
|-------|----------|
| **Ink** | Line work and detail color. |
| **Paper** | Page / background color. |
| **Floor** | Floor fill color. |
| **Walls** | Wall fill color. |
| **Props** | Furniture / props color. |
| **Windows** | Window fill color. |
| **Stairs** | Staircase color. |
| **Roof** | Roof color (shown in elevation view). |
| **Labels** | Room label text color. |

**Misc. tab** — fine-tunes line weights, shading, and labels:

| Label | What it adjusts |
|-------|-----------------|
| **Normal stroke** | Main line width. |
| **Thin stroke** | Grid / thin line width. |
| **Grid opacity** | How visible the background grid is (down to invisible). |
| **Shading** | Strength of the ambient shading around walls and objects. |
| **Lighting** | Strength of the lighting effect (added in newer versions). |
| **Room labels** | Font used for room labels. |
| **Hatching** | Toggles diagonal hatching inside walls. |

---

## Settings & parameters

Generation is controlled by **tags**, opened from **Parameters…** (or **Tab** / **T**). Tags are little switches that bias the random generator. Some are mutually exclusive — turning one on turns its opposite off automatically.

**Size** (pick one; medium is the default and the most common):

| Tag | Effect |
|-----|--------|
| `small` | A small building. |
| `medium` | A medium building (default). |
| `large` | A large building. |

**Height** (pick one):

| Tag | Effect |
|-----|--------|
| `low` | Fewer floors. |
| `tall` | More floors. |

**Shape / layout:**

| Tag | Effect |
|-----|--------|
| `square` | A more square, regular footprint. |
| `slab` | A wider, slab-like footprint. |

**Rooms / interior:**

| Tag | Effect | Note |
|-----|--------|------|
| `hallways` | More corridors and rooms with nooks. | |
| `spiral` | Use a spiral staircase. | Excludes `stairwell`. |
| `stairwell` | Use a straight (non-spiral) stairwell. | Excludes `spiral`. |
| `mechanical` | Mechanical / industrial-feeling rooms. | Excludes `organic`. |
| `organic` | Organic, curved room shapes. | Excludes `mechanical`. |
| `basement` | Add a basement level. | |

**Windows / walls:**

| Tag | Effect | Note |
|-----|--------|------|
| `blank` | As few windows as possible. | Excludes `transparent`. |
| `transparent` | More and larger windows. | Excludes `blank`. |
| `generic` | No special / themed rooms. | |

When two conflicting tags are selected, the generator resolves the conflict for you within each exclusive group (size, height, blank vs. transparent, mechanical vs. organic, spiral vs. stairwell), so you can't end up in an impossible combination.

**URL parameters (advanced):** Dwellings can also read settings from the page URL, which is how it receives buildings from other generators and how permalinks work. You generally don't need to set these by hand, but it's useful to know they exist:

| Parameter | Meaning |
|-----------|---------|
| `seed` | The random seed — the same seed reproduces the same building. |
| `plan` | An encoded custom footprint (from the Blueprint editor or another generator). |
| `w`, `h` | Building width / height in cells. |
| `tags` | Generation tags (e.g. `tall`). |
| `entrance` | The entrance direction. (Reserved — the city-generator integration doesn't send it yet.) |
| `view` | Which view to open in (`plan` or `elevation`). |
| `floors` | Number of floors. |
| `name` | The building's name. |
| `rooms` | Room theme (e.g. `gothic`, `tavern`, or default). |

---

## Keyboard shortcuts

**Plan view:**

| Key | Action |
|-----|--------|
| `Enter` | Generate a new building |
| `Space` | Show the building's name |
| `1` | Natural color scheme |
| `2` | Wooden color scheme |
| `3` | Plain color scheme |
| `4` | Blueprint color scheme |
| `5` | Black & white color scheme |
| `Tab` or `T` | Open Parameters / Tags |
| `S` | Open the Style dialog |
| `E` | Switch to Elevation view |
| `B` | Switch to the Blueprint editor |

**Elevation view:**

| Key | Action |
|-----|--------|
| `←` / `→` | Rotate to the next side of the building |
| `R` | Reroll exterior dimensions |
| `D` | Toggle dark mode |
| `F` | Toggle fade effect |
| `E` | Switch back to Plan view |
| `B` | Switch to the Blueprint editor |

---

## Multi-floor buildings

A building can have several levels: a **basement**, the **ground floor**, one or more **upper floors**, and a **roof**. The number of floors is set by the height tags (`low` / `tall`) plus a bit of randomness, and adding the `basement` tag guarantees a cellar.

- Use the **floor selector** at the bottom of the screen to step between levels.
- Floors are labelled **B** (basement), **GF** (ground floor), **1F**, **2F**, and so on, up to **R** (roof).
- Each floor is drawn on its own — what you export with **PNG**, **SVG**, or **JSON** is the **current** floor, while **Advanced export** lets you put a whole range of floors on one sheet.

---

## Export & sharing

### Image and data formats

From **Export ▸** in the menu:

| Format | Best for |
|--------|----------|
| **PNG** | A ready-to-use raster image of the current floor. Drop it into notes, VTTs, or documents. |
| **SVG** | A scalable vector of the current floor — edit it in Inkscape/Illustrator, or scale it to any size without blur. |
| **JSON** | Structured building data (rooms, dimensions, layout). Use this when another tool can read Dwellings data, e.g. for VTT scene import. |

### Advanced export (multi-floor)

**Export ▸ Advanced…** opens a dialog for exporting several floors at once, arranged into a single image. It's the way to get a whole multi-storey building on one sheet.

| Control | What it sets |
|---------|--------------|
| **Floor range** | The *from* and *to* floors to include. |
| **Columns / table layout** | How the floors are arranged — e.g. a row, a column, or a 2×2 grid. |
| **DPI (pixels per cell)** | Output resolution — raise it for crisp, large prints; lower it for smaller files. |
| **Floor** (checkbox) | Include the floor-plan layer. |
| **Props** (checkbox) | Include furniture / props. |
| **Annotations** (checkbox) | Include room labels. |
| **Output** | Export as PNG or SVG. |

Your last-used settings (resolution, columns, and the layer checkboxes) are remembered between exports, so you don't have to set them up every time.

### Permalinks and seeds

Because every building is defined by its **seed** plus tags, the URL in your browser's address bar *is* the share link. Copy it and anyone who opens it gets the exact same building. Changing the seed (or simply generating a new building, which picks a new seed) gives you a different result you can re-find later by saving the link. This is also how the City/Village/Neighbourhood generators hand a specific building to Dwellings — they build a URL with the right seed, footprint, and size.

---

## Tips & tricks

- **Roll fast, then refine.** Hammer **Enter** to cycle through buildings, and only open Parameters once you know roughly what you want (e.g. add `tall` + `basement` for a tower with a cellar).
- **Keep the layout, change the look.** Wall style (Walls ▸), room theme (Rooms ▸), and the whole Style dialog only affect appearance — they don't reroll the floor plan. Find a plan you like first, then dress it up.
- **Use the number keys for instant restyling.** `1`–`5` flip between the color presets faster than opening the Style dialog. `4` (Blueprint) is great for a clean technical look.
- **Export clean shells with Layers.** Turn off **Props** (and/or **Annotations**) before exporting if you want an empty map to furnish yourself, or an unlabelled version for players.
- **SVG over PNG when you can.** If you plan to edit, recolor, or print large, export SVG — it stays sharp at any size.
- **One sheet for the whole building.** Use **Advanced export** to lay out every floor (basement → roof) side by side; pick the column count that matches your page orientation.
- **Bookmark the URL to save a building.** There's no "save" button as such — the address bar holds the seed, so a bookmark or copied link is your save file and your share link in one.
- **Elevation view is for the exterior.** Switch with **E** when you want a picture of the outside of the building (rooflines, windows, fortifications) rather than the interior plan; use the arrow keys to see all four sides, and **R** to reshape it.
- **Blueprint editor for a specific lot.** If you need the building to fit an exact outline, paint it in the Blueprint editor rather than rerolling and hoping for the right shape.

---

*Dwellings is created and maintained by Oleg Dolya (Watabou). This is a community usage guide, not official documentation.*
