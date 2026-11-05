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
export function joursPeman(debut, fin, jours) {
  if (!jours?.length || !debut || !fin || fin < debut) return 0;
  let n = 0;
  for (let d = debut; d <= fin; d = ajouteJou(d, 1)) if (jours.includes(isoJou(d))) n++;
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
      p_id: p.id, p_prenom: p.prenom, p_nom: p.nom, p_telephone: p.telephone, p_nif: p.nif || null,
      p_sexe: p.sexe || null, p_adresse: p.adresse || null, p_activite: p.activite || null, p_photo_url: photo_url,
      ...gpsArgs(p.gps), p_capture_le: p.capture_le,
    });
    const id = r.id_personne;
    if (id !== p.id) await remap(p.id, id);
    if (!(await db.get("clients", id)))
      await db.put("clients", { id_personne: id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, activite: p.activite, adresse: p.adresse, photo_url });
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
    });
    await db.put("transactions", {
      id_transaction_epargne: p.id, id_compte_epargne: p.compte, type_transaction: p.type, montant: p.montant,
      date_transaction: p.capture_le, validation_status: r.statut, solde_apres_transactions: r.solde_apres,
      created_by: api.getSession()?.user?.id, solde_declare: p.solde_declare ?? null, _local_date: true,
    });
    const k = await db.get("comptes", p.compte);
    if (k) {
      if (r.statut === "pending") k.depo_an_atant = Number(k.depo_an_atant || 0) + Number(p.montant);
      else k.solde_actuel = Number(r.solde_apres);
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
    api.selectAll("grandon_v_clients?select=id_personne,prenom,nom,telephone,code_client,activite,adresse,photo_url&order=prenom"),
    api.selectAll("grandon_v_comptes?select=*&order=date_debut.desc"),
    api.selectAll("grandon_plans?actif=is.true&select=montant&order=montant"),
    api.selectAll(`grandon_v_transactions?date_transaction=gte.${depi}&select=id_transaction_epargne,id_compte_epargne,type_transaction,montant,date_transaction,validation_status,solde_apres_transactions,created_by,solde_declare&order=date_transaction`),
  ]);
  await db.replaceAll("clients", clients);
  await db.replaceAll("comptes", comptes);
  await db.replaceAll("plans", plans);
  await db.replaceAll("transactions", txs);
  await db.meta("last_pull", new Date().toISOString());
}

// ---------- Modèl lokal: done sèvè + sa ki nan file a ----------
export const jouTx = (t) => (t._pending || t._local_date ? jouLokal(new Date(t.date_transaction)) : String(t.date_transaction).slice(0, 10));

export async function model() {
  const [clients, comptes, txs, outbox, plans] = await Promise.all(
    ["clients", "comptes", "transactions", "outbox", "plans"].map((s) => db.all(s)));
  const M = {
    clients: new Map(clients.map((c) => [c.id_personne, { ...c }])),
    comptes: new Map(comptes.map((k) => [k.id_compte_epargne, { ...k }])),
    txs: new Map(txs.map((t) => [t.id_transaction_epargne, { ...t }])),
    plans: plans.map((p) => Number(p.montant)).sort((a, b) => a - b),
    outbox: outbox.sort((a, b) => a.seq - b.seq),
  };
  for (const o of M.outbox) {
    const p = o.payload;
    const pend = { _pending: true, _error: o.status === "erè" ? o.error : null, _seq: o.seq };
    if (o.kind === "client")
      M.clients.set(p.id, { id_personne: p.id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, activite: p.activite, adresse: p.adresse, photo_id: p.photo_id, ...pend });
    if (o.kind === "adopte" && !M.clients.has(p.id))
      M.clients.set(p.id, { id_personne: p.id, prenom: p.prenom, nom: p.nom, code_client: p.code_client, photo_url: p.photo_url, tel4: p.tel4, ...pend });
    if (o.kind === "cycle")
      M.comptes.set(p.id, {
        id_compte_epargne: p.id, no_compte: null, id_personne: p.id_personne, solde_actuel: 0, montant_plan: p.montant,
        duree_mois: p.duree, frequence_semaine: p.frequence, jours_paiement: p.jours, date_debut: p.date_debut,
        date_fin: ajouteMwa(p.date_debut, p.duree), depo_an_atant: 0, created_at: p.capture_le, created_by: "moi", ...pend });
    if (o.kind === "tx")
      M.txs.set(p.id, {
        id_transaction_epargne: p.id, id_compte_epargne: p.compte, type_transaction: p.type, montant: p.montant,
        date_transaction: p.capture_le, validation_status: null, solde_declare: p.solde_declare, note: p.note, created_by: "moi", ...pend });
  }
  const today = jodi();
  for (const k of M.comptes.values()) Object.assign(k, { _txs: [], _local: 0, _jodi: 0, _joursPeye: new Set() });
  for (const t of M.txs.values()) {
    const k = M.comptes.get(t.id_compte_epargne);
    if (!k) continue;
    k._txs.push(t);
    const m = Number(t.montant) * (t.type_transaction === "D" ? 1 : -1);
    if (t._pending) k._local += m;
    if (t.type_transaction === "D" && t.validation_status !== "rejected") {
      const j = jouTx(t);
      k._joursPeye.add(j);
      if (j === today) k._jodi += Number(t.montant);
    }
  }
  for (const k of M.comptes.values()) {
    k._txs.sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)));
    k._actif = !k.date_fin || k.date_fin >= today;
    k._jodiPeman = k._actif && !!k.jours_paiement?.includes(isoJou(today)) && k.date_debut <= today;
    k._prevu = joursPeman(k.date_debut, today < k.date_fin ? today : k.date_fin, k.jours_paiement);
    k._total = Number(k.solde_actuel || 0) + Number(k.depo_an_atant || 0) + k._local; // sa kliyan an mete
  }
  return M;
}

export const comptesDuClient = (M, id) =>
  [...M.comptes.values()].filter((k) => k.id_personne === id).sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut)));
