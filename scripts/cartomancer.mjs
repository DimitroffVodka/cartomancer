import { MODULE_ID } from "./constants.mjs";
import { registerMaphubHooks } from "./MaphubSD.mjs";

/** Open the map-generator launcher. GM only. */
export async function openLauncher() {
	if (!game.user?.isGM) { ui.notifications.warn("Only a GM can open map generators."); return; }
	const { MaphubLauncherApp } = await import("./MaphubLauncherApp.mjs");
	new MaphubLauncherApp().render(true);
}

/** Open the DungeonDraft pack manager (import / enable / remove decor packs). GM only. */
export async function openDDPackSettings() {
	if (!game.user?.isGM) { ui.notifications.warn("Only a GM can manage decor packs."); return; }
	const { DDPackSettingsApp } = await import("./DDPackSettingsAppSD.mjs");
	new DDPackSettingsApp().render(true);
}

/** Open the decor browser (browse imported DungeonDraft decor, place on a scene). GM-only singleton. */
export async function openDecorBrowser() {
	if (!game.user?.isGM) { ui.notifications.warn("Only a GM can open the Decor Browser."); return; }
	const { DecorBrowserApp } = await import("./DecorBrowserApp.mjs");
	(DecorBrowserApp._instance ??= new DecorBrowserApp()).render(true);
}

/**
 * Open the "Download Generators" dialog (fetch-on-first-use). GM only.
 * Downloads Watabou's generators from watabou.github.io into local data so the module
 * runs them without bundling Watabou's code. Cave stays bundled (not published there).
 */
export async function openGeneratorDownloader() {
	if (!game.user?.isGM) { ui.notifications.warn("Only a GM can download generators."); return; }
	const { GeneratorFetcher } = await import("./GeneratorFetcher.mjs");
	const NAMES = { realm: "Realm — Perilous Shores", dungeon: "One Page Dungeon", mfcg: "City — Medieval Fantasy City", village: "Village", dwellings: "Dwellings" };
	const types = Object.keys(GeneratorFetcher.manifests);
	const rows = [];
	for (const t of types) {
		const dl = await GeneratorFetcher.isDownloaded(t);
		rows.push(`<li style="padding:2px 0;">${dl ? "✅" : "⬇️"} ${NAMES[t] ?? t}${dl ? ' <em style="opacity:.6;">(downloaded)</em>' : ""}</li>`);
	}
	const content = `<div style="line-height:1.4;">
		<p>Download Watabou's map generators from <code>watabou.github.io</code> into your local data. One-time (~1–1.5&nbsp;MB each); afterwards they run entirely locally and offline, with all import features intact.</p>
		<ul style="list-style:none;padding-left:.25rem;margin:.5rem 0;">${rows.join("")}</ul>
		<p style="opacity:.7;font-size:.9em;">Cave / Glade is bundled with the module (its build isn't published on watabou.github.io) and works without downloading.</p>
	</div>`;
	const DialogV2 = foundry.applications.api.DialogV2;
	await DialogV2.wait({
		window: { title: "Cartomancer — Download Generators", icon: "fas fa-cloud-arrow-down" },
		position: { width: 460 },
		content,
		buttons: [
			{
				action: "all", label: "Download All", icon: "fas fa-cloud-arrow-down", default: true,
				callback: async () => {
					ui.notifications.info("Cartomancer: downloading generators from watabou.github.io…");
					const res = await GeneratorFetcher.downloadAll((i, n, t) => {
						if (t && t !== "done") ui.notifications.info(`Cartomancer: downloading ${NAMES[t] ?? t}… (${i + 1}/${n})`);
					});
					const ok = res.filter((r) => !r.error);
					const bad = res.filter((r) => r.error);
					ui.notifications[bad.length ? "warn" : "info"](
						`Cartomancer: downloaded ${ok.length}/${res.length} generators${bad.length ? ` (failed: ${bad.map((b) => b.type).join(", ")})` : ""}. They now run locally + offline.`
					);
				},
			},
			{ action: "close", label: "Close", icon: "fas fa-xmark" },
		],
	});
}

