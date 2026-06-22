import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GeneratorFetcher } from "../scripts/GeneratorFetcher.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each generator bundle is patched to expose a live-controller global the importer reads
// back (`__maphubClasses` / `__sdxDungeonView` / `__sdxDwellView`). If a future Watabou
// build shifts the patch anchor, or the global is dropped, imports SILENTLY fall back to a
// flat image. These tests lock that contract on both paths: the fetch-on-first-use
// manifests, and the shipped offline bundles.
const MARKERS = {
	realm: "__maphubClasses",
	dungeon: "__sdxDungeonView",
	dwellings: "__sdxDwellView",
	cave: "__maphubClasses",
};

test("fetch manifests inject the expected exposure global", () => {
	const m = GeneratorFetcher.manifests;
	for (const [type, marker] of Object.entries(MARKERS)) {
		const patch = (m[type]?.js || []).find((j) => j.patch)?.patch;
		assert.ok(patch, `${type}: expected a patched js entry in the manifest`);
		assert.ok(patch.anchor?.length > 0, `${type}: patch.anchor is missing`);
		assert.notEqual(patch.replace, patch.anchor, `${type}: replace must differ from anchor`);
		assert.ok(patch.replace.includes(marker), `${type}: patch must inject ${marker}`);
	}
});

test("mfcg and village ship byte-identical to live (no patch)", () => {
	const m = GeneratorFetcher.manifests;
	for (const type of ["mfcg", "village"]) {
		const patched = (m[type]?.js || []).some((j) => j.patch);
		assert.equal(patched, false, `${type}: expected no patch (kept byte-identical to live)`);
	}
});

// The runtime bundle each generator actually loads (note dwellings loads dwellings-raw/,
// not the legacy js/Dwellings.js) must already carry the injected global.
const BUNDLES = {
	dungeon: "scripts/maphub/js/Dungeon.js",
	realm: "scripts/maphub/js/Perilous.js",
	cave: "scripts/maphub/js/Cave.js",
	dwellings: "scripts/maphub/js/dwellings-raw/Dwellings.js",
};

test("shipped bundles are patched with their exposure global", () => {
	for (const [type, rel] of Object.entries(BUNDLES)) {
		const src = readFileSync(join(root, rel), "utf8");
		assert.ok(src.includes(MARKERS[type]), `${rel}: missing ${MARKERS[type]} — import contract broken`);
	}
});
