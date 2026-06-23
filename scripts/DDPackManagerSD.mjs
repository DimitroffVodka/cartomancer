/**
 * SDX Dungeondraft pack manager.
 *
 * Dungeondraft packs are Godot PCK files (GDPC magic). SDX extracts object
 * textures into Data/decor/ddpacks so they appear in the Decor painter only.
 */

const MODULE_ID = "cartomancer";
export const DD_DECOR_BASE = "decor/ddpacks";

const FilePickerImpl = () => foundry.applications.apps.FilePicker?.implementation ?? globalThis.FilePicker;

function parsePCK(buffer) {
    const view = new DataView(buffer);
    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== "GDPC") throw new Error("Not a valid Dungeondraft pack file (missing GDPC magic).");

    let pos = 4 + 4 + 4 + 4 + 4 + 64;
    const fileCount = view.getUint32(pos, true);
    pos += 4;

    const files = [];
    for (let i = 0; i < fileCount; i++) {
        const pathLen = view.getUint32(pos, true);
        pos += 4;
        const path = new TextDecoder().decode(new Uint8Array(buffer, pos, pathLen));
        pos += pathLen;
        const offset = Number(view.getBigUint64(pos, true));
        pos += 8;
        const size = Number(view.getBigUint64(pos, true));
        pos += 8;
        pos += 16;
        files.push({ path, offset, size });
    }
    return files;
}

function readEntry(buffer, entry) {
    return new Uint8Array(buffer, entry.offset, entry.size);
}

function objectTextureEntries(files) {
    return files.filter(f => f.path.includes("/textures/objects/") && /\.(png|webp)$/i.test(f.path));
}

function objectPathParts(entryPath) {
    const afterObjects = entryPath.split("/textures/objects/")[1] || "";
    const slash = afterObjects.lastIndexOf("/");
    return {
        category: slash >= 0 ? afterObjects.slice(0, slash) : "",
        filename: slash >= 0 ? afterObjects.slice(slash + 1) : afterObjects
    };
}

