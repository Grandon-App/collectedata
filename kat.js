// Onglè «Kat»: kliyan yo sou yon kat (koulè pa ajan), pakou optimize jodi a, ak trajè ajan yo (manadjè).
// Leaflet nan vendor/ (mache offline); mozayik kat yo soti nan OpenStreetMap epi service worker la kenbe sa ki deja wè.
import { t } from "./i18n.js";
import { h, d, gd, non, lèKout, ICO } from "./fmt.js";
import * as api from "./api.js";
import * as db from "./db.js";

// ---------- Leaflet ----------
let lp = null;
export function chajeLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (lp) return lp;
  lp = new Promise((res, rej) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = "vendor/leaflet/leaflet.js";
    s.onload = () => res(window.L); s.onerror = () => { lp = null; rej(new Error("Leaflet")); };
    document.head.appendChild(s);
  });
  return lp;
}

// ---------- Koulè ajan yo ----------
export const PALET = ["#2563eb", "#d97706", "#059669", "#db2777", "#7c3aed", "#0891b2", "#dc2626", "#65a30d", "#c026d3", "#ea580c", "#0d9488", "#4f46e5"];
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// Chak ajan resevwa yon koulè ki rete menm jan (hash idantifyan l), san de ajan pa gen menm koulè (si gen mwens pase 12).
export function kouleAjan(ids) {
  const m = new Map(), pri = new Set();
  for (const id of [...new Set(ids)].filter(Boolean).sort()) {
    let i = hash(id) % PALET.length, n = 0;
    while (pri.has(i) && n++ < PALET.length) i = (i + 1) % PALET.length;
    pri.add(i); m.set(id, PALET[i]);
  }
  return m;
}
const GRI = "#64748b";

// ---------- Distans ak pakou ----------
export function km(a, b) {
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const longè = (chemen) => chemen.slice(1).reduce((s, p, i) => s + km(chemen[i], p), 0);
// Pi pre an premye (nearest neighbour), epi 2-opt pou retire kwazman yo. Kòmanse nan `depa` (pozisyon ajan an).
export function pakou(depa, pts) {
  const rest = [...pts], lòd = [];
  let kote = depa;
  while (rest.length) {
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const x = km(kote, p); if (x < bd) { bd = x; bi = i; } });
    kote = rest.splice(bi, 1)[0]; lòd.push(kote);
  }
  let amelyore = true, tou = 0;
  while (amelyore && tou++ < 50) {
    amelyore = false;
    for (let i = 0; i < lòd.length - 1; i++) for (let j = i + 1; j < lòd.length; j++) {
      const a = i === 0 ? depa : lòd[i - 1], b = lòd[i], c = lòd[j], e = lòd[j + 1];
      const avan = km(a, b) + (e ? km(c, e) : 0), apre = km(a, c) + (e ? km(b, e) : 0);
      if (apre + 1e-9 < avan) { lòd.splice(i, j - i + 1, ...lòd.slice(i, j + 1).reverse()); amelyore = true; }
    }
  }
  return { lòd, km: longè([depa, ...lòd]) };
}
const kmTxt = (x) => (x < 1 ? `${Math.round(x * 1000)} m` : `${x.toFixed(1).replace(".", ",")} km`);

// ---------- Eta paj la ----------
let kong = "kliyan", filtAjan = "tout", ak_reta = true, jouTraje = null, kat = null;
const KIND = { depo: "Depo", fre: "Frè", tx: "Tranzaksyon", fidbak: "Fidbak", demann: "Demann", kliyan: "Nouvo kliyan", cycle: "Nouvo cycle" };

// Pwopriyetè yon kliyan = ajan ki kreye dènye kont Grandon li (oswa ki enskri l).
function ajanKliyan(M, id) {
  const ks = [...M.comptes.values()].filter((k) => k.id_personne === id).sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut)));
  return ks[0]?.created_by || M.clients.get(id)?.agent_id || null;
}

