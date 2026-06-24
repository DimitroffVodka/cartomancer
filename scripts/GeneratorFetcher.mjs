/**
 * Cartomancer — runtime generator fetcher ("fetch on first use").
 *
 * Instead of bundling Watabou's compiled generators into the module (which would be
 * redistribution), the module ships ONLY our own code + index.html loaders, and on
 * first use downloads each generator's JS + assets from watabou.github.io into the
 * user's local data, applies our small exposure hooks, and serves it same-origin.
 * After the one-time download everything runs locally + offline, all features intact,
 * and the distributed module contains none of Watabou's code.
 *
 * Two Foundry constraints shape the implementation:
 *  1. FilePicker.upload REJECTS .js/.html/.mjs (returns falsy, no throw) but ALLOWS
 *     .json/.txt. So the fetched generator JS is saved as `<name>.txt`, and at run
 *     time we INLINE that text into our loader (a .txt can't be a <script src>, but
 *     its content can be injected as an inline <script>). Verified: realm fetch →
 *     patch → save .txt → inline → run → region2data extract.
 *  2. The generator HTML, served as text/plain by Foundry, must run from a same-origin
 *     blob: URL with a <base href> so its relative assets resolve and the parent page
 *     can read its canvas/geometry.
 *
 * Coverage: all six generators are fetchable. Realm, dungeon, city (mfcg), village,
 * dwellings, and cave are Watabou's own single-file builds (our bundle = live + a tiny
 * hook, or for cave the live build via the `com.watabou.cave.*` namespace). Cave fetches
 * Watabou's single-file build (to/cave-live loader), NOT our bundled voluminor/maphub
 * fork — the fork stays as the bundled fallback only.
 */

const MODULE_ID = "cartomancer";
const WATABOU = "https://watabou.github.io";
export const FETCH_ROOT = "cartomancer-generators";   // under Data/
const MARKER = "_cartomancer.json";                   // download-complete marker (allowed ext)

/**
 * Module-controlled generator revisions — OUR versioning, never Watabou's (we never poll
 * upstream). Bump a type's number when you refresh its bundled build or fix its patch and
 * want existing downloaders re-prompted to re-fetch. The marker records the rev that was
 * downloaded; on load we compare it to these and offer a refresh (see promptStaleRefresh).
 * Unlisted types are rev 0 (never prompt).
 *   realm: 1 — Perilous Shores 1.9.0 (new mountains; minifier R→U patch-anchor fix).
 */
export const GEN_REV = { realm: 1 };
export const genRev = (type) => GEN_REV[type] ?? 0;

const FilePickerImpl = () => foundry.applications.apps.FilePicker?.implementation ?? globalThis.FilePicker;

/**
 * Per-generator fetch manifest.
 * - slug:      watabou.github.io path segment.
 * - bundleDir: our shipped index.html loader dir (scripts/maphub/<bundleDir>/index.html).
 * - js:        [{ name, from, patch? }] — `from` is the live filename, `name` the local
 *              basename; saved as `<name>.txt`. `patch` is our hook: either a literal
 *              {anchor, replace} splice, or {exposeClasses:true} for Haxe-registry
 *              generators (realm, cave) — see exposeHaxeClasses().
 * - assetDir:  case the generator expects ("Assets" or "assets").
 * - assets:    data files under <live>/<assetDir>/ (fonts/favicons omitted — cosmetic;
 *              .woff would be blocked by FilePicker anyway).
 */