function sanitizePathPart(part) {
    return String(part || "")
        .replace(/\\/g, "/")
        .replace(/[<>:"|?*\x00-\x1F]/g, "_")
        .replace(/^\.+$/, "_")
        .trim();
}

function sanitizePackId(id, fallback = "pack") {
    return sanitizePathPart(id || fallback).replace(/[^a-zA-Z0-9_-]/g, "_") || fallback;
}

function formatLabel(filename) {
    return String(filename || "")
        .replace(/\.(png|webp)$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s*\d+x\d+\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function ensureDirectory(path) {
    const FP = FilePickerImpl();
    const parts = String(path || "").split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        try {
            await FP.browse("data", current);
        } catch {
            await FP.createDirectory("data", current);
        }
    }
}

// --- Registry: derived from the on-disk _index.json files, NOT a world setting. ---
// The decor/ddpacks/ folder lives at the Foundry user-data level (shared by every world),
// so reading the pack list from disk makes an import in one world visible in all of them —
// and avoids re-uploading the same pack per world. Each pack's enabled/removed state is
// persisted back into its own _index.json so toggles are global too.

const packIndexPath = (packId) => `${DD_DECOR_BASE}/${packId}/_index.json`;

async function readDataJSON(path) {
    try {
        // no-store so an _index.json rewritten by a toggle is read fresh, not from cache.
        const resp = await fetch(foundry.utils.getRoute(path), { cache: "no-store" });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

async function writePackIndex(packId, data) {
    const FP = FilePickerImpl();
    const indexFile = new File(
        [new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })],
        "_index.json",
        { type: "application/json" }
    );
    await FP.upload("data", `${DD_DECOR_BASE}/${packId}`, indexFile, {}, { notify: false });
}

function normalizePack(data, fallbackId) {
    const packId = data?.packId || fallbackId;
    return {
        packId,
        name: data?.name || packId,
        author: data?.author || "",
        version: data?.version || "",
        folderLabel: data?.folderLabel || data?.name || packId,
        assetCount: Number(data?.assetCount || 0),
        enabled: data?.enabled !== false
    };
}

export async function getDDPacks() {
    const FP = FilePickerImpl();
    let listing;
    try {
        listing = await FP.browse("data", DD_DECOR_BASE);
    } catch {
        return [];   // base folder not created yet → nothing imported
    }
    const packs = [];
    const seen = new Set();
    for (const dir of listing.dirs || []) {
        const dirName = decodeURIComponent(dir.split("/").filter(Boolean).pop() || "");
        if (!dirName || seen.has(dirName)) continue;
        // Fall back to the folder name when _index.json is missing (e.g. an old import whose
        // index write failed) so the pack is still discovered rather than silently dropped.
        const data = await readDataJSON(`${dir}/_index.json`);
        if (data?.removed) continue;   // soft-deleted: hidden everywhere, files kept on disk
        seen.add(dirName);
        packs.push(normalizePack(data, dirName));
    }
    packs.sort((a, b) => (a.folderLabel || a.name).localeCompare(b.folderLabel || b.name));
    return packs;
}

export async function scanDDPack(file) {
    const buffer = await file.arrayBuffer();
    const files = parsePCK(buffer);
    const packJsonEntry = files.find(f => f.path.endsWith("pack.json") && !f.path.includes("/data/"));
    if (!packJsonEntry) throw new Error("pack.json not found in pack.");

    const meta = JSON.parse(new TextDecoder().decode(readEntry(buffer, packJsonEntry)));
    const objectFiles = objectTextureEntries(files);
    if (!objectFiles.length) throw new Error("No object textures found in this pack.");

    const categoryMap = new Map();
    for (const entry of objectFiles) {
        const { category, filename } = objectPathParts(entry.path);
        const key = category || "__root__";
        if (!categoryMap.has(key)) categoryMap.set(key, []);
        const mime = /\.png$/i.test(filename) ? "image/png" : "image/webp";
        // Table-only scan: record where each texture lives in the buffer and decode the
        // thumbnail lazily (the preview blobs only what scrolls into view). Decoding all
        // 5000+ up front is what made the preview feel like a full import.
        categoryMap.get(key).push({ path: entry.path, filename, category, offset: entry.offset, size: entry.size, mime });
    }

    const categories = [...categoryMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, files]) => ({ name, files }));

    // buffer is returned so the preview can lazily decode thumbnails and reuse it for
    // extraction (no second 265 MB read). The caller must release it (preview close()).
    return { meta, categories, totalAssets: objectFiles.length, buffer };
}

export async function extractDDPack(file, folderLabel, onProgress, selectedPaths = null, buffer = null) {
    buffer = buffer || await file.arrayBuffer();   // reuse the scan's buffer when provided
    const files = parsePCK(buffer);
    const packJsonEntry = files.find(f => f.path.endsWith("pack.json") && !f.path.includes("/data/"));
    if (!packJsonEntry) throw new Error("pack.json not found in pack.");

    const meta = JSON.parse(new TextDecoder().decode(readEntry(buffer, packJsonEntry)));
    const packId = sanitizePackId(meta.id, meta.name || "pack");
    const allObjects = objectTextureEntries(files);
    let objects = selectedPaths ? allObjects.filter(f => selectedPaths.has(f.path)) : allObjects;
    if (selectedPaths && !objects.length && allObjects.length) objects = allObjects;
    if (!objects.length) throw new Error("No selected object textures to extract.");

    const basePath = `${DD_DECOR_BASE}/${packId}`;
    const dirs = new Set([DD_DECOR_BASE, basePath, `${basePath}/objects`]);
    for (const entry of objects) {
        const { category } = objectPathParts(entry.path);
        if (!category) continue;
        const parts = category.split("/").map(sanitizePathPart).filter(Boolean);
        for (let i = 1; i <= parts.length; i++) {
            dirs.add(`${basePath}/objects/${parts.slice(0, i).join("/")}`);
        }
    }

    for (const dir of [...dirs].sort((a, b) => a.length - b.length || a.localeCompare(b))) {
        try {
            await ensureDirectory(dir);
        } catch (err) {
            console.warn(`${MODULE_ID} | Could not create Dungeondraft directory ${dir}:`, err);
        }
    }

    const FP = FilePickerImpl();
    let uploaded = 0;
    const uploadEntry = async (entry) => {
        const { category, filename } = objectPathParts(entry.path);
        if (!filename) return;
        const safeCategory = category.split("/").map(sanitizePathPart).filter(Boolean).join("/");
        const uploadDir = safeCategory ? `${basePath}/objects/${safeCategory}` : `${basePath}/objects`;
        const mime = /\.png$/i.test(filename) ? "image/png" : "image/webp";
        const blob = new Blob([readEntry(buffer, entry)], { type: mime });
        const uploadFile = new File([blob], sanitizePathPart(filename), { type: mime });
        try {
            await FP.upload("data", uploadDir, uploadFile, {}, { notify: false });
        } catch (err) {
            console.warn(`${MODULE_ID} | Could not upload Dungeondraft asset ${filename}:`, err);
        }
        uploaded++;
        onProgress?.(uploaded, objects.length);
    };
    // Bounded concurrency: a serial loop over 5000+ assets took minutes. A small pool
    // (8 in-flight) cuts wall-clock substantially while staying gentle on the server.
    const CONCURRENCY = 8;
    let cursor = 0;
    const worker = async () => { while (cursor < objects.length) await uploadEntry(objects[cursor++]); };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, objects.length) }, worker));

    const indexData = {
        packId,
        name: meta.name || file.name.replace(/\.dungeondraft_pack$/i, ""),
        author: meta.author || "",
        version: meta.version || "",
        folderLabel: folderLabel || meta.name || packId,
        assetCount: objects.length,
        enabled: true
    };

    // The on-disk _index.json is now the registry's source of truth (shared across all
    // worlds via the Data folder), so make the write best-effort but always attempted.
    try {
        await writePackIndex(packId, indexData);
    } catch (err) {
        console.warn(`${MODULE_ID} | Could not write Dungeondraft pack index for ${packId}:`, err);
    }

    return indexData;
}

