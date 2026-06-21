import { MODULE_ID } from "./constants.mjs";
import { registerMaphubHooks } from "./MaphubSD.mjs";

/** Open the map-generator launcher. */
export async function openLauncher() {
	const { MaphubLauncherApp } = await import("./MaphubLauncherApp.mjs");
	new MaphubLauncherApp().render(true);
}

/** Open the DungeonDraft pack manager (import / enable / remove decor packs). */
export async function openDDPackSettings() {
	const { DDPackSettingsApp } = await import("./DDPackSettingsAppSD.mjs");
	new DDPackSettingsApp().render(true);
}

Hooks.once("init", () => {
	game.settings.register(MODULE_ID, "settlement.useLocalMaphub", {
		name: "Use bundled (local) generators",
		hint: "Run the bundled Watabou generators from inside Foundry — required for scene/wall/level import (the hosted pages can't be captured cross-origin). Turn off to load watabou.github.io directly (view-only).",
		scope: "world", config: true, type: Boolean, default: true,
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
});

Hooks.once("ready", () => {
	try { registerMaphubHooks(); } catch (e) { console.error(`${MODULE_ID} | registerMaphubHooks failed`, e); }
	const mod = game.modules.get(MODULE_ID);
	if (mod) mod.api = { openLauncher, openDDPackSettings };
	console.log(`${MODULE_ID} | ready — api: openLauncher(), openDDPackSettings()`);
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
		if (Array.isArray(group.tools)) group.tools.push(tool);
		else group.tools[tool.name] = tool;
	} catch (e) { console.error(`${MODULE_ID} | getSceneControlButtons failed`, e); }
});
