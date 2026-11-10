// File datant (outbox) + senkronizasyon ak sèvè a.
// Chak operasyon gen yon UUID ke telefòn nan jenere; RPC yo sou sèvè a idanpotan:
// menm ID voye de fwa = menm rezilta, pa janm doublon.
import * as db from "./db.js";
import * as api from "./api.js";
import { genPwoblem } from "./pwoblem.js";

const C = window.GRANDON_CONFIG;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const notify = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

export const uuid = () =>
  crypto.randomUUID?.() ||
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

export const appareil = () => {
  const m = navigator.userAgent.match(/\(([^)]+)\)/);
  return `PWA ${C.NON || "Grandon"} · ${m ? m[1].slice(0, 60) : "navigatè"}`;
};

// ---------- Dat (lè Ayiti) ----------
const fmtJou = new Intl.DateTimeFormat("en-CA", { timeZone: C.FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" });
export const jouLokal = (d = new Date()) => fmtJou.format(d); // "2026-11-04"
export const jodi = () => jouLokal();
export const isoJou = (iso) => { const d = new Date(iso + "T12:00:00Z"); return ((d.getUTCDay() + 6) % 7) + 1; }; // 1 = lendi … 7 = dimanch
export const ajouteJou = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const ajouteMwa = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  const fen = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 12)).getUTCDate();
  t.setUTCDate(Math.min(d, fen)); // menm jan ak Postgres: 31 jan + 1 mwa = 28/29 fev
  return t.toISOString().slice(0, 10);
};
// Kanè ak yon kantite vèsman fiks (sèvis Epargne: 120): jou apre n-yèm jou peman an (jou ferye pa konte).
export function finVesman(debut, jours, n, feries = new Set()) {
  if (!debut || !jours?.length || !n) return null;
  let d = debut, k = 0;
  for (let i = 0; i < 4000; i++, d = ajouteJou(d, 1)) if (jours.includes(isoJou(d)) && !feries.has(d) && ++k >= n) return ajouteJou(d, 1);
  return d;
}

// Konbyen jou peman ant de dat (enklizif), dapre jou ki chwazi yo.
// Jou ferye yo pa konte. Dimanch konte sèlman pou kliyan ki chwazi l (frekans 7×, oswa dimanch nan jou peman l yo).
export function joursPeman(debut, fin, jours, feries = new Set()) {
  if (!jours?.length || !debut || !fin || fin < debut) return 0;
  let n = 0;
  for (let d = debut; d <= fin; d = ajouteJou(d, 1)) {
    const j = isoJou(d);
    if (jours.includes(j) && !feries.has(d)) n++;
  }
  return n;
}

// ---------- Ajoute nan file a ----------
export async function enqueue(kind, payload, deps = []) {
  await db.put("outbox", { kind, id: payload.id, payload, deps, created: new Date().toISOString(), status: "pending", error: null, tries: 0 });
  notify();
  run();
}

export async function retryOp(seq) {
  const op = await db.get("outbox", seq);
  if (!op) return;
  op.status = "pending";
  op.error = null;
  await db.put("outbox", op);
  notify();
  run();
}

// Efase yon operasyon an erè ak tout sa ki depann de li.
export async function dropOp(seq) {
  const ops = (await db.all("outbox")).sort((a, b) => a.seq - b.seq);
  const op = ops.find((o) => o.seq === seq);
  if (!op) return 0;
  const gone = new Set([op.id]);
  const toDel = [op];
  for (const o of ops) if (o.seq > seq && o.deps.some((d) => gone.has(d))) { gone.add(o.id); toDel.push(o); }
  for (const o of toDel) {
    await db.del("outbox", o.seq);
    if (o.payload.photo_id) await db.del("photos", o.payload.photo_id);
  }
  notify();
  return toDel.length;
}

async function remap(oldId, newId) {
  for (const o of await db.all("outbox")) {
    let ch = false;
    if (o.payload.id_personne === oldId) { o.payload.id_personne = newId; ch = true; }
    if (o.deps.includes(oldId)) { o.deps = o.deps.map((d) => (d === oldId ? newId : d)); ch = true; }
    if (ch) await db.put("outbox", o);
  }
}

const gpsArgs = (g) => ({ p_gps_lat: g?.lat ?? null, p_gps_lng: g?.lng ?? null, p_gps_precision: g?.acc ?? null });
// Chan fich kliyan an (okipasyon, kote biznis la…)
export const CHAN_FICH = ["pseudo", "date_naissance", "piece", "numero_piece",
  "adresse", "lieu_de_travail", "occupation", "secteur", "activite", "point_de_vente", "capacite_distribution"];
const majArgs = (p) => ({
  p_id_personne: p.id, p_adresse: p.adresse || null, p_lieu_de_travail: p.lieu_de_travail || null, p_occupation: p.occupation || null,
  p_secteur: p.secteur || null, p_activite: p.activite || null, p_point_de_vente: p.point_de_vente || null,
  p_capacite_distribution: p.capacite_distribution || null, ...gpsArgs(p.gps), p_capture_le: p.capture_le,
  p_pseudo: p.pseudo || null, p_date_naissance: p.date_naissance || null, p_piece: p.piece || null, p_numero_piece: p.numero_piece || null,
});