export async function upsertDDPack(pack) {
    if (!pack?.packId) return;
    const existing = await readDataJSON(packIndexPath(pack.packId)) || {};
    const merged = {
        ...existing,
        ...pack,
        enabled: pack.enabled ?? existing.enabled ?? true,
        removed: false   // re-importing restores a previously removed pack
    };
    await writePackIndex(pack.packId, merged);
}

export async function setDDPackEnabled(packId, enabled) {
    // Self-heal a missing index (synthesized entry) by writing a minimal one.
    const data = (await readDataJSON(packIndexPath(packId))) || { packId, name: packId, folderLabel: packId };
    data.enabled = !!enabled;
    await writePackIndex(packId, data);
}

export async function removeDDPack(packId) {
    // FilePicker exposes no file-delete, so "remove" is a soft-delete written to the index:
    // hidden in every world while the extracted textures stay on disk (as the UI promises).
    const data = (await readDataJSON(packIndexPath(packId))) || { packId };
    data.removed = true;
    data.enabled = false;
    await writePackIndex(packId, data);
}

export async function loadDDPackDecorTiles() {
    const packs = (await getDDPacks()).filter(pack => pack.enabled !== false);
    const FP = FilePickerImpl();
    const tiles = [];

    for (const pack of packs) {
        const root = `${DD_DECOR_BASE}/${pack.packId}/objects`;
        const queue = [{ dir: root, category: "" }];
        while (queue.length) {
            const { dir, category } = queue.shift();
            let listing;
            try {
                listing = await FP.browse("data", dir);
            } catch {
                continue;
            }

            for (const filePath of listing.files || []) {
                if (!/\.(png|webp)$/i.test(filePath)) continue;
                // FilePicker.browse() returns URL-encoded paths; decode the filename
                // for the DISPLAY label only (keep filePath encoded for the texture src).
                let filename = filePath.split("/").pop() || "";
                try { filename = decodeURIComponent(filename); } catch { /* keep as-is */ }
                const groupLabel = pack.folderLabel || pack.name || pack.packId;
                const categoryLabel = category ? `${groupLabel} / ${category}` : groupLabel;
                const categoryKey = category
                    ? `ddpack/${pack.packId}/${category}`
                    : `ddpack/${pack.packId}/__root__`;
                tiles.push({
                    key: `${pack.packId}:${filePath}`,
                    label: formatLabel(filename),
                    path: filePath,
                    category: categoryKey,
                    categoryLabel,
                    packId: pack.packId,
                    packName: pack.name,
                    imported: true,
                    isDDPack: true
                });
            }

            for (const child of listing.dirs || []) {
                const name = decodeURIComponent(child.split("/").pop() || "");
                queue.push({ dir: child, category: category ? `${category}/${name}` : name });
            }
        }
    }

    return tiles;
}
