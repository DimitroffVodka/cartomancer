import { MODULE_ID } from "./constants.mjs";
import { registerMaphubHooks } from "./MaphubSD.mjs";

/** Open the map-generator launcher. */
export async function openLauncher() {
	const { MaphubLauncherApp } = await import("./MaphubLauncherApp.mjs");
	new MaphubLauncherApp().render(true);
}

Hooks.once("init", () => {
	game.settings.register(MODULE_ID, "settlement.useLocalMaphub", {
		name: "Use bundled (local) generators",
		hint: "Run the bundled Watabou generators from inside Foundry — required for scene/wall/level import (the hosted pages can't be captured cross-origin). Turn off to load watabou.github.io directly (view-only).",
		scope: "world", config: true, type: Boolean, default: true,
	});
});

Hooks.once("ready", () => {
	try { registerMaphubHooks(); } catch (e) { console.error(`${MODULE_ID} | registerMaphubHooks failed`, e); }
	const mod = game.modules.get(MODULE_ID);
	if (mod) mod.api = { openLauncher };
	console.log(`${MODULE_ID} | ready — game.modules.get("${MODULE_ID}").api.openLauncher()`);
});

// Primary launch surface: a GM-only Scene Controls group. v13/v14 pass `controls`
// as an object keyed by control name; each control's `tools` is also an object.
Hooks.on("getSceneControlButtons", (controls) => {
	if (!game.user?.isGM) return;
	try {
		controls[MODULE_ID] = {
			name: MODULE_ID,
			title: "Cartomancer",
			icon: "fas fa-compass-drafting",
			order: 100,
			visible: true,
			activeTool: "launcher",
			tools: {
				launcher: {
					name: "launcher",
					title: "Map Generators",
					icon: "fas fa-wand-magic-sparkles",
					order: 1,
					button: true,
					visible: true,
					onChange: () => openLauncher(),
					onClick: () => openLauncher(),
				},
			},
		};
	} catch (e) { console.error(`${MODULE_ID} | getSceneControlButtons failed`, e); }
});
