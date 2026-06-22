import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Logs into the running Foundry world once and saves the authenticated session so the
// e2e specs can reuse it. Configure via env:
//   FOUNDRY_URL      (default http://localhost:30000)
//   FOUNDRY_USER     (default "Gamemaster") — must be a GM
//   FOUNDRY_PASSWORD (default "" — many dev worlds have no user password)
//
// NOTE: the /join selectors below target Foundry v13/v14. If a future build changes the
// login form, this is the one place to adjust.

const AUTH_DIR = "test/e2e/.auth";
const STATE = `${AUTH_DIR}/state.json`;
const USER = process.env.FOUNDRY_USER || "Gamemaster";
const PASSWORD = process.env.FOUNDRY_PASSWORD || "";

setup("authenticate to Foundry", async ({ page }) => {
	mkdirSync(AUTH_DIR, { recursive: true });

	await page.goto("/join");

	// If a reused cookie already dropped us into the game, skip the form.
	const alreadyIn = await page.evaluate(() => !!globalThis.game?.ready).catch(() => false);
	if (!alreadyIn) {
		await page.waitForSelector('select[name="userid"]', { timeout: 30_000 });
		await page.selectOption('select[name="userid"]', { label: USER });
		if (PASSWORD) await page.fill('input[name="password"]', PASSWORD);
		await page.click('button[name="join"]');
	}

	// Block until the world is fully ready, then persist the session.
	await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 90_000 });
	await page.context().storageState({ path: STATE });
});
