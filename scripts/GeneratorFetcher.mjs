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
 * Coverage: realm, dungeon, city (mfcg), village, dwellings are Watabou's own
 * single-file builds (our bundle = live + a tiny hook) → fetchable. CAVE is NOT here:
 * our cave bundle is the third-party voluminor/maphub fork (ES-module split build),
 * which is not hosted on watabou.github.io, so it stays bundled.
 */

const MODULE_ID = "cartomancer";
const WATABOU = "https://watabou.github.io";
export const FETCH_ROOT = "cartomancer-generators";   // under Data/
const MARKER = "_cartomancer.json";                   // download-complete marker (allowed ext)

const FilePickerImpl = () => foundry.applications.apps.FilePicker?.implementation ?? globalThis.FilePicker;

/**
 * Per-generator fetch manifest.
 * - slug:      watabou.github.io path segment.
 * - bundleDir: our shipped index.html loader dir (scripts/maphub/<bundleDir>/index.html).
 * - js:        [{ name, from, patch? }] — `from` is the live filename, `name` the local
 *              basename; saved as `<name>.txt`; `patch` = {anchor, replace} (our hook).
 * - assetDir:  case the generator expects ("Assets" or "assets").
 * - assets:    data files under <live>/<assetDir>/ (fonts/favicons omitted — cosmetic;
 *              .woff would be blocked by FilePicker anyway).
 */
const MANIFESTS = {
	realm: {
		slug: "perilous-shores", bundleDir: "to/realm", assetDir: "Assets",
		js: [{ name: "Perilous.js", from: "Perilous.js", patch: {
			anchor: "R.main()})(",
			replace: 'R.main(),(typeof window!="undefined"?window:self).__maphubClasses=h})(',
		} }],
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
				if (!text.includes(j.patch.anchor)) {
					throw new Error(`Hook anchor not found in ${j.from} — Watabou may have updated this generator; the patch needs an update.`);
				}
				text = text.replace(j.patch.anchor, j.patch.replace);
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
				if (await uploadFile(assetDir, a, blob, blob.type || "application/octet-stream")) {
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

		// 4) marker — drives isDownloaded(); records what landed + any renames.
		await uploadFile(base, MARKER, JSON.stringify({
			type, slug: m.slug, js: m.js.map((j) => j.name), assets: savedAssets, renamed,
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
}
