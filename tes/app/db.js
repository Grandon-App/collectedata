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
export const genSt = {}; // jenerasyon pa store (pou sync.js konnen si yon store chanje depi dènye fwa li ekri l)
const chanje = (store) => { if (store !== "photos") gen++; genSt[store] = (genSt[store] || 0) + 1; };

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
  if (!sanGen) chanje(store);
  const t = d.transaction(store, "readwrite");
  const k = await rq(t.objectStore(store).put(val));
  await done(t);
  return k;
}
export async function del(store, key, sanGen = false) {
  const d = await open();
  if (!sanGen) chanje(store);
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).delete(key);
  await done(t);
}
export async function clear(store) {
  const d = await open();
  chanje(store);
  if (store === "meta") genMetaTout++;
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).clear();
  await done(t);
}
// Ranplase tout liy yon store ak sa sèvè a bay.
export async function replaceAll(store, rows) {
  const d = await open();
  chanje(store);
  if (store === "meta") genMetaTout++;
  const t = d.transaction(store, "readwrite");
  const s = t.objectStore(store);
  s.clear();
  for (const r of rows) s.put(r);
  await done(t);
}
export async function putMany(store, rows) {
  const d = await open();
  chanje(store);
  const t = d.transaction(store, "readwrite");
  const s = t.objectStore(store);
  for (const r of rows) s.put(r);
  await done(t);
}
// Kle meta modèl la pa li (S.model): ekri yo pa fè modèl la rekalkile.
const META_SAN_GEN = new Set(["last_pull", "tx_sync"]);
export const genMeta = {};
export let genMetaTout = 0; // monte lè tout store meta a efase (wipe / clear)
export async function meta(k, v) {
  if (v === undefined) return (await get("meta", k))?.v;
  if (META_SAN_GEN.has(k)) return v === null ? del("meta", k, true) : put("meta", { k, v }, true);
  genMeta[k] = (genMeta[k] || 0) + 1;
  if (v === null) return del("meta", k);
  return put("meta", { k, v });
}
export async function wipe() {
  for (const s of Object.keys(STORES)) await clear(s);
}
