import { MODULE_ID } from "./constants.mjs";
import { loadDDPackDecorTiles, getDDPacks, setDDPackEnabled } from "./DDPackManagerSD.mjs";

const { ApplicationV2 } = foundry.applications.api;
const REFRESH_HOOK = `${MODULE_ID}.decorAssetsImported`;
const SEARCH_CAP = 300;

// Inline styles (the DDPackPreviewApp convention) — gold theme, .cdx-decor-* namespace.
const STYLES = `
<style id="cartomancer-decor-browser-styles">
.cartomancer-decor-browser-app.application{background:transparent}
.cartomancer-decor-browser-app .window-content{padding:0;overflow:hidden;background:linear-gradient(135deg,rgba(20,22,28,0.97),rgba(35,38,48,0.95))}
.cdx-decor-wrap{display:flex;flex-direction:column;height:100%;min-height:0;color:#e0e6ed}
.cdx-decor-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;background:rgba(15,17,21,0.6);border-bottom:1px solid rgba(255,255,255,0.08)}
.cdx-decor-search{flex:1;min-width:150px;background:rgba(20,22,28,0.9);border:1px solid rgba(255,255,255,0.1);color:#e6c875;padding:5px 8px;border-radius:4px}
.cdx-decor-head button{border-radius:4px;border:1px solid #b09144;background:linear-gradient(135deg,rgba(35,38,48,0.9),rgba(20,22,28,0.95));color:#e6c875;cursor:pointer;padding:5px 10px;white-space:nowrap}
.cdx-decor-head button:hover{color:#fff;border-color:#e6c875}
.cdx-decor-ctl{display:flex;align-items:center;gap:4px;color:#a0a8b5;font-size:12px;white-space:nowrap}
.cdx-decor-ctl input[type=number]{width:54px;background:rgba(20,22,28,0.9);border:1px solid rgba(255,255,255,0.1);color:#e0e6ed;padding:3px 5px;border-radius:4px}
.cdx-decor-hint{flex-basis:100%;font-size:11px;color:#a0a8b5;margin-top:1px}
.cdx-decor-body{display:flex;flex:1;min-height:0;overflow:hidden}
.cdx-decor-tree{flex:0 0 auto;width:248px;min-width:140px;max-width:72%;overflow:auto;background:rgba(15,17,21,0.6);padding:6px 0}
.cdx-decor-divider{flex:0 0 6px;cursor:col-resize;background:rgba(255,255,255,0.06);border-left:1px solid rgba(255,255,255,0.06)}
.cdx-decor-divider:hover{background:rgba(201,170,88,0.4)}
.cdx-decor-row{display:flex;align-items:center;gap:6px;padding:4px 8px;color:#c9aa58;cursor:pointer;white-space:nowrap;overflow:hidden}
.cdx-decor-row.active,.cdx-decor-row:hover{background:rgba(201,170,88,0.14);color:#e6c875}
.cdx-decor-row.disabled{opacity:.5;font-style:italic}
.cdx-decor-row .label{flex:1;overflow:hidden;text-overflow:ellipsis}
.cdx-decor-row .count{font-size:11px;color:#7d8493}
.cdx-decor-eye{color:#a0a8b5;padding:0 2px}
.cdx-decor-eye:hover{color:#e6c875}
.cdx-decor-right{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden}
.cdx-decor-breadcrumb{padding:7px 12px;background:rgba(15,17,21,0.6);border-bottom:1px solid rgba(255,255,255,0.08);color:#e0c880;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cdx-decor-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:7px;align-content:start;padding:9px}
.cdx-decor-thumb{display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px;background:rgba(20,22,28,0.9);border:2px solid transparent;border-radius:5px;cursor:grab}
.cdx-decor-thumb.active{border-color:#c9aa58}
.cdx-decor-thumb:hover{border-color:rgba(201,170,88,0.5)}
.cdx-decor-thumb img{width:64px;height:64px;object-fit:contain;pointer-events:none}
.cdx-decor-thumb span{font-size:10px;color:#a0a8b5;max-width:72px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cdx-decor-empty{grid-column:1/-1;color:#a0a8b5;padding:24px;text-align:center}
.cdx-decor-empty button{margin-left:6px;border-radius:4px;border:1px solid #b09144;background:rgba(35,38,48,0.9);color:#e6c875;cursor:pointer;padding:4px 9px}
.cdx-decor-foot{display:flex;align-items:center;gap:8px;padding:7px 12px;background:rgba(15,17,21,0.6);border-top:1px solid rgba(255,255,255,0.08);color:#a0a8b5;font-size:12px}
</style>`;

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

