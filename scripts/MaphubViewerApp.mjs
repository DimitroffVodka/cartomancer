// v13+ FilePicker namespaced under foundry.applications.apps.
const FilePicker = foundry.applications.apps.FilePicker?.implementation ?? globalThis.FilePicker;

/**
 * MaphubViewerApp.mjs
 * ApplicationV2 window that displays a settlement map in an iframe.
 * The iframe is created entirely via DOM (not via HTML string / innerHTML) so
 * the parent can wire load handlers and read into the same-origin frame without
 * FoundryVTT's journal HTML sanitizer stripping attributes.
 *
 * For local maphub: serves index.html directly from the module's static path.
 * express.static does NOT add X-Frame-Options, so the iframe loads fine.
 * Using a server URL (not a blob:) also keeps relative asset paths inside
 * Village.js (Assets/village_default.json, etc.) resolving correctly.
 *
 * For external fallback: uses the watabou.github.io URL directly.
 */

import { OnePageParserSD } from "./maphub/OnePageParserSD.mjs";

const MODULE_ID = "cartomancer";
const { ApplicationV2 } = foundry.applications.api;

export class MaphubViewerApp extends ApplicationV2 {

	/** @param {{ type: string, queryString: string, externalBase: string }} options */
	constructor({ type, queryString = "", externalBase = "", importContext = null } = {}) {
		// Unique id per instance — the static DEFAULT_OPTIONS.id made every viewer a
		// forced singleton (a second generator collided in the app registry + DOM id).
		super({ id: `sdx-maphub-viewer-${type || "map"}-${foundry.utils.randomID(8)}` });
		this._mapType = type;
		this._queryString = queryString;
		this._externalBase = externalBase;
		// Realm-location import: when set, the imported scene lands in this folder,
		// does NOT auto-activate, and relinks its source journal. See RealmImporter.
		// { folderId, journalUuid, sceneName, activate }
		this._importContext = importContext;
		this._lastSavedDungeonJson = null;
		this._lastSavedDungeonJsonAt = 0;
		this._saveRotationWasOn = false;

		this._onMessage = this._onMessage.bind(this);
	}

	static DEFAULT_OPTIONS = {
		id: "sdx-maphub-viewer",
		classes: ["sdx-maphub-viewer"],
		tag: "div",
		window: {
			frame: true,
			positioned: true,
			title: "Settlement Map",
			resizable: true,
		},
		position: {
			width: 900,
			height: 660,
			top: 60,
		},
		actions: {
			exportToChat: MaphubViewerApp.#onExportToChat,
			showToPlayers: MaphubViewerApp.#onShowToPlayers,
			saveMapState: MaphubViewerApp.#onSaveMapState,
			importScene: MaphubViewerApp.#onImportScene,
			setAsBackground: MaphubViewerApp.#onSetAsBackground,
			addAsTile: MaphubViewerApp.#onAddAsTile,
			// Override core's window Detach/Attach so they preserve the current map
			// (they re-render → rebuild the iframe → a seedless generator re-rolls).
			detach: MaphubViewerApp.#onDetachPreserve,
			attach: MaphubViewerApp.#onAttachPreserve,
		},
	};

	// ── Render pipeline ───────────────────────────────────────────────────────

	/**
	 * Return a simple container div — the iframe is injected in _onRender
	 * so we can use async and are guaranteed the element is in the DOM.
	 */
	async _renderHTML(_context, _options) {
		const container = document.createElement("div");
		container.className = "sdx-maphub-container";
		container.style.cssText = "width:100%;height:100%;overflow:hidden;position:relative;";
		return container;
	}

	/**
	 * result = return value of _renderHTML (our container div)
	 * content = the application's .window-content element
	 */
	_replaceHTML(result, content, _options) {
		content.replaceChildren(result);
	}

	/**
	 * After the container div is in the DOM, build the src and inject the
	 * iframe entirely via DOM so we can wire load handlers and read into the
	 * same-origin frame without FoundryVTT's HTML sanitizer interfering.
	 */
	async _onRender(_context, _options) {
		window.addEventListener("message", this._onMessage);

		this._injectImportButton();

		const container = this.element.querySelector(".sdx-maphub-container");
		if (!container) return;

		const src = await this._buildSrc();
		if (!src) {
			container.textContent = "Failed to load settlement map.";
			return;
		}

		let loadedJsonText = null;

		// Clear Maphub buffers from Foundry's localStorage to prevent 
		// ghost maps from loading via Watabou's auto-restore behavior.
		const watabouKeys = [
			"_toy_town_buf_",
			"{{LOCALSTORAGE_TOWN_BUF}}",
			"town_buf",
			"village_buf",
			"cave_buf",
			"dwellings_buf"
		];
		watabouKeys.forEach(k => window.localStorage.removeItem(k));

		// Preload saved map state (if it exists) into localStorage
		try {
			const mapId = this._getMapIdFromQuery();
			// Check via FilePicker (real file listing) so the common "no saved state" case
			// doesn't log a console 404 for a missing file.
			const fileName = `maphub_${mapId}.json`;
			const FP = foundry.applications.apps.FilePicker?.implementation ?? globalThis.FilePicker;
			let saved = false;
			try { const r = await FP.browse("data", "maps/maphub"); saved = (r.files || []).some(f => f.split("/").pop() === fileName); } catch { saved = false; }
			if (saved && this._mapType !== "dungeon") {
				const res = await fetch(`${window.location.origin}/maps/maphub/${fileName}`);
				if (res.ok) {
					loadedJsonText = await res.text();
					window.localStorage.setItem("_toy_town_buf_", "j" + loadedJsonText);
					ui.notifications.info("Loaded Maphub saved state!");
				}
			}
		} catch (err) {
			// No saved file exists, ignore
		}

		const iframe = document.createElement("iframe");
		iframe.style.cssText = "width:100%;height:100%;border:none;display:block;";
		iframe.title = "Settlement Map";
		// No sandbox attribute: the framed content is the module's own first-party
		// generator, and the parent must read into it same-origin (contentDocument,
		// contentWindow, shared localStorage). allow-scripts + allow-same-origin
		// together neuter the sandbox anyway and only trip Chrome's "can escape its
		// sandboxing" warning, so we omit it entirely (matches MaphubSD's iframe).

		if (loadedJsonText) {
			iframe.onload = () => {
				console.log(`SDX | Iframe finished loading, dispatching maphub_load_json!`);
				iframe.contentWindow?.postMessage({
					type: 'maphub_load_json',
					json: loadedJsonText
				}, '*');
			};
		}

		if (this._mapType === "dungeon") {
			iframe.addEventListener("load", () => {
				setTimeout(() => {
					try {
						const doc = iframe.contentDocument;
						const cw = iframe.contentWindow;
						this._installIframeSaveHook(iframe);
						if (!doc?.querySelector("canvas") && doc?.getElementById("openfl-content") && cw?.lime?.$scripts?.Dungeon) {
							cw.lime.embed("Dungeon", "openfl-content", 0, 0, { parameters: {} });
							this._installIframeSaveHook(iframe);
						}
					} catch (err) {
						console.warn(`${MODULE_ID} | Failed to ensure dungeon generator canvas`, err);
					}
				}, 250);
				setTimeout(() => this._installIframeSaveHook(iframe), 1000);
				setTimeout(() => this._installIframeSaveHook(iframe), 2500);
			}, { once: true });
		}

		// Catch the generator's "Open in <generator>" links — they window.open() a
		// watabou URL (e.g. Realm's "Open in MFCG" → city-generator). Open them inside
		// Foundry as a new Cartomancer viewer instead of the OS browser. Install on
		// load + a couple retries (the app wires up late).
		iframe.addEventListener("load", () => {
			this._installGeneratorLinkHook(iframe);
			setTimeout(() => this._installGeneratorLinkHook(iframe), 1000);
			setTimeout(() => this._installGeneratorLinkHook(iframe), 2500);
		}, { once: true });

		iframe.src = src;

		container.replaceChildren(iframe);
		this._iframe = iframe;

		// Realm (Perilous Shores): default to flat-topped hexes so the map displays —
		// and imports as — a Foundry-friendly flat-top hex grid.
		if (this._mapType === "realm") this._forceRealmFlatTopWhenReady();

		this._maybeAutoDetach();
	}

	/**
	 * If the user prefers it (setting), pop the generator into a detached window on
	 * first open — early, before it finishes generating, so it loads ONCE in the
	 * detached window (no flash) and the user never has to use core's Detach control
	 * mid-work (which reloads and can regenerate the map). The flag stops the detach
	 * re-render from re-detaching.
	 */
	_maybeAutoDetach() {
		if (this._autoDetached) return;
		// Location-generation opens (realm "Generate this map") exist to be imported
		// immediately — and import reads the iframe canvas/JSON, which only works while
		// the iframe is in THIS window. Keep these docked so the import succeeds.
		if (this._importContext) return;
		let pref = false;
		try { pref = !!game.settings.get(MODULE_ID, "openGeneratorsDetached"); } catch { return; }
		if (!pref) return;
		this._autoDetached = true;
		setTimeout(() => {
			try { this.detachWindow?.(); }
			catch (e) { console.warn(`${MODULE_ID} | auto-detach failed`, e); }
		}, 50);
	}

	/** Poll until the generator iframe has redrawn (used after docking before import). */
	async _waitForGeneratorReady(maxMs = 12000) {
		const steps = Math.ceil(maxMs / 200);
		for (let i = 0; i < steps; i++) {
			await new Promise(r => setTimeout(r, 200));
			try {
				const cw = this._iframe?.contentWindow;
				const c = this._iframe?.contentDocument?.querySelector("canvas");
				if (!(c?.width > 0)) continue;
				if (this._mapType === "dungeon" && !cw?.__sdxDungeonView) continue;
				if (this._mapType === "dwellings" && !cw?.__sdxDwellView) continue;
				if (this._mapType === "realm" && !cw?.__maphubClasses) continue;
				return true;
			} catch { /* keep polling */ }
		}
		return false;
	}

	// ── Header controls ───────────────────────────────────────────────────────

	/** Add header controls. */
	_getHeaderControls() {
		const controls = super._getHeaderControls?.() ?? [];

		// Add "Set as Background"
		controls.unshift({
			icon: "fa-solid fa-image",
			label: "Set as BG",
			action: "setAsBackground",
		});

		// Add "Import Scene"
		controls.unshift({
			icon: "fa-solid fa-map",
			label: "Import Scene",
			action: "importScene",
		});

		// Add "Add as Tile"
		controls.unshift({
			icon: "fa-solid fa-cubes",
			label: "Add as Tile",
			action: "addAsTile",
		});

		// Add "Show to Players"
		controls.unshift({
			icon: "fa-solid fa-eye",
			label: "Show to Players",
			action: "showToPlayers",
		});

		// Add "Export to Chat"
		controls.unshift({
			icon: "fa-solid fa-comment-dots", // changed icon so it does not conflict
			label: "Export to Chat",
			action: "exportToChat",
		});

		// Add "Save Map State"
		controls.unshift({
			icon: "fa-solid fa-floppy-disk",
			label: "Save Map State",
			action: "saveMapState",
		});

		return controls;
	}

