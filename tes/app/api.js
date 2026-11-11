// Apèl Supabase (Auth, PostgREST, Storage) ak fetch sèlman, san bibliyotèk.
import * as db from "./db.js";

const C = window.GRANDON_CONFIG;

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, retry = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retry = retry; // true = pwoblèm rezo/sèvè: eseye ankò pita
  }
}

let session = null;
export const getSession = () => session;
export async function loadSession() {
  session = (await db.meta("session")) || null;
  return session;
}
async function saveSession(s) {
  session = s;
  await db.meta("session", s);
}
export async function clearSession() {
  session = null;
  await db.meta("session", null);
}

// Idantite aparèy la (pèsistan): sèvè a aksepte yon sèl aparèy aktif pa ajan.
const KLE_APAREY = "grandon-aparey";
let aparey = null;
export function apareyId() {
  if (aparey) return aparey;
  try { aparey = localStorage.getItem(KLE_APAREY); } catch {}
  if (!aparey || !/^[0-9a-zA-Z-]{8,64}$/.test(aparey)) {
    aparey = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    try { localStorage.setItem(KLE_APAREY, aparey); } catch {}
  }
  return aparey;
}
export function apareyNon() {
  const u = navigator.userAgent || "";
  const os = /Android/i.test(u) ? "Android" : /iPhone|iPad|iPod/i.test(u) ? "iPhone" : /Windows/i.test(u) ? "Windows" : /Mac OS/i.test(u) ? "Mac" : /Linux/i.test(u) ? "Linux" : "Aparèy";
  const m = u.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build|\))/i);
  const nav = /Edg\//.test(u) ? "Edge" : /SamsungBrowser/.test(u) ? "Samsung" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "";
  return [os, m && m[1] !== "K" ? m[1].trim() : "", nav].filter(Boolean).join(" · ").slice(0, 80);
}

export function telefon8(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("509")) d = d.slice(3);
  return /^\d{8}$/.test(d) ? d : null;
}

async function raw(path, { method = "GET", body, headers = {}, auth = true, blob } = {}) {
  const h = { apikey: C.SUPABASE_KEY, "x-client-info": `pwa aparey=${apareyId()} sevis=${C.SEVIS || "grandon"}`, ...headers };
  if (auth) {
    await ensureFresh();
    h.Authorization = `Bearer ${session.access_token}`;
  }
  if (body !== undefined) h["Content-Type"] = "application/json";
  let r;
  try {
    r = await fetch(C.SUPABASE_URL + path, {
      method, headers: h, body: blob ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError("Pa gen koneksyon entènèt.", { retry: true });
  }
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg = data?.["erè"] || data?.message || data?.msg || data?.error_description || data?.error || `Erè ${r.status}`;
    const retry = r.status >= 500 || r.status === 408 || r.status === 429;
    throw new ApiError(msg, { status: r.status, code: data?.code ?? data?.statusCode ?? null, retry });
  }
  return { data, headers: r.headers };
}

function fromAuth(d) {
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    user: { id: d.user.id, email: d.user.email },
  };
}

// Ajan an tape telefòn li (8 chif). Yon administratè ka tape imèl li.
export function idanEmail(ident) {
  const s = String(ident || "").trim();
  if (s.includes("@")) return /^[^@\s]+@[^@\s]+$/.test(s) ? s.toLowerCase() : null;
  const t = telefon8(s);
  return t ? `509${t}@${C.DOMEN_AJAN}` : null;
}