const EXEC = {
  async client(p) {
    let photo_url = p.photo_url || null;
    if (p.photo_id && !photo_url) {
      const ph = await db.get("photos", p.photo_id);
      if (ph) {
        const path = `${C.DOSYE_FOTO}/${p.id}.jpg`;
        await api.upload(path, ph.blob);
        photo_url = api.publicUrl(path);
      }
    }
    const r = await api.rpc("grandon_inscrire_client", {
      p_id: p.id, p_prenom: p.prenom, p_nom: p.nom, p_telephone: p.telephone, p_nif: p.numero_piece || p.nif || null,
      p_sexe: p.sexe || null, p_adresse: p.adresse || null, p_activite: p.activite || null, p_photo_url: photo_url,
      ...gpsArgs(p.gps), p_capture_le: p.capture_le, p_code_client: p.code_client || null,
    });
    const id = r.id_personne;
    if (id !== p.id) await remap(p.id, id);
    if (CHAN_FICH.some((k) => p[k])) await api.rpc("grandon_maj_client", { ...majArgs(p), p_id_personne: id });
    if (!(await db.get("clients", id)))
      await db.put("clients", { id_personne: id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, sexe: p.sexe, photo_url, code_client: r.code_client || p.code_client || null,
        ...Object.fromEntries(CHAN_FICH.map((k) => [k, p[k] || null])), gps_lat: p.gps?.lat ?? null, gps_lng: p.gps?.lng ?? null });
    else if (r.code_client) { const c = await db.get("clients", id); c.code_client = r.code_client; await db.put("clients", c); }
    if (p.photo_id) await db.del("photos", p.photo_id);
    if (r.deja) return `${p.prenom} ${p.nom} te deja nan baz la: nou itilize dosye ki te la a.`;
    if (r.code_client && p.code_client && r.code_client !== p.code_client) return `${p.prenom} ${p.nom}: kòd kliyan an chanje (${r.code_client}).`;
    if (r.doublon) return `${p.prenom} ${p.nom}: gen yon lòt moun ki gen menm non nan baz la. Yon manadjè ap verifye si se menm moun.`;
    return null;
  },

  async adopte(p) {
    await api.rpc("grandon_inscrire_client", {
      p_id: p.id, p_prenom: p.prenom || "-", p_nom: p.nom || "-", p_telephone: "00000000",
      ...gpsArgs(p.gps), p_capture_le: p.capture_le,
    });
    if (!(await db.get("clients", p.id)))
      await db.put("clients", { id_personne: p.id, prenom: p.prenom, nom: p.nom, code_client: p.code_client, photo_url: p.photo_url, tel4: p.tel4 });
  },

  async gps(p) {
    try {
      await api.rpc("grandon_gps_aktive", { p_id_personne: p.id_personne, p_lat: p.lat, p_lng: p.lng, p_precision: p.acc ?? null, p_capture_le: p.capture_le });
    } catch (e) { if (!/GPS_DEJA/.test(e.message || "")) throw e; } // yon lòt ajan te aktive l deja: sa bon
    const c = await db.get("clients", p.id_personne);
    if (c && c.gps_lat == null) { c.gps_lat = p.lat; c.gps_lng = p.lng; await db.put("clients", c); }
  },

  async foto(p) {
    const ph = await db.get("photos", p.photo_id);
    if (!ph) return; // foto a pa sou telefòn nan ankò: anyen pou voye
    const path = `${C.DOSYE_FOTO}/${p.id_personne}-${p.id.slice(0, 8)}.jpg`;
    await api.upload(path, ph.blob);
    const photo_url = api.publicUrl(path);
    await api.rpc("grandon_foto_chanje", { p_id_personne: p.id_personne, p_photo_url: photo_url, p_capture_le: p.capture_le });
    const c = await db.get("clients", p.id_personne);
    if (c) { c.photo_url = photo_url; await db.put("clients", c); }
    await db.del("photos", p.photo_id);
  },

  async maj(p) {
    await api.rpc("grandon_maj_client", majArgs(p));
    const c = await db.get("clients", p.id);
    if (c) {
      for (const k of CHAN_FICH) if (p[k]) c[k] = p[k];
      if (p.gps) { c.gps_lat = p.gps.lat; c.gps_lng = p.gps.lng; }
      await db.put("clients", c);
    }
  },

  async demande(p) {
    const r = await api.rpc("grandon_demande", {
      p_id: p.id, p_type: p.type, p_compte: p.compte, p_montant: p.montant, p_compte_dest: p.compte_dest || null,
      p_note: p.note || null, p_solde_avant_declare: p.solde_avant_declare ?? null, p_solde_apres_declare: p.solde_declare ?? null,
      ...gpsArgs(p.gps), p_capture_le: p.capture_le,
    });
    await db.put("demandes", { id: p.id, type: p.type, id_compte_epargne: p.compte, id_compte_dest: p.compte_dest || null, montant: p.montant,
      note: p.note || null, agent_id: api.getSession()?.user?.id, capture_le: p.capture_le, statut: r.statut });
  },

  // Demann pou modifye/siprime (ajan) ak modifikasyon apre otorizasyon (migrasyon 29).
  async modif_demann(p) {
    const r = await api.rpc("grandon_modif_demann", { p_id: p.id, p_kind: p.kind, p_operasyon: p.operasyon, p_ref: p.ref, p_chan: p.chan || null,
      p_rezon: p.rezon, p_kreye_le: p.kreye_le });
    await db.put("modif", { id: p.id, kind: p.kind, operasyon: p.operasyon, ref_id: p.ref, chan: p.chan || null, rezon: p.rezon,
      agent_id: api.getSession()?.user?.id, kreye_le: p.kreye_le, statut: r.statut || "an_atant" });
  },

  async modif_aplike(p) {
    await api.rpc("grandon_modif_aplike", { p_otorizasyon: p.otorizasyon || null, p_kind: p.kind, p_ref: p.ref, p_chan: p.chan, p_vale: p.vale });
    if (p.otorizasyon) { const m = await db.get("modif", p.otorizasyon); if (m) { m.statut = "itilize"; m.vale_apre = p.vale; await db.put("modif", m); } }
    if (p.kind === "kliyan") { const c = await db.get("clients", p.ref); if (c) { aplikeKliyan(c, p.chan, p.vale); await db.put("clients", c); } }
    else { const t = await db.get("transactions", p.ref); if (t) { aplikeTx(t, p.chan, p.vale); await db.put("transactions", t); } }
  },

  async alet(p) {
    const tip = p.tip || "manyel";
    await api.rpc("grandon_alet_kreye", { p_id: p.id, p_compte: p.compte, p_tit: p.tit, p_mesaj: p.mesaj || null, p_nivo: p.nivo,
      p_fen: p.fen, p_fen_dat: p.fen === "dat" ? p.fen_dat : null, p_kreye_le: p.kreye_le,
      ...(tip !== "manyel" || p.pwoblem || p.dele || p.credit ? { p_tip: tip, p_pwoblem: p.pwoblem || null, p_dele: p.dele || null } : {}),
      ...(p.credit ? { p_credit: p.credit } : {}) });
    await db.put("alet", { id: p.id, id_compte_epargne: p.compte, tit: p.tit, mesaj: p.mesaj || null, nivo: p.nivo, fen_kondisyon: tip === "rapel" ? "manyel" : p.fen,
      fen_dat: p.fen === "dat" ? p.fen_dat : null, kreye_pa: api.getSession()?.user?.id, kreye_le: p.kreye_le, fermen_le: null,
      tip, pwoblem: p.pwoblem || null, dele: p.dele || null, id_compte_credit: p.credit || null });
  },

  async alet_fermen(p) {
    await api.rpc("grandon_alet_fermen", { p_id: p.id, p_le: p.le });
    const a = await db.get("alet", p.id);
    if (a) { a.fermen_le = p.le; a.fermen_pa = api.getSession()?.user?.id; await db.put("alet", a); }
  },

  async suivi(p) {
    await api.rpc("grandon_suivi", { p_id: p.id, p_compte: p.compte, p_motif: p.motif, p_note: p.note || null, ...gpsArgs(p.gps), p_capture_le: p.capture_le });
    await db.put("suivis", { id: p.id, id_compte_epargne: p.compte, motif: p.motif, note: p.note || null, agent_id: api.getSession()?.user?.id, capture_le: p.capture_le,
      gps_lat: p.gps?.lat ?? null, gps_lng: p.gps?.lng ?? null, gps_precision_m: p.gps?.acc ?? null });
  },

  async cycle(p) {
    const r = await api.rpc("grandon_creer_cycle", {
      p_id: p.id, p_id_personne: p.id_personne, p_duree: p.duree, p_frequence: p.frequence, p_jours: p.jours,
      p_montant: p.montant, p_date_debut: p.date_debut, ...gpsArgs(p.gps), p_capture_le: p.capture_le, p_appareil: p.appareil,
      p_no_compte: p.no_compte || null,
      ...(p.tip_plan || p.plan_lib ? { p_tip_plan: p.tip_plan || "regilye", p_plan_lib: !!p.plan_lib } : {}),
    });
    await db.put("comptes", {
      id_compte_epargne: p.id, no_compte: r.no_compte, id_personne: p.id_personne, solde_actuel: 0, montant_plan: p.montant,
      duree_mois: p.duree, frequence_semaine: p.frequence, jours_paiement: p.jours, date_debut: p.date_debut,
      date_fin: r.date_fin || p.date_fin || ajouteMwa(p.date_debut, p.duree), depo_an_atant: 0,
      tip_plan: p.tip_plan || "regilye", plan_lib: !!p.plan_lib, nb_vesman: p.nb_vesman || null,
      created_by: api.getSession()?.user?.id, created_at: p.capture_le,
    });
  },

  // Peman jounalye yon kredi (an atant jiskaske responsab kès la valide l).
  async kredi_peye(p) {
    const r = await api.rpc("grandon_kredi_peye", { p_id: p.id, p_credit: p.credit, p_montant: p.montant, ...gpsArgs(p.gps),
      p_capture_le: p.capture_le, p_appareil: p.appareil, p_note: p.note || null, p_vesman_avan: p.vesman_avan ?? null, p_vesman_apre: p.vesman_apre ?? null });
    const l = (await db.meta("kredi_tx")) || [];
    if (!l.some((x) => x.id_transaction_credit === p.id))
      await db.meta("kredi_tx", [...l, { id_transaction_credit: p.id, id_compte_credit: p.credit, no_compte: r.no_compte, type_transaction: "Paiement", montant: p.montant,
        date_transaction: p.capture_le, capture_le: p.capture_le, validation_status: r.statut || "pending", created_by: api.getSession()?.user?.id, _local: true,
        versement_avant: p.vesman_avan ?? null, versement_apres: p.vesman_apre ?? null }]);
  },

  // Fidbak «Pa peye» sou yon kredi.
  async kredi_suivi(p) {
    await api.rpc("grandon_kredi_suivi", { p_id: p.id, p_credit: p.credit, p_motif: p.motif, p_note: p.note || null, ...gpsArgs(p.gps), p_capture_le: p.capture_le });
    const l = (await db.meta("kredi_fb")) || [];
    if (!l.some((x) => x.id === p.id))
      await db.meta("kredi_fb", [{ id: p.id, id_compte_credit: p.credit, motif: p.motif, note: p.note || null, agent_id: api.getSession()?.user?.id, capture_le: p.capture_le }, ...l]);
  },

  // Penalite kredi ajan an ankese (konfime touswit; li parèt nan Kès la).
  async kredi_penalite(p) {
    const r = await api.rpc("grandon_kredi_penalite", { p_id: p.id, p_credit: p.credit, p_montant: p.montant, ...gpsArgs(p.gps),
      p_capture_le: p.capture_le, p_appareil: p.appareil, p_note: p.note || null });
    const l = (await db.meta("kredi_tx")) || [];
    if (!l.some((x) => x.id_transaction_credit === p.id))
      await db.meta("kredi_tx", [...l, { id_transaction_credit: p.id, id_compte_credit: p.credit, no_compte: r.no_compte, type_transaction: "Penalite", montant: p.montant,
        date_transaction: p.capture_le, capture_le: p.capture_le, validation_status: "confirmed", created_by: api.getSession()?.user?.id, _local: true }]);
  },

  async tx(p) {
    const r = await api.rpc("grandon_transaction", {
      p_id: p.id, p_compte: p.compte, p_type: p.type, p_montant: p.montant, p_solde_declare: p.solde_declare ?? null,
      ...gpsArgs(p.gps), p_capture_le: p.capture_le, p_appareil: p.appareil, p_note: p.note || null,
      p_solde_avant_declare: p.solde_avant_declare ?? null, p_type_frais: p.type_frais || null,
    });
    await db.put("transactions", {
      id_transaction_epargne: p.id, id_compte_epargne: p.compte, type_transaction: p.type, montant: p.montant,
      date_transaction: p.capture_le, validation_status: r.statut, solde_apres_transactions: r.solde_apres,
      created_by: api.getSession()?.user?.id, solde_declare: p.solde_declare ?? null, _local_date: true,
      solde_avant_declare: p.solde_avant_declare ?? null, type_frais: p.type_frais || null,
    });
    const k = await db.get("comptes", p.compte);
    if (k) {
      if (k.solde_actuel != null) { // manadjè sèlman: sèvè a bay balans lan
        if (r.statut === "pending") k.depo_an_atant = Number(k.depo_an_atant || 0) + Number(p.montant);
        else if (r.solde_apres != null) k.solde_actuel = Number(r.solde_apres);
      }
      await db.put("comptes", k);
    }
  },
};

