import * as db from "./db.js";
import * as api from "./api.js";
import * as S from "./sync.js";
import * as ui from "./ui.js";
import * as TX from "./taxonomy.js";
import { t, setLang, getLang, demarrerTraduction } from "./i18n.js";
import * as F from "./fmt.js";
import * as looks from "./looks.js";
import * as KAT from "./kat.js";

const $app = document.getElementById("app");
// Klavye sou onglè yo (role=tab nan yon role=tablist): flèch, Home, End deplase fokis la epi chwazi onglè a.
$app.addEventListener("keydown", (e) => {
  const tab = e.target?.closest?.('[role="tab"]'); const list = tab?.closest('[role="tablist"]'); if (!list) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')]; const i = tabs.indexOf(tab); if (i < 0 || tabs.length < 2) return;
  let j = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % tabs.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + tabs.length) % tabs.length;
  else if (e.key === "Home") j = 0; else if (e.key === "End") j = tabs.length - 1;
  if (j == null) return;
  e.preventDefault();
  const li = [...$app.querySelectorAll('[role="tablist"]')].indexOf(list);
  tabs[j].focus(); tabs[j].click();
  // Paj la ka re-rann apre klik la: remete fokis la sou menm onglè a.
  const refokis = () => { const nl = $app.querySelectorAll('[role="tablist"]')[li]; const nt = nl?.querySelectorAll('[role="tab"]')[j]; if (nt && document.activeElement !== nt) nt.focus(); };
  setTimeout(refokis, 150); setTimeout(refokis, 500);
});
const $bar = document.getElementById("bar");
const C = window.GRANDON_CONFIG;

// ---------- Ti zouti ----------
const APP_VERSION = "4.20";
const WOL = { agent: "Ajan", manager: "Manadjè", admin: "Admin" };
// Preferans aparans: pou aparèy sa a sèlman.
const PREFS_DEFO = { tem: "auto", teks: "n", look: looks.LOOK_DEFO, son: true };
function prefs() {
  try { return { ...PREFS_DEFO, ...JSON.parse(localStorage.getItem("grandon-prefs") || "{}") }; }
  catch { return { ...PREFS_DEFO }; }
}
function applyPrefs(p = prefs()) {
  const r = document.documentElement;
  r.dataset.teks = p.teks;
  looks.applyLook(looks.LOOKS[p.look] ? p.look : looks.LOOK_DEFO, p.tem);
}
const L = () => looks.current();
function savePrefs(p) {
  const n = { ...prefs(), ...p };
  try { localStorage.setItem("grandon-prefs", JSON.stringify(n)); } catch { /* navigatè prive */ }
  applyPrefs(n);
}
const { h, d, gd, datFr, lè, non, JOU, JOU_KOUT, lisJou, tel4, avatar, badgePend, badgeTx, badgeKont, badgeDm, ICO,
  LABEL_TX, SIY, KLAS, MOTIFS, motifLabel, MOTIF_KOUT, TYPES_FRE, lèKout, datKout } = F;
const adopteInfo = (r) => ({ id: r.id_personne, prenom: r.prenom, nom: r.nom, code_client: r.code_client, photo_url: r.photo_url, tel4: r.tel4 });
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

function toast(msg, kind = "ok", ms = 3500) {
  document.querySelectorAll(".toast:not(.update)").forEach((x) => x.remove());
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.setAttribute("role", "status");
  el.textContent = t(msg);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function getGps(timeout = 10000, { fre = false } = {}) { // fre: pa itilize yon pozisyon ki gen plis pase 2 minit
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      () => res(null),
      { enableHighAccuracy: true, timeout, maximumAge: fre ? 0 : 120000 });
  });
}

async function compress(file) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.75));
}

// ---------- Ba estati ----------
let moi = null;
async function updateBar() {
  if (!moi) { $bar.hidden = true; return; }
  const ops = await db.all("outbox");
  const err = ops.filter((o) => o.status === "erè").length;
  const pend = ops.length - err;
  const s = api.getSession();
  const on = navigator.onLine;
  $bar.hidden = false;
  $bar.innerHTML = `
    <a href="#/" class="brand"><span class="mark" aria-hidden="true">G</span><span class="brand-t">Grandon</span> ${C.ANVIWONMAN ? `<small>${h(C.ANVIWONMAN)}</small>` : ""}</a>
    <a href="#/senk" class="net ${on ? "on" : "off"}" aria-label="Senkronizasyon: ${on ? "anliy" : "offline"}, ${pend} poko voye, ${err} erè">
      <span class="dot"></span>${on ? "Anliy" : "Offline"}
      ${S.isRunning() ? `<span class="spin" aria-hidden="true"></span>` : ""}
      ${pend ? `<span class="cnt">${pend}</span>` : ""}
      ${err ? `<span class="cnt err">${err}!</span>` : ""}
      ${s?.expired ? `<span class="cnt err">Konekte</span>` : ""}
    </a>`;
  mezireBar();
}

