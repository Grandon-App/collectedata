// File datant (outbox) + senkronizasyon ak sèvè a.
// Chak operasyon gen yon UUID ke telefòn nan jenere; RPC yo sou sèvè a idanpotan:
// menm ID voye de fwa = menm rezilta, pa janm doublon.
import * as db from "./db.js";
import * as api from "./api.js";

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
  return `PWA Grandon · ${m ? m[1].slice(0, 60) : "navigatè"}`;
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
// Konbyen jou peman ant de dat (enklizif), dapre jou ki chwazi yo.
// Dimanch ak jou ferye yo pa konte.
export function joursPeman(debut, fin, jours, feries = new Set()) {
  if (!jours?.length || !debut || !fin || fin < debut) return 0;
  let n = 0;
  for (let d = debut; d <= fin; d = ajouteJou(d, 1)) {
    const j = isoJou(d);
    if (j !== 7 && jours.includes(j) && !feries.has(d)) n++;
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
      ...gpsArgs(p.gps), p_capture_le: p.capture_le,
    });
    const id = r.id_personne;
    if (id !== p.id) await remap(p.id, id);
    if (CHAN_FICH.some((k) => p[k])) await api.rpc("grandon_maj_client", { ...majArgs(p), p_id_personne: id });
    if (!(await db.get("clients", id)))
      await db.put("clients", { id_personne: id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, sexe: p.sexe, photo_url,
        ...Object.fromEntries(CHAN_FICH.map((k) => [k, p[k] || null])), gps_lat: p.gps?.lat ?? null, gps_lng: p.gps?.lng ?? null });
    if (p.photo_id) await db.del("photos", p.photo_id);
    return r.deja ? `${p.prenom} ${p.nom} te deja nan baz la: nou itilize dosye ki te la a.` : null;
  },

  async adopte(p) {
    await api.rpc("grandon_inscrire_client", {
      p_id: p.id, p_prenom: p.prenom || "-", p_nom: p.nom || "-", p_telephone: "00000000",
      ...gpsArgs(p.gps), p_capture_le: p.capture_le,
    });
    if (!(await db.get("clients", p.id)))
      await db.put("clients", { id_personne: p.id, prenom: p.prenom, nom: p.nom, code_client: p.code_client, photo_url: p.photo_url, tel4: p.tel4 });
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

  async suivi(p) {
    await api.rpc("grandon_suivi", { p_id: p.id, p_compte: p.compte, p_motif: p.motif, p_note: p.note || null, ...gpsArgs(p.gps), p_capture_le: p.capture_le });
    await db.put("suivis", { id: p.id, id_compte_epargne: p.compte, motif: p.motif, note: p.note || null, agent_id: api.getSession()?.user?.id, capture_le: p.capture_le });
  },

  async cycle(p) {
    const r = await api.rpc("grandon_creer_cycle", {
      p_id: p.id, p_id_personne: p.id_personne, p_duree: p.duree, p_frequence: p.frequence, p_jours: p.jours,
      p_montant: p.montant, p_date_debut: p.date_debut, ...gpsArgs(p.gps), p_capture_le: p.capture_le, p_appareil: p.appareil,
    });
    await db.put("comptes", {
      id_compte_epargne: p.id, no_compte: r.no_compte, id_personne: p.id_personne, solde_actuel: 0, montant_plan: p.montant,
      duree_mois: p.duree, frequence_semaine: p.frequence, jours_paiement: p.jours, date_debut: p.date_debut,
      date_fin: ajouteMwa(p.date_debut, p.duree), depo_an_atant: 0,
      created_by: api.getSession()?.user?.id, created_at: p.capture_le,
    });
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
          cur.status = "erè";
          cur.error = e.message;
          cur.tries++;
          await db.put("outbox", cur);
          blocked.add(cur.id);
          res.errors++;
          notify();
        }
      }
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
  const [feries, suivis, demandes] = await Promise.all([
    api.selectAll("grandon_jours_feries?select=jour,libelle&order=jour"),
    api.selectAll(`grandon_suivis?capture_le=gte.${depi2}&select=id,id_compte_epargne,motif,note,agent_id,capture_le&order=capture_le.desc`),
    api.selectAll(`grandon_demandes?or=${encodeURIComponent(`(statut.eq.en_attente,created_at.gte.${depi2})`)}&select=*&order=created_at.desc`),
  ]);
  try { // non ajan yo (manadjè yo wè tout moun; yon ajan wè sèlman pa l)
    const aj = await api.select("grandon_ajan?select=user_id,nom");
    await db.meta("ajans", Object.fromEntries(aj.map((x) => [x.user_id, x.nom])));
  } catch { /* anplwaye Bwat Sekrem: pa gen tab grandon_ajan pou yo */ }
  await db.replaceAll("feries", feries);
  await db.replaceAll("suivis", suivis);
  await db.replaceAll("demandes", demandes);
  await db.replaceAll("clients", clients);
  await db.replaceAll("comptes", comptes);
  await db.replaceAll("plans", plans);
  await db.replaceAll("transactions", txs);
  await db.meta("last_pull", new Date().toISOString());
}

// ---------- Modèl lokal: done sèvè + sa ki nan file a ----------
export const jouTx = (t) => (t._pending || t._local_date ? jouLokal(new Date(t.date_transaction)) : String(t.date_transaction).slice(0, 10));

