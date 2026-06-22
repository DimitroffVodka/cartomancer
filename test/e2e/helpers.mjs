// Shared E2E helpers. The import logic runs inside the browser via page.evaluate and
// mirrors the module's real entry path (construct MaphubViewerApp, render, import) — the
// same sequence verified ad-hoc through the Foundry MCP bridge.

const EXTERNAL = {
	dungeon: "https://watabou.github.io/one-page-dungeon/",
	dwellings: "https://watabou.github.io/dwellings/",
	cave: "https://watabou.github.io/cave-generator/",
};

/** Wait for game.ready on the current page. */
export async function waitForGameReady(page) {
	await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 90_000 });
}

/** Keep generators docked (iframe in the main window) so import can read them. */
export async function setDetached(page, value) {
	await page.evaluate((v) => game.settings.set("cartomancer", "openGeneratorsDetached", v), value);
}

/**
 * Open a generator, run a real import, and return a plain snapshot of the created Scene
 * (or null if none was created — e.g. a silent fallback). Mirrors the production flow.
 */
export async function importGenerator(page, type) {
	return await page.evaluate(async ({ genType, external }) => {
		const { MaphubViewerApp } = await import("/modules/cartomancer/scripts/MaphubViewerApp.mjs");
		const app = new MaphubViewerApp({ type: genType, queryString: "", externalBase: external });
		await app.render(true);
		const ctrlKey = genType === "dungeon" ? "__sdxDungeonView" : (genType === "dwellings" ? "__sdxDwellView" : "__maphubClasses");
		for (let i = 0; i < 120; i++) {
			const cw = app._iframe?.contentWindow;
			const cnv = app._iframe?.contentDocument?.querySelector("canvas");
			if (cw?.[ctrlKey] && (cnv?.width || 0) > 0) break;
			await new Promise((r) => setTimeout(r, 300));
		}
		if (genType === "dwellings") {
			for (let i = 0; i < 30 && !app._getDwellDoubleGrid?.(); i++) await new Promise((r) => setTimeout(r, 400));
		}
		const before = new Set(game.scenes.map((s) => s.id));
		await app._importScene();
		const s = game.scenes.find((x) => !before.has(x.id));
		if (!s) return null;
		return {
			id: s.id, name: s.name,
			gridType: s.grid.type, gridSize: s.grid.size,
			width: s.width, height: s.height,
			walls: s.walls.size, levels: s.levels?.size ?? 0, regions: s.regions?.size ?? 0,
		};
	}, { genType: type, external: EXTERNAL[type] });
}

/** Delete a scene created by a test (cleanup). */
export async function deleteScene(page, id) {
	if (!id) return;
	await page.evaluate((sid) => (game.scenes.get(sid) ? Scene.deleteDocuments([sid]) : null), id);
}