// ---------- Ba navigasyon anba ----------
const $nav = document.getElementById("nav");
const TABS = [["tablo", "#/", "Tablo"], ["kliyan", "#/kliyan", "Kliyan"], ["epay", "#/epay", "Epay"], ["rapo", "#/rapo", "Rapò"], ["kat", "#/kat", "Kat"], ["senk", "#/senk", "Senkronizasyon"], ["param", "#/param", "Paramèt"]];
function tabActif(r) {
  if (/^#\/(kliyan)/.test(r)) return "kliyan";
  if (/^#\/(epay|cycle|tx|chwazi)/.test(r)) return "epay";
  if (/^#\/rapo/.test(r)) return "rapo";
  if (/^#\/kat/.test(r)) return "kat";
  if (/^#\/senk/.test(r)) return "senk";
  if (/^#\/(param|ajan|feries|istorik|modpas|aparey)/.test(r)) return "param";
  return "tablo";
}
function updateNav() {
  const r = location.hash || "#/";
  if (!moi || r === "#/login") { $nav.hidden = true; document.body.classList.remove("has-nav"); return; }
  const a = tabActif(r);
  $nav.hidden = false;
  if (!window.L?.map) setTimeout(() => KAT.chajeLeaflet().catch(() => {}), 400); // kat la pare menm si entènèt koupe apre
  document.body.classList.add("has-nav");
  $nav.innerHTML = TABS.map(([k, href, label]) => `<a href="${href}" class="${k === a ? "on" : ""}${k === "senk" ? " nav-lap" : ""}" ${k === a ? 'aria-current="page"' : ""}>${ICO[k]}<span>${label}</span></a>`).join("")
    + `<div class="nav-foot"><span class="nav-moi" data-brut>${h(moi.nom || "")}</span><span class="nav-wol">${WOL[moi.role] || "Anplwaye"}</span><span class="nav-ver mut">v${h(APP_VERSION)}</span></div>`;
  mezireBar();
}
// Wotè ba estati a (--bar-h): sou laptop, navigasyon agòch la kòmanse anba l.
function mezireBar() {
  document.documentElement.style.setProperty("--bar-h", ($bar.hidden ? 0 : $bar.offsetHeight) + "px");
}
let tmMezire = 0;
window.addEventListener("resize", () => { clearTimeout(tmMezire); tmMezire = setTimeout(mezireBar, 80); });
if (document.fonts?.ready) document.fonts.ready.then(mezireBar).catch(() => {});

// ---------- Koneksyon ----------
function viewLogin(expired) {
  $app.innerHTML = `
  <section class="login">
    <img src="icons/icon-192.png" alt="" width="76" height="76">
    <h1>Grandon</h1>
    <p class="mut">Aplikasyon ajan ${C.ANVIWONMAN ? `· ${h(C.ANVIWONMAN)}` : ""}</p>
    <div class="lang-sw" role="group" aria-label="Lang"><button type="button" data-lang="ht" class="${getLang() === "ht" ? "on" : ""}" data-brut>Kreyòl</button><button type="button" data-lang="fr" class="${getLang() === "fr" ? "on" : ""}" data-brut>Français</button></div>
    ${expired ? `<p class="note warn">Sesyon w fini. Konekte ankò: done ki sou telefòn nan ap rete.</p>` : ""}
    <form id="f-login" class="card">
      <label>Telefòn<input name="tel" inputmode="tel" autocomplete="username" placeholder="3700 1234" required></label>
      <label>Modpas<input name="pw" type="password" autocomplete="current-password" required></label>
      <button class="btn pri" type="submit">Konekte</button>
      <p class="err-msg" id="login-err" role="alert"></p>
    </form>
    ${navigator.onLine ? "" : `<p class="note">Fòk ou gen entènèt pou premye koneksyon an.</p>`}
  </section>`;
  $app.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { setLang(b.dataset.lang); location.reload(); }));
  document.getElementById("f-login").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const b = f.querySelector("button");
    b.disabled = true; b.textContent = "Ap konekte…";
    const out = document.getElementById("login-err");
    out.textContent = "";
    try {
      const prev = await db.meta("owner");
      const ops = await db.all("outbox");
      const s = await api.login(f.tel.value, f.pw.value);
      if (prev && prev !== s.user.id && ops.length) {
        await api.clearSession();
        throw new Error("Gen done yon lòt ajan sou telefòn sa a ki poko voye. Se li ki pou konekte.");
      }
      // Yon sèl aparèy aktif: sèvè a refize si ansyen aparèy la gen operasyon ki poko voye, sinon li dekonekte l.
      let ap = null;
      try {
        ap = await api.rpc("grandon_aparey_konekte", { p_aparey: api.apareyId(), p_non: api.apareyNon() });
      } catch (e2) {
        if (/ANSYEN_APAREY/.test(e2.message)) { await api.clearSession(); throw new Error(e2.message.replace(/^.*?ANSYEN_APAREY:\s*/, "")); }
        if (e2.status !== 404) { await api.clearSession(); throw e2; }
      }
      await db.meta("aparey_bloke", null);
      // Ajan Grandon (telefòn) oswa administratè (imèl).
      const [ga] = await api.select(`grandon_ajan?user_id=eq.${s.user.id}&select=nom,role,actif`);
      const [p] = ga?.actif ? [null] : await api.select(`profiles?user_id=eq.${s.user.id}&select=firstname,name,role`);
      if (!ga?.actif && !(p && [1, 2, 3, 5].includes(Number(p.role)))) {
        await api.clearSession();
        throw new Error("Kont sa a pa gen aksè nan Grandon.");
      }
      if (prev && prev !== s.user.id) { const keep = await db.meta("session"); await db.wipe(); await db.meta("session", keep); }
      moi = ga?.actif
        ? { id: s.user.id, nom: ga.nom, role: ga.role, admin: ga.role === "admin", manager: ga.role === "admin" || ga.role === "manager", tel: api.telefon8(f.tel.value), modpasTanpore: !!ap?.modpas_tanpore }
        : { id: s.user.id, nom: `${p.firstname || ""} ${p.name || ""}`.trim() || s.user.email, role: Number(p.role), admin: Number(p.role) === 1, manager: [1, 2, 5].includes(Number(p.role)) };
      await db.meta("owner", s.user.id);
      await db.meta("moi", moi);
      navigator.storage?.persist?.();
      if (ap?.ansyen_dekonekte) toast(t("Ansyen aparèy ou a dekonekte."), "info", 6000);
      if (moi.modpasTanpore) return go("#/modpas");
      b.textContent = "Ap telechaje done yo…";
      await S.run();
      // Si ajan an te deja peze yon onglè pandan telechajman an, kite l kote l ye.
      if (!location.hash || location.hash === "#/login" || location.hash === "#/") go("#/"); else render();
    } catch (err) {
      out.textContent = err.message;
      b.disabled = false; b.textContent = "Konekte";
    }
  };
}

// ---------- Lis kliyan (pati komen) ----------
function lisKliyan(M, filtre) {
  const q = filtre.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  return [...M.clients.values()]
    .filter((c) => !q || non(c).toLowerCase().includes(q) || (qd.length >= 3 && String(c.telephone || c.tel4 || "").replace(/\D/g, "").includes(qd)) || String(c.code_client || "").toLowerCase().includes(q))
    .sort((a, b) => (b._pending ? 1 : 0) - (a._pending ? 1 : 0) || non(a).localeCompare(non(b)));
}
function liKliyan(M, c, href) {
  const ks = S.comptesDuClient(M, c.id_personne).filter((k) => k._actif);
  return `<a class="row" href="${href}">
    ${avatar(c)}
    <div class="grow"><b>${d(non(c))}</b> ${badgePend(c)}
      <div class="mut sm">${d(c.code_client || "ID poko vini")} · •••• ${h(tel4(c))}</div>
      <div class="mut sm">${ks.length ? `${ks.length} cycle aktif` : "San cycle aktif"}</div></div>
    <div class="right">${ks[0] ? badgeKont(ks[0]) : ""}</div></a>`;
}

// ---------- 1. Tablo de bò ----------
async function viewTablo() {
  const M = await S.model();
  const st = statsEpay(M);
  st.rete = Math.max(0, st.prevuJodi - st.kolekPlan);
  st.anplis = Math.max(0, st.kolekte - st.kolekPlan);
  st.pwosanPlan = st.prevuJodi ? Math.round((st.kolekPlan / st.prevuJodi) * 100) : 0;
  // Pati 2: mwa a (kont ki aktif nan mwa a)
  const ks = [...M.comptes.values()].filter((k) => k._mwaPrevuTotal > 0 || k._kolekMwa > 0);
  const som = (f) => ks.reduce((a, k) => a + (f(k) || 0), 0);
  Object.assign(st, { mwaPrevuTotal: som((k) => k._mwaPrevuTotal), mwaPrevu: som((k) => k._mwaPrevu), mwaPlan: som((k) => k._mwaPlan),
    mwaDwe: som((k) => k._mwaDwe), mwaKolekte: som((k) => k._kolekMwa), nDwe: ks.filter((k) => k._mwaDwe > 0).length,
    nonMwa: new Date(M.today + "T12:00:00Z").toLocaleDateString(getLang() === "fr" ? "fr-FR" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) });
  st.mwaPwosan = st.mwaPrevu ? Math.round((st.mwaPlan / st.mwaPrevu) * 100) : 0;
  const man = estManager();
  $app.innerHTML = `<div id="tablo">${L().parts.tablo({ ...ctxBase(M), stats: st, isoJou: S.isoJou(M.today) })}${man ? `${seksyonKontwol(M)}<section class="doublon-sek" id="doublon" hidden></section>` : ""}</div>`;
  $app.querySelector("[data-mwa-reta]")?.addEventListener("click", () => { ongEpay = "kont"; filtKont = "reta"; });
  if (man) { ajans = (await db.meta("ajans")) || {}; montreKontwol(M); chajeDoublon(); }
}

// Chif komen pou Epay/Tablo
function statsEpay(M) {
  const pouJodi = [...M.comptes.values()].filter((k) => k._jodiPeman);
  const aktif = [...M.comptes.values()].filter((k) => k._actif);
  return {
    pouJodi: pouJodi.length, peye: pouJodi.filter((k) => k._jodi >= Number(k.montant_plan || 0)).length,
    kolekte: [...M.comptes.values()].reduce((a, k) => a + k._jodi, 0),
    // Objektif jodi a: sòm plan kliyan ki dwe peye jodi a. Sou plan an, yon kliyan konte pou plan li sèlman
    // (plan 1 000, li bay 10 000 → 1 000), pou depo an plis pa kache kliyan ki pa peye yo.
    prevuJodi: pouJodi.reduce((a, k) => a + Number(k.montant_plan || 0), 0),
    kolekPlan: pouJodi.reduce((a, k) => a + Math.min(k._jodi, Number(k.montant_plan || 0)), 0),
    enAtant: [...M.demandes.values()].filter((x) => x.statut === "en_attente").length,
    aktif: aktif.length, anReta: aktif.filter((k) => k._anReta > 0).length, kliyan: M.clients.size,
  };
}
const ctxBase = (M) => ({ M, moi, man: estManager(), today: M.today, t, lang: getLang() });

// ---------- 2. Kliyan: chèche nan tout baz la (anti-doublon) + kreye ----------
let rechèch = "";
let chèchTimer = null;
async function viewKliyan() {
  const M = await S.model();
  $app.innerHTML = `
  <div class="page-head"><h1>Kliyan</h1><a class="btn pri" href="#/kliyan/nouvo">＋ Nouvo kliyan</a></div>
  <div class="search-row">
    <input id="q" type="search" class="search" placeholder="Chèche non, ID kliyan oswa telefòn…" aria-label="Chèche kliyan" value="${h(rechèch)}" autocomplete="off">
    <button class="btn gps-btn" id="pre" type="button" title="Toupre m"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg><span>Toupre m</span></button>
    <select id="rayon" aria-label="Distans"><option value="100">100 m</option><option value="300" selected>300 m</option><option value="1000">1 km</option></select>
  </div>
  <p class="mut sm" id="q-hint"></p>
  <div id="baz"></div>
  <h2 id="lok-t">Kliyan Grandon yo <small class="mut">(${M.clients.size})</small></h2>
  <div class="list grid-t" id="list"></div>`;
  const q = document.getElementById("q");
  const drawLocal = () => {
    document.getElementById("list").innerHTML = lisKliyan(M, rechèch).slice(0, 200).map((c) => liKliyan(M, c, `#/kliyan/${c.id_personne}`)).join("")
      || `<p class="empty">${rechèch ? "Pa gen kliyan Grandon ki koresponn." : "Pa gen kliyan."}</p>`;
  };
  const ligneBaz = (r) => `<div class="row">
      ${avatar(r)}
      <div class="grow"><b>${d(non(r))}</b><div class="mut sm">${d(r.code_client || "—")} · •••• ${d(r.tel4 || "")}${r.distance_m != null ? ` · <b>${r.distance_m} m</b>` : ""}</div></div>
      ${M.clients.has(r.id_personne) ? `<a class="btn sm" href="#/kliyan/${r.id_personne}">Wè fich li</a>` : `<button class="btn sm pri" data-adopte='${h(JSON.stringify(adopteInfo(r)))}'>Ajoute</button>`}
    </div>`;
  const brancherAdopte = (box) => box.querySelectorAll("[data-adopte]").forEach((b) => (b.onclick = async () => {
    const p = JSON.parse(b.dataset.adopte);
    if (!(await ui.ask({ titre: "Ajoute kliyan sa a nan Grandon?", foto: p.photo_url, ok: "Ajoute",
      detay: [["Non", `${p.prenom} ${p.nom}`], ["Kòd kliyan", p.code_client || "—"], ["Telefòn", `•••• ${p.tel4 || ""}`]] }))) return;
    await S.enqueue("adopte", { ...p, gps: await getGps(4000), capture_le: new Date().toISOString() });
    toast(`${p.prenom} ${p.nom} · ${t("Ajoute")} ✓`);
    go(`#/kliyan/${p.id}`);
  }));
  document.getElementById("pre").onclick = async () => {
    const box = document.getElementById("baz"), hint = document.getElementById("q-hint");
    if (!navigator.onLine) { hint.textContent = t("Rechèch pa pozisyon bezwen entènèt."); return; }
    hint.textContent = t("Ap chèche pozisyon w…");
    const g = await getGps(12000);
    if (!g) { hint.textContent = t("Pa ka jwenn pozisyon w. Aktive GPS la."); return; }
    try {
      const rs = await api.rechercherGps(g.lat, g.lng, Number(document.getElementById("rayon").value));
      hint.textContent = rs.length ? `${t("Kliyan toupre w")} (±${g.acc} m)` : t("Pa gen moun nan baz la nan zòn sa a.");
      box.innerHTML = rs.length ? `<h2>Kliyan toupre w</h2><div class="list grid-t">${rs.map(ligneBaz).join("")}</div>` : "";
      brancherAdopte(box);
    } catch (e) { hint.textContent = t(e.retry ? "Pa gen koneksyon: rechèch lokal sèlman." : e.message); }
  };
  const drawBaz = async () => {
    const box = document.getElementById("baz");
    const hint = document.getElementById("q-hint");
    const v = rechèch.trim();
    const okLen = v.replace(/\D/g, "").length >= 4 || v.length >= 2;
    if (!v || !okLen) { box.innerHTML = ""; hint.textContent = "Chèche anvan w kreye yon kliyan, pou evite doublon."; return; }
    if (!navigator.onLine) { box.innerHTML = ""; hint.textContent = "Offline: rechèch la fèt sèlman nan kliyan ki sou telefòn nan."; return; }
    hint.textContent = "Ap chèche nan baz la…";
    try {
      const rs = (await api.rechercher(v)).filter((r) => !M.clients.has(r.id_personne));
      if (rechèch.trim() !== v) return;
      hint.textContent = rs.length ? "Moun sa yo deja nan baz la. Si se li, ajoute l nan Grandon olye w kreye l ankò." : "Pa gen lòt moun nan baz la ki koresponn.";
      box.innerHTML = rs.length ? `<h2>Nan baz la</h2><div class="list grid-t">${rs.map(ligneBaz).join("")}</div>` : "";
      brancherAdopte(box);
    } catch (e) { hint.textContent = e.retry ? "Pa gen koneksyon: rechèch lokal sèlman." : e.message; box.innerHTML = ""; }
  };
  q.oninput = () => {
    rechèch = q.value; drawLocal();
    clearTimeout(chèchTimer); chèchTimer = setTimeout(drawBaz, 350);
  };
  drawLocal(); drawBaz();
}

// ---------- Pati komen pou Epay ----------
const estManager = () => !!(moi && (moi.manager ?? (moi.admin || moi.role === "manager" || [1, 2, 5].includes(Number(moi.role)))));
const jourTx = (tx) => `${S.jouTx(tx) === S.jodi() ? t("jodi a") : datFr(S.jouTx(tx))} · ${lèKout(tx.date_transaction) || ""}`;
const nomAjan = (id) => (id === moi?.id || id === "moi" ? t("Mwen") : (ajans[id] || (id ? t("Lòt ajan") : "")));
let ajans = {};

// Yon liy fidbak ("Pa peye"): kliyan + rezon + lè + nòt. kliyan=false sou paj cycle la (kliyan an deja konnen).
function liSwivi(M, x, { kliyan = true } = {}) {
  const k = M.comptes.get(x.id_compte_epargne); const c = k && M.clients.get(k.id_personne);
  const ajan = nomAjan(x.agent_id);
  const kò = `<div class="grow">${kliyan ? `<b>${d(non(c))}</b> <span class="badge warn">${t(MOTIF_KOUT[x.motif] || "Lòt")}</span>` : `<b>${t(motifLabel(x.motif))}</b>`} ${badgePend(x)} ${estManager() ? badjKontwol(x) : ""}
      ${kliyan ? `<div class="sm rezon">${t(motifLabel(x.motif))}</div>` : ""}
      <div class="mut sm">${kliyan ? `${d(k?.no_compte || t("Cycle poko voye"))} · ` : ""}${lè(x.capture_le)}${ajan ? ` · ${d(ajan)}` : ""}</div>
      ${x.note ? `<div class="sm nòt">${d(x.note)}</div>` : ""}
      ${x._error ? `<div class="err-msg sm">${d(t(x._error))}</div>` : ""}</div>`;
  return kliyan ? `<a class="row swivi" href="#/cycle/${x.id_compte_epargne}">${kò}</a>` : `<div class="row swivi">${kò}</div>`;
}

// Kontwòl kote fidbak la fèt (manadjè sèlman): distans ak GPS kliyan an.
const distTxt = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
function badjKontwol(x) {
  if (x.kontwol === "lwen") return `<span class="badge err kontwol">${distTxt(x.distans_m)} ${t("lwen kliyan an")}</span>`;
  if (x.kontwol === "san_gps_ajan") return `<span class="badge err kontwol">${t("San GPS ajan")}</span>`;
  if (x.kontwol === "pa_presi") return `<span class="badge warn kontwol">${t("GPS pa presi")}</span>`;
  if (x.kontwol === "san_gps_kliyan") return `<span class="badge mut kontwol">${t("Kliyan an pa gen GPS")}</span>`;
  if (x.kontwol === "ok") return `<span class="badge ok kontwol">${t("Kote kliyan an")}${x.distans_m != null ? ` · ${distTxt(x.distans_m)}` : ""}</span>`;
  return "";
}
// Fidbak ki pa fèt kote kliyan an (7 dènye jou): seksyon sou Tablo + popup ak son pou sa manadjè a poko wè.
function fidbakSispèk(M) {
  const de = S.ajouteJou(M.today, -6);
  return [...M.suivis.values()].filter((x) => S.swiviSispèk(x) && S.jouLokal(new Date(x.capture_le)) >= de)
    .sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
}
function seksyonKontwol(M) {
  const l = fidbakSispèk(M);
  return `<section class="kontwol-sek" id="kontwol"><h2>Fidbak pou verifye <small class="mut">(${l.length})</small></h2>
    <p class="mut sm">${t("Fidbak ki pa t fèt kote kliyan an (plis pase 300 m), oswa san GPS · 7 dènye jou.")}</p>
    <div class="list">${l.map((x) => liSwivi(M, x)).join("") || `<p class="empty">${t("Tout fidbak yo te fèt kote kliyan yo.")}</p>`}</div></section>`;
}
// Kliyan «petèt doublon» (menm non ak yon lòt moun nan baz la): manadjè a deside. Bezwen entènèt; dènye lis la rete sou telefòn nan.
async function chajeDoublon() {
  const box = document.getElementById("doublon"); if (!box) return;
  let l = null;
  try { l = await api.rpc("grandon_doublon_lis", {}); await db.meta("doublon", l); } catch { l = await db.meta("doublon"); }
  if (!document.getElementById("doublon") || !l?.length) return;
  const kli = (x) => `<a href="#/kliyan/${h(x.id_personne)}"><b>${d(`${x.prenom || ""} ${x.nom || ""}`)}</b></a> · ${d(x.code_client || "—")} · ${x.tel4 ? `•••• ${d(x.tel4)}` : t("san telefòn")}`;
  box.hidden = false;
  box.innerHTML = `<h2>Kliyan petèt doublon <small class="mut">(${l.length})</small></h2>
    <p class="mut sm">${t("Nouvo kliyan ki gen menm non ak yon moun ki deja nan baz la, men ak yon lòt telefòn. Verifye si se menm moun.")}</p>
    <div class="list">${l.map((x) => `<div class="row col doublon" data-dbl="${h(x.id_personne)}">
      <div><span class="badge warn">${t("Nouvo")}</span> ${kli(x)} <span class="mut sm">· ${lè(x.kreye_le)}${nomAjan(x.agent_id) ? ` · ${d(nomAjan(x.agent_id))}` : ""}</span></div>
      ${(x.lot || []).map((o) => `<div class="sm"><span class="badge mut">${t(o.grandon ? "Deja kliyan Grandon" : "Deja nan baz la")}</span> ${kli(o)}</div>`).join("")}
      <div class="btns"><button type="button" class="btn sm" data-dbl-dif="${h(x.id_personne)}">${t("Se 2 moun diferan")}</button>
        <button type="button" class="btn sm danger" data-dbl-menm="${h(x.id_personne)}">${t("Se menm moun")}</button></div></div>`).join("")}</div>`;
  const deside = async (id, desizyon) => {
    if (!navigator.onLine) return toast(t("Fòk ou gen entènèt pou deside."), "err");
    if (desizyon === "menm" && !(await ui.ask({ titre: "Se menm moun?", tekst: t("Dosye a ap make «doublon». Pa kreye cycle sou li; kontakte administratè a pou fizyone 2 dosye yo."), ok: "Wi, se menm moun" }))) return;
    try { await api.rpc("grandon_doublon_deside", { p_id_personne: id, p_desizyon: desizyon }); toast(t("Desizyon an anrejistre.")); chajeDoublon(); }
    catch (e) { toast(t(e.message || "Erè"), "err"); }
  };
  box.querySelectorAll("[data-dbl-dif]").forEach((b) => (b.onclick = () => deside(b.dataset.dblDif, "diferan")));
  box.querySelectorAll("[data-dbl-menm]").forEach((b) => (b.onclick = () => deside(b.dataset.dblMenm, "menm")));
}
const KONTWOL_VU = "grandon-kontwol-vu";
let kontwolOuvè = false; // pa louvri 2 popup youn sou lòt si Tablo a re-rann (sync) pandan popup la louvri
async function montreKontwol(M) {
  if (kontwolOuvè) return;
  const l = fidbakSispèk(M);
  let vu = []; try { vu = JSON.parse(localStorage.getItem(KONTWOL_VU) || "[]"); } catch { /* */ }
  const nouvo = l.filter((x) => !vu.includes(x.id));
  if (!nouvo.length) return;
  kontwolOuvè = true;
  if (prefs().son !== false) ui.son("ijan");
  await ui.aletPopup({ titre: nouvo.length > 1 ? `${nouvo.length} ${t("fidbak pa fèt kote kliyan an")}` : t("Yon fidbak pa fèt kote kliyan an"), nivo: "ijan",
    soutit: t("Ajan an te anrejistre «Pa peye» lwen biznis kliyan an, oswa san GPS."), html: `<div class="list">${nouvo.map((x) => liSwivi(M, x)).join("")}</div>` });
  try { localStorage.setItem(KONTWOL_VU, JSON.stringify([...new Set([...vu, ...nouvo.map((x) => x.id)])].slice(-500))); } catch { /* */ }
  kontwolOuvè = false;
}

function liTx(M, tx, { kliyan = true, bouton = false } = {}) {
  const k = M.comptes.get(tx.id_compte_epargne); const c = k && M.clients.get(k.id_personne);
  const kind = S.txKind(tx);
  const detay = [
    kind === "fre" && tx.type_frais ? d(tx.type_frais) : "",
    kind === "viman_out" && tx.virement_to ? `→ ${d(tx.virement_to)}` : "", kind === "viman_in" && tx.virement_from ? `← ${d(tx.virement_from)}` : "",
    tx.solde_avant_declare != null && tx.solde_avant_declare !== "" ? `${t("kanè avan")} ${gd(tx.solde_avant_declare)}` : "",
    tx.solde_declare != null && tx.solde_declare !== "" ? `${t("kanè apre")} ${gd(tx.solde_declare)}` : "",
  ].filter(Boolean).join(" · ");
  return `${bouton ? `<button type="button" class="row tx-btn" data-tx="${h(tx.id_transaction_epargne)}" aria-label="${h(t("Tranzaksyon"))}: ${h(t(LABEL_TX[kind]))} ${h(gd(tx.montant))}">` : `<a class="row" href="#/cycle/${tx.id_compte_epargne}">`}
    <div class="grow"><b>${t(LABEL_TX[kind])}</b>${kliyan ? ` · ${d(non(c))}` : ""} ${badgeTx(tx)}
      <div class="mut sm">${kliyan ? `${d(k?.no_compte || t("Cycle poko voye"))} · ` : ""}${jourTx(tx)}</div>
      ${detay ? `<div class="mut sm">${detay}</div>` : ""}
      ${tx._error ? `<div class="err-msg sm">${d(t(tx._error))}</div>` : ""}</div>
    <div class="right"><b class="${KLAS(kind)}">${SIY(kind)}${gd(tx.montant)}</b></div>${bouton ? "</button>" : "</a>"}`;
}

// ---------- Otorizasyon modifikasyon / siprime (migrasyon 29) ----------
// Yon ajan pa modifye dirèkteman: li mande (chan egzak + rezon), manadjè a apwouve, ajan an pote modifikasyon an yon sèl fwa.
const CHAN_KLIYAN = [["prenom", "Prenon"], ["nom", "Non"], ["telephone", "Telefòn"], ["pseudo", "Pseudo"], ["date_naissance", "Dat nesans"],
  ["piece", "Tip pyès"], ["numero_piece", "Nimewo pyès"], ["adresse", "Adrès"], ["lieu_de_travail", "Kote biznis la"], ["secteur", "Sektè"],
  ["activite", "Aktivite"], ["point_de_vente", "Pwen de vant"], ["capacite_distribution", "Kapasite distribisyon"], ["gps", "Pozisyon GPS"]];
const CHAN_TX = [["montant", "Montan"], ["solde_avant_declare", "Balans kanè avan"], ["solde_declare", "Balans kanè apre"], ["type_frais", "Tip frè"], ["note", "Nòt"]];
const etikètChan = (kind, k) => ((kind === "kliyan" ? CHAN_KLIYAN : CHAN_TX).find(([x]) => x === k) || [k, k])[1];
const mwenSe = (id) => id === moi?.id || id === "moi";
const otorizasyon = (M, kind, ref) => [...M.modif.values()].find((x) => x.kind === kind && x.ref_id === ref && x.operasyon === "modifye" && x.statut === "apwouve" && mwenSe(x.agent_id));
const demannModif = (M, kind, ref) => [...M.modif.values()].find((x) => x.kind === kind && x.ref_id === ref && x.statut === "an_atant");
function ciblModif(M, kind, ref) {
  if (kind === "kliyan") return non(M.clients.get(ref));
  const tx = M.txs.get(ref); const k = tx && M.comptes.get(tx.id_compte_epargne);
  return tx ? `${t(LABEL_TX[S.txKind(tx)])} ${gd(tx.montant)} · ${non(k && M.clients.get(k.id_personne))}` : t("Tranzaksyon");
}
function chanTx(tx) {
  const kind = S.txKind(tx);
  return CHAN_TX.filter(([k]) => (k === "type_frais" ? kind === "fre" : k === "montant" ? !kind.startsWith("viman") : k.startsWith("solde") ? kind === "depo" || kind === "retre" : true));
}
function liModif(M, x, { decide = false } = {}) {
  const ETA = { an_atant: ["warn", "An atant"], apwouve: ["ok", "Apwouve: ou ka modifye"], refize: ["err", "Refize"], itilize: ["mut", "Fèt"], fini: ["mut", "Fèt"] };
  const [kl, et] = ETA[x.statut] || ["mut", x.statut];
  const href = x.kind === "kliyan" ? `#/kliyan/${x.ref_id}` : (() => { const tx = M.txs.get(x.ref_id); return tx ? `#/cycle/${tx.id_compte_epargne}` : "#/epay"; })();
  const ki = x.operasyon === "siprime" ? (x.kind === "tx" ? t("Anile tranzaksyon an") : t("Retire kliyan an nan Grandon")) : `${t("Modifye")}: ${(x.chan || []).map((k) => t(etikètChan(x.kind, k))).join(", ")}`;
  return `<div class="row col modif">
    <div><a href="${href}"><b>${x.kind === "kliyan" ? d(ciblModif(M, x.kind, x.ref_id)) : h(ciblModif(M, x.kind, x.ref_id))}</b></a> <span class="badge ${kl}">${t(et)}</span> ${x._pending ? `<span class="badge pend">${t("Poko voye")}</span>` : ""}
      <div class="sm">${ki}</div>
      <div class="mut sm">${t("Rezon")}: ${d(x.rezon || "")} · ${lè(x.kreye_le)}${nomAjan(x.agent_id) ? ` · ${d(nomAjan(x.agent_id))}` : ""}</div>
      ${x.statut === "refize" && x.motif_refi ? `<div class="err-msg sm">${t("Rezon refi a")}: ${d(x.motif_refi)}</div>` : ""}</div>
    ${decide && x.statut === "an_atant" ? `<div class="btns"><button class="btn sm pri" data-mok="${h(x.id)}">${t("Apwouve")}</button><button class="btn sm danger" data-mnon="${h(x.id)}">${t("Refize")}</button></div>` : ""}
  </div>`;
}
async function mandeModif(M, kind, ref, { tekst, chan, siprime, deps = [] }) {
  const r = await ui.askModif({ titre: "Mande otorizasyon", tekst, chan, siprime });
  if (!r) return;
  await S.enqueue("modif_demann", { id: S.uuid(), kind, ref, operasyon: r.operasyon, chan: r.chan, rezon: r.rezon, kreye_le: new Date().toISOString() }, deps);
  toast(t("Demann lan voye bay manadjè a."));
  render();
}
async function decideModif(M, id, ok) {
  if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou otorize yon demann.");
  const x = M.modif.get(id);
  let motif = null;
  if (ok) {
    if (!(await ui.ask({ titre: x.operasyon === "siprime" ? (x.kind === "tx" ? "Anile tranzaksyon sa a?" : "Retire kliyan sa a nan Grandon?") : "Bay otorizasyon pou modifye?",
      ok: "Apwouve", danje: x.operasyon === "siprime", detay: [["Sa", ciblModif(M, x.kind, x.ref_id)], ...(x.chan ? [["Chan yo", x.chan.map((k) => t(etikètChan(x.kind, k))).join(", ")]] : []), ["Rezon", x.rezon]] }))) return;
  } else {
    motif = await ui.askText({ titre: "Refize demann sa a?", label: "Rezon refi a", min: 3 });
    if (!motif) return;
  }
  try {
    await api.rpc("grandon_modif_deside", { p_id: id, p_ok: ok, p_motif: motif });
    toast(ok ? (x.operasyon === "siprime" ? "Fèt." : "Otorizasyon an bay.") : "Demann lan refize.");
    await S.pull();
  } catch (e) { return ui.info("Erè", e.message); }
  render();
}
// Peze sou yon tranzaksyon (paj cycle): manadjè modifye/anile dirèkteman; ajan mande oswa itilize otorizasyon li.
async function aksyonTx(M, id) {
  const tx = M.txs.get(id);
  if (!tx) return;
  if (tx.validation_status === "rejected") return ui.info("Tranzaksyon sa a anile.", "");
  if (tx._pending) return ui.info("Tranzaksyon sa a poko voye.", "Tann li rive sou sèvè a anvan w mande pou modifye l.");
  const chan = chanTx(tx);
  const valè = { montant: tx.montant, solde_avant_declare: tx.solde_avant_declare, solde_declare: tx.solde_declare, type_frais: tx.type_frais, note: tx.note };
  const fòm = (lis) => lis.map(([k, l]) => ({ k, label: l, type: k === "type_frais" ? "select" : k === "note" ? "text" : "number", value: valè[k] ?? "", options: TYPES_FRE }));
  const voye = async (otorizasyon, lis, v) => {
    await S.enqueue("modif_aplike", { id: S.uuid(), otorizasyon, kind: "tx", ref: id, chan: lis, vale: v });
    toast("Modifikasyon an anrejistre."); render();
  };
  if (estManager()) {
    const r = await ui.askChoice({ titre: ciblModif(M, "tx", id), options: [["modifye", "Modifye"], ["anile", "Anile tranzaksyon an"]], noteLabel: "Rezon (obligatwa pou anile)", noteObligatwaPou: ["anile"], ok: "Kontinye" });
    if (!r) return;
    if (r.valeur === "anile") {
      if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou anile yon tranzaksyon.");
      try { await api.rpc("grandon_modif_siprime_direk", { p_kind: "tx", p_ref: id, p_rezon: r.note }); toast("Tranzaksyon an anile."); await S.pull(); }
      catch (e) { return ui.info("Erè", e.message); }
      return render();
    }
    const v = await ui.askChan({ titre: "Modifye tranzaksyon an", chan: fòm(chan) });
    if (!v) return;
    const lis = chan.map(([k]) => k).filter((k) => String(v[k] ?? "") !== String(valè[k] ?? ""));
    if (!lis.length) return toast("Pa gen anyen ki chanje.", "info");
    return voye(null, lis, Object.fromEntries(lis.map((k) => [k, v[k]])));
  }
  const oto = otorizasyon(M, "tx", id);
  if (oto) {
    const v = await ui.askChan({ titre: "Modifye tranzaksyon an", tekst: "Otorizasyon an valab yon sèl fwa, pou chan sa yo sèlman.", chan: fòm(chan.filter(([k]) => oto.chan.includes(k))) });
    if (!v) return;
    return voye(oto.id, oto.chan, Object.fromEntries(oto.chan.map((k) => [k, v[k] ?? ""])));
  }
  if (demannModif(M, "tx", id)) return ui.info("Demann ou an atant.", "Yon manadjè poko reponn demann ou an pou tranzaksyon sa a.");
  return mandeModif(M, "tx", id, { tekst: ciblModif(M, "tx", id), chan, siprime: "Anile tranzaksyon an" });
}

function liDemande(M, dm, { decide = false } = {}) {
  const k = M.comptes.get(dm.id_compte_epargne); const c = k && M.clients.get(k.id_personne);
  const kd = dm.id_compte_dest && M.comptes.get(dm.id_compte_dest); const cd = kd && M.clients.get(kd.id_personne);
  return `<div class="row col demande">
    <div class="grow"><b>${dm.type === "V" ? t("Viman") : t("Retrè")} · ${gd(dm.montant)}</b> ${badgeDm(dm)}
      <div class="mut sm">${d(non(c))} · ${d(k?.no_compte || "")}${dm.type === "V" ? ` → ${d(non(cd))} · ${d(kd?.no_compte || "")}` : ""}</div>
      <div class="mut sm">${lè(dm.capture_le)}${nomAjan(dm.agent_id) ? ` · ${d(nomAjan(dm.agent_id))}` : ""}${dm.note ? ` · ${d(dm.note)}` : ""}</div>
      ${dm.motif_refus ? `<div class="err-msg sm">${t("Rezon")}: ${d(dm.motif_refus)}</div>` : ""}
      ${dm._error ? `<div class="err-msg sm">${d(t(dm._error))}</div>` : ""}</div>
    ${decide && dm.statut === "en_attente" && !dm._pending ? `<div class="btns"><button class="btn sm pri" data-ok="${dm.id}">Apwouve</button><button class="btn sm danger" data-non="${dm.id}">Refize</button></div>` : ""}
  </div>`;
}
async function decider(M, id, ok) {
  const dm = M.demandes.get(id);
  const k = M.comptes.get(dm.id_compte_epargne); const c = k && M.clients.get(k.id_personne);
  if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou otorize yon demann.");
  let motif = null;
  if (ok) {
    if (!(await ui.ask({ titre: dm.type === "V" ? "Apwouve viman sa a?" : "Apwouve retrè sa a?", ok: "Apwouve", foto: c?.photo_url,
      detay: [["Kliyan", non(c)], ["Kont", k?.no_compte || ""], ["Montan (goud)", gd(dm.montant)],
        ...(dm.type === "V" ? [["Kont ki resevwa", M.comptes.get(dm.id_compte_dest)?.no_compte || ""]] : []),
        ...(k?._solde != null ? [["Balans kont lan", gd(k._solde)]] : [])] }))) return;
  } else {
    motif = await ui.askText({ titre: "Refize demann sa a?", label: "Rezon refi a", min: 3 });
    if (!motif) return;
  }
  try {
    await api.rpc("grandon_decider", { p_id: id, p_ok: ok, p_motif: motif });
    toast(ok ? "Demann lan apwouve." : "Demann lan refize.");
    await S.pull();
  } catch (e) { return ui.info("Erè", e.message); }
  render();
}
async function paPeye(k, c) {
  const r = await ui.askChoice({ titre: "Kliyan an pa peye", tekst: `${non(c)} · ${k.no_compte || ""}`, options: MOTIFS,
    noteLabel: "Nòt (opsyonèl)", noteObligatwaPou: ["lot"] });
  if (!r) return;
  await S.enqueue("suivi", { id: S.uuid(), compte: k.id_compte_epargne, motif: r.valeur, note: r.note, gps: await getGps(8000, { fre: true }), capture_le: new Date().toISOString() },
    k._pending ? [k.id_compte_epargne] : []);
  toast("Fidbak la anrejistre.");
  render();
}

// ---------- 3. Epay: onglè Kont / Tranzaksyon / Validasyon ----------
let filtEpay = "", ongEpay = "kont", filtKont = "tout", filtFidbak = "semen";

// ---------- Lis tranzaksyon (Epay → Tranzaksyon): yon sèl kolòn, lè egzak, filt ak tri ----------
const TX_TRI = [["dat_desc", "Pi resan anvan"], ["dat_asc", "Pi ansyen anvan"], ["mon_desc", "Montan pi gwo"], ["mon_asc", "Montan pi piti"], ["kliyan", "Kliyan (A → Z)"]];
const TX_TIP = [["", "Tout tip"], ["depo", "Depo"], ["fre", "Frè"], ["retre", "Retrè"], ["viman", "Viman"]];
const TX_ETA = [["", "Tout eta"], ["poko", "Poko voye"], ["atant", "An atant validasyon"], ["valide", "Valide"], ["anile", "Anile / refize"]];
const txF = { tri: "dat_desc", tip: "", eta: "", q: "", lim: 100 };
const etaTx = (x) => (x._error || x._pending ? "poko" : x.validation_status === "pending" ? "atant" : x.validation_status === "rejected" ? "anile" : "valide");
const lèTx = (x) => lèKout(x.date_transaction) || "—";
function jouLabel(M, iso) {
  if (iso === M.today) return t("Jodi a");
  if (iso === S.ajouteJou(M.today, -1)) return t("Yè");
  return `${t(JOU[S.isoJou(iso)])} ${datFr(iso)}`;
}
function rowTx(M, tx) {
  const k = M.comptes.get(tx.id_compte_epargne), c = k && M.clients.get(k.id_personne), kind = S.txKind(tx);
  const kanè = [tx.solde_avant_declare, tx.solde_declare].map((v) => (v != null && v !== "" ? gd(v) : "—"));
  const detay = [d(k?.no_compte || t("Cycle poko voye")),
    kind === "fre" && tx.type_frais ? d(tx.type_frais) : "",
    kind === "viman_out" && tx.virement_to ? `→ ${d(tx.virement_to)}` : "", kind === "viman_in" && tx.virement_from ? `← ${d(tx.virement_from)}` : ""].filter(Boolean).join(" · ");
  return `<a class="row txr${tx.validation_status === "rejected" ? " txr-anile" : ""}" href="#/cycle/${h(tx.id_compte_epargne)}" data-txr="${h(tx.id_transaction_epargne)}">
    <span class="txr-le"><b class="mono">${lèTx(tx)}</b>${txF.tri.startsWith("dat") ? "" : `<small>${datKout(S.jouTx(tx))}</small>`}</span>
    <span class="txr-main"><span class="txr-t"><b>${t(LABEL_TX[kind])}</b> · ${d(non(c))} ${badgeTx(tx)}</span>
      <span class="mut sm txr-d">${detay}</span>
      ${kanè[0] === "—" && kanè[1] === "—" ? "" : `<span class="mut sm txr-k">${t("kanè avan")} ${kanè[0]} → ${t("kanè apre")} ${kanè[1]}</span>`}
      ${tx._error ? `<span class="err-msg sm">${d(t(tx._error))}</span>` : ""}</span>
    <span class="txr-mon"><b class="${KLAS(kind)}">${SIY(kind)}${gd(tx.montant)}</b></span></a>`;
}
function lisTx(M) {
  const v = txF.q.trim().toLowerCase();
  const tous = [...M.txs.values()];
  const l = tous.filter((x) => {
    const kind = S.txKind(x);
    if (txF.tip && !(txF.tip === "viman" ? kind.startsWith("viman") : kind === txF.tip)) return false;
    if (txF.eta && etaTx(x) !== txF.eta) return false;
    if (!v) return true;
    const k = M.comptes.get(x.id_compte_epargne);
    return non(k && M.clients.get(k.id_personne)).toLowerCase().includes(v) || String(k?.no_compte || "").toLowerCase().includes(v);
  });
  const dat = (x) => String(x.date_transaction || "");
  const kl = (x) => { const k = M.comptes.get(x.id_compte_epargne); return non(k && M.clients.get(k.id_personne)); };
  const CMP = { dat_desc: (a, b) => dat(b).localeCompare(dat(a)), dat_asc: (a, b) => dat(a).localeCompare(dat(b)),
    mon_desc: (a, b) => Number(b.montant) - Number(a.montant) || dat(b).localeCompare(dat(a)),
    mon_asc: (a, b) => Number(a.montant) - Number(b.montant) || dat(b).localeCompare(dat(a)),
    kliyan: (a, b) => kl(a).localeCompare(kl(b), "fr") || dat(b).localeCompare(dat(a)) };
  l.sort(CMP[txF.tri] || CMP.dat_desc);
  const vizib = l.slice(0, txF.lim);
  let html = "";
  if (txF.tri.startsWith("dat")) {
    const gr = new Map();
    for (const x of vizib) { const j = S.jouTx(x); if (!gr.has(j)) gr.set(j, []); gr.get(j).push(x); }
    for (const [j, xs] of gr) {
      const ok = xs.filter((x) => x.validation_status !== "rejected");
      const depo = ok.filter((x) => S.txKind(x) === "depo").reduce((a, x) => a + Number(x.montant || 0), 0);
      html += `<section class="txj"><div class="txj-h"><h3>${jouLabel(M, j)}</h3><span class="mut sm">${xs.length} ${t(xs.length > 1 ? "tranzaksyon" : "tranzaksyon")}${depo ? ` · ${t("Depo")} <b class="in">+${gd(depo)}</b>` : ""}</span></div>
        <div class="list tx-lis">${xs.map((x) => rowTx(M, x)).join("")}</div></section>`;
    }
  } else html = `<div class="list tx-lis">${vizib.map((x) => rowTx(M, x)).join("")}</div>`;
  return { html: html || `<p class="empty">${tous.length ? t("Anyen pa koresponn.") : t("Poko gen tranzaksyon.")}</p>`, n: l.length, plis: l.length > vizib.length };
}
function seksyonTx(M) {
  const r = lisTx(M);
  const sel = (id, lbl, L, v) => `<label class="tx-sel"><span>${lbl}</span><select id="${id}">${L.map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${t(l)}</option>`).join("")}</select></label>`;
  return `<section class="tx-seksyon"><h2>Tranzaksyon yo <small id="tx-n">${r.n}</small></h2>
    <div class="tx-tool">
      <input id="tx-q" type="search" class="search" placeholder="Chèche kliyan oswa nimewo kont…" aria-label="Chèche tranzaksyon" value="${h(txF.q)}" autocomplete="off">
      ${sel("tx-tri", "Triye pa", TX_TRI, txF.tri)}${sel("tx-tip", "Tip", TX_TIP, txF.tip)}${sel("tx-eta", "Eta", TX_ETA, txF.eta)}
    </div>
    <div id="tx-kò">${r.html}${r.plis ? `<button type="button" class="btn block" id="tx-plis">${t("Montre plis")}</button>` : ""}</div></section>`;
}
function brancheTx(M) {
  const rann = () => {
    const r = lisTx(M);
    document.getElementById("tx-kò").innerHTML = r.html + (r.plis ? `<button type="button" class="btn block" id="tx-plis">${t("Montre plis")}</button>` : "");
    document.getElementById("tx-n").textContent = r.n;
    plis();
  };
  const plis = () => { const b = document.getElementById("tx-plis"); if (b) b.onclick = () => { txF.lim += 100; rann(); }; };
  const q = document.getElementById("tx-q"); if (!q) return;
  q.oninput = () => { txF.q = q.value; txF.lim = 100; rann(); };
  for (const [id, k] of [["tx-tri", "tri"], ["tx-tip", "tip"], ["tx-eta", "eta"]]) document.getElementById(id).onchange = (e) => { txF[k] = e.target.value; txF.lim = 100; rann(); };
  plis();
}
function ctxKontRow(M, k, sekyon, swiviJodi) {
  const c = M.clients.get(k.id_personne) || {};
  return {
    k, c, man: estManager(), sekyon, ok: k._jodi >= Number(k.montant_plan || 0), jodiPeman: k._jodiPeman,
    fidbakJodi: swiviJodi.get(k.id_compte_epargne) || null, dots: k._dots, heat: k._heat, anReta: k._anReta, aRekipere: k._aRekipere,
    plan: Number(k.montant_plan || 0), jodiMontan: k._jodi, solde: estManager() ? k._solde : null, pwosan: k._pwosan,
    nPeye: k._joursPeye.size, nPrevu: k._prevuTotal, noKont: k.no_compte || null, nonKliyan: non(c), today: M.today,
  };
}
async function viewEpay() {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const man = estManager();
  const enAtant = [...M.demandes.values()].filter((x) => x.statut === "en_attente").sort((a, b) => String(a.capture_le).localeCompare(String(b.capture_le)));
  if (ongEpay === "valid" && !man) ongEpay = "kont";
  const swivis = [...M.suivis.values()].sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
  const jouSwivi = (x) => S.jouLokal(new Date(x.capture_le));
  const semenDe = S.ajouteJou(M.today, -6);
  const nFbJodi = swivis.filter((x) => jouSwivi(x) === M.today).length, nFbSemen = swivis.filter((x) => jouSwivi(x) >= semenDe).length;
  const modifAtant = [...M.modif.values()].filter((x) => x.statut === "an_atant").sort((a, b) => String(a.kreye_le).localeCompare(String(b.kreye_le)));
  const ongs = [["kont", "Kont", null], ["tx", "Tranzaksyon", null], ["fidbak", "Fidbak", nFbJodi || null], ...(man ? [["valid", "Validasyon", (enAtant.length + modifAtant.length) || null]] : [])];
  const st = statsEpay(M);
  const swiviJodi = new Map([...M.suivis.values()].filter((x) => S.jouLokal(new Date(x.capture_le)) === M.today).map((x) => [x.id_compte_epargne, x.motif]));
  const pouJodi = [...M.comptes.values()].filter((k) => k._jodiPeman).sort((a, b) => (a._jodi >= a.montant_plan) - (b._jodi >= b.montant_plan));
  const aktif = [...M.comptes.values()].filter((k) => k._actif)
    .sort((a, b) => non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne))));
  const P = L().parts;
  const rowsKont = () => {
    const v = filtEpay.trim().toLowerCase();
    const l = aktif.filter((k) => (filtKont === "jodi" ? k._jodiPeman : filtKont === "reta" ? k._anReta > 0 : true))
      .filter((k) => !v || non(M.clients.get(k.id_personne)).toLowerCase().includes(v) || String(k.no_compte || "").toLowerCase().includes(v));
    return l.map((k) => P.kontRow(ctxKontRow(M, k, "aktif", swiviJodi))).join("") || `<p class="empty">${v || filtKont !== "tout" ? t("Anyen pa koresponn.") : t("Pa gen kont ak cycle aktif.")}</p>`;
  };
  const ctx = {
    ...ctxBase(M), isoJou: S.isoJou(M.today), ong: ongEpay, ongs, stats: st, filt: filtKont, q: filtEpay, nJodi: pouJodi.length, nKont: aktif.length, nEnAtant: enAtant.length,
    jodiHtml: pouJodi.map((k) => P.kontRow(ctxKontRow(M, k, "jodi", swiviJodi))).join(""), kontHtml: rowsKont(),
    txHtml: "", demannHtml: "", validHtml: "", fidbakHtml: "", fidbakFilt: "", fidbakVid: "", nFidbak: 0, filtFb: filtFidbak,
  };
  if (ongEpay === "fidbak") {
    const lis = swivis.filter((x) => (filtFidbak === "jodi" ? jouSwivi(x) === M.today : filtFidbak === "semen" ? jouSwivi(x) >= semenDe : true));
    const FF = [["jodi", "Jodi a", nFbJodi], ["semen", "7 jou", nFbSemen], ["tout", "Tout", swivis.length]];
    ctx.fidbakFilt = `<div class="chips filt" role="group" aria-label="Filt fidbak">${FF.map(([v, l, n]) => `<button type="button" class="chip ${filtFidbak === v ? "on" : ""}" data-ffb="${v}" aria-pressed="${filtFidbak === v}">${l}<small>${n}</small></button>`).join("")}</div>`;
    ctx.fidbakHtml = lis.map((x) => liSwivi(M, x)).join("");
    ctx.nFidbak = lis.length;
    ctx.fidbakVid = filtFidbak === "jodi" ? "Pa gen fidbak jodi a." : filtFidbak === "semen" ? "Pa gen fidbak nan 7 dènye jou yo." : "Poko gen fidbak.";
  }
  if (ongEpay === "tx") {
    const mesDm = [...M.demandes.values()].filter((x) => man || x.agent_id === moi.id || x.agent_id === "moi")
      .sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le))).slice(0, 20);
    const mesModif = [...M.modif.values()].filter((x) => man || mwenSe(x.agent_id)).sort((a, b) => String(b.kreye_le).localeCompare(String(a.kreye_le))).slice(0, 20);
    ctx.demannHtml = mesDm.map((x) => liDemande(M, x)).join("") + mesModif.map((x) => liModif(M, x)).join("");
    ctx.txHtml = seksyonTx(M);
  }
  if (ongEpay === "valid") ctx.validHtml = enAtant.map((x) => liDemande(M, x, { decide: true })).join("")
    + (modifAtant.length ? `<h2>${t("Demann modifikasyon")}</h2>${modifAtant.map((x) => liModif(M, x, { decide: true })).join("")}` : "");
  $app.innerHTML = `<div id="epay">${P.epay(ctx)}</div>`;
  // Apre yon klik sou onglè/filt, paj la re-rann: remete fokis la sou menm bouton an (klavye / lektè ekran).
  const reRann = (sel) => viewEpay().then(() => requestAnimationFrame(() => $app.querySelector(sel)?.focus({ preventScroll: true })));
  $app.querySelectorAll("[data-ong]").forEach((b) => (b.onclick = () => { ongEpay = b.dataset.ong; reRann(`[data-ong="${ongEpay}"]`); }));
  $app.querySelectorAll("[data-filt]").forEach((b) => (b.onclick = () => { filtKont = b.dataset.filt; reRann(`[data-filt="${filtKont}"]`); }));
  $app.querySelectorAll("[data-ffb]").forEach((b) => (b.onclick = () => { filtFidbak = b.dataset.ffb; reRann(`[data-ffb="${filtFidbak}"]`); }));
  const q = document.getElementById("q");
  if (q) q.oninput = () => { filtEpay = q.value; const box = document.getElementById("kont"); if (box) { box.innerHTML = rowsKont(); brancherKont(); } };
  const brancherKont = () => $app.querySelectorAll("[data-papeye]").forEach((b) => (b.onclick = () => { const k = M.comptes.get(b.dataset.papeye); paPeye(k, M.clients.get(k.id_personne) || {}); }));
  brancherKont();
  brancheTx(M);
  $app.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => decider(M, b.dataset.ok, true)));
  $app.querySelectorAll("[data-non]").forEach((b) => (b.onclick = () => decider(M, b.dataset.non, false)));
  $app.querySelectorAll("[data-mok]").forEach((b) => (b.onclick = () => decideModif(M, b.dataset.mok, true)));
  $app.querySelectorAll("[data-mnon]").forEach((b) => (b.onclick = () => decideModif(M, b.dataset.mnon, false)));
}

// ---------- 4. Rapò ajan an (3 dènye jou) ----------
let jouRapo = 0;
async function viewRapo() {
  const M = await S.model();
  const jou = [0, 1, 2].map((n) => S.ajouteJou(M.today, -n));
  const D = jou[jouRapo];
  const mwen = (x) => x.created_by === moi.id || x.created_by === "moi" || x.agent_id === moi.id || x.agent_id === "moi";
  const txs = [...M.txs.values()].filter((x) => mwen(x) && S.jouTx(x) === D && x.validation_status !== "rejected")
    .sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)));
  const par = (k) => txs.filter((x) => S.txKind(x) === k);
  const sum = (l) => l.reduce((a, x) => a + Number(x.montant || 0), 0);
  const dep = par("depo"), ret = par("retre"), fre = par("fre"), vim = par("viman_out");
  const depo = sum(dep), retre = sum(ret);
  const deklare = txs.reduce((a, x) => a + Number(x.solde_declare || 0), 0);
  const nDeklare = txs.filter((x) => x.solde_declare != null && x.solde_declare !== "").length;
  const cycles = [...M.comptes.values()].filter((k) => mwen(k) && k.created_at && S.jouLokal(new Date(k.created_at)) === D).length;
  const swivi = [...M.suivis.values()].filter((x) => mwen(x) && S.jouLokal(new Date(x.capture_le)) === D).length;
  const dmAtant = [...M.demandes.values()].filter((x) => mwen(x) && x.statut === "en_attente").length;
  const poko = txs.filter((x) => x._pending).length;
  const nonJou = (n) => (n === 0 ? "Jodi a" : n === 1 ? "Yè" : "Avan-yè");
  // Swivi kliyan jou sa a: peye / fidbak / poko wè (sèlman jodi a gen sans pou "poko wè")
  const jodiKont = [...M.comptes.values()].filter((k) => k._actif && k.jours_paiement?.includes(S.isoJou(D)) && k.date_debut <= D && !M.feries.has(D));
  const peyeJou = jodiKont.filter((k) => k._joursPeye.has(D)).length;
  const fidbakJou = new Set([...M.suivis.values()].filter((x) => S.jouLokal(new Date(x.capture_le)) === D).map((x) => x.id_compte_epargne));
  const fidbakN = jodiKont.filter((k) => !k._joursPeye.has(D) && fidbakJou.has(k.id_compte_epargne)).length;
  const ctx = {
    ...ctxBase(M), isoJou: S.isoJou(D), i: jouRapo, D, nonJou,
    jou: jou.map((date, i) => ({ i, date, label: nonJou(i), on: i === jouRapo })),
    kpi: { depo, nDepo: dep.length, retre, nRetre: ret.length, fre: sum(fre), nFre: fre.length, vim: sum(vim), nVim: vim.length,
      deklare, nDeklare, cycles, swivi, dmAtant, kach: depo - retre },
    swiviStats: { total: jodiKont.length, peye: peyeJou, fidbak: fidbakN, pokoWe: Math.max(0, jodiKont.length - peyeJou - fidbakN) },
    parLe: S.kolekParLe(txs), poko, txHtml: txs.map((x) => liTx(M, x)).join(""), nTx: txs.length,
  };
  $app.innerHTML = `<div id="rapo">${L().parts.rapo(ctx)}</div>`;
  $app.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { jouRapo = Number(b.dataset.j); viewRapo().then(() => requestAnimationFrame(() => $app.querySelector(`[data-j="${jouRapo}"]`)?.focus({ preventScroll: true }))); }));
}

// ---------- Chan okipasyon (komen pou nouvo kliyan ak modifye) ----------
const opt = (v, cur, label = v) => `<option value="${h(v)}" ${v === cur ? "selected" : ""}>${h(label)}</option>`;
function champsOccupation(c = {}) {
  const sec = c.secteur || (c.activite && TX.secteurDe(c.activite)) || "";
  return `
    <label>Kote biznis la * <small class="mut">(ri, mache, zòn)</small><input name="lieu_de_travail" value="${h(c.lieu_de_travail || "")}" autocomplete="off" required></label>
    <label>Adrès<input name="adresse" value="${h(c.adresse || "")}" autocomplete="off"></label>
    <div class="grid2">
      <label>Sektè *<select name="secteur" required><option value="">Chwazi…</option>${Object.keys(TX.SECTEURS).map((x) => opt(x, sec)).join("")}</select></label>
      <label>Aktivite *<select name="activite" required ${sec ? "" : "disabled"}>${sec ? `<option value="">Chwazi…</option>${TX.SECTEURS[sec].map((x) => opt(x, c.activite)).join("")}` : `<option value="">Chwazi sektè a anvan</option>`}</select></label>
    </div>
    <div class="grid2">
      <label>Pwen de vant *<select name="point_de_vente" required><option value="">Chwazi…</option>${TX.POINTS_DE_VENTE.map((x) => opt(x, c.point_de_vente)).join("")}</select></label>
      <label>Kapasite distribisyon *<select name="capacite_distribution" required><option value="">Chwazi…</option>${TX.CAPACITES.map((x) => opt(x, c.capacite_distribution)).join("")}</select></label>
    </div>`;
}
const PIECES = ["NIF", "CIN", "Passeport"];
const ageMax = () => S.ajouteJou(S.jodi(), -16 * 365 - 4);
const champPseudo = (c = {}) => `<label>Pseudo <small class="mut">(non yo konnen l)</small><input name="pseudo" value="${h(c.pseudo || "")}" autocomplete="off"></label>`;
function champsIdentite(c = {}) {
  return `
    <label>Dat nesans<input name="date_naissance" type="date" value="${h(c.date_naissance || "")}" max="${ageMax()}" min="1915-01-01"></label>
    <div class="grid2">
      <label>Pyès idantifikasyon<select name="piece"><option value="">Chwazi…</option>${PIECES.map((x) => opt(x, c.piece)).join("")}</select></label>
      <label>Nimewo idantifikasyon<input name="numero_piece" value="${h(c.numero_piece || "")}" autocomplete="off" ${c.piece ? "" : "disabled"} placeholder="${c.piece === "NIF" ? "000-000-000-0" : ""}"></label>
    </div>
    <p class="mut sm" id="piece-hint"></p>`;
}
// NIF: 10 chif, fòma 000-000-000-0. CIN: 10 chif. Paspò: 6 a 12 lèt/chif.
function verifierPiece(type, num) {
  const n = String(num || "").trim();
  if (!type || !n) return null;
  const dg = n.replace(/\D/g, "");
  if (type === "NIF" && dg.length !== 10) return "Yon NIF dwe gen 10 chif (000-000-000-0).";
  if (type === "CIN" && dg.length !== 10) return "Yon CIN dwe gen 10 chif.";
  if (type === "Passeport" && !/^[A-Za-z0-9]{6,12}$/.test(n.replace(/[\s-]/g, ""))) return "Yon nimewo paspò dwe gen 6 a 12 lèt oswa chif.";
  return null;
}
function brancherIdentite(f) {
  const hint = () => (document.getElementById("piece-hint").textContent = t(verifierPiece(f.piece.value, f.numero_piece.value) || ""));
  f.piece.onchange = () => {
    f.numero_piece.disabled = !f.piece.value;
    f.numero_piece.placeholder = f.piece.value === "NIF" ? "000-000-000-0" : "";
    if (f.piece.value) f.numero_piece.focus();
    hint();
  };
  f.numero_piece.oninput = () => {
    if (f.piece.value === "NIF") { // fòma otomatik 000-000-000-0
      const dg = f.numero_piece.value.replace(/\D/g, "").slice(0, 10);
      f.numero_piece.value = [dg.slice(0, 3), dg.slice(3, 6), dg.slice(6, 9), dg.slice(9)].filter(Boolean).join("-");
    }
    hint();
  };
}
async function okIdentite(f, err) {
  const v = Object.fromEntries(new FormData(f));
  if (v.piece && !String(v.numero_piece || "").trim()) { err.textContent = t("Mete nimewo pyès la."); return false; }
  if (v.date_naissance && v.date_naissance > ageMax()) { err.textContent = t("Kliyan an dwe gen omwen 16 an."); return false; }
  const pb = verifierPiece(v.piece, v.numero_piece);
  if (pb && !(await ui.ask({ titre: "Verifye nimewo pyès la", tekst: pb, ok: "Kontinye", anile: "Korije", ikon: "!" }))) return false;
  return true;
}
const age = (iso) => { if (!iso) return null; const [y, m, j] = iso.split("-").map(Number); const n = new Date(); let a = n.getFullYear() - y; if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < j)) a--; return a; };

function brancherOccupation(f) {
  f.secteur.onchange = () => {
    const l = TX.SECTEURS[f.secteur.value];
    f.activite.disabled = !l;
    f.activite.innerHTML = l ? `<option value="">${t("Chwazi…")}</option>${l.map((x) => opt(x, "")).join("")}` : `<option value="">${t("Chwazi sektè a anvan")}</option>`;
  };
}
// Chan obligatwa yo: make sa ki manke an wouj epi mete fokis sou premye a.
const OBLIGATWA = [["lieu_de_travail", "Kote biznis la"], ["secteur", "Sektè"], ["activite", "Aktivite"],
  ["point_de_vente", "Pwen de vant"], ["capacite_distribution", "Kapasite distribisyon"]];
function okObligatwa(f, err, { photo } = {}) {
  f.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
  const manke = OBLIGATWA.filter(([k]) => !String(f[k]?.value || "").trim());
  if (photo === null) manke.push(["photo", "Foto kliyan an"]);
  if (!manke.length) return true;
  manke.forEach(([k]) => f[k]?.setAttribute("aria-invalid", "true"));
  err.textContent = `${t("Chan sa yo obligatwa")}: ${manke.map(([, l]) => t(l)).join(", ")}.`;
  f[manke[0][0]]?.focus();
  return false;
}
const valeursOccupation = (v) => Object.fromEntries(S.CHAN_FICH.map((k) => [k, (v[k] || "").trim()]));
function brancherGps(el, cb) {
  const txt = el.querySelector(".gps-t");
  const go_ = async () => {
    txt.textContent = t("GPS: ap chèche…"); txt.classList.remove("err-t");
    const g = await getGps(15000, { fre: true }); cb(g);
    if (!g) { txt.textContent = t("GPS: pa jwenn (pa obligatwa)"); return; }
    // Laptop ak telefòn san GPS aktive bay yon pozisyon apwoksimatif (Wi-Fi/IP): avèti ajan an.
    if (g.acc > 100) { txt.classList.add("err-t"); txt.textContent = `GPS: ±${g.acc} m — ${t("pa presi. Aktive GPS telefòn nan, ale deyò, epi peze ankò.")}`; }
    else txt.textContent = `GPS: ✓ (±${g.acc} m)`;
  };
  el.querySelector("button").onclick = go_;
  return go_;
}

// ---------- Nouvo kliyan ----------
async function viewClientNew() {
  const M = await S.model();
  $app.innerHTML = `
  <a href="#/kliyan" class="back">‹ Kliyan</a>
  <h1>Nouvo kliyan</h1>
  <form id="f" class="card form" novalidate>
    <div class="grid2">
      <label>Prenon *<input name="prenom" required autocomplete="off"></label>
      <label>Non *<input name="nom" required autocomplete="off"></label>
    </div>
    ${champPseudo()}
    <label>Telefòn * <small class="mut">(8 chif)</small><input name="telephone" inputmode="tel" required placeholder="3700 1234"></label>
    <div id="dbl" aria-live="polite"></div>
    <label>Sèks<select name="sexe"><option value="">—</option><option value="F">Fi</option><option value="M">Gason</option></select></label>
    ${champsIdentite()}
    ${champsOccupation()}
    <label>Foto kliyan an *<input name="photo" type="file" accept="image/*" capture="environment" required></label>
    <img id="prev" class="prev" alt="" hidden>
    <div class="gps" id="gps"><span class="gps-t mut sm" aria-live="polite">GPS: ap chèche…</span><button type="button" class="btn sm">Rekòmanse</button></div>
    <label class="chk"><input type="checkbox" name="cycle" checked> Kreye yon cycle Grandon touswit apre</label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">Anrejistre kliyan an</button>
  </form>`;
  const f = document.getElementById("f");
  let gps = null, photo = null;
  brancherIdentite(f);
  brancherOccupation(f);
  brancherGps(document.getElementById("gps"), (g) => (gps = g))();
  // Anti-doublon: lè telefòn nan konplè, chèche l nan tout baz la.
  let dTel = "";
  f.telephone.oninput = async () => {
    const tl = api.telefon8(f.telephone.value);
    const box = document.getElementById("dbl");
    if (!tl) { box.innerHTML = ""; dTel = ""; return; }
    if (tl === dTel || !navigator.onLine) return;
    dTel = tl;
    try {
      const rs = (await api.rechercher(tl)).filter((r) => r.tel4 === tl.slice(-4));
      if (api.telefon8(f.telephone.value) !== tl) return;
      box.innerHTML = rs.length ? `<div class="note warn"><b>Telefòn sa a deja nan baz la:</b>
        ${rs.map((r) => `<div class="row flat">${avatar(r)}<div class="grow"><b>${d(non(r))}</b><div class="mut sm">${d(r.code_client || "")} · •••• ${d(r.tel4)}</div></div>
          ${M.clients.has(r.id_personne) ? `<a class="btn sm" href="#/kliyan/${r.id_personne}">Wè fich li</a>`
            : `<button type="button" class="btn sm pri" data-adopte='${h(JSON.stringify(adopteInfo(r)))}'>Se li</button>`}</div>`).join("")}</div>` : "";
      box.querySelectorAll("[data-adopte]").forEach((b) => (b.onclick = async () => {
        const p = JSON.parse(b.dataset.adopte);
        await S.enqueue("adopte", { ...p, gps, capture_le: new Date().toISOString() });
        toast(`${p.prenom} ${p.nom} · ${t("Ajoute")} ✓`);
        go(f.cycle.checked ? `#/cycle/nouvo/${p.id}` : `#/kliyan/${p.id}`);
      }));
    } catch { /* offline oswa erè: sèvè a ap verifye lè l voye */ }
  };
  f.photo.onchange = async () => {
    const file = f.photo.files[0];
    if (!file) return;
    try {
      photo = await compress(file);
      const img = document.getElementById("prev");
      img.src = URL.createObjectURL(photo);
      img.hidden = false;
    } catch { toast("Foto a pa ka li.", "err"); }
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const v = Object.fromEntries(new FormData(f));
    const tel = api.telefon8(v.telephone);
    if (!v.prenom.trim() || !v.nom.trim()) return (err.textContent = t("Mete prenon ak non kliyan an."));
    if (!tel) return (err.textContent = t("Nimewo telefòn nan dwe gen 8 chif."));
    if (!okObligatwa(f, err, { photo })) return;
    if (!(await okIdentite(f, err))) return;
    const dbl = [...M.clients.values()].find((c) => String(c.telephone || "").replace(/\D/g, "").endsWith(tel));
    if (dbl && !(await ui.ask({ titre: "Kliyan sa a deja egziste?", tekst: `${non(dbl)} · ${t("gen menm telefòn lan.")}`, foto: dbl.photo_url,
      ok: "Kreye yon lòt kanmenm", anile: "Wè fich li", ikon: "!" }))) return go(`#/kliyan/${dbl.id_personne}`);
    const id = S.uuid();
    let photo_id = null;
    if (photo) { photo_id = S.uuid(); await db.put("photos", { id: photo_id, blob: photo }); }
    const code_client = S.kodKliyan(v.prenom, v.nom);
    await S.enqueue("client", {
      id, prenom: v.prenom.trim(), nom: v.nom.trim(), telephone: tel, sexe: v.sexe, code_client,
      ...valeursOccupation(v), gps, photo_id, capture_le: new Date().toISOString(),
    });
    toast(`${t(navigator.onLine ? "Kliyan anrejistre." : "Kliyan anrejistre sou telefòn nan. L ap voye lè gen entènèt.")} · ${code_client}`, "ok", 5000);
    go(f.cycle.checked ? `#/cycle/nouvo/${id}` : `#/kliyan/${id}`);
  };
}