	/**
	 * Inject an always-visible "Import Scene" button directly into the window
	 * header bar (next to the ⋯ controls menu). The other actions live in the
	 * collapsed ⋯ dropdown; importing is the primary action, so it gets a
	 * prominent labelled button so users don't have to hunt for it.
	 */
	_injectImportButton() {
		try {
			if (!game.user.isGM) return;
			const header = this.element?.querySelector(".window-header");
			if (!header || header.querySelector(".sdx-import-scene-btn")) return;

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "header-control sdx-import-scene-btn";
			btn.innerHTML = `<i class="fa-solid fa-map"></i><span>Import Scene</span>`;
			btn.setAttribute("aria-label", "Import Scene");
			btn.dataset.tooltip = "Create a Foundry scene from this map";
			btn.style.cssText = [
				"display:inline-flex", "align-items:center", "gap:4px",
				"width:auto", "padding:0 8px", "margin-right:4px",
				"font-size:var(--font-size-12,12px)", "white-space:nowrap",
				"border:1px solid var(--color-border-light-tertiary,#7a7971)",
				"border-radius:4px", "flex:0 0 auto",
			].join(";");
			btn.addEventListener("click", (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				this._importScene();
			});

			// Place it just before the controls (⋯) menu toggle / close button.
			const anchor = header.querySelector('[data-action="toggleControls"]')
				?? header.querySelector('button.header-control[data-action="close"]')
				?? header.querySelector('[data-action="close"]');
			if (anchor) header.insertBefore(btn, anchor);
			else header.appendChild(btn);
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to inject Import Scene header button`, err);
		}
	}

	/** Action handler for Export to Chat header button. */
	static async #onExportToChat() {
		await this._exportToChat();
	}

	/** Action handler for Show to Players header button. */
	static async #onShowToPlayers() {
		await this._showToPlayers();
	}

	/** Action handler for Set as BG header button. */
	static async #onSetAsBackground() {
		await this._setAsBackground();
	}

	/** Action handler for Import Scene header button. */
	static async #onImportScene() {
		await this._importScene();
	}

	/** Action handler for Add as Tile header button. */
	static async #onAddAsTile() {
		await this._addAsTile();
	}

	/** Action handler for Save Map State header button. */
	static async #onSaveMapState() {
		ui.notifications.info("To save the map state, Right-Click the map, go to Export as -> JSON. The state will silently save to the server instead of downloading.", { permanent: true });
	}

	/**
	 * Detach/Attach are core controls that re-render the app, rebuilding the iframe.
	 * A seedless generator would re-roll to a fresh random map and lose the user's
	 * work, so capture the current map's seed into this._queryString first.
	 */
	static async #onDetachPreserve() {
		if (await this._reseedBeforeReframe()) await this.detachWindow();
	}

	static async #onAttachPreserve() {
		if (await this._reseedBeforeReframe()) await this.attachWindow();
	}

	/**
	 * Sync this._queryString to the CURRENT map so the next iframe rebuild reproduces
	 * it. Returns true to proceed (reproducible, or the user accepted regeneration).
	 */
	async _reseedBeforeReframe() {
		try {
			if (this._mapType === "realm") {
				const origin = this._extractRealmData()?.origin;
				if (origin) {
					try {
						const u = new URL(origin);
						this._externalBase = `${u.origin}${u.pathname}`;
						this._queryString = u.search.replace(/^\?/, "");
						return true;
					} catch { /* fall through to the generic checks */ }
				}
			}
			// Already seed-bound (e.g. opened from a realm link) → a reload reproduces it.
			if (this._queryString && /(^|&)seed=/.test(this._queryString)) return true;
			// Nothing to restore from — warn before the map is regenerated.
			const { DialogV2 } = foundry.applications.api;
			return await DialogV2.confirm({
				window: { title: "Move generator window?" },
				content: `<p>Moving this window reloads the generator, which will <strong>regenerate the map</strong> — there's no seed to restore the current one.</p>`
					+ `<p>If you want to keep this map, <em>Import Scene</em> first. Move anyway?</p>`,
				rejectClose: false,
				modal: true,
			});
		} catch (e) {
			console.warn(`${MODULE_ID} | reseed-before-reframe failed`, e);
			return true;
		}
	}

	_getMapIdFromQuery() {
		try {
			const params = new URLSearchParams(this._queryString);
			const seed = params.get("seed") || "noseed";
			const name = params.get("name") || "noname";
			return `${this._mapType}_${seed}_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "");
		} catch (e) {
			return `unknown_${Date.now()}`;
		}
	}

	_installIframeSaveHook(iframe) {
		try {
			const cw = iframe?.contentWindow;
			if (!cw || typeof cw.saveAs !== "function" || cw.saveAs.__sdxFoundrySaveAs) return false;

			const originalSaveAs = cw.saveAs;
			const app = this;
			const foundrySaveAs = function (blob, filename, ...rest) {
				if (filename) {
					if (filename.endsWith(".json") || filename.endsWith(".pb")) {
						void app.#handleSave({ type: "maphub_save_json", blob, filename });
						return;
					}
					if (filename.endsWith(".png")) {
						void app.#handleSave({ type: "maphub_save_image", blob, filename, format: "png" });
						return;
					}
					if (filename.endsWith(".svg")) {
						void app.#handleSave({ type: "maphub_save_image", blob, filename, format: "svg" });
						return;
					}
				}
				return originalSaveAs.call(this, blob, filename, ...rest);
			};
			foundrySaveAs.__sdxFoundrySaveAs = true;
			cw.saveAs = foundrySaveAs;
			return true;
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to install Maphub save hook`, err);
			return false;
		}
	}

	/**
	 * Override the generator iframe's window.open so its "Open in <generator>" links
	 * (which window.open a watabou.github.io URL) open inside Foundry as a new
	 * Cartomancer viewer instead of the OS default browser. Non-generator URLs fall
	 * through to the original window.open. Idempotent.
	 */
	_installGeneratorLinkHook(iframe) {
		try {
			const cw = iframe?.contentWindow;
			if (!cw || typeof cw.open !== "function" || cw.open.__sdxOpenHook) return false;
			const originalOpen = cw.open.bind(cw);
			const app = this;
			const hooked = function (url, ...rest) {
				try {
					const parsed = app._parseGeneratorUrl(url);
					if (parsed) { app._openLinkedGenerator(parsed); return null; }
				} catch (e) { console.warn(`${MODULE_ID} | generator link hook failed`, e); }
				return originalOpen(url, ...rest);
			};
			hooked.__sdxOpenHook = true;
			cw.open = hooked;
			return true;
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to install generator link hook`, err);
			return false;
		}
	}

	/** Map a watabou generator URL → viewer params, or null if it isn't one. */
	_parseGeneratorUrl(url) {
		let u;
		try { u = new URL(String(url ?? ""), "https://watabou.github.io"); } catch { return null; }
		if (!/(^|\.)watabou\.github\.io$/i.test(u.hostname)) return null;
		const TYPE_BY_PATH = {
			"city-generator": "mfcg",
			"village-generator": "village",
			"perilous-shores": "realm",
			"caves": "cave",
			"one-page-dungeon": "dungeon",
			"dwellings": "dwellings",
		};
		const seg = (u.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
		const type = TYPE_BY_PATH[seg];
		if (!type) return null;
		return { type, queryString: u.search.replace(/^\?/, ""), externalBase: `${u.origin}${u.pathname}` };
	}

	/** Open a generator linked from another ("Open in MFCG", etc.) in a new viewer. */
	async _openLinkedGenerator({ type, queryString, externalBase }) {
		const viewer = new MaphubViewerApp({ type, queryString, externalBase });
		await viewer.render(true);
	}

	/**
	 * Read the Perilous Shores realm export from the live iframe, the same object
	 * the generator's "Export as → JSON" produces:
	 *   new Serializer(view.region).region2data()  ->  {name, origin, bp, hexes, ...}
	 * Returns null if the generator isn't a loaded realm. (The realm is a heavy
	 * canvas app; this only works once it has finished loading — i.e. at import time.)
	 */
	_extractRealmData() {
		try {
			const cw = this._iframe?.contentWindow;
			if (!cw) return null;
			// Perilous.js is patched (like Cave.js) to expose its Haxe class registry as
			// window.__maphubClasses. From it we get the Serializer AND the live region:
			// com.watabou.perilous.model.Region keeps the current region as a static
			// singleton (`ca.inst = this`). region2data() needs only that region object.
			// A fully-built realm region has bp + dcel + indices (region2data() dereferences
			// region.dcel.faces and region.indices.h). Feature-detect rather than trust a
			// name, and require a complete region so we never serialize a half-built one.
			const isRegion = (r) => !!(r && typeof r === "object" && r.bp && r.dcel && r.indices && ("name" in r));
			const classes = cw.__maphubClasses;
			let Serializer = null, region = null;
			if (classes) {
				Serializer = classes["com.watabou.perilous.model.Serializer"] || null;
				// Region keeps the live region as a static singleton (ca.inst); MapScene
				// holds the same object on .region (Ya.inst.region) — try both.
				if (isRegion(classes["com.watabou.perilous.model.Region"]?.inst)) region = classes["com.watabou.perilous.model.Region"].inst;
				if (!region && isRegion(classes["com.watabou.perilous.MapScene"]?.inst?.region)) region = classes["com.watabou.perilous.MapScene"].inst.region;
				// Fallback: any registered class whose .inst (or .inst.region) is a region.
				if (!region) {
					for (const cls of Object.values(classes)) {
						try { if (isRegion(cls?.inst)) { region = cls.inst; break; } if (isRegion(cls?.inst?.region)) { region = cls.inst.region; break; } } catch {}
					}
				}
			}
			if (Serializer && region) {
				const data = new Serializer(region).region2data();
				if (data && data.hexes) return data;
			}
			// Last-ditch: a view-style global that carries .region (other generators).
			const view = cw.maphubAppInstance || cw.maphubRealmAppInstance;
			const viewRegion = view?.region;
			if (Serializer && viewRegion?.bp) {
				const data = new Serializer(viewRegion).region2data();
				if (data && data.hexes) return data;
			}
			return null;
		} catch (e) {
			console.warn(`${MODULE_ID} | Failed to extract realm data`, e);
			return null;
		}
	}

	/** Ask whether to also build location journals for a realm. Returns boolean. */
	async _promptRealmLocations(realmData, locs) {
		const { DialogV2 } = foundry.applications.api;
		const LABELS = { mfcg: "City", village: "Village", dungeon: "Dungeon", cave: "Cave", dwellings: "Dwelling" };
		const counts = {};
		for (const l of locs) counts[l.type] = (counts[l.type] || 0) + 1;
		const summary = Object.entries(counts).map(([t, n]) => `${n} ${LABELS[t] || t}`).join(", ");
		const name = String(realmData?.name || "Realm");
		try {
			const choice = await DialogV2.wait({
				window: { title: `Import realm “${name}”` },
				content: `<p>This realm links <strong>${locs.length}</strong> location(s): ${summary}.</p>`
					+ `<p>Also create a “${name}” folder of cross-linked journals for them? Each location's map is generated on demand — one click in its journal — so nothing heavy happens now.</p>`,
				buttons: [
					{ action: "locations", label: "Map + location journals", default: true },
					{ action: "map", label: "Just the map" },
				],
				rejectClose: false,
			});
			return choice === "locations";
		} catch {
			return false;
		}
	}

	/**
	 * Map each realm location to a pixel position on the captured scene image using
	 * the generator's OWN rendered geometry (so warp/tilt/vantage are respected):
	 *   cell.center (world) → view.localToGlobal → stage(CSS)px → ×dpr → backing px.
	 * MUST run at capture time (after the window maximised) — the view transform
	 * depends on the current canvas size. Returns { [name]: {x, y} } in scene pixels.
	 */
	_extractRealmLocationPositions(sceneW, sceneH) {
		try {
			const cw = this._iframe?.contentWindow;
			const C = cw?.__maphubClasses;
			const region = C?.["com.watabou.perilous.model.Region"]?.inst;
			const scene = C?.["com.watabou.perilous.MapScene"]?.inst;
			const view = scene?.view;
			const Point = C?.["openfl.geom.Point"];
			if (!region?.getFeatures || !view?.localToGlobal || !Point) return {};
			const gc = this._iframe?.contentDocument?.querySelector("canvas");
			const stageW = gc?.clientWidth || sceneW || 1;
			const stageH = gc?.clientHeight || sceneH || 1;
			const fx = (sceneW || gc?.width || stageW) / stageW;
			const fy = (sceneH || gc?.height || stageH) / stageH;
			const out = {};
			for (const f of region.getFeatures()) {
				const c = f?.cell?.center;
				if (!c || !f.name) continue;
				try {
					const g = view.localToGlobal(new Point(c.x, c.y));
					out[String(f.name).trim()] = { x: Math.round(g.x * fx), y: Math.round(g.y * fy) };
				} catch { /* skip a bad feature */ }
			}
			return out;
		} catch (e) {
			console.warn(`${MODULE_ID} | realm location positions failed`, e);
			return {};
		}
	}

	async _onMessage(event) {
		// Global window 'message' listener: only act on messages from THIS app's
		// iframe. It runs untrusted third-party generator code and any frame/tab on
		// the same origin could otherwise post these and trigger file writes.
		if (!event || event.source !== this._iframe?.contentWindow) return;
		return this.#handleSave(event.data);
	}

	/** Persist a save payload (json/image) from the generator. Trusted/internal. */
	async #handleSave(data) {
		if (data && data.type === "maphub_save_json") {
			const { blob, filename } = data;

			const mapId = this._getMapIdFromQuery();
			const saveFilename = `maphub_${mapId}.json`;
			const uploadPath = `maps/maphub`;

			try {
				await FilePicker.createDirectory("data", "maps").catch(() => { });
				await FilePicker.createDirectory("data", uploadPath).catch(() => { });

				const jsonText = typeof blob?.text === "function" ? await blob.text() : String(blob ?? "");
				if (this._mapType === "dungeon" && filename.endsWith(".json")) {
					this._lastSavedDungeonJson = JSON.parse(jsonText);
					this._lastSavedDungeonJsonAt = Date.now();
				}
				const file = new File([jsonText], saveFilename, { type: "application/json" });
				const response = await FilePicker.upload("data", uploadPath, file, {});
				if (response?.path) {
					ui.notifications.info(`Map state saved to ${saveFilename}!`);
				} else {
					ui.notifications.error("Failed to upload map state.");
				}
			} catch (e) {
				console.error(`${MODULE_ID} | Failed to save map state`, e);
				ui.notifications.error("Failed to upload map state.");
			}
		} else if (data && data.type === "maphub_save_image") {
			const { blob, filename, format } = data;

			const mapId = this._getMapIdFromQuery();
			const timestamp = Date.now();
			const saveFilename = `maphub_${mapId}_${timestamp}.${format}`;
			const uploadPath = `maps/maphub`;

			try {
				await FilePicker.createDirectory("data", "maps").catch(() => { });
				await FilePicker.createDirectory("data", uploadPath).catch(() => { });

				let fileBlob = blob;
				if (typeof blob === "string") {
					fileBlob = new Blob([blob], { type: format === "svg" ? "image/svg+xml" : "image/png" });
				}

				const file = new File([fileBlob], saveFilename, { type: format === "svg" ? "image/svg+xml" : "image/png" });
				const response = await FilePicker.upload("data", uploadPath, file, {});
				if (response?.path) {
					if (this._pendingCaptureResolve) {
						this._pendingCaptureResolve(response.path);
						this._pendingCaptureResolve = null;
					} else {
						ui.notifications.info(`Image saved to ${saveFilename}!`);
					}
				} else {
					if (this._pendingCaptureResolve) {
						this._pendingCaptureResolve(null);
						this._pendingCaptureResolve = null;
					}
					ui.notifications.error("Failed to upload map image.");
				}
			} catch (e) {
				console.error(`${MODULE_ID} | Failed to save map image`, e);
				if (this._pendingCaptureResolve) {
					this._pendingCaptureResolve(null);
					this._pendingCaptureResolve = null;
				}
				ui.notifications.error("Failed to upload map image.");
			}
		}
	}

	// ── Export and Share ──────────────────────────────────────────────────────

	/**
	 * Common helper to capture the canvas, convert to PNG, and upload.
	 * Returns the uploaded file path, or null on failure.
	 */
	async _captureAndUploadMap() {
		const iframe = this._iframe;
		if (!iframe) {
			ui.notifications.warn("Map not loaded yet.");
			return null;
		}

		const cw = iframe.contentWindow;

		let exportFn = null;
		if (cw?.maphubVillageAppInstance?.view?.exportPNG) {
			exportFn = () => cw.maphubVillageAppInstance.view.exportPNG();
		} else if (cw?.maphubCaveAppInstance?.exportPNG) {
			exportFn = () => cw.maphubCaveAppInstance.exportPNG();
		} else if (cw?.maphubDwellingsAppInstance?.exportAsPNG) {
			// Note: Dwellings might not have a working exportAsPNG natively, but we hook it if it does
			exportFn = () => cw.maphubDwellingsAppInstance.exportAsPNG();
		} else if (cw?.maphubAppInstance?.asPNG) { // MFCG
			exportFn = () => cw.maphubAppInstance.asPNG();
		}

		if (exportFn) {
			ui.notifications.info("Generating high-resolution map...");
			return new Promise((resolve) => {
				this._pendingCaptureResolve = resolve;
				try {
					exportFn();
				} catch (e) {
					console.error("Failed to run high-res export", e);
					this._pendingCaptureResolve = null;
					resolve(null);
				}
				// 15 second timeout to prevent hanging if the generator fails silently
				setTimeout(() => {
					if (this._pendingCaptureResolve === resolve) {
						ui.notifications.error("High-res export timed out.");
						this._pendingCaptureResolve = null;
						resolve(null);
					}
				}, 15000);
			});
		}

		let canvas;
		try {
			canvas = iframe.contentDocument?.querySelector("canvas");
		} catch (e) {
			ui.notifications.error("Cannot access map canvas (cross-origin).");
			return null;
		}
		if (!canvas) {
			ui.notifications.warn("No canvas found in the map viewer.");
			return null;
		}

		ui.notifications.info("Capturing map...");

		try {
			const blob = await new Promise((resolve, reject) => {
				canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
			});

			const timestamp = Date.now();
			const genType = this._mapType || "map";
			const filename = `${genType}_${timestamp}.png`;
			const uploadPath = `maps/maphub`;

			// Foundry's createDirectory isn't recursive, so we create parent first
			await FilePicker.createDirectory("data", "maps").catch(() => { });
			await FilePicker.createDirectory("data", uploadPath).catch(() => { });

			const file = new File([blob], filename, { type: "image/png" });
			const response = await FilePicker.upload("data", uploadPath, file, {});
			if (!response?.path) {
				ui.notifications.error("Failed to upload map image.");
				return null;
			}
			return response.path;
		} catch (e) {
			console.error(`${MODULE_ID} | Map capture failed:`, e);
			ui.notifications.error(`Capture failed: ${e.message}`);
			return null;
		}
	}

	/** Export to chat. */
	async _exportToChat() {
		const imgPath = await this._captureAndUploadMap();
		if (!imgPath) return;

		try {
			await ChatMessage.create({
				content: `<div style="text-align:center;">
					<p><strong>🗺️ ${this._getMapLabel()}</strong></p>
					<img src="${imgPath}" style="max-width:100%;border-radius:6px;border:1px solid #555;" />
				</div>`,
				speaker: ChatMessage.getSpeaker(),
			});
			ui.notifications.info("Map exported to chat!");
		} catch (e) {
			ui.notifications.error("Failed to create chat message.");
		}
	}

	/** Show image to players using ImagePopout. */
	async _showToPlayers() {
		const imgPath = await this._captureAndUploadMap();
		if (!imgPath) return;

		try {
			const ip = new ImagePopout(imgPath, { title: this._getMapLabel() });
			ip.render(true);
			ip.shareImage();
			ui.notifications.info("Map shared with players!");
		} catch (e) {
			ui.notifications.error("Failed to share image.");
		}
	}

	/** Capture the current Maphub generator output and create a new Foundry scene. */
	async _importScene() {
		if (!game.user.isGM) return;

		// Capturing reads the iframe's live canvas + model, which works for every
		// generator EXCEPT One Page Dungeon even while the window is detached — so we
		// DON'T dock back (docking rebuilds the iframe from the seed/permalink, which
		// regenerates the base map and destroys manual edits: renamed features, added
		// towns, paintings, moved labels). One Page Dungeon is the exception: its wall
		// export fires via a synthetic 'J' keypress that's unreliable while detached, so
		// it docks back to import reliably. Its geometry is seed-deterministic (walls
		// survive the rebuild); cosmetic edits don't — import while docked to keep them.
		// (_canAttach() is true only when detached; capture also needs a reachable canvas.)
		if (this._canAttach?.() && (this._mapType === "dungeon" || !this._isMapCanvasReadable())) {
			ui.notifications.info("Docking the generator back so the map can be imported…");
			try {
				if (this._mapType === "realm") {
					const origin = this._extractRealmData()?.origin;
					if (origin) { const u = new URL(origin); this._externalBase = `${u.origin}${u.pathname}`; this._queryString = u.search.replace(/^\?/, ""); }
				}
				await this.attachWindow();
				await this._waitForGeneratorReady();
			} catch (e) { console.warn(`${MODULE_ID} | dock-before-import failed`, e); }
		}

		const isDwellings = this._mapType === "dwellings";
		const isCave = this._mapType === "cave";
		const isDungeon = this._mapType === "dungeon";
		const isRealm = this._mapType === "realm";
		// Realm flat-top is defaulted on load (_forceRealmFlatTopWhenReady); we do NOT
		// re-force it here, so a user who deliberately switched to Pointy is respected —
		// the import follows whatever hex orientation the map currently has.

		// Realm: offer to also create cross-linked journals for the linked
		// cities/villages/dungeons (each map generates on demand). Extract the realm
		// model now — the iframe is loaded and capture/maximize would disturb it.
		let realmData = null, alsoLocations = false;
		if (isRealm) {
			realmData = this._extractRealmData();
			if (realmData) {
				const { parseRealmLocations } = await import("./RealmImporter.mjs");
				const locs = parseRealmLocations(realmData);
				if (locs.length) alsoLocations = await this._promptRealmLocations(realmData, locs);
			}
		}
		// For One Page Dungeon, automatically export the current JSON so the
		// wall data always matches the map image. Pressing 'J' triggers
		// Bb.exportJSON inside the generator which flows through our saveAs
		// hook → _lastSavedDungeonJson.
		if (isDungeon) {
			// Dungeon is docked by the guard above, so the 'J'-key export fires reliably.
			const exported = await this._exportCurrentDungeonJson();
			if (!exported) {
				ui.notifications.warn("Could not export dungeon JSON. Make sure the One Page Dungeon generator is fully loaded before Import Scene.");
				return;
			}
		}
		// Dwelling: build a v14 multi-level scene (one elevation Level per floor,
		// per-floor walls, changeLevel stair regions). Falls through to the generic
		// image import only if the live generator controller isn't reachable.
		// A realm-location import (importContext) always uses the generic image path
		// so its journal-relink callback fires; realms never link the dwelling generator.
		if (isDwellings && !this._importContext) {
			const handled = await this._importDwellingScene();
			if (handled) return;
		}
		await this._dismissGeneratorContextMenu();
		const oldState = await this._maximizeForCapture();
		// Force the dungeon to render axis-aligned before capture so the walls
		// AND Foundry's grid line up. Auto-rotation otherwise tilts the map by
		// an arbitrary angle to fit the page.
		if (isDungeon) await this._forceDungeonAxisAligned();
		const imgPath = await this._captureAndUploadMap();
		if (!imgPath) {
			if (isDwellings) this._restoreAfterCapture(oldState);
			return;
		}

		try {
			let sceneName;
			const caveName = (this._mapType === "cave") ? this._getCaveModel()?.name : null;
			if (this._importContext?.sceneName) sceneName = this._importContext.sceneName;
			else if (isRealm && realmData?.name) sceneName = realmData.name;
			else if (caveName) sceneName = caveName;
			else sceneName = `${this._getMapLabel()} ${new Date().toLocaleString()}`;
			let grid = this._getImportGridSize();

			let walls = [];
			let notes = [];
			let dungeonTransform = null;
			let importImg = imgPath;          // background to use (may be rescaled)
			let importW = null, importH = null;

			// Exact grid alignment for Dungeon + Cave.
			//
			// Foundry's scene grid is anchored at canvas (0,0) and its lines fall
			// at integer multiples of grid.size (an integer). The generator draws
			// cells at a NON-integer pixel size, so rounding grid.size leaves the
			// grid drifting a fraction of a cell — the "slightly off" the user saw.
			//
			// Fix: rescale the captured image by f = round(cellPx)/cellPx so one
			// cell becomes EXACTLY gridPx pixels (no drift), then crop it by the
			// sub-cell phase so the generator's cell-zero edge lands on (0,0). The
			// walls/notes go through the same scale+crop. Result: Foundry's default
			// grid coincides with the map's cells with no offset fields at all.
			//
			// `align` carries the per-generator render mapping; `mapPx` applies the
			// scale+crop to any captured-canvas pixel.
			let mapPx = (x, y) => ({ x: Math.round(x), y: Math.round(y) });
			let align = null;
			let realmAlign = null;
			let realmGridType = null;
			let dungeonToPixel = null;
			let caveDpr = 1;
			if (isDungeon) {
				dungeonTransform = this._getDungeonTransform();
				if (!dungeonTransform) {
					throw new Error("One Page Dungeon render transform was not available. Reopen the generator (bundled local files) and try again.");
				}
				// The render transform (toPixel/cellPx) is in CSS/stage px, but the captured
				// PNG is the canvas BACKING store (× devicePixelRatio). Scale to backing px so
				// the walls match the image instead of coming out 1/dpr too small and offset.
				const srcCanvas = this._iframe?.contentDocument?.querySelector("canvas");
				const dpr = (srcCanvas && srcCanvas.clientWidth > 0) ? (srcCanvas.width / srcCanvas.clientWidth) : (this._iframe?.contentWindow?.devicePixelRatio || 1);
				const Tcss = dungeonTransform.toPixel;
				dungeonToPixel = (gx, gy) => { const p = Tcss(gx, gy); return { x: p.x * dpr, y: p.y * dpr }; };
				// Cell-zero edge sits at backing toPixel(0,0).
				align = { toPixel: dungeonToPixel, cellPx: dungeonTransform.cellPx * dpr, origin: dungeonToPixel(0, 0) };
			} else if (isCave) {
				const ca = this._getCaveAlignSource();
				if (ca) {
					// Same HiDPI correction as the dungeon: the cave render transform is in
					// CSS/stage px, but the captured PNG is the backing store (× dpr).
					const cc = this._iframe?.contentDocument?.querySelector("canvas");
					caveDpr = (cc && cc.clientWidth > 0) ? (cc.width / cc.clientWidth) : (this._iframe?.contentWindow?.devicePixelRatio || 1);
					align = { toPixel: ca.toPixel, cellPx: ca.cellPx * caveDpr, origin: { x: ca.origin.x * caveDpr, y: ca.origin.y * caveDpr } };
				}
			} else if (isRealm) {
				realmAlign = this._getRealmAlignSource();
			}

			if (align && align.cellPx > 0) {
				// Normalize to a usable Foundry grid size. The generator's raw rendered
				// cell px can be tiny (a small "Grid > Size" in Cave, "Small tiles" in
				// Dungeon) — using it directly gave microscopic tokens and forced the
				// user to retune Grid Size + Scene Scale. The image is rescaled by
				// f = gridPx/cellPx below, so one generator cell still maps to exactly
				// one Foundry square — just at a sensible on-screen size.
				const gridPx = this._normalizeGridPx(align.cellPx);
				const f = gridPx / align.cellPx;
				const phase = (v) => (((Math.round(v) % gridPx) + gridPx) % gridPx);
				const shiftX = phase(align.origin.x * f);
				const shiftY = phase(align.origin.y * f);
				const aligned = await this._renderAlignedImage(imgPath, f, shiftX, shiftY);
				importImg = aligned.path; importW = aligned.width; importH = aligned.height;
				grid = gridPx;
				mapPx = (x, y) => ({ x: Math.round(x * f - shiftX), y: Math.round(y * f - shiftY) });
			} else if (realmAlign) {
				// Realm (Perilous Shores): a regular flat/pointy hex lattice. Both the
				// generator and Foundry draw regular hexagons, so matching the row pitch
				// matches the whole lattice — only a 2D phase offset remains, applied with
				// the same scale+crop as the square path. grid.size is set to match the
				// native hex pitch (rounded to an integer; the image is rescaled by f to
				// keep the match exact), and the phase is computed against Foundry's own
				// HexagonalGrid so it's correct for the exact hex type.
				const { gridType, R, sImg, toPixel, sampleCenter, isFlat, isEven } = realmAlign;
				const nativeS = Math.sqrt(3) * R * sImg;                 // Foundry grid.size matching native pitch
				const gridPx = Math.max(60, Math.min(200, Math.round(nativeS)));
				const f = gridPx / nativeS;                              // rescale image so pitch == integer gridPx
				const fg = new foundry.grid.HexagonalGrid({ size: gridPx, columns: isFlat, even: isEven });
				const G = toPixel(sampleCenter.x, sampleCenter.y);
				const Gs = { x: G.x * f, y: G.y * f };
				const Fc = fg.getCenterPoint(fg.getOffset({ x: Gs.x, y: Gs.y }));
				const shiftX = Gs.x - Fc.x, shiftY = Gs.y - Fc.y;
				const aligned = await this._renderAlignedImage(imgPath, f, shiftX, shiftY);
				importImg = aligned.path; importW = aligned.width; importH = aligned.height;
				grid = gridPx;
				realmGridType = gridType;
			}

			let scene = await this._createImageScene({ name: sceneName, img: importImg, grid, width: importW, height: importH, gridType: realmGridType });

			if (isDungeon) {
				try {
					const parsed = OnePageParserSD.parseDungeonData(this._lastSavedDungeonJson, 1, { gridSpace: true });
					const T = dungeonToPixel;
					walls = (parsed.walls || []).map(w => {
						const t0 = T(w.c[0], w.c[1]); const a = mapPx(t0.x, t0.y);
						const t1 = T(w.c[2], w.c[3]); const b = mapPx(t1.x, t1.y);
						return { ...w, c: [a.x, a.y, b.x, b.y] };
					});
					notes = (parsed.notes || []).map(n => {
						const p = T(n.x, n.y);
						const m = mapPx(p.x, p.y);
						return { ...n, x: m.x, y: m.y };
					});
				} catch (e) {
					console.warn("Could not parse current Dungeon JSON for import", e);
				}
			} else if (isDwellings) {
				walls = this._getDwellingsWalls({ width: scene.width, height: scene.height, grid });
			} else if (isCave) {
				// _getCaveWalls returns CSS px; scale to backing (× dpr) to match the image, then mapPx.
				walls = this._getCaveWalls().map(w => {
					const a = mapPx(w.c[0] * caveDpr, w.c[1] * caveDpr);
					const b = mapPx(w.c[2] * caveDpr, w.c[3] * caveDpr);
					return { ...w, c: [a.x, a.y, b.x, b.y] };
				});
			}

			if (walls.length) {
				await scene.createEmbeddedDocuments("Wall", walls);
			}
			if (notes.length) {
				await scene.createEmbeddedDocuments("Note", notes);
			}

			// Realm-location import: relink the source journal to this new scene, and for
			// dungeons fold the room key (story + numbered notes) from the captured JSON
			// into the journal so it doubles as a readable dungeon key.
			if (this._importContext?.journalUuid) {
				try {
					const { RealmImporter } = await import("./RealmImporter.mjs");
					const detailHtml = isDungeon ? RealmImporter.buildDungeonDetailHtml(this._lastSavedDungeonJson) : "";
					await RealmImporter.onLocationSceneCreated(this._importContext.journalUuid, scene, detailHtml);
				} catch (e) { console.error(`${MODULE_ID} | location journal relink failed`, e); }
			}
			// Realm overview import: also build the location folder + cross-linked journals,
			// and Note pins on the realm scene (positions read from the live render NOW,
			// while the canvas is still at the captured/maximised size).
			if (isRealm && alsoLocations && realmData) {
				try {
					const positions = this._extractRealmLocationPositions(scene.width, scene.height);
					const { RealmImporter } = await import("./RealmImporter.mjs");
					await RealmImporter.importRealm(realmData, { realmScene: scene, positions });
				} catch (e) {
					console.error(`${MODULE_ID} | realm locations import failed`, e);
					ui.notifications.error(`Realm map imported, but linked-location journals failed: ${e.message}`);
				}
			}

			const wallNote = walls.length ? ` with ${walls.length} walls/doors` : "";
			const notesNote = notes.length ? ` and ${notes.length} notes` : "";
			ui.notifications.info(`Imported ${scene?.name ?? "map"} as a Foundry scene${wallNote}${notesNote}.`);
			this.close();
		} catch (e) {
			console.error(`${MODULE_ID} | Failed to import Maphub scene`, e);
			ui.notifications.error(`Failed to import scene: ${e.message}`);
			if (isDwellings) this._restoreAfterCapture(oldState);
		}
	}

	/** Live raw-Dwellings view controller (Dwellings.js is patched to expose it). */
	_getDwellView() {
		try { return this._iframe?.contentWindow?.__sdxDwellView ?? null; } catch (_) { return null; }
	}

	/**
	 * Show/hide the dwelling generator's UI layer (the corner menu, floor
	 * indicators, and name label) — a `coogee.ui.View` sibling of the map on the
	 * OpenFL stage. Hidden during capture so only the building is baked into the
	 * scene image. Uses the OpenFL setter (a plain `.visible=` is ignored by the
	 * renderer). Returns the layer, or null if not found.
	 */
	_setDwellUiVisible(view, visible) {
		try {
			const stage = view?.parent;
			const layer = (stage?.__children || []).find(k => /coogee\.ui\.View/.test(k?.__class__?.__name__ || k?.constructor?.name || ""));
			if (!layer) return null;
			if (typeof layer.set_visible === "function") layer.set_visible(visible);
			layer.__visible = visible;
			try { layer.visible = visible; } catch (_) { }
			return layer;
		} catch (_) { return null; }
	}

	/** Snapshot the generator's live canvas to an offscreen canvas (or null). */
	_grabCanvas() {
		try {
			const canvas = this._iframe?.contentDocument?.querySelector("canvas");
			if (!canvas) return null;
			const off = document.createElement("canvas");
			off.width = canvas.width; off.height = canvas.height;
			off.getContext("2d").drawImage(canvas, 0, 0);
			return off;
		} catch (_) { return null; }
	}

	/** Upload an offscreen canvas as a PNG under maps/maphub; returns its path. */
	async _uploadCanvas(off, filename) {
		try {
			const blob = await new Promise(r => off.toBlob(r, "image/png"));
			const FP = foundry.applications.apps.FilePicker?.implementation ?? FilePicker;
			await FP.createDirectory("data", "maps").catch(() => { });
			await FP.createDirectory("data", "maps/maphub").catch(() => { });
			const resp = await FP.upload("data", "maps/maphub", new File([blob], filename, { type: "image/png" }), {});
			return resp?.path || null;
		} catch (e) { console.warn(`${MODULE_ID} | dwelling upload failed`, e); return null; }
	}

	/**
	 * Detect the building's pixel bounding box in a captured floor image — the
	 * non-background (non-parchment) extent. Background is sampled from the
	 * top-left pixel (always parchment once the UI layer is hidden). Returns
	 * { x0, y0, x1, y1, w, h, bg } or null if nothing stands out.
	 */
	_detectBuildingBBox(off, threshold = 35) {
		try {
			const ctx = off.getContext("2d");
			const d = ctx.getImageData(0, 0, off.width, off.height).data;
			const bg = [d[0], d[1], d[2]];
			let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
			for (let y = 0; y < off.height; y += 2) for (let x = 0; x < off.width; x += 2) {
				const i = (y * off.width + x) * 4;
				if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > threshold) {
					if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
				}
			}
			if (!Number.isFinite(x0)) return null;
			return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, bg };
		} catch (_) { return null; }
	}

	/**
	 * Warp a captured floor canvas into the shared building grid so building-cell
	 * (j,i) lands at nodeToScene(j,i) — the same place the walls go. The captured
	 * transform `M` maps node→capture px (canvasPx = M.node), so the node region
	 * [mj..Mj]x[mi..Mi] is the source sub-rect to map onto the whole scene. `M` was
	 * read in the same frame as `off`, so they agree even mid-animation. Returns the
	 * uploaded scene-sized image path (used as the Level background).
	 */
	async _warpFloorImage(off, M, mj, mi, Mj, Mi, sceneW, sceneH, dpr = 1) {
		try {
			const out = document.createElement("canvas");
			out.width = sceneW; out.height = sceneH;
			const ctx = out.getContext("2d");
			// Parchment fill (top-left of the capture is parchment once the UI is hidden),
			// so any source area outside the captured canvas reads as parchment.
			try {
				const d = off.getContext("2d").getImageData(0, 0, 1, 1).data;
				ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
				ctx.fillRect(0, 0, sceneW, sceneH);
			} catch (_) { }
			// M maps node -> stage(CSS) px, but `off` is the canvas BACKING store (HiDPI:
			// backing = CSS * devicePixelRatio). Read the node region in BACKING px by
			// scaling M by dpr — otherwise the source rect is undersized and the floor
			// image lands shifted/clipped and out of register with the (grid-space) walls.
			const srcX = (M.a * mj + M.tx) * dpr, srcY = (M.d * mi + M.ty) * dpr;
			const srcW = (Mj - mj) * M.a * dpr, srcH = (Mi - mi) * M.d * dpr;
			ctx.drawImage(off, srcX, srcY, srcW, srcH, 0, 0, sceneW, sceneH);
			return await this._uploadCanvas(out, `dwellfloor_${Date.now()}.png`);
		} catch (e) { console.warn(`${MODULE_ID} | dwelling warp failed`, e); return null; }
	}

	/**
	 * Import a dwelling as a single v14 multi-level scene: one elevation Level per
	 * floor, each floor's map as a Level-scoped Tile, per-floor walls, and a
	 * changeLevel Region at every staircase bridging the two floors it connects.
	 * Returns true when handled (so _importScene skips the generic image path),
	 * false only when the controller isn't reachable (→ generic image fallback).
	 */
	async _importDwellingScene() {
		const view = this._getDwellView();
		const floors = view?.house?.floors;
		if (!view || !Array.isArray(floors) || !floors.length || typeof view.setFloor !== "function") return false;

		try {
			const LH = 10; // ft per level
				const ordinal = (k) => { const v = k % 100, sfx = (v >= 11 && v <= 13) ? "th" : (["th","st","nd","rd"][k % 10] || "th"); return `${k}${sfx}`; };
				// Levels to import, bottom -> top: basement (if any), ground, then upper floors.
				const units = [];
				if (view.house.basement) units.push({ floor: view.house.basement, setIdx: -1, name: "Basement", isGround: false });
				floors.forEach((f, i) => units.push({ floor: f, setIdx: i, name: i === 0 ? "Ground Floor" : `${ordinal(i)} Floor`, isGround: i === 0 }));
				const baseIdx = view.house.basement ? 1 : 0; // index of the ground floor within units
				units.forEach((u, k) => { u.bottom = (k - baseIdx) * LH; u.top = u.bottom + LH; });
				ui.notifications.info(`Importing dwelling — ${units.length} level${units.length === 1 ? "" : "s"}…`);

				// 1. Capture each level + its render transform FROM THE SAME FRAME. setFloor
				// animates the fit and the WebGL buffer can go blank once it settles, so retry
				// (re-triggering each time) until a non-blank frame; reading transform + pixels
				// back-to-back (no await between) keeps them on the same frame so the warp lines
				// the image up with the walls regardless of the animation state.
				for (const u of units) {
					let M = null, off = null;
					for (let attempt = 0; attempt < 14 && !off; attempt++) {
						view.setFloor(u.setIdx);
						this._setDwellUiVisible(view, false);
						// Nudge OpenFL/Lime to repaint — the WebGL buffer can stay blank
						// mid-fit or when the window isn't focused, which otherwise drops the
						// whole dwelling to the flat generic fallback.
						if (attempt > 0) { try { this._iframe?.contentWindow?.dispatchEvent(new Event("resize")); } catch (_) { } }
						await new Promise(r => setTimeout(r, attempt === 0 ? 900 : 350));
						const m = view.map.__getRenderTransform();
						const cap = this._grabCanvas();
						if (!m || !Number.isFinite(m.a) || !m.a || !cap) continue;
						const b = this._detectBuildingBBox(cap);
						if (b && b.w > 20 && b.h > 20) { M = { a: m.a, b: m.b, c: m.c, d: m.d, tx: m.tx, ty: m.ty }; off = cap; }
					}
					if (!off) return false;
					u.M = M; u.off = off;
				}

				// 2. Shared building grid from every level's geometry (contour + rooms), node
				// coords (x = node.j, y = node.i), plus a fixed roof/outer-wall margin. Shared
				// by ALL levels so they stack.
				let cmi = Infinity, cmj = Infinity, cMi = -Infinity, cMj = -Infinity;
				const accNode = (edges) => { for (const e of (edges || [])) for (const nd of [e?.a, e?.b]) { if (!nd) continue; cmi = Math.min(cmi, nd.i); cMi = Math.max(cMi, nd.i); cmj = Math.min(cmj, nd.j); cMj = Math.max(cMj, nd.j); } };
				for (const u of units) { accNode(u.floor.contour); for (const rm of (u.floor.rooms || [])) accNode(rm.contour); }
				if (!Number.isFinite(cmi)) return false;
				const ROOF = 2;
				const mi = Math.floor(cmi - ROOF), mj = Math.floor(cmj - ROOF), Mi = Math.ceil(cMi + ROOF), Mj = Math.ceil(cMj + ROOF);
				const cellsW = Math.max(1, Mj - mj), cellsH = Math.max(1, Mi - mi);
				const gridPx = Math.max(60, Math.min(160, Math.round(units[baseIdx].M.a * 1.8)));
				const sceneW = Math.round(cellsW * gridPx);
				const sceneH = Math.round(cellsH * gridPx);
				const nodeToScene = (j, i) => ({ x: Math.round((j - mj) * gridPx), y: Math.round((i - mi) * gridPx) });

				// 2b. Warp each level's capture into the shared grid (cell (j,i) -> nodeToScene).
				// The captures are the canvas BACKING store (HiDPI), so pass the
				// backing/CSS ratio so the warp samples the right region.
				const srcCanvas = this._iframe?.contentDocument?.querySelector("canvas");
				const dpr = (srcCanvas && srcCanvas.clientWidth > 0) ? (srcCanvas.width / srcCanvas.clientWidth) : (this._iframe?.contentWindow?.devicePixelRatio || 1);
				for (const u of units) {
					u.bg = await this._warpFloorImage(u.off, u.M, mj, mi, Mj, Mi, sceneW, sceneH, dpr);
					if (!u.bg) return false;
				}

				// 3. Scene with a named elevation Level per unit, each its OWN background image
				// (fit:"fill" — Foundry fills/centres it in the scene rect). One scene, many levels.
				const sceneName = `${this._getMapLabel()} ${new Date().toLocaleString()}`;
				const levelBg = (src) => ({ src, color: "#000000", tint: "#ffffff", alphaThreshold: 0 });
				const fillTex = { anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0, fit: "fill", scaleX: 1, scaleY: 1, rotation: 0 };
				const dwellDefaults = this._getSceneImportDefaults();
				const sceneData = {
					name: sceneName, width: sceneW, height: sceneH,
					grid: { size: gridPx, type: dwellDefaults.gridType }, padding: 0, backgroundColor: "#000000",
					fog: { mode: dwellDefaults.fogMode }, tokenVision: dwellDefaults.tokenVision,
					background: { src: units[baseIdx].bg },
					levels: units.map(u => ({ name: u.name, elevation: { bottom: u.bottom, top: u.top }, background: levelBg(u.bg), textures: fillTex })),
				};
				const scene = await Scene.create(sceneData);
				await scene.activate();
				units.forEach((u, k) => { u.level = scene.levels.find(l => (l.elevation?.bottom ?? null) === u.bottom) ?? scene.levels.contents[k]; });

				// 4. Per-level walls (with doors). Entrance door only on the ground floor.
				let wallTotal = 0;
				for (const u of units) {
					const walls = this._buildDwellWalls(u.floor, nodeToScene, { id: u.level.id, bottom: u.bottom, top: u.top, isGround: u.isGround });
					if (walls.length) { await scene.createEmbeddedDocuments("Wall", walls); wallTotal += walls.length; }
				}

				// 5. Stairs as changeLevel Regions, using the generator's OWN connectivity:
				// each stair knows its cell and the floor it connects to (s.to.plan). A cell
				// with both up- and down-stairs yields two regions (one per pair). Dedupe by
				// cell + the level pair it bridges.
				const floorToUnit = new Map(units.map(u => [u.floor, u]));
				const regionByKey = new Map();
				// Group every staircase by its CELL: one region per cell, spanning all the
				// levels reachable there. A single staircase serving 3+ levels becomes ONE
				// up/down chooser instead of stacked changeLevel regions (which fire duelling
				// level-change prompts on the same tile). REGION_VISIBILITY.LAYER throughout.
				const stairCells = new Map();
				const noteStair = (cell, uA, uB) => {
					if (!cell || typeof cell.i !== "number" || !uA || !uB || uA === uB) return;
					const k = `${cell.i},${cell.j}`;
					let e = stairCells.get(k);
					if (!e) { e = { cell, units: new Set() }; stairCells.set(k, e); }
					e.units.add(uA); e.units.add(uB);
				};
				for (const u of units) for (const s of (u.floor.stairs || [])) {
					const other = s?.to?.plan ? floorToUnit.get(s.to.plan) : null;
					if (other) noteStair(s.cell, u, other);
				}
				for (const [key, e] of stairCells) {
					const us = [...e.units].sort((a, b) => a.bottom - b.bottom);
					if (us.length < 2) continue;
					const cc = nodeToScene(e.cell.j + 0.5, e.cell.i + 0.5);
					const shapes = [{ type: "rectangle", x: cc.x - gridPx / 2, y: cc.y - gridPx / 2, width: gridPx, height: gridPx, hole: false }];
					const elevation = { bottom: us[0].bottom, top: us[us.length - 1].top, topInclusive: false };
					if (us.length === 2) {
						const [lo, hi] = us;
						regionByKey.set(key, {
							name: `Stairs: ${lo.name} ↔ ${hi.name}`, color: "#28c9cc", shapes, elevation,
							levels: [lo.level.id, hi.level.id], visibility: 0, locked: false,
							behaviors: [{ name: "Change Level", type: "changeLevel", system: { movementActions: [] } }],
						});
					} else {
						const conn = us.map(u => ({ name: u.name, bottom: u.bottom, id: u.level.id }));
						regionByKey.set(key, {
							name: `Stairs: ${us[0].name} ↔ ${us[us.length - 1].name}`, color: "#28c9cc", shapes, elevation,
							levels: us.map(u => u.level.id), visibility: 0, locked: false,
							flags: { [MODULE_ID]: { spiral: conn } },
							behaviors: [{ name: "Up/Down", type: "executeScript", system: { events: ["tokenMoveIn"], source: this._spiralRegionScript() } }],
						});
					}
				}
				// Spiral tower: one shared shaft connecting every above-ground floor at a single
				// cell. A MIDDLE floor can go both up AND down from it, which the default
				// changeLevel region can't express cleanly (stacked regions = duelling
				// prompts). Use ONE region spanning all the spiral's levels with a custom
				// up/down chooser (executeScript) instead.
				try {
					const spObj = (view.house.floors || []).map(f => f?.spiral).find(Boolean);
					const sp = spObj?.landing;
					const fu = units.filter(u => u.setIdx >= 0).sort((a, b) => a.bottom - b.bottom);
					if (sp && typeof sp.i === "number" && fu.length >= 2) {
						const conn = fu.map(u => ({ name: u.name, bottom: u.bottom, id: u.level.id }));
						// Place the region ON the spiral shaft — the tower cell diagonally
						// opposite the landing across the corner — so a token must stand on the
						// stairs to use them.
						let cell = sp;
						try {
							const C = [spObj.entrance.a, spObj.entrance.b].find(n1 => [spObj.exit.a, spObj.exit.b].some(n2 => n2 && n1 && n2.i === n1.i && n2.j === n1.j));
							if (C) { const cand = { i: 2 * C.i - 1 - sp.i, j: 2 * C.j - 1 - sp.j }; if (Math.abs(cand.i - sp.i) <= 1 && Math.abs(cand.j - sp.j) <= 1) cell = cand; }   // trust the reflected shaft cell only if adjacent to the landing (a far reflection lands across the building / in a hall)
						} catch (_) { }
						const cc = nodeToScene(cell.j + 0.5, cell.i + 0.5);
						regionByKey.set(`spiral|${sp.i},${sp.j}`, {
							name: "Spiral Staircase",
							color: "#28c9cc",
							shapes: [{ type: "rectangle", x: cc.x - gridPx / 2, y: cc.y - gridPx / 2, width: gridPx, height: gridPx, hole: false }],
							elevation: { bottom: fu[0].bottom, top: fu[fu.length - 1].top, topInclusive: false },
							levels: fu.map(u => u.level.id),
							visibility: 0, locked: false,   // REGION_VISIBILITY.LAYER: shown only on the Regions layer, not during play
							flags: { [MODULE_ID]: { spiral: conn } },
							behaviors: [{ name: "Spiral Up/Down", type: "executeScript", system: { events: ["tokenMoveIn"], source: this._spiralRegionScript() } }],
						});
					}
				} catch (_) { }
				const regions = [...regionByKey.values()];
				if (regions.length) await scene.createEmbeddedDocuments("Region", regions);

				ui.notifications.info(`Imported ${scene.name} — ${units.length} levels, ${wallTotal} walls, ${regions.length} stairs.`);
			this.close();
			return true;
		} catch (err) {
			console.error(`${MODULE_ID} | Multi-level dwelling import failed`, err);
			ui.notifications.error(`Multi-level dwelling import failed: ${err.message}`);
			return true; // handled (don't fall through to a second import)
		} finally {
			// Restore the generator's UI so it stays usable if the window is open.
			this._setDwellUiVisible(view, true);
		}
	}

	/**
	 * Source for the spiral-staircase region behavior (executeScript, tokenMoveIn).
	 * On entry it reads the connected level elevations from the region flags, finds
	 * which are above/below the token, and prompts Up / Down / Stay — so a middle
	 * floor (both directions from one shaft) gets a clean choice instead of duelling
	 * default changeLevel prompts. executeScript scope: (scene, region, behavior, event).
	 */
	_spiralRegionScript() {
		return [
			'if (!event?.user?.isSelf) return;',
				'const t = event?.data?.token; if (!t) return;',
				'const conn = region?.flags?.["cartomancer"]?.spiral;',
				'if (!Array.isArray(conn) || conn.length < 2) return;',
				'const origin = t.level;',
				'const here = conn.find(c => c.id === origin) ?? conn.slice().sort((a,b)=>Math.abs(a.bottom-(t.elevation??0))-Math.abs(b.bottom-(t.elevation??0)))[0];',
				'const cur = here?.bottom ?? (t.elevation ?? 0);',
				'const up = conn.filter(c => c.bottom > cur + 0.5).sort((a,b)=>a.bottom-b.bottom)[0];',
				'const down = conn.filter(c => c.bottom < cur - 0.5).sort((a,b)=>b.bottom-a.bottom)[0];',
				'if (!up && !down) return;',
				'const D = foundry.applications.api.DialogV2;',
				'const btns = [];',
				'if (up) btns.push({ action:"up", label:"Up to " + up.name, default: !down });',
				'if (down) btns.push({ action:"down", label:"Down to " + down.name, default: !up });',
				'btns.push({ action:"stay", label:"Stay" });',
				'let pick = "stay";',
				'try { pick = await D.wait({ window:{ title:"Spiral Staircase" }, content:"<p>Take the spiral staircase?</p>", buttons: btns, modal: true }); } catch (e) { pick = "stay"; }',
				'const dest = pick === "up" ? up : (pick === "down" ? down : null);',
				'if (!dest || dest.id === origin) return;',
				'await t.update({ level: dest.id, elevation: dest.bottom });',
				'try { if (t.parent?.isView && canvas.level?.id === origin) await t.parent.view({ level: dest.id, controlledTokens: [t.id] }); } catch (e) {}',
			].join("\n");
	}

	/** Build wall docs for one dwelling floor (outer contour + room contours), scoped to a Level. */
	_buildDwellWalls(floor, nodeToScene, levelCtx) {
		// Node-edge key, endpoint-order independent — lets us match door edges (from
		// room.doors) against the contour/room-outline edges we turn into walls.
		const ek = (a, b) => {
			const p = [[a.i, a.j], [b.i, b.j]].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
			return `${p[0][0]},${p[0][1]}|${p[1][0]},${p[1][1]}`;
		};
		// Door edges by type. REGULAR = a real door; DOORWAY/NULL = an open passage.
		const doorType = new Map();
		for (const rm of (floor.rooms || [])) {
			let list = [];
			try { const it = rm.doors?.iterator?.(); if (it) { while (it.hasNext()) list.push(it.next()); } else if (Array.isArray(rm.doors)) list = rm.doors; } catch (_) { }
			for (const d of list) {
				const e = d?.edge1; if (!e?.a || !e?.b) continue;
				const t = (d.type?.name || d.type?._hx_name || "").toUpperCase();
				doorType.set(ek(e.a, e.b), t || "NULL");
			}
		}
		// Building entrance: a door in the outer wall at the landing cell, on the
		// door's facing side (cell (i,j) edge in the dir's (di,dj) direction). Only the
		// ground floor has the real front door.
		try {
			const L = levelCtx.isGround ? floor.entrance?.landing : null;
			if (L && typeof L.i === "number") {
				// The entrance edge is whichever of the landing cell's four edges lies on
				// the outer contour (robust — no reliance on the door's direction enum).
				const contourKeys = new Set();
				for (const e of (floor.contour || [])) if (e?.a && e?.b) contourKeys.add(ek(e.a, e.b));
				const cand = [
					[{ i: L.i, j: L.j }, { i: L.i, j: L.j + 1 }],
					[{ i: L.i + 1, j: L.j }, { i: L.i + 1, j: L.j + 1 }],
					[{ i: L.i, j: L.j }, { i: L.i + 1, j: L.j }],
					[{ i: L.i, j: L.j + 1 }, { i: L.i + 1, j: L.j + 1 }],
				];
				for (const [a, b] of cand) { const k = ek(a, b); if (contourKeys.has(k)) { doorType.set(k, "REGULAR"); break; } }
			}
		} catch (_) { }

		// Spiral tower: enclose the round tower (the cells just outside the building
		// around the spiral's corner) and OPEN the contour edges between it and the
		// landing, so the shaft is a walled alcove you can step into. The corner node
		// is shared by the spiral's entrance + exit edges; tower cells are the cells
		// around it that aren't part of the floor.
		const skip = new Set();    // contour edges to leave OPEN (building <-> tower)
		const towerWallEdges = [];  // extra walls enclosing the tower's outer side
		try {
			const sp = floor.spiral;
			if (sp?.entrance && sp?.exit && Array.isArray(floor.area)) {
				const C = [sp.entrance.a, sp.entrance.b].find(n1 => [sp.exit.a, sp.exit.b].some(n2 => n2 && n1 && n2.i === n1.i && n2.j === n1.j));
				if (C) {
					const around = [[C.i - 1, C.j - 1], [C.i - 1, C.j], [C.i, C.j - 1], [C.i, C.j]];
					const areaSet = new Set(floor.area.map(c => `${c.i},${c.j}`));
					const tower = around.filter(([i, j]) => !areaSet.has(`${i},${j}`));
					const towerSet = new Set(tower.map(([i, j]) => `${i},${j}`));
					for (const [ti, tj] of tower) {
						const sides = [
							[{ i: ti, j: tj }, { i: ti, j: tj + 1 }, ti - 1, tj],         // N
							[{ i: ti + 1, j: tj }, { i: ti + 1, j: tj + 1 }, ti + 1, tj], // S
							[{ i: ti, j: tj }, { i: ti + 1, j: tj }, ti, tj - 1],         // W
							[{ i: ti, j: tj + 1 }, { i: ti + 1, j: tj + 1 }, ti, tj + 1], // E
						];
						for (const [a, b, ni, nj] of sides) {
							if (areaSet.has(`${ni},${nj}`)) skip.add(ek(a, b));               // open building <-> tower
							else if (!towerSet.has(`${ni},${nj}`)) towerWallEdges.push([a, b]); // tower outer wall
						}
					}
				}
			}
		} catch (_) { }

		const walls = [];
		const used = new Set();
		const add = (a, b) => {
			if (!a || !b) return;
			const nk = ek(a, b);
			if (used.has(nk)) return;
			used.add(nk);
			if (skip.has(nk)) return; // open connection (e.g. building <-> spiral tower)
			const dt = doorType.get(nk);
			if (dt === "DOORWAY" || dt === "NULL") return; // open passage — leave a gap
			const A = nodeToScene(a.j, a.i), B = nodeToScene(b.j, b.i);
			if (A.x === B.x && A.y === B.y) return;
			const w = { c: [A.x, A.y, B.x, B.y], levels: [levelCtx.id], flags: { "wall-height": { bottom: levelCtx.bottom, top: levelCtx.top } } };
			if (dt === "REGULAR") { w.door = 1; w.ds = 0; } // closed, openable door
			walls.push(w);
		};
		for (const e of (floor.contour || [])) add(e?.a, e?.b);
		for (const rm of (floor.rooms || [])) for (const e of (rm.contour || [])) add(e?.a, e?.b);
		for (const [a, b] of towerWallEdges) add(a, b); // enclose the spiral tower
		return walls;
	}


	_getDwellingsFloor() {
		const cw = this._iframe?.contentWindow;
		let house = cw?.__maphubClasses?.["dwellings.model.House"]?.inst;
		house ??= cw?.maphubDwellingScene?.house;
		return house?.floors?.[0] ?? null;
	}

	_getDwellingsWalls({ width, height, grid }) {
		const floor = this._getDwellingsFloor();
		if (!floor?.grid || !Array.isArray(floor.contour)) {
			ui.notifications.warn("Dwellings geometry was not available; imported image without walls.");
			return [];
		}

		const widthPx = Number(width) || 0;
		const heightPx = Number(height) || 0;
		const gridSize = Number(grid) || this._getImportGridSize();
		const offsetX = Math.max(0, (widthPx - (floor.grid.w * gridSize)) / 2);
		const offsetY = Math.max(0, (heightPx - (floor.grid.h * gridSize)) / 2);
		const doorType = CONST.WALL_DOOR_TYPES?.DOOR ?? 1;
		const doorClosed = CONST.WALL_DOOR_STATES?.CLOSED ?? 1;
		const walls = [];
		const used = new Set();

		const point = (node) => ({
			x: Math.round(offsetX + (node.j * gridSize)),
			y: Math.round(offsetY + (node.i * gridSize)),
		});
		const key = (edge) => {
			const a = point(edge.a);
			const b = point(edge.b);
			return [[a.x, a.y], [b.x, b.y]]
				.sort((p1, p2) => p1[0] - p2[0] || p1[1] - p2[1])
				.map(p => p.join(","))
				.join("|");
		};
		const wallData = (edge, isDoor = false) => {
			const a = point(edge.a);
			const b = point(edge.b);
			const data = { c: [a.x, a.y, b.x, b.y] };
			if (isDoor) {
				data.door = doorType;
				data.ds = doorClosed;
			}
			return data;
		};
		const add = (edge, isDoor = false) => {
			if (!edge?.a || !edge?.b) return;
			const k = key(edge);
			if (used.has(k)) return;
			used.add(k);
			walls.push(wallData(edge, isDoor));
		};

		const doors = [];
		if (floor.entrance?.door) doors.push(floor.entrance.door);
		if (typeof floor.getDoors === "function") {
			for (const door of floor.getDoors()) {
				doors.push(door.edge1 ?? door.edge2);
			}
		}
		const doorKeys = new Set(doors.filter(Boolean).map(key));
		const outerKeys = new Set(floor.contour.map(key));

		for (const door of doors) add(door, true);
		for (const edge of floor.contour) {
			if (!doorKeys.has(key(edge))) add(edge);
		}
		for (const room of floor.rooms ?? []) {
			for (const edge of room.contour ?? []) {
				const k = key(edge);
				if (outerKeys.has(k) || doorKeys.has(k)) continue;
				add(edge);
			}
		}

		return walls;
	}

	/**
	 * Resolve the live Cave generator model instance from the iframe.
	 * Cave.js is patched to expose its Haxe class map as window.__maphubClasses;
	 * cave.model.Model keeps the current model on its static `.inst`.
	 * @returns {object|null}
	 */
	_getCaveModel() {
		const cw = this._iframe?.contentWindow;
		const C = cw?.__maphubClasses;
		// Bundled fork uses the bare `cave.*` namespace; Watabou's live single-file
		// build (fetch-on-first-use) uses `com.watabou.cave.*`. Same fields either way.
		let model = C?.["cave.model.Model"]?.inst ?? C?.["com.watabou.cave.model.Model"]?.inst ?? null;
		model ??= cw?.maphubCaveAppInstance?.model ?? null;
		return model;
	}

	/**
	 * The OpenFL stage of a bundled (maphub-fork) generator, reachable through
	 * the exposed class registry. Used to read live render transforms.
	 * @returns {object|null}
	 */
	_getMaphubStage() {
		try {
			const cw = this._iframe?.contentWindow;
			return cw?.__maphubClasses?.["lime.app.Application"]?.current?.__window?.stage ?? null;
		} catch (_) {
			return null;
		}
	}

	/**
	 * Find the display object that draws the generator's geometry and return its
	 * live render transform (geometry-local → canvas pixels). The geometry sprite
	 * is the one whose own local bounds match the geometry's bounding box at a
	 * single uniform scale (so model/grid coordinates map straight to canvas
	 * pixels through `__getRenderTransform()` — the same idea proven for the
	 * dungeon, but read from the OpenFL tree instead of a patched controller).
	 *
	 * @param {{w:number,h:number}} geomBounds Geometry bbox expressed in the SAME
	 *   units the target sprite draws in (i.e. the sprite is expected to draw the
	 *   geometry roughly 1:1 in its own local space). For Cave that's `model.rect`.
	 * @returns {{ toPixel: (x:number,y:number)=>{x:number,y:number}, scale:number }|null}
	 */
	_getMaphubGeometryTransform(geomBounds) {
		try {
			const stage = this._getMaphubStage();
			const gw = Number(geomBounds?.w) || 0;
			const gh = Number(geomBounds?.h) || 0;
			if (!stage || gw <= 0 || gh <= 0) return null;

			let best = null;
			const visit = (obj, depth) => {
				if (!obj || depth > 14) return;
				for (const child of (obj.__children || [])) {
					try {
						const r = child.getBounds(child); // local-space bounds
						if (r && r.width > 0 && r.height > 0) {
							const rx = r.width / gw, ry = r.height / gh;
							// The geometry sprite draws in the geometry's own units, so
							// its local bounds match geomBounds on BOTH axes at ~1:1.
							// Reward axis agreement (rx≈ry) AND unit match (~1) so we
							// don't latch onto unrelated uniformly-scaled sprites.
							const uniform = Math.abs(rx - ry);
							const unit = Math.abs((rx + ry) / 2 - 1);
							const score = uniform + unit;
							if (!best || score < best.score) best = { child, score };
						}
					} catch (_) { /* some nodes refuse getBounds */ }
					visit(child, depth + 1);
				}
			};
			visit(stage, 0);
			// Allow up to ~25% bound inflation (stroke/hatching drawn past the outline).
			if (!best || best.score > 0.3) return null;

			const M = best.child.__getRenderTransform();
			if (!M || !Number.isFinite(M.a)) return null;
			const toPixel = (x, y) => ({
				x: Math.round(M.a * x + M.c * y + M.tx),
				y: Math.round(M.b * x + M.d * y + M.ty),
			});
			return { toPixel, scale: Math.hypot(M.a, M.b) };
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to read maphub geometry transform`, err);
			return null;
		}
	}

	/**
	 * Build Foundry Wall documents that trace the cave outline polygons.
	 *
	 * The Cave generator stores its geometry in model coordinates:
	 *   - `model.simple` : array of closed polygons (outer boundary + interior
	 *                      stone "island" boundaries) in model coordinates.
	 *   - `model.rect`   : bounds of the main outline (model coordinates).
	 *
	 * The map sprite draws those polygons directly in model coordinates, so we
	 * read its live render transform and map every vertex straight to the pixels
	 * of the captured on-screen image — exact alignment regardless of the
	 * generator's fit-scale.
	 * @returns {object[]} Wall document data.
	 */
	_getCaveWalls() {
		const model = this._getCaveModel();
		const polys = model?.simple ?? model?.curves;
		const rect = model?.rect;
		if (!Array.isArray(polys) || !polys.length || !rect) {
			ui.notifications.warn("Cave geometry was not available; imported image without walls.");
			return [];
		}

		const rectW = Number(rect.width) || ((rect.get_right?.() ?? 0) - (rect.get_left?.() ?? 0));
		const rectH = Number(rect.height) || ((rect.get_bottom?.() ?? 0) - (rect.get_top?.() ?? 0));
		const transform = this._getMaphubGeometryTransform({ w: rectW, h: rectH });
		if (!transform) {
			ui.notifications.warn("Cave render transform was not available; imported image without walls.");
			return [];
		}
		const toPixel = (p) => transform.toPixel(p.x, p.y);

		const walls = [];
		for (const poly of polys) {
			if (!Array.isArray(poly) || poly.length < 3) continue;
			let pts = poly
				.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
				.map(toPixel);
			// Drop consecutive duplicate pixels.
			pts = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
			// Collapse near-collinear runs (straight hex edges) into single walls.
			pts = this._simplifyClosedLoop(pts, 1.5);
			if (pts.length < 2) continue;
			for (let i = 0; i < pts.length; i++) {
				const a = pts[i];
				const c = pts[(i + 1) % pts.length];
				if (a.x === c.x && a.y === c.y) continue;
				walls.push({ c: [a.x, a.y, c.x, c.y] });
			}
		}
		return walls;
	}

	/**
	 * Remove vertices of a closed polygon that lie (within `eps` px) on the line
	 * between their neighbours, so long straight runs become a single wall.
	 * @param {{x:number,y:number}[]} pts Closed-loop points (no repeated first/last).
	 * @param {number} eps Perpendicular tolerance in pixels.
	 * @returns {{x:number,y:number}[]}
	 */
	_simplifyClosedLoop(pts, eps) {
		let arr = pts.slice();
		let changed = true;
		while (changed && arr.length > 3) {
			changed = false;
			const n = arr.length;
			const keep = new Array(n).fill(true);
			for (let i = 0; i < n; i++) {
				const prev = arr[(i - 1 + n) % n];
				const next = arr[(i + 1) % n];
				if (this._pointSegDistance(arr[i], prev, next) <= eps) keep[i] = false;
			}
			// Never drop two adjacent vertices in the same pass.
			for (let i = 0; i < n; i++) {
				if (!keep[i] && !keep[(i + 1) % n]) keep[(i + 1) % n] = true;
			}
			const out = arr.filter((_, i) => keep[i]);
			if (out.length !== arr.length && out.length >= 3) {
				arr = out;
				changed = true;
			}
		}
		return arr;
	}

	/** Perpendicular distance from point `p` to the segment `a`-`b`. */
	_pointSegDistance(p, a, b) {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len2 = dx * dx + dy * dy;
		if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
		let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
		t = Math.max(0, Math.min(1, t));
		const projX = a.x + t * dx;
		const projY = a.y + t * dy;
		return Math.hypot(p.x - projX, p.y - projY);
	}

	_getImportGridSize() {
		return this._mapType === "dwellings" ? 260 : 50;
	}

	/**
	 * Per-generator Foundry scene defaults, chosen for the best out-of-the-box
	 * import quality:
	 *  - Battlemaps (Dungeon, Cave, Dwellings) → SQUARE grid + fog/vision. Their
	 *    cells already map 1:1 to Foundry squares (the importer rescales/aligns
	 *    them), so tokens, rulers, and play work immediately.
	 *  - Overview maps (Realm/Perilous Shores, City/MFCG, Village) → GRIDLESS,
	 *    fully revealed (no fog/vision). These are region/settlement backdrops
	 *    usually shown as handouts; a square grid just clutters them and fog
	 *    hides a map that's meant to be seen whole.
	 * @returns {{ gridType: number, fogMode: number, tokenVision: boolean }}
	 */
	_getSceneImportDefaults() {
		const T = CONST.GRID_TYPES;
		const F = CONST.FOG_EXPLORATION_MODES;   // { DISABLED: 0, INDIVIDUAL: 1, SHARED: 2 }
		const isOverview = ["realm", "mfcg", "village"].includes(this._mapType);
		return isOverview
			? { gridType: T.GRIDLESS, fogMode: F.DISABLED,   tokenVision: false }
			: { gridType: T.SQUARE,   fogMode: F.INDIVIDUAL, tokenVision: true };
	}

	/**
	 * Clamp a generator's rendered cell size (px) to a usable Foundry grid.size.
	 * Generators render cells at whatever pixel size their own grid setting yields,
	 * which can be tiny (Cave "Square grid > Size", Dungeon "Small tiles"). Using
	 * that raw value as grid.size gives microscopic tokens; clamping (and letting
	 * the caller rescale the image by gridPx/cellPx) keeps one generator cell ==
	 * one Foundry square at a sensible size. Matches the Dwelling grid clamp range.
	 */
	_normalizeGridPx(cellPx) {
		const px = Math.round(Number(cellPx) || 0);
		return Math.max(64, Math.min(160, px || 64));
	}

	/**
	 * Watabou's OpenFL generators draw their right-click menu inside the canvas.
	 * If Import Scene is clicked while that menu is still open, it gets baked
	 * into the captured scene background. Send Escape and a harmless click into
	 * the iframe before capture so the canvas redraws without the menu.
	 */
	async _dismissGeneratorContextMenu() {
		try {
			const doc = this._iframe?.contentDocument;
			const cw = this._iframe?.contentWindow;
			const canvas = doc?.querySelector("canvas");
			if (!doc || !cw || !canvas) return;
			const escape = new cw.KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true });
			doc.dispatchEvent(escape);
			canvas.dispatchEvent(escape);

			const rect = canvas.getBoundingClientRect();
			const eventInit = { bubbles: true, cancelable: true, clientX: rect.left + 4, clientY: rect.top + 4, button: 0, buttons: 1 };
			canvas.dispatchEvent(new cw.MouseEvent("mousedown", eventInit));
			canvas.dispatchEvent(new cw.MouseEvent("mouseup", { ...eventInit, buttons: 0 }));
			canvas.dispatchEvent(new cw.MouseEvent("click", { ...eventInit, buttons: 0 }));
			await new Promise(resolve => setTimeout(resolve, 250));
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to dismiss generator context menu`, err);
		}
	}

	/**
	 * Trigger the One Page Dungeon generator's native JSON export (key 'J')
	 * so that _lastSavedDungeonJson is populated from the CURRENT dungeon
	 * state — guaranteeing walls always match the same map that gets captured.
	 */
	async _exportCurrentDungeonJson() {
		try {
			const cw = this._iframe?.contentWindow;
			const doc = this._iframe?.contentDocument;
			if (!cw || !doc) return false;

			this._lastSavedDungeonJson = null;
			this._lastSavedDungeonJsonAt = 0;

			// The generator exports JSON on the 'J' key. A single synthetic keydown is
			// unreliable while the window is detached (it doesn't always reach the
			// generator's key handler), so dispatch to window + document + body and
			// RE-dispatch periodically while polling.
			const fire = () => {
				const ev = new cw.KeyboardEvent("keydown", { key: "j", code: "KeyJ", keyCode: 74, which: 74, bubbles: true, cancelable: true });
				try { cw.dispatchEvent(ev); } catch (_) {}
				try { doc.dispatchEvent(ev); } catch (_) {}
				try { doc.body?.dispatchEvent(ev); } catch (_) {}
			};
			fire();
			// Poll up to ~8 s for the saveAs hook to deliver the JSON, re-firing the
			// key roughly every second until it lands.
			for (let i = 0; i < 80; i++) {
				await new Promise(r => setTimeout(r, 100));
				if (this._lastSavedDungeonJson) return true;
				if (i > 0 && i % 10 === 0) fire();
			}
			return false;
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to export dungeon JSON`, err);
			return false;
		}
	}

	/**
	 * The bundled One Page Dungeon generator (Dungeon.js) is patched to expose
	 * its live view controller on the iframe window as `__sdxDungeonView`.
	 * It carries the map sprite, dungeon data, and toggle methods.
	 * @returns {object|null}
	 */
	_getDungeonController() {
		try {
			return this._iframe?.contentWindow?.__sdxDungeonView ?? null;
		} catch (_) {
			return null;
		}
	}

	/**
	 * Internal local-units-per-grid-cell the generator draws the dungeon at.
	 * The map sprite's floor layer bounds equal (gridBounds × 30) exactly, so 30
	 * is the constant. We still verify it against the live floor layer when the
	 * geometry is available, and fall back to the constant otherwise.
	 */
	_DUNGEON_CELL = 30;

	_resolveDungeonCell(view) {
		try {
			const map = view?.map;
			const rects = view?.dungeon?.rects || this._lastSavedDungeonJson?.rects;
			const kids = map?.__children;
			if (!map || !Array.isArray(rects) || !rects.length || !Array.isArray(kids)) return this._DUNGEON_CELL;
			let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
			for (const r of rects) {
				minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w);
				minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y + r.h);
			}
			const gW = maxX - minX, gH = maxY - minY;
			if (gW <= 0 || gH <= 0) return this._DUNGEON_CELL;
			// The floor layer's local bounds tightly equal the grid bbox × cell.
			// Pick the child whose x/y cell-sizes agree and are an integer.
			let best = null;
			for (const c of kids) {
				let b; try { b = c.getBounds(map); } catch (_) { continue; }
				const cx = b.width / gW, cy = b.height / gH;
				if (!(cx > 0) || !(cy > 0)) continue;
				const avg = (cx + cy) / 2;
				const disagree = Math.abs(cx - cy);
				const nonInt = Math.abs(avg - Math.round(avg));
				if (disagree <= 0.05 && nonInt <= 0.05) {
					if (!best || (disagree + nonInt) < best.score) best = { cell: Math.round(avg), score: disagree + nonInt };
				}
			}
			return best?.cell || this._DUNGEON_CELL;
		} catch (_) {
			return this._DUNGEON_CELL;
		}
	}

	/**
	 * If the generator auto-rotated the dungeon, toggle rotation off so it
	 * renders axis-aligned. Called after the capture window is maximized and
	 * before the canvas is captured, so the captured image is axis-aligned.
	 */
	async _forceDungeonAxisAligned() {
		try {
			const view = this._getDungeonController();
			if (!view?.map) return;
			const rot = view.map.__rotation ?? view.map.get_rotation?.() ?? 0;
			if (Math.abs(rot) < 0.001) return;
			if (typeof view.toggleRotation === "function") {
				view.toggleRotation();
				await new Promise(r => setTimeout(r, 1200));
				const after = view.map.__rotation ?? 0;
				// If it toggled the wrong way, flip back to reach 0.
				if (Math.abs(after) > 0.001 && typeof view.toggleRotation === "function") {
					view.toggleRotation();
					await new Promise(r => setTimeout(r, 1200));
				}
			}
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to force dungeon axis-aligned`, err);
		}
	}

	/**
	 * Build the exact grid→canvas-pixel mapping for the current dungeon render.
	 * Reads the generator's own render transform (`map.__getRenderTransform()`),
	 * which composes scale + translation + any rotation, so walls land exactly
	 * where the map is drawn in the captured image. Returns null if the live
	 * generator controller is not reachable.
	 *
	 * MUST be called at capture resolution (after the window is maximized and
	 * the canvas has settled) so the transform matches the captured PNG.
	 * @returns {{ toPixel: (gx:number, gy:number) => {x:number,y:number}, cellPx: number }|null}
	 */
	_getDungeonTransform() {
		try {
			const view = this._getDungeonController();
			const map = view?.map;
			if (!map || typeof map.__getRenderTransform !== "function") return null;
			const M = map.__getRenderTransform();
			if (!M || !Number.isFinite(M.a)) return null;
			const cell = this._resolveDungeonCell(view);
			const toPixel = (gx, gy) => {
				const lx = gx * cell, ly = gy * cell;
				return {
					x: Math.round(M.a * lx + M.c * ly + M.tx),
					y: Math.round(M.b * lx + M.d * ly + M.ty),
				};
			};
			const cellPx = cell * Math.hypot(M.a, M.b);
			return { toPixel, cellPx };
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to read dungeon render transform`, err);
			return null;
		}
	}

	/**
	 * Render mapping for a Cave import: the generator draws a square grid via
	 * cave.mapping.SquareGrid (static `.size` = model units per cell) in the same
	 * model space as the outline polygons. Returns the live geometry transform,
	 * the on-screen cell size, and the canvas px of grid-line 0 (the model rect's
	 * top-left), or null if the grid layer isn't available.
	 * @returns {{ toPixel:(x:number,y:number)=>{x:number,y:number}, cellPx:number, origin:{x:number,y:number} }|null}
	 */
	_getCaveAlignSource() {
		try {
			const cw = this._iframe?.contentWindow;
			const C = cw?.__maphubClasses;
			const SquareGrid = C?.["cave.mapping.SquareGrid"] ?? C?.["com.watabou.cave.mapping.SquareGrid"];
			const model = this._getCaveModel();
			const rect = model?.rect;
			const cellUnits = Number(SquareGrid?.size);
			if (!SquareGrid?.inst || !(cellUnits > 0) || !rect) return null;

			const rectW = Number(rect.width) || ((rect.get_right?.() ?? 0) - (rect.get_left?.() ?? 0));
			const rectH = Number(rect.height) || ((rect.get_bottom?.() ?? 0) - (rect.get_top?.() ?? 0));
			const transform = this._getMaphubGeometryTransform({ w: rectW, h: rectH });
			if (!transform) return null;

			const left = (rect.get_left?.() ?? rect.x ?? 0);
			const top = (rect.get_top?.() ?? rect.y ?? 0);
			return {
				toPixel: transform.toPixel,
				cellPx: cellUnits * transform.scale,
				origin: transform.toPixel(left, top),
			};
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to read cave align source`, err);
			return null;
		}
	}

	/**
	 * Render mapping for a Realm (Perilous Shores) import. A realm is a regular
	 * flat/pointy hex lattice (when the hex tilt is flat/pointy — not warped). The
	 * model reports its offset layout (odd-r/even-r/odd-q/even-q), which maps 1:1 to
	 * a Foundry hex grid type. Returns that type, the hex radius (model units), the
	 * model→backing-px scale + transform, a representative hex centre (for the phase
	 * offset), and the flat/even flags — or null when the map is warped (no regular
	 * lattice) or the live model isn't reachable.
	 * @returns {{ gridType:number, R:number, sImg:number, toPixel:(x:number,y:number)=>{x:number,y:number}, sampleCenter:{x:number,y:number}, isFlat:boolean, isEven:boolean }|null}
	 */
	_getRealmAlignSource() {
		try {
			const cw = this._iframe?.contentWindow;
			const C = cw?.__maphubClasses;
			const inst = C?.["com.watabou.perilous.MapScene"]?.inst;
			const RegionCls = C?.["com.watabou.perilous.model.Region"];
			const Point = C?.["openfl.geom.Point"];
			const region = inst?.region, view = inst?.view;
			if (!inst || !region || !view || !RegionCls || !Point) return null;
			if (Number(RegionCls.tiltMode) === 0) return null;   // warped hexes — no regular lattice; fall back to gridless

			const layout = this._extractRealmData()?.layout;   // odd-r | even-r | odd-q | even-q
			const T = CONST.GRID_TYPES;
			const gridType = { "odd-r": T.HEXODDR, "even-r": T.HEXEVENR, "odd-q": T.HEXODDQ, "even-q": T.HEXEVENQ }[layout];
			if (gridType == null) return null;                  // warped/unknown — not hex-alignable

			const R = Number(RegionCls.hexRadius);
			if (!(R > 0)) return null;

			// The captured PNG is the canvas BACKING store (× devicePixelRatio); the
			// view's localToGlobal is in CSS/stage px, so scale by dpr to match.
			const cnv = this._iframe?.contentDocument?.querySelector("canvas");
			const dpr = (cnv && cnv.clientWidth > 0) ? (cnv.width / cnv.clientWidth) : (cw.devicePixelRatio || 1);
			const toPixel = (mx, my) => { const p = view.localToGlobal(new Point(mx, my)); return { x: p.x * dpr, y: p.y * dpr }; };

			const o = toPixel(0, 0), ux = toPixel(1000, 0);
			const sImg = (ux.x - o.x) / 1000;
			if (!(sImg > 0)) return null;

			// representative hex centre nearest the model origin (for the 2D phase offset)
			let best = null, bd = Infinity;
			const faces = region.dcel?.faces || [];
			for (let k = 0; k < faces.length; k++) {
				const c = faces[k]?.data?.center;
				if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) { const d = c.x * c.x + c.y * c.y; if (d < bd) { bd = d; best = c; } }
			}
			if (!best) return null;

			return {
				gridType, R, sImg, toPixel,
				sampleCenter: { x: best.x, y: best.y },
				isFlat: layout.endsWith("q"), isEven: layout.startsWith("even"),
			};
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to read realm align source`, err);
			return null;
		}
	}

	/**
	 * Force the Perilous Shores generator into flat-topped hexes (tilt mode 2) so a
	 * realm imports as a Foundry flat-top hex grid. setTilt persists the choice
	 * (State.set) and re-tilts the CURRENT map without changing its content; its
	 * URL-persist step can throw on a blob: URL, which is harmless (the tilt still
	 * applies), so it's swallowed. Returns true when the map is flat-topped.
	 */
	async _forceRealmFlatTop() {
		try {
			const C = this._iframe?.contentWindow?.__maphubClasses;
			const inst = C?.["com.watabou.perilous.MapScene"]?.inst;
			const RegionCls = C?.["com.watabou.perilous.model.Region"];
			if (!inst || typeof inst.setTilt !== "function") return false;
			if (Number(RegionCls?.tiltMode) === 2) return true;         // already flat-top
			try { inst.setTilt(2); } catch (_) { /* URL-persist may throw; tilt still applies */ }
			await new Promise(r => setTimeout(r, 600));                 // let the re-tilt redraw settle
			return Number(RegionCls?.tiltMode) === 2;
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to force realm flat-top`, err);
			return false;
		}
	}

	/** Poll until the realm generator is live, then force flat-topped hexes (for display). */
	async _forceRealmFlatTopWhenReady() {
		for (let i = 0; i < 30; i++) {
			const inst = this._iframe?.contentWindow?.__maphubClasses?.["com.watabou.perilous.MapScene"]?.inst;
			if (inst?.region && typeof inst.setTilt === "function") { await this._forceRealmFlatTop(); return; }
			await new Promise(r => setTimeout(r, 400));
		}
	}

	/**
	 * Produce a grid-aligned copy of the captured map: scale the source by `scale`
	 * (so one cell becomes an exact integer of pixels) and shift it up-left by
	 * (shiftX, shiftY) (so the generator's cell-zero edge lands on (0,0)). The
	 * walls/notes are run through the matching scale+shift, so Foundry's default
	 * grid then coincides with the map's cells with no offset fields.
	 * @returns {Promise<{ path:string, width:number, height:number }>}
	 */
	async _renderAlignedImage(imgPath, scale, shiftX, shiftY) {
		try {
			const img = await new Promise((res, rej) => {
				const im = new Image();
				im.crossOrigin = "anonymous";
				im.onload = () => res(im);
				im.onerror = rej;
				im.src = "/" + imgPath;
			});
			const w = Math.max(1, Math.round(img.naturalWidth * scale));
			const h = Math.max(1, Math.round(img.naturalHeight * scale));
			const canvas = document.createElement("canvas");
			canvas.width = w; canvas.height = h;
			const ctx = canvas.getContext("2d");
			// Fill with the map's background colour so the sub-cell crop doesn't
			// leave a transparent strip on the far edges.
			try {
				const probe = document.createElement("canvas"); probe.width = probe.height = 1;
				const pctx = probe.getContext("2d"); pctx.drawImage(img, 0, 0, 1, 1);
				const d = pctx.getImageData(0, 0, 1, 1).data;
				ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
				ctx.fillRect(0, 0, w, h);
			} catch (_) { /* keep transparent */ }
			ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, -shiftX, -shiftY, w, h);
			const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
			const FP = foundry.applications.apps.FilePicker?.implementation ?? FilePicker;
			await FP.createDirectory("data", "maps").catch(() => { });
			await FP.createDirectory("data", "maps/maphub").catch(() => { });
			const file = new File([blob], `aligned_${this._mapType}_${Date.now()}.png`, { type: "image/png" });
			const resp = await FP.upload("data", "maps/maphub", file, {});
			return { path: resp?.path || imgPath, width: w, height: h };
		} catch (err) {
			console.warn(`${MODULE_ID} | Failed to render aligned image`, err);
			return { path: imgPath, width: null, height: null };
		}
	}

	async _createImageScene({ name, img, grid, width = null, height = null, gridType = null }) {
		let w = width, h = height;
		if (!(w > 0) || !(h > 0)) {
			const loader = new foundry.canvas.TextureLoader();
			const texture = await loader.loadTexture(img);
			// loadTexture() resolves to BaseTexture | Spritesheet | null — guard the
			// deref so a failed/odd load gives a clear error, not a cryptic TypeError
			// or a scene with undefined dimensions.
			if (!(texture?.width > 0) || !(texture?.height > 0)) throw new Error("Could not read the map image dimensions.");
			w = texture.width; h = texture.height;
		}
		const defaults = this._getSceneImportDefaults();
		const sceneData = {
			name,
			grid: { size: grid, type: gridType ?? defaults.gridType },
			width: w,
			height: h,
			padding: 0,
			shiftX: 0,
			shiftY: 0,
			fog: { mode: defaults.fogMode },
			tokenVision: defaults.tokenVision,
		};
		if (this._importContext?.folderId) sceneData.folder = this._importContext.folderId;

		const foundryMajor = Number(game.version?.split?.(".")?.[0] ?? 0);
		if (foundryMajor >= 14) {
			sceneData.levels = [{ name: "Level", background: { src: img } }];
		} else {
			sceneData.background = { src: img };
		}

		const scene = await Scene.create(sceneData);
		// Realm-location imports stay un-activated (the GM may generate several).
		if (this._importContext?.activate !== false) await scene.activate();
		return scene;
	}

	/**
	 * Force the application window to a massive size (2000x2000 minimum)
	 * to ensure the internal map canvas redraws at high resolution.
	 * @returns {Promise<{ position: object, style: object }>} The previous window state.
	 */
	/**
	 * True when the generator's <canvas> is reachable from this document (so the map can
	 * be captured/read). It stays reachable while the window is detached, which lets the
	 * import skip the destructive dock-back rebuild in the normal case.
	 */
	_isMapCanvasReadable() {
		try { return (this._iframe?.contentDocument?.querySelector("canvas")?.width || 0) > 0; }
		catch (e) { return false; }   // cross-origin / inaccessible
	}

	async _maximizeForCapture() {
		ui.notifications.info("Preparing map for high-res capture...");

		const oldState = {
			position: foundry.utils.deepClone(this.position),
			style: this.element ? {
				minHeight: this.element.style.minHeight,
				minWidth: this.element.style.minWidth,
				maxWidth: this.element.style.maxWidth,
				maxHeight: this.element.style.maxHeight,
				left: this.element.style.left,
				top: this.element.style.top,
				zIndex: this.element.style.zIndex
			} : null
		};

		try {
			if (typeof this.setPosition === "function") {
				this.setPosition({ left: 0, top: 0 });
			}
			if (this.element) {
				this.element.style.minHeight = "2000px";
				this.element.style.minWidth = "2000px";
				this.element.style.maxWidth = "none";
				this.element.style.maxHeight = "none";
				this.element.style.left = "0px";
				this.element.style.top = "0px";
				this.element.style.zIndex = "9999";
			}
		} catch (e) {
			console.warn("Failed to maximize dialog window:", e);
		}
		// Give the iframe/canvas time to resize and redraw completely
		await new Promise(r => setTimeout(r, 1500));
		return oldState;
	}

	/**
	 * Restore the application window to its previous state.
	 * @param {{ position: object, style: object }} state The state to restore.
	 */
	_restoreAfterCapture(state) {
		if (!state) return;
		if (state.position) {
			this.setPosition(state.position);
		}
		if (this.element && state.style) {
			Object.assign(this.element.style, state.style);
		}
	}

	/** Set the map image as the current scene's background. */
	async _setAsBackground() {
		if (!game.user.isGM) return;
		if (!canvas?.scene) {
			ui.notifications.warn("No active scene to set background for!");
			return;
		}

		const isDwellings = this._mapType === "dwellings";
		const oldState = await this._maximizeForCapture();

		const imgPath = await this._captureAndUploadMap();
		if (!imgPath) {
			if (isDwellings) this._restoreAfterCapture(oldState);
			return;
		}

		try {
			// Create a temporary image to determine dimensions before applying
			const img = new Image();
			img.onload = async () => {
				// Own try/catch: this runs async after the outer try has returned, so a
				// scene.update rejection would otherwise be an unhandled rejection AND
				// skip the dwelling window restore.
				try {
					const sceneUpdateData = {
						width: img.width,
						height: img.height,
						padding: 0,
						grid: { size: isDwellings ? 260 : 50 }
					};

					// Foundry V14 stores scene imagery on the embedded Level, not the
					// legacy top-level scene background. Update the active level when
					// available so "Set as Background" does not create a blank scene.
					const foundryMajor = Number(game.version?.split?.(".")?.[0] ?? 0);
					const levelId = canvas.level?.id ?? canvas.scene.levels?.contents?.[0]?.id;
					if (foundryMajor >= 14 && levelId) {
						sceneUpdateData[`levels.${levelId}.background.src`] = imgPath;
					} else {
						sceneUpdateData.background = { src: imgPath };
					}

					await canvas.scene.update(sceneUpdateData);
					ui.notifications.info(`Scene background updated to ${img.width}x${img.height}!`);

					if (isDwellings) this._restoreAfterCapture(oldState);
					else this.close();
				} catch (e) {
					console.error(`${MODULE_ID} | Failed to set scene background`, e);
					ui.notifications.error(`Failed to set scene background: ${e?.message || e}`);
					if (isDwellings) this._restoreAfterCapture(oldState);
				}
			};
			img.onerror = () => {
				// Fallback if we can't load the image dimensions for some reason
				canvas.scene.update({ background: { src: imgPath } });
				ui.notifications.info("Scene background updated (kept previous dimensions).");

				if (isDwellings) {
					this._restoreAfterCapture(oldState);
				} else {
					this.close(); // Close the dialog
				}
			};
			img.src = imgPath;
		} catch (e) {
			console.error(`${MODULE_ID} | Failed to set scene background`, e);
			ui.notifications.error("Failed to set scene background.");
			if (isDwellings) this._restoreAfterCapture(oldState);
		}
	}

	/** Export the map as a Tile on the active scene. */
	async _addAsTile() {
		if (!game.user.isGM) return;
		if (!canvas?.scene) {
			ui.notifications.warn("No active scene to add tile to!");
			return;
		}

		const isDwellings = this._mapType === "dwellings";
		const oldState = await this._maximizeForCapture();

		const imgPath = await this._captureAndUploadMap();
		if (!imgPath) {
			if (isDwellings) this._restoreAfterCapture(oldState);
			return;
		}

		try {
			// Create a temporary image to determine dimensions before applying
			const img = new Image();
			img.onload = async () => {
				// Own try/catch — see _setAsBackground: a createEmbeddedDocuments
				// rejection here would otherwise be unhandled and skip the restore.
				try {
					const tileData = {
						texture: { src: imgPath },
						width: img.width,
						height: img.height,
						x: canvas.stage.pivot.x - (img.width / 2),
						y: canvas.stage.pivot.y - (img.height / 2)
					};

					await canvas.scene.createEmbeddedDocuments("Tile", [tileData]);
					ui.notifications.info(`Map added as a ${img.width}x${img.height} tile!`);

					if (isDwellings) this._restoreAfterCapture(oldState);
					else this.close();
				} catch (e) {
					console.error(`${MODULE_ID} | Failed to add map as tile`, e);
					ui.notifications.error(`Failed to add map as tile: ${e?.message || e}`);
					if (isDwellings) this._restoreAfterCapture(oldState);
				}
			};
			img.onerror = () => {
				ui.notifications.error("Failed to load map image dimensions for Tile.");
				if (isDwellings) this._restoreAfterCapture(oldState);
			};
			img.src = imgPath;
		} catch (e) {
			console.error(`${MODULE_ID} | Failed to add map as tile`, e);
			ui.notifications.error("Failed to add map as tile.");
			if (isDwellings) this._restoreAfterCapture(oldState);
		}
	}

	/** Human-readable label for the map type. */
	_getMapLabel() {
		const labels = {
			realm: "Realm Map",
			mfcg: "City Map",
			village: "Village Map",
			cave: "Cave Map",
			dungeon: "Dungeon Map",
			dwellings: "Dwelling Map",
			viewer: "3D City View",
		};
		return labels[this._mapType] || "Settlement Map";
	}

	/**
	 * Override close() — NOT _onClose() — because ApplicationV2 destroys the
	 * DOM element BEFORE _onClose fires.  We must rescue the iframe out of
	 * Foundry's element tree first, then let super.close() safely tear down
	 * the now-empty application window.
	 *
	 * The rescued iframe lives in a hidden off-screen div where the mfcg.js
	 * OpenFL rAF loop can finish its current frame harmlessly.  After a short
	 * delay we navigate to about:blank to unload the JS context, then remove
	 * the hidden div.
	 */
	async close(options) {
		// Restore dungeon rotation if we turned it off for import
		if (this._saveRotationWasOn) {
			try {
				const rotKey = [...Object.keys(window.localStorage)].find(k =>
					k.includes('com.watabou.dungeon')
				);
				if (rotKey) {
					const val = window.localStorage.getItem(rotKey) || '';
					window.localStorage.setItem(rotKey, val.replace('autoRotationf', 'autoRotationt'));
				}
			} catch (err) {
				console.warn(`${MODULE_ID} | Failed to restore dungeon rotation`, err);
			}
		}
		window.removeEventListener("message", this._onMessage);
		if (this._blobUrl) {
			URL.revokeObjectURL(this._blobUrl);
			this._blobUrl = null;
		}

		const iframe = this.element?.querySelector("iframe");
		if (iframe) {
			// Park the iframe off-screen before Foundry nukes the app element
			const graveyard = document.createElement("div");
			graveyard.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
			document.body.appendChild(graveyard);
			graveyard.appendChild(iframe);

			// Kill JS context after the rAF loop settles, then clean up
			setTimeout(() => {
				try { iframe.src = "about:blank"; } catch (_) { }
				setTimeout(() => graveyard.remove(), 500);
			}, 100);
		}
		return super.close(options);
	}

	/** Build the iframe src. */
	async _buildSrc() {
		const ext = this._queryString ? `${this._externalBase}?${this._queryString}` : this._externalBase;
		// Importing a scene requires reading the generator's canvas/geometry,
		// which the browser only allows when the generator is served from
		// Foundry's own origin. An external (cross-origin) Watabou page can't be
		// captured at all, so every import-capable generator we bundle is served
		// locally regardless of the "use local Maphub" setting. (The setting only
		// still applies to non-bundled / view-only types.)
		// Generators whose bundled local build renders + imports correctly are
		// forced local (same-origin) so the canvas/geometry is capturable — the
		// external Watabou pages can't be embedded in this sandboxed cross-origin
		// iframe (City renders blank, Village spins the CPU). Dwelling is handled
		// via its own raw bundle path below.
		const LOCAL_ONLY_TYPES = new Set(["dungeon", "realm", "cave", "mfcg", "village", "dwellings"]);
		const localOnly = LOCAL_ONLY_TYPES.has(this._mapType);
		const useLocal = localOnly || game.settings.get(MODULE_ID, "settlement.useLocalMaphub");
		if (!useLocal) {
			console.log(`${MODULE_ID} | MaphubViewerApp: using external URL ${ext}`);
			return ext;
		}

		// Fetch-on-first-use (lean install): make sure this generator is downloaded or
		// bundled before running it; prompt for a one-time download if it's neither.
		try {
			const { GeneratorFetcher } = await import("./GeneratorFetcher.mjs");
			if (!(await GeneratorFetcher.ensureAvailable(this._mapType))) {
				return "data:text/html;charset=utf-8," + encodeURIComponent(
					`<body style="font:14px sans-serif;color:#ccc;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:2rem;">`
					+ `<div>This generator hasn't been downloaded yet.<br><br>Open <b>Settings → Cartomancer → Download Generators</b>, then reopen it.</div></body>`);
			}
		} catch (e) { console.warn(`${MODULE_ID} | ensureAvailable check failed`, e); }

		// Use the direct server URL for local maphub files when Foundry serves it
		// as HTML. Some Foundry installs serve static .html module files as
		// text/plain; in that case, wrap the same file in a same-origin Blob with
		// a <base> tag so scripts/assets still resolve and the parent window can
		// inspect/capture the generator.
		const BASE = `modules/${MODULE_ID}/scripts/maphub`;
		// City/Village/Dwelling use the RAW Watabou builds (to/<type>-raw/) — the
		// bundled voluminor/maphub fork builds never draw to the canvas.
		const RAW_BUNDLE_DIRS = { dwellings: "dwellings-raw", mfcg: "mfcg-raw", village: "village-raw" };
		const bundleDir = RAW_BUNDLE_DIRS[this._mapType] ?? this._mapType;
		// Fetch-on-first-use: if this generator was downloaded from watabou.github.io into
		// local data, run our loader with the fetched JS inlined (no bundled Watabou code).
		// Falls through to the bundled files when not downloaded (or on any error).
		try {
			const { GeneratorFetcher } = await import("./GeneratorFetcher.mjs");
			if (GeneratorFetcher.hasManifest(this._mapType) && await GeneratorFetcher.isDownloaded(this._mapType)) {
				const fetched = await GeneratorFetcher.buildFetchedSrc(this._mapType, this._queryString);
				if (fetched) return fetched;
			}
		} catch (e) { console.warn(`${MODULE_ID} | fetched-generator load failed; using bundled`, e); }
		const localBase = `${window.location.origin}/${BASE}/to/${bundleDir}/index.html`;
		const localBaseDir = `${window.location.origin}/${BASE}/to/${bundleDir}/`;
		const localParams = this._queryString ? `cb=${Date.now()}&${this._queryString}` : `cb=${Date.now()}`;
		const localUrl = `${localBase}?${localParams}`;

		// Quick HEAD probe to confirm the file exists locally.
		try {
			const r = await fetch(localUrl, { method: "HEAD" });
			if (r.ok) {
				const contentType = r.headers.get("content-type") ?? "";
				if (contentType.includes("text/html")) {
					console.log(`${MODULE_ID} | MaphubViewerApp: using local URL ${localUrl}`);
					return localUrl;
				}

				const res = await fetch(localUrl);
				let html = await res.text();
				if (!/^\s*<!doctype html/i.test(html) && !/^\s*<html/i.test(html)) {
					console.warn(`${MODULE_ID} | MaphubViewerApp: local file was not HTML, using external: ${ext}`);
					return ext;
				}

				// A blob: URL carries no query string, so the generator's seed read
				// `new URLSearchParams(location.search)` sees nothing and draws a RANDOM
				// map instead of the requested seed/name. Inject a shim (before any
				// generator script) that feeds our query string to URLSearchParams when
				// it's built from the empty blob location.search. Every bundled generator
				// (mfcg/village/dungeon/cave/realm) reads its seed this exact way.
				const qsInject = this._queryString
					? `<script>(function(){var q=${JSON.stringify(this._queryString).replace(/</g, "\\u003c")};var N=window.URLSearchParams;window.URLSearchParams=function(i){if((i==null||i===""||i===window.location.search)&&q)i=q;return new N(i);};window.URLSearchParams.prototype=N.prototype;})();</script>`
					: "";
				html = html
					.replace(/<head([^>]*)>/i, `<head$1><base href="${localBaseDir}">${qsInject}`)
					.replace(/(\.\.\/\.\.\/js\/[^"]+\.js)(")/g, `$1?cb=${Date.now()}$2`);
				this._blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
				console.log(`${MODULE_ID} | MaphubViewerApp: using local Blob URL for ${localUrl}`);
				return this._blobUrl;
			}
		} catch (_) { /* network error → fall through */ }

		if (localOnly) {
			const label = this._getMapLabel();
			console.error(`${MODULE_ID} | MaphubViewerApp: bundled ${label} generator files are missing; refusing external fallback because the external page can't be captured for import.`);
			ui.notifications?.error(`Bundled ${label} generator files are missing; cannot import internally.`);
			return null;
		}

		// Local files not present — fall back to external URL.
		console.warn(`${MODULE_ID} | MaphubViewerApp: local files missing, using external: ${ext}`);
		return ext;
	}

}
