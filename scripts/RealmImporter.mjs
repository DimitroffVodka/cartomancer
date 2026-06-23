/**
 * Cartomancer — Realm full-import.
 *
 * A Perilous Shores realm export ({name, origin, bp, hexes, ...}) embeds, per hex,
 * the *complete* generator URL (seed + every param) for any settlement (town =>
 * city-generator, village => village-generator) or danger (=> one-page-dungeon),
 * plus a short `info` description. This module turns that into:
 *
 *   • a Scene folder + Journal folder named after the realm,
 *   • an Overview journal listing every location (cross-linked),
 *   • one journal per location (description + an on-demand "Generate this map"
 *     button) — the scene is only built when the GM clicks it.
 *
 * Extraction of the realm JSON from the live generator lives in MaphubViewerApp
 * (it needs the iframe); this module is given the parsed data object.
 */

const MODULE_ID = "cartomancer";

const GEN_BY_PATH = {
	"city-generator": "mfcg",
	"village-generator": "village",
	"one-page-dungeon": "dungeon",
	"caves": "cave",
	"dwellings": "dwellings",
	"perilous-shores": "realm",
};

const TYPE_LABELS = {
	mfcg: "City",
	village: "Village",
	dungeon: "Dungeon",
	cave: "Cave",
	dwellings: "Dwelling",
};

/** Map-pin icons per location type (all verified present in Foundry core icons/svg). */
const TYPE_ICON = {
	mfcg: "icons/svg/city.svg",
	village: "icons/svg/village.svg",
	dungeon: "icons/svg/skull.svg",
	cave: "icons/svg/cave.svg",
	dwellings: "icons/svg/house.svg",
};

/** Slots on a hex that can carry a location with a generator link. */
const LOCATION_SLOTS = ["town", "danger", "feature", "poi", "landmark", "site"];