// ---------- Modifye fich kliyan an ----------
function banyèModif(M, id) {
  if (estManager()) return "";
  const oto = otorizasyon(M, "kliyan", id), dm = demannModif(M, "kliyan", id);
  if (oto) return `<p class="note info-note">${t("Otorizasyon apwouve pou modifye")}: ${oto.chan.map((c) => t(etikètChan("kliyan", c))).join(", ")}. <a href="#/kliyan/${h(id)}/modifye">${t("Modifye kounye a")}</a></p>`;
  if (dm) return `<p class="note warn">${t("Demann modifikasyon ou an an atant otorizasyon manadjè a.")}</p>`;
  return "";
}

async function viewClientEdit(id) {
  const M = await S.model();
  const c = M.clients.get(id);
  if (!c) return go("#/kliyan");
  const man = estManager();
  const oto = man ? null : otorizasyon(M, "kliyan", id);
  // Ajan san otorizasyon: li mande (chan egzak + rezon). Manadjè a deside nan Epay → Validasyon.
  if (!man && !oto) {
    const dm = demannModif(M, "kliyan", id);
    const dènye = [...M.modif.values()].filter((x) => x.kind === "kliyan" && x.ref_id === id && mwenSe(x.agent_id)).sort((a, b) => String(b.kreye_le).localeCompare(String(a.kreye_le)))[0];
    $app.innerHTML = `
    <a href="#/kliyan/${id}" class="back">‹ ${d(non(c))}</a>
    <h1>Modifye enfòmasyon yo</h1>
    <div class="card">
      <p>${t("Pou modifye fich yon kliyan, ou bezwen otorizasyon yon manadjè. Di egzakteman ki chan ou bezwen chanje (telefòn, adrès…) ak poukisa.")}</p>
      ${dm ? `<p class="note warn">${t("Demann ou an an atant. Ou ap ka modifye lè manadjè a apwouve l.")}</p>` : `<button type="button" class="btn pri block" id="mande">${t("Mande otorizasyon")}</button>`}
    </div>
    ${dènye ? `<h2>${t("Dènye demann")}</h2><div class="list">${liModif(M, dènye)}</div>` : ""}`;
    document.getElementById("mande")?.addEventListener("click", () => mandeModif(M, "kliyan", id, { tekst: non(c), chan: CHAN_KLIYAN, siprime: "Retire kliyan an nan Grandon", deps: c._pending ? [id] : [] }));
    return;
  }
  $app.innerHTML = `
  <a href="#/kliyan/${id}" class="back">‹ ${d(non(c))}</a>
  <h1>Modifye enfòmasyon yo</h1>
  ${oto ? `<p class="note info-note">${t("Otorizasyon an valab yon sèl fwa, pou chan sa yo sèlman")}: <b>${oto.chan.map((k) => t(etikètChan("kliyan", k))).join(", ")}</b>.</p>` : ""}
  <form id="f" class="card form" novalidate>
    <div class="grid2"><label>Prenon *<input name="prenom" value="${h(c.prenom || "")}" autocomplete="off"></label><label>Non *<input name="nom" value="${h(c.nom || "")}" autocomplete="off"></label></div>
    <label>Telefòn * <small class="mut">(8 chif)</small><input name="telephone" inputmode="tel" value="${h(F.telFmt(c.telephone || ""))}" autocomplete="off"></label>
    ${champPseudo(c)}
    ${champsIdentite(c)}
    ${champsOccupation(c)}
    <div class="gps" id="gps"><span class="gps-t mut sm" aria-live="polite">${c.gps_lat != null ? "GPS aktive" : "Pa gen GPS"}</span><button type="button" class="btn sm">Pran pozisyon kounye a</button></div>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">Mete ajou</button>
  </form>`;
  const f = document.getElementById("f");
  let gps = null;
  brancherIdentite(f);
  brancherOccupation(f);
  brancherGps(document.getElementById("gps"), (g) => (gps = g));
  if (oto) { // ajan: sèlman chan ki otorize yo ka chanje
    f.querySelectorAll("input, select, textarea").forEach((el) => { if (el.name && !oto.chan.includes(el.name)) { el.disabled = true; el.closest("label")?.classList.add("bloke"); } });
    if (!oto.chan.includes("gps")) { const b = document.querySelector("#gps button"); b.disabled = true; }
  }
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"); err.textContent = "";
    if (!(await okIdentite(f, err))) return;
    const v = Object.fromEntries(new FormData(f));
    const avan = { ...c, telephone: String(c.telephone || "").replace(/\D/g, "").slice(-8) };
    const chanje = (k) => k === "gps" ? !!gps : String(k === "telephone" ? String(v[k] || "").replace(/\D/g, "") : (v[k] ?? "")).trim() !== String(avan[k] ?? "").trim();
    const lis = oto ? oto.chan : CHAN_KLIYAN.map(([k]) => k).filter((k) => (k === "gps" || k in v) && chanje(k));
    if (!lis.length) return (err.textContent = t("Pa gen anyen ki chanje."));
    if (lis.includes("gps") && !gps) return (err.textContent = t("Peze «Pran pozisyon kounye a» pou GPS la."));
    if ((lis.includes("prenom") && !String(v.prenom || "").trim()) || (lis.includes("nom") && !String(v.nom || "").trim())) return (err.textContent = t("Prenon ak non pa ka vid."));
    if (lis.includes("telephone") && String(v.telephone || "").replace(/\D/g, "").length < 8) return (err.textContent = t("Nimewo telefòn nan dwe gen 8 chif."));
    const vale = {};
    for (const k of lis) {
      if (k === "gps") Object.assign(vale, { gps_lat: gps.lat, gps_lng: gps.lng, gps_precision: gps.acc });
      else vale[k] = String(v[k] ?? "").trim();
    }
    await S.enqueue("modif_aplike", { id: S.uuid(), otorizasyon: oto?.id || null, kind: "kliyan", ref: id, chan: lis, vale }, c._pending ? [id] : []);
    toast("Enfòmasyon yo anrejistre.");
    go(`#/kliyan/${id}`);
  };
}