// ---------- Senkronizasyon ----------
let running = null;
export const isRunning = () => !!running;

// Yon sèl aparèy aktif pa ajan: sèvè a di si aparèy sa a toujou aktif (epi li konnen konbyen operasyon poko voye).
// Retounen null si aparèy la aktif, sinon { debloke } (debloke = yon manadjè te libere kont lan).
export async function tcheAparey(poko) {
  try {
    const r = await api.rpc("grandon_aparey_eta", { p_aparey: api.apareyId(), p_poko_voye: poko });
    if (r && r.aktif === false) {
      const b = { debloke: !!r.debloke, le: new Date().toISOString() };
      await db.meta("aparey_bloke", b);
      return b;
    }
    if (await db.meta("aparey_bloke")) await db.meta("aparey_bloke", null);
    return null;
  } catch (e) {
    if (e.retry || e.code === "SESSION") throw e;
    return null; // fonksyon an pa disponib: pa bloke ajan an
  }
}

export function run({ pull: doPull = true } = {}) {
  if (running) return running;
  running = (async () => {
    // Fòk `running` resevwa pwomès la ANVAN `finally` an mete l a null,
    // sinon yon run ki fini tousuit (offline) ta bloke tout lòt sync yo.
    await Promise.resolve();
    const res = { ok: 0, errors: 0, offline: false, session: false, notices: [] };
    try {
      if (!navigator.onLine) { res.offline = true; return res; }
      const s = api.getSession();
      if (!s || s.expired) { res.session = true; return res; }
      const blocked = new Set();
      const ops = (await db.all("outbox")).sort((a, b) => a.seq - b.seq);
      if ((res.aparey = await tcheAparey(ops.length))) return res; // lòt aparèy aktif: pa voye anyen, kenbe outbox la
      for (const op of ops) {
        const cur = await db.get("outbox", op.seq); // relire: remap ka chanje l
        if (!cur) continue;
        if (cur.status === "erè" || cur.deps.some((d) => blocked.has(d))) { blocked.add(cur.id); continue; }
        try {
          const notice = await EXEC[cur.kind](cur.payload);
          if (notice) res.notices.push(notice);
          await db.del("outbox", cur.seq);
          res.ok++;
          notify();
        } catch (e) {
          // Frè sou yon kont kote depo yo poko valide: rete an atant, l ap reeseye nan pwochen sync yo.
          if (cur.kind === "tx" && cur.payload.type === "FL" && /insuffisant/i.test(e.message)) {
            cur.error = "Frè a ap tann depo yo valide (balans valide a poko ase). L ap reeseye otomatikman.";
            cur.attente = true;
            await db.put("outbox", cur);
            blocked.add(cur.id);
            res.attente = (res.attente || 0) + 1;
            continue;
          }
          if (e.retry || e.code === "SESSION") {
            res.offline = !!e.retry; res.session = e.code === "SESSION";
            await db.meta("last_error", e.message);
            break;
          }
          // Refi pèmisyon: petèt se paske yon lòt aparèy vin aktif. Lè sa a, kite operasyon an poko voye.
          if ((e.status === 401 || e.status === 403 || e.code === "42501") && (res.aparey = await tcheAparey(ops.length))) break;
          cur.status = "erè";
          cur.error = String(e.message || '').replace(/^[A-Z_]{4,}:\s*/, '');
          cur.tries++;
          await db.put("outbox", cur);
          blocked.add(cur.id);
          res.errors++;
          notify();
        }
      }
      if (res.aparey) return res;
      if (res.ok) await tcheAparey((await db.all("outbox")).length).catch(() => {}); // sèvè a konnen sa ki rete
      if (doPull && !res.offline && !res.session) await pull();
      await db.meta("last_sync", new Date().toISOString());
    } catch (e) {
      console.warn("sync", e);
      res.offline = !!e.retry;
      res.session = e.code === "SESSION";
    } finally {
      running = null;
      notify();
    }
    return res;
  })();
  return running;
}

