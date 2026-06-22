import { test, expect } from "@playwright/test";
import { waitForGameReady, setDetached, importGenerator, deleteScene } from "./helpers.mjs";

test.beforeEach(async ({ page }) => {
	await page.goto("/game");
	await waitForGameReady(page);
	await setDetached(page, false);
});

test("dungeon imports as a SQUARE-grid battlemap with walls", async ({ page }) => {
	let scene;
	try {
		scene = await importGenerator(page, "dungeon");
		expect(scene, "a scene was created").toBeTruthy();
		expect(scene.gridType, "square grid (CONST.GRID_TYPES.SQUARE)").toBe(1);
		expect(scene.gridSize).toBeGreaterThanOrEqual(64);
		expect(scene.gridSize).toBeLessThanOrEqual(160);
		expect(scene.walls, "walls imported").toBeGreaterThan(0);
	} finally {
		await deleteScene(page, scene?.id);
	}
});

// The regression for the dwelling hidden-window bug: a backgrounded Foundry tab pauses
// requestAnimationFrame, which used to blank the per-floor capture and drop the dwelling
// to a flat image. Reproduce by bringing a decoy tab to the front (so the Foundry tab
// reports document.hidden), then assert the import still yields a real multi-level scene.
// Backgrounding only throttles rAF in HEADED mode, so this is skipped under headless.
test("dwelling imports multi-level even when the tab is backgrounded (rAF paused)", async ({ page, context }) => {
	const decoy = await context.newPage();
	await decoy.goto("about:blank");
	await decoy.bringToFront();

	const hidden = await page.evaluate(() => document.hidden);
	test.skip(!hidden, "Foundry tab not backgrounded (run `npm run test:e2e:headed` to exercise the rAF-pause regression)");

	let scene;
	try {
		scene = await importGenerator(page, "dwellings");
		expect(scene, "a scene was created (not the flat fallback)").toBeTruthy();
		expect(scene.levels, "multiple elevation levels").toBeGreaterThan(1);
		expect(scene.walls, "per-floor walls").toBeGreaterThan(0);
		expect(scene.regions, "stair changeLevel regions").toBeGreaterThan(0);
	} finally {
		await deleteScene(page, scene?.id);
		await decoy.close();
	}
});