/** Turn a watabou generator URL into {type, queryString, externalBase}, or null. */
function parseGeneratorLink(link) {
	let u;
	try { u = new URL(String(link ?? ""), "https://watabou.github.io"); } catch { return null; }
	if (!/(^|\.)watabou\.github\.io$/i.test(u.hostname)) return null;
	const seg = (u.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
	const type = GEN_BY_PATH[seg];
	if (!type || type === "realm") return null;   // skip the realm's own permalink
	return { type, queryString: u.search.replace(/^\?/, ""), externalBase: `${u.origin}${u.pathname}` };
}

/**
 * Walk a realm export's hexes and return the generatable locations.
 * @returns {Array<{hexId,slot,name,locType,info,link,type,queryString,externalBase}>}
 */
export function parseRealmLocations(data) {
	const out = [];
	const hexes = data?.hexes || {};
	for (const [hexId, hex] of Object.entries(hexes)) {
		if (!hex || typeof hex !== "object") continue;
		for (const slot of LOCATION_SLOTS) {
			const node = hex[slot];
			if (!node || typeof node !== "object" || !node.link) continue;
			const gen = parseGeneratorLink(node.link);
			if (!gen) continue;
			out.push({
				hexId,
				slot,
				name: String(node.name || "Unnamed Location").trim(),
				locType: String(node.type || slot),
				info: String(node.info || "").trim(),
				link: node.link,
				type: gen.type,
				queryString: gen.queryString,
				externalBase: gen.externalBase,
			});
		}
	}
	return out;
}

function escapeHtml(s) {
	return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * A journal link that VIEWS (loads) a scene on click — handled by the delegated
 * listener in registerHooks(). A plain @UUID[Scene] link only opens the scene's
 * config sheet (and on some sheets appears to do nothing), which isn't what
 * "Open <place>" should do.
 */
function sceneViewLink(sceneId, label) {
	return `<a class="cartomancer-view-scene" data-scene-id="${escapeHtml(sceneId)}">🗺️ ${escapeHtml(label)}</a>`;
}

/** Find an existing folder by name+type, or create it. */
async function getOrCreateFolder(name, type) {
	const existing = game.folders?.find((f) => f.type === type && f.name === name);
	if (existing) return existing;
	return Folder.create({ name, type });
}

/** HTML for a location journal page (button form, before a scene exists). */
function locationPageContent(loc, { overviewUuid, sceneUuid = null } = {}) {
	const label = TYPE_LABELS[loc.type] || loc.type;
	const parts = [];
	parts.push(`<p><strong>${escapeHtml(label)}</strong>${loc.locType && loc.locType !== loc.type ? ` <em>(${escapeHtml(loc.locType)})</em>` : ""} — hex ${escapeHtml(loc.hexId)}</p>`);
	if (loc.info) parts.push(`<p>${escapeHtml(loc.info)}</p>`);
	if (sceneUuid) {
		parts.push(`<p>🗺️ Map: @UUID[${sceneUuid}]{Open ${escapeHtml(loc.name)}}</p>`);
	} else {
		// data-journal-uuid is filled in after the entry is created (we need its id).
		parts.push(`<p><a class="cartomancer-generate-map" data-journal-uuid="__SELF__" data-type="${escapeHtml(loc.type)}">🛠️ Generate this map</a></p>`);
	}
	if (overviewUuid) parts.push(`<hr><p><small>↩ @UUID[${overviewUuid}]{Realm overview}</small></p>`);
	return parts.join("\n");
}

/** HTML for the realm overview page. */
function overviewPageContent(realmName, data, locations, journalByKey, realmSceneId = null) {
	const parts = [`<h2>${escapeHtml(realmName)}</h2>`];
	if (realmSceneId) parts.push(`<p>${sceneViewLink(realmSceneId, "Open the realm map")}</p>`);
	if (data?.origin) parts.push(`<p><small>Source: <a href="${escapeHtml(data.origin)}">${escapeHtml(data.origin)}</a></small></p>`);
	const byType = {};
	for (const loc of locations) (byType[loc.type] ||= []).push(loc);
	for (const type of Object.keys(byType)) {
		parts.push(`<h3>${escapeHtml((TYPE_LABELS[type] || type) + "s")}</h3><ul>`);
		for (const loc of byType[type]) {
			const je = journalByKey[locationKey(loc)];
			const link = je ? `@UUID[${je.uuid}]{${escapeHtml(loc.name)}}` : escapeHtml(loc.name);
			parts.push(`<li>${link}${loc.info ? ` — ${escapeHtml(loc.info)}` : ""}</li>`);
		}
		parts.push(`</ul>`);
	}
	return parts.join("\n");
}

function locationKey(loc) {
	return `${loc.hexId}:${loc.slot}:${loc.name}`;
}

export class RealmImporter {
	/**
	 * Build the folder + journals for a realm. On-demand mode: location scenes are
	 * NOT generated here — each location journal carries a "Generate this map" button.
	 *
	 * @param {object} data          parsed realm export
	 * @param {object} [opts]
	 * @param {Scene}  [opts.realmScene]  the already-imported realm overview scene
	 * @returns {{sceneFolder, journalFolder, overview, locationCount}}
	 */
	static async importRealm(data, { realmScene = null, positions = {} } = {}) {
		if (!game.user?.isGM) throw new Error("Only a GM can import a realm.");
		const realmName = String(data?.name || "Realm").trim() || "Realm";
		const locations = parseRealmLocations(data);

		const sceneFolder = await getOrCreateFolder(realmName, "Scene");
		const journalFolder = await getOrCreateFolder(realmName, "JournalEntry");

		// Move the realm overview scene into the folder (if one was imported).
		if (realmScene) {
			try { await realmScene.update({ folder: sceneFolder.id }); } catch (e) { console.warn(`${MODULE_ID} | could not move realm scene to folder`, e); }
		}

		// Overview journal first, so per-location pages can back-link to it.
		const overview = await JournalEntry.create({
			name: `${realmName} — Overview`,
			folder: journalFolder.id,
			flags: { [MODULE_ID]: { realmOverview: { realmName, origin: data?.origin || "" } } },
			pages: [{ name: "Overview", type: "text", title: { show: false }, text: { content: `<p>Building…</p>`, format: 1 } }],
		});

		// Per-location journals.
		const journalByKey = {};
		for (const loc of locations) {
			const je = await JournalEntry.create({
				name: loc.name,
				folder: journalFolder.id,
				flags: {
					[MODULE_ID]: {
						realmLocation: {
							realmName, name: loc.name, type: loc.type, locType: loc.locType,
							link: loc.link, queryString: loc.queryString, externalBase: loc.externalBase,
							hexId: loc.hexId, sceneFolderId: sceneFolder.id, overviewUuid: overview.uuid,
							sceneId: null,
						},
					},
				},
				pages: [{ name: loc.name, type: "text", title: { show: false }, text: { content: locationPageContent(loc, { overviewUuid: overview.uuid }), format: 1 } }],
			});
			journalByKey[locationKey(loc)] = je;
			// Now that we have the id, bake the self-uuid into the Generate button.
			const page = je.pages.contents[0];
			if (page) {
				await page.update({ "text.content": page.text.content.replace(/data-journal-uuid="__SELF__"/g, `data-journal-uuid="${je.uuid}"`) });
			}
		}

		// Fill in the overview now that all location journals exist.
		const realmSceneId = realmScene?.id || null;
		const overviewPage = overview.pages.contents[0];
		if (overviewPage) {
			await overviewPage.update({ "text.content": overviewPageContent(realmName, data, locations, journalByKey, realmSceneId) });
		}
		if (realmScene) { try { await realmScene.update({ journal: overview.id }); } catch { /* non-fatal */ } }

		// Note pins on the realm map — one per located location, linked to its journal
		// (clicking the pin opens the journal; double-clicking opens it for editing).
		let pinCount = 0;
		if (realmScene && positions) {
			const notes = [];
			for (const loc of locations) {
				const je = journalByKey[locationKey(loc)];
				const pos = positions[loc.name];
				if (!je || !pos) continue;
				notes.push({
					x: pos.x, y: pos.y,
					entryId: je.id,
					text: loc.name,
					texture: { src: TYPE_ICON[loc.type] || "icons/svg/book.svg" },
					iconSize: 64,
					fontSize: 28,
					textAnchor: 1, // BOTTOM — label under the pin
				});
			}
			if (notes.length) {
				try { const made = await realmScene.createEmbeddedDocuments("Note", notes); pinCount = made?.length || notes.length; }
				catch (e) { console.warn(`${MODULE_ID} | could not create realm note pins`, e); }
			}
		}

		ui.notifications?.info(`Imported realm "${realmName}": ${locations.length} location journal(s)${pinCount ? `, ${pinCount} map pin(s)` : ""}. Open one and click “Generate this map”.`);
		return { sceneFolder, journalFolder, overview, locationCount: locations.length, pinCount };
	}

	/** Generate (or open) the scene for a location, driven from its journal. */
	static async generateLocationFromJournal(journalEntry) {
		if (!game.user?.isGM) { ui.notifications?.warn("Only a GM can generate maps."); return; }
		const flag = journalEntry?.getFlag?.(MODULE_ID, "realmLocation");
		if (!flag) { ui.notifications?.warn("This journal isn’t a realm location."); return; }

		// Already generated? Just activate/open the scene.
		if (flag.sceneId) {
			const existing = game.scenes.get(flag.sceneId);
			if (existing) { existing.view?.(); return; }
		}

		const { MaphubViewerApp } = await import("./MaphubViewerApp.mjs");
		const viewer = new MaphubViewerApp({
			type: flag.type,
			queryString: flag.queryString,
			externalBase: flag.externalBase,
			importContext: {
				folderId: flag.sceneFolderId,
				journalUuid: journalEntry.uuid,
				sceneName: flag.name,
				activate: false,
			},
		});
		await viewer.render(true);
		ui.notifications?.info(`Opening the ${TYPE_LABELS[flag.type] || flag.type} generator for “${flag.name}”. Click “Import Scene” when it looks right — it’ll land in the “${flag.realmName}” folder and link back here.`);
	}

	/**
	 * Build journal HTML (backstory + a numbered room key) from a One Page Dungeon
	 * JSON. The refs match the numbered Note pins placed on the dungeon scene.
	 */
	static buildDungeonDetailHtml(dungeonJson) {
		try {
			let d = dungeonJson;
			if (typeof d === "string") d = JSON.parse(d);
			if (!d || typeof d !== "object") return "";
			const parts = [];
			if (d.story) parts.push(`<p><em>${escapeHtml(String(d.story))}</em></p>`);
			const notes = Array.isArray(d.notes) ? d.notes.filter((n) => n && (n.text || n.ref)) : [];
			if (notes.length) {
				notes.sort((a, b) => (parseInt(a.ref, 10) || 0) - (parseInt(b.ref, 10) || 0));
				parts.push(`<h3>Rooms</h3>`, `<ul style="list-style:none;padding-left:0.25em">`);
				for (const n of notes) {
					const ref = (n.ref != null && n.ref !== "") ? `<strong>${escapeHtml(String(n.ref))}.</strong> ` : "";
					parts.push(`<li>${ref}${escapeHtml(String(n.text || ""))}</li>`);
				}
				parts.push(`</ul>`);
			}
			return parts.length ? `<section class="cartomancer-location-detail">${parts.join("\n")}</section>` : "";
		} catch (e) {
			console.warn(`${MODULE_ID} | buildDungeonDetailHtml failed`, e);
			return "";
		}
	}

	/** Called by MaphubViewerApp after it creates a scene with importContext.journalUuid. */
	static async onLocationSceneCreated(journalUuid, scene, detailHtml = "") {
		try {
			const je = await fromUuid(journalUuid);
			if (!je || !scene) return;
			const flag = je.getFlag(MODULE_ID, "realmLocation") || {};
			await je.setFlag(MODULE_ID, "realmLocation", { ...flag, sceneId: scene.id });
			const page = je.pages?.contents?.[0];
			if (page) {
				const name = flag.name || je.name;
				// Preserve the original description by swapping only the button line for a scene link.
				const linkHtml = `<p>${sceneViewLink(scene.id, "Open " + name)}</p>`;
				let html = page.text?.content || "";
				if (/cartomancer-generate-map/.test(html)) {
					html = html.replace(/<p><a class="cartomancer-generate-map"[\s\S]*?<\/a><\/p>/, linkHtml);
				} else if (!/cartomancer-view-scene/.test(html)) {
					html = linkHtml + html;
				}
				// Map info from the JSON (dungeon room key). Drop any prior copy first so
				// a regenerate doesn't stack duplicates, then insert before the back-link.
				if (detailHtml) {
					html = html.replace(/<section class="cartomancer-location-detail">[\s\S]*?<\/section>\n?/g, "");
					html = /<hr>/.test(html) ? html.replace(/<hr>/, `${detailHtml}\n<hr>`) : `${html}\n${detailHtml}`;
				}
				await page.update({ "text.content": html });
			}
			try { await scene.update({ journal: je.id }); } catch { /* non-fatal */ }
		} catch (e) {
			console.warn(`${MODULE_ID} | onLocationSceneCreated failed`, e);
		}
	}

	/**
	 * Build a standalone dungeon JournalEntry from a One Page Dungeon JSON: an
	 * optional story/overview page plus one text page per numbered room. Each room
	 * page is tagged with its note `ref`, so the scene's numbered Note pins can
	 * deep-link to the matching page. Returns `{ je, pageByRef }` (ref → pageId).
	 */
	static async createDungeonJournal(name, dungeonJson, { folderId = null } = {}) {
		let d = dungeonJson;
		if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = null; } }
		if (!d || typeof d !== "object") return null;

		const rooms = (Array.isArray(d.notes) ? d.notes : [])
			.filter(n => n && (n.text || n.ref))
			.map(n => ({ ref: (n.ref != null && n.ref !== "") ? String(n.ref) : null, text: String(n.text || "") }))
			.sort((a, b) => (parseInt(a.ref, 10) || 0) - (parseInt(b.ref, 10) || 0));

		const pages = [];
		if (d.story) {
			pages.push({
				name: "Overview", type: "text", title: { show: false },
				text: { content: `<p><em>${escapeHtml(String(d.story))}</em></p>`, format: 1 },
			});
		}
		for (const r of rooms) {
			const firstLine = (r.text.split("\n")[0] || "").trim();
			const title = `${r.ref ? `${r.ref}. ` : ""}${firstLine || "Room"}`.slice(0, 60);
			pages.push({
				name: title,
				type: "text", title: { show: true },
				text: { content: `<p>${escapeHtml(r.text).replace(/\n/g, "<br>")}</p>`, format: 1 },
				flags: { [MODULE_ID]: { roomRef: r.ref } },
			});
		}
		if (!pages.length) {
			pages.push({ name: "Notes", type: "text", title: { show: false }, text: { content: "<p>(No room notes.)</p>", format: 1 } });
		}

		const je = await JournalEntry.create({
			name: String(name || "Dungeon"),
			folder: folderId || null,
			flags: { [MODULE_ID]: { dungeonKey: true } },
			pages,
		});

		const pageByRef = {};
		for (const p of je.pages.contents) {
			const ref = p.getFlag(MODULE_ID, "roomRef");
			if (ref != null) pageByRef[String(ref)] = p.id;
		}
		return { je, pageByRef };
	}

	/** One delegated listener handles "Generate this map" + "Open scene" clicks, any sheet version. */
	static registerHooks() {
		if (RealmImporter._wired) return;
		RealmImporter._wired = true;
		document.addEventListener("click", async (ev) => {
			const gen = ev.target?.closest?.("a.cartomancer-generate-map");
			if (gen) {
				ev.preventDefault();
				ev.stopPropagation();
				const uuid = gen.dataset?.journalUuid;
				if (!uuid || uuid === "__SELF__") return;
				try {
					const je = await fromUuid(uuid);
					if (je) await RealmImporter.generateLocationFromJournal(je);
				} catch (e) { console.error(`${MODULE_ID} | generate-map click failed`, e); }
				return;
			}
			const view = ev.target?.closest?.("a.cartomancer-view-scene");
			if (view) {
				ev.preventDefault();
				ev.stopPropagation();
				const scene = game.scenes.get(view.dataset?.sceneId);
				if (scene) scene.view();
				else ui.notifications?.warn("That scene no longer exists.");
			}
		}, true);
	}
}