export async function pull() {
  const depi = ajouteJou(jodi(), -200);
  const [clients, comptes, plans, txs] = await Promise.all([
    api.selectAll("grandon_v_clients?select=id_personne,prenom,nom,pseudo,telephone,code_client,sexe,date_naissance,piece,numero_piece,adresse,lieu_de_travail,occupation,secteur,activite,point_de_vente,capacite_distribution,photo_url,gps_lat,gps_lng&order=prenom"),
    api.selectAll("grandon_v_comptes?select=*&order=date_debut.desc"),
    api.selectAll("grandon_plans?actif=is.true&select=montant&order=montant"),
    api.selectAll(`grandon_v_transactions?date_transaction=gte.${depi}&select=id_transaction_epargne,id_compte_epargne,type_transaction,montant,date_transaction,validation_status,solde_apres_transactions,created_by,solde_declare,solde_avant_declare,type_frais,virement_from,virement_to&order=date_transaction`),
  ]);
  const depi2 = ajouteJou(jodi(), -90);
  const [feries, suivis, demandes, alet, modif] = await Promise.all([
    api.selectAll("grandon_jours_feries?select=jour,libelle&order=jour"),
    api.selectAll(`grandon_suivis?capture_le=gte.${depi2}&select=id,id_compte_epargne,motif,note,agent_id,capture_le,gps_lat,gps_lng,gps_precision_m,distans_m,kontwol&order=capture_le.desc`),
    api.selectAll(`grandon_demandes?or=${encodeURIComponent(`(statut.eq.en_attente,created_at.gte.${depi2})`)}&select=*&order=created_at.desc`),
    api.selectAll(`grandon_alet?or=${encodeURIComponent(`(fermen_le.is.null,fermen_le.gte.${depi2})`)}&select=*&order=kreye_le.desc`).catch(() => null),
    api.selectAll(`grandon_modif?or=${encodeURIComponent(`(statut.in.(an_atant,apwouve),created_at.gte.${depi2})`)}&select=*&order=kreye_le.desc`).catch(() => null),
  ]);
  try { // non ajan yo (manadjè yo wè tout moun; yon ajan wè sèlman pa l)
    const pa = await api.select("grandon_paramet?select=kle,vale").catch(() => null); // lè operasyon, elatriye
    const sv = await api.select(`grandon_sevis?kod=eq.${C.SEVIS || "grandon"}&select=kod,non,vesman,plan_lib_min,gen_vip,fre_sevis,fre_dat,fre_lib,fre_lib_elijib`).catch(() => null);
    if (sv) await db.meta("sevis_cfg", sv[0] || null);
    if (pa) await db.meta("paramet", Object.fromEntries(pa.map((x) => [x.kle, x.vale])));
    const aj = await api.select("grandon_ajan?select=user_id,nom,role,actif");
    await db.meta("ajans", Object.fromEntries(aj.map((x) => [x.user_id, x.nom])));
    await db.meta("ekip", aj.map((x) => ({ user_id: x.user_id, nom: x.nom, role: x.role, actif: x.actif })));
    const kr = await api.selectAll("grandon_v_kredi?select=*&order=created_at.desc").catch(() => null); // kredi (sèvis sit la)
    if (kr) await db.meta("kredi", kr);
    const krt = kr ? await api.selectAll("grandon_v_kredi_tx?select=*&order=date_transaction").catch(() => null) : null; // peman kredi yo
    if (krt) await db.meta("kredi_tx", krt);
    const krs = kr ? await api.selectAll("grandon_v_kredi_suivis?select=*&order=capture_le.desc").catch(() => null) : null; // fidbak «Pa peye» kredi yo
    if (krs) await db.meta("kredi_fb", krs);
  } catch { /* administratè (imèl): pa gen liy grandon_ajan pou yo */ }
  await db.replaceAll("feries", feries);
  await db.replaceAll("suivis", suivis);
  await db.replaceAll("demandes", demandes);
  if (alet) await db.replaceAll("alet", alet); // null: tab la poko la sou sèvè a
  if (modif) await db.replaceAll("modif", modif);
  await db.replaceAll("clients", clients);
  await db.replaceAll("comptes", comptes);
  await db.replaceAll("plans", plans);
  await db.replaceAll("transactions", txs);
  await db.meta("last_pull", new Date().toISOString());
}