const MANIFESTS = {
	realm: {
		slug: "perilous-shores", bundleDir: "to/realm", assetDir: "Assets",
		js: [{ name: "Perilous.js", from: "Perilous.js", patch: { exposeClasses: true } }],
		assets: [
			"antique.json", "bw.json", "cartoon.json", "centrepiece.json", "default.json",
			"full_colour.json", "october.json", "soft.json", "grammar.json",
			"demonic.txt", "elven.txt", "english.txt", "given_female.txt", "given_male.txt",
		],
	},
	dungeon: {
		slug: "one-page-dungeon", bundleDir: "to/dungeon", assetDir: "assets",
		js: [{ name: "Dungeon.js", from: "Dungeon.js", patch: {
			anchor: "addChild(this.map);this.createHeader();",
			replace: 'addChild(this.map);this.createHeader();try{(typeof window!=="undefined"?window:self).__sdxDungeonView=this}catch(_e){}',
		} }],
		assets: [
			"ancient.json", "default.json", "light.json", "link.json", "modern.json",
			"grammar.json", "demons.txt", "tags.txt",
		],
	},
	mfcg: {
		slug: "city-generator", bundleDir: "to/mfcg-raw", assetDir: "Assets",
		js: [{ name: "mfcg.js", from: "mfcg.js" }],   // byte-identical to live — no patch
		assets: [
			"default.json", "bw.json", "ink.json", "modern.json", "natural.json", "vivid.json",
			"grammar.json", "english.txt", "elven.txt", "given_female.txt", "given_male.txt",
		],
	},
	village: {
		slug: "village-generator", bundleDir: "to/village-raw", assetDir: "Assets",
		js: [{ name: "Village.js", from: "Village.js" }],   // byte-identical to live — no patch
		assets: [
			"village_default.json", "village_bw.json", "village_cold.json", "village_minimal.json",
			"village_night.json", "village_sand.json", "grammar.json", "given_female.txt", "given_male.txt",
		],
	},
	dwellings: {
		slug: "dwellings", bundleDir: "to/dwellings-raw", assetDir: "Assets",
		js: [{ name: "Dwellings.js", from: "Dwellings.js", patch: {
			anchor: "this.floor=new ti;",
			replace: 'this.floor=new ti;try{(typeof window!=="undefined"?window:self).__sdxDwellView=this}catch(_e){}',
		} }],
		// gothic/tavern are .json5 (FilePicker may reject .json5; tolerated — the generator
		// falls back to its default style when a style file is missing).
		assets: [
			"blueprint.json", "bw.json", "natural.json", "plain.json", "wooden.json",
			"grammar.json", "gothic.json5", "tavern.json5",
		],
	},
	cave: {
		slug: "cave-generator", bundleDir: "to/cave-live", assetDir: "Assets",
		js: [{ name: "Cave.js", from: "Cave.js", patch: { exposeClasses: true } }],
		assets: [
			"bw.json", "grammar.json", "forest_grammar.json", "moonlight.json", "parchment.json",
			"glade_autumn.json", "glade_default.json", "glade_outline.json", "glade_reef.json", "glade_tropical.json",
			"demonic.txt", "given_female.txt", "given_male.txt",
		],
	},
};

async function ensureDir(path) {
	const FP = FilePickerImpl();
	const parts = String(path).split("/").filter(Boolean);
	let cur = "";
	for (const p of parts) {
		cur = cur ? `${cur}/${p}` : p;
		try { await FP.browse("data", cur); } catch { try { await FP.createDirectory("data", cur); } catch { /* exists/race */ } }
	}
}

/** Upload; returns true on success. FilePicker returns falsy (no throw) for blocked types. */
async function uploadFile(dir, name, data, mime) {
	const FP = FilePickerImpl();
	const file = new File([data], name, { type: mime });
	const r = await FP.upload("data", dir, file, {}, { notify: false });
	return !!r;
}

/**
 * Expose a Haxe generator's class registry as `window.__maphubClasses`, so the viewer
 * can reach Serializer/Region/MapScene by fully-qualified name (see MaphubViewerApp's
 * realm extraction). Used by the generators built on Haxe's `$hxClasses` registry —
 * currently Perilous Shores (realm) and Cave/Glade.
 *
 * Resilient to Watabou's periodic rebuilds: the Haxe minifier reassigns single-letter
 * symbols every build (Perilous Shores 1.9.0 flipped the entry class R→U), so we never
 * hardcode them. Both are recovered from structure instead:
 *   • registry — the variable used in (nearly) every `<var>["com.watabou.…"]=` class
 *                registration; take the most frequent one ($hxClasses).
 *   • entry    — `<Entry>` in the bootstrap IIFE tail `<Entry>.main()})(`.
 * We then splice `,(…).__maphubClasses=<registry>` immediately after `<Entry>.main()`.
 * Returns the patched source, or null if the bootstrap shape isn't recognized.
 */