export async function model() {
  const [clients, comptes, txs, outbox, plans, feries, suivis, demandes] = await Promise.all(
    ["clients", "comptes", "transactions", "outbox", "plans", "feries", "suivis", "demandes"].map((s) => db.all(s)));
  const M = {
    clients: new Map(clients.map((c) => [c.id_personne, { ...c }])),
    comptes: new Map(comptes.map((k) => [k.id_compte_epargne, { ...k }])),
    txs: new Map(txs.map((t) => [t.id_transaction_epargne, { ...t }])),
    plans: plans.map((p) => Number(p.montant)).sort((a, b) => a - b),
    feries: new Set(feries.map((f) => f.jour)), feriesList: feries,
    suivis: new Map(suivis.map((x) => [x.id, { ...x }])),
    demandes: new Map(demandes.map((x) => [x.id, { ...x }])),
    outbox: outbox.sort((a, b) => a.seq - b.seq),
  };
  for (const o of M.outbox) {
    const p = o.payload;
    const pend = { _pending: true, _error: o.status === "erè" ? o.error : null, _seq: o.seq };
    if (o.kind === "client")
      M.clients.set(p.id, { id_personne: p.id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, sexe: p.sexe, photo_id: p.photo_id,
        ...Object.fromEntries(CHAN_FICH.map((k) => [k, p[k] || null])), gps_lat: p.gps?.lat ?? null, gps_lng: p.gps?.lng ?? null, ...pend });
    if (o.kind === "maj" && M.clients.has(p.id)) {
      const c = M.clients.get(p.id);
      for (const k of CHAN_FICH) if (p[k]) c[k] = p[k];
      if (p.gps) { c.gps_lat = p.gps.lat; c.gps_lng = p.gps.lng; }
      c._majPending = true; if (pend._error) c._error = pend._error;
    }
    if (o.kind === "adopte" && !M.clients.has(p.id))
      M.clients.set(p.id, { id_personne: p.id, prenom: p.prenom, nom: p.nom, code_client: p.code_client, photo_url: p.photo_url, tel4: p.tel4, ...pend });
    if (o.kind === "cycle")
      M.comptes.set(p.id, {
        id_compte_epargne: p.id, no_compte: null, id_personne: p.id_personne, solde_actuel: 0, montant_plan: p.montant,
        duree_mois: p.duree, frequence_semaine: p.frequence, jours_paiement: p.jours, date_debut: p.date_debut,
        date_fin: ajouteMwa(p.date_debut, p.duree), depo_an_atant: 0, created_at: p.capture_le, created_by: "moi", ...pend });
    if (o.kind === "demande")
      M.demandes.set(p.id, { id: p.id, type: p.type, id_compte_epargne: p.compte, id_compte_dest: p.compte_dest || null, montant: p.montant,
        note: p.note, agent_id: "moi", capture_le: p.capture_le, statut: "en_attente", ...pend });
    if (o.kind === "suivi")
      M.suivis.set(p.id, { id: p.id, id_compte_epargne: p.compte, motif: p.motif, note: p.note, agent_id: "moi", capture_le: p.capture_le, ...pend });
    if (o.kind === "tx")
      M.txs.set(p.id, {
        id_transaction_epargne: p.id, id_compte_epargne: p.compte, type_transaction: p.type, montant: p.montant,
        date_transaction: p.capture_le, validation_status: null, solde_declare: p.solde_declare, solde_avant_declare: p.solde_avant_declare,
        type_frais: p.type_frais, note: p.note, created_by: "moi", ...pend });
  }
  const today = jodi();
  for (const k of M.comptes.values()) Object.assign(k, { _txs: [], _local: 0, _jodi: 0, _depots: 0, _nDepots: 0, _joursPeye: new Set(), _suivis: [], _demandes: [] });
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
    }
  }
  for (const x of M.suivis.values()) M.comptes.get(x.id_compte_epargne)?._suivis.push(x);
  for (const x of M.demandes.values()) M.comptes.get(x.id_compte_epargne)?._demandes.push(x);
  for (const k of M.comptes.values()) {
    k._txs.sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)));
    k._suivis.sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
    k._demandes.sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
    k._actif = !k.date_fin || k.date_fin >= today;
    k._jodiPeman = k._actif && !!k.jours_paiement?.includes(isoJou(today)) && k.date_debut <= today && isoJou(today) !== 7 && !M.feries.has(today);
    const finCycle = k.date_fin ? ajouteJou(k.date_fin, -1) : null;
    k._prevu = joursPeman(k.date_debut, finCycle && today > finCycle ? finCycle : today, k.jours_paiement, M.feries);
    k._prevuTotal = finCycle ? joursPeman(k.date_debut, finCycle, k.jours_paiement, M.feries) : null;
    k._totalPrevu = k._prevuTotal != null && k.montant_plan ? k._prevuTotal * Number(k.montant_plan) : null;
    // Balans sistèm nan: sèvè a voye l pou manadjè yo sèlman (null pou ajan yo).
    k._solde = k.solde_actuel == null ? null : Number(k.solde_actuel) + Number(k.depo_an_atant || 0) + k._local;
  }
  return M;
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