// ---------- Modèl lokal: done sèvè + sa ki nan file a ----------
export const jouTx = (t) => (t._pending || t._local_date ? jouLokal(new Date(t.date_transaction)) : String(t.date_transaction).slice(0, 10));

// Frais sèvis (sèvis Epargne): eta pou chak kont (alèt «Frais sèvis» lè kont lan elijib epi frais la poko pran).
function freEta(k, cfg, today) {
  if (!cfg?.fre_sevis || k._pending) return null;
  const kreye = jouLokal(new Date(k.date_kreye || k.created_at || `${k.date_debut}T12:00:00Z`));
  const plan = Number(k.montant_plan || 0);
  const depo = k._txs.filter((x) => txKind(x) === "depo" && x.validation_status === "confirmed" && !x._pending);
  const som = depo.reduce((a, x) => a + Number(x.montant || 0), 0);
  const deja = k._txs.some((x) => x.type_transaction === "FL" && x.type_frais === "Frais service" && x.validation_status !== "rejected");
  const elijib = k.plan_lib ? som >= Number(cfg.fre_lib_elijib) : depo.length >= 3 || som >= 3 * plan;
  return { regim: kreye >= cfg.fre_dat ? "nouveau" : "auto", montan: k.plan_lib ? Number(cfg.fre_lib) : plan, n: depo.length, som, deja, elijib,
    pou: kreye >= cfg.fre_dat && elijib && !deja && k._actif !== false && today >= k.date_debut };
}