const TREE_WIDTH_KEY = "cartomancer-decor-tree-width";

// Drop a leading "[tag] " (e.g. the author's "[WFW] ") from a folder label for
// display — the full path stays in the row's title tooltip. Keeps the original if
// stripping would empty it (a segment that is only "[Tag]").
function shortLabel(s) {
    const t = String(s ?? "").replace(/^\[[^\]]+\]\s+/, "").trim();
    return t || String(s ?? "");
}

/**
 * Browse imported DungeonDraft decor (a collapsible category tree + searchable
 * thumbnail grid) and place it on the current scene as Tiles, via drag-drop onto
 * the canvas or a click-to-place fallback. Plain ApplicationV2 modeled on
 * DDPackPreviewApp; consumes loadDDPackDecorTiles() and refreshes on the
 * `cartomancer.decorAssetsImported` hook.
 */
export class DecorBrowserApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "cartomancer-decor-browser",
        classes: ["cartomancer-decor-browser-app"],
        tag: "div",
        window: { title: "Decor Browser", icon: "fas fa-shapes", resizable: true },
        position: { width: 920, height: 660 }
    };

    constructor(options = {}) {
        super(options);
        this.allTiles = [];
        this.tree = [];
        this.byKey = new Map();
        this.open = {};
        this.viewKey = null;
        this.query = "";
        this.loading = true;
        this._scale = 0.5;
        this._elevation = 0;
        this._snap = false;
        this._chosenTile = null;
        this._dragPackId = null;
        this._io = null;
        this._searchTimer = null;
        this._hooked = false;
        this._boardInstalled = false;
        this._loadStarted = false;

        // Reload + rebuild when a pack is imported / toggled / removed (single refresh path).
        this._onAssetsChanged = async () => {
            const prevView = this.viewKey;
            const prevOpen = this.open;
            try { this.allTiles = await loadDDPackDecorTiles(); }
            catch (e) { console.error(`${MODULE_ID} | reload decor failed`, e); this.allTiles = []; }
            this.tree = await this.#buildTree(this.allTiles);
            this.open = prevOpen;
            if (!Object.keys(this.open).length && this.tree[0]) this.open[this.tree[0].key] = true;
            if (!this.#nodeByKey(prevView)) this.viewKey = this.tree[0]?.key ?? null;
            this.loading = false;
            this.#refreshView();   // targeted — don't rebuild the head/search input
        };

        // Native DOM drag-drop onto the canvas board element.
        this._boardDragover = (ev) => { if (ev.dataTransfer?.types?.includes("text/plain")) ev.preventDefault(); };
        this._boardDrop = async (ev) => {
            let payload;
            try { payload = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch { return; }
            // Custom (non-core) drop type so Foundry's canvas #onDrop never routes it
            // through the Tile drop pipeline — we create the Tile ourselves below.
            if (payload?.type !== "cartomancerDecor" || !payload.src) return;
            ev.preventDefault();
            if (!canvas?.ready || !canvas?.scene) { ui.notifications.warn("No active scene to place decor on."); return; }
            this._dragPackId = payload.packId || null;
            const { x, y } = this.#clientToScene(ev.clientX, ev.clientY);
            await this.#placeTileAt(payload.src, x, y);
        };
    }

    // v14 ignores _preFirstRender's return value — _canRender is the documented
    // render-abort hook (return false). openDecorBrowser() also GM-gates the API
    // path so a blocked non-GM never leaves a stuck singleton.
    _canRender(options) {
        if (!game.user.isGM) {
            ui.notifications.warn("Only a GM can open the Decor Browser.");
            return false;
        }
    }

    async _renderHTML() {
        if (!document.getElementById("cartomancer-decor-browser-styles")) {
            document.head.insertAdjacentHTML("beforeend", STYLES);
        }
        const el = document.createElement("div");
        el.className = "cdx-decor-wrap";
        el.innerHTML = `
            <div class="cdx-decor-head">
                <input type="search" class="cdx-decor-search" placeholder="Search decor…" value="${escapeHtml(this.query)}">
                <button type="button" data-action="import-packs"><i class="fas fa-cubes"></i> Import Packs</button>
                <span class="cdx-decor-ctl">Scale <input type="number" data-field="scale" min="0.1" max="4" step="0.1" value="${this._scale}"></span>
                <span class="cdx-decor-ctl">Elev <input type="number" data-field="elevation" step="1" value="${this._elevation}"></span>
                <label class="cdx-decor-ctl"><input type="checkbox" data-field="snap" ${this._snap ? "checked" : ""}> Snap</label>
                <button type="button" data-action="place-center"><i class="fas fa-crosshairs"></i> Place at view</button>
                <div class="cdx-decor-hint">Drag a thumbnail onto the scene, or click one then “Place at view”.</div>
            </div>
            <div class="cdx-decor-body">
                <div class="cdx-decor-tree"></div>
                <div class="cdx-decor-divider" title="Drag to resize the folder panel"></div>
                <div class="cdx-decor-right">
                    <div class="cdx-decor-breadcrumb"></div>
                    <div class="cdx-decor-grid"></div>
                </div>
            </div>
            <div class="cdx-decor-foot"><span class="cdx-decor-scene"></span></div>`;
        return el;
    }

    _replaceHTML(result, content) {
        content.replaceChildren(result);
    }

    _onRender() {
        const root = this.element;
        this.#wireTreeResizer();
        const search = root.querySelector(".cdx-decor-search");
        search?.addEventListener("input", (e) => this.#onSearch(e.target.value));
        search?.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { clearTimeout(this._searchTimer); e.target.value = ""; this.query = ""; this.#renderAssets(); }
        });
        root.querySelector("[data-action='import-packs']")?.addEventListener("click", () => this.#openImport());
        root.querySelector("[data-action='place-center']")?.addEventListener("click", () => this.#placeAtView());
        root.querySelector("[data-field='scale']")?.addEventListener("change", (e) => { this._scale = Number(e.target.value) || 0.5; });
        root.querySelector("[data-field='elevation']")?.addEventListener("change", (e) => { this._elevation = Number(e.target.value) || 0; });
        root.querySelector("[data-field='snap']")?.addEventListener("change", (e) => { this._snap = !!e.target.checked; });

        const sceneEl = root.querySelector(".cdx-decor-scene");
        if (sceneEl) sceneEl.textContent = canvas?.scene ? `Scene: ${canvas.scene.name} · grid ${canvas.grid?.size ?? "?"}px` : "No active scene — open one to place decor.";

        this.#renderTree();
        this.#renderAssets();

        // Once-only: refresh hook + canvas drop listener (plain _onRender fires on every render()).
        if (!this._hooked) { this._hooked = true; Hooks.on(REFRESH_HOOK, this._onAssetsChanged); }
        this.#installBoardDrop();

        // Kick off the (slow, FilePicker-backed) data load after first paint.
        if (!this._loadStarted) { this._loadStarted = true; this.#loadData(); }
    }

    async close(options) {
        if (this._hooked) { Hooks.off(REFRESH_HOOK, this._onAssetsChanged); this._hooked = false; }
        this.#removeBoardDrop();
        this._io?.disconnect();
        this._io = null;
        clearTimeout(this._searchTimer);
        if (this.constructor._instance === this) this.constructor._instance = null;
        return super.close(options);
    }

    // Draggable divider to resize the folder tree; width persists in localStorage.
    #wireTreeResizer() {
        const body = this.element.querySelector(".cdx-decor-body");
        const tree = this.element.querySelector(".cdx-decor-tree");
        const divider = this.element.querySelector(".cdx-decor-divider");
        if (!body || !tree || !divider) return;
        try { const saved = parseInt(localStorage.getItem(TREE_WIDTH_KEY), 10); if (saved > 0) tree.style.width = `${saved}px`; } catch (_) { }
        divider.addEventListener("mousedown", (e) => {
            e.preventDefault();
            document.body.style.cursor = "col-resize";
            const onMove = (ev) => {
                const rect = body.getBoundingClientRect();
                const w = Math.max(140, Math.min(rect.width - 220, ev.clientX - rect.left));
                tree.style.width = `${w}px`;
            };
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                document.body.style.cursor = "";
                try { localStorage.setItem(TREE_WIDTH_KEY, String(parseInt(tree.style.width, 10) || 248)); } catch (_) { }
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
    }

    /* ----------------------------------- data ----------------------------------- */

    async #loadData() {
        this.loading = true;
        try {
            this.allTiles = await loadDDPackDecorTiles();
            this.tree = await this.#buildTree(this.allTiles);
            this.viewKey = this.tree[0]?.key ?? null;
            if (this.tree[0]) this.open[this.tree[0].key] = true;   // first pack open so categories show
        } catch (e) {
            console.error(`${MODULE_ID} | loadDDPackDecorTiles failed`, e);
            this.allTiles = [];
            this.tree = [];
        } finally {
            this.loading = false;
            this.#refreshView();   // targeted — don't rebuild the head/search input
        }
    }

    // Re-render tree + grid in place; preserves the head toolbar (and search focus/caret).
    #refreshView() {
        if (!this.element) return;
        this.#renderTree();
        this.#renderAssets();
    }

    // category = "ddpack/<packId>/<a>/<b>/…" or "ddpack/<packId>/__root__" (segments already decoded).
    async #buildTree(tiles) {
        const roots = [];
        const byKey = new Map();
        for (const tile of tiles) {
            const parts = String(tile.category ?? "").replace(/^ddpack\//, "").split("/").filter(Boolean);
            if (!parts.length) continue;
            const packId = parts[0];
            const chain = [packId, ...parts.slice(1).filter(p => p !== "__root__")];
            let parentKey = "";
            for (let i = 0; i < chain.length; i++) {
                const key = chain.slice(0, i + 1).join("/");
                if (!byKey.has(key)) {
                    const node = { key, label: shortLabel(i === 0 ? (tile.packName || packId) : chain[i]), children: [], tiles: [], packId: i === 0 ? packId : null };
                    byKey.set(key, node);
                    if (parentKey) byKey.get(parentKey).children.push(node);
                    else roots.push(node);
                }
                parentKey = key;
            }
            byKey.get(parentKey).tiles.push(tile);
        }
        // Surface disabled packs as greyed roots so the eye toggle can re-enable them
        // (loadDDPackDecorTiles only returns enabled packs, so they have no tiles).
        const present = new Set(roots.map(r => r.packId));
        for (const pack of await getDDPacks()) {
            if (pack.enabled === false && !present.has(pack.packId)) {
                const node = { key: pack.packId, label: shortLabel(pack.name || pack.packId), children: [], tiles: [], packId: pack.packId, disabled: true };
                byKey.set(node.key, node);
                roots.push(node);
            }
        }
        this.byKey = byKey;
        return roots;
    }

    #nodeByKey(key) {
        return key ? (this.byKey?.get(key) ?? null) : null;
    }

    // Recursive descendant count (badge only — NOT what the grid renders).
    #nodeCount(node) {
        return (node.tiles?.length || 0) + (node.children || []).reduce((sum, child) => sum + this.#nodeCount(child), 0);
    }

    /* ----------------------------------- tree ----------------------------------- */

    #renderTree() {
        const panel = this.element?.querySelector(".cdx-decor-tree");
        if (!panel) return;
        if (this.loading || !this.tree.length) { panel.replaceChildren(); return; }
        panel.replaceChildren(...this.tree.map(node => this.#treeNode(node, 0)));
    }

    #treeNode(node, depth) {
        const wrap = document.createElement("div");
        const row = document.createElement("div");
        const hasChildren = node.children.length > 0;
        const isPackRoot = depth === 0 && !!node.packId;
        row.className = `cdx-decor-row${this.viewKey === node.key ? " active" : ""}${node.disabled ? " disabled" : ""}`;
        row.style.paddingLeft = `${8 + depth * 14}px`;
        row.dataset.key = node.key;
        const icon = hasChildren ? (this.open[node.key] ? "fa-folder-open" : "fa-folder") : "fa-images";
        const countLabel = node.disabled ? "(hidden — click to show)" : `(${this.#nodeCount(node)})`;
        row.innerHTML = `<i class="fas ${icon}"></i><span class="label" title="${escapeHtml(node.key)}">${escapeHtml(node.label)}</span><span class="count">${countLabel}</span>`;

        if (isPackRoot) {
            const enabled = !node.disabled;
            const eye = document.createElement("i");
            eye.className = `fas ${enabled ? "fa-eye" : "fa-eye-slash"} cdx-decor-eye`;
            eye.title = enabled ? "Hide this pack from the browser" : "Show this pack";
            eye.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                await setDDPackEnabled(node.packId, !enabled);
                Hooks.callAll(REFRESH_HOOK);
            });
            row.appendChild(eye);
        }

        row.addEventListener("click", (ev) => {
            if (ev.target.closest(".cdx-decor-eye")) return;
            // A hidden pack: clicking anywhere on the row re-enables it (recoverable —
            // not just the small eye icon).
            if (node.disabled) { setDDPackEnabled(node.packId, true).then(() => Hooks.callAll(REFRESH_HOOK)); return; }
            if (hasChildren) this.open[node.key] = !this.open[node.key];
            this.viewKey = node.key;
            this.#renderTree();
            this.#renderAssets();
        });

        wrap.appendChild(row);
        if (hasChildren && this.open[node.key]) {
            for (const child of node.children) wrap.appendChild(this.#treeNode(child, depth + 1));
        }
        return wrap;
    }

    /* ----------------------------------- grid ----------------------------------- */

    #renderAssets() {
        const grid = this.element?.querySelector(".cdx-decor-grid");
        const crumb = this.element?.querySelector(".cdx-decor-breadcrumb");
        if (!grid) return;
        this._io?.disconnect();
        this._io = null;

        if (this.loading) { grid.innerHTML = `<div class="cdx-decor-empty">Loading decor…</div>`; if (crumb) crumb.textContent = ""; return; }
        if (!this.allTiles.length) {
            grid.innerHTML = `<div class="cdx-decor-empty">No decor yet.<button type="button" data-action="import-empty">Import a DungeonDraft pack</button></div>`;
            grid.querySelector("[data-action='import-empty']")?.addEventListener("click", () => this.#openImport());
            if (crumb) crumb.textContent = "";
            return;
        }

        let tiles;
        let label;
        if (this.query) {
            const matches = this.allTiles.filter(t => (t.label || "").toLowerCase().includes(this.query) || (t.categoryLabel || "").toLowerCase().includes(this.query));
            tiles = matches.slice(0, SEARCH_CAP);
            label = `Search “${this.query}” — ${matches.length} match${matches.length === 1 ? "" : "es"}`;
            if (matches.length > SEARCH_CAP) label += ` (showing first ${SEARCH_CAP}, refine search)`;
        } else {
            const node = this.#nodeByKey(this.viewKey);
            // OWN files only — NEVER the recursive descendant set, or a pack-root click mounts ~5000 imgs.
            tiles = node?.tiles ?? [];
            label = node ? `${node.label} — ${tiles.length} item${tiles.length === 1 ? "" : "s"}` : "";
        }
        if (crumb) crumb.textContent = label;

        if (!tiles.length) {
            grid.innerHTML = `<div class="cdx-decor-empty">${this.query ? "No matches." : "No items here — pick a subfolder."}</div>`;
            return;
        }

        grid.innerHTML = tiles.map(t => `
            <div class="cdx-decor-thumb${this._chosenTile?.key === t.key ? " active" : ""}" draggable="true" data-key="${escapeHtml(t.key)}" title="${escapeHtml(t.label)}">
                <img data-src="${escapeHtml(t.path)}" alt=""><span>${escapeHtml(t.label)}</span>
            </div>`).join("");

        // Lazy thumbnails: only load <img> as cards scroll into view.
        this._io = new IntersectionObserver((entries, obs) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const img = entry.target.querySelector("img");
                if (img && !img.src && img.dataset.src) img.src = img.dataset.src;
                obs.unobserve(entry.target);
            }
        }, { root: grid, rootMargin: "200px" });

        const byKey = new Map(tiles.map(t => [t.key, t]));
        grid.querySelectorAll(".cdx-decor-thumb").forEach(card => {
            this._io.observe(card);
            const tile = byKey.get(card.dataset.key);
            card.addEventListener("click", () => {
                this._chosenTile = tile;
                this._dragPackId = tile?.packId || null;
                grid.querySelectorAll(".cdx-decor-thumb.active").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
            });
            card.addEventListener("dragstart", (ev) => {
                this._dragPackId = tile?.packId || null;
                // type:"cartomancerDecor" (NOT "Tile") + no texture.src so core's canvas
                // drop handler ignores it — _boardDrop places the Tile itself.
                ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "cartomancerDecor", src: tile.path, packId: tile.packId }));
                ev.dataTransfer.effectAllowed = "copy";
            });
        });
    }

    #onSearch(value) {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.query = String(value || "").trim().toLowerCase();
            this.#renderAssets();   // grid only — keeps the search input focused/caret intact
        }, 200);
    }

    /* --------------------------------- placement -------------------------------- */

    #naturalSize(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth || 256, h: img.naturalHeight || 256 });
            img.onerror = () => resolve({ w: 256, h: 256 });
            img.src = src;
        });
    }

    #clientToScene(clientX, clientY) {
        try {
            if (canvas?.canvasCoordinatesFromClient) {
                const p = canvas.canvasCoordinatesFromClient({ x: clientX, y: clientY });
                return { x: p.x, y: p.y };
            }
        } catch { /* fall through */ }
        const t = canvas?.stage?.worldTransform;
        if (!t) return { x: 0, y: 0 };
        return { x: (clientX - t.tx) / t.a, y: (clientY - t.ty) / t.d };
    }

    async #buildTileData({ src, sceneX, sceneY }) {
        const scale = Number(this.element?.querySelector("[data-field='scale']")?.value) || this._scale || 0.5;
        const elevation = Number(this.element?.querySelector("[data-field='elevation']")?.value) || 0;
        const { w: natW, h: natH } = await this.#naturalSize(src);
        const width = Math.max(1, Math.round(natW * scale));
        const height = Math.max(1, Math.round(natH * scale));
        return {
            texture: { src, anchorX: 0, anchorY: 0 },   // anchors 0 => x/y are the top-left corner
            x: Math.round(sceneX - width / 2),
            y: Math.round(sceneY - height / 2),
            width, height, rotation: 0, sort: 3,
            // v1: single elevation only. On a multi-level scene this renders on every
            // floor — set the toolbar Elevation to the target floor as a workaround.
            // (Binding to a Levels range is a planned follow-up.)
            elevation,
            flags: { [MODULE_ID]: { decorBrowser: true, packId: this._dragPackId || null } }
        };
    }

    async #placeTileAt(src, sceneX, sceneY) {
        if (!canvas?.ready || !canvas?.scene) { ui.notifications.warn("No active scene to place decor on."); return; }
        let x = sceneX;
        let y = sceneY;
        const snap = this.element?.querySelector("[data-field='snap']")?.checked;
        if (snap && canvas.grid?.getSnappedPoint) {
            try {
                const s = canvas.grid.getSnappedPoint({ x, y }, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
                x = s.x; y = s.y;
            } catch { /* keep raw coords */ }
        }
        try {
            const data = await this.#buildTileData({ src, sceneX: x, sceneY: y });
            await canvas.scene.createEmbeddedDocuments("Tile", [data]);
            ui.notifications.info("Decor tile placed.");
        } catch (e) {
            console.error(`${MODULE_ID} | decor placement failed`, e);
            ui.notifications.error(`Decor placement failed: ${e?.message || e}`);
        }
    }

    async #placeAtView() {
        if (!this._chosenTile) { ui.notifications.warn("Click a decor thumbnail first."); return; }
        if (!canvas?.ready) { ui.notifications.warn("No active scene."); return; }
        this._dragPackId = this._chosenTile.packId || null;
        await this.#placeTileAt(this._chosenTile.path, canvas.stage.pivot.x, canvas.stage.pivot.y);
    }

    /* -------------------------------- integration ------------------------------- */

    #openImport() {
        game.modules.get(MODULE_ID)?.api?.openDDPackSettings?.();
    }

    #installBoardDrop() {
        if (this._boardInstalled) return;
        const board = document.getElementById("board");
        if (!board) return;
        this._boardInstalled = true;
        board.addEventListener("dragover", this._boardDragover);
        board.addEventListener("drop", this._boardDrop);
    }

    #removeBoardDrop() {
        const board = document.getElementById("board");
        if (board) {
            board.removeEventListener("dragover", this._boardDragover);
            board.removeEventListener("drop", this._boardDrop);
        }
        this._boardInstalled = false;
    }
}
