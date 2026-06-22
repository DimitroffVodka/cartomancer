import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDungeonGridScale, parseDwellDoubleGrid } from "../scripts/lib/grid.mjs";

// These strings are the generators' real Haxe-serialized state, captured live from the
// running generators (localStorage `com.watabou.dungeon` / `com.watabou.house`).

test("parseDungeonGridScale reads the persisted gridScale", () => {
	assert.equal(parseDungeonGridScale("oy9:gridScalei2g"), 2); // exact live string — Small Tiles ON
	assert.equal(parseDungeonGridScale("x:gridScalei1y"), 1);
	assert.equal(parseDungeonGridScale("x:gridScalei3y"), 3);
	assert.equal(parseDungeonGridScale("x:gridScalezy"), 1);    // z = int 0 → clamped to 1
	assert.equal(parseDungeonGridScale("no such key"), 1);      // absent → default 1
	assert.equal(parseDungeonGridScale(null), 1);
	assert.equal(parseDungeonGridScale(undefined), 1);
});

test("parseDwellDoubleGrid detects the persisted boolean", () => {
	assert.equal(parseDwellDoubleGrid("oy10:doubleGridtg"), true);  // exact live string — Double Grid ON
	assert.equal(parseDwellDoubleGrid("oy11:doubleGridfg"), false); // false serializes as 'f'
	assert.equal(parseDwellDoubleGrid("nothing here"), false);      // absent → off
	assert.equal(parseDwellDoubleGrid(null), false);
});