export async function model() {
  const cfgSv = await db.meta("sevis_cfg");
  const [clients, comptes, txs, outbox, plans, feries, suivis, demandes, alet, modif] = await Promise.all(
    ["clients", "comptes", "transactions", "outbox", "plans", "feries", "suivis", "demandes", "alet", "modif"].map((s) => db.all(s)));
  const M = {
    clients: new Map(clients.map((c) => [c.id_personne, { ...c }])),
    comptes: new Map(comptes.map((k) => [k.id_compte_epargne, { ...k }])),
    txs: new Map(txs.map((t) => [t.id_transaction_epargne, { ...t }])),
    plans: plans.map((p) => Number(p.montant)).sort((a, b) => a - b),
    feries: new Set(feries.map((f) => f.jour)), feriesList: feries,
    suivis: new Map(suivis.map((x) => [x.id, { ...x }])),
    demandes: new Map(demandes.map((x) => [x.id, { ...x }])),
    alet: new Map(alet.map((x) => [x.id, { ...x }])),
    modif: new Map(modif.map((x) => [x.id, { ...x }])),
    outbox: outbox.sort((a, b) => a.seq - b.seq),
  };
  for (const o of M.outbox) {
    const p = o.payload;
    const pend = { _pending: true, _error: o.status === "erè" ? o.error : null, _seq: o.seq };
    if (o.kind === "client")
      M.clients.set(p.id, { id_personne: p.id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, sexe: p.sexe, photo_id: p.photo_id, code_client: p.code_client || null,
        ...Object.fromEntries(CHAN_FICH.map((k) => [k, p[k] || null])), gps_lat: p.gps?.lat ?? null, gps_lng: p.gps?.lng ?? null, ...pend });
    if (o.kind === "maj" && M.clients.has(p.id)) {
      const c = M.clients.get(p.id);
      for (const k of CHAN_FICH) if (p[k]) c[k] = p[k];
      if (p.gps) { c.gps_lat = p.gps.lat; c.gps_lng = p.gps.lng; }
      c._majPending = true; if (pend._error) c._error = pend._error;
    }
    if (o.kind === "gps" && M.clients.has(p.id_personne) && M.clients.get(p.id_personne).gps_lat == null)
      Object.assign(M.clients.get(p.id_personne), { gps_lat: p.lat, gps_lng: p.lng, _gpsPending: true });
    if (o.kind === "foto" && M.clients.has(p.id_personne)) Object.assign(M.clients.get(p.id_personne), { photo_id: p.photo_id, _fotoPending: true });
    if (o.kind === "adopte" && !M.clients.has(p.id))
      M.clients.set(p.id, { id_personne: p.id, prenom: p.prenom, nom: p.nom, code_client: p.code_client, photo_url: p.photo_url, tel4: p.tel4, ...pend });
    if (o.kind === "cycle")
      M.comptes.set(p.id, {
        id_compte_epargne: p.id, no_compte: p.no_compte || null, id_personne: p.id_personne, solde_actuel: 0, montant_plan: p.montant,
        duree_mois: p.duree, frequence_semaine: p.frequence, jours_paiement: p.jours, date_debut: p.date_debut,
        date_fin: p.date_fin || ajouteMwa(p.date_debut, p.duree), depo_an_atant: 0, created_at: p.capture_le, created_by: "moi",
        tip_plan: p.tip_plan || "regilye", plan_lib: !!p.plan_lib, nb_vesman: p.nb_vesman || null, ...pend });
    if (o.kind === "demande")
      M.demandes.set(p.id, { id: p.id, type: p.type, id_compte_epargne: p.compte, id_compte_dest: p.compte_dest || null, montant: p.montant,
        note: p.note, agent_id: "moi", capture_le: p.capture_le, statut: M.comptes.get(p.compte)?.tip_plan === "vip" ? "otorizasyon" : "en_attente", ...pend });
    if (o.kind === "modif_demann")
      M.modif.set(p.id, { id: p.id, kind: p.kind, operasyon: p.operasyon, ref_id: p.ref, chan: p.chan || null, rezon: p.rezon, agent_id: "moi",
        kreye_le: p.kreye_le, statut: "an_atant", ...pend });
    if (o.kind === "modif_aplike") {
      if (p.otorizasyon && M.modif.has(p.otorizasyon)) Object.assign(M.modif.get(p.otorizasyon), { statut: "itilize", _aplikePending: true });
      if (p.kind === "kliyan" && M.clients.has(p.ref)) Object.assign(aplikeKliyan(M.clients.get(p.ref), p.chan, p.vale), { _majPending: true });
      if (p.kind === "tx" && M.txs.has(p.ref)) aplikeTx(M.txs.get(p.ref), p.chan, p.vale);
    }
    if (o.kind === "alet")
      M.alet.set(p.id, { id: p.id, id_compte_epargne: p.compte, tit: p.tit, mesaj: p.mesaj, nivo: p.nivo, fen_kondisyon: p.tip === "rapel" ? "manyel" : p.fen,
        fen_dat: p.fen === "dat" ? p.fen_dat : null, kreye_pa: "moi", kreye_le: p.kreye_le, fermen_le: null,
        tip: p.tip || "manyel", pwoblem: p.pwoblem || null, dele: p.dele || null, id_compte_credit: p.credit || null, ...pend });
    if (o.kind === "alet_fermen" && M.alet.has(p.id)) Object.assign(M.alet.get(p.id), { fermen_le: p.le, fermen_pa: "moi", _fermenPending: true });
    if (o.kind === "suivi")
      M.suivis.set(p.id, { id: p.id, id_compte_epargne: p.compte, motif: p.motif, note: p.note, agent_id: "moi", capture_le: p.capture_le,
        gps_lat: p.gps?.lat ?? null, gps_lng: p.gps?.lng ?? null, gps_precision_m: p.gps?.acc ?? null, ...pend });
    if (o.kind === "tx")
      M.txs.set(p.id, {
        id_transaction_epargne: p.id, id_compte_epargne: p.compte, type_transaction: p.type, montant: p.montant,
        date_transaction: p.capture_le, validation_status: null, solde_declare: p.solde_declare, solde_avant_declare: p.solde_avant_declare,
        type_frais: p.type_frais, note: p.note, created_by: "moi", ...pend });
  }
  const today = jodi();
  M.today = today;
  // Kredi yo (si sèvè a gen modil la): eta chak kredi, epi chak kont epay konnen kredi ki lye ak li (alèt, pwoblèm kredi).
  const [krL, krTx, krFb, krPa] = await Promise.all(["kredi", "kredi_tx", "kredi_fb", "paramet"].map((x) => db.meta(x)));
  M.kredi = Array.isArray(krL) ? kreModel(M, krL, krTx || [], krFb || [], Number(((krPa || {}).kredi_gras || {}).jou ?? 5), api.getSession()?.user?.id) : [];
  for (const k of M.comptes.values()) Object.assign(k, { _txs: [], _local: 0, _jodi: 0, _depots: 0, _nDepots: 0, _joursPeye: new Set(), _suivis: [], _demandes: [], _kolekMwa: 0, _alet: [] });
  for (const t of M.txs.values()) {
    const k = M.comptes.get(t.id_compte_epargne);
    if (!k) continue;
    k._txs.push(t);
    const kind = txKind(t);
    if (t._pending) k._local += Number(t.montant) * (kind === "depo" ? 1 : -1);
    if (kind === "depo" && t.validation_status !== "rejected") {
      const j = jouTx(t);
      k._joursPeye.add(j);
      k._depots += Number(t.montant); k._nDepots++;
      if (j === today) k._jodi += Number(t.montant);
      if (j.slice(0, 7) === today.slice(0, 7) && j <= today) k._kolekMwa += Number(t.montant);
    }
  }
  for (const x of M.suivis.values()) {
    M.comptes.get(x.id_compte_epargne)?._suivis.push(x);
    // Kontwòl kote fidbak la fèt (sèvè a kalkile l; isit se pou fidbak ki poko rive sou sèvè a): menm règ ak migrasyon 27.
    if (!x.kontwol) Object.assign(x, kontwolSwivi(x, M.clients.get(M.comptes.get(x.id_compte_epargne)?.id_personne)));
  }
  for (const x of M.demandes.values()) M.comptes.get(x.id_compte_epargne)?._demandes.push(x);
  for (const a of M.alet.values()) M.comptes.get(a.id_compte_epargne)?._alet.push(a);
  for (const k of M.comptes.values()) {
    k._txs.sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)));
    k._suivis.sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
    k._demandes.sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
    k._actif = !k.date_fin || k.date_fin >= today;
    k._jodiPeman = k._actif && !!k.jours_paiement?.includes(isoJou(today)) && k.date_debut <= today && !M.feries.has(today);
    const finCycle = k.date_fin ? ajouteJou(k.date_fin, -1) : null;
    k._prevu = joursPeman(k.date_debut, finCycle && today > finCycle ? finCycle : today, k.jours_paiement, M.feries);
    k._prevuTotal = finCycle ? joursPeman(k.date_debut, finCycle, k.jours_paiement, M.feries) : null;
    k._totalPrevu = k._prevuTotal != null && k.montant_plan ? k._prevuTotal * Number(k.montant_plan) : null;
    // Balans sistèm nan: sèvè a voye l pou manadjè yo sèlman (null pou ajan yo).
    k._solde = k.solde_actuel == null ? null : Number(k.solde_actuel) + Number(k.depo_an_atant || 0) + k._local;
    // Reta: jou peman prevwa jiska jodi a ki poko gen depo.
    // Kòb pou rekipere: vèsman prevwa jiska jodi a × plan − sa kliyan an depoze sou cycle la. Vèsman an reta = kòb sa a / plan (awondi anlè).
    const planK = Number(k.montant_plan || 0);
    k._aRekipere = planK ? Math.max(0, k._prevu * planK - k._depots) : 0;
    k._anReta = planK ? Math.ceil(k._aRekipere / planK) : Math.max(0, k._prevu - k._joursPeye.size);
    k._pwosan = k._prevuTotal ? Math.min(100, Math.round((k._joursPeye.size / k._prevuTotal) * 100)) : 0;
    // Mwa a (pati 2 tablo a): sa kliyan an te dwe peye depi 1ye mwa a (oswa debi cycle la) jiska jodi a, ak sa l peye nan mwa a.
    // Dwe = prevu jiska jodi a − kolekte (maks prevu a): li desann lè l peye, li monte lè l rate yon jou.
    const mwa1 = today.slice(0, 8) + "01", mwaFen = ajouteJou(ajouteJou(mwa1, 32).slice(0, 8) + "01", -1);
    const dMwa = k.date_debut > mwa1 ? k.date_debut : mwa1, plan = Number(k.montant_plan || 0);
    const fMwa = (fin) => (finCycle && finCycle < fin ? finCycle : fin);
    k._mwaPrevu = joursPeman(dMwa, fMwa(today), k.jours_paiement, M.feries) * plan;
    k._mwaPrevuTotal = joursPeman(dMwa, fMwa(mwaFen), k.jours_paiement, M.feries) * plan;
    k._mwaPlan = Math.min(k._kolekMwa, k._mwaPrevu);
    k._mwaDwe = Math.max(0, k._mwaPrevu - k._kolekMwa);
    k._dots = semenDots(k, M.feries, today);
    k._fre = freEta(k, cfgSv, today);
    k._kredi = M.kredi.filter((x) => x.id_compte_epargne === k.id_compte_epargne && (!x._fini || x._penDu > 0));
    // Alèt manadjè yo: eta a evalye isit la (menm offline). fermen: fèmen manyèlman · oto: kondisyon an rive.
    for (const a of k._alet) {
      const depoApre = k._txs.some((t) => txKind(t) === "depo" && t.validation_status !== "rejected" && new Date(t.date_transaction) >= new Date(a.kreye_le));
      a._eta = a.fermen_le ? "fermen"
        : (a.fen_kondisyon === "pa_reta" && k._aRekipere === 0) || (a.fen_kondisyon === "depo" && depoApre) || (a.fen_kondisyon === "dat" && a.fen_dat && today > a.fen_dat)
          || (a.fen_kondisyon === "regle" && genPwoblem(a.pwoblem, M.clients.get(k.id_personne), k) === false) ? "oto"
        : "aktif";
      a.tip ||= "manyel";
      a._anReta = a._eta === "aktif" && !!a.dele && today > a.dele; // dèlè swivi a depase
    }
    k._heat = heatmap13(k, M.feries, today);
  }
  M.today = today;
  return M;
}

