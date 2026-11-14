// Ti wrapper IndexedDB: tout done ajan an kenbe sou telefòn nan.
const DB_NAME = window.GRANDON_CONFIG?.DB || "grandon-ajan"; // prodiksyon ak tès pa pataje menm memwa
const VER = 4; // v2: demandes, suivis, feries · v3: alet · v4: modif
const STORES = {
  meta: { keyPath: "k" },
  clients: { keyPath: "id_personne" },
  comptes: { keyPath: "id_compte_epargne" },
  transactions: { keyPath: "id_transaction_epargne" },
  plans: { keyPath: "montant" },
  demandes: { keyPath: "id" },
  suivis: { keyPath: "id" },
  feries: { keyPath: "jour" },
  alet: { keyPath: "id" },
  modif: { keyPath: "id" },
  outbox: { keyPath: "seq", autoIncrement: true },
  photos: { keyPath: "id" },
};

let dbp;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const [n, o] of Object.entries(STORES)) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

const rq = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = (t) => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });

// Jenerasyon done yo: monte chak fwa yon store chanje (sof foto yo), pou S.model() konnen lè pou l rekalkile.
export let gen = 0;
const chanje = (store) => { if (store !== "photos") gen++; };
// Siyati dènye done sèvè a ekri nan chak store (oswa kle meta), kenbe nan IndexedDB menm (li siviv rechajman).
// Nenpòt lòt ekriti nan store sa a efase siyati a: senkronizasyon an ap reekri l pwochen fwa.
let siy = null;
async function siyChaje() { if (!siy) siy = (await get("meta", "sync_siy"))?.v || {}; return siy; }
async function siyEkri() { await put("meta", { k: "sync_siy", v: siy }, true); }
export async function siyGet(kle) { return (await siyChaje())[kle]; }
export async function siySet(kle, g) { await siyChaje(); siy[kle] = g; await siyEkri(); }
async function siyEfase(kle) { await siyChaje(); if (kle in siy) { delete siy[kle]; await siyEkri(); } }
async function siyTout() { siy = {}; }

export async function get(store, key) {
  const d = await open();
  return rq(d.transaction(store).objectStore(store).get(key));
}
export async function all(store) {
  const d = await open();
  return rq(d.transaction(store).objectStore(store).getAll());
}
export async function put(store, val, sanGen = false) {
  const d = await open();
  if (!sanGen) { chanje(store); await siyEfase(store === "meta" ? "m:" + val.k : store); }
  const t = d.transaction(store, "readwrite");
  const k = await rq(t.objectStore(store).put(val));
  await done(t);
  return k;
}
export async function del(store, key, sanGen = false) {
  const d = await open();
  if (!sanGen) { chanje(store); await siyEfase(store === "meta" ? "m:" + key : store); }
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).delete(key);
  await done(t);
}
export async function clear(store) {
  const d = await open();
  chanje(store);
  if (store === "meta") await siyTout(); else await siyEfase(store);
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).clear();
  await done(t);
}
// Ranplase tout liy yon store ak sa sèvè a bay.
export async function replaceAll(store, rows) {
  const d = await open();
  chanje(store);
  if (store === "meta") await siyTout(); else await siyEfase(store);
  const t = d.transaction(store, "readwrite");
  const s = t.objectStore(store);
  s.clear();
  for (const r of rows) s.put(r);
  await done(t);
}
export async function putMany(store, rows) {
  const d = await open();
  chanje(store); await siyEfase(store);
  const t = d.transaction(store, "readwrite");
  const s = t.objectStore(store);
  for (const r of rows) s.put(r);
  await done(t);
}
// Kle meta modèl la pa li (S.model): ekri yo pa fè modèl la rekalkile.
const META_SAN_GEN = new Set(["last_pull", "tx_sync", "sync_siy"]);
export async function meta(k, v) {
  if (v === undefined) return (await get("meta", k))?.v;
  if (META_SAN_GEN.has(k)) return v === null ? del("meta", k, true) : put("meta", { k, v }, true);
  if (v === null) return del("meta", k);
  return put("meta", { k, v });
}
export async function wipe() {
  for (const s of Object.keys(STORES)) await clear(s);
}