export async function login(ident, password) {
  const email = idanEmail(ident);
  if (!email) throw new ApiError("Mete nimewo telefòn ou (8 chif).");
  try {
    const { data } = await raw("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password }, auth: false });
    const s = fromAuth(data);
    await saveSession(s);
    return s;
  } catch (err) {
    if (err.status === 400) throw new ApiError("Telefòn oswa modpas la pa bon.", { status: 400 });
    throw err;
  }
}

// Chanje pwòp modpas mwen. `ansyen` null = chanjman obligatwa touswit apre koneksyon (modpas tanporè).
export async function chanjeModpas(ansyen, nouvo) {
  if (String(nouvo || "").length < 8) throw new ApiError("Modpas la dwe gen omwen 8 karaktè.");
  if (ansyen != null) {
    if (ansyen === nouvo) throw new ApiError("Nouvo modpas la dwe diferan de ansyen an.");
    try {
      const { data } = await raw("/auth/v1/token?grant_type=password", { method: "POST", body: { email: session.user.email, password: ansyen }, auth: false });
      await saveSession(fromAuth(data));
    } catch (e) {
      if (e.status === 400) throw new ApiError("Ansyen modpas la pa bon.", { status: 400 });
      throw e;
    }
  }
  try {
    await raw("/auth/v1/user", { method: "PUT", body: { password: nouvo } });
  } catch (e) {
    if (e.status === 422 && /different/i.test(e.message)) throw new ApiError("Nouvo modpas la dwe diferan de ansyen an.", { status: 422 });
    if (e.status === 422) throw new ApiError("Modpas sa a twò fasil. Chwazi yon lòt.", { status: 422 });
    throw e;
  }
  await rpc("grandon_modpas_chanje", {});
}

// Edge function grandon-kont (jesyon kont ajan, admin sèlman)
export async function kont(body) {
  return (await raw("/functions/v1/grandon-kont", { method: "POST", body })).data;
}

let refreshing = null;
async function ensureFresh() {
  if (!session) throw new ApiError("Ou pa konekte.", { code: "SESSION" });
  if (session.expired) throw new ApiError("Sesyon w fini. Konekte ankò pou senkronize.", { code: "SESSION" });
  if (session.expires_at - 60 > Date.now() / 1000) return;
  refreshing ||= (async () => {
    try {
      const { data } = await raw("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: { refresh_token: session.refresh_token }, auth: false,
      });
      await saveSession(fromAuth(data));
    } catch (e) {
      if (!e.retry && e.status >= 400 && e.status < 500) {
        // Sesyon an fini: fòk ajan an konekte ankò (done lokal yo rete).
        session = { ...session, expired: true };
        await db.meta("session", session);
        throw new ApiError("Sesyon w fini. Konekte ankò pou senkronize.", { code: "SESSION" });
      }
      throw e;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function select(path) {
  return (await raw(`/rest/v1/${path}`)).data;
}
// Pran tout liy yo, paj pa paj (PostgREST limite a 1000).
export async function selectAll(path, size = 1000) {
  const out = [];
  for (let from = 0; ; from += size) {
    const { data } = await raw(`/rest/v1/${path}`, { headers: { Range: `${from}-${from + size - 1}`, "Range-Unit": "items" } });
    out.push(...data);
    if (data.length < size) return out;
  }
}
export async function rpc(name, args) {
  return (await raw(`/rest/v1/rpc/${name}`, { method: "POST", body: args })).data;
}
export async function insertRow(table, row) {
  await raw(`/rest/v1/${table}`, { method: "POST", body: row, headers: { Prefer: "return=minimal" } });
}
export async function deleteRows(path) {
  await raw(`/rest/v1/${path}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
export const rechercher = (q) => rpc("grandon_rechercher", { p_q: q });
export const rechercherGps = (lat, lng, rayon = 300) => rpc("grandon_rechercher_gps", { p_lat: lat, p_lng: lng, p_rayon_m: rayon });
export const publicUrl = (path) => `${C.SUPABASE_URL}/storage/v1/object/public/${C.BUCKET_FOTO}/${path}`;
export async function upload(path, blob) {
  try {
    await raw(`/storage/v1/object/${C.BUCKET_FOTO}/${path}`, {
      method: "POST", blob, headers: { "Content-Type": blob.type || "image/jpeg" },
    });
  } catch (e) {
    // Foto a te deja monte (yon premye esè ki te koupe): sa bon.
    if (e.status === 409 || /exist|duplicate/i.test(e.message)) return;
    throw e;
  }
}
