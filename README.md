# Cartomancer — Map Generators

A **system-agnostic** Foundry VTT module that runs [Watabou](https://watabou.itch.io)'s
map generators *inside* Foundry and imports the result as a playable scene — walls,
doors, multi-level floors, and stair regions included. No game system required.

> **Status: pre-release / private (Phase A).** Extracted from the `shadowdark-extras`
> module. **Do not publish or list on a package registry yet** — see
> [`dev/LICENSING.md`](dev/LICENSING.md): the bundled generators (except the GPL-3
> city) need the authors' permission to redistribute. Output (the maps) is already
> free per Watabou's FAQ; this gate is only about shipping the generator *app code*.

## Generators

Realm (Perilous Shores) · City (MFCG) · Village · Cave/Glade · Dungeon (One Page) ·
Dwelling — matching <https://watabou.github.io/>.

Cave, Dungeon, and Dwelling import as **playable scenes** with walls (and the
Dwelling as a multi-level scene with doors, a basement, named floors, and
up/down spiral-staircase regions). Realm/City/Village import as image scenes.

## Use

GM only. Open the launcher from the **Scene Controls** (the Cartomancer / drafting-
compass group) or via the API:

```js
game.modules.get("cartomancer").api.openLauncher();
```

Pick a generator, tweak the map, then **Import Scene**.

## Roadmap

- **Phase A (this):** Watabou generators + scene import (standalone). ✅
- **Phase B:** DungeonDraft (`.dungeondraft_pack`) decor importer + decor browser.
- **Phase C:** scene ZIP export/import.
- **Phase D:** licensing resolution → public release.

See [`dev/cartomancer-extraction-plan.md`](dev/cartomancer-extraction-plan.md).

## Credits

Map generators created by **Watabou** (Oleg Dolya) — <https://watabou.itch.io>.
Please support him on [Patreon](https://www.patreon.com/cw/watawatabou). The City
generator's algorithm is open-source as
[TownGeneratorOS](https://github.com/watabou/TownGeneratorOS) (GPL-3.0).
Bundled fonts are under the SIL Open Font License.
