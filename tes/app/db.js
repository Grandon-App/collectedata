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

export async function get(store, key) {
  const d = await open();
  return rq(d.transaction(store).objectStore(store).get(key));
}
export async function all(store) {
  const d = await open();
  return rq(d.transaction(store).objectStore(store).getAll());
}
export async function put(store, val) {
  const d = await open();
  const t = d.transaction(store, "readwrite");
  const k = await rq(t.objectStore(store).put(val));
  await done(t);
  return k;
}
export async function del(store, key) {
  const d = await open();
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).delete(key);
  await done(t);
}
export async function clear(store) {
  const d = await open();
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).clear();
  await done(t);
}
// Ranplase tout liy yon store ak sa sèvè a bay.
export async function replaceAll(store, rows) {
  const d = await open();
  const t = d.transaction(store, "readwrite");
  const s = t.objectStore(store);
  s.clear();
  for (const r of rows) s.put(r);
  await done(t);
}
export async function putMany(store, rows) {
  const d = await open();
  const t = d.transaction(store, "readwrite");
  const s = t.objectStore(store);
  for (const r of rows) s.put(r);
  await done(t);
}
export async function meta(k, v) {
  if (v === undefined) return (await get("meta", k))?.v;
  if (v === null) return del("meta", k);
  return put("meta", { k, v });
}
export async function wipe() {
  for (const s of Object.keys(STORES)) await clear(s);
}
