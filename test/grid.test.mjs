import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGridPx, dwellCoarseGridPx, dwellGridSize, dungeonCellPx } from "../scripts/lib/grid.mjs";

test("normalizeGridPx clamps a rendered cell size to [64, 160]", () => {
	assert.equal(normalizeGridPx(10), 64);    // tiny (Small Tiles / fine cave grid) → floor
	assert.equal(normalizeGridPx(100), 100);  // already usable
	assert.equal(normalizeGridPx(999), 160);  // huge → ceiling
	assert.equal(normalizeGridPx(96.4), 96);  // rounds first
	assert.equal(normalizeGridPx(0), 64);     // 0 → 64 (px || 64)
	assert.equal(normalizeGridPx(NaN), 64);   // non-finite → 64
});

test("dwellCoarseGridPx = clamp(60, 160, round(M.a * 1.8))", () => {
	assert.equal(dwellCoarseGridPx(50), 90);     // 50*1.8 = 90
	assert.equal(dwellCoarseGridPx(173.7), 160); // 312.7 → clamp 160 (the live M.a we measured)
	assert.equal(dwellCoarseGridPx(10), 60);     // 18 → floor 60
});

test("dwellGridSize halves the Foundry grid when Double Grid is on", () => {
	assert.equal(dwellGridSize(160, true), 80);   // 2× density → half-size cells
	assert.equal(dwellGridSize(160, false), 160); // off → unchanged
	assert.equal(dwellGridSize(96, true), 48);    // matches the live import we verified
	assert.equal(dwellGridSize(50, true), 30);    // round(25)=25 → floored to the 30 minimum
});

test("dungeonCellPx divides by gridScale (Small Tiles ⇒ exactly half)", () => {
	const scale = 4; // hypot(M.a, M.b)
	assert.equal(dungeonCellPx(30, 1, scale), 120);
	assert.equal(dungeonCellPx(30, 2, scale), 60);  // Small Tiles → half (verified live, ratio 2.0)
	assert.equal(dungeonCellPx(30, 0, scale), 120); // guard: gridScale floored to 1
});