export function exposeHaxeClasses(text) {
	const sites = [...text.matchAll(/([A-Za-z$_][\w$]*)\["com\.watabou\.[^"]*"\]=/g)];
	const boot = text.match(/([A-Za-z$_][\w$]*)\.main\(\)\}\)\(/);
	// Require a single, unambiguous bootstrap call site to splice into.
	if (!sites.length || !boot || text.split(".main()})(").length - 1 !== 1) return null;
	const freq = {};
	for (const m of sites) freq[m[1]] = (freq[m[1]] || 0) + 1;
	const registry = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
	const inject = `${boot[1]}.main(),(typeof window!="undefined"?window:self).__maphubClasses=${registry}})(`;
	return text.replace(boot[0], inject);
}

export class GeneratorFetcher {
	static _blobs = [];

	static get manifests() { return MANIFESTS; }
	static hasManifest(type) { return !!MANIFESTS[type]; }
	static fetchedBase(type) { return `${FETCH_ROOT}/${type}`; }

	/** True once this generator's JS + assets have been downloaded (marker present). */
	static async isDownloaded(type) {
		try {
			const FP = FilePickerImpl();
			const r = await FP.browse("data", this.fetchedBase(type));
			return (r.files || []).some((f) => f.split("/").pop() === MARKER);
		} catch { return false; }
	}

	/** Bundled-build JS path per generator (present only in the FULL package, not the lean one). */
	static _bundledJs = { realm: "js/Perilous.js", dungeon: "js/Dungeon.js", cave: "js/Cave.js", mfcg: "js/mfcg-raw/mfcg.js", village: "js/village-raw/Village.js", dwellings: "js/dwellings-raw/Dwellings.js" };

	/** True if this generator's bundled build is shipped (full package). */
	static async bundleExists(type) {
		const rel = this._bundledJs[type];
		if (!rel) return false;
		// Use FilePicker's real file listing, NOT fetch HEAD: some servers answer HEAD
		// 200 for missing files, which would falsely report a bundle present on the lean
		// build and skip the first-use download.
		const parts = `scripts/maphub/${rel}`.split("/");
		const file = parts.pop();
		const dir = `modules/${MODULE_ID}/${parts.join("/")}`;
		try {
			const FP = FilePickerImpl();
			const r = await FP.browse("data", dir);
			return (r.files || []).some((f) => f.split("/").pop() === file);
		} catch { return false; }
	}

	/**
	 * Ensure a generator can run: true if already downloaded or bundled; otherwise
	 * (lean install, first use) prompt for a one-time download. Returns false if the
	 * user cancels.
	 */
	static async ensureAvailable(type) {
		if (!this.hasManifest(type)) return true;
		if (await this.isDownloaded(type)) return true;
		if (await this.bundleExists(type)) return true;
		const NAMES = { realm: "Realm — Perilous Shores", dungeon: "One Page Dungeon", mfcg: "City — Medieval Fantasy City", village: "Village", dwellings: "Dwellings", cave: "Cave / Glade" };
		const name = NAMES[type] ?? type;
		const DialogV2 = foundry.applications.api.DialogV2;
		let choice = "cancel";
		try {
			choice = await DialogV2.wait({
				window: { title: "Cartomancer — Download Generator", icon: "fas fa-cloud-arrow-down" },
				content: `<p>The <b>${name}</b> generator needs a one-time download (~1–1.5&nbsp;MB) from <code>watabou.github.io</code> before it can run. Afterwards it works locally and offline.</p><p>Download it now?</p>`,
				buttons: [
					{ action: "one", label: "Download", icon: "fas fa-cloud-arrow-down", default: true },
					{ action: "all", label: "Download All" },
					{ action: "cancel", label: "Cancel", icon: "fas fa-xmark" },
				],
			});
		} catch { choice = "cancel"; }
		if (choice === "cancel" || !choice) return false;
		ui.notifications.info(`Cartomancer: downloading ${name}…`);
		try {
			if (choice === "all") await this.downloadAll((i, n, t) => { if (t && t !== "done") ui.notifications.info(`Cartomancer: downloading ${NAMES[t] ?? t}… (${i + 1}/${n})`); });
			else await this.downloadGenerator(type);
			ui.notifications.info("Cartomancer: generators ready.");
			return await this.isDownloaded(type);
		} catch (e) { ui.notifications.error(`Cartomancer: download failed — ${e?.message || e}`); return false; }
	}

	/**
	 * Download a generator from watabou.github.io into local data, applying our hooks.
	 * JS is saved as `<name>.txt` (FilePicker rejects .js); the loader inlines it at run.
	 */
	static async downloadGenerator(type, onProgress) {
		const m = MANIFESTS[type];
		if (!m) throw new Error(`No fetch manifest for generator "${type}".`);
		const base = this.fetchedBase(type);
		const live = `${WATABOU}/${m.slug}`;
		const assetDir = `${base}/${m.assetDir}`;
		const total = m.js.length + m.assets.length + 1;
		let done = 0;
		const tick = (label) => { done++; try { onProgress?.(done, total, label); } catch {} };
		const savedAssets = [];
		const renamed = {};   // blocked asset name -> saved .txt name (FilePicker rejects e.g. .json5)

		await ensureDir(assetDir);

		// 1) Fetch + hook-patch JS into memory (uploaded LAST, after any manifest renames).
		const jsParts = [];
		for (const j of m.js) {
			const res = await fetch(`${live}/${j.from}`, { mode: "cors" });
			if (!res.ok) throw new Error(`Could not fetch ${j.from} (${res.status}).`);
			let text = await res.text();
			if (j.patch) {
				if (j.patch.exposeClasses) {
					const patched = exposeHaxeClasses(text);
					if (!patched) {
						throw new Error(`Could not expose Haxe classes in ${j.from} — Watabou may have changed the bootstrap; the patch needs an update.`);
					}
					text = patched;
				} else {
					if (!text.includes(j.patch.anchor)) {
						throw new Error(`Hook anchor not found in ${j.from} — Watabou may have updated this generator; the patch needs an update.`);
					}
					text = text.replace(j.patch.anchor, j.patch.replace);
				}
			}
			jsParts.push({ j, text });
		}

		// 2) Assets — fetch + upload. FilePicker rejects some extensions (e.g. .json5);
		//    for those, save the content as <name>.txt and remember to repoint the manifest.
		for (const a of m.assets) {
			try {
				const res = await fetch(`${live}/${m.assetDir}/${a}`, { mode: "cors" });
				if (!res.ok) { console.warn(`${MODULE_ID} | asset ${a} returned ${res.status}`); tick(a); continue; }
				const blob = await res.blob();
				const blocked = /\.json5$/i.test(a); if (!blocked && await uploadFile(assetDir, a, blob, blob.type || "application/octet-stream")) {
					savedAssets.push(a);
				} else {
					const asTxt = `${a}.txt`;
					if (await uploadFile(assetDir, asTxt, await blob.text(), "text/plain")) {
						savedAssets.push(asTxt); renamed[a] = asTxt;
					} else {
						console.warn(`${MODULE_ID} | asset ${a} rejected by FilePicker even as .txt`);
					}
				}
			} catch (e) { console.warn(`${MODULE_ID} | asset ${a} failed`, e); }
			tick(a);
		}

		// 3) Repoint the JS asset manifest for any renamed assets, then upload the JS as <name>.txt.
		//    Manifest paths are Haxe-serialized, length-prefixed + URL-encoded, e.g.
		//    `y21:Assets%2Fgothic.json5`; appending `.txt` adds 4 to the length prefix.
		for (const { j, text } of jsParts) {
			let out = text;
			for (const orig of Object.keys(renamed)) {
				const esc = orig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				out = out.replace(new RegExp(`y(\\d+):(${m.assetDir}%2F${esc})`),
					(_mm, num, path) => `y${parseInt(num, 10) + 4}:${path}.txt`);
			}
			if (!(await uploadFile(base, `${j.name}.txt`, out, "text/plain"))) {
				throw new Error(`Foundry rejected upload of ${j.name}.txt.`);
			}
			tick(j.name);
		}

		// 4) marker — drives isDownloaded(); records what landed, the module rev, + any renames.
		await uploadFile(base, MARKER, JSON.stringify({
			type, slug: m.slug, genRev: genRev(type), js: m.js.map((j) => j.name), assets: savedAssets, renamed,
		}, null, 2), "application/json");
		tick(MARKER);

		return { type, base, files: total, assetsSaved: savedAssets.length, assetsTotal: m.assets.length, renamed: Object.keys(renamed) };
	}

	/**
	 * Build a runnable blob: URL for a downloaded generator — our shipped loader with
	 * the fetched JS inlined, a <base href> to the local assets, and the seed shim.
	 * Returns null if the generator isn't downloaded.
	 */
	static async buildFetchedSrc(type, queryString) {
		const m = MANIFESTS[type];
		if (!m || !(await this.isDownloaded(type))) return null;
		const baseDir = `${window.location.origin}/${this.fetchedBase(type)}/`;
		const cb = (queryString ? "&" : "") + "";

		// our shipped loader
		let html = await (await fetch(`/modules/${MODULE_ID}/scripts/maphub/${m.bundleDir}/index.html?cb=${this._cacheBust()}`)).text();

		// The loader uses ../../ relative paths (js, fonts). Under the blob's <base href>
		// those resolve wrong, so make them absolute to the shipped module files (the fonts
		// ship with the lean build; the js gets inlined just below).
		html = html.split("../../").join(`/modules/${MODULE_ID}/scripts/maphub/`);

		// inline each fetched JS (.txt) in place of its <script src=...>
		for (const j of m.js) {
			const jsText = await (await fetch(`${this.fetchedBase(type)}/${j.name}.txt?cb=${this._cacheBust()}`)).text();
			const safe = jsText.replace(/<\/script>/gi, "<\\/script>");
			const esc = j.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const re = new RegExp(`<script[^>]*src="[^"]*${esc}"[^>]*></script>`, "i");
			if (re.test(html)) html = html.replace(re, () => `<script>${safe}</script>`);
			else html = html.replace(/<\/body>/i, () => `<script>${safe}</script></body>`);
		}

		// <base href> (for assets) + seed shim (the blob has no query string of its own)
		const shim = queryString
			? `<script>(function(){try{var q=${JSON.stringify(queryString).replace(/</g, "\\u003c")};var N=window.URLSearchParams;function P(i){if(i==null||i===""||i===window.location.search){i=q;}return new N(i);}P.prototype=N.prototype;window.URLSearchParams=P;}catch(e){}})();</script>`
			: "";
		html = html.replace(/<head([^>]*)>/i, (_m, a) => `<head${a}><base href="${baseDir}">${shim}`);

		const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
		this._blobs.push(url);
		return url;
	}

	static _cacheBust() { return Math.floor(performance.now()); }

	static revokeBlobs() { for (const u of this._blobs.splice(0)) { try { URL.revokeObjectURL(u); } catch {} } }

	/** Download every generator that has a manifest. */
	static async downloadAll(onProgress) {
		const types = Object.keys(MANIFESTS);
		const results = [];
		for (let i = 0; i < types.length; i++) {
			onProgress?.(i, types.length, types[i]);
			try { results.push(await this.downloadGenerator(types[i])); }
			catch (e) { console.error(`${MODULE_ID} | downloadGenerator(${types[i]}) failed`, e); results.push({ type: types[i], error: String(e?.message || e) }); }
		}
		onProgress?.(types.length, types.length, "done");
		return results;
	}

	/** Read a downloaded generator's marker JSON, or null if absent/unreadable. */
	static async readMarker(type) {
		try {
			const res = await fetch(`/${this.fetchedBase(type)}/${MARKER}?cb=${this._cacheBust()}`);
			if (!res.ok) return null;
			return await res.json();
		} catch { return null; }
	}

	/**
	 * Downloaded generators whose marker revision trails the module's current GEN_REV —
	 * i.e. the module shipped a refresh they haven't re-fetched. Returns [{type, from, to}].
	 * Local-only: reads the on-disk marker, never polls watabou.github.io.
	 */
	static async staleDownloaded() {
		const out = [];
		for (const type of Object.keys(MANIFESTS)) {
			const want = genRev(type);
			if (want <= 0) continue;
			if (!(await this.isDownloaded(type))) continue;
			const have = Number((await this.readMarker(type))?.genRev) || 0;
			if (have < want) out.push({ type, from: have, to: want });
		}
		return out;
	}

	/**
	 * GM-only, fired once on ready: if the module shipped a generator refresh an existing
	 * downloader hasn't fetched, offer to re-download. Gated on the `acknowledgedGenRev`
	 * setting so a "Later" isn't re-nagged until the next module bump. No network until the
	 * GM accepts — the stale check is purely local.
	 */
	static async promptStaleRefresh() {
		if (!game.user?.isGM) return;
		let stale;
		try { stale = await this.staleDownloaded(); }
		catch (e) { console.error(`${MODULE_ID} | staleDownloaded failed`, e); return; }
		if (!stale.length) return;

		const ack = game.settings.get(MODULE_ID, "acknowledgedGenRev") || {};
		const pending = stale.filter((s) => (Number(ack[s.type]) || 0) < s.to);
		if (!pending.length) return;

		const NAMES = { realm: "Realm — Perilous Shores", dungeon: "One Page Dungeon", mfcg: "City — Medieval Fantasy City", village: "Village", dwellings: "Dwellings", cave: "Cave / Glade" };
		const list = pending.map((s) => `<li>${NAMES[s.type] ?? s.type}</li>`).join("");
		const DialogV2 = foundry.applications.api.DialogV2;
		let choice = "later";
		try {
			choice = await DialogV2.wait({
				window: { title: "Cartomancer — Generator update", icon: "fas fa-cloud-arrow-down" },
				position: { width: 460 },
				content: `<div style="line-height:1.4;">`
					+ `<p>Cartomancer ships a refreshed build of these generator(s):</p>`
					+ `<ul style="margin:.5rem 0;">${list}</ul>`
					+ `<p>Re-download the latest from <code>watabou.github.io</code>? Your current copy keeps working either way.</p></div>`,
				buttons: [
					{ action: "update", label: "Update now", icon: "fas fa-cloud-arrow-down", default: true },
					{ action: "later", label: "Later", icon: "fas fa-clock" },
				],
				rejectClose: false,
			});
		} catch { choice = "later"; }

		if (choice !== "update") {
			// Stop nagging for THIS rev; the next GEN_REV bump re-arms the prompt.
			const next = { ...ack };
			for (const s of pending) next[s.type] = s.to;
			try { await game.settings.set(MODULE_ID, "acknowledgedGenRev", next); } catch {}
			return;
		}

		ui.notifications.info("Cartomancer: updating generator(s)…");
		const done = [], failed = [];
		for (const s of pending) {
			// A successful re-download re-stamps marker.genRev → no longer stale. A failed one
			// stays stale and un-acked, so it re-prompts next load (retry) rather than silently sticking.
			try { await this.downloadGenerator(s.type); done.push(s.type); }
			catch (e) { console.error(`${MODULE_ID} | refresh ${s.type} failed`, e); failed.push(s.type); }
		}
		ui.notifications[failed.length ? "warn" : "info"](
			`Cartomancer: updated ${done.length}/${pending.length} generator(s)${failed.length ? ` (failed: ${failed.join(", ")})` : ""}.`
		);
	}
}
