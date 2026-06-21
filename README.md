# Cartomancer — Map Generators

A **system-agnostic** Foundry VTT module that runs [Watabou](https://watabou.itch.io)'s
map generators *inside* Foundry and imports the result as a playable scene — walls,
doors, multi-level floors, and stair regions included. No game system required.

> **Status: public dev preview (Phases A–B done).** Extracted from `shadowdark-extras`.
> Not a packaged release yet — there is no Foundry manifest / Releases, and it should
> **not be listed on a package registry yet**: per [`dev/LICENSING.md`](dev/LICENSING.md)
> the bundled generators (except the GPL-3 City) need the authors' permission to
> redistribute. The maps you make are already free per Watabou's FAQ; this gate is
> only about shipping the generator *app code*.

> **Fetch-on-first-use (license-clean path):** *Settings → Cartomancer → Download
> Generators* downloads all six generators (Realm, Dungeon, City, Village, Dwellings,
> Cave/Glade) straight from `watabou.github.io` into your local data — applying small
> hooks on your device — so they run locally and offline with all import features, and a
> distributed build can ship **without** Watabou's code. Downloaded copies are preferred
> automatically; the bundled files remain a fallback.

## Generators

Realm (Perilous Shores) · City (MFCG) · Village · Cave/Glade · Dungeon (One Page) ·
Dwelling — matching <https://watabou.github.io/>.

Cave, Dungeon, and Dwelling import as **playable scenes** with walls (and the
Dwelling as a multi-level scene with doors, a basement, named floors, and
up/down spiral-staircase regions). Realm/City/Village import as image scenes.

**Realm import** (Perilous Shores) can optionally turn a whole region into a Foundry
folder: the realm map as a scene, **Note pins** on each linked location, and
cross-linked **journals** for every city/village/dungeon. Each location's map is
generated **on demand** from its own seed (one click in its journal), and a dungeon's
room key (story + numbered rooms) is folded into its journal.

## Use

GM only. Open the launcher from the **Scene Controls** (the Cartomancer / drafting-
compass group) or via the API:

```js
game.modules.get("cartomancer").api.openLauncher();
```

Pick a generator, tweak the map, then **Import Scene**.

## Decor (DungeonDraft packs)

Cartomancer can use **DungeonDraft** `.dungeondraft_pack` object packs as decor —
**no art is bundled**; you import your own. GM only.

**Import** (Module Settings → Cartomancer → *Manage Packs*, or the *Import Packs*
button in the decor browser):
- **Add Pack** — pick a downloaded `.dungeondraft_pack` file.
- **Import from URL** — paste a *direct* file link (the host must allow cross-origin
  download; login-gated store links won't work — download those and use Add Pack).

A preview opens: tick a single object, a whole category, or **Extract All**.

**Place** — open the **Decor Browser** (shapes icon in the Tokens controls). Drill
the folder tree (drag the divider to widen it), then **drag a thumbnail onto the
scene**, or click one and hit **Place at view**. Scale / elevation / grid-snap are
in the toolbar. Hide a pack with its eye toggle; click a hidden pack's row to show
it again.

## Roadmap

- **Phase A:** Watabou generators + scene import (standalone). ✅
- **Phase B:** DungeonDraft (`.dungeondraft_pack`) decor importer + decor browser. ✅
  - FilePicker import ✅ · decor browser ✅ · URL-fetch import ✅
  - *Deferred (wanted later):* a curated in-app catalog of free, redistribution-OK
    packs with direct download links — one-click download + import, **no bundled art**.
- **Phase C:** scene ZIP export/import.
- **Phase D:** licensing resolution → public release.

See [`dev/cartomancer-extraction-plan.md`](dev/cartomancer-extraction-plan.md).

## Credits

Map generators created by **Watabou** (Oleg Dolya) — <https://watabou.itch.io>.
Please support him on [Patreon](https://www.patreon.com/cw/watawatabou). The City
generator's algorithm is open-source as
[TownGeneratorOS](https://github.com/watabou/TownGeneratorOS) (GPL-3.0).
Bundled fonts are under the SIL Open Font License.