// Peman kredi yo (sèvè + sa ki nan file a) ak eta chak kredi: an atant validasyon, reta, sa ki dwe jodi a.
export const JOU_KREDI = [1, 2, 3, 4, 5, 6];
export const jouKreTx = (x) => (x.capture_le ? jouLokal(new Date(x.capture_le)) : String(x.date_transaction || "").slice(0, 10));
function kreModel(M, l, txs0, fbs0, gras, moiId) {
  const txs = [...txs0];
  for (const o of M.outbox) if ((o.kind === "kredi_peye" || o.kind === "kredi_penalite") && !txs.some((x) => x.id_transaction_credit === o.payload.id))
    txs.push({ id_transaction_credit: o.payload.id, id_compte_credit: o.payload.credit, type_transaction: o.kind === "kredi_penalite" ? "Penalite" : "Paiement", montant: o.payload.montant,
      date_transaction: o.payload.capture_le, capture_le: o.payload.capture_le, validation_status: o.kind === "kredi_penalite" ? "confirmed" : "pending", created_by: moiId, _pending: true, _err: o.status === "error" ? o.error : null,
      versement_avant: o.payload.vesman_avan ?? null, versement_apres: o.payload.vesman_apre ?? null });
  const sòt = (a, b) => String(b.capture_le || b.date_transaction).localeCompare(String(a.capture_le || a.date_transaction));
  const fbs = [...fbs0];
  for (const o of M.outbox) if (o.kind === "kredi_suivi" && !fbs.some((x) => x.id === o.payload.id))
    fbs.push({ id: o.payload.id, id_compte_credit: o.payload.credit, motif: o.payload.motif, note: o.payload.note || null, agent_id: moiId, capture_le: o.payload.capture_le, _pending: true });
  return l.map((x) => {
    const tout = txs.filter((y) => y.id_compte_credit === x.id_compte_credit).sort(sòt);
    const tx = tout.filter((y) => y.type_transaction === "Paiement");
    const pj = Number(x.paiement_journalier) || 0, final = Number(x.montant_final) || 0, paye = Number(x.paiement_cumule) || 0;
    const atant = tx.filter((y) => y.validation_status === "pending").reduce((a, y) => a + Number(y.montant || 0), 0);
    const rete = Math.max(Math.round((final - paye - atant) * 100) / 100, 0);
    const nDwe = Math.min(joursPeman(x.date_debut, ajouteJou(M.today, -1), JOU_KREDI, M.feries), Number(x.nb_vesman) || 0);
    const reta = Math.max(Math.round((Math.min(nDwe * pj, final) - paye - atant) * 100) / 100, 0);
    const jodi = rete > 0 && M.today >= x.date_debut && JOU_KREDI.includes(isoJou(M.today)) && !M.feries.has(M.today);
    const peJodi = tx.filter((y) => y.validation_status !== "rejected" && jouKreTx(y) === M.today).reduce((a, y) => a + Number(y.montant || 0), 0);
    // Penalite: apre dat fen + jou gras yo, chak jou peman kliyan an toujou dwe = 20% peman jounalye a.
    const penDe = x.date_fin ? ajouteJou(x.date_fin, gras + 1) : null;
    const dPe = tx.find((y) => y.validation_status === "confirmed");
    const penA = final - paye > 0 ? M.today : dPe ? jouKreTx(dPe) : null;
    const penJou = penDe && penA ? joursPeman(penDe, penA, JOU_KREDI, M.feries) : 0;
    const penPaJou = Math.round(pj * 0.2 * 100) / 100, penTotal = Math.round(penJou * penPaJou * 100) / 100;
    const penPeye = Number(x.penalites || 0) + tout.filter((y) => y.type_transaction === "Penalite" && (y._pending || y._local)).reduce((a, y) => a + Number(y.montant || 0), 0);
    const fb = fbs.filter((y) => y.id_compte_credit === x.id_compte_credit).sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
    const fbJodi = fb.find((y) => jouLokal(new Date(y.capture_le)) === M.today) || null;
    return { ...x, _fb: fb, _fbJodi: fbJodi, _tx: tx, _txTout: tout, _atant: atant, _rete: rete, _reta: reta, _jouReta: pj ? Math.ceil(reta / pj - 1e-9) : 0, _jodi: jodi, _peJodi: peJodi, _fini: final > 0 && paye >= final,
      _gras: gras, _penDe: penDe, _penJou: penJou, _penPaJou: penPaJou, _penTotal: penTotal, _penPeye: penPeye, _penDu: Math.max(Math.round((penTotal - penPeye) * 100) / 100, 0),
      _depaseFen: !!x.date_fin && M.today > x.date_fin && rete > 0 };
  });
}

// Lendi semèn yon dat (ISO).
export const lendiDe = (iso) => ajouteJou(iso, 1 - isoJou(iso));