export async function viewKat({ $app, M, man, moi, ajans, getGps, toast }) {
  if (kong === "traje" && !man) kong = "kliyan";
  const mwen = (id) => id === moi?.id || id === "moi";
  const idAjan = (id) => (id === "moi" ? moi?.id : id);
  const nonAjan = (id) => (mwen(id) ? t("Kliyan mwen") : ajans[id] || t("Lòt ajan"));
  const kliyan = [...M.clients.values()].map((c) => ({ c, a: idAjan(ajanKliyan(M, c.id_personne)) }));
  const koule = kouleAjan([...kliyan.map((x) => x.a), ...Object.keys(ajans), moi?.id]);
  const kl = (a) => koule.get(a) || GRI;
  const ongs = [["kliyan", "Kliyan yo"], ["pakou", "Pakou jodi a"], ...(man ? [["traje", "Trajè ajan yo"]] : [])];
  $app.innerHTML = `<div id="kat-p">
    <div class="page-head"><h1>Kat</h1></div>
    <div class="tabs" role="tablist">${ongs.map(([k, l]) => `<button type="button" role="tab" class="tab ${k === kong ? "on" : ""}" aria-selected="${k === kong}" data-kong="${k}">${l}</button>`).join("")}</div>
    <div id="kat-ctl"></div>
    <div id="kat" class="kat" role="region" aria-label="${t("Kat")}"></div>
    <div id="kat-lis"></div></div>`;
  $app.querySelectorAll("[data-kong]").forEach((b) => (b.onclick = () => { kong = b.dataset.kong; viewKat({ $app, M, man, moi, ajans, getGps, toast }); }));
  const ctl = document.getElementById("kat-ctl"), lis = document.getElementById("kat-lis");
  const chipsAjan = (ids, kantite = () => "") => `<div class="chips filt kat-aj" role="group" aria-label="${t("Ajan")}">
    <button type="button" class="chip ${filtAjan === "tout" ? "on" : ""}" data-faj="tout" aria-pressed="${filtAjan === "tout"}">${t("Tout")}</button>
    ${ids.map((a) => `<button type="button" class="chip ${filtAjan === a ? "on" : ""}" data-faj="${h(a || "")}" aria-pressed="${filtAjan === a}"><i class="kat-dot" style="background:${kl(a)}"></i><span data-brut>${h(a ? nonAjan(a) : t("San ajan"))}</span>${kantite(a)}</button>`).join("")}</div>`;
  const brancheChips = () => ctl.querySelectorAll("[data-faj]").forEach((b) => (b.onclick = () => { filtAjan = b.dataset.faj || null; viewKat({ $app, M, man, moi, ajans, getGps, toast }); }));

  let Lf;
  try { Lf = await chajeLeaflet(); } catch { Lf = null; }
  if (kat) { try { kat.off(); kat.remove(); } catch { /* */ } kat = null; }
  const el = document.getElementById("kat");
  if (!el) return;
  if (Lf) {
    kat = Lf.map(el, { zoomControl: true, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([18.54, -72.34], 12);
    Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(kat);
    // Pozisyon ajan an: pwen ble ki bat (pulse) + sèk presizyon. Bouton «Kote m ye» santre kat la sou li.
    const m = kat;
    let pwen = null, sèk = null;
    const montreMwen = async (santre) => {
      const btn = el.querySelector(".kat-loc"); btn?.classList.add("ap");
      const p = await getGps(santre ? 15000 : 8000, { fre: santre });
      btn?.classList.remove("ap");
      if (m !== kat) return;
      if (!p) { if (santre) toast(t("Pa ka jwenn pozisyon ou. Aktive GPS la epi bay aplikasyon an pèmisyon."), "err", 5000); return; }
      pwen?.remove(); sèk?.remove();
      sèk = Lf.circle([p.lat, p.lng], { radius: p.acc || 30, color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.12, interactive: false }).addTo(m);
      pwen = Lf.marker([p.lat, p.lng], { icon: Lf.divIcon({ className: "kat-mwen", html: "<i></i>", iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000, keyboard: false })
        .bindPopup(`${t("Ou la")}${p.acc ? ` · ±${p.acc} m` : ""}${p.acc > 100 ? `<br>${t("Pozisyon apwoksimatif: aparèy sa a pa gen GPS presi.")}` : ""}`).addTo(m);
      if (santre && p.acc > 100) toast(`±${p.acc} m — ${t("Pozisyon apwoksimatif: aparèy sa a pa gen GPS presi.")}`, "info", 6000);
      if (santre) { if ((p.acc || 0) > 150) m.fitBounds(sèk.getBounds(), { animate: false, padding: [20, 20] }); else m.setView([p.lat, p.lng], Math.max(m.getZoom(), 16), { animate: false }); }
    };
    const Loc = Lf.Control.extend({ options: { position: "topleft" }, onAdd() {
      const b = Lf.DomUtil.create("button", "kat-loc");
      b.type = "button"; b.title = t("Kote m ye"); b.setAttribute("aria-label", t("Kote m ye"));
      b.innerHTML = ICO.gps;
      Lf.DomEvent.disableClickPropagation(b);
      b.onclick = () => montreMwen(true);
      return b;
    } });
    new Loc().addTo(kat);
    if (kong !== "pakou") montreMwen(false); // pakou a deja mande pozisyon an
  } else el.innerHTML = `<p class="empty">${t("Kat la pa ka chaje.")}</p>`;
  const limit = [];
  const mak = (lat, lng, koul, html, { nimewo = null, gwo = false } = {}) => {
    if (!kat) return;
    limit.push([lat, lng]);
    const m = nimewo != null
      ? Lf.marker([lat, lng], { icon: Lf.divIcon({ className: "kat-n", html: `<span style="background:${koul}">${nimewo}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      : Lf.circleMarker([lat, lng], { radius: gwo ? 9 : 7, color: "#fff", weight: 2, fillColor: koul, fillOpacity: 0.95 });
    m.bindPopup(html).addTo(kat);
  };
  const fini = () => { const m = kat; if (m && limit.length) m.fitBounds(limit, { padding: [30, 30], maxZoom: 16, animate: false }); setTimeout(() => { if (m && m === kat && m.getContainer().isConnected) m.invalidateSize(false); }, 60); };

  // ---------- 1. Kliyan yo ----------
  if (kong === "kliyan") {
    const ak = kliyan.filter((x) => x.c.gps_lat != null && x.c.gps_lng != null);
    const ids = [...new Set(kliyan.map((x) => x.a))].sort((a, b) => nonAjan(a).localeCompare(nonAjan(b)));
    if (filtAjan !== "tout" && !ids.includes(filtAjan)) filtAjan = "tout";
    const vizib = ak.filter((x) => filtAjan === "tout" || x.a === filtAjan);
    ctl.innerHTML = chipsAjan(ids, (a) => `<small>${ak.filter((x) => x.a === a).length}</small>`); // kantite sou kat la (ak GPS)
    brancheChips();
    for (const { c, a } of vizib) {
      const ks = [...M.comptes.values()].filter((k) => k.id_personne === c.id_personne && k._actif);
      const dwe = ks.reduce((s, k) => s + (k._aRekipere || 0), 0);
      mak(c.gps_lat, c.gps_lng, kl(a), `<b data-brut>${h(non(c))}</b><br><span data-brut>${h(c.code_client || "")}</span> · ${h(nonAjan(a))}
        ${ks.length ? `<br>${ks.length} ${t("cycle aktif")}` : ""}${dwe ? `<br><b style="color:#b42318">${gd(dwe)} ${t("pou rekipere")}</b>` : ""}
        <br><a href="#/kliyan/${h(c.id_personne)}">${t("Louvri fich la")} →</a>`);
    }
    const san = kliyan.filter((x) => (filtAjan === "tout" || x.a === filtAjan) && (x.c.gps_lat == null || x.c.gps_lng == null));
    lis.innerHTML = `${!vizib.length && san.length ? `<p class="note warn">${t("Kliyan sa yo pa gen pozisyon GPS, se poutèt sa yo pa parèt sou kat la. Louvri fich yo → Modifye pou anrejistre GPS la.")}</p>` : ""}<p class="mut sm kat-r"><b>${vizib.length}</b> ${t("kliyan sou kat la")}${san.length ? ` · ${san.length} ${t("kliyan san GPS")}` : ""}</p>
      ${san.length ? `<details class="kat-san"><summary>${t("Kliyan san GPS")} (${san.length})</summary><div class="list">${san.map(({ c }) => `<a class="row" href="#/kliyan/${h(c.id_personne)}"><div class="grow"><b>${d(non(c))}</b><div class="mut sm">${d(c.code_client || "")}</div></div></a>`).join("")}</div></details>` : ""}`;
    fini();
    return;
  }

  // ---------- 2. Pakou optimize jodi a ----------
  if (kong === "pakou") {
    const pòtfèy = (k) => (man ? filtAjan === "tout" || idAjan(k.created_by) === filtAjan : !k.created_by || mwen(k.created_by));
    const ids = man ? [...new Set([...M.comptes.values()].filter((k) => k._actif).map((k) => idAjan(k.created_by)))].sort((a, b) => nonAjan(a).localeCompare(nonAjan(b))) : [];
    if (man && filtAjan !== "tout" && !ids.includes(filtAjan)) filtAjan = "tout";
    const vize = [...M.comptes.values()].filter((k) => k._actif && pòtfèy(k)
      && ((k._jodiPeman && k._jodi < Number(k.montant_plan || 0)) || (ak_reta && k._aRekipere > 0)));
    const parKliyan = new Map();
    for (const k of vize) { const c = M.clients.get(k.id_personne); if (!c) continue; const x = parKliyan.get(c.id_personne) || { c, ks: [] }; x.ks.push(k); parKliyan.set(c.id_personne, x); }
    const pts = [...parKliyan.values()].filter((x) => x.c.gps_lat != null && x.c.gps_lng != null).map((x) => ({ ...x, lat: x.c.gps_lat, lng: x.c.gps_lng }));
    const san = [...parKliyan.values()].filter((x) => x.c.gps_lat == null || x.c.gps_lng == null);
    ctl.innerHTML = `${man ? chipsAjan(ids) : ""}
      <label class="kat-chk"><input type="checkbox" id="kat-reta" ${ak_reta ? "checked" : ""}> ${t("Mete kliyan an reta yo tou")}</label>`;
    if (man) brancheChips();
    document.getElementById("kat-reta").onchange = (e) => { ak_reta = e.target.checked; viewKat({ $app, M, man, moi, ajans, getGps, toast }); };
    lis.innerHTML = `<p class="mut sm kat-r">${t("Ap chèche pozisyon ou…")}</p>`;
    if (!pts.length) {
      lis.innerHTML = `<p class="empty">${parKliyan.size ? t("Kliyan sa yo pa gen GPS.") : t("Pa gen kliyan pou wè jodi a.")}</p>${san.length ? liSan(san) : ""}`;
      fini(); return;
    }
    const pòz = await getGps(6000);
    const depa = pòz ? { lat: pòz.lat, lng: pòz.lng, mwen: true } : { lat: pts[0].lat, lng: pts[0].lng, mwen: false };
    const r = pakou(depa, pts);
    if (kat) {
      if (depa.mwen) { limit.push([depa.lat, depa.lng]); Lf.marker([depa.lat, depa.lng], { icon: Lf.divIcon({ className: "kat-mwen", html: "<i></i>", iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000 }).bindPopup(t("Ou la")).addTo(kat); }
      Lf.polyline([[depa.lat, depa.lng], ...r.lòd.map((p) => [p.lat, p.lng])], { color: "#2563eb", weight: 4, opacity: 0.8, dashArray: "8 6" }).addTo(kat);
    }
    r.lòd.forEach((p, i) => {
      const dwe = p.ks.reduce((s, k) => s + Math.max(k._aRekipere || 0, k._jodiPeman ? Math.max(0, Number(k.montant_plan || 0) - k._jodi) : 0), 0);
      mak(p.lat, p.lng, kl(idAjan(p.ks[0].created_by)), `<b>${i + 1}. <span data-brut>${h(non(p.c))}</span></b><br>${gd(dwe)} ${t("pou kolekte")}<br><a href="#/tx/nouvo/${h(p.ks[0].id_compte_epargne)}">${t("Depo")} →</a>`, { nimewo: i + 1 });
    });
    const maps = (() => {
      const l = r.lòd.slice(0, 10), dest = l[l.length - 1];
      const way = l.slice(0, -1).map((p) => `${p.lat},${p.lng}`).join("|");
      return `https://www.google.com/maps/dir/?api=1${depa.mwen ? `&origin=${depa.lat},${depa.lng}` : ""}&destination=${dest.lat},${dest.lng}${way ? `&waypoints=${encodeURIComponent(way)}` : ""}&travelmode=driving`;
    })();
    let prev = depa;
    lis.innerHTML = `<div class="kat-rez"><div><b>${r.lòd.length}</b> ${t("kliyan")} · <b>${kmTxt(r.km)}</b> ${t("an liy dwat")} · ~${Math.max(1, Math.round((r.km / 20) * 60 + r.lòd.length * 6))} min</div>
      <a class="btn sm" href="${h(maps)}" target="_blank" rel="noopener">${ICO.kat}<span>${t("Louvri nan Google Maps")}</span></a></div>
      ${depa.mwen ? "" : `<p class="note warn">${t("GPS telefòn nan pa disponib: pakou a kòmanse nan premye kliyan an.")}</p>`}
      <ol class="list kat-ol">${r.lòd.map((p, i) => {
        const x = km(prev, p); prev = p;
        const k = p.ks[0];
        const tèks = p.ks.map((kk) => (kk._jodiPeman && kk._jodi < Number(kk.montant_plan || 0) ? t("Peman jodi a") : "") || (kk._aRekipere > 0 ? `${gd(kk._aRekipere)} ${t("pou rekipere")}` : "")).filter(Boolean).join(" · ");
        return `<li class="row"><span class="kat-num" style="background:${kl(idAjan(k.created_by))}">${i + 1}</span><a class="grow" href="#/tx/nouvo/${h(k.id_compte_epargne)}"><b>${d(non(p.c))}</b><div class="mut sm">${d(k.no_compte || "")} · ${tèks}</div></a><span class="mut sm kat-km">+${kmTxt(x)}</span></li>`;
      }).join("")}</ol>${san.length ? liSan(san) : ""}`;
    fini();
    return;
  }

  // ---------- 3. Trajè ajan yo (manadjè) ----------
  const jodi = M.today;
  jouTraje ||= jodi;
  ctl.innerHTML = `<div class="kat-dat"><label>${t("Jou")} <input type="date" id="kat-jou" value="${h(jouTraje)}" max="${h(jodi)}"></label></div><div id="kat-aj"></div>`;
  document.getElementById("kat-jou").onchange = (e) => { jouTraje = e.target.value || jodi; viewKat({ $app, M, man, moi, ajans, getGps, toast }); };
  lis.innerHTML = `<p class="mut sm kat-r">${t("Ap chaje trajè yo…")}</p>`;
  let pts = null, offline = false;
  try {
    pts = await api.rpc("grandon_traje", { p_jou: jouTraje });
    await db.meta(`traje-${jouTraje}`, pts);
  } catch {
    pts = await db.meta(`traje-${jouTraje}`); offline = true;
  }
  if (!document.getElementById("kat-lis")) return;
  if (!pts) { lis.innerHTML = `<p class="note warn">${t("Fòk ou gen entènèt pou wè trajè jou sa a.")}</p>`; fini(); return; }
  const parAjan = new Map();
  for (const p of pts) { const l = parAjan.get(p.agent_id) || []; l.push(p); parAjan.set(p.agent_id, l); }
  const ids = [...parAjan.keys()].sort((a, b) => nonAjan(a).localeCompare(nonAjan(b)));
  if (filtAjan !== "tout" && !ids.includes(filtAjan)) filtAjan = "tout";
  document.getElementById("kat-aj").innerHTML = ids.length > 1 ? chipsAjan(ids, (a) => `<small>${parAjan.get(a).length}</small>`) : "";
  brancheChips();
  const vizib = ids.filter((a) => filtAjan === "tout" || a === filtAjan);
  const rez = vizib.map((a) => {
    const l = parAjan.get(a).sort((x, y) => String(x.le).localeCompare(String(y.le)));
    if (kat) Lf.polyline(l.map((p) => [p.lat, p.lng]), { color: kl(a), weight: 4, opacity: 0.85 }).addTo(kat);
    l.forEach((p, i) => mak(p.lat, p.lng, kl(a), `<b>${i + 1}. ${t(KIND[p.kind] || p.kind)}</b> · ${lèKout(p.le)}<br><span data-brut>${h(p.kliyan || "")}</span>${p.montant ? ` · ${gd(p.montant)}` : ""}<br><span data-brut>${h(nonAjan(a))}</span>`, { nimewo: i + 1 }));
    const dist = l.slice(1).reduce((s, p, i) => s + km(l[i], p), 0);
    return { a, l, dist };
  });
  lis.innerHTML = `${offline ? `<p class="note info-note">${t("Offline: se dènye trajè ki te chaje pou jou sa a.")}</p>` : ""}
    ${rez.length ? rez.map(({ a, l, dist }) => `<section class="kat-aj-r card"><h2><i class="kat-dot" style="background:${kl(a)}"></i><span data-brut>${h(nonAjan(a))}</span></h2>
      <p class="mut sm">${l.length} ${t("aksyon")} · ${kmTxt(dist)} · ${lèKout(l[0].le)} → ${lèKout(l[l.length - 1].le)}</p>
      <ol class="kat-tl">${l.map((p, i) => `<li><span class="kat-num" style="background:${kl(a)}">${i + 1}</span><b>${lèKout(p.le)}</b> ${t(KIND[p.kind] || p.kind)} · <span data-brut>${h(p.kliyan || "")}</span>${p.montant ? ` · ${gd(p.montant)}` : ""}</li>`).join("")}</ol></section>`).join("")
    : `<p class="empty">${t("Pa gen aksyon ak GPS jou sa a.")}</p>`}`;
  fini();
}

function liSan(san) {
  return `<details class="kat-san"><summary>${t("Kliyan san GPS")} (${san.length})</summary><div class="list">${san.map(({ c, ks }) => `<a class="row" href="#/tx/nouvo/${h(ks[0].id_compte_epargne)}"><div class="grow"><b>${d(non(c))}</b><div class="mut sm">${d(ks[0].no_compte || "")}</div></div></a>`).join("")}</div></details>`;
}
