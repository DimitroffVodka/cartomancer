# Cartomancer — Overnight Release-Hardening Audit

Autonomous pass on 2026-06-21. Multi-agent adversarial audit of all 8 module
scripts (the bundled `scripts/maphub/` Watabou code was **not** audited — it's
third-party). **13 findings confirmed** (4 high · 5 medium · 4 low) out of 38
raised; 25 were refuted by an adversarial verify pass.

**Verification posture:** every change is `node --check`-clean and written
conservatively, but **none were live-tested in Foundry** (overnight, the MCP
bridge wasn't reliably available). Items that genuinely need a live click before
trusting are flagged below. A final adversarial review workflow was **not** run
(to avoid another long cycle) — recommended before release.

## Fixed (11 of 13 — two are duplicates)

| # | Sev | File | Issue | Commit |
|---|---|---|---|---|
| 1 | HIGH | MaphubViewerApp | `loadTexture()` can resolve to `null`; `.width/.height` deref → TypeError / scene with undefined dims. Guarded with a clear error. | `622be3f` |
| 2 | HIGH | DDPackSettingsApp | Used deprecated V1 global `Dialog.confirm` → `foundry.applications.api.DialogV2.confirm`. | `73202ad` |
| 3 | HIGH | MaphubLauncherApp | GM gate via `_preFirstRender` return is ignored by v14 → window still opened. Moved to `_canRender`. | `73202ad` |
| 9 | MED | cartomancer.mjs | (dup of #3) public API openers ungated → GM-gate `openLauncher()`/`openDDPackSettings()`; `_canRender` on DDPackSettings. | `73202ad` |
| 4 | HIGH | MaphubSD | Untrusted journal-HTML dataset (`type`/`external`) flowed into iframe `src` (path-traversal / `javascript:` URL). Slug-validate `type`; require https watabou.github.io for `external`. | `e493a7d` |
| 5 | MED | MaphubViewerApp | Global `window` message listener wrote files with **no sender check**. Split to `#handleSave(data)`; listener now requires `event.source === this._iframe.contentWindow`; internal save-hooks call `#handleSave` directly. | `622be3f` |
| 6 | MED | MaphubViewerApp | Async `img.onload` (set-background / add-tile) ran `scene.update`/`createEmbeddedDocuments` outside the try → unhandled rejection + skipped dwelling restore. Wrapped each in its own try/catch. | `622be3f` |
| 7 | MED | DDPackPreviewApp | Extraction progress called full `render()` every 20 files (rebuilt the ~500-thumb grid + IO). Now updates the bar + status text in place. | `52e564b` |
| 8 | MED | DDPackManagerSD | `FilePicker.browse()` paths are URL-encoded; tile labels showed `%20`/`%28`. `decodeURIComponent` the filename for the label (path stays encoded for `src`). | `52e564b` |
| 10 | LOW | MaphubViewerApp | Constant `DEFAULT_OPTIONS.id` → forced singleton (2nd generator collided in registry + DOM). Unique id per instance. | `622be3f` |

## Deferred (2 — LOW perf, need live verification)

| # | Sev | File | Why deferred |
|---|---|---|---|
| 11 / 13 | LOW | DDPackManagerSD `loadDDPackDecorTiles` | Re-walks every pack dir via `FilePicker.browse` on each refresh (no cache). A safe fix needs per-pack cache + correct invalidation, which **must** be live-tested (stale-decor risk). The `_index.json` written at extract time could back this. |
| 12 | LOW | DDPackManagerSD `ensureDirectory` | Serial `browse()` per path segment per dir on import. Track already-ensured prefixes. Touches the import write-path — risky to change without a live extract test. |

Both are pure performance; current code is correct, just slower on large packs.

## Needs a live click to confirm
- The two GM gates (`_canRender` + API guards) actually block a non-GM.
- The DialogV2 remove-confirmation renders + returns correctly.
- `_onMessage` still saves from the real iframe (and the save-hook path still works).
- A failed image load surfaces the new clear error instead of a crash.
- Opening two generators at once no longer collides (unique id).

## Refuted (not bugs) — 25
Examples the verify pass threw out: claims that already-guarded null checks were
missing, "XSS" via values that are in fact `escapeHtml`'d or document-controlled,
and proposed fixes that were themselves wrong. Net signal-to-noise: ~1 real per 3
raised, which is why the adversarial verify step matters.
