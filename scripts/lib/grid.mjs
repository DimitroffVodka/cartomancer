/**
 * Pure grid/scale math + generator state-string parsing, extracted from
 * MaphubViewerApp so it can be unit-tested without a Foundry runtime or a live
 * OpenFL generator. Each function mirrors the exact behaviour of its former
 * inline/private implementation — see the call sites in MaphubViewerApp.mjs.
 *
 * No imports, no globals: safe to load under `node --test`.
 */

/**
 * Clamp a generator's rendered cell size (px) to a usable Foundry grid.size, in
 * [64, 160]. Tiny rendered cells (Cave "Square grid > Size", Dungeon "Small Tiles")
 * would give microscopic tokens; the caller rescales the image by gridPx/cellPx so
 * one generator cell still maps to exactly one Foundry square.
 */
export function normalizeGridPx(cellPx) {
	const px = Math.round(Number(cellPx) || 0);
	return Math.max(64, Math.min(160, px || 64));
}

/**
 * The coarse Foundry grid size (px) for a Dwellings building, derived from the base
 * level's render-transform scale (M.a). Clamped to [60, 160].
 */
export function dwellCoarseGridPx(scaleA) {
	return Math.max(60, Math.min(160, Math.round(Number(scaleA) * 1.8)));
}

/**
 * The Foundry grid.size for a dwelling import. With "Double grid" on, the building
 * grid is drawn at 2× density (half-size cells), so halve the Foundry grid (min 30)
 * to match; the image + walls stay at the coarse gridPx, so walls land on every
 * other grid line.
 */
export function dwellGridSize(gridPx, doubleGrid) {
	return doubleGrid ? Math.max(30, Math.round(gridPx / 2)) : gridPx;
}

/**
 * On-screen px per LOGICAL dungeon cell at capture. "Small Tiles" (gridScale 2) draws
 * cells at 1/gridScale, so one Foundry square should equal one *small* tile: divide by
 * the scale. `scale` is the render transform's uniform scale, i.e. hypot(M.a, M.b).
 */
export function dungeonCellPx(cell, gridScale, scale) {
	return (cell / Math.max(1, gridScale)) * scale;
}

/**
 * Parse the One Page Dungeon generator's persisted "gridScale" out of its Haxe-
 * serialized state string (e.g. "oy9:gridScalei2g" → 2). The `z` form encodes int 0.
 * Absent ⇒ 1 (normal). Never returns < 1.
 */
export function parseDungeonGridScale(stateStr) {
	const m = String(stateStr ?? "").match(/gridScale(?:i(-?\d+)|z)/);
	const v = (m && m[1] != null) ? parseInt(m[1], 10) : 1;
	return v >= 1 ? v : 1;
}

/**
 * Whether the Dwellings generator's "Double grid" is on, from its persisted Haxe
 * state (`com.watabou.house`): the boolean serializes as `doubleGridt`. Absent ⇒ false.
 */
export function parseDwellDoubleGrid(stateStr) {
	return /doubleGridt/.test(String(stateStr ?? ""));
}
