# Perilous Shores — Community Usage Guide

**Perilous Shores** is a free, browser-based fantasy *region* generator. With a click it draws a hand-drawn-looking regional map — an island, a coast, a lake, a landlocked realm, a peninsula, a fjord, a bay, or an archipelago — complete with mountains, rivers, forests, swamps, deserts/dunes, towns, dungeons, roads, sea routes, and names. It's aimed at GMs and worldbuilders who want an instant hexcrawl or campaign map rather than a tactical battlemap.

- **Live generator:** <https://watabou.github.io/perilous-shores/>
- **Also presented as the "Realm" generator** on Procgen Arcana: <https://watabou.github.io/realm.html>
- **Companion viewer (HexView):** loads an exported JSON map and lets you click a hex to read its feature name — linked from the Realm page.
- **Companion icon tool (Perilous Icons):** exports the same town/danger icons as standalone PNG sheets — linked from the Realm and itch.io pages.

Created by **Oleg Dolya (Watabou)**. Maps you make may be used freely, including in commercial RPG products; attribution is appreciated but not required.

---

## Getting started

When the page loads, you're looking at a freshly generated region on a canvas. Everything you do — generating a new map, changing its look, exporting it — happens through a menu rather than a toolbar.

**The core idea:** the generator builds a hidden hex mesh, decides which cells are land or water, then drapes mountains, rivers, forests, settlements, and dangers over it. You don't place things by hand (except towns, dangers, and landmarks); you steer the *whole region* with tags and styles, then regenerate.

### Navigation

| Action | How |
|--------|-----|
| **Pan** | Drag with the mouse (hold `Space` and drag inside the Blueprint editor) |
| **Zoom** | Mouse wheel / pinch on touch |
| **Open the controls** | **Right-click** the canvas (desktop) |
| **Open the controls (touch)** | **Long-press**, or use the on-screen menu button |
| **New random region** | Right-click → **New region**, or press `Enter` |

On **desktop**, the right-click context menu is the primary interface — almost every setting lives there. On **touch devices**, a long-press (or the menu button) opens the same menu. Some menu items only appear when your cursor is over a specific spot: right-clicking a land hex can offer to **Add** a town, danger, or landmark there, and **Shift+right-click** on an existing feature opens actions for that feature.

---

## The right-click menu

This is the heart of the generator. Right-clicking the background opens the **global menu** below. If your cursor is over a land cell or an existing feature, extra context-specific items appear *above* these.