// Semèn aktyèl la jou pa jou (lendi → samdi) pou yon kont.
// state: pa (pa jou peman) · ferye · peye · rate (jou peman pase san depo) · jodi (jodi a, poko peye) · avni
export function semenDots(k, feries = new Set(), today = jodi()) {
  const lendi = lendiDe(today);
  const out = [];
  for (let j = 1; j <= 6; j++) {
    const date = ajouteJou(lendi, j - 1);
    let state = "pa";
    const nanCycle = date >= (k.date_debut || "0000") && (!k.date_fin || date < k.date_fin);
    if (k.jours_paiement?.includes(j) && nanCycle) {
      if (feries.has(date)) state = "ferye";
      else if (k._joursPeye?.has(date)) state = "peye";
      else if (date < today) state = "rate";
      else if (date === today) state = "jodi";
      else state = "avni";
    } else if (k._joursPeye?.has(date)) state = "peye"; // depo yon jou ki pa t prevwa: konte l kanmenm
    out.push({ j, date, state, jodi: date === today });
  }
  return out;
}

// 13 dènye semèn yo (ansyen → aktyèl) pou yon kont.
// state: okenn (pa gen jou peman nan semèn sa a) · konple · pasyel · rate · ankou (semèn aktyèl, poko gen depo) · avni
export function heatmap13(k, feries = new Set(), today = jodi()) {
  const lendi = lendiDe(today);
  const out = [];
  for (let w = 12; w >= 0; w--) {
    const debut = ajouteJou(lendi, -7 * w), fen = ajouteJou(debut, 6);
    let prevu = 0, peye = 0;
    for (let i = 0; i < 7; i++) {
      const date = ajouteJou(debut, i);
      const j = i + 1;
      const nanCycle = date >= (k.date_debut || "0000") && (!k.date_fin || date < k.date_fin);
      if (k.jours_paiement?.includes(j) && nanCycle && !feries.has(date) && date <= today) prevu++;
      if (k._joursPeye?.has(date)) peye++;
    }
    let state = "okenn";
    if (debut > today) state = "avni";
    else if (prevu === 0 && peye === 0) state = "okenn";
    else if (peye >= prevu && prevu > 0) state = "konple";
    else if (peye > 0) state = "pasyel";
    else state = w === 0 ? "ankou" : "rate";
    out.push({ debut, fen, prevu, peye, state });
  }
  return out;
}

// Lè yon tranzaksyon (0–23) nan lè Ayiti. Dat sèvè yo (san fuseau) se lè Ayiti deja.
const fmtLè = new Intl.DateTimeFormat("en-US", { timeZone: C.FUSEAU, hour: "numeric", hourCycle: "h23" });
export function lèTx(t) {
  const s = String(t.date_transaction || "");
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(s) && s.length >= 13) return Number(s.slice(11, 13));
  return Number(fmtLè.format(new Date(s)));
}

// Kolèk pa lè pou yon lis tranzaksyon (depo sèlman): [{h, montant, n}] pou 6è → 19è.
export function kolekParLe(txs, { de = 6, a = 19 } = {}) {
  const out = [];
  for (let hh = de; hh <= a; hh++) out.push({ h: hh, montant: 0, n: 0 });
  for (const t of txs) {
    if (txKind(t) !== "depo" || t.validation_status === "rejected") continue;
    const hh = lèTx(t);
    const slot = out.find((x) => x.h === Math.min(a, Math.max(de, hh)));
    if (slot) { slot.montant += Number(t.montant || 0); slot.n++; }
  }
  return out;
}

// Kalite yon tranzaksyon: depo, retrè, frè, viman (voye oswa resevwa).
export function txKind(t) {
  if (t.type_transaction === "FL") return "fre";
  if (t.type_transaction === "D") return t.virement_from ? "viman_in" : "depo";
  if (t.type_transaction === "R") return t.virement_to ? "viman_out" : "retre";
  return "lot";
}

export const comptesDuClient = (M, id) =>
  [...M.comptes.values()].filter((k) => k.id_personne === id).sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut)));

// Distans ant kote ajan an te anrejistre fidbak la ak GPS kliyan an. Lim 300 m (menm jan ak sèvè a).
export const LIM_KONTWOL_M = 300;
export function kontwolSwivi(x, c) {
  if (x.gps_lat == null || x.gps_lng == null) return { kontwol: "san_gps_ajan", distans_m: null };
  if (c?.gps_lat == null || c?.gps_lng == null) return { kontwol: "san_gps_kliyan", distans_m: null };
  const R = 6371000, r = (v) => (v * Math.PI) / 180;
  const a = Math.sin(r(c.gps_lat - x.gps_lat) / 2) ** 2 + Math.cos(r(x.gps_lat)) * Math.cos(r(c.gps_lat)) * Math.sin(r(c.gps_lng - x.gps_lng) / 2) ** 2;
  const d = Math.round(2 * R * Math.asin(Math.sqrt(a))), prec = Number(x.gps_precision_m || 0);
  return { distans_m: d, kontwol: d - prec > LIM_KONTWOL_M ? "lwen" : prec > LIM_KONTWOL_M ? "pa_presi" : "ok" };
}
export const swiviSispèk = (x) => x.kontwol === "lwen" || x.kontwol === "san_gps_ajan";

// ---------- Kòd kreye sou telefòn nan (offline) ----------
// Menm fòm ak sèvè a: kòd kliyan = 2 inisyal + "-" + 5 karaktè; nimewo kont = kòd kliyan + "-" + 3 karaktè.
// Sèvè a itilize yo si yo lib; si se pa sa (ra anpil), li bay yon lòt e telefòn nan mete l ajou.
const ALFA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const azò = (n) => { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map((x) => ALFA[x % 36]).join(""); };
const inisyalKod = (s) => (String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().match(/[A-Z]/) || ["X"])[0];
export const kodKliyan = (prenom, nom) => `${inisyalKod(prenom)}${inisyalKod(nom)}-${azò(5)}`;
export const noKont = (kod) => (kod ? `${String(kod).toUpperCase()}-${azò(3)}` : null);

// Mete valè yon modifikasyon otorize sou kopi lokal la (anvan sèvè a voye nouvo done yo).
export function aplikeKliyan(c, chan, v) {
  for (const k of chan) {
    if (k === "gps") { if (v.gps_lat != null) { c.gps_lat = v.gps_lat; c.gps_lng = v.gps_lng; } }
    else c[k] = v[k] ?? null;
  }
  return c;
}
export function aplikeTx(t, chan, v) {
  for (const k of chan) t[k] = k === "montant" || k.startsWith("solde") ? (v[k] === "" || v[k] == null ? null : Number(v[k])) : (v[k] ?? null);
  return t;
}
