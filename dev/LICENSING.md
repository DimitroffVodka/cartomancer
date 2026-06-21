# Cartomancer — Licensing Inventory

Findings from a deep-research pass (15 adversarially-verified claims) + Watabou's
FAQ (<https://watabou.github.io/faq.html>), 2026-06-20. **Primary sources cited.**

## The two separate questions

1. **The generated maps (output):** ✅ **Free, including commercial use.** Every
   generator page + the FAQ state: *"You can use maps created by the generator(s)
   as you like: copy, modify, include in your commercial rpg adventures etc.
   Attribution is appreciated, but not required."* So the scenes users import are
   unambiguously fine.
2. **Bundling the generator *app code*:** ⚠️ This is the gate — and it can't be
   dodged by iframing the hosted site, because reading the generator canvas/
   geometry for import requires **same-origin (local) bundling**; a cross-origin
   `watabou.github.io` iframe taints the canvas and blocks `contentDocument`.

## Per-generator verdict

| Generator | Origin | License | Bundle & redistribute publicly? |
|---|---|---|---|
| **City / MFCG** | algorithm = TownGeneratorOS | **GPL-3.0** (repo `LICENSE`) | ✅ *if* shipped from a self-compiled GPL build + source + notice → **makes the module GPL-3.0** (copyleft) |
| **Perilous Shores (Realm)** | Watabou, closed | none (*"not planning to open source it anytime soon"*) | ❌ needs permission |
| **Cave / Glade** | Watabou, closed | none (*"don't think I'm going to publish its source… anytime soon"*) | ❌ needs permission |
| **Dungeon (One Page)** | Watabou, closed | none (output grant only) | ❌ needs permission |
| **Village** | voluminor/maphub, closed | none (output grant only) | ❌ needs permission |
| **Dwellings** | voluminor/maphub, closed | none (output grant only) | ❌ needs permission |

- The current bundled City build may be the **closed itch.io MFCG**, not the GPL
  `TownGeneratorOS` build — if so it's "needs permission" like the rest until a
  from-source GPL build is substituted.
- Bundled libs are permissive (JSZip MIT, rot.js BSD-3, howler/FileSaver/pako MIT,
  fontsloader Apache-2.0, OpenFL/Lime/Haxe runtime MIT) — add notices; fonts are OFL.

## Precedent

`one-page-parser` (a *public* Foundry module, MIT) sidesteps redistribution
entirely: the user exports **PNG + JSON** from the hosted generator and the module
imports the files — no app code shipped. That's the zero-permission fallback
architecture (but only OPD exports rich geometry; the others would be image-only).

## Recommendation

- Keep Cartomancer **private through Phases A–C** (same legal posture as the
  in-house `shadowdark-extras` feature).
- Before any public release: ask **Watabou** (and voluminor for cave/dwellings/
  village) for permission to bundle the web builds in a free, credited module —
  his FAQ invites questions (*"Feel free to ask anything"*). Post on his subreddit,
  hold Foundry submission for his nod.
- Pick the module license **after** the generator decision (bundling any GPL build
  forces a GPL-compatible module license).