| Menu item | What it does |
|-----------|--------------|
| **New region** | Generates a fresh region using random parameters. The fastest way to roll again. |
| **Parameters…** | Opens the generation dialog: map size, hex layout, and the tag buttons that shape the region (see [Settings & parameters](#settings--parameters)). |
| **Blueprint…** | Opens the land/water painting editor so you can draw the coastline/landmass yourself before generating (see [Blueprint editor](#blueprint-editor)). |
| **Rotate ▸** | Rotates or flips the whole map (see below). |
| **Style…** | Opens the palette/style editor — colors, line weights, fonts, presets (see [Style editor](#style-editor)). |
| **Vantage…** | Switches between top-down and tilted/side-on projection (see below). |
| **Grid ▸** | Controls the hex grid: hidden/under/above, ocean tiles, hex numbers, and a Customize dialog (see [Grid submenu](#grid-submenu)). |
| **Details ▸** | Toggles for terrain, towns, dangers, meadows, trees, rivers, farmlands, plus the Towns dialog (see [Details submenu](#details-submenu)). |
| **Labels ▸** | How feature names are drawn (hidden/straight/arced/curved), plus naming language and name reroll (see [Labels submenu](#labels-submenu)). |
| **Elements ▸** | Decorative overlays: title header, frame matte, compass, descriptions, clouds, dramatic light (see [Elements submenu](#elements-submenu)). |
| **Export as ▸** | Save the map as PNG, SVG, or JSON (see [Export & sharing](#export--sharing)). |

### Context-specific items (over a feature or land cell)

- **Add ▸** — appears when you right-click a suitable land cell. Lets you add a **Town…**, **Danger…**, or **Landmark…** on that cell, depending on what's allowed there. Adding or removing a town also rebuilds the road and sea-route network.
- **Shift+right-click a feature** — opens a submenu of actions for that specific terrain feature or site (for example, settlement or danger options).
- **Click a feature** — toggles that feature's description sticker on/off (`Ctrl/Cmd+click` toggles stickers for all features at once).
- **Right-click the title header → Rename…** — edit the region's name in an *Edit name* dialog.

### Rotate submenu

Rotates or mirrors the entire region. Note that rotation/flipping isn't saved in permalinks — a shared link restores the *unrotated* map.

| Option | Effect |
|--------|--------|
| **Rotate 180°** | Turns the map upside down. |
| **Rotate 90° CW / CCW** | Quarter turns. Only available when **Vantage** is top-down (1.0). |
| **Flip horizontally / vertically** | Mirrors the map left↔right or top↔bottom. (These work in the main generator. Note: the *same* items inside the Blueprint editor are present but not yet functional.) |

### Vantage…

Controls the projection. **1.0 is straight top-down.** Lowering the value vertically squashes the map toward an oblique/side-on view for a more illustrative look. The practical minimum is around **0.5** (lower values glitch).

> Tip: a tilted vantage looks great but distorts the grid, so 90° rotation is disabled and the map no longer lines up cleanly with a real hex grid. Keep vantage at 1.0 if you need accurate hex alignment.

### Grid submenu

The grid draws dashed lines along the hex edges.

| Item | What it does |
|------|--------------|
| **Hidden** | No grid drawn. |
| **Under** | Grid drawn beneath terrain and features. |
| **Above** | Grid drawn on top of everything. |
| **Ocean tiles** | Also draws grid lines over water hexes. (By default only land hexes are gridded, for a cleaner look. If the grid is hidden when you enable this, it switches to *Under* automatically.) |
| **Numbers** | Shows a coordinate number in each hex (column + row, zero-padded; zeros are shown as the letter `O` for readability — e.g. column 3, row 12 reads `O312`). |
| **Customize…** | Opens the **Grid parameters** dialog (below). |

**Grid parameters dialog**

| Control | Default | What it does |
|---------|---------|--------------|
| **Use ink color** | Off | When on, grid lines and numbers use the map's ink/foreground color instead of the custom color, and the Color field is disabled. |
| **Color** | Cyan (`#00CCFF`) | Color of grid lines/numbers. Click the swatch for a color picker. |
| **Grid opacity** | 0.4 | How visible the grid layer is (0 = invisible, 1 = fully opaque). |
| **Numbers size** | 14 | Hex-number font size (8–18). |
| **Numbers position** | Top | Where the number sits in each hex: Top, Bottom, or Center. (Exact placement also depends on the hex mode.) |
| **Reset** | — | Restores all grid defaults. |

### Details submenu

Toggles for terrain detail and the Towns dialog. A checkmark means the toggle is on.

| Item | What it does | Default |
|------|--------------|---------|
| **Rugged** | Mountains get jagged, broken outlines (fantasy look) vs. smooth. Note: this **regenerates the whole region**, so it's slower than the other toggles. | On |
| **Massifs** | Draws the newer "super-mountains" (1.9.0): denser, larger ranges, with individual peaks growing the further they sit from their range's edge — more dramatic on big maps and with the **highland** tag. Uncheck to fall back to the older, smaller mountains. (The old "smooth" mountains — see *Rugged* — look odd with Massifs on.) | On |
| **Towns…** | Opens the Towns dialog (below). | — |
| **Dangers** | Shows/hides danger markers (dungeons, hazards). | On |
| **Meadows** | Shows/hides small decorative grass/field sprites in open terrain. | On |
| **Individual trees** | Draws each tree as a separate sprite (detailed but noisier). Off draws forests as soft "blob" masses. | Off |
| **Front trees** | Adds trees along the bottom edge of forest blobs for a pseudo-3D feel. Only available when *Individual trees* is **off**. | On |
| **Edge trees** | Adds trees along forest edges (works in either tree mode). | Off |
| **Shadows** | Tree sprites cast small shadows. | Off |
| **Reveal rivers** | Forces rivers to stay visible through forest blobs. Only available when *Individual trees* is **off**. | Off |
| **Forest type ▸** | Choose forest character: **Varied**, **Light**, **Dark**, or **Dead** (mutually exclusive). Note: *Dead* woods always draw as individual trees even when *Individual trees* is off. | Varied |
| **Simple rivers** | On = single-stroke rivers; off = "hollow"/complex rivers with internal fill and varied width and bolder outlines. | Off (complex) |
| **Shade banks** | Adds subtle inner shading along river banks. | Off |
| **Farmlands** | Tiny field/furrow strokes around settlement cells and the empty cells near towns/cities. | On |

**Towns dialog** (`Details ▸ Towns…`, or press `T`)

This dialog also groups several settlement-overlay toggles that live here rather than in the main Details list.

| Control | Default | What it does |
|---------|---------|--------------|
| **Hidden / Icons / Pins** | Icons | How settlements are drawn (radio group): hidden, building icons, or map pins. With **Pins**, Suburbs and Reroll are disabled. |
| **Outline** | Off | Draws outline strokes around town icons. |
| **Uniform** | Off | On = all towns share one architectural style; off = each town can look different. |
| **Heraldic** | Off | Makes town icons schematic — flat, emblem-like symbols without the fake-perspective 3D effect (1.9.0). |
| **Reroll** | — | Randomizes the currently shown town icons (architecture). |
| **Suburbs** | On | Shows tiny suburban houses (and the occasional windmill) around settlements. |
| **Fields** | Off | Shows farm fields around settlements. |
| **Roads** | On | Shows roads connecting settlements. |
| **Sea routes** | Off | Shows dotted sea routes on the water. |
| **Harbours** | On | Shows lighthouses on coastal settlements that have enough sea routes leaving them; each lighthouse mirrors its town's style (1.9.0). Uncheck to hide them. |

> **Settlement icons (1.9.0):** city icons were reworked. **Heraldic** gives a flatter, emblem-like look (no fake perspective), coastal towns can sport **lighthouses** (toggle **Harbours**), and flags are drawn more prominently — groundwork for per-kingdom flag colors. Roads also render more cleanly.

### Labels submenu

Controls how on-map *names* are drawn. The four display modes are a radio group — only one is active.

| Item | What it does |
|------|--------------|
| **Hidden** | No labels (note: this hides **both** area labels and point labels — towns/dangers — at once). |
| **Straight** | Flat horizontal labels — most legible. |
| **Arced** | Labels bent along a gentle arc. (**Default.**) |
| **Curved** | Labels follow the curving "spine" of a feature. Most decorative, but can occasionally overlap enclosed villages or curve oddly. |
| **Toponymy…** | Opens the naming-language dialog (below). |
| **Reroll names** | Re-randomizes every feature name. Great for hunting a name set you like — it's not deterministic, so each reroll changes everything. |

**Toponymy dialog** (`Labels ▸ Toponymy…`, or press `Shift+N`) — set up a constructed naming language so place names feel consistent.

| Control | What it does |
|---------|--------------|
| **Use naming language** | Turns on a constructed language instead of random syllables. |
| **New language** | Pick a preset — **Common, Elvish, Exotic, Alien, Random** — and it generates a fresh language, showing 10 sample words. |
| **Append terrain noun** | Adds a terrain word to names (e.g. "Darkwood **Forest**" instead of just "Darkwood"). |
| **Apply** | Regenerate all names using the chosen language. |

> The language itself isn't saved across full page reloads — set it up again if you reload. (The on/off toggles persist; the generated language does not.)

### Elements submenu

Decorative and informational overlays.

| Item | What it does | Default |
|------|--------------|---------|
| **Header ▸** | How the region's title is shown: **Hidden**, **Plain** (text only), **Plaque** (framed), or **Banner** (on a filled banner). The header auto-positions but can be dragged; right-click it to **Rename…**. | Plain |
| **Matte** | Draws a decorative frame/border around the map, like a framed picture. | Off |
| **Compass** | Shows a compass rose. Once shown it can be dragged to reposition; it has its own dialog for **Angle**, **Size**, and **Rhumb lines**. | Off |
| **Descriptions** | Shows sticker/info cards — the small text blocks describing settlements, dangers, and features (the "almanac"). Separate from Labels: hiding labels does **not** hide these. You can also click a feature to toggle its sticker. | Off |
| **Clouds** | Decorative cloud sprites around the edges and over some water. | On |
| **Light** | Opens the **Dramatic light** dialog (below) — atmospheric lighting. | Off |

**Dramatic light dialog**

| Control | What it does |
|---------|--------------|
| **Type** | **Front** (gradient from one edge) or **Spotlight** (radial glow from a draggable focus point). |
| **Size** | Size/balance of the light effect. |
| **Light** (color) | Light color, with separate **Intensity** and **Saturation** sliders. |
| **Shadow** (color) | Shadow color, with separate **Intensity** and **Saturation** sliders. |
| **Enable** | Quick on/off. |
| **Reset** | Restores defaults and turns the effect off. |

When the dialog is open, click on the map to move the spotlight's focus point.

---

## Settings & parameters

Open the **Parameters…** dialog to control what gets generated. The big payoff here is the **tags** — and the dialog hint is real: **Shift-click any tag to read its built-in explanation.**

### Size & layout

| Control | Options | Notes |
|---------|---------|-------|
| **Width / Height** | 200–4000 px | Pixel size of the map. Non-square sizes are allowed. |
| **Size preset** | Small (800), Medium (1200), Large (1800), Huge (2700) | Quick square sizes; sets both width and height. |
| **Hexes** | **Warped**, **Pointy topped**, **Flat topped** | Mesh shape. *Warped* looks the most organic but is hard to align to a real hex grid; *Pointy*/*Flat* are regular hexes and align cleanly to VTT grids. |
| **Generate** | — | Generate with the current size/hex/tags. |
| **Random** | — | Randomize the parameters and tags. |

### Tags

Tags shape the kind of region you get. Some are mutually exclusive (pick one from a group); others combine freely.

**Region type** (pick one)

| Tag | Result |
|-----|--------|
| **island** | An island or small archipelago. |
| **coast** | A coastal region. |
| **lake** | A waterbody surrounded by land. |
| **land** | A landlocked region. |
| **peninsula** | A peninsula, headland, or isthmus. |
| **fjord** | A fjord — narrow, branching, pointed water. Pair with **highland** for coastal mountain ridges. |
| **bay** | A bay or gulf. |
| **archipelago** | A scatter of relatively small islands. |

**Name flavor / alignment** (pick one) — these tint the *names* of features, and lawful/chaotic also affect coastline shape.

| Tag | Effect |
|-----|--------|
| **lawful** | Lawful-flavored names; smoother coastlines. |
| **neutral** | Neutral-flavored names. |
| **chaotic** | Chaos-flavored names; more jagged coastlines. |
| **good** / **evil** | Names hint at that alignment. |

**Modifier tags** (mix and match, within their groups)

| Tag | Effect | Conflicts with |
|-----|--------|----------------|
| **safe** | No dangers; settlements less defended. | perilous |
| **perilous** | More dangers; settlements more defended. | safe |
| **barren** | Fewer rivers, swamps, forests, settlements; more deserts. | wetland |
| **wetland** | More rivers and swamps, fewer forests, no deserts. | barren |
| **highland** | Higher, more numerous mountains. | lowland |
| **lowland** | Lower, fewer mountains (and more rivers). | highland |
| **civilized** | More settlements. | — |
| **difficult** | More mountains, forests, deserts, and swamps. | — |
| **woodland** | More forests, fewer deserts. | — |

### Visual presets

The **Style** editor ships with quick presets you can also trigger from the keyboard: Default, B&W, Antique, Soft, Cartoon, October, and Full Colour. A larger gallery of community styles is downloadable from <https://watabou.github.io/realm_styles.html> and loaded via the Style editor's **Load** button. See [Style editor](#style-editor) for the full set of options.

### URL parameters (permalinks)

A permalink encodes the **seed**, **tags**, **width/height**, **hex mode**, and **name** — enough to regenerate the same base map. It does **not** encode: blueprint paintings, rotation/flipping, edited feature names (region-name edits *do* survive), or your local style/grid/element preferences.

---

## Keyboard shortcuts

Most of these mirror right-click menu items.

### Main generator

| Key | Action |
|-----|--------|
| `Enter` | Generate a new region |
| `Shift+Enter` | Return the current map to its original (session history) |
| `Ctrl/Cmd+Z` | Restore the previous map (session history) |
| `B` | Open the Blueprint editor |
| `S` | Open the Style editor |
| `G` | Toggle grid (Hidden ↔ Under) |
| `N` | Toggle hex numbers |
| `Shift+N` | Open the Toponymy dialog |
| `L` | Cycle label mode (Hidden → Straight → Arced → Curved) |
| `A` | Toggle Rugged mountains |
| `T` | Open the Towns dialog |
| `I` | Toggle Individual trees |
| `F` | Cycle Forest type (Varied → Light → Dark → Dead) |
| `H` | Cycle shading mode (Hatching → Transparent → Solid → None) |
| `O` | Toggle "No outlines" shading |
| `C` | Open the Compass customize dialog (turns the compass on if off) |
| `M` | Toggle the frame matte |
| `Y` | Toggle dramatic light (`Shift+Y` opens its dialog) |
| `` ` `` | Default style preset |
| `1`–`6` | Style presets: B&W, Antique, Soft, Cartoon, October, Full Colour |

### Blueprint editor

| Key | Action |
|-----|--------|
| `X` | Toggle paint mode (land ↔ water) |
| `C` | Clear (fill with the opposite of the current mode) |
| `I` | Invert (swap all land and water) |
| `M` | Melt (randomly erode/smooth the coastline) |
| `Ctrl+Z` | Undo (one level) |
| `Space` (hold) + drag | Pan the canvas |
| `P` or `Tab` | Open the Blueprint parameters dialog |
| `Enter` | Submit (`Shift+Enter` reuses the existing tags) |
| `B` or `Esc` | Discard and exit the editor |
| `` ` ``, `1`–`6` | Style presets |

---

## Export & sharing

Open **Export as ▸** from the right-click menu.

| Format | Best for | Notes |
|--------|----------|-------|
| **PNG** | Quick image use — wallpapers, scene backgrounds, handouts. | A flat raster image at the map's pixel size. Whatever you see (style, labels, light, matte) is baked in. |
| **SVG** | Scalable/printable vector art and editing in vector tools. | Resolution-independent. Recent versions also embed tooltips with feature names, so names survive even when on-map labels are hidden. |
| **JSON** | Reusing the map's *data* in other tools. | Exports the structured map (terrain per hex including explicit `water` hexes, rivers as hex-edge pairs, settlements, dangers, landmarks, names, descriptions/touchstones). The format is based on HexJSON. Useful for the **HexView** viewer and third-party importers. There is currently **no import-back** into Perilous Shores. |

> About JSON fidelity: warped-hex maps keep rotation info but lose exact warping, and the rendered coastline is intentionally smoothed away from the strict hex outline — so a JSON re-render may not perfectly match the original image.

### Permalinks & seeds

- A **permalink** lets you (or someone else) reload the same base map: it stores the seed, tags, size, hex mode, and name.
- On itch.io the permalink appears via a dialog; on the web version it's the browser address bar.
- **What permalinks do not preserve:** blueprint-painted shapes, rotation/flipping, most legend/feature name edits, and your local style/grid/element preferences. To keep a blueprint or rotated result, **export it (JSON/PNG/SVG) immediately** rather than relying on the link.

### Saving styles

In the **Style** editor, the **Save** button downloads your current palette as a `.json` file you can re-load later or share. Your most recent style is also remembered in the browser between sessions.

---

## Style editor

`Right-click → Style…` (or press `S`) opens a tabbed editor controlling every visual aspect of the map. The same dialog has a **Preset** dropdown, plus **Load** (import a `.json` style) and **Save** (download the current one). Highlights by tab:

| Tab | Controls |
|-----|----------|
| **Basic** | Linework color, Earth/background color, Water color, **Shading** mode, overall **Density**, and base **Outline** strength. |
| **Land** | Coast shadow color/opacity/width, mountain color, **Jagged** mountains toggle, river color. |
| **Water** | Sea-route color, depth-contour color, shallow-water color/edge/width, and number of depth bands. |
| **Forest** | Light/dark wood colors, tree **Density**, **Regularity**, and clutter **Scale**. |
| **Sites** | Town wall/roof colors, road & flag color, town **Scale**, danger marker color & **Scale**. |
| **Elements** | Label color and outline, compass color, cloud color, banner & matte colors. |
| **Strokes** | Five line weights — Ultra-thin, Thin, Normal, Thick, and Rivers. |
| **Text** | Fonts and sizes for Towns, Dangers, Terrain labels, the Header, and Stickers. |

### Shading modes

The **Shading** option (Basic tab, or cycle with `H` / toggle `O`) changes the whole rendering feel:

| Mode | Look |
|------|------|
| **Hatching** | Classic hand-drawn hatched shadows. (Default style.) |
| **Transparent** | Soft translucent fills instead of hatching. |
| **Solid** | Flat opaque fills, bold and clean. |
| **None** | No shading — minimalist line art. |
| **No outlines** | Fills only, no strokes — a painterly, blobby look. (Toggle with `O`.) |

---

## Blueprint editor

`Right-click → Blueprint…` (or press `B`) opens a land/water *painting* mode. You draw the coastline and landmasses yourself, then **Submit** to let the generator fill in all the terrain, rivers, settlements, and dangers. You start from the current map's land/water shape, not a blank canvas.

### Painting

| Action | Effect |
|--------|--------|
| **Left-click a cell** | Toggle that cell to the current paint mode (land or water). |
| **Shift+click** | Paint the cell and all its neighbors (wide brush). |
| **Ctrl/Cmd/Alt+click** | Flood-fill the connected land or water region. |
| **Click-drag** | Continuous brush along the mouse trail. |

### Editor menu (right-click inside the Blueprint editor)

| Item | Key | What it does |
|------|-----|--------------|
| **Land / Water** | `X` | Switch which you're painting. A small toast confirms the mode. |
| **Clear** | `C` | Fills the whole canvas with the *opposite* of the current mode (clean slate). |
| **Invert** | `I` | Swaps every cell: land becomes water and vice versa. |
| **Melt** | `M` | Randomly erodes and smooths the coastline — softens hard hex edges. Different result each time. |
| **Undo** | `Ctrl+Z` | Undo the last operation (one level only). |
| **Rotate ▸** | — | 180° / 90° rotation (90° only when vantage is top-down). The Flip H / Flip V items appear here too but are **not yet functional** in the Blueprint editor. |
| **Image…** | — | Load a JPG/PNG as a land/water mask. Dark pixels become **land**, light pixels become **water** (it samples the brightness of each cell). Sketch a continent in any paint app, save as PNG, and import it. |
| **Parameters…** | `P` / `Tab` | Change canvas width/height, size preset, and hex mode. **Changing size resets the mesh and loses your painting.** |
| **Submit…** | `Enter` | Hand the shape to the generator. **Shift+Enter** reuses the current tags; a plain Submit opens a tags dialog first. |
| **Discard** | `B` / `Esc` | Exit without keeping changes. |

### Submitting

When you Submit, the region type tag (island / coast / lake / land) is **auto-detected from your painted shape**, so you only choose the modifier tags (terrain, settlement, alignment) — the same ones as the main Parameters dialog. The generator then runs its full pass: elevation, mountains, rivers, forests/swamps, settlements, dangers, and roads.

> Important: **blueprint maps cannot be restored from a permalink.** The painted shape isn't stored in the URL, so reloading a link regenerates a *different* shape. Export to JSON/PNG/SVG right after submitting to keep your result.

---

## Recommended settings for Foundry import (Cartomancer)

A Perilous Shores realm is a region/world map — and Cartomancer imports it as a **flat-top hex grid**, ready for hexcrawling.

**What Cartomancer sets automatically**
- **Forces flat-topped hexes** in the generator, so the map you see and import is a regular hex lattice (Warped hexes can't align to a VTT grid).
- Imports as a Foundry **flat-top hex scene** (`HEXODDQ`) **aligned to the drawn hexes**: the importer reads the generator's hex radius and render transform, matches Foundry's `grid.size` to the native hex pitch, and phase-aligns the lattice so **one Foundry hex = one map hex**.
- **Fully revealed** — fog-of-war and token-vision are off, so the whole region shows as a handout.

**Set these in the generator before *Import Scene***
- For resolution, set a large **Size preset** in **Parameters…** before generating — **Large (1800)** or **Huge (2700)**. A bigger map captures sharper.
- You don't need to touch the hex mode — Cartomancer sets flat-top for you. (Switch to **Pointy topped** and the import follows it with a pointy Foundry hex grid; **Warped** falls back to a plain gridless image.)
- Trim clutter to taste: **Labels**, and under **Elements** the **Descriptions**, **Compass**, **Matte**, and **Clouds** overlays. A clean style preset (**Default**, **Antique**, **Soft**) imports well.
- **The new larger mountains (Details ▸ Massifs, 1.9.0) can crowd roads and settlements.** If they hide the towns in your capture, disable **Massifs** or set the **Towns** dialog to **Pins** before importing.
- Turn on **hex numbers** (`N`) if you want the generator's coordinates baked into the image for referencing.
- To import individual locations *as their own scenes*, use the realm's location journals (**Generate this map**) rather than capturing the whole region — see the module's realm-import flow.

---

## Tips & tricks

- **Shift-click tags to learn them.** The Parameters dialog has a built-in explanation for every tag — the fastest way to understand what each one does.
- **Reroll names, don't regenerate.** If you like the *map* but not the *names*, use `Labels ▸ Reroll names` (it keeps the terrain). Regenerating gives you a whole new map.
- **Keep a map with a permalink.** Copy the URL to bookmark a base map you can return to — but remember it won't preserve blueprints, rotation, or local style/grid preferences.
- **For VTT/hex alignment, use Pointy or Flat hexes at vantage 1.0.** Warped hexes and tilted vantages look great but won't line up with a real hex grid, and rotation is disabled below vantage 1.0.
- **Turn on hex numbers** (`N`) for hexcrawl referencing — each hex gets a coordinate you can cite in notes and tables.
- **Cleaner exports:** turn off clouds, matte, dramatic light, suburbs, fields, and farmlands; set Labels to **Straight** (or **Hidden** if you'll add your own); and consider **Individual trees off** with a **Dark** forest type for readable woods.
- **Hidden labels hide everything.** "Hidden" turns off both point labels (towns/dangers) and area labels — it's all-or-nothing, which can be surprising.
- **Want a label even when labels are hidden?** SVG export embeds feature names as tooltips, so names survive a label-free image.
- **Use the Blueprint image import for custom worlds.** Sketch a black-on-white landmass in any paint program and load it as a mask — instant custom coastline, fully terrain-generated.
- **Style consistency across maps:** set up a palette you like, hit **Save** to download the `.json`, and **Load** it for every map in the same campaign. Your last style is also remembered automatically.
- **Settlement drill-down.** Larger settlements can link out to detailed sub-generators (Medieval Fantasy City Generator or Village Generator) — handy when a player wants to walk into a town you only placed as a dot.
- **Session history is your friend.** `Ctrl/Cmd+Z` steps back to a previous map and `Shift+Enter` returns to the current map's original, so you can explore variations without losing a good one.
