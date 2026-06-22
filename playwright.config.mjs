import { defineConfig } from "@playwright/test";

// Foundry URL — override with FOUNDRY_URL for a non-default host/port.
const FOUNDRY_URL = process.env.FOUNDRY_URL || "http://localhost:30000";

// Foundry is a single shared world: no test parallelism, generous timeouts (imports are slow).
export default defineConfig({
	testDir: "./test/e2e",
	fullyParallel: false,
	workers: 1,
	timeout: 150_000,
	expect: { timeout: 15_000 },
	reporter: [["list"]],
	use: {
		baseURL: FOUNDRY_URL,
		headless: true,
		actionTimeout: 30_000,
		navigationTimeout: 60_000,
		trace: "retain-on-failure",
	},
	projects: [
		// Logs into Foundry once and saves the session; the e2e project reuses it.
		{ name: "setup", testMatch: /auth\.setup\.mjs/ },
		{
			name: "e2e",
			testMatch: /.*\.spec\.mjs/,
			dependencies: ["setup"],
			use: { storageState: "test/e2e/.auth/state.json" },
		},
	],
});
