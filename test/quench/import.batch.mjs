/**
 * Cartomancer in-client integration tests (Quench batch).
 *
 * These run inside a live Foundry client — real documents, real OpenFL generators — the
 * layer the node:test suite can't reach (capture, walls, levels, grid alignment). They are
 * registered only when the Quench module is active (dev-only; see the `quenchReady` hook in
 * scripts/cartomancer.mjs), so they never load for normal users.
 *
 * Run them from the Quench UI (beaker icon in the sidebar) or `quench.runAllBatches()`.
 * Each test creates a real Scene and deletes it in afterEach, leaving the world unchanged.
 * Imports take several seconds, so per-test timeouts are raised above Mocha's 2s default.
 */

const VIEWER = "/modules/cartomancer/scripts/MaphubViewerApp.mjs";
const EXTERNAL = {
	dungeon: "https://watabou.github.io/one-page-dungeon/",
	dwellings: "https://watabou.github.io/dwellings/",
};

/** Open a generator viewer (docked) and wait for its patched controller + a painted canvas. */
async function openGenerator(type) {
	const { MaphubViewerApp } = await import(VIEWER);
	const app = new MaphubViewerApp({ type, queryString: "", externalBase: EXTERNAL[type] });
	await app.render(true);
	app.close = async () => app; // keep alive so a test can import the same map twice
	const ctrlKey = type === "dungeon" ? "__sdxDungeonView" : "__sdxDwellView";
	for (let i = 0; i < 100; i++) {
		const cw = app._iframe?.contentWindow;
		const cnv = app._iframe?.contentDocument?.querySelector("canvas");
		if (cw?.[ctrlKey] && (cnv?.width || 0) > 0) break;
		await new Promise((r) => setTimeout(r, 300));
	}
	return app;
}

/** Run the real import and return the Scene it created (by diffing the collection). */
async function importNew(app) {
	const before = new Set(game.scenes.map((s) => s.id));
	await app._importScene();
	return game.scenes.find((s) => !before.has(s.id)) ?? null;
}

export function registerImportBatches(quench) {
	quench.registerBatch(
		"cartomancer.import",
		(context) => {
			const { describe, it, assert, before, after, afterEach } = context;
			const apps = [];
			const created = [];
			let prevDetached;

			before(async function () {
				prevDetached = game.settings.get("cartomancer", "openGeneratorsDetached");
				await game.settings.set("cartomancer", "openGeneratorsDetached", false); // keep iframe in-window
			});
			after(async function () {
				await game.settings.set("cartomancer", "openGeneratorsDetached", prevDetached);
			});
			afterEach(async function () {
				this.timeout(20000);
				for (const app of apps.splice(0)) { try { delete app.close; await app.close(); } catch (_) { /* ignore */ } }
				if (created.length) { try { await Scene.deleteDocuments(created.splice(0)); } catch (_) { /* ignore */ } }
			});

			const track = (app) => { apps.push(app); return app; };
			const keep = (scene) => { if (scene) created.push(scene.id); return scene; };

			describe("One Page Dungeon → scene", function () {
				it("imports as a SQUARE-grid battlemap with walls", async function () {
					this.timeout(60000);
					const app = track(await openGenerator("dungeon"));
					assert.ok(app._iframe?.contentWindow?.__sdxDungeonView, "generator controller is live");
					const scene = keep(await importNew(app));
					assert.ok(scene, "a scene was created (did not silently fail)");
					assert.equal(scene.grid.type, CONST.GRID_TYPES.SQUARE, "battlemap → square grid");
					assert.isAtLeast(scene.grid.size, 64, "grid.size clamped to >= 64");
					assert.isAtMost(scene.grid.size, 160, "grid.size clamped to <= 160");
					assert.isAbove(scene.walls.size, 0, "walls were imported");
					assert.isAbove(scene.width, 0);
					assert.isAbove(scene.height, 0);
				});

				it("Small Tiles imports ~2x the grid cells of normal (same dungeon)", async function () {
					this.timeout(120000);
					const app = track(await openGenerator("dungeon"));
					const view = app._iframe.contentWindow.__sdxDungeonView;
					assert.equal(app._getDungeonGridScale(), 1, "starts at normal density");
					const normal = keep(await importNew(app));
					view.toggleSmallTiles();
					await new Promise((r) => setTimeout(r, 700));
					assert.equal(app._getDungeonGridScale(), 2, "Small Tiles is now on");
					const small = keep(await importNew(app));
					const cells = (s) => s.width / s.grid.size;
					assert.closeTo(cells(small) / cells(normal), 2, 0.2, "Small Tiles ~ 2x cells across the same map");
				});
			});

			describe("Dwellings → multi-level scene", function () {
				it("imports levels, walls, and stair regions (not the flat fallback)", async function () {
					this.timeout(90000);
					const app = track(await openGenerator("dwellings"));
					for (let i = 0; i < 30 && !app._getDwellDoubleGrid(); i++) await new Promise((r) => setTimeout(r, 400));
					assert.isTrue(app._getDwellDoubleGrid(), "Double Grid defaults on at open");
					const scene = keep(await importNew(app));
					assert.ok(scene, "a scene was created");
					assert.isAbove(scene.levels?.size ?? 0, 1, "multiple elevation levels (not the flat fallback)");
					assert.isAbove(scene.walls.size, 0, "per-floor walls were imported");
					assert.isAbove(scene.regions?.size ?? 0, 0, "stair changeLevel regions were created");
					assert.isAtMost(scene.grid.size, 160, "grid.size halved/clamped for Double Grid");
				});
			});
		},
		{ displayName: "Cartomancer: Generator → Scene import" }
	);
}