Hooks.once("init", () => {
	game.settings.register(MODULE_ID, "settlement.useLocalMaphub", {
		name: "Use bundled (local) generators",
		hint: "Run the bundled Watabou generators from inside Foundry — required for scene/wall/level import (the hosted pages can't be captured cross-origin). Turn off to load watabou.github.io directly (view-only).",
		scope: "world", config: true, type: Boolean, default: true,
	});
	game.settings.register(MODULE_ID, "openGeneratorsDetached", {
		name: "Open generators in a detached window",
		hint: "Pop each map generator into its own window when opened. Avoids Foundry's core 'Detach Window' control later reloading (and regenerating) a map you've already worked on.",
		scope: "client", config: true, type: Boolean, default: false,
	});
	// DungeonDraft decor packs (no packs are bundled — users import their own).
	game.settings.register(MODULE_ID, "decorDungeondraftPacks", {
		scope: "world", config: false, type: Array, default: [],
	});
	game.settings.registerMenu(MODULE_ID, "decorDungeondraftPacksMenu", {
		name: "DungeonDraft Decor Packs",
		label: "Manage Packs",
		hint: "Import DungeonDraft (.dungeondraft_pack) object packs and use their decor on your maps. No packs are bundled.",
		icon: "fas fa-cubes",
		restricted: true,
		type: class extends foundry.applications.api.ApplicationV2 {
			static DEFAULT_OPTIONS = { id: "cartomancer-ddpack-menu-stub", window: { title: "" } };
			async render() { openDDPackSettings(); return this; }
		},
	});
	game.settings.registerMenu(MODULE_ID, "downloadGeneratorsMenu", {
		name: "Map Generators",
		label: "Download Generators",
		hint: "Download Watabou's map generators from watabou.github.io into local data (one-time per generator). Afterwards they run locally + offline.",
		icon: "fas fa-cloud-arrow-down",
		restricted: true,
		type: class extends foundry.applications.api.ApplicationV2 {
			static DEFAULT_OPTIONS = { id: "cartomancer-downloadgen-menu-stub", window: { title: "" } };
			async render() { openGeneratorDownloader(); return this; }
		},
	});
});

Hooks.once("ready", async () => {
	try { registerMaphubHooks(); } catch (e) { console.error(`${MODULE_ID} | registerMaphubHooks failed`, e); }
	// Realm import: one delegated listener powers every "Generate this map" button.
	try {
		const { RealmImporter } = await import("./RealmImporter.mjs");
		RealmImporter.registerHooks();
		const { GeneratorFetcher } = await import("./GeneratorFetcher.mjs");
		const mod = game.modules.get(MODULE_ID);
		if (mod) mod.api = {
			openLauncher, openDDPackSettings, openDecorBrowser, openGeneratorDownloader,
			importRealm: (data, opts) => RealmImporter.importRealm(data, opts),
			generateLocationFromJournal: (je) => RealmImporter.generateLocationFromJournal(je),
			// Fetch-on-first-use: download generators from watabou.github.io into local data.
			downloadGenerator: (t, cb) => GeneratorFetcher.downloadGenerator(t, cb),
			downloadAllGenerators: (cb) => GeneratorFetcher.downloadAll(cb),
			isGeneratorDownloaded: (t) => GeneratorFetcher.isDownloaded(t),
		};
	} catch (e) {
		console.error(`${MODULE_ID} | RealmImporter wiring failed`, e);
		const mod = game.modules.get(MODULE_ID);
		if (mod) mod.api = { openLauncher, openDDPackSettings, openDecorBrowser };
	}
	console.log(`${MODULE_ID} | ready — api: openLauncher(), openDDPackSettings(), openDecorBrowser(), importRealm()`);
});

// Launch surface: a GM-only momentary BUTTON tool added to the existing Tokens
// control group. It must NOT be that group's active tool — core's #onChangeTool
// early-returns when the clicked tool IS the active tool (`tool === this.tool`),
// which is why a stand-alone control whose activeTool was the launcher only fired
// once. As a button inside Tokens (active tool stays "select"), it re-fires on
// every click. v13/v14 pass `controls` as an object keyed by control name; each
// control's `tools` is also an object (older builds used arrays — handle both).
Hooks.on("getSceneControlButtons", (controls) => {
	if (!game.user?.isGM) return;
	try {
		const group = controls?.tokens
			?? (Array.isArray(controls) ? controls.find(c => c.name === "tokens") : Object.values(controls || {})[0]);
		if (!group?.tools) return;
		const tool = {
			name: "cartomancer-launcher",
			title: "Cartomancer — Map Generators",
			icon: "fas fa-compass-drafting",
			button: true,
			order: 900,
			visible: true,
			onChange: () => openLauncher(),
		};
		const decorTool = {
			name: "cartomancer-decor",
			title: "Cartomancer — Decor Browser",
			icon: "fas fa-shapes",
			button: true,
			order: 901,
			visible: true,
			onChange: () => openDecorBrowser(),
		};
		if (Array.isArray(group.tools)) group.tools.push(tool, decorTool);
		else { group.tools[tool.name] = tool; group.tools[decorTool.name] = decorTool; }
	} catch (e) { console.error(`${MODULE_ID} | getSceneControlButtons failed`, e); }
});