// ---------- Fich kliyan ----------
// ---------- Alèt kliyan ----------
// Alèt sistèm (rekouvreman) + alèt manadjè ki toujou aktif. Yo parèt nan yon popup chak fwa ajan an antre
// sou paj kliyan an, cycle li oswa depo li, jiskaske pwoblèm lan rezoud.
const NIVO_ALET = { info: ["Enfòmasyon", "info"], enpotan: ["Enpòtan", "warn"], ijan: ["Ijan", "err"] };
const FEN_ALET = { manyel: "Fèmen pa yon manadjè", pa_reta: "Fèmen lè kliyan an pa an reta ankò", depo: "Fèmen lè kliyan an fè yon depo", dat: "Fèmen nan dat" };
function aletYo(k, { tout = false } = {}) {
  const l = [];
  if (k._actif && k._aRekipere > 0)
    l.push({ id: `sys-${k.id_compte_epargne}`, sistem: true, k, nivo: k._anReta >= 3 ? "ijan" : "enpotan", tit: "Rekouvreman",
      mesaj: `${t("Kliyan an dwe")} ${F.rekipere(k._aRekipere, k._anReta)}. ${t("Fè l peye anvan l ale pi lwen.")}`, _eta: "aktif" });
  for (const a of k._alet) if (tout || a._eta === "aktif") l.push({ ...a, k });
  return l.sort((a, b) => (a._eta !== "aktif") - (b._eta !== "aktif") || ["ijan", "enpotan", "info"].indexOf(a.nivo) - ["ijan", "enpotan", "info"].indexOf(b.nivo));
}
function liAlet(a, { man = false, kont = false } = {}) {
  const [nl, kl] = NIVO_ALET[a.nivo] || NIVO_ALET.enpotan;
  const eta = a._eta === "fermen" ? `<span class="badge mut">${t("Fèmen")}</span>` : a._eta === "oto" ? `<span class="badge ok">${t("Rezoud otomatik")}</span>` : "";
  const sous = a.sistem ? t("Alèt sistèm · li disparèt lè kliyan an peye sa l dwe a")
    : `${nomAjan(a.kreye_pa) || t("Manadjè")} · ${lè(a.kreye_le)} · ${t(FEN_ALET[a.fen_kondisyon] || "")}${a.fen_kondisyon === "dat" && a.fen_dat ? ` ${datFr(a.fen_dat)}` : ""}`;
  return `<div class="row alet ${h(a.nivo)} ${a._eta !== "aktif" ? "fini" : ""}" data-alet="${h(a.id)}">
    <div class="grow"><b>${a.sistem ? t(a.tit) : d(a.tit)}</b> <span class="badge ${kl}">${t(nl)}</span> ${eta} ${a._pending || a._fermenPending ? `<span class="badge pend">${t("Poko voye")}</span>` : ""}
      ${kont ? `<div class="mut sm">${d(a.k.no_compte || t("Cycle poko voye"))}</div>` : ""}
      ${a.mesaj ? `<div class="sm alet-m">${a.sistem ? a.mesaj : d(a.mesaj)}</div>` : ""}
      <div class="mut sm">${sous}</div></div>
    ${man && !a.sistem && a._eta === "aktif" ? `<button type="button" class="btn sm" data-fermen="${h(a.id)}">${t("Fèmen l")}</button>` : ""}</div>`;
}
// Seksyon «Alèt» sou paj cycle/fich: manadjè wè tout (ak bouton), ajan wè sa ki aktif.
function seksyonAlet(ks, man) {
  const l = ks.flatMap((k) => aletYo(k, { tout: man }));
  const kAktif = ks.find((k) => k._actif) || ks[0];
  if (!l.length && !man) return "";
  return `<section class="alet-sek" id="alet-sek"><div class="alet-tit"><h2>Alèt</h2>${man && kAktif ? `<button type="button" class="btn sm" data-alet-nouvo="${h(kAktif.id_compte_epargne)}">＋ ${t("Alèt")}</button>` : ""}</div>
    <div class="list">${l.map((a) => liAlet(a, { man, kont: ks.length > 1 })).join("") || `<p class="empty">${t("Pa gen alèt sou kliyan sa a.")}</p>`}</div></section>`;
}
async function kreyeAlet(M, k) {
  const c = M.clients.get(k.id_personne) || {};
  const r = await ui.askAlet({ tekst: `${non(c)} · ${k.no_compte || ""}`, jodi: M.today });
  if (!r) return;
  await S.enqueue("alet", { id: S.uuid(), compte: k.id_compte_epargne, ...r, kreye_le: new Date().toISOString() }, k._pending ? [k.id_compte_epargne] : []);
  toast("Alèt la kreye.");
  aletDenye = ""; render();
}
async function fermenAlet(id) {
  if (!(await ui.ask({ titre: "Fèmen alèt la?", tekst: t("Ajan yo p ap wè l ankò."), ok: "Fèmen l" }))) return;
  await S.enqueue("alet_fermen", { id, le: new Date().toISOString() });
  toast("Alèt la fèmen.");
  aletDenye = location.hash; render();
}
function brancherAlet(M) {
  $app.querySelectorAll("[data-alet-nouvo]").forEach((b) => (b.onclick = () => kreyeAlet(M, M.comptes.get(b.dataset.aletNouvo))));
  $app.querySelectorAll("#alet-sek [data-fermen]").forEach((b) => (b.onclick = () => fermenAlet(b.dataset.fermen)));
}
// Popup la: yon fwa chak fwa ajan an antre sou paj la (pa lè paj la re-rann pou menm wout la).
let aletDenye = "";
async function montreAlet(M, ks) {
  const wout = location.hash;
  if (aletDenye === wout) return;
  aletDenye = wout;
  const l = ks.flatMap((k) => aletYo(k));
  if (!l.length) return;
  const man = estManager();
  const nivo = l.some((a) => a.nivo === "ijan") ? "ijan" : l.some((a) => a.nivo === "enpotan") ? "enpotan" : "info";
  if (prefs().son !== false) ui.son(nivo);
  const c = M.clients.get(ks[0].id_personne) || {};
  const r = await ui.aletPopup({ titre: l.length > 1 ? `${l.length} ${t("alèt sou kliyan sa a")}` : t("Alèt sou kliyan sa a"), soutit: non(c), nivo,
    html: l.map((a) => liAlet(a, { man, kont: ks.length > 1 })).join(""), nouvo: man });
  if (r?.fermen) await fermenAlet(r.fermen);
  else if (r?.nouvo) await kreyeAlet(M, ks.find((k) => k._actif) || ks[0]);
}
addEventListener("hashchange", () => { if (!/^#\/(kliyan|cycle|tx\/nouvo)\//.test(location.hash)) aletDenye = ""; });

async function viewClient(id) {
  const M = await S.model();
  const c = M.clients.get(id);
  if (!c) { $app.innerHTML = `<a href="#/kliyan" class="back">‹ Kliyan</a><p class="empty">Kliyan sa a pa sou telefòn nan.</p>`; return; }
  const man = estManager();
  const ks = S.comptesDuClient(M, id).map((k) => ({ k, href: `#/cycle/${k.id_compte_epargne}`, on: k._actif, nPeye: k._joursPeye.size, nPrevu: k._prevuTotal,
    solde: man ? k._solde : null, pwosan: k._pwosan, dots: k._dots, heat: k._heat }));
  let photo = c.photo_url || null;
  if (c.photo_id) { const ph = await db.get("photos", c.photo_id); if (ph) photo = URL.createObjectURL(ph.blob); }
  const gpsOk = c.gps_lat != null && c.gps_lng != null;
  const aj = age(c.date_naissance);
  const info = [
    { key: "telefon", label: "Telefòn", html: c.telephone ? `<a href="tel:${h(String(c.telephone).replace(/\D/g, ""))}" data-brut>${h(F.telFmt(c.telephone))}</a>` : c.tel4 ? `•••• ${h(c.tel4)}` : "" },
    { key: "pseudo", label: "Pseudo", html: c.pseudo ? d(c.pseudo) : "" },
    { key: "nesans", label: "Dat nesans", html: c.date_naissance ? `${datFr(c.date_naissance)} · ${aj} ${getLang() === "fr" ? "ans" : "an"}` : "" },
    { key: "pyes", label: "Pyès idantifikasyon", html: c.piece ? `${h(c.piece)} · ${d(c.numero_piece || "—")}` : c.numero_piece ? d(c.numero_piece) : "" },
    { key: "adres", label: "Adrès", html: c.adresse ? d(c.adresse) : "" },
    { key: "biznis", label: "Kote biznis la", html: c.lieu_de_travail ? d(c.lieu_de_travail) : "" },
    { key: "gps", label: "GPS", html: gpsOk ? `<span class="badge ok">GPS aktive</span> <a href="https://maps.google.com/?q=${c.gps_lat},${c.gps_lng}" target="_blank" rel="noopener">Wè sou kat la</a>` : `<span class="badge warn">Pa gen GPS</span>` },
    { key: "sekte", label: "Sektè", html: (c.secteur || (c.activite && TX.secteurDe(c.activite))) ? d(c.secteur || TX.secteurDe(c.activite)) : "" },
    { key: "aktivite", label: "Aktivite", html: c.activite ? d(c.activite) : "" },
    { key: "vant", label: "Pwen de vant", html: c.point_de_vente ? d(c.point_de_vente) : "" },
    { key: "kapasite", label: "Kapasite distribisyon", html: c.capacite_distribution ? d(c.capacite_distribution) : "" },
  ];
  const ctx = { ...ctxBase(M), c, photo, gpsOk, ks, age: aj, info, hrefModifye: `#/kliyan/${id}/modifye`, hrefNouvoCycle: `#/cycle/nouvo/${c.id_personne}`,
    mapsHref: gpsOk ? `https://maps.google.com/?q=${c.gps_lat},${c.gps_lng}` : null, telHref: c.telephone ? `tel:${String(c.telephone).replace(/\D/g, "")}` : null,
    errHtml: (c._error ? `<p class="note err">${d(t(c._error))} <a href="#/senk">Wè</a></p>` : "") + banyèModif(M, id) };
  const ksM = S.comptesDuClient(M, id);
  $app.innerHTML = `<div id="fich">${L().parts.fich(ctx)}${seksyonAlet(ksM, man)}</div>`;
  brancherAlet(M);
  if (ksM.length) montreAlet(M, ksM);
}

// ---------- Chwazi ----------
async function viewPick(kind) {
  const M = await S.model();
  let items;
  if (kind === "cycle") items = [...M.clients.values()];
  else items = [...M.clients.values()].filter((c) => S.comptesDuClient(M, c.id_personne).some((k) => k._actif));
  const link = (c) => {
    if (kind === "cycle") return `#/cycle/nouvo/${c.id_personne}`;
    const ks = S.comptesDuClient(M, c.id_personne).filter((k) => k._actif);
    return ks.length === 1 ? `#/tx/nouvo/${ks[0].id_compte_epargne}` : `#/kliyan/${c.id_personne}`;
  };
  const titre = kind === "cycle" ? "Nouvo cycle: chwazi kliyan an" : "Depo / Retrè: chwazi kliyan an";
  const draw = (q) => lisKliyan({ ...M, clients: new Map(items.map((c) => [c.id_personne, c])) }, q).map((c) => liKliyan(M, c, link(c))).join("")
    || `<p class="empty">${kind === "cycle" ? "Pa gen kliyan. Kreye yon nouvo kliyan." : "Pa gen kliyan ki gen yon cycle aktif."}</p>`;
  $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><h1>${titre}</h1>
    ${kind === "cycle" ? `<p class="mut sm">Kliyan an pa nan lis la? Chèche l nan <a href="#/kliyan">Kliyan</a>.</p>` : ""}
    <input id="q" type="search" class="search" placeholder="Chèche…" aria-label="Chèche kliyan"><div class="list" id="list">${draw("")}</div>`;
  const q = document.getElementById("q");
  q.oninput = () => (document.getElementById("list").innerHTML = draw(q.value));
}

// ---------- Nouvo cycle Grandon ----------
const FREKANS = [1, 2, 3, 6];
const JOU_DEFO = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 6: [1, 2, 3, 4, 5, 6] };
async function viewCycleNew(idPersonne) {
  const M = await S.model();
  const c = M.clients.get(idPersonne);
  if (!c) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Kliyan an pa jwenn.</p>`; return; }
  const plans = M.plans.length ? M.plans : [1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000, 75000, 100000];
  const dènye = S.comptesDuClient(M, idPersonne)[0];
  let freq = FREKANS.includes(dènye?.frequence_semaine) ? dènye.frequence_semaine : 2;
  let jours = dènye?.jours_paiement?.length === freq ? [...dènye.jours_paiement] : [...JOU_DEFO[freq]];
  const planDef = plans.includes(Number(dènye?.montant_plan)) ? Number(dènye.montant_plan) : plans[0];
  $app.innerHTML = `
  <a href="#/kliyan/${idPersonne}" class="back">‹ ${d(non(c))}</a>
  <h1>Nouvo cycle Grandon</h1>
  <p class="mut">${d(non(c))} · ${h(c.telephone || "")}</p>
  <form id="f" class="card form" novalidate>
    <fieldset class="field"><legend>Dire * <small class="mut">(kantite mwa)</small></legend>
      <div class="seg s5">${[2, 3, 4, 5, 6].map((m) => `<label><input type="radio" name="duree" value="${m}" ${m === (dènye?.duree_mois || 4) ? "checked" : ""}><span>${m}</span></label>`).join("")}</div>
    </fieldset>
    <fieldset class="field"><legend>Frekans * <small class="mut">(kantite fwa pa semèn)</small></legend>
      <div class="seg s4">${FREKANS.map((n) => `<label><input type="radio" name="freq" value="${n}" ${n === freq ? "checked" : ""}><span>${n}×</span></label>`).join("")}</div>
    </fieldset>
    <fieldset class="field"><legend>Jou peman yo * <small class="mut" id="jou-hint"></small></legend>
      <div class="jours" id="jours">${[1, 2, 3, 4, 5, 6, 7].map((j) => `<label ${j === 7 ? 'title="Dimanch pa yon jou peman"' : ""}><input type="checkbox" name="jou" value="${j}" ${j === 7 ? "disabled" : ""}><span>${JOU_KOUT[j]}</span></label>`).join("")}</div>
    </fieldset>
    <label>Plan * <small class="mut">(minimòm chak fwa li peye)</small>
      <select name="plan">${plans.map((p) => `<option value="${p}" ${p === planDef ? "selected" : ""}>${gd(p)}</option>`).join("")}</select></label>
    <label>Dat kòmansman<input name="debut" type="date" value="${S.jodi()}" min="${S.ajouteJou(S.jodi(), -30)}" max="${S.ajouteJou(S.jodi(), 30)}"></label>
    <div class="recap" id="recap" aria-live="polite"></div>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">Kreye cycle a</button>
  </form>`;
  const f = document.getElementById("f");
  const boxes = [...f.querySelectorAll('input[name="jou"]')];
  const syncBoxes = () => {
    boxes.forEach((b) => (b.checked = jours.includes(Number(b.value))));
    const rest = freq - jours.length;
    document.getElementById("jou-hint").textContent = rest > 0 ? `(chwazi ${rest} ankò)` : `(${freq} jou)`;
  };
  const recap = () => {
    document.getElementById("err").textContent = "";
    const duree = Number(f.duree.value), plan = Number(f.plan.value), debut = f.debut.value;
    if (!debut) return;
    const fin = S.ajouteMwa(debut, duree);
    const n = S.joursPeman(debut, S.ajouteJou(fin, -1), jours, M.feries);
    const ok = jours.length === freq;
    document.getElementById("recap").innerHTML = `
      <div><span>Fen cycle a</span><b>${datFr(fin)}</b></div>
      <div><span>Jou peman</span><b>${ok ? lisJou([...jours].sort()) : "—"}</b></div>
      <div><span>Vèsman prevwa</span><b>${ok ? n : "—"}</b><small class="mut">san dimanch ni jou ferye</small></div>
      <div><span>Total pou l sanble</span><b>${ok ? gd(plan * n) : "—"}</b><small class="mut">${gd(plan)} × ${ok ? n : "…"}</small></div>`;
  };
  f.querySelectorAll('input[name="freq"]').forEach((r) => (r.onchange = () => {
    freq = Number(r.value);
    jours = [...JOU_DEFO[freq]];
    syncBoxes(); recap();
  }));
  boxes.forEach((b) => (b.onchange = () => {
    const j = Number(b.value);
    if (b.checked) {
      if (jours.length >= freq) { if (freq === 1) jours = []; else { b.checked = false; toast(`Ou deja chwazi ${freq} jou. Retire youn anvan.`, "err", 2500); return; } }
      jours.push(j);
    } else jours = jours.filter((x) => x !== j);
    syncBoxes(); recap();
  }));
  f.oninput = recap;
  syncBoxes(); recap();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const duree = Number(f.duree.value), plan = Number(f.plan.value), debut = f.debut.value;
    if (!(duree >= 2 && duree <= 6)) return (err.textContent = "Chwazi dire a (2 a 6 mwa).");
    if (jours.length !== freq) return (err.textContent = `Chwazi egzakteman ${freq} jou peman.`);
    if (!plans.includes(plan)) return (err.textContent = "Chwazi plan an.");
    if (!debut || debut < S.ajouteJou(S.jodi(), -30) || debut > S.ajouteJou(S.jodi(), 30)) return (err.textContent = "Dat kòmansman an dwe ant 30 jou pase ak 30 jou devan.");
    const js = [...jours].sort();
    if (!(await ui.ask({ titre: "Kreye cycle Grandon sa a?", ok: "Kreye cycle a", foto: c.photo_url, detay: [
      ["Kliyan", non(c)], ["Dire", `${duree} ${t("mwa")}`], ["Frekans", `${freq}× ${t("pa semèn")}`],
      ["Jou peman", js.map((j) => t(JOU[j])).join(", ")], ["Plan", `${gd(plan)}`], ["Fen cycle a", datFr(S.ajouteMwa(debut, duree))],
      ["Vèsman prevwa", String(S.joursPeman(debut, S.ajouteJou(S.ajouteMwa(debut, duree), -1), js, M.feries))],
      ["Total pou l sanble", gd(plan * S.joursPeman(debut, S.ajouteJou(S.ajouteMwa(debut, duree), -1), js, M.feries))]] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const id = S.uuid();
    const gps = await getGps(5000);
    const no_compte = S.noKont(c.code_client);
    await S.enqueue("cycle", {
      id, id_personne: idPersonne, duree, frequence: freq, jours: js, montant: plan, date_debut: debut,
      gps, capture_le: new Date().toISOString(), appareil: S.appareil(), no_compte,
    }, c._pending ? [idPersonne] : []);
    toast(`${t("Cycle la anrejistre.")}${no_compte ? ` · ${no_compte}` : ""}`, "ok", 5000);
    go(`#/cycle/${id}`);
  };
}

// ---------- Fich cycle ----------
async function viewCycle(id) {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const k = M.comptes.get(id);
  if (!k) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Cycle sa a pa sou telefòn nan.</p>`; return; }
  const c = M.clients.get(k.id_personne) || {};
  const man = estManager();
  const ctx = {
    ...ctxBase(M), k, c, fè: k._joursPeye.size, prevu: k._prevu, dots: k._dots, heat: k._heat, nPeye: k._joursPeye.size, nPrevu: k._prevuTotal, pwosan: k._pwosan,
    solde: man ? k._solde : null, soldeValide: k.solde_actuel, depoAnAtant: k.depo_an_atant, local: k._local, nDepots: k._nDepots, depots: k._depots,
    prevuTotal: k._prevuTotal, totalPrevu: k._totalPrevu, anReta: k._anReta, aRekipere: k._aRekipere,
    badges: { kont: badgeKont(k), pend: badgePend(k) }, hrefTx: `#/tx/nouvo/${k.id_compte_epargne}`, hrefKliyan: `#/kliyan/${c.id_personne}`,
    errHtml: k._error ? `<p class="note err">${d(t(k._error))} <a href="#/senk">Wè</a></p>` : "",
  };
  $app.innerHTML = `<div id="cycle">${L().parts.cycleTop(ctx)}
  ${seksyonAlet([k], man)}
  ${k._demandes.length ? `<h2>Demann retrè ak viman</h2><div class="list">${k._demandes.map((x) => liDemande(M, x, { decide: man })).join("")}</div>` : ""}
  ${k._suivis.length ? `<h2>Fidbak</h2><div class="list">${k._suivis.map((x) => liSwivi(M, x, { kliyan: false })).join("")}</div>` : ""}
  <h2>Tranzaksyon</h2>
  ${(() => { const otos = k._txs.map((x) => otorizasyon(M, "tx", x.id_transaction_epargne)).filter(Boolean);
    return otos.length ? `<p class="note info-note">${t("Otorizasyon apwouve: peze sou tranzaksyon an pou modifye l")} (${otos.map((o) => o.chan.map((c) => t(etikètChan("tx", c))).join(", ")).join(" · ")}).</p>` : ""; })()}
  <p class="mut sm">${t(estManager() ? "Peze sou yon tranzaksyon pou modifye oswa anile l." : "Peze sou yon tranzaksyon pou mande otorizasyon pou modifye oswa anile l.")}</p>
  <div class="list">${k._txs.map((x) => liTx(M, x, { kliyan: false, bouton: true })).join("") || `<p class="empty">Poko gen tranzaksyon.</p>`}</div></div>`;
  document.getElementById("papeye")?.addEventListener("click", () => paPeye(k, c));
  $app.querySelectorAll("[data-tx]").forEach((b) => (b.onclick = () => aksyonTx(M, b.dataset.tx)));
  brancherAlet(M);
  montreAlet(M, [k]);
  $app.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => decider(M, b.dataset.ok, true)));
  $app.querySelectorAll("[data-non]").forEach((b) => (b.onclick = () => decider(M, b.dataset.non, false)));
}

// ---------- Nouvo tranzaksyon: Depo, Frè, Retrè, Viman ----------
const TIP_TX = [["D", "Depo"], ["FL", "Frè"], ["R", "Retrè"], ["V", "Viman"]];
async function viewTxNew(compteId) {
  const M = await S.model();
  const k = M.comptes.get(compteId);
  const c = k && M.clients.get(k.id_personne);
  if (!k) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Cycle la pa jwenn.</p>`; return; }
  const plan = Number(k.montant_plan || 0);
  const lòt = [...M.comptes.values()].filter((x) => x.id_compte_epargne !== compteId && x.no_compte)
    .sort((a, b) => non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne))));
  $app.innerHTML = `
  <a href="#/cycle/${k.id_compte_epargne}" class="back">‹ ${d(k.no_compte || t("Cycle"))}</a>
  <h1>Tranzaksyon</h1>
  <p class="mut">${d(non(c))} · ${d(k.no_compte || t("cycle poko voye"))} · plan ${gd(plan)}</p>
  <form id="f" class="card form" novalidate>
    <fieldset class="field"><legend class="sr">Tip</legend><div class="seg s4">
      ${TIP_TX.map(([v, l], i) => `<label><input type="radio" name="type" value="${v}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
    <p class="note info-note" id="oto" hidden>Sa a bezwen otorizasyon yon manadjè. Peye kliyan an sèlman lè demann lan apwouve.</p>
    <label id="l-fre" hidden>Tip frè *<select name="type_frais"><option value="">Chwazi…</option>${TYPES_FRE.map((x) => opt(x, "")).join("")}</select></label>
    <label id="l-dest" hidden>Kont ki resevwa viman an *<select name="dest"><option value="">Chwazi…</option>${lòt.map((x) => `<option value="${x.id_compte_epargne}">${h(non(M.clients.get(x.id_personne)))} · ${h(x.no_compte)}</option>`).join("")}</select></label>
    <label>Montan (goud) *<input name="montant" type="number" inputmode="decimal" min="1" step="any" required value="${plan || ""}"></label>
    <p class="mut sm" id="hint"></p>
    <div class="grid2">
      <label>Balans kanè a avan *<input name="solde_avant" type="number" inputmode="decimal" min="0" step="any" required></label>
      <label>Balans kanè a apre *<input name="solde" type="number" inputmode="decimal" min="0" step="any" required></label>
    </div>
    <label>Nòt<textarea name="note" rows="2"></textarea></label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit" id="go">Anrejistre</button>
  </form>`;
  montreAlet(M, [k]);
  const f = document.getElementById("f");
  const maj = () => {
    const tp = f.type.value;
    document.getElementById("oto").hidden = !(tp === "R" || tp === "V");
    document.getElementById("l-fre").hidden = tp !== "FL";
    document.getElementById("l-dest").hidden = tp !== "V";
    document.getElementById("go").textContent = t(tp === "R" || tp === "V" ? "Voye demann lan" : "Anrejistre");
    document.getElementById("hint").textContent = tp === "D" ? `${t("Minimòm plan an")}: ${gd(plan)}${k._jodi ? ` · ${t("deja peye jodi a")}: ${gd(k._jodi)}` : ""}`
      : tp === "FL" ? t("Frè a soti sou kont kliyan an. Li pa afekte kach ou.") : tp === "V" ? t("Kòb la ap soti sou kont sa a pou l antre sou lòt kont lan.") : "";
  };
  f.querySelectorAll('input[name="type"]').forEach((r) => (r.onchange = () => { f.montant.value = r.value === "D" ? plan || "" : ""; maj(); }));
  maj();
  // Si balans avan an ak montan an la, kalkile balans apre a.
  const autoApre = () => {
    const av = f.solde_avant.value, m = Number(f.montant.value);
    if (av === "" || !(m > 0) || f.solde.dataset.manuel) return;
    f.solde.value = Number(av) + (f.type.value === "D" ? m : -m);
  };
  f.solde_avant.oninput = autoApre; f.montant.addEventListener("input", autoApre);
  f.solde.oninput = () => (f.solde.dataset.manuel = "1");
  [f.solde_avant, f.solde].forEach((i) => i.addEventListener("input", () => { i.removeAttribute("aria-invalid"); f.solde.removeAttribute("aria-invalid"); }));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const typ = f.type.value, m = Number(f.montant.value);
    if (!(m > 0)) return (err.textContent = t("Mete montan an."));
    if (typ === "FL" && !f.type_frais.value) return (err.textContent = t("Chwazi tip frè a."));
    if (typ === "V" && !f.dest.value) return (err.textContent = t("Chwazi kont ki resevwa viman an."));
    // Balans kanè yo obligatwa: tranzaksyon an pa ka konfime san yo.
    for (const [chan, mesaj] of [["solde_avant", "Mete balans kanè a avan."], ["solde", "Mete balans kanè a apre."]]) {
      const v = f[chan].value.trim();
      f[chan].removeAttribute("aria-invalid");
      if (v === "" || !(Number(v) >= 0)) { f[chan].setAttribute("aria-invalid", "true"); f[chan].focus(); return (err.textContent = t(mesaj)); }
    }
    if (typ === "D" && plan && m < plan && !(await ui.ask({ titre: "Montan an pi piti pase plan an", ikon: "!", ok: "Kontinye",
      detay: [["Montan (goud)", gd(m)], ["Minimòm plan an", gd(plan)]] }))) return;
    const av = Number(f.solde_avant.value), ap = Number(f.solde.value);
    const kd = typ === "V" ? M.comptes.get(f.dest.value) : null;
    const lib = Object.fromEntries(TIP_TX)[typ];
    if (!(await ui.ask({ titre: typ === "R" || typ === "V" ? `${t("Demann")} · ${t(lib)}` : lib, ok: typ === "R" || typ === "V" ? "Voye demann lan" : "Konfime",
      foto: c?.photo_url, ikon: typ === "D" ? "+" : "−", detay: [["Kliyan", non(c)], ["Kont", k.no_compte || t("cycle poko voye")], ["Montan (goud)", gd(m)],
        ...(typ === "FL" ? [["Tip frè", f.type_frais.value]] : []),
        ...(kd ? [["Kont ki resevwa", `${non(M.clients.get(kd.id_personne))} · ${kd.no_compte}`]] : []),
        ["Balans kanè a avan", gd(av)], ["Balans kanè a apre", gd(ap)]] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const base = { id: S.uuid(), compte: k.id_compte_epargne, montant: m, solde_avant_declare: av, solde_declare: ap,
      note: f.note.value.trim() || null, gps: await getGps(5000), capture_le: new Date().toISOString() };
    const deps = k._pending ? [k.id_compte_epargne] : [];
    if (typ === "R" || typ === "V") {
      await S.enqueue("demande", { ...base, type: typ, compte_dest: kd?.id_compte_epargne || null }, deps);
      toast("Demann lan voye bay manadjè a.");
    } else {
      await S.enqueue("tx", { ...base, type: typ, type_frais: typ === "FL" ? f.type_frais.value : null, appareil: S.appareil() }, deps);
      toast(typ === "D" ? "Depo anrejistre." : "Frè a anrejistre.");
    }
    go(`#/cycle/${k.id_compte_epargne}`);
  };
}

// ---------- Jou ferye (manadjè) ----------
async function viewFeries() {
  const M = await S.model();
  const jodi = S.jodi();
  const l = [...M.feriesList].sort((a, b) => a.jour.localeCompare(b.jour));
  const avni = l.filter((x) => x.jour >= jodi), pase = l.filter((x) => x.jour < jodi).reverse().slice(0, 10);
  const li = (x) => `<div class="row"><div class="grow"><b>${datFr(x.jour)}</b> · ${t(JOU[S.isoJou(x.jour)])}<div class="mut sm" data-brut>${h(x.libelle)}</div></div>
    ${estManager() ? `<button class="btn sm danger" data-del="${x.jour}">Efase</button>` : ""}</div>`;
  $app.innerHTML = `<a href="#/param" class="back">‹ Paramèt</a><h1>Jou ferye</h1>
    <p class="mut sm">Dimanch ak jou sa yo pa konte nan vèsman prevwa yo.</p>
    ${estManager() ? `<form id="f" class="card form" novalidate><div class="grid2">
      <label>Dat *<input name="jour" type="date" required></label><label>Non jou a *<input name="libelle" required autocomplete="off"></label></div>
      <p class="err-msg" id="err" role="alert"></p><button class="btn pri" type="submit" ${navigator.onLine ? "" : "disabled"}>Ajoute jou a</button></form>` : ""}
    <h2>Pwochen jou ferye yo <small class="mut">(${avni.length})</small></h2><div class="list">${avni.map(li).join("") || `<p class="empty">Pa gen jou ferye.</p>`}</div>
    ${pase.length ? `<h2>Jou ki pase yo</h2><div class="list">${pase.map(li).join("")}</div>` : ""}`;
  const f = document.getElementById("f");
  if (f) f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    if (!f.jour.value || !f.libelle.value.trim()) return (err.textContent = t("Mete dat la ak non jou a."));
    try { await api.insertRow("grandon_jours_feries", { jour: f.jour.value, libelle: f.libelle.value.trim() }); await S.pull(); toast("Jou ferye a ajoute."); viewFeries(); }
    catch (e2) { err.textContent = e2.status === 409 || e2.code === "23505" ? t("Jou sa a deja nan lis la.") : e2.message; }
  };
  $app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!(await ui.ask({ titre: "Efase jou ferye sa a?", tekst: datFr(b.dataset.del), ok: "Efase", danje: true }))) return;
    try { await api.deleteRows(`grandon_jours_feries?jour=eq.${b.dataset.del}`); await S.pull(); viewFeries(); } catch (e2) { ui.info("Erè", e2.message); }
  }));
}

// ---------- Senkronizasyon ----------
const KIND = { client: "Kliyan", adopte: "Kliyan (ajoute)", maj: "Enfòmasyon kliyan an", cycle: "Cycle", tx: "Tranzaksyon", demande: "Demann", suivi: "Fidbak", modif_demann: "Demann modifikasyon", modif_aplike: "Modifikasyon", alet: "Alèt", alet_fermen: "Alèt (fèmen)" };
function resume(o, M) {
  const p = o.payload;
  if (o.kind === "client") return `${p.prenom} ${p.nom} · ${p.telephone}`;
  if (o.kind === "adopte") return `${p.prenom} ${p.nom} · ${p.code_client || ""}`;
  if (o.kind === "maj") return non(M.clients.get(p.id));
  if (o.kind === "suivi") { const k = M.comptes.get(p.compte); return `${t(motifLabel(p.motif))} · ${non(k && M.clients.get(k.id_personne))}`; }
  if (o.kind === "demande") { const k = M.comptes.get(p.compte); return `${p.type === "V" ? t("Viman") : t("Retrè")} ${gd(p.montant)} · ${non(k && M.clients.get(k.id_personne))}`; }
  if (o.kind === "cycle") return `${non(M.clients.get(p.id_personne))} · ${p.duree} mwa · ${p.frequence}×/sem · ${gd(p.montant)}`;
  if (o.kind === "modif_demann" || o.kind === "modif_aplike") return `${ciblModif(M, p.kind, p.ref)} · ${(p.chan || []).map((k) => t(etikètChan(p.kind, k))).join(", ") || t("Siprime")}`;
  if (o.kind === "alet" || o.kind === "alet_fermen") return p.tit || "";
  const k = M.comptes.get(p.compte);
  return `${p.type === "D" ? "Depo" : "Retrè"} ${gd(p.montant)} · ${non(k && M.clients.get(k.id_personne))}`;
}
// ---------- Paramèt: kont mwen, aparans, administrasyon ----------
async function viewParam() {
  const M = await S.model();
  const pref = prefs();
  $app.innerHTML = `
  <div class="page-head"><h1>Paramèt</h1></div>
  <h2>Kont mwen</h2>
  <div class="card">
    <div class="kv"><span>Non</span><b>${h(moi.nom)}</b></div>
    ${moi.tel ? `<div class="kv"><span>Telefòn</span><b>${h(moi.tel)}</b></div>` : ""}
    <div class="kv"><span>Wòl</span><b>${h(WOL[moi.role] || "Anplwaye")}</b></div>
    ${moi.tel ? `<a class="btn block" href="#/modpas" id="lyen-modpas">Chanje modpas mwen</a>` : ""}
  </div>
  <h2>Aparans</h2>
  <div class="card form">
    <fieldset class="field"><legend>Look <small class="mut">(aparans aplikasyon an)</small></legend>
      <div class="looks" role="radiogroup">${looks.LOOK_IDS.map((id) => { const Lk = looks.LOOKS[id]; return `<label class="look-opt ${pref.look === id ? "on" : ""}" data-look-opt="${id}">
        <input type="radio" name="look" value="${id}" ${pref.look === id ? "checked" : ""}>
        <span class="look-prev" aria-hidden="true"><i class="lp-bar"></i><i class="lp-card"></i><i class="lp-btn"></i><i class="lp-nav"></i></span>
        <span class="look-nom" data-brut>${h(Lk.nom)}</span><span class="look-desk">${h(Lk.deskripsyon)}</span></label>`; }).join("")}</div>
    </fieldset>
    <fieldset class="field"><legend>Lang</legend><div class="seg"><label><input type="radio" name="lang" value="ht" ${getLang() === "ht" ? "checked" : ""}><span data-brut>Kreyòl</span></label><label><input type="radio" name="lang" value="fr" ${getLang() === "fr" ? "checked" : ""}><span data-brut>Français</span></label></div></fieldset>
    <fieldset class="field" id="f-tem" ${L().tem === "dark" ? "hidden" : ""}><legend>Tèm</legend><div class="seg s3">
      ${[["auto", "Otomatik"], ["light", "Klè"], ["dark", "Fonse"]].map(([v, l]) => `<label><input type="radio" name="tem" value="${v}" ${pref.tem === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
    ${L().tem === "dark" ? `<p class="mut sm">${t("Look sa a toujou fonse.")}</p>` : ""}
    <fieldset class="field"><legend>Gwosè tèks</legend><div class="seg s3">
      ${[["n", "Nòmal"], ["l", "Gwo"], ["xl", "Pi gwo"]].map(([v, l]) => `<label><input type="radio" name="teks" value="${v}" ${pref.teks === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
    <fieldset class="field"><legend>Son alèt yo</legend><div class="seg s2">
      ${[["1", "Wi"], ["0", "Non"]].map(([v, l]) => `<label><input type="radio" name="son" value="${v}" ${(pref.son !== false) === (v === "1") ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
  </div>
  <h2>Senkronizasyon</h2>
  <a class="row senk-lyen" href="#/senk"><div class="grow"><b>${t("Senkronizasyon")}</b><div class="mut sm">${M.outbox.length ? `${M.outbox.length} ${t("poko voye")}` : t("Tout bagay voye ✓")} · ${t("Dènye senk")} ${lè(await db.meta("last_sync"))}</div></div><span aria-hidden="true">›</span></a>
  ${estManager() || moi.admin ? `<h2>Administrasyon</h2>` : ""}
  ${estManager() ? `<a class="btn block" href="#/istorik">Istorik modifikasyon</a>` : ""}
  ${estManager() ? `<a class="btn block" href="#/aparey">Aparèy ajan yo</a>` : ""}
  ${estManager() ? `<a class="btn block" href="#/feries">Jou ferye</a>` : ""}
  ${moi.admin ? `<a class="btn block" href="#/ajan">Jere ajan yo</a>` : ""}
  <button class="btn block danger" id="logout">Dekonekte</button>
  <p class="mut sm center">Grandon · vèsyon ${h(APP_VERSION)}</p>`;
  $app.querySelectorAll('input[name="lang"]').forEach((r) => (r.onchange = () => { setLang(r.value); location.reload(); }));
  $app.querySelectorAll('input[name="tem"], input[name="teks"]').forEach((r) => (r.onchange = () => {
    savePrefs({ tem: $app.querySelector('input[name="tem"]:checked').value, teks: $app.querySelector('input[name="teks"]:checked').value });
  }));
  $app.querySelectorAll('input[name="son"]').forEach((r) => (r.onchange = () => { savePrefs({ son: r.value === "1" }); if (r.value === "1") ui.son("info"); }));
  $app.querySelectorAll('input[name="look"]').forEach((r) => (r.onchange = () => { savePrefs({ look: r.value }); toast(`${looks.LOOKS[r.value].nom} ✓`); render(); }));
  document.getElementById("logout").onclick = async () => {
    if (M.outbox.length) return ui.info("Gen operasyon ki poko voye", `${M.outbox.length} · ${t("Senkronize yo anvan w dekonekte.")}`);
    if (!(await ui.ask({ titre: "Dekonekte?", tekst: "Done yo ap efase sou telefòn nan.", ok: "Dekonekte", danje: true }))) return;
    await db.wipe();
    moi = null;
    await api.clearSession();
    go("#/login");
  };
}

// ---------- Senkronizasyon: eta, bouton senk, operasyon ki poko voye ----------
async function viewSenk() {
  const M = await S.model();
  const s = api.getSession();
  $app.innerHTML = `
  <div class="page-head"><h1>Senkronizasyon</h1></div>
  <div class="card">
    <div class="kv"><span>Koneksyon</span><b>${navigator.onLine ? "Anliy" : "Offline"}</b></div>
    <div class="kv"><span>Dènye senk</span><b>${lè(await db.meta("last_sync"))}</b></div>
    <div class="kv"><span>Dènye telechajman</span><b>${lè(await db.meta("last_pull"))}</b></div>
    ${s?.expired ? `<p class="note warn">Sesyon w fini. <a href="#/login">Konekte ankò</a> pou voye done yo.</p>` : ""}
    <button class="btn pri block" id="sync" ${navigator.onLine ? "" : "disabled"}>Senkronize kounye a</button>
  </div>
  <h2>Poko voye <small class="mut">(${M.outbox.length})</small></h2>
  <div class="list">${M.outbox.map((o) => `<div class="row col">
      <div><b>${KIND[o.kind]}</b> ${o.status === "erè" ? `<span class="badge err">Erè</span>` : o.attente ? `<span class="badge warn">An atant</span>` : `<span class="badge pend">Poko voye</span>`}
        <div class="mut sm">${h(resume(o, M))} · ${lè(o.created)}</div>
        ${o.error ? `<div class="${o.attente ? "mut" : "err-msg"} sm">${h(t(o.error))}</div>` : ""}</div>
      ${o.status === "erè" ? `<div class="btns"><button class="btn sm" data-retry="${o.seq}">Eseye ankò</button><button class="btn sm danger" data-drop="${o.seq}">Efase</button></div>` : ""}
    </div>`).join("") || `<p class="empty">Tout bagay voye ✓</p>`}</div>`;
  document.getElementById("sync").onclick = async () => {
    const r = await S.run();
    if (r.aparey) return render();
    r.notices.forEach((n) => toast(n, "info", 6000));
    toast(r.offline ? "Pa gen koneksyon." : r.session ? "Konekte ankò." : r.errors ? `${r.errors} erè.` : "Senkronizasyon fini ✓", r.errors || r.offline ? "err" : "ok");
    render();
  };
  $app.querySelectorAll("[data-retry]").forEach((b) => (b.onclick = () => S.retryOp(Number(b.dataset.retry)).then(render)));
  $app.querySelectorAll("[data-drop]").forEach((b) => (b.onclick = async () => {
    if (!(await ui.ask({ titre: "Efase operasyon sa a?", tekst: "Operasyon sa a ak tout sa ki depann de li ap efase. Sa p ap ka defèt.", ok: "Efase", danje: true, ikon: "!" }))) return;
    const n = await S.dropOp(Number(b.dataset.drop));
    toast(`${n} operasyon efase.`);
    render();
  }));
}

// ---------- Modpas: chanjman obligatwa (modpas tanporè) oswa volontè ----------
function viewModpas(fòse) {
  if (fòse) { $nav.hidden = true; document.body.classList.remove("has-nav"); }
  $app.innerHTML = `${fòse ? "" : `<a href="#/param" class="back">‹ Paramèt</a>`}<h1>${fòse ? "Chwazi pwòp modpas ou" : "Chanje modpas mwen"}</h1>
  ${fòse ? `<p class="note warn">Modpas ou resevwa a se yon modpas tanporè. Chwazi yon modpas pa w anvan w kontinye: se ou sèl ki pou konnen l.</p>` : ""}
  <form id="f-modpas" class="card form">
    ${fòse ? "" : `<label>Ansyen modpas<input name="ansyen" type="password" autocomplete="current-password" required></label>`}
    <label>Nouvo modpas <small class="mut">(omwen 8 karaktè)</small><input name="nouvo" type="password" autocomplete="new-password" minlength="8" required></label>
    <label>Konfime nouvo modpas la<input name="konfime" type="password" autocomplete="new-password" minlength="8" required></label>
    <button class="btn pri" type="submit">Anrejistre</button>
    <p class="err-msg" id="modpas-err" role="alert"></p>
  </form>
  ${navigator.onLine ? "" : `<p class="note">Fòk ou gen entènèt pou chanje modpas.</p>`}
  ${fòse ? `<button class="btn block" id="modpas-soti" type="button">Dekonekte</button>` : ""}`;
  const f = document.getElementById("f-modpas"), out = document.getElementById("modpas-err");
  f.onsubmit = async (e) => {
    e.preventDefault();
    out.textContent = "";
    if (f.nouvo.value !== f.konfime.value) { out.textContent = t("De modpas yo pa menm."); return; }
    const b = f.querySelector("button"); b.disabled = true;
    try {
      await api.chanjeModpas(fòse ? null : f.ansyen.value, f.nouvo.value);
      moi = { ...moi, modpasTanpore: false };
      await db.meta("moi", moi);
      toast(t("Modpas ou chanje ✓"), "ok");
      if (fòse) { S.run(); go("#/"); } else go("#/param");
    } catch (err) {
      out.textContent = t(err.message); b.disabled = false;
    }
  };
  document.getElementById("modpas-soti")?.addEventListener("click", async () => {
    await api.clearSession(); go("#/login");
  });
}

// ---------- Aparèy sa a pa aktif ankò (ajan an konekte sou yon lòt) ----------
async function viewAparèyBloke(bl) {
  const n = (await db.all("outbox")).length;
  $nav.hidden = true; document.body.classList.remove("has-nav");
  $app.innerHTML = `<section class="card aparey-bloke"><div class="ikon-gwo" aria-hidden="true">🔒</div>
    <h1>${bl.debloke ? "Kont ou debloke" : "Kont ou konekte sou yon lòt aparèy"}</h1>
    <p>${bl.debloke ? t("Yon manadjè debloke kont ou pou w ka konekte sou yon lòt aparèy. Aparèy sa a pa aktif ankò.") : t("Ou konekte sou yon lòt aparèy. Pou sekirite, yon sèl aparèy ka aktif an menm tan: aparèy sa a dekonekte.")}</p>
    ${n ? `<p class="note warn">${n} ${t("operasyon poko voye sou aparèy sa a. Yo pa efase: konekte ankò sou aparèy sa a pou voye yo.")}</p>` : ""}
    <button class="btn pri block" id="rekonekte">Konekte ankò sou aparèy sa a</button></section>`;
  document.getElementById("rekonekte").onclick = async () => { await api.clearSession(); go("#/login"); };
}

// ---------- Aparèy ajan yo (manadjè): wè ki aparèy ki aktif, debloke yon ajan ki pèdi telefòn li ----------
async function viewAparey() {
  if (!estManager()) return go("#/param");
  $app.innerHTML = `<a href="#/param" class="back">‹ Paramèt</a><h1>Aparèy ajan yo</h1>
    <p class="mut sm">${t("Yon ajan ka aktif sou yon sèl aparèy. Si telefòn li pèdi oswa kraze, debloke l pou l ka konekte sou yon lòt.")}</p>
    <div class="list" id="ap-lis"><p class="empty">${t("Ap chaje…")}</p></div>`;
  const $l = document.getElementById("ap-lis");
  let lis;
  try { lis = await api.rpc("grandon_aparey_lis", {}); }
  catch (e) { $l.innerHTML = `<p class="err-msg">${h(t(e.retry ? "Fòk ou gen entènèt pou wè aparèy yo." : e.message))}</p>`; return; }
  $l.innerHTML = lis.map((a) => `<div class="row col ap-row" data-ap="${h(a.user_id)}">
      <div><b data-brut>${h(a.nom)}</b> <span class="mut sm">${h(WOL[a.role] || a.role)}</span>
        ${!a.actif ? `<span class="badge err">${t("Dezaktive")}</span>` : a.bloke ? `<span class="badge info">${t("Libere")}</span>` : a.aparey_non || a.denye_we ? `<span class="badge ok">${t("Aktif")}</span>` : `<span class="badge pend">${t("Poko konekte")}</span>`}</div>
      <div class="sm">${a.bloke ? t("Pwochen koneksyon an lib.") : a.denye_we ? `<span data-brut>${h(a.aparey_non || t("Aparèy"))}</span> · ${t("Dènye fwa")} ${lè(a.denye_we)}` : ""}
        ${a.poko_voye ? ` · <b>${a.poko_voye} ${t("poko voye")}</b>` : ""}</div>
      ${!a.bloke && a.denye_we && a.user_id !== moi.id ? `<div class="btns"><button class="btn sm danger" data-debloke="${h(a.user_id)}">Debloke</button></div>` : ""}
    </div>`).join("") || `<p class="empty">${t("Pa gen ajan.")}</p>`;
  $l.querySelectorAll("[data-debloke]").forEach((b) => (b.onclick = async () => {
    const a = lis.find((x) => x.user_id === b.dataset.debloke);
    const tekst = `${a.nom} · ${t("aparèy aktif la ap dekonekte, epi ajan an ap ka konekte sou yon nouvo aparèy.")}${a.poko_voye ? ` ${a.poko_voye} ${t("operasyon poko voye sou ansyen aparèy la: yo ap pèdi si aparèy sa a pa janm reparèt.")}` : ""}`;
    if (!(await ui.ask({ titre: "Debloke ajan sa a?", tekst, ok: "Debloke", danje: true, ikon: "!" }))) return;
    b.disabled = true;
    try { await api.rpc("grandon_aparey_debloke", { p_user: a.user_id }); toast(t("Ajan an debloke ✓"), "ok"); viewAparey(); }
    catch (e) { toast(t(e.message), "err"); b.disabled = false; }
  }));
}

// ---------- Istorik modifikasyon pa jou (manadjè) ----------
// Demann ajan yo, desizyon manadjè yo, modifikasyon ki fèt (ak valè avan → apre), anilasyon, modifikasyon dirèk manadjè.
let jouIstorik = null;
const DIRÈK = "Modifikasyon dirèk manadjè";
function evènmanModif(x) {
  const dirèk = x.rezon === DIRÈK || (x.operasyon === "siprime" && x.statut === "fini" && x.desizyon_pa && x.desizyon_pa === x.agent_id);
  if (dirèk) return [{ le: x.itilize_le || x.desizyon_le || x.kreye_le, tip: x.operasyon === "siprime" ? "anile_dirèk" : "dirèk", pa: x.agent_id, x }];
  const l = [{ le: x.kreye_le, tip: "demann", pa: x.agent_id, x }];
  if (x.desizyon_le) l.push({ le: x.desizyon_le, tip: x.statut === "refize" ? "refize" : x.operasyon === "siprime" ? "anile" : "apwouve", pa: x.desizyon_pa, x });
  if (x.itilize_le && x.operasyon === "modifye") l.push({ le: x.itilize_le, tip: "aplike", pa: x.agent_id, x });
  return l;
}
function valèIstorik(kind, k, v) {
  if (v == null || v === "") return "—";
  if (kind === "tx" && (k === "montant" || k.startsWith("solde"))) return gd(v);
  if (k === "telephone") return F.telFmt(v);
  if (k === "date_naissance") return datFr(v);
  return String(v);
}
async function viewIstorik() {
  if (!estManager()) return go("#/param");
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  jouIstorik ||= M.today;
  const TIP = { demann: ["info", "Demann"], apwouve: ["ok", "Apwouve"], refize: ["err", "Refize"], anile: ["err", "Anile (apwouve)"],
    aplike: ["ok", "Modifikasyon fèt"], dirèk: ["warn", "Modifikasyon dirèk manadjè"], anile_dirèk: ["err", "Anile pa manadjè"] };
  const ev = [...M.modif.values()].flatMap(evènmanModif).filter((e) => e.le && S.jouLokal(new Date(e.le)) === jouIstorik)
    .sort((a, b) => String(b.le).localeCompare(String(a.le)));
  const kont = (tips) => ev.filter((e) => tips.includes(e.tip)).length;
  const avanApre = (e) => {
    if (!["aplike", "dirèk"].includes(e.tip) || !e.x.chan) return "";
    const av = e.x.vale_avan || {}, ap = e.x.vale_apre || {};
    return `<table class="ist-t"><thead><tr><th>${t("Chan")}</th><th>${t("Avan")}</th><th>${t("Apre")}</th></tr></thead><tbody>${e.x.chan.map((k) => {
      const a = k === "gps" ? av.geocode : av[k], p = k === "gps" ? (ap.gps_lat != null ? `${Number(ap.gps_lat).toFixed(5)},${Number(ap.gps_lng).toFixed(5)}` : "") : ap[k];
      return `<tr><td>${t(etikètChan(e.x.kind, k))}</td><td data-brut>${h(valèIstorik(e.x.kind, k, a))}</td><td data-brut><b>${h(valèIstorik(e.x.kind, k, p))}</b></td></tr>`; }).join("")}</tbody></table>`;
  };
  $app.innerHTML = `<a href="#/param" class="back">‹ Paramèt</a><h1>Istorik modifikasyon</h1>
    <div class="ist-jou"><button type="button" class="btn sm" id="ist-prev" aria-label="${t("Jou anvan")}">‹</button>
      <input type="date" id="ist-dat" value="${h(jouIstorik)}" max="${h(M.today)}" aria-label="${t("Jou")}">
      <button type="button" class="btn sm" id="ist-next" aria-label="${t("Jou apre")}" ${jouIstorik >= M.today ? "disabled" : ""}>›</button></div>
    <div class="stats ist-stats"><div><span>${t("Demann yo")}</span><b>${kont(["demann"])}</b></div><div><span>${t("Apwouve yo")}</span><b>${kont(["apwouve", "anile"])}</b></div>
      <div><span>${t("Refize yo")}</span><b>${kont(["refize"])}</b></div><div><span>${t("Modifikasyon fèt")}</span><b>${kont(["aplike", "dirèk"])}</b></div>
      <div><span>${t("Anilasyon")}</span><b>${kont(["anile", "anile_dirèk"])}</b></div></div>
    <div class="list ist-lis">${ev.map((e) => { const [kl, et] = TIP[e.tip]; const x = e.x;
      const href = x.kind === "kliyan" ? `#/kliyan/${x.ref_id}` : (() => { const tx = M.txs.get(x.ref_id); return tx ? `#/cycle/${tx.id_compte_epargne}` : "#/epay"; })();
      const ki = x.operasyon === "siprime" ? (x.kind === "tx" ? t("Anile tranzaksyon an") : t("Retire kliyan an nan Grandon")) : (x.chan || []).map((k) => t(etikètChan(x.kind, k))).join(", ");
      return `<div class="row col ist">
        <div><b class="mono">${lèKout(e.le)}</b> <span class="badge ${kl}">${t(et)}</span> <a href="${href}">${x.kind === "kliyan" ? d(ciblModif(M, x.kind, x.ref_id)) : h(ciblModif(M, x.kind, x.ref_id))}</a></div>
        <div class="sm">${ki}${nomAjan(e.pa) ? ` · <span data-brut>${h(nomAjan(e.pa))}</span>` : ""}</div>
        ${e.tip === "demann" || e.tip === "anile_dirèk" ? `<div class="mut sm">${t("Rezon")}: ${d(x.rezon)}</div>` : ""}
        ${e.tip === "refize" && x.motif_refi ? `<div class="err-msg sm">${t("Rezon refi a")}: ${d(x.motif_refi)}</div>` : ""}
        ${avanApre(e)}</div>`; }).join("") || `<p class="empty">${t("Pa gen modifikasyon jou sa a.")}</p>`}</div>`;
  const ale = (j) => { jouIstorik = j > M.today ? M.today : j; viewIstorik(); };
  document.getElementById("ist-prev").onclick = () => ale(S.ajouteJou(jouIstorik, -1));
  document.getElementById("ist-next").onclick = () => ale(S.ajouteJou(jouIstorik, 1));
  document.getElementById("ist-dat").onchange = (e) => e.target.value && ale(e.target.value);
}

// ---------- Jesyon ajan (admin, anliy sèlman) ----------
async function viewAjan() {
  $app.innerHTML = `<a href="#/param" class="back">‹ Paramèt</a><h1>Ajan yo</h1>
    ${navigator.onLine ? `<div class="list" id="lis"><p class="empty">Ap chaje…</p></div>` : `<p class="note warn">Fòk ou gen entènèt pou jere ajan yo.</p>`}
    <h2>Nouvo ajan</h2>
    <form id="f" class="card form" novalidate>
      <label>Non konplè *<input name="non" required autocomplete="off"></label>
      <label>Telefòn * <small class="mut">(8 chif)</small><input name="tel" inputmode="tel" required placeholder="3700 1234" autocomplete="off"></label>
      <div class="grid2">
        <label>Wòl<select name="wol"><option value="agent">Ajan</option><option value="manager">Manadjè</option><option value="admin">Admin</option></select></label>
        <label>Modpas * <small class="mut">(8+)</small><input name="modpas" type="text" required autocomplete="new-password" minlength="8"></label>
      </div>
      <p class="err-msg" id="err" role="alert"></p>
      <button class="btn pri" type="submit" ${navigator.onLine ? "" : "disabled"}>Kreye kont lan</button>
    </form>`;
  const lis = document.getElementById("lis");
  const charge = async () => {
    try {
      const { ajan } = await api.kont({ aksyon: "lis" });
      lis.innerHTML = ajan.map((a) => `<div class="row col">
        <div><b>${h(a.nom)}</b> <span class="badge ${a.actif ? "ok" : "mut"}">${a.actif ? WOL[a.role] : "Dezaktive"}</span>
          <div class="mut sm">${h(a.telephone.replace(/^509(\d{4})(\d{4})$/, "$1 $2"))}</div></div>
        ${a.user_id === moi.id ? "" : `<div class="btns"><button class="btn sm" data-mp="${h(a.telephone)}">Nouvo modpas</button>
          <button class="btn sm ${a.actif ? "danger" : ""}" data-ak="${a.actif ? "desactiver" : "reactiver"}" data-tel="${h(a.telephone)}">${a.actif ? "Dezaktive" : "Reaktive"}</button></div>`}
      </div>`).join("") || `<p class="empty">Pa gen ajan.</p>`;
      lis.querySelectorAll("[data-mp]").forEach((b) => (b.onclick = async () => {
        const mp = await ui.askText({ titre: "Nouvo modpas", label: "Modpas (omwen 8 karaktè)", min: 8 });
        if (!mp) return;
        try { await api.kont({ aksyon: "modpas", telefon: b.dataset.mp, modpas: mp }); toast("Modpas la chanje."); }
        catch (e) { toast(e.message, "err"); }
      }));
      lis.querySelectorAll("[data-ak]").forEach((b) => (b.onclick = async () => {
        if (b.dataset.ak === "desactiver" && !(await ui.ask({ titre: "Dezaktive kont sa a?", tekst: "Ajan an p ap ka konekte ankò.", ok: "Dezaktive", danje: true, ikon: "!" }))) return;
        try { await api.kont({ aksyon: b.dataset.ak, telefon: b.dataset.tel }); charge(); }
        catch (e) { toast(e.message, "err"); }
      }));
    } catch (e) { lis.innerHTML = `<p class="note err">${h(e.message)}</p>`; }
  };
  if (lis) charge();
  const f = document.getElementById("f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const v = Object.fromEntries(new FormData(f));
    if (v.non.trim().length < 2) return (err.textContent = "Mete non moun nan.");
    if (!api.telefon8(v.tel)) return (err.textContent = "Telefòn nan dwe gen 8 chif.");
    if (v.modpas.length < 8) return (err.textContent = "Modpas la dwe gen omwen 8 karaktè.");
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    try {
      await api.kont({ aksyon: "creer", non: v.non.trim(), telefon: api.telefon8(v.tel), wol: v.wol, modpas: v.modpas });
      toast(`Kont ${v.non.trim()} kreye. Li konekte ak ${api.telefon8(v.tel)} + modpas la.`, "ok", 6000);
      f.reset(); err.textContent = ""; charge();
    } catch (e2) { err.textContent = e2.message; }
    b.disabled = false;
  };
}

// ---------- Routè ----------
const FORM = /^#\/(kliyan\/nouvo|kliyan\/[\w-]+\/modifye|cycle\/nouvo|tx\/nouvo|ajan|modpas)/;
async function render() {
  const r = location.hash || "#/";
  const s = api.getSession();
  await updateBar();
  updateNav();
  if (!s || !moi || r === "#/login") return viewLogin(s?.expired);
  if (moi.modpasTanpore) return viewModpas(true);
  const bl = await db.meta("aparey_bloke");
  if (bl) return viewAparèyBloke(bl);
  let m;
  if (r === "#/" || r === "#") return viewTablo();
  if (r === "#/kliyan") return viewKliyan();
  if (r === "#/epay") return viewEpay();
  if (r === "#/rapo") return viewRapo();
  if (r === "#/kat") { const M = await S.model(); ajans = (await db.meta("ajans")) || {}; return KAT.viewKat({ $app, M, man: estManager(), moi, ajans, getGps, toast }); }
  if (r === "#/kliyan/nouvo") return viewClientNew();
  if ((m = r.match(/^#\/kliyan\/([\w-]+)\/modifye$/))) return viewClientEdit(m[1]);
  if ((m = r.match(/^#\/kliyan\/([\w-]+)$/))) return viewClient(m[1]);
  if ((m = r.match(/^#\/chwazi\/(cycle|tx)$/))) return viewPick(m[1]);
  if ((m = r.match(/^#\/cycle\/nouvo\/([\w-]+)$/))) return viewCycleNew(m[1]);
  if ((m = r.match(/^#\/cycle\/([\w-]+)$/))) return viewCycle(m[1]);
  if ((m = r.match(/^#\/tx\/nouvo\/([\w-]+)$/))) return viewTxNew(m[1]);
  if (r === "#/param") return viewParam();
  if (r === "#/senk") return viewSenk();
  if (r === "#/istorik") return viewIstorik();
  if (r === "#/modpas") return viewModpas(false);
  if (r === "#/aparey") return viewAparey();
  if (r === "#/ajan" && moi.admin) return viewAjan();
  if (r === "#/feries") return viewFeries();
  go("#/");
}

// Lè sync chanje yon bagay: rafrechi ba a toujou; paj la sèlman si ajan an pa nan yon fòmilè.
let pendingRender = null;
S.onChange(() => {
  updateBar();
  if (FORM.test(location.hash) || location.hash === "#/login") return;
  clearTimeout(pendingRender);
  pendingRender = setTimeout(() => {
    const tape = document.activeElement?.matches?.("input, textarea, select");
    if (!FORM.test(location.hash) && location.hash !== "#/login" && !tape) render();
  }, 150);
});

async function boot() {
  applyPrefs();
  demarrerTraduction();
  ui.activerZoom();
  // Foto ki pa ka chaje (offline, lyen kase): montre inisyal kliyan an.
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.matches(".thumb, .avatar")) return;
    const sp = document.createElement("span");
    sp.className = `${img.className} ph`;
    sp.setAttribute("aria-hidden", "true");
    sp.textContent = (img.dataset.legend || "?").trim()[0] || "?";
    img.replaceWith(sp);
  }, true);
  await api.loadSession();
  moi = (await db.meta("moi")) || null;
  addEventListener("hashchange", () => { clearTimeout(pendingRender); render(); scrollTo(0, 0); });
  addEventListener("online", () => { updateBar(); S.run().then((r) => r.notices.forEach((n) => toast(n, "info", 6000))); });
  addEventListener("offline", updateBar);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") S.run(); });
  setInterval(() => S.run(), 60000);
  await render();
  if (moi) S.run();

  if ("serviceWorker" in navigator) {
    // Nouvo vèsyon: service worker la aktive poukont li (skipWaiting). Lè l pran kontwòl, nou rechaje paj la,
    // eksepte si ajan an nan mitan yon fòm: lè sa a nou montre yon bouton pou l rechaje lè l fini.
    const teGenKontwòl = !!navigator.serviceWorker.controller;
    let fèt = false;
    const rechaje = () => {
      if (fèt || !teGenKontwòl) return;
      if (/^#\/(kliyan\/nouvo|kliyan\/[^/]+\/modifye|cycle\/nouvo|tx\/nouvo|ajan)/.test(location.hash) || document.querySelector(".modal-wrap")) {
        if (document.querySelector(".toast.update")) return;
        const b = document.createElement("button");
        b.className = "toast info update";
        b.textContent = t("Nouvo vèsyon disponib · Peze pou rechaje");
        b.onclick = () => { fèt = true; location.reload(); };
        document.body.appendChild(b);
        return;
      }
      fèt = true; location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", rechaje);
    const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch((e) => console.warn("SW", e));
    if (reg?.waiting) reg.waiting.postMessage("skipWaiting"); // yon vèsyon ki t ap tann depi anvan
    reg?.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw?.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) nw.postMessage("skipWaiting"); });
    });
    // Tcheke si gen nouvo vèsyon chak fwa aplikasyon an tounen devan (ak chak 30 minit).
    const tcheke = () => { if (navigator.onLine) reg?.update().catch(() => {}); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tcheke(); });
    setInterval(tcheke, 30 * 60000);
  }
}
boot();
