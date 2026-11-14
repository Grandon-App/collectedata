import * as db from "./db.js";
import * as api from "./api.js";
import * as S from "./sync.js";
import * as ui from "./ui.js";
import * as TX from "./taxonomy.js";
import { t, setLang, getLang, demarrerTraduction } from "./i18n.js";
import * as F from "./fmt.js";
import * as looks from "./looks.js";
import * as KAT from "./kat.js";
import { PWOBLEM, pwoblemPa, genPwoblem } from "./pwoblem.js";

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
const APP_VERSION = "5.04";
const WOL = { agent: "Ajan", manager: "Manadjè", admin: "Admin", kesye: "Responsab kès" };
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
const { kane, h, d, gd, datFr, lè, non, JOU, JOU_KOUT, lisJou, tel4, avatar, badgePend, badgeTx, badgeKont, badgeDm, ICO,
  LABEL_TX, SIY, KLAS, MOTIFS, motifLabel, MOTIF_KOUT, TYPES_FRE, FRE_LABEL, freKane, lèKout, datKout } = F;
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

// Redui foto a (1280 px maks). Oryantasyon foto a (EXIF) respekte toujou, menm sou telefòn ki pa fè l poukont yo.
async function compress(file) {
  let img; try { img = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { img = await createImageBitmap(file); }
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
    <a href="#/" class="brand">${C.LOGO_IKON ? `<img class="brand-logo mak-blan" src="${h(C.LOGO_IKON)}" alt="" width="30" height="30">` : ""}${C.LOGO_IKON_KOULE ? `<img class="brand-logo mak-koule" src="${h(C.LOGO_IKON_KOULE)}" alt="" width="30" height="30">` : ""}<span class="brand-t wordmark">Grandon</span> ${C.ANVIWONMAN ? `<small>${h(C.ANVIWONMAN)}</small>` : ""}</a>
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
// Responsab kès: pa gen Tablo, Kliyan, Epay ni Kat. Li gen Kès (validasyon) ak Rapò.
const TABS_KES = [["kes", "#/kes", "Kès"], ["rapo", "#/rapo", "Rapò"], ["senk", "#/senk", "Senkronizasyon"], ["param", "#/param", "Paramèt"]];
const TABS_MAN = [TABS[0], ["ekip", "#/ekip", "Ekip"], ["potfey", "#/potfey", "Pòtfèy"], ["alet", "#/alet", "Alèt"], TABS[1], TABS[2], ["kredi", "#/kredi", "Kredi"], ...TABS.slice(3)];
let kreDispo = false, kreGen = false; // onglè Kredi: sèlman si sèvè a gen modil kredi a; pou ajan yo, sèlman si gen kredi
const TABS_AJ = [TABS[0], ["potfey", "#/potfey", "Pòtfèy"], ...TABS.slice(1, 3), ["kredi", "#/kredi", "Kredi"], ...TABS.slice(3)];
const tabs = () => (estKesye() ? TABS_KES : estManager() ? TABS_MAN.filter(([k]) => k !== "kredi" || kreDispo) : TABS_AJ.filter(([k]) => k !== "kredi" || kreGen));
function tabActif(r) {
  if (/^#\/kes/.test(r)) return "kes";
  if (/^#\/ekip/.test(r)) return "ekip";
  if (/^#\/alet/.test(r)) return "alet";
  if (/^#\/potfey/.test(r)) return "potfey";
  if (/^#\/(kliyan)/.test(r)) return "kliyan";
  if (/^#\/kredi/.test(r)) return "kredi";
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
  $nav.innerHTML = tabs().map(([k, href, label]) => `<a href="${href}" class="${k === a ? "on" : ""}${k === "senk" || k === "ekip" || k === "alet" || (k === "potfey" && estManager()) ? " nav-lap" : ""}" ${k === a ? 'aria-current="page"' : ""}>${ICO[k]}<span>${label}</span></a>`).join("")
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
    ${C.LOGO ? `<h1 class="login-logo"><img class="mak-blan" src="${h(C.LOGO)}" alt="Grandon">${C.LOGO_KOULE ? `<img class="mak-koule" src="${h(C.LOGO_KOULE)}" alt="Grandon">` : ""}</h1>` : `<h1 class="wordmark">Grandon</h1>`}
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
// Rechèch kont: nimewo kont lan oswa nimewo kanè a (A-BSI-…), san konte tirè ni espas.
const nòmNo = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function kontKoresponn(k, v) {
  if (!k) return false;
  const q = String(v || "").trim().toLowerCase();
  if (!q) return true;
  if (String(k.no_compte || "").toLowerCase().includes(q) || String(k.no_kane || "").toLowerCase().includes(q)) return true;
  const qn = nòmNo(q);
  return qn.length >= 4 && (nòmNo(k.no_kane).includes(qn) || nòmNo(k.no_compte).includes(qn));
}
function lisKliyan(M, filtre) {
  const q = filtre.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  return [...M.clients.values()]
    .filter((c) => !q || non(c).toLowerCase().includes(q) || (qd.length >= 3 && !/[a-z]/.test(q) && String(c.telephone || c.tel4 || "").replace(/\D/g, "").includes(qd)) || String(c.code_client || "").toLowerCase().includes(q)
      || (/[a-z]/.test(q) && nòmNo(q).length >= 4 && S.comptesDuClient(M, c.id_personne).some((k) => k.no_kane && kontKoresponn(k, q))))
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
// Chif Tablo a pou yon modèl (tout ajan yo, oswa yon sèl ajan: gade modèlAjan).
function statsTablo(M) {
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
  return st;
}
// Modèl yon sèl ajan: kont li yo (created_by, ak lyen ansyen kont yo), kliyan, tranzaksyon, demann, fidbak ak alèt kont sa yo.
const SAN_AJAN = "-";
function modèlAjan(M, ajanId, ekipIds) {
  const pa = (k) => (ajanId === SAN_AJAN ? !ekipIds.has(k.created_by) : k.created_by === ajanId);
  const comptes = new Map([...M.comptes].filter(([, k]) => pa(k)));
  const nanKont = (x) => comptes.has(x.id_compte_epargne);
  const moun = new Set([...comptes.values()].map((k) => k.id_personne));
  return { ...M, comptes, clients: new Map([...M.clients].filter(([id]) => moun.has(id))), txs: new Map([...M.txs].filter(([, x]) => nanKont(x))),
    demandes: new Map([...M.demandes].filter(([, x]) => nanKont(x))), suivis: new Map([...M.suivis].filter(([, x]) => nanKont(x))),
    alet: new Map([...M.alet].filter(([, x]) => nanKont(x))) };
}
// Pòtfèy: kont ki atache ak moun ki konekte a (created_by). Objektif ak chif yo kalkile sou kont sa yo sèlman,
// ak tout depo sou kont yo, kèlkeswa ajan ki touche kòb la.
let pòtfèy = null; // null = otomatik · "mwen" · "tout"
const nPòtfèy = (M) => [...M.comptes.values()].filter((k) => mwenSe(k.created_by)).length;
function skòp(M) { // agent: toujou pòtfèy li · manadjè/admin: chwa (otomatik: pòtfèy li si l genyen, sinon tout ekip la)
  if (!estManager()) return "mwen";
  return pòtfèy || (nPòtfèy(M) ? "mwen" : "tout");
}
function modèlPòtfèy(M) {
  const comptes = new Map([...M.comptes].filter(([, k]) => mwenSe(k.created_by)));
  const nanKont = (x) => comptes.has(x.id_compte_epargne);
  const moun = new Set([...comptes.values()].map((k) => k.id_personne));
  return { ...M, comptes, clients: new Map([...M.clients].filter(([id]) => moun.has(id))), txs: new Map([...M.txs].filter(([, x]) => nanKont(x))),
    demandes: new Map([...M.demandes].filter(([, x]) => nanKont(x))), suivis: new Map([...M.suivis].filter(([, x]) => nanKont(x))),
    alet: new Map([...M.alet].filter(([, x]) => nanKont(x))) };
}
function chwaPòtfèy(M, ret) { // bouton «Pòtfèy mwen / Tout kliyan»
  const sk = ret.sk, nT = [...M.comptes.values()].filter((k) => k._actif).length, nM = [...M.comptes.values()].filter((k) => k._actif && mwenSe(k.created_by)).length;
  return `<div class="chips filt potfey-ch" role="group" aria-label="${h(t("Ki kont"))}">
    <button type="button" class="chip ${sk === "mwen" ? "on" : ""}" data-potfey="mwen" aria-pressed="${sk === "mwen"}">${t("Pòtfèy mwen")}<small>${nM}</small></button>
    <button type="button" class="chip ${sk === "tout" ? "on" : ""}" data-potfey="tout" aria-pressed="${sk === "tout"}">${t(ret.tout)}<small>${nT}</small></button></div>`;
}
// Kòb moun ki konekte a touche jodi a, ak pati ki pou kliyan lòt ajan.
function touchJodi(M) {
  const xs = [...M.txs.values()].filter((x) => S.txKind(x) === "depo" && x.validation_status !== "rejected" && mwenSe(x.created_by) && S.jouTx(x) === M.today);
  const som = (l) => l.reduce((a, x) => a + Number(x.montant || 0), 0);
  const lòt = xs.filter((x) => !mwenSe(M.comptes.get(x.id_compte_epargne)?.created_by));
  return { tout: som(xs), n: xs.length, lòt: som(lòt), nLòt: lòt.length };
}
// Alèt ak rapèl aktif sou Tablo a: kont pòtfèy la (oswa tout kont yo) + rapèl moun nan kreye sou nenpòt kliyan.
function aletAktif(M, M0) {
  const wè = new Set(), l = [];
  const mete = (a, k) => { if (!wè.has(a.id) && a._eta === "aktif") { wè.add(a.id); l.push({ ...a, k }); } };
  for (const k of M.comptes.values()) for (const a of k._alet) mete(a, k);
  for (const k of M0.comptes.values()) for (const a of k._alet) if (a.tip === "rapel" && mwenSe(a.kreye_pa)) mete(a, k);
  for (const k of M.comptes.values()) for (const a of aletKredi(k)) mete(a, k);
  for (const k of M.comptes.values()) if (k._fre?.pou && !k._alet.some((a) => a.pwoblem === "fre" && a._eta === "aktif"))
    mete({ id: `fre-${k.id_compte_epargne}`, sistem: true, nivo: "enpotan", tit: "Frais sèvis", _eta: "aktif", _anReta: false,
      mesaj: `${t("Kont lan elijib: pran prelevman frais sèvis la")} (${gd(k._fre.montan)}).` }, k);
  const NV = ["ijan", "enpotan", "info"];
  return l.sort((a, b) => b._anReta - a._anReta || String(a.dele || "9999").localeCompare(String(b.dele || "9999")) || NV.indexOf(a.nivo) - NV.indexOf(b.nivo));
}
function seksyonAletTablo(M, M0) {
  if (estKesye()) return "";
  const l = aletAktif(M, M0);
  if (!l.length) return "";
  const nReta = l.filter((a) => a._anReta).length;
  const rann = (a) => `<div class="alet-tr">${liAlet(a, { man: estManager() }).replace('<div class="grow">', `<div class="grow"><a class="alet-kl" href="${lyenAlet(a)}">${d(non(M0.clients.get(a.k.id_personne)))} · ${d(a.kredi?.no_compte || a.k.no_compte || "")}</a><br>`)}</div>`;
  const prem = l.slice(0, 6), rès = l.slice(6);
  return `<section class="alet-tablo" id="alet-tablo"><div class="txj-h"><h2>${t("Alèt ak rapèl")} <small>${l.length}</small></h2>${nReta ? `<span class="badge err">${nReta} ${t("an reta")}</span>` : ""}</div>
    <div class="list">${prem.map(rann).join("")}</div>
    ${rès.length ? `<details class="alet-plis"><summary>${t("Wè")} ${rès.length} ${t("lòt")}</summary><div class="list">${rès.map(rann).join("")}</div></details>` : ""}</section>`;
}
// Nouvo alèt nan pòtfèy la (kanpay, alèt manadjè, alèt ki depase dèlè): popup + son + vibrasyon + notifikasyon telefòn, yon sèl fwa.
const ALET_VU = "grandon-alet-vu";
let avètiOuvè = false;
async function avètiAlet() {
  if (avètiOuvè || !moi || estKesye() || FORM.test(location.hash) || location.hash === "#/login" || document.querySelector(".modal-wrap")) return;
  const M = await S.model();
  const l = [];
  for (const k of M.comptes.values()) {
    if (!mwenSe(k.created_by)) continue;
    for (const a of k._alet) if (a._eta === "aktif" && !mwenSe(a.kreye_pa) && !a._pending) l.push({ ...a, k, cle: a._anReta ? `${a.id}:reta` : a.id });
    if (k._fre?.pou) l.push({ id: `fre-${k.id_compte_epargne}`, k, cle: `fre-${k.id_compte_epargne}`, tit: t("Frais sèvis pou pran"), nivo: "enpotan",
      mesaj: t("Kont sa yo elijib: pran prelevman frais sèvis la."), _anReta: false });
    for (const a of aletKredi(k)) l.push({ ...a, tit: t(a.tit), mesaj: null, cle: a.id });
  }
  let vu = []; try { vu = JSON.parse(localStorage.getItem(ALET_VU) || "[]"); } catch { /* */ }
  const nouvo = l.filter((a) => !vu.includes(a.cle));
  if (!nouvo.length) return;
  avètiOuvè = true;
  const gr = new Map();
  for (const a of nouvo) { const c = `${a.tit}|${a.dele || ""}|${a._anReta ? 1 : 0}`; if (!gr.has(c)) gr.set(c, { a, n: 0, kl: [] }); const g = gr.get(c); g.n++; g.kl.push(a); }
  const nivo = nouvo.some((a) => a.nivo === "ijan" || a._anReta) ? "ijan" : nouvo.some((a) => a.nivo === "enpotan") ? "enpotan" : "info";
  const titre = nouvo.length > 1 ? `${nouvo.length} ${t("nouvo alèt nan pòtfèy ou")}` : t("Nouvo alèt nan pòtfèy ou");
  const tekst = [...gr.values()].map(({ a, n }) => `${a._anReta ? `${t("An reta")}: ` : ""}${a.tit} (${n})${a.dele ? ` · ${t("dèlè")} ${datFr(a.dele)}` : ""}`).join(" · ");
  if (prefs().son !== false) ui.son(nivo);
  ui.notifye({ titre, tekst, tag: "grandon-alet", nivo, url: "#/" });
  const M0 = M;
  await ui.aletPopup({ titre, nivo, soutit: t("Swivi sa yo nan dèlè a. Peze sou yon kliyan pou wè l."),
    html: [...gr.values()].map(({ a, n, kl }) => `<div class="row alet ${h(a.nivo)}"><div class="grow"><b>${d(a.tit)}</b> <span class="badge ${a._anReta ? "err" : "mut"}">${n} ${t("kliyan")}</span>
      ${a.dele ? `<span class="badge ${a._anReta ? "err" : "warn"}">${t("Dèlè")} ${datFr(a.dele)}${a._anReta ? ` · ${t("an reta")}` : ""}</span>` : ""}
      ${a.mesaj ? `<div class="sm alet-m">${d(a.mesaj)}</div>` : ""}
      <div class="sm">${kl.slice(0, 8).map((x) => `<a href="${lyenAlet(x)}">${d(non(M0.clients.get(x.k.id_personne)))}</a>`).join(" · ")}${kl.length > 8 ? ` · +${kl.length - 8}` : ""}</div></div></div>`).join("") });
  try { localStorage.setItem(ALET_VU, JSON.stringify([...new Set([...vu, ...nouvo.map((a) => a.cle)])].slice(-3000))); } catch { /* */ }
  avètiOuvè = false;
}

// ---------- Lè operasyon: ajan yo (ak manadjè yo si admin lan vle) travay sèlman ant 2 lè (lè Ayiti) ----------
const LE_DEFO = { aktif: true, de: "09:00", a: "20:00", roles: ["agent", "manager"] };
const leParamet = async () => ({ ...LE_DEFO, ...(((await db.meta("paramet")) || {}).le_operasyon || {}) });
const leKounye = () => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Port-au-Prince", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const amPm = (hhmm) => { const [H, M] = String(hhmm).split(":").map(Number); return `${((H + 11) % 12) + 1}:${String(M).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}`; };
// Jou fèmen: dimanch, oswa yon jou ki nan lis «Jou ferye» konpayi an. Retounen null oswa { dimanch } / { ferye: libelle }.
async function jouFèmen() {
  const j = S.jodi();
  if (S.isoJou(j) === 7) return { dimanch: true };
  const f = ((await db.all("feries")) || []).find((x) => x.jour === j);
  return f ? { ferye: f.libelle || "" } : null;
}
async function leOk() {
  const p = await leParamet();
  if (!p.aktif || !moi || !(p.roles || []).includes(moi.role)) return true;
  if (await jouFèmen()) return false;
  const l = leKounye();
  return l >= p.de && l < p.a;
}
async function tèksLe() {
  const p = await leParamet(), f = await jouFèmen();
  const lè = `${t("Ou ka fè operasyon sou pòtay la sèlman ant")} ${amPm(p.de)} ${t("ak")} ${amPm(p.a)}, ${t("lendi a samdi, eksepte jou ferye yo")}.`;
  if (f?.dimanch) return `${t("Pòtay la fèmen dimanch.")} ${lè}`;
  if (f) return `${t("Pòtay la fèmen jodi a: jou ferye")}${f.ferye ? ` (${d(f.ferye)})` : ""}. ${lè}`;
  return lè;
}
async function montreLeFèmen() { return ui.info("Pòtay la fèmen kounye a", `${await tèksLe()} ${t("Li")} ${amPm(leKounye())} ${t("kounye a")}.`); }
async function viewLeFèmen() {
  const f = await jouFèmen();
  $app.innerHTML = `<div class="le-femen card"><div class="le-ico" aria-hidden="true">${f ? "📅" : "🕘"}</div><h1>${t(f?.dimanch ? "Pòtay la fèmen dimanch" : f ? "Pòtay la fèmen jodi a (jou ferye)" : "Pòtay la fèmen kounye a")}</h1>
    <p>${await tèksLe()}</p><p class="mut">${t("Li")} <b>${amPm(leKounye())}</b> ${t("kounye a (lè Ayiti).")}</p>
    <a class="btn" href="#/">${t("Retounen sou Tablo a")}</a></div>`;
}
async function viewLe() {
  const p = await leParamet();
  $app.innerHTML = `<a href="#/param" class="back">‹ Paramèt</a><h1>${t("Lè operasyon")}</h1>
    <p class="mut">${t("Andeyò lè sa yo, ajan an pa ka fè depo, retrè, viman, fidbak, nouvo kliyan ni nouvo cycle. Sèvè a verifye l tou.")}</p>
    <p class="note info-note">${t("Pòtay la fèmen tou dimanch ak nan jou ferye ki nan lis la")} (<a href="#/feries">${t("Jou ferye")}</a>). ${t("Kliyan ki peye dimanch yo peye pou dimanch lan samdi (davans) oswa lendi.")}</p>
    <form id="f" class="card form" novalidate>
      <label class="chk"><input type="checkbox" name="aktif" ${p.aktif ? "checked" : ""}> ${t("Limite lè operasyon yo")}</label>
      <div class="grid2"><label>${t("Kòmanse a")}<input type="time" name="de" value="${h(p.de)}" required></label>
        <label>${t("Fini a")}<input type="time" name="a" value="${h(p.a)}" required></label></div>
      <fieldset class="field"><legend>${t("Pou ki moun")}</legend>
        <label class="chk"><input type="checkbox" name="roles" value="agent" ${p.roles.includes("agent") ? "checked" : ""}> ${t("Ajan")}</label>
        <label class="chk"><input type="checkbox" name="roles" value="manager" ${p.roles.includes("manager") ? "checked" : ""}> ${t("Manadjè")}</label>
        <p class="mut sm">${t("Admin ak responsab kès yo pa limite.")}</p></fieldset>
      <p class="err-msg" id="err" role="alert"></p>
      <button class="btn pri" type="submit">${t("Anrejistre")}</button>
    </form>`;
  const f = document.getElementById("f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const de = f.de.value, a = f.a.value, roles = [...f.querySelectorAll("input[name=roles]:checked")].map((x) => x.value);
    if (!de || !a || de >= a) return (err.textContent = t("Lè kòmansman an dwe anvan lè fen an."));
    if (!navigator.onLine) return (err.textContent = t("Fòk ou gen entènèt pou chanje paramèt sa a."));
    try {
      await api.rpc("grandon_paramet_le", { p_aktif: f.aktif.checked, p_de: de, p_a: a, p_roles: roles });
      await S.pull();
      toast(`${t("Lè operasyon")}: ${amPm(de)} – ${amPm(a)} ✓`, "ok");
      go("#/param");
    } catch (e2) { err.textContent = t(e2.message); }
  };
}

// ---------- Jesyon alèt (manadjè / admin): pwoblèm nan dosye yo, kanpay ak swivi ----------
const aletF = { ajan: "", lis: "" };
async function viewAlet() {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const { lis, ids } = await ekipAjan(M);
  const ajanK = (k) => (ids.has(k.created_by) ? k.created_by : SAN_AJAN);
  const nonA = (id) => lis.find((a) => a.user_id === id)?.nom || t("San ajan");
  const nanF = (k) => !aletF.ajan || ajanK(k) === aletF.ajan;
  const aktif = [...M.comptes.values()].filter((k) => k._actif && !k._pending);
  const parKliyan = new Map(); // yon kont pa kliyan pou pwoblèm fich kliyan an (kont ki pi resan an)
  for (const k of [...aktif].sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut)))) if (!parKliyan.has(k.id_personne)) parKliyan.set(k.id_personne, k);
  const alets = [...M.comptes.values()].flatMap((k) => k._alet.map((a) => ({ ...a, k })));
  const aAktif = alets.filter((a) => a._eta === "aktif");
  const kontPw = (p) => p.oto ? (p.kredi ? [...M.comptes.values()].filter((k) => k._kredi?.length) : p.k === "kal" || p.kont ? aktif : [...parKliyan.values()]).filter((k) => genPwoblem(p.k, M.clients.get(k.id_personne), k))
    : [...new Map(aAktif.filter((a) => a.pwoblem === p.k).map((a) => [a.k.id_compte_epargne, a.k])).values()];
  const genFre = [...M.comptes.values()].some((k) => k._fre);
  const pw = PWOBLEM.filter((p) => (!p.sevis || genFre) && (!p.kredi || (M.kredi || []).length)).map((p) => {
    const tout = kontPw(p), kont = tout.filter(nanF);
    const al = aAktif.filter((a) => a.pwoblem === p.k && nanF(a.k));
    const parA = new Map(); for (const k of kont) parA.set(ajanK(k), (parA.get(ajanK(k)) || 0) + 1);
    return { p, tout, kont, nAlet: al.length, nReta: al.filter((a) => a._anReta).length, parA };
  });
  // Kanpay yo: alèt ki gen menm kanpay_id
  const kp = new Map();
  for (const a of alets.filter((x) => x.kanpay_id && nanF(x.k))) {
    if (!kp.has(a.kanpay_id)) kp.set(a.kanpay_id, { id: a.kanpay_id, a, l: [] });
    kp.get(a.kanpay_id).l.push(a);
  }
  const kanpay = [...kp.values()].map((g) => ({ ...g, n: g.l.length, regle: g.l.filter((x) => x._eta !== "aktif").length, reta: g.l.filter((x) => x._anReta).length }))
    .filter((g) => g.n - g.regle > 0 || g.l.some((x) => S.jouLokal(new Date(x.fermen_le || x.kreye_le)) >= S.ajouteJou(M.today, -14)))
    .sort((a, b) => String(b.a.kreye_le).localeCompare(String(a.a.kreye_le)));
  const lòt = aAktif.filter((a) => !a.kanpay_id && nanF(a.k) && (!aletF.lis || (aletF.lis === "reta" ? a._anReta : a.tip === aletF.lis)))
    .sort((a, b) => b._anReta - a._anReta || String(a.dele || "9999").localeCompare(String(b.dele || "9999")));
  const nReta = aAktif.filter((a) => nanF(a.k) && a._anReta).length;
  // Tablo pwoblèm yo: yon liy pa pwoblèm, yon kolòn pa ajan (sou laptop), lis kliyan yo louvri sou tout lajè a anba liy lan.
  const kolAjan = aletF.ajan ? [] : lis.filter((a) => pw.some((r) => r.parA.get(a.user_id)));
  const kolGrid = `grid-template-columns: minmax(170px, 2.2fr) 64px ${kolAjan.map(() => "minmax(64px, 1fr)").join(" ")} minmax(210px, auto)`;
  const liy = ({ p, kont, nAlet, nReta, parA }) => `<div class="alet-pw${kont.length ? "" : " zewo"}" data-pw="${h(p.k)}">
    <div class="pw-r" style="${kolGrid}">
      <div class="pw-l"><b>${t(p.l)}</b><small class="mut">${t(p.oto ? (p.k === "kal" ? "kont" : "kliyan") : "kliyan make")}${nAlet ? ` · ${nAlet} ${t("alèt aktif")}` : ""}${nReta ? ` · <span class="err-t">${nReta} ${t("an reta")}</span>` : ""}</small></div>
      <div class="alet-pw-h pw-n"><b>${kont.length}</b></div>
      ${kolAjan.map((a) => `<div class="pw-a${parA.get(a.user_id) ? "" : " pw-a0"}" data-brut><span class="pw-a-non">${h(a.nom.split(" ")[0])}</span>${parA.get(a.user_id) || "<span class=\"mut\">—</span>"}</div>`).join("")}
      <div class="pw-b">${kont.length ? `<button type="button" class="btn sm" data-pw-wè="${h(p.k)}" aria-expanded="false">${t("Wè yo")}</button>` : ""}
        ${p.oto && kont.length ? `<button type="button" class="btn sm pri" data-pw-lanse="${h(p.k)}">${t("Lanse alèt")}</button>` : ""}</div>
    </div>
    <div class="alet-pw-lis" hidden></div></div>`;
  const pwOto = pw.filter((r) => r.p.oto).sort((a, b) => b.kont.length - a.kont.length), pwMan = pw.filter((r) => !r.p.oto);
  const tèt = `<div class="pw-r pw-tet" style="${kolGrid}"><div>${t("Pwoblèm")}</div><div class="pw-n">${t("Total")}</div>${kolAjan.map((a) => `<div class="pw-a" data-brut>${h(a.nom.split(" ")[0])}</div>`).join("")}<div></div></div>`;
  $app.innerHTML = `<div id="alet"><div class="page-head"><h1>${t("Alèt")}</h1></div>
    <p class="mut sm">${t("Kantite kliyan ki gen yon pwoblèm nan dosye yo, alèt ki aktif yo ak swivi ajan yo.")}</p>
    <label class="tx-sel alet-ajan"><span>${t("Pòtfèy")}</span><select id="alet-ajan"><option value="">${t("Tout ajan yo")}</option>${lis.map((a) => `<option value="${h(a.user_id)}" ${aletF.ajan === a.user_id ? "selected" : ""}>${h(a.nom)}</option>`).join("")}</select></label>
    <div class="kes-sum">
      <div class="card kes-k"><span>${t("Alèt aktif")}</span><b>${aAktif.filter((a) => nanF(a.k)).length}</b><small>${t("sou kont yo")}</small></div>
      <div class="card kes-k"><span>${t("An reta")}</span><b class="${nReta ? "err-t" : ""}">${nReta}</b><small>${t("dèlè a depase")}</small></div>
      <div class="card kes-k"><span>${t("Rapèl ajan yo")}</span><b>${aAktif.filter((a) => nanF(a.k) && a.tip === "rapel").length}</b><small>${t("aktif")}</small></div>
    </div>
    <h2>${t("Pwoblèm nan dosye yo")}</h2>
    <div class="card pw-tab">${tèt}${pwOto.map(liy).join("")}</div>
    <h3 class="pw-sou">${t("Pwoblèm manadjè make")} <small class="mut">${t("Make yon kliyan sou paj kont li (＋ Alèt → Pwoblèm).")}</small></h3>
    <div class="card pw-tab">${tèt}${pwMan.map(liy).join("")}</div>
    <h2>${t("Kanpay alèt yo")}</h2>
    <div class="list">${kanpay.map((g) => { const pc = g.n ? Math.round((g.regle / g.n) * 100) : 0; const parA = new Map();
      for (const x of g.l) { const id = ajanK(x.k); const o = parA.get(id) || { n: 0, r: 0 }; o.n++; if (x._eta !== "aktif") o.r++; parA.set(id, o); }
      return `<div class="row col alet-kp"><div><b>${d(g.a.tit)}</b> ${g.a.pwoblem ? `<span class="badge mut">${t(pwoblemPa(g.a.pwoblem)?.l || g.a.pwoblem)}</span>` : ""}
        ${g.a.dele ? `<span class="badge ${g.reta ? "err" : "warn"}">${t("Dèlè")} ${datFr(g.a.dele)}${g.reta ? ` · ${g.reta} ${t("an reta")}` : ""}</span>` : ""}</div>
        <div class="sm">${g.regle}/${g.n} ${t("regle")} (${pc}%) · ${t("lanse")} ${lè(g.a.kreye_le)}${nomAjan(g.a.kreye_pa) ? ` · ${d(nomAjan(g.a.kreye_pa))}` : ""}</div>
        <span class="ekip-bar" aria-hidden="true"><i style="width:${pc}%"></i></span>
        <div class="alet-pw-a">${[...parA].map(([id, o]) => `<span class="chip-s" data-brut>${h(nonA(id))} ${o.r}/${o.n}</span>`).join("")}</div>
        ${g.n - g.regle ? `<div class="btns"><button type="button" class="btn sm" data-kp-fermen="${h(g.id)}">${t("Fèmen kanpay la")}</button></div>` : ""}</div>`; }).join("") || `<p class="empty">${t("Poko gen kanpay.")}</p>`}</div>
    <h2>${t("Lòt alèt ak rapèl aktif")} <small>${lòt.length}</small></h2>
    <div class="chips filt kx-filt" role="group">${[["", "Tout"], ["reta", "An reta"], ["manyel", "Manadjè"], ["rapel", "Rapèl ajan"]].map(([v, l]) => `<button type="button" class="chip ${aletF.lis === v ? "on" : ""}" data-alis="${v}" aria-pressed="${aletF.lis === v}">${t(l)}</button>`).join("")}</div>
    <div class="list alet-tablo">${lòt.map((a) => `<div class="alet-tr">${liAlet(a, { man: true }).replace('<div class="grow">', `<div class="grow"><a class="alet-kl" href="${lyenAlet(a)}">${d(non(M.clients.get(a.k.id_personne)))} · ${d(a.k.no_compte || "")}</a> <span class="mut sm" data-brut>${h(nonA(ajanK(a.k)))}</span><br>`)}</div>`).join("") || `<p class="empty">${t("Pa gen lòt alèt aktif.")}</p>`}</div></div>`;
  document.getElementById("alet-ajan").onchange = (e) => { aletF.ajan = e.target.value; viewAlet(); };
  $app.querySelectorAll("[data-alis]").forEach((b) => (b.onclick = () => { aletF.lis = b.dataset.alis; viewAlet(); }));
  brancherAlet(M);
  $app.querySelectorAll("[data-pw-wè]").forEach((b) => (b.onclick = () => {
    const box = b.closest(".alet-pw").querySelector(".alet-pw-lis"), r = pw.find((x) => x.p.k === b.dataset.pwWè);
    box.hidden = !box.hidden;
    b.setAttribute("aria-expanded", String(!box.hidden)); b.textContent = t(box.hidden ? "Wè yo" : "Kache yo");
    if (!box.hidden) box.innerHTML = `<div class="pw-lis">${[...r.kont].sort((x, y) => nonA(ajanK(x)).localeCompare(nonA(ajanK(y)), "fr") || non(M.clients.get(x.id_personne)).localeCompare(non(M.clients.get(y.id_personne)), "fr")).map((k) => { const a = aAktif.find((x) => x.pwoblem === r.p.k && x.k.id_compte_epargne === k.id_compte_epargne);
      const foto = r.p.k === "foto" || r.p.k === "foto_move", kr = r.p.kredi ? (k._kredi || [])[0] : null;
      return `<div class="row"><a class="grow lnk" href="${foto ? `#/kliyan/${h(k.id_personne)}` : kr ? `#/kredi/${h(kr.id_compte_credit)}` : `#/cycle/${h(k.id_compte_epargne)}`}"><b>${d(non(M.clients.get(k.id_personne)))}</b><div class="mut sm">${d(kr?.no_compte || k.no_compte || "")} · <span data-brut>${h(nonA(ajanK(k)))}</span></div></a>
        ${a ? `<span class="badge ${a._anReta ? "err" : "warn"}">${t("Alèt")}${a.dele ? ` · ${datFr(a.dele)}` : ""}</span>` : ""}
        ${foto ? `<a class="btn sm pri" href="#/kliyan/${h(k.id_personne)}">📷 ${t("Ajoute foto")}</a>` : ""}</div>`; }).join("")}</div>`;
  }));
  $app.querySelectorAll("[data-pw-lanse]").forEach((b) => (b.onclick = async () => {
    if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou lanse yon kanpay alèt.");
    const r = pw.find((x) => x.p.k === b.dataset.pwLanse);
    const dejaAlet = new Set(aAktif.filter((a) => a.pwoblem === r.p.k).map((a) => a.k.id_compte_epargne));
    const sib = r.tout.filter((k) => !dejaAlet.has(k.id_compte_epargne));
    if (!sib.length) return ui.info("Tout kont sa yo gen yon alèt aktif deja.", "");
    const parA = new Map(); for (const k of sib) parA.set(ajanK(k), (parA.get(ajanK(k)) || 0) + 1);
    const opsyon = lis.filter((a) => parA.get(a.user_id)).map((a) => [a.user_id, a.nom, parA.get(a.user_id)]);
    const v = await ui.askKanpay({ titre: "Lanse yon alèt", pwoblem: r.p.l, ajan: opsyon, jodi: M.today, tit: r.p.l, dele: S.ajouteJou(M.today, 3), ajanDefo: aletF.ajan || null });
    if (!v) return;
    const kont = sib.filter((k) => v.ajan.includes(ajanK(k)));
    if (!(await ui.ask({ titre: "Lanse alèt la?", ok: "Lanse alèt la", detay: [["Pwoblèm", t(r.p.l)], ["Pòtfèy", v.ajan.map(nonA).join(", ")], ["Kont", String(kont.length)], ["Dèlè", datFr(v.dele)]] }))) return;
    try {
      const res = await api.rpc("grandon_alet_kanpay", { p_kanpay: S.uuid(), p_pwoblem: r.p.k, p_tit: v.tit, p_mesaj: v.mesaj || null, p_nivo: v.nivo, p_dele: v.dele,
        p_kont: kont.map((k) => k.id_compte_epargne), p_regle: true });
      await S.pull();
      toast(`${res?.n ?? kont.length} ${t("alèt voye bay ajan yo")} ✓`, "ok");
      viewAlet();
    } catch (e) { toast(t(e.message), "err"); }
  }));
  $app.querySelectorAll("[data-kp-fermen]").forEach((b) => (b.onclick = async () => {
    if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "");
    if (!(await ui.ask({ titre: "Fèmen kanpay la?", tekst: t("Tout alèt kanpay sa a ki toujou aktif ap fèmen. Ajan yo p ap wè yo ankò."), ok: "Fèmen kanpay la" }))) return;
    try { const res = await api.rpc("grandon_alet_kanpay_fermen", { p_kanpay: b.dataset.kpFermen }); await S.pull(); toast(`${res?.n ?? 0} ${t("alèt fèmen")}`); viewAlet(); }
    catch (e) { toast(t(e.message), "err"); }
  }));
}

// Ajan teren yo (+ «San ajan» si gen kont ki pa atache ak okenn ajan).
// ---------- Pòtfèy (manadjè): chwazi yon ajan → kliyan pòtfèy li yo ak sa ki fèt jou a (peye / fidbak / poko wè / pa jou peman) ----------
const potF = { ajan: "", jou: null, filt: "" };
async function viewPotfey() {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  // Manadjè: chwazi ajan an. Ajan: pwòp pòtfèy li sèlman.
  const man = estManager();
  const { lis, ids } = man ? await ekipAjan(M) : { lis: [{ user_id: moi.id, nom: moi.nom || nonAjan(moi.id) }], ids: new Set([moi.id]) };
  if (!man) potF.ajan = moi.id;
  else if (!potF.ajan || !lis.some((a) => a.user_id === potF.ajan)) potF.ajan = lis[0]?.user_id || "";
  potF.jou ||= M.today;
  const D = potF.jou, iso = S.isoJou(D), ferye = M.feries.has(D);
  const ajanK = (id) => (man ? (ids.has(id) ? id : SAN_AJAN) : mwenSe(id) ? moi.id : null);
  const mon = (l) => l.reduce((a, x) => a + Number(x.montant || 0), 0);
  // Kont epay pòtfèy la ki te ouvè jou sa a (pa kraze, cycle la te kòmanse epi li poko fini).
  const kont = [...M.comptes.values()].filter((k) => !k._pending && ajanK(k.created_by) === potF.ajan && !k._kraze && k.date_debut <= D && (!k.date_fin || D < k.date_fin));
  const liy = kont.map((k) => {
    const dwe = !!k.jours_paiement?.includes(iso) && !ferye;
    const dep = k._txs.filter((x) => S.txKind(x) === "depo" && x.validation_status !== "rejected" && S.jouTx(x) === D);
    const fb = [...M.suivis.values()].filter((x) => x.id_compte_epargne === k.id_compte_epargne && S.jouLokal(new Date(x.capture_le)) === D);
    const eta = dep.length ? "peye" : fb.length ? "fidbak" : dwe ? "poko" : "pa";
    return { kat: "epay", k, c: M.clients.get(k.id_personne), eta, dwe, dep, fb, mon: mon(dep), href: `#/cycle/${k.id_compte_epargne}`, no: k.no_compte, plan: k.montant_plan, jours: k.jours_paiement, reta: k._anReta };
  });
  // Kredi kliyan pòtfèy la (kont epay ki lye a se nan pòtfèy ajan an).
  for (const x of M.kredi || []) {
    const ke = M.comptes.get(x.id_compte_epargne);
    if (!ke || ajanK(ke.created_by) !== potF.ajan || x._fini || x.date_debut > D) continue;
    const dwe = x._jours.includes(iso) && !ferye && x._rete > 0;
    const dep = x._tx.filter((y) => y.validation_status !== "rejected" && S.jouKreTx(y) === D);
    const fb = x._fb.filter((y) => S.jouLokal(new Date(y.capture_le)) === D);
    const eta = dep.length ? "peye" : fb.length ? "fidbak" : dwe ? "poko" : "pa";
    liy.push({ kat: katKredi(x), k: x, c: M.clients.get(x.id_personne), eta, dwe, dep, fb, mon: mon(dep), href: `#/kredi/${x.id_compte_credit}`, no: x.no_compte, plan: x.paiement_journalier, jours: x._jours, reta: x._jouReta });
  }
  const n = (e) => liy.filter((x) => x.eta === e).length;
  const ORD = { poko: 0, fidbak: 1, peye: 2, pa: 3 };
  const vizib = liy.filter((x) => !potF.filt || x.eta === potF.filt)
    .sort((a, b) => ORD[a.eta] - ORD[b.eta] || non(a.c).localeCompare(non(b.c), "fr"));
  const ETA = { peye: ["ok", "Peye ✓"], fidbak: ["warn", "Fidbak"], poko: ["err", "Poko wè"], pa: ["mut", "Pa jou peman"] };
  const row = (x) => { const [kl, l] = ETA[x.eta];
    const det = x.eta === "peye" ? `+${gd(x.mon)} · ${x.dep.map((y) => `${lèKout(y.capture_le || y.date_transaction) || ""} <span data-brut>${h(nonAjan(y.created_by))}</span>`).join(", ")}`
      : x.eta === "fidbak" ? x.fb.map((y) => `${t(motifLabel(y.motif))}${y.note ? ` «${d(y.note)}»` : ""} · ${lèKout(y.capture_le) || ""}`).join(" · ") : "";
    const tel = String(x.c?.telephone || "").replace(/\D/g, "");
    return `<div class="row pot-r pot-${x.eta}" data-pot="${x.eta}"><a class="pokor-m lnk" href="${x.href}"><span class="txr-t"><b>${d(non(x.c))}</b> ${badjKat(x.kat)} <span class="badge ${kl}">${t(l)}</span>${x.reta > 0 ? ` <span class="badge err">${x.reta} ${t("an reta")}</span>` : ""}</span>
      <span class="mut sm">${d(x.no || "")} · ${gd(x.plan || 0)} · ${lisJou(x.jours || [])}</span>${det ? `<span class="sm">${det}</span>` : ""}</a>
      ${x.eta === "poko" && tel.length >= 8 ? `<a class="btn sm pokor-tel" href="tel:${h(tel)}">📞 ${t("Rele")}</a>` : ""}</div>`; };
  const tot = liy.filter((x) => x.dwe || x.eta === "peye" || x.eta === "fidbak");
  $app.innerHTML = `<div id="potfey"><div class="page-head"><h1>${t(man ? "Pòtfèy" : "Pòtfèy mwen")}</h1></div>
    <div class="card rapo-ba">
      ${man ? `<label class="tx-sel"><span>${t("Ajan")}</span><select id="pot-ajan">${lis.map((a) => `<option value="${h(a.user_id)}" ${a.user_id === potF.ajan ? "selected" : ""}>${h(a.nom)}</option>`).join("")}</select></label>` : ""}
      <label class="tx-sel"><span>${t("Dat")}</span><span class="rapo-dat"><button type="button" class="btn sm" id="pot-prev" aria-label="${t("Jou anvan")}">‹</button>
        <input type="date" id="pot-jou" value="${h(D)}" max="${h(M.today)}"><button type="button" class="btn sm" id="pot-next" aria-label="${t("Jou apre")}" ${D >= M.today ? "disabled" : ""}>›</button></span></label>
    </div>
    <p class="mut sm">${datFr(D)}${ferye ? ` · <b>${t("jou ferye")}</b>` : ""} · ${liy.length} ${t("kont nan pòtfèy la")} · ${tot.length} ${t("te dwe peye jou a")}</p>
    <div class="kes-sum kes-sum4">
      <div class="card kes-k" data-n="peye"><span>${t("Peye")}</span><b class="in">${n("peye")}</b><small>${gd(mon(liy.flatMap((x) => x.dep)))}</small></div>
      <div class="card kes-k" data-n="fidbak"><span>${t("Fidbak")}</span><b>${n("fidbak")}</b><small>${t("pa peye, men ajan an wè yo")}</small></div>
      <div class="card kes-k" data-n="poko"><span>${t("Poko wè")}</span><b class="${n("poko") ? "err-t" : ""}">${n("poko")}</b><small>${t("pa peye, pa gen fidbak")}</small></div>
      <div class="card kes-k" data-n="pa"><span>${t("Pa jou peman")}</span><b>${n("pa")}</b><small>${t("pa t dwe peye jou a")}</small></div>
    </div>
    <div class="chips filt kx-filt" role="group">${[["", "Tout", liy.length], ["poko", "Poko wè", n("poko")], ["fidbak", "Fidbak", n("fidbak")], ["peye", "Peye", n("peye")], ["pa", "Pa jou peman", n("pa")]]
      .map(([v, l, c0]) => `<button type="button" class="chip ${potF.filt === v ? "on" : ""}" data-pfilt="${v}" aria-pressed="${potF.filt === v}">${t(l)}<small>${c0}</small></button>`).join("")}</div>
    <div class="list tx-lis" id="pot-lis">${vizib.map(row).join("") || `<p class="empty">${t("Anyen pou montre.")}</p>`}</div></div>`;
  const ale = (j) => { if (!j) return; potF.jou = j > M.today ? M.today : j; viewPotfey(); };
  document.getElementById("pot-ajan")?.addEventListener("change", (e) => { potF.ajan = e.target.value; viewPotfey(); });
  document.getElementById("pot-jou").onchange = (e) => ale(e.target.value);
  document.getElementById("pot-prev").onclick = () => ale(S.ajouteJou(D, -1));
  document.getElementById("pot-next").onclick = () => ale(S.ajouteJou(D, 1));
  $app.querySelectorAll("[data-pfilt]").forEach((b) => (b.onclick = () => { potF.filt = b.dataset.pfilt; viewPotfey(); }));
}

async function ekipAjan(M) {
  const genKont = new Set([...M.comptes.values()].map((k) => k.created_by));
  const ekip = ((await db.meta("ekip")) || []).filter((x) => x.role === "agent" || genKont.has(x.user_id));
  const ids = new Set(ekip.map((x) => x.user_id));
  const lis = ekip.filter((x) => x.actif !== false || [...M.comptes.values()].some((k) => k.created_by === x.user_id)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  if ([...M.comptes.values()].some((k) => k._actif && !ids.has(k.created_by))) lis.push({ user_id: SAN_AJAN, nom: t("San ajan"), role: "agent", actif: true });
  return { lis, ids };
}
async function viewTablo(ajanId = null) {
  let M = await S.model();
  const M0 = M;
  const man = estManager();
  let ajan = null;
  if (ajanId && man) {
    ajans = (await db.meta("ajans")) || {};
    const { lis, ids } = await ekipAjan(M);
    ajan = lis.find((x) => x.user_id === ajanId) || { user_id: ajanId, nom: ajans[ajanId] || t("Lòt ajan") };
    M = modèlAjan(M, ajanId, ids);
  }
  const sk = ajan ? null : skòp(M);
  if (sk === "mwen") M = modèlPòtfèy(M);
  const st = statsTablo(M);
  const tc = ajan ? null : touchJodi(M0);
  const tètSk = ajan ? "" : `${man ? chwaPòtfèy(M0, { sk, tout: "Tout ekip la" }) : ""}<p class="mut sm potfey-not">${sk === "mwen"
    ? t("Chif yo se pou kliyan ki nan pòtfèy ou sèlman, ak tout depo yo, kèlkeswa ajan ki touche kòb la.")
    : t("Chif yo se pou tout kliyan Grandon yo (tout pòtfèy).")}${tc && tc.n ? ` ${t("Jodi a ou touche")} <b>${gd(tc.tout)}</b>${tc.nLòt ? ` · ${t("ladan l")} <b>${gd(tc.lòt)}</b> ${t("pou kliyan lòt ajan")} (${tc.nLòt})` : ""}.` : ""}</p>`;
  const tèt = ajan ? `<div class="ekip-tet"><a href="#/ekip" class="back">‹ ${t("Ekip")}</a><div class="ekip-non"><span class="ekip-av" aria-hidden="true">${h(inisyalNon(ajan.nom))}</span><div><b data-brut>${h(ajan.nom)}</b><small>${t("Done ajan sa a sèlman")}</small></div></div></div>` : "";
  const kf = konfMetrik(await db.meta("paramet"));
  const mtk = ajan ? seksyonMetrik(M0, M, ajan.user_id, (id) => id === ajan.user_id, kf) : sk === "mwen" ? seksyonMetrik(M0, M, moi.id, mwenSe, kf) : "";
  const mtkEkip = man && !ajan ? await (async () => { const { lis, ids } = await ekipAjan(M0); return seksyonMetrikEkip(M0, lis, ids, kf); })() : "";
  $app.innerHTML = `<div id="tablo"${ajan ? ' class="tablo-ajan"' : ""}>${tèt}${tètSk}${mtk}${L().parts.tablo({ ...ctxBase(M), stats: st, isoJou: S.isoJou(M.today) })}${man && !ajan ? `${await seksyonEkip(M0)}${mtkEkip}${seksyonKontwol(M0)}<section class="doublon-sek" id="doublon" hidden></section>` : ""}${ajan ? lisKontAjan(M) : seksyonAletTablo(M, M0)}</div>`;
  $app.querySelector("[data-mwa-reta]")?.addEventListener("click", () => { ongEpay = "kont"; filtKont = "reta"; });
  if (man && !ajan) { ajans = (await db.meta("ajans")) || {}; montreKontwol(M0); chajeDoublon(); }
  if (!ajan) brancherAlet(M0);
  $app.querySelectorAll("[data-potfey]").forEach((b) => (b.onclick = () => { pòtfèy = b.dataset.potfey; viewTablo(); }));
  $app.querySelectorAll("[data-enprime-potfey]").forEach((b) => (b.onclick = () => enprimePotfey(M0, M, ajan ? ajan.nom : t("Pòtfèy mwen"))));
  if (ajan) $app.querySelectorAll("[data-papeye]").forEach((b) => (b.onclick = () => { const k = M.comptes.get(b.dataset.papeye); paPeye(k, M.clients.get(k.id_personne) || {}); }));
}
const inisyalNon = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
// Kont yon ajan (sou paj ajan an): peman jodi a anvan, apre an reta, apre lòt yo.
function lisKontAjan(M) {
  const swiviJodi = new Map([...M.suivis.values()].filter((x) => S.jouLokal(new Date(x.capture_le)) === M.today).map((x) => [x.id_compte_epargne, x.motif]));
  const aktif = [...M.comptes.values()].filter((k) => k._actif);
  const filt0 = filtKont, tri0 = kxF.tri; filtKont = "tout"; kxF.tri = "priyorite";
  const r = lisKont(M, aktif, swiviJodi, "");
  filtKont = filt0; kxF.tri = tri0;
  return `<section class="tx-seksyon ekip-kont"><h2>${t("Kont ajan an")} <small>${aktif.length}</small></h2><div>${r.html}</div></section>`;
}
// Seksyon «Ekip la» sou Tablo manadjè a: yon liy pa ajan, klike pou wè Tablo li.
async function seksyonEkip(M) {
  const { lis, ids } = await ekipAjan(M);
  if (!lis.length) return "";
  const rows = lis.map((a) => chifAjan(M, a, ids));
  return `<section class="ekip-sek"><div class="ekip-sek-h"><h2>${t("Ekip la · jodi a")}</h2><a href="#/ekip" class="sm">${t("Wè tout")} ›</a></div>
    <div class="list ekip-mini">${rows.map(({ a, st }) => { const p = st.prevuJodi ? Math.round((st.kolekPlan / st.prevuJodi) * 100) : 0;
      return `<a class="row ekip-r" href="#/ekip/${h(a.user_id)}"><span class="ekip-av" aria-hidden="true">${h(inisyalNon(a.nom))}</span>
        <span class="ekip-m"><b data-brut>${h(a.nom)}</b><span class="mut sm">${st.peye}/${st.pouJodi} ${t("peye")} · ${gd(st.kolekte)} ${t("kolekte")}</span>
        <span class="ekip-bar" aria-hidden="true"><i style="width:${Math.min(100, p)}%"></i></span></span>
        <span class="ekip-p"><b>${p}%</b><small>${gd(st.kolekPlan)} / ${gd(st.prevuJodi)}</small></span></a>`; }).join("")}</div></section>`;
}
// Onglè Ekip (manadjè / admin): yon kat pa ajan ak chif jodi a; klike = Tablo ajan an sèlman.
async function viewEkip() {
  if (!estManager()) return go("#/");
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const { lis, ids } = await ekipAjan(M);
  const rows = lis.map((a) => chifAjan(M, a, ids));
  const tot = rows.reduce((o, { st, depoAtant }) => ({ prevu: o.prevu + st.prevuJodi, plan: o.plan + st.kolekPlan, kol: o.kol + st.kolekte, dep: o.dep + depoAtant }), { prevu: 0, plan: 0, kol: 0, dep: 0 });
  $app.innerHTML = `<div id="ekip"><div class="page-head"><h1>${t("Ekip")}</h1></div>
    <p class="mut sm">${t("Chif jodi a pou chak ajan. Peze sou yon ajan pou wè Tablo li ak kont li yo sèlman.")}</p>
    <div class="kes-sum ekip-sum">
      <div class="card kes-k"><span>${t("Pou kolekte jodi a")}</span><b>${gd(tot.prevu)}</b><small>${rows.length} ${t("ajan")}</small></div>
      <div class="card kes-k"><span>${t("Kolekte sou plan yo")}</span><b class="in">${gd(tot.plan)}</b><small>${tot.prevu ? Math.round((tot.plan / tot.prevu) * 100) : 0}% ${t("objektif la")}</small></div>
      <div class="card kes-k"><span>${t("Total kolekte")}</span><b>${gd(tot.kol)}</b><small>${tot.dep} ${t("depo an atant validasyon")}</small></div>
    </div>
    <div class="ekip-g">${rows.map(({ a, st, depoAtant, depoAtantSom, pokoWe, dènye }) => {
      const p = st.prevuJodi ? Math.round((st.kolekPlan / st.prevuJodi) * 100) : 0;
      const rete = Math.max(0, st.prevuJodi - st.kolekPlan);
      return `<a class="card ekip-k" href="#/ekip/${h(a.user_id)}">
        <div class="ekip-k-h"><span class="ekip-av" aria-hidden="true">${h(inisyalNon(a.nom))}</span><div class="grow"><b data-brut>${h(a.nom)}</b>
          <small class="mut">${a.user_id === SAN_AJAN ? t("Kont ki pa atache ak okenn ajan") : dènye ? `${t("Dènye depo")} ${lèKout(dènye)}` : t("Pa gen depo jodi a")}</small></div><span class="ekip-pc">${p}%</span></div>
        <span class="ekip-bar" aria-hidden="true"><i style="width:${Math.min(100, p)}%"></i></span>
        <dl class="ekip-dl">
          <div><dt>${t("Pou kolekte")}</dt><dd>${gd(st.prevuJodi)}</dd></div>
          <div><dt>${t("Kolekte (plan)")}</dt><dd class="in">${gd(st.kolekPlan)}</dd></div>
          <div><dt>${t("Rete")}</dt><dd class="${rete ? "err-t" : ""}">${gd(rete)}</dd></div>
          <div><dt>${t("Kliyan peye")}</dt><dd>${st.peye}/${st.pouJodi}</dd></div>
          <div><dt>${t("Poko wè")}</dt><dd class="${pokoWe ? "warn-t" : ""}">${pokoWe}</dd></div>
          <div><dt>${t("An reta")}</dt><dd class="${st.anReta ? "err-t" : ""}">${st.anReta}/${st.aktif}</dd></div>
          <div><dt>${t("Depo an atant")}</dt><dd>${depoAtant}${depoAtant ? ` · ${gd(depoAtantSom)}` : ""}</dd></div>
          <div><dt>${t("Mwa a: dwe")}</dt><dd>${gd(st.mwaDwe)}</dd></div>
        </dl></a>`; }).join("") || `<p class="empty">${t("Pa gen ajan teren.")}</p>`}</div></div>`;
}
function chifAjan(M, a, ids) {
  const Ma = modèlAjan(M, a.user_id, ids);
  const st = statsTablo(Ma);
  const depoAtant = [...Ma.txs.values()].filter((x) => x.type_transaction === "D" && x.validation_status === "pending");
  const swiviJodi = new Set([...Ma.suivis.values()].filter((x) => S.jouLokal(new Date(x.capture_le)) === M.today).map((x) => x.id_compte_epargne));
  const pouJodi = [...Ma.comptes.values()].filter((k) => k._jodiPeman);
  const pokoWe = pouJodi.filter((k) => k._jodi < Number(k.montant_plan || 0) && !swiviJodi.has(k.id_compte_epargne)).length;
  const dènye = [...Ma.txs.values()].filter((x) => S.jouTx(x) === M.today && x.created_by === a.user_id).map((x) => String(x.date_transaction)).sort().pop();
  return { a, st, depoAtant: depoAtant.length, depoAtantSom: depoAtant.reduce((s, x) => s + Number(x.montant || 0), 0), pokoWe, dènye };
}


// ---------- Rapò mobilizasyon ak nouvo kliyan (manadjè / admin) ----------
// Mwa an kou a: moyenne mobilisation chak ajan (objektif dapre mwa li), semèn nan, pwojeksyon fen mwa, nouvo kliyan ak lis yo,
// ak evolisyon moyenne lan sou 6 dènye mwa yo. Ajan ki retire nan rapò yo (Paramèt metrik) pa parèt.
async function viewMobilizasyon() {
  if (!estManager()) return go("#/");
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const kf = konfMetrik(await db.meta("paramet"));
  const { lis, ids } = await ekipAjan(M);
  const ajL = lis.filter((a) => a.user_id !== SAN_AJAN && !kf.eskli.includes(a.user_id));
  const jt = (a, b) => S.joursPeman(a, b, JOU_TRAVAY, M.feries);
  const mwa1 = M.today.slice(0, 8) + "01";
  const mwaL = [5, 4, 3, 2, 1].map((n) => { const d = new Date(mwa1 + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); });
  const nonMwa = (m, o = { month: "short" }) => new Date(m + "-15T12:00:00Z").toLocaleDateString("fr-FR", { ...o, timeZone: "UTC" });
  // Premye kont chak moun (sèvis sa a) → nouvo kliyan
  const premye = new Map();
  for (const k of M.comptes.values()) {
    const j = S.jouLokal(new Date(k.date_kreye || k.created_at || `${k.date_debut}T12:00:00Z`)), p = premye.get(k.id_personne);
    if (!p || j < p.j) premye.set(k.id_personne, { j, k });
  }
  const depoL = [...M.txs.values()].filter((x) => S.txKind(x) === "depo" && x.validation_status !== "rejected");
  const rows = ajL.map((a) => {
    const x = kalkMetrik(M, modèlAjan(M, a.user_id, ids), a.user_id, (id) => id === a.user_id, kf);
    const evo = mwaL.map((m) => { const m1 = m + "-01", mf = S.ajouteJou(S.ajouteJou(m1, 32).slice(0, 8) + "01", -1);
      const s = depoL.filter((y) => y.created_by === a.user_id && S.jouTx(y) >= m1 && S.jouTx(y) <= mf).reduce((q, y) => q + Number(y.montant || 0), 0);
      const n = jt(x.res.mobilizasyon.deb.dat && x.res.mobilizasyon.deb.dat > m1 ? x.res.mobilizasyon.deb.dat : m1, mf); return s && n ? Math.round(s / n) : null; });
    const nouvo = [...premye.values()].filter((p) => p.j >= mwa1 && p.j <= M.today && p.k.created_by === a.user_id).sort((p, q) => p.j.localeCompare(q.j));
    const nouvoAvan = (() => { const d = new Date(mwa1 + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 1); const m = d.toISOString().slice(0, 7);
      return [...premye.values()].filter((p) => p.j.startsWith(m) && p.k.created_by === a.user_id).length; })();
    return { a, x, mo: x.res.mobilizasyon, kn: x.res.kliyan_nouvo, evo, nouvo, nouvoAvan };
  });
  const x0 = rows[0]?.x;
  const Td = rows.reduce((s, r) => s + r.mo.depo, 0), Tn = rows.reduce((s, r) => s + r.kn.val, 0), jP = x0?.jPase || jt(mwa1, M.today);
  const pil = (r) => `<span class="rek-p m-${r.eta}">${r.p}%</span>`;
  const sèvis = C?.SEVIS === "epargne" ? "Epargne" : "Grandon";
  $app.innerHTML = `<div id="mobilizasyon"><a href="#/rapo" class="back no-print">‹ ${t("Rapò")}</a>
    <div class="page-head"><h1>${t("Mobilizasyon ak nouvo kliyan")} · <span data-brut>${sèvis}</span></h1></div>
    <p class="mut">${nonMwa(mwa1.slice(0, 7), { month: "long", year: "numeric" })} · ${jP}/${x0?.jTotal || "—"} ${t("jou travay")} · ${t("Semèn")} ${datFr(x0?.lendi || M.today).slice(0, 6)} – ${datFr(x0?.samdi || M.today).slice(0, 6)} · ${t("Enprime le")} ${datFr(M.today)}</p>
    <div class="rek-ch no-print"><button type="button" class="btn pri" id="mob-pdf">${t("Telechaje PDF")}</button></div>
    <div class="kes-sum rek-sum">
      <div class="card kes-k"><span>${t("Depo ekip la nan mwa a")}</span><b id="mob-depo">${gd(Td)}</b></div>
      <div class="card kes-k"><span>${t("Moyenne mobilisation ekip la")}</span><b>${gd(jP ? Td / jP : 0)}</b><small>${t("pa jou travay")}</small></div>
      <div class="card kes-k"><span>${t("Nouvo kliyan nan mwa a")}</span><b id="mob-nouvo">${Tn}</b><small>${t("objektif")} ${kf.objektif.kliyan_nouvo * rows.length}</small></div>
    </div>
    ${rows.length ? `<section class="card rek-blok"><h2>1. ${t("Moyenne mobilisation pa ajan")}</h2><div class="tbl-wrap"><table class="rek-t"><thead><tr><th>${t("Ajan")}</th><th class="n">${t("Objektif / jou")}</th><th class="n">${t("Moyenne")}</th><th class="n">%</th><th class="n">${t("Depo mwa a")}</th><th class="n">${t("Semèn sa a")}</th><th class="n">${t("Fen mwa (ritm sa a)")}</th><th class="n">${t("Bezwen / jou")}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr data-mob="${h(r.a.user_id)}"><th><span data-brut>${h(r.a.nom)}</span><small>${t("Mwa")} ${r.mo.nMwa}${r.mo.deb.dat ? ` ${t("depi")} ${datFr(r.mo.deb.dat)}${r.mo.deb.oto ? ` (${t("estimasyon")})` : ""}` : ""}</small></th>
        <td class="n">${gd(r.mo.obj)}</td><td class="n"><b>${gd(r.mo.val)}</b></td><td class="n">${pil(r.mo)}</td><td class="n mob-d">${gd(r.mo.depo)}</td>
        <td class="n">${gd(r.mo.sem.fe)}<small>${pil(r.mo.sem)} · ${t("obj.")} ${gd(r.mo.sem.obj)}</small></td>
        <td class="n">${gd(r.mo.fen.proj)}<small>${t("sou")} ${gd(r.mo.fen.objMwa)}</small></td><td class="n">${x0?.jRete ? gd(r.mo.fen.bezwen) : "—"}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="card rek-blok"><h2>2. ${t("Nouvo kliyan pa ajan")}</h2><div class="tbl-wrap"><table class="rek-t"><thead><tr><th>${t("Ajan")}</th><th class="n">${t("Mwa sa a")}</th><th class="n">${t("Objektif jiska jodi a")}</th><th class="n">%</th><th class="n">${t("Semèn sa a")}</th><th class="n">${t("Fen mwa (ritm sa a)")}</th><th class="n">${t("Mwa pase")}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><th data-brut>${h(r.a.nom)}</th><td class="n mob-n"><b>${r.kn.val}</b></td><td class="n">${r.kn.obj}</td><td class="n">${pil(r.kn)}</td><td class="n">${r.kn.sem.fe} / ${r.kn.sem.obj} ${pil(r.kn.sem)}</td><td class="n">${r.kn.fen.proj}<small>${t("sou")} ${r.kn.objMwa}</small></td><td class="n">${r.nouvoAvan}</td></tr>`).join("")}</tbody></table></div>
      ${rows.some((r) => r.nouvo.length) ? `<h3 class="mob-h3">${t("Nouvo kliyan mwa a")}</h3><div class="tbl-wrap"><table class="rek-t"><thead><tr><th>${t("Ajan")}</th><th>${t("Dat")}</th><th>${t("Kliyan")}</th><th class="n">${t("Plan")}</th></tr></thead>
      <tbody>${rows.flatMap((r) => r.nouvo.map((p) => `<tr class="mob-k"><td data-brut>${h(r.a.nom)}</td><td>${datFr(p.j).slice(0, 6)}</td><td><a href="#/kliyan/${h(p.k.id_personne)}" data-brut>${d(non(M.clients.get(p.k.id_personne) || {}))}</a><small>${h(p.k.no_compte || "")}</small></td><td class="n">${gd(p.k.montant_plan || 0)}</td></tr>`)).join("")}</tbody></table></div>` : ""}</section>
    <section class="card rek-blok"><h2>3. ${t("Evolisyon moyenne mobilisation")} <small class="mut">(${t("pa jou travay")})</small></h2><div class="tbl-wrap"><table class="rek-t"><thead><tr><th>${t("Ajan")}</th>${mwaL.map((m) => `<th class="n">${nonMwa(m)}</th>`).join("")}<th class="n">${nonMwa(mwa1.slice(0, 7))}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><th data-brut>${h(r.a.nom)}</th>${r.evo.map((v) => `<td class="n">${v == null ? "—" : gd(v)}</td>`).join("")}<td class="n"><b>${gd(r.mo.val)}</b></td></tr>`).join("")}</tbody></table></div></section>`
    : `<p class="empty">${t("Pa gen ajan teren.")}</p>`}
    <p class="mut sm rek-not">${t("Moyenne mobilisation = depo ajan an fè (pa rejte, san viman) ÷ jou travay pase nan mwa a (lendi–samdi, san jou ferye). Objektif la swiv eskalye Paramèt la dapre mwa ajan an depi dat debi l. Nouvo kliyan = moun ki gen premye kont yo nan mwa a nan pòtfèy ajan an, konpare ak ritm mwa a. Koulè yo swiv limit Paramèt la.")}</p></div>`;
  document.getElementById("mob-pdf").onclick = () => {
    const t0 = document.title; document.title = `Mobilizasyon ${sèvis} ${mwa1.slice(0, 7)}`;
    document.documentElement.classList.add("enprime"); window.print();
    setTimeout(() => { document.documentElement.classList.remove("enprime"); document.title = t0; }, 500);
  };
}

// ---------- Rapò rekouvreman (manadjè / admin) ----------
// Pou yon mwa: sa kliyan yo te dwe peye (jou peman depi 1ye mwa a oswa debi cycle la, jiska jodi a oswa fen mwa a, san jou ferye) × plan,
// sa yo peye nan mwa a (depo ki pa rejte), ak sa yo dwe. Pa ajan pòtfèy, ak lis kliyan ki dwe yo. Bouton PDF = enprime / anrejistre an PDF.
const rekF = { mwa: "", ajan: "" };
function kalkRekouvreman(M, mwa) {
  const m1 = `${mwa}-01`, mFen = S.ajouteJou(S.ajouteJou(m1, 32).slice(0, 8) + "01", -1), fen = mFen < M.today ? mFen : M.today;
  const depo = new Map();
  for (const x of M.txs.values()) {
    if (S.txKind(x) !== "depo" || x.validation_status === "rejected") continue;
    const j = S.jouTx(x); if (j < m1 || j > fen) continue;
    depo.set(x.id_compte_epargne, (depo.get(x.id_compte_epargne) || 0) + Number(x.montant || 0));
  }
  const l = [];
  for (const k of M.comptes.values()) {
    const plan = Number(k.montant_plan || 0);
    if (k._pending || k._kraze || !plan || !k.jours_paiement?.length) continue;
    const finCycle = k.date_fin ? S.ajouteJou(k.date_fin, -1) : null;
    const de = k.date_debut > m1 ? k.date_debut : m1, a = finCycle && finCycle < fen ? finCycle : fen;
    const pv = S.joursPeman(de, a, k.jours_paiement, M.feries) * plan;
    if (!pv) continue;
    const ko = depo.get(k.id_compte_epargne) || 0, dwe = Math.max(0, pv - ko);
    // Sou tout cycle la (jiska fen peryòd la): sa l te dwe depi debi cycle la − tout depo li fè sou cycle la (ratrapaj reta mwa anvan yo).
    const cyPv = S.joursPeman(k.date_debut, a, k.jours_paiement, M.feries) * plan;
    const cyKo = (k._txs || []).filter((x) => S.txKind(x) === "depo" && x.validation_status !== "rejected" && S.jouTx(x) >= k.date_debut && S.jouTx(x) <= fen).reduce((s2, x) => s2 + Number(x.montant || 0), 0);
    const cy = Math.max(0, cyPv - cyKo);
    l.push({ k, c: M.clients.get(k.id_personne) || {}, plan, pv, ko, dwe, cy, ves: Math.ceil(cy / plan) });
  }
  return { l, m1, fen };
}
async function viewRekouvreman() {
  if (!estManager()) return go("#/");
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const { lis, ids } = await ekipAjan(M);
  const mwaL = [0, 1, 2, 3, 4, 5].map((n) => { const d = new Date(M.today.slice(0, 7) + "-15T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); });
  if (!mwaL.includes(rekF.mwa)) rekF.mwa = mwaL[0];
  const nonMwa = (m) => new Date(m + "-15T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const { l, m1, fen } = kalkRekouvreman(M, rekF.mwa);
  const kf = konfMetrik(await db.meta("paramet"));
  const ajanK = (k) => (ids.has(k.created_by) ? k.created_by : SAN_AJAN);
  const nonA = (id) => lis.find((a) => a.user_id === id)?.nom || (id === SAN_AJAN ? t("San ajan") : ajans[id] || t("Lòt ajan"));
  const gw = new Map();
  for (const r of l) { const a = ajanK(r.k); if (kf.eskli.includes(a) || (rekF.ajan && a !== rekF.ajan)) continue; if (!gw.has(a)) gw.set(a, []); gw.get(a).push(r); }
  const som = (L, f) => L.reduce((s, r) => s + r[f], 0);
  const tout = [...gw.values()].flat(), Tpv = som(tout, "pv"), Td = som(tout, "dwe"), Trt = Tpv - Td, P = Tpv ? Math.round((Trt / Tpv) * 100) : 0;
  const kl = (p) => (p >= kf.objektif.rekouvreman * kf.vet / 100 ? "vet" : p >= kf.objektif.rekouvreman * kf.jon / 100 ? "jon" : "wouj");
  const ajL = [...gw.entries()].map(([a, L]) => { const pv = som(L, "pv"), d = som(L, "dwe"); return { a, L, pv, d, cy: som(L, "cy"), rt: pv - d, p: pv ? Math.round(((pv - d) / pv) * 100) : 0, dw: L.filter((r) => r.dwe > 0 || r.cy > 0) }; })
    .sort((x, y) => y.d + y.cy - x.d - x.cy);
  const nDwe = tout.filter((r) => r.dwe > 0).length, Tcy = som(tout, "cy"), nCy = tout.filter((r) => r.cy > 0).length;
  const sèvis = C?.SEVIS === "epargne" ? "Epargne" : "Grandon";
  $app.innerHTML = `<div id="rekouvreman"><a href="#/rapo" class="back no-print">‹ ${t("Rapò")}</a>
    <div class="page-head"><h1>${t("Rapò rekouvreman")} · <span data-brut>${sèvis}</span></h1></div>
    <p class="mut">${nonMwa(rekF.mwa)} · ${datFr(m1)} – ${datFr(fen)}${fen === M.today ? ` (${t("jiska jodi a")})` : ""} · ${t("Enprime le")} ${datFr(M.today)}</p>
    <div class="rek-ch no-print"><label>${t("Mwa")}<select id="rek-mwa">${mwaL.map((m) => `<option value="${m}" ${m === rekF.mwa ? "selected" : ""}>${nonMwa(m)}</option>`).join("")}</select></label>
      <label>${t("Ajan")}<select id="rek-ajan"><option value="">${t("Tout ajan yo")}</option>${lis.filter((a) => !kf.eskli.includes(a.user_id)).map((a) => `<option value="${h(a.user_id)}" ${a.user_id === rekF.ajan ? "selected" : ""} data-brut>${h(a.nom)}</option>`).join("")}</select></label>
      <button type="button" class="btn pri" id="rek-pdf">${t("Telechaje PDF")}</button></div>
    <div class="kes-sum rek-sum">
      <div class="card kes-k"><span>${t("Kliyan te dwe peye")}</span><b>${gd(Tpv)}</b></div>
      <div class="card kes-k"><span>${t("Rantre")}</span><b class="in">${gd(Trt)}</b><small>${P}%</small></div>
      <div class="card kes-k"><span>${t("Poko rantre")}</span><b class="out" id="rek-dwe">${gd(Td)}</b><small>${nDwe} ${t("kliyan ki dwe")} / ${tout.length} ${t("kont")}</small></div>
      <div class="card kes-k"><span>${t("Dwe sou cycle yo")}</span><b class="out" id="rek-cy">${gd(Tcy)}</b><small>${nCy} ${t("kliyan")} · ${t("ak reta mwa anvan yo")}</small></div>
    </div>
    ${ajL.length ? `<section class="card rek-blok"><h2>${t("Pa ajan")}</h2><div class="tbl-wrap"><table class="rek-t"><thead><tr><th>${t("Ajan")}</th><th class="n">${t("Kont")}</th><th class="n">${t("Te dwe peye")}</th><th class="n">${t("Rantre")}</th><th class="n">${t("Poko rantre")}</th><th class="n">%</th><th class="n">${t("Kliyan dwe")}</th><th class="n">${t("Dwe sou cycle la")}</th></tr></thead>
      <tbody>${ajL.map((x) => `<tr data-rek-ajan="${h(x.a)}"><th data-brut>${h(nonA(x.a))}</th><td class="n">${x.L.length}</td><td class="n">${gd(x.pv)}</td><td class="n">${gd(x.rt)}</td><td class="n err-t rek-dm">${gd(x.d)}</td><td class="n"><span class="rek-p m-${kl(x.p)}">${x.p}%</span></td><td class="n">${x.L.filter((r) => r.dwe > 0).length}</td><td class="n err-t rek-dc">${gd(x.cy)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th>${t("Total")}</th><td class="n">${tout.length}</td><td class="n">${gd(Tpv)}</td><td class="n">${gd(Trt)}</td><td class="n err-t">${gd(Td)}</td><td class="n">${P}%</td><td class="n">${nDwe}</td><td class="n err-t">${gd(Tcy)}</td></tr></tfoot></table></div></section>
    <h2 class="rek-h2">${t("Kliyan ki dwe, pa ajan")}</h2>
    ${ajL.filter((x) => x.dw.length).map((x) => `<section class="card rek-blok rek-ajan"><div class="ekip-sek-h"><h3 data-brut>${h(nonA(x.a))}</h3><span class="rek-p m-${kl(x.p)}">${x.p}% ${t("rantre")}</span></div>
      <p class="mut sm">${x.dw.length} ${t("kliyan dwe sou")} ${x.L.length} ${t("kont")} · <b>${gd(x.d)}</b> ${t("poko rantre")} ${t("pou mwa a")} · <b>${gd(x.cy)}</b> ${t("sou cycle yo")}</p>
      <div class="tbl-wrap"><table class="rek-t"><thead><tr><th>${t("Kliyan")}</th><th class="n">${t("Plan")}</th><th class="n">${t("Te dwe peye")}</th><th class="n">${t("Peye")}</th><th class="n">${t("Dwe mwa a")}</th><th class="n">${t("Dwe sou cycle la")}</th><th class="n">${t("Vèsman")}</th></tr></thead>
      <tbody>${x.dw.sort((a, b) => b.dwe + b.cy - a.dwe - a.cy).map((r) => `<tr class="rek-r"><td><a href="#/kliyan/${h(r.k.id_personne)}" data-brut>${d(non(r.c))}</a><small>${h(r.k.no_compte || "")}</small></td><td class="n">${gd(r.plan)}</td><td class="n">${gd(r.pv)}</td><td class="n">${gd(r.ko)}</td><td class="n err-t rek-dm">${gd(r.dwe)}</td><td class="n err-t rek-dc">${gd(r.cy)}</td><td class="n">${r.ves}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th>${t("Total")}</th><td></td><td class="n">${gd(som(x.dw, "pv"))}</td><td class="n">${gd(som(x.dw, "ko"))}</td><td class="n err-t">${gd(x.d)}</td><td class="n err-t">${gd(x.cy)}</td><td class="n">${som(x.dw, "ves")}</td></tr></tfoot></table></div></section>`).join("") || `<p class="empty">${t("Okenn kliyan pa dwe.")}</p>`}`
    : `<p class="empty">${t("Pa gen peman prevwa pou mwa sa a.")}</p>`}
    <p class="mut sm rek-not">${t("«Te dwe peye» = jou peman kliyan an nan mwa a (depi debi cycle li), san jou ferye, × plan li. «Peye» = depo sou kont lan nan mwa a (depo an atant yo konte, sa ki rejte yo pa konte). «Dwe mwa a» = te dwe peye − peye. «Dwe sou cycle la» = sa kliyan an te dwe depi debi cycle li − tout sa l peye sou cycle la (reta mwa anvan yo konte); «Vèsman» = kantite jou plan sa reprezante. Yon kliyan ki peye davans pa kouvri lòt kliyan. Kont ki fèmen pa konte.")}</p></div>`;
  document.getElementById("rek-mwa").onchange = (e) => { rekF.mwa = e.target.value; viewRekouvreman(); };
  document.getElementById("rek-ajan").onchange = (e) => { rekF.ajan = e.target.value; viewRekouvreman(); };
  document.getElementById("rek-pdf").onclick = () => {
    const t0 = document.title; document.title = `Rekouvreman ${sèvis} ${rekF.mwa}${rekF.ajan ? " " + nonA(rekF.ajan) : ""}`;
    document.documentElement.classList.add("enprime"); window.print();
    setTimeout(() => { document.documentElement.classList.remove("enprime"); document.title = t0; }, 500);
  };
}

// ---------- Metrik Tablo (objektif mwa a) ----------
// Manadjè/admin chwazi metrik ki parèt sou Tablo ajan yo, objektif yo ak limit koulè yo (paramèt «tablo_metrik», pa sèvis).
// Mobilizasyon: objektif la monte chak mwa dapre anseyènte ajan an (dat debi li): eskalye a, dènye mach la rete apre sa.
// Koulè: rezilta a konpare ak objektif la jiska jodi a (ritm mwa a). Vèt ≥ limit vèt · Jòn ≥ limit jòn · Wouj anba.
const METRIK = {
  mobilizasyon: { non: "Moyenne mobilisation", obj: 40000, dek: "Mwayèn depo ajan an fè pa jou travay nan mwa a (lendi–samdi, san jou ferye). Objektif la monte chak mwa depi dat debi ajan an." },
  kliyan_nouvo: { non: "Nouvo kliyan mwa a", obj: 20, dek: "Kliyan ajan an ouvri premye kont yo nan mwa a." },
  rekouvreman: { non: "Rekouvreman mwa a", obj: 90, dek: "Pousantaj sa kliyan pòtfèy la te dwe peye depi 1ye mwa a ki rantre." },
};
const ESKALYE_DEF = () => (C?.SEVIS === "epargne" ? [40000, 75000, 100000] : [40000, 75000, 100000, 125000, 150000, 175000]);
function konfMetrik(pa) {
  const c = pa?.tablo_metrik?.[C.SEVIS || "grandon"] || {};
  const obj = Object.fromEntries(Object.entries(METRIK).map(([k, m]) => [k, Number(c.objektif?.[k]) > 0 ? Number(c.objektif[k]) : m.obj]));
  const esk = Array.isArray(c.eskalye) && c.eskalye.length && c.eskalye.every((x) => Number(x) > 0) ? c.eskalye.map(Number) : ESKALYE_DEF();
  return { aktif: Array.isArray(c.aktif) ? c.aktif.filter((k) => METRIK[k]) : Object.keys(METRIK), objektif: obj, eskalye: esk,
    debut: c.debut && typeof c.debut === "object" ? c.debut : {}, eskli: Array.isArray(c.eskli) ? c.eskli : [],
    vet: Number(c.vet) > 0 ? Number(c.vet) : 100, jon: Number(c.jon) >= 0 && c.jon != null ? Number(c.jon) : 80 };
}
const JOU_TRAVAY = [1, 2, 3, 4, 5, 6];
// Dat debi ajan an: sa manadjè a mete; sinon premye kont nan pòtfèy li (estimasyon).
function debiAjan(M0, uid, kf) {
  if (kf.debut[uid]) return { dat: kf.debut[uid], oto: false };
  const l = [...M0.comptes.values()].filter((k) => k.created_by === uid || (uid === moi?.id && mwenSe(k.created_by)))
    .map((k) => S.jouLokal(new Date(k.date_kreye || k.created_at || `${k.date_debut}T12:00:00Z`))).sort();
  return l.length ? { dat: l[0], oto: true } : { dat: null, oto: true };
}
// Mwa ajan an (1 = premye mwa a), dapre dat debi a (chak mwa kòmanse menm dat la nan mwa a).
function mwaAjan(debut, jodi) {
  if (!debut || jodi < debut) return 1;
  const [y1, m1, d1] = debut.split("-").map(Number), [y2, m2, d2] = jodi.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0) + 1;
}
// uid: ajan an · estLi(created_by): depo/kont ki pou li · Mp: modèl pòtfèy li (pou rekouvreman).
function kalkMetrik(M0, Mp, uid, estLi, kf) {
  const jodi = M0.today, mwa1 = jodi.slice(0, 8) + "01", mwaFen = S.ajouteJou(S.ajouteJou(mwa1, 32).slice(0, 8) + "01", -1);
  const deb = debiAjan(M0, uid, kf), nMwa = mwaAjan(deb.dat, jodi);
  const d0 = deb.dat && deb.dat > mwa1 ? deb.dat : mwa1; // ajan ki kòmanse nan mitan mwa a: konte depi dat debi l
  const jt = (a, b) => S.joursPeman(a, b, JOU_TRAVAY, M0.feries);
  const jPase = jt(d0, jodi), jTotal = jt(d0, mwaFen) || 1, jRete = Math.max(0, jTotal - jPase);
  const rit = Math.max(jPase, 1) / jTotal;
  // Semèn sa a: lendi → samdi (jou ferye pa konte)
  const lendi = S.ajouteJou(jodi, 1 - S.isoJou(jodi)), samdi = S.ajouteJou(lendi, 5), l0 = deb.dat && deb.dat > lendi ? deb.dat : lendi;
  const sJou = jt(l0, samdi), sPase = jt(l0, jodi < samdi ? jodi : samdi);
  const depoL = [...M0.txs.values()].filter((x) => S.txKind(x) === "depo" && x.validation_status !== "rejected" && estLi(x.created_by));
  const som = (a, b) => depoL.filter((x) => { const j = S.jouTx(x); return j >= a && j <= b; }).reduce((s, x) => s + Number(x.montant || 0), 0);
  const depo = som(d0, jodi), depoS = som(l0, jodi);
  const premye = new Map(); // id_personne → premye kont (sèvis sa a)
  for (const k of M0.comptes.values()) {
    const j = S.jouLokal(new Date(k.date_kreye || k.created_at || `${k.date_debut}T12:00:00Z`));
    const p = premye.get(k.id_personne);
    if (!p || j < p.j) premye.set(k.id_personne, { j, k });
  }
  const nouvoL = [...premye.values()].filter((p) => p.j <= jodi && estLi(p.k.created_by));
  const nouvo = nouvoL.filter((p) => p.j >= mwa1).length, nouvoS = nouvoL.filter((p) => p.j >= lendi).length;
  const st = statsTablo(Mp);
  const kote = (val, obj) => { const p = obj > 0 ? Math.round((val / obj) * 100) : 0; return { p, eta: p >= kf.vet ? "vet" : p >= kf.jon ? "jon" : "wouj" }; };
  const T = kf.eskalye[Math.min(nMwa, kf.eskalye.length) - 1];
  const objK = kf.objektif.kliyan_nouvo;
  const res = {
    mobilizasyon: { val: jPase ? Math.round(depo / jPase) : 0, obj: T, nMwa, deb, depo, sous: `${gd(depo)} / ${jPase} ${t("jou")}`,
      sem: { obj: T * sJou, fe: depoS, ...kote(depoS, T * Math.max(sPase, 1)) },
      fen: { proj: jPase ? Math.round((depo / jPase) * jTotal) : 0, objMwa: T * jTotal, bezwen: jRete ? Math.ceil(Math.max(0, T * jTotal - depo) / jRete) : 0 } },
    kliyan_nouvo: { val: nouvo, obj: Math.max(1, Math.round(objK * rit)), objMwa: objK,
      sem: { obj: Math.max(1, Math.round((objK * sJou) / jTotal)), fe: nouvoS, ...kote(nouvoS, Math.max(1, (objK * Math.max(sPase, 1)) / jTotal)) },
      fen: { proj: jPase ? Math.round((nouvo / jPase) * jTotal) : 0, objMwa: objK, bezwen: Math.max(0, objK - nouvo) } },
    rekouvreman: { val: st.mwaPwosan, obj: kf.objektif.rekouvreman, sous: `${gd(st.mwaPlan)} / ${gd(st.mwaPrevu)}`, san: !st.mwaPrevu,
      fen: { rete: Math.max(0, st.mwaPrevuTotal - st.mwaKolekte), total: st.mwaPrevuTotal, kolekte: st.mwaKolekte,
        nKont: [...Mp.comptes.values()].filter((k) => k._mwaPrevuTotal > 0).length } },
  };
  for (const r of Object.values(res)) Object.assign(r, kote(r.val, r.obj));
  return { res, jPase, jTotal, jRete, lendi, samdi, sJou };
}
const ETA_M = { vet: "Vèt", jon: "Jòn", wouj: "Wouj" };
const pt = (e) => `<i class="m-${e}" aria-hidden="true"></i>`;
function kat1Metrik(k, r, x) {
  const m = METRIK[k];
  if (r.san) return `<div class="card metrik m-san" data-metrik="${k}"><span class="metrik-n">${t(m.non)}</span><b>—</b><small>${t("Pa gen peman prevwa nan mwa a.")}</small></div>`;
  const val = k === "mobilizasyon" ? `${gd(r.val)}` : k === "rekouvreman" ? `${r.val}%` : `${r.val}`;
  const obj = k === "mobilizasyon" ? `${t("Objektif")} ${gd(r.obj)} / ${t("jou")} · <span data-mwa="${r.nMwa}">${t("Mwa")} ${r.nMwa}</span>${r.deb.dat ? ` ${t("depi")} ${datFr(r.deb.dat)}${r.deb.oto ? ` (${t("estimasyon")})` : ""}` : ""}`
    : k === "rekouvreman" ? `${t("Objektif")} ${r.obj}%` : `${t("Objektif")} ${r.objMwa} · ${t("jiska jodi a")} ${r.obj}`;
  const fmt = (v) => (k === "mobilizasyon" ? gd(v) : v);
  const sem = r.sem ? `<div class="metrik-sem" data-sem="${r.sem.eta}"><span>${pt(r.sem.eta)}<b>${t("Semèn sa a")}</b> <small class="mut">${datFr(x.lendi).slice(0, 6)} – ${datFr(x.samdi).slice(0, 6)}</small></span>
      <span>${t("Objektif")} <b>${fmt(r.sem.obj)}</b> · ${t("fè deja")} <b>${fmt(r.sem.fe)}</b>${r.sem.obj > r.sem.fe ? ` · ${t("rete")} <b>${fmt(r.sem.obj - r.sem.fe)}</b>` : " ✓"}</span>
      <small class="mut">${k === "mobilizasyon" ? t("Samdi a, w ap evalye sou total depo semèn nan konpare ak objektif la.") : t("Samdi a, w ap evalye sou kantite nouvo kliyan semèn nan.")}</small></div>` : "";
  const fen = r.fen ? `<div class="metrik-fen" data-fen><b>${t("Fen mwa a")}</b>
      ${k === "mobilizasyon" ? `<span>${t("Si w kenbe ritm sa a")}: <b>${gd(r.fen.proj)}</b> ${t("sou")} ${gd(r.fen.objMwa)} (${r.fen.objMwa ? Math.round((r.fen.proj / r.fen.objMwa) * 100) : 0}%)</span>
        ${x.jRete ? `<span>${t("Pou rive sou objektif la")}: <b>${gd(r.fen.bezwen)}</b> / ${t("jou")} ${t("pou")} ${x.jRete} ${t("jou ki rete yo")}</span>` : ""}`
      : k === "kliyan_nouvo" ? `<span>${t("Si w kenbe ritm sa a")}: <b>${r.fen.proj}</b> ${t("sou")} ${r.fen.objMwa} ${t("kliyan")}</span>${r.fen.bezwen ? `<span>${t("Rete")} <b>${r.fen.bezwen}</b> ${t("kliyan pou")} ${x.jRete} ${t("jou ki rete yo")}</span>` : ""}`
      : `<span class="kv"><span>${t("Pou tout mwa a")}</span><b>${gd(r.fen.total)}</b></span>
        <span class="kv"><span>${t("Deja kolekte")}</span><b>${gd(r.fen.kolekte)} <small>(${r.fen.total ? Math.round((r.fen.kolekte / r.fen.total) * 100) : 0}%)</small></b></span>
        <span class="kv"><span>${t("Rete pou kolekte")}</span><b>${gd(r.fen.rete)}</b></span>
        <span class="kv"><span>${t("Kont k ap peye mwa a")}</span><b>${r.fen.nKont}</b></span>
        <small class="mut">${t("Si tout kont yo peye dapre kalandriye yo, pòtfèy la ap kolekte")} ${gd(r.fen.total)}.</small>
        <button type="button" class="btn sm" data-enprime-potfey>🖨 ${t("Enprime lis pòtfèy la")}</button>`}</div>` : "";
  return `<div class="card metrik m-${r.eta}" data-metrik="${k}" data-eta="${r.eta}" title="${h(t(m.dek))}"><span class="metrik-n">${t(m.non)}</span>
    <b>${val}${k === "mobilizasyon" ? `<small> / ${t("jou")}</small>` : ""}</b><small>${obj}</small>
    <span class="ekip-bar metrik-bar" aria-hidden="true"><i style="width:${Math.min(100, r.p)}%"></i></span>
    <span class="metrik-eta"><i aria-hidden="true"></i>${t(ETA_M[r.eta])} · ${r.p}%${r.sous ? ` <span class="mut">· ${r.sous}</span>` : ""}</span>${sem}${fen}</div>`;
}
// Kat enfòmasyon pòtfèy la (san objektif): TAF, Frais sèvis, Pòtfèy & finansman (manadjè).
const KAPASITE_OBJ = 3000000; // kapasite finansman minimòm pa pòtfèy
function enfoPotfey(M0, Mp) {
  const jodi = M0.today;
  const kont = [...Mp.comptes.values()].filter((k) => k._actif !== false && !k._pending);
  const mounEp = new Set(kont.map((k) => k.id_personne));
  // Règ Airtable (Statut Activité): kont aktif = gen omwen yon tranzaksyon nan 42 dènye jou yo.
  const limit42 = S.ajouteJou(jodi, -42);
  const kont42 = [...Mp.comptes.values()].filter((k) => !k._pending && k._txs.some((x) => x.validation_status !== "rejected" && S.jouTx(x) >= limit42));
  const kr = (M0.kredi || []).filter((x) => Mp.comptes.has(x.id_compte_epargne));
  const rete = (x) => Math.max(0, Number(x.montant_final || 0) - Number(x.paiement_cumule || 0));
  const enKou = kr.filter((x) => !x._fini && rete(x) > 0 && (!x.date_fin || x.date_fin >= jodi)); // pa fini, dat fen pa pase
  const doute = kr.filter((x) => !x._fini && rete(x) > 0 && x.date_fin && x.date_fin < jodi);  // kreyans dout: dat fen pase, li dwe toujou
  const mounKr = new Set(enKou.map((x) => x.id_personne));
  const fre = [...Mp.comptes.values()].filter((k) => k._fre?.pou);
  const sol = [...Mp.comptes.values()].reduce((a, k) => a + (k.solde_actuel != null ? Number(k.solde_actuel) : 0), 0);
  const aktifKr = [...enKou, ...doute];
  const prete = aktifKr.reduce((a, x) => a + Number(x.montant_prete || 0), 0);
  const kapRete = aktifKr.reduce((a, x) => a + (Number(x.montant_final) > 0 ? rete(x) * Number(x.montant_prete) / Number(x.montant_final) : 0), 0);
  return { nKont: kont.length, nMoun: mounEp.size, nKont42: kont42.length, nMoun42: new Set(kont42.map((k) => k.id_personne)).size, nKr: enKou.length, nMounKr: mounKr.size, nDoute: doute.length,
    taf: mounEp.size ? Math.round((mounKr.size / mounEp.size) * 100) : 0, fre, freSom: fre.reduce((a, k) => a + Number(k._fre.montan || 0), 0),
    sol, prete, rete: aktifKr.reduce((a, x) => a + rete(x), 0), kapRete: Math.round(kapRete), nAktifKr: aktifKr.length,
    genSol: [...Mp.comptes.values()].some((k) => k.solde_actuel != null) };
}
function katEnfo(M0, Mp) {
  const e = enfoPotfey(M0, Mp);
  const taf = `<div class="card metrik metrik-enfo m-info" data-metrik="taf" title="${h(t("Taux d'Accès au Financement: kliyan epay pòtfèy la ki gen yon kredi an kou (pa kreyans dout) sou tout kliyan epay pòtfèy la."))}">
    <span class="metrik-n">TAF · ${t("Taux d'Accès au Financement")}</span><b>${e.taf}%</b>
    <small>${e.nMounKr} ${t("kliyan ak kredi an kou")} / ${e.nMoun} ${t("kliyan epay")}</small>
    <span class="ekip-bar metrik-bar" aria-hidden="true"><i style="width:${Math.min(100, e.taf)}%"></i></span>
    <div class="metrik-fen"><span class="kv" data-kv="aktif42" title="${h(t("Kont ki gen omwen yon tranzaksyon nan 42 dènye jou yo (menm règ ak Statut Activité Airtable)."))}"><span>${t("Kont aktif (42 jou)")}</span><b>${e.nKont42} <small>· ${e.nMoun42} ${t("kliyan")}</small></b></span>
      <span class="kv" data-kv="sik" title="${h(t("Kont ki gen yon sik ki poko fini (dat fen sik la poko pase)."))}"><span>${t("Sik an kou")}</span><b>${e.nKont} <small>· ${e.nMoun} ${t("kliyan")}</small></b></span>
      <span class="kv"><span>${t("Kredi an kou")}</span><b>${e.nKr}</b></span>${e.nDoute ? `<span class="kv"><span>${t("Kreyans dout")}</span><b>${e.nDoute}</b></span>` : ""}</div></div>`;
  const fre = e.fre.length || [...Mp.comptes.values()].some((k) => k._fre) ? `<div class="card metrik metrik-enfo ${e.fre.length ? "m-jon" : "m-vet"}" data-metrik="fre">
    <span class="metrik-n">${t("Frais sèvis")}</span><b>${e.fre.length}</b><small>${t("kont elijib ki poko peye frais sèvis la")}</small>
    <div class="metrik-fen"><span class="kv"><span>${t("Total pou pran")}</span><b>${gd(e.freSom)}</b></span>${e.fre.length ? `<span class="metrik-lis">${e.fre.slice(0, 15).map((k) => `<a class="fre-r" href="#/cycle/${h(k.id_compte_epargne)}"><span data-brut>${h(non(Mp.clients.get(k.id_personne)))}<small>${h(k.no_kane || k.no_compte || "")}</small></span><b>${gd(k._fre.montan)}</b></a>`).join("")}${e.fre.length > 15 ? `<span class="mut sm">+${e.fre.length - 15} ${t("lòt")}</span>` : ""}</span>` : ""}</div></div>` : "";
  const fin = estManager() && e.genSol ? `<div class="card metrik metrik-enfo m-info" data-metrik="finansman">
    <span class="metrik-n">${t("Pòtfèy & kapasite finansman")}</span><b>${gd(e.sol)}</b><small>${t("balans total kont epay pòtfèy la")}</small>
    <span class="ekip-bar metrik-bar" aria-hidden="true"><i style="width:${Math.min(100, Math.round((e.prete / KAPASITE_OBJ) * 100))}%"></i></span>
    <div class="metrik-fen"><span class="kv"><span>${t("Kredi finanse")}</span><b>${e.nAktifKr}</b></span>
      <span class="kv"><span>${t("Kapital prete")}</span><b>${gd(e.prete)} <small>(${Math.round((e.prete / KAPASITE_OBJ) * 100)}% ${t("sou")} ${gd(KAPASITE_OBJ)})</small></b></span>
      <span class="kv"><span>${t("Rete pou ranbouse")}</span><b>${gd(e.rete)}</b></span>
      <span class="kv"><span>${t("Ladan l kapital")}</span><b>${gd(e.kapRete)}</b></span>
      <span class="kv"><span>${t("Kredi prete / balans epay")}</span><b>${e.sol ? Math.round((e.prete / e.sol) * 100) : 0}%</b></span></div></div>` : "";
  // Anvlòp kredi: kòb ajan an genyen pou l prete. Li desann lè l bay yon kredi (kapital la soti),
  // li monte lè kliyan yo ranbouse (pati kapital chak peman). Disponib = anvlòp − kapital ki deyò.
  const dispo = Math.max(0, KAPASITE_OBJ - e.kapRete), pDispo = Math.round((dispo / KAPASITE_OBJ) * 100);
  const anv = `<div class="card metrik metrik-enfo ${dispo > 0 ? "m-vet" : "m-info"}" data-metrik="anvlop" title="${h(t("Anvlòp kredi: li desann chak fwa ajan an bay yon kredi, li monte chak fwa yon kliyan ranbouse (pati kapital la)."))}">
    <span class="metrik-n">${t("Anvlòp kredi")}</span><b>${gd(dispo)}</b><small>${t("disponib pou refinanse mache a")}</small>
    <span class="ekip-bar metrik-bar" aria-hidden="true"><i style="width:${Math.min(100, pDispo)}%"></i></span>
    <div class="metrik-fen"><span class="kv"><span>${t("Anvlòp total")}</span><b>${gd(KAPASITE_OBJ)}</b></span>
      <span class="kv" data-kv="deyo"><span>${t("Kapital ki deyò")}</span><b>${gd(e.kapRete)} <small>· ${e.nAktifKr} ${t("kredi")}</small></b></span>
      <span class="kv" data-kv="dispo"><span>${t("Disponib")}</span><b>${gd(dispo)} <small>(${pDispo}%)</small></b></span></div></div>`;
  return taf + fre + fin + anv;
}
// Lis pòtfèy la pou enprime: sa chak kont dwe pou mwa a, sa ki kolekte, sa ki rete.
function enprimePotfey(M0, Mp, nonAjan_) {
  const kont = [...Mp.comptes.values()].filter((k) => k._mwaPrevuTotal > 0 || k._kolekMwa > 0)
    .sort((a, b) => non(Mp.clients.get(a.id_personne)).localeCompare(non(Mp.clients.get(b.id_personne)), "fr"));
  const som = (f) => kont.reduce((a, k) => a + Number(f(k) || 0), 0);
  const mwa = new Date(M0.today + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const liy = kont.map((k, i) => `<tr><td>${i + 1}</td><td>${h(non(Mp.clients.get(k.id_personne)))}</td><td>${h(k.no_kane || "")}</td><td>${h(k.no_compte || "")}</td>
    <td class="n">${gd(k.montant_plan || 0)}</td><td>${h(lisJou(k.jours_paiement || []))}</td><td class="n">${gd(k._mwaPrevuTotal)}</td><td class="n">${gd(k._kolekMwa || 0)}</td>
    <td class="n">${gd(Math.max(0, k._mwaPrevuTotal - (k._kolekMwa || 0)))}</td></tr>`).join("");
  const w = window.open("", "_blank");
  if (!w) return toast(t("Navigatè a bloke fenèt enpresyon an."), "err");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${h(t("Pòtfèy"))} · ${h(nonAjan_)} · ${h(mwa)}</title>
    <style>body{font:12px system-ui,sans-serif;margin:16px;color:#111}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 10px;color:#555}table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#eee}td.n,th.n{text-align:right}tfoot td{font-weight:700;background:#f6f6f6}@media print{button{display:none}}</style></head><body>
    <h1>${h(t("Lis pòtfèy la"))} · ${h(nonAjan_)}</h1><p>${h(mwa)} · ${kont.length} ${h(t("kont"))} · ${h(t("enprime"))} ${h(datFr(M0.today))}</p>
    <button onclick="print()">${h(t("Enprime"))}</button>
    <table><thead><tr><th>#</th><th>${h(t("Kliyan"))}</th><th>${h(t("Kanè"))}</th><th>${h(t("Kont"))}</th><th class="n">${h(t("Plan"))}</th><th>${h(t("Jou"))}</th>
    <th class="n">${h(t("Dwe pou mwa a"))}</th><th class="n">${h(t("Kolekte"))}</th><th class="n">${h(t("Rete"))}</th></tr></thead><tbody>${liy}</tbody>
    <tfoot><tr><td colspan="6">${h(t("Total"))}</td><td class="n">${gd(som((k) => k._mwaPrevuTotal))}</td><td class="n">${gd(som((k) => k._kolekMwa))}</td>
    <td class="n">${gd(som((k) => Math.max(0, k._mwaPrevuTotal - (k._kolekMwa || 0))))}</td></tr></tfoot></table></body></html>`);
  w.document.close();
  setTimeout(() => { try { w.print(); } catch (_) {} }, 400);
}
function seksyonMetrik(M0, Mp, uid, estLi, kf) {
  if (!kf.aktif.length) return "";
  const x = kalkMetrik(M0, Mp, uid, estLi, kf);
  return `<section class="metrik-sek" id="metrik"><div class="ekip-sek-h"><h2>${t("Objektif mwa a")}</h2><small class="mut">${x.jPase}/${x.jTotal} ${t("jou travay")}${estManager() ? ` · <a href="#/metrik">${t("Chanje")}</a>` : ""}</small></div>
    <div class="metrik-g">${kf.aktif.map((k) => kat1Metrik(k, x.res[k], x)).join("")}</div>
    <h3 class="metrik-h3">${t("Pòtfèy la")}</h3><div class="metrik-g metrik-g-enfo">${katEnfo(M0, Mp)}</div></section>`;
}
// Manadjè: tablo koulè pou chak ajan (yon kolòn pa metrik aktif).
function seksyonMetrikEkip(M0, lis, ids, kf) {
  if (!kf.aktif.length || !lis.length) return "";
  const rows = lis.filter((a) => a.user_id !== SAN_AJAN && !kf.eskli.includes(a.user_id)).map((a) => ({ a, r: kalkMetrik(M0, modèlAjan(M0, a.user_id, ids), a.user_id, (id) => id === a.user_id, kf).res }));
  if (!rows.length) return "";
  const sel = (k, r) => r.san ? `<td class="m-san">—</td>` : `<td class="m-${r.eta}" data-eta="${r.eta}"><i aria-hidden="true"></i>${k === "mobilizasyon" ? gd(r.val) : k === "rekouvreman" ? `${r.val}%` : r.val}<small>${r.p}%${k === "mobilizasyon" ? ` · ${t("Mwa")} ${r.nMwa}` : ""}${r.sem ? ` · ${t("sem.")} ${r.sem.p}%` : ""}</small></td>`;
  return `<section class="metrik-sek" id="metrik-ekip"><div class="ekip-sek-h"><h2>${t("Objektif ekip la · mwa a")}</h2><a href="#/metrik" class="sm">${t("Chanje metrik yo")} ›</a></div>
    <div class="tbl-wrap"><table class="metrik-t"><thead><tr><th>${t("Ajan")}</th>${kf.aktif.map((k) => `<th>${t(METRIK[k].non)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(({ a, r }) => `<tr><th><a href="#/ekip/${h(a.user_id)}" data-brut>${h(a.nom)}</a></th>${kf.aktif.map((k) => sel(k, r[k])).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="mut sm metrik-leje"><span class="m-vet"><i></i>${t("Vèt")} ≥ ${kf.vet}%</span> <span class="m-jon"><i></i>${t("Jòn")} ≥ ${kf.jon}%</span> <span class="m-wouj"><i></i>${t("Wouj")} &lt; ${kf.jon}% ${t("objektif la jiska jodi a")}</span></p></section>`;
}
// Paramèt metrik yo (manadjè / admin).
async function viewMetrik() {
  if (!estManager()) return go("#/");
  const M = await S.model();
  const kf = konfMetrik(await db.meta("paramet"));
  ajans = (await db.meta("ajans")) || {};
  const { lis } = await ekipAjan(M);
  const ajL = lis.filter((a) => a.user_id !== SAN_AJAN && a.actif !== false);
  $app.innerHTML = `<a href="#/param" class="back">‹ Paramèt</a><h1>${t("Metrik Tablo ajan yo")}</h1>
    <p class="mut">${t("Chwazi metrik ajan yo wè sou Tablo yo, objektif chak mwa a ak limit koulè yo. Sa aplike pou sèvis sa a sèlman.")}</p>
    <form id="f" class="card form" novalidate>
      <fieldset class="field"><legend>${t("Metrik ki parèt")}</legend>
        ${Object.entries(METRIK).map(([k, m]) => `<label class="chk"><input type="checkbox" name="aktif" value="${k}" ${kf.aktif.includes(k) ? "checked" : ""}> <span><b>${t(m.non)}</b><br><small class="mut">${t(m.dek)}</small></span></label>`).join("")}
      </fieldset>
      <fieldset class="field"><legend>${t("Moyenne mobilisation")} <small class="mut">(${t("goud pa jou, pa mwa ajan an")})</small></legend>
        <div class="esk-l" id="esk">${kf.eskalye.map((v, i) => `<label>${t("Mwa")} ${i + 1}<input type="number" inputmode="numeric" min="1" name="esk" value="${v}" required></label>`).join("")}</div>
        <div class="btns"><button type="button" class="btn sm" id="esk-plis">+ ${t("Yon mwa")}</button><button type="button" class="btn sm" id="esk-mwens">− ${t("Yon mwa")}</button></div>
        <p class="mut sm">${t("Apre dènye mwa a, objektif la rete menm jan an.")}</p>
      </fieldset>
      <fieldset class="field"><legend>${t("Dat debi ajan yo")}</legend>
        <p class="mut sm">${t("Mwa 1 kòmanse dat sa a. Si w pa mete dat, aplikasyon an pran dat premye kont nan pòtfèy ajan an (estimasyon).")}</p>
        ${ajL.map((a) => { const d = debiAjan(M, a.user_id, kf); return `<label class="deb-l"><span data-brut>${h(a.nom)}</span> <small class="mut">${t("Mwa")} ${mwaAjan(d.dat, M.today)}${d.oto && d.dat ? ` · ${t("estimasyon")}` : ""}</small>
          <input type="date" name="deb" data-u="${h(a.user_id)}" value="${h(kf.debut[a.user_id] || "")}" max="${M.today}">
          <span class="chk deb-rap"><input type="checkbox" name="nanrapo" data-u="${h(a.user_id)}" ${kf.eskli.includes(a.user_id) ? "" : "checked"}> ${t("Nan rapò yo ak tablo ekip la")}</span></label>`; }).join("") || `<p class="mut">${t("Pa gen ajan teren.")}</p>`}
      </fieldset>
      <fieldset class="field"><legend>${t("Objektif yo")}</legend>
        <label>${t("Nouvo kliyan mwa a")}<input type="number" inputmode="numeric" min="1" name="o_kliyan_nouvo" value="${kf.objektif.kliyan_nouvo}" required></label>
        <label>${t("Rekouvreman mwa a")} <small class="mut">(%)</small><input type="number" inputmode="numeric" min="1" max="100" name="o_rekouvreman" value="${kf.objektif.rekouvreman}" required></label>
      </fieldset>
      <fieldset class="field"><legend>${t("Koulè yo")} <small class="mut">(% ${t("objektif la jiska jodi a")})</small></legend>
        <div class="grid2"><label><span class="m-vet metrik-leje"><i></i></span>${t("Vèt apati")}<input type="number" min="1" name="vet" value="${kf.vet}" required></label>
          <label><span class="m-jon metrik-leje"><i></i></span>${t("Jòn apati")}<input type="number" min="0" name="jon" value="${kf.jon}" required></label></div>
        <p class="mut sm">${t("Anba limit jòn nan, metrik la wouj.")}</p></fieldset>
      <p class="err-msg" id="err" role="alert"></p>
      <button class="btn pri" type="submit">${t("Anrejistre")}</button>
    </form>`;
  const f = document.getElementById("f"), esk = document.getElementById("esk");
  const renumewo = () => esk.querySelectorAll("label").forEach((l, i) => (l.firstChild.textContent = `${t("Mwa")} ${i + 1}`));
  document.getElementById("esk-plis").onclick = () => { const v = [...esk.querySelectorAll("input")].pop()?.value || 40000;
    esk.insertAdjacentHTML("beforeend", `<label>${t("Mwa")}<input type="number" inputmode="numeric" min="1" name="esk" value="${h(v)}" required></label>`); renumewo(); };
  document.getElementById("esk-mwens").onclick = () => { const l = esk.querySelectorAll("label"); if (l.length > 1) l[l.length - 1].remove(); };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const n = (x) => Number(f[x].value);
    const debut = Object.fromEntries([...f.querySelectorAll("input[name=deb]")].filter((x) => x.value).map((x) => [x.dataset.u, x.value]));
    const vale = { aktif: [...f.querySelectorAll("input[name=aktif]:checked")].map((x) => x.value),
      eskalye: [...esk.querySelectorAll("input")].map((x) => Number(x.value)), debut,
      eskli: [...f.querySelectorAll("input[name=nanrapo]")].filter((x) => !x.checked).map((x) => x.dataset.u),
      objektif: { kliyan_nouvo: n("o_kliyan_nouvo"), rekouvreman: n("o_rekouvreman") }, vet: n("vet"), jon: n("jon") };
    if (!vale.eskalye.length || vale.eskalye.some((x) => !(x > 0))) return (err.textContent = t("Objektif yo pa bon."));
    if (Object.values(vale.objektif).some((x) => !(x > 0)) || vale.objektif.rekouvreman > 100) return (err.textContent = t("Objektif yo pa bon."));
    if (Object.values(debut).some((d) => d > M.today)) return (err.textContent = t("Dat debi a pa ka nan lavni."));
    if (!(vale.jon >= 0) || !(vale.vet > vale.jon)) return (err.textContent = t("Limit vèt la dwe pi wo pase limit jòn nan."));
    if (!navigator.onLine) return (err.textContent = t("Fòk ou gen entènèt pou chanje paramèt sa a."));
    try {
      await api.rpc("grandon_paramet_tablo", { p_vale: vale });
      await S.pull();
      toast(`${t("Metrik Tablo ajan yo")} ✓`, "ok");
      go("#/param");
    } catch (e2) { err.textContent = t(e2.message); }
  };
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
    <input id="q" type="search" class="search" placeholder="Chèche non, ID kliyan, telefòn oswa nimewo kanè…" aria-label="Chèche kliyan" value="${h(rechèch)}" autocomplete="off">
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
const estKesye = () => moi?.role === "kesye";
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
const CHAN_CYCLE = [["duree_mois", "Dire"], ["frequence_semaine", "Frekans"], ["jours_paiement", "Jou peman"], ["montant_plan", "Plan"], ["date_debut", "Dat kòmansman"]];
const CHAN_POTFEY = [["ajan", "Ajan pòtfèy"]];
const etikètChan = (kind, k) => kind === "siyati" ? "Moun ki gen dwa siyati" : ((kind === "kliyan" ? CHAN_KLIYAN : kind === "cycle" ? CHAN_CYCLE : kind === "potfey" ? CHAN_POTFEY : CHAN_TX).find(([x]) => x === k) || [k, k === "photo" ? "Foto" : k])[1];
const mwenSe = (id) => id === moi?.id || id === "moi";
const otorizasyon = (M, kind, ref) => [...M.modif.values()].find((x) => x.kind === kind && x.ref_id === ref && x.operasyon === "modifye" && x.statut === "apwouve" && mwenSe(x.agent_id));
const demannModif = (M, kind, ref) => [...M.modif.values()].find((x) => x.kind === kind && x.ref_id === ref && x.statut === "an_atant");
function ciblModif(M, kind, ref) {
  if (kind === "kliyan") return non(M.clients.get(ref));
  if (kind === "cycle" || kind === "potfey" || kind === "siyati") { const k = M.comptes.get(ref); return `${t(kind === "potfey" ? "Pòtfèy" : "Cycle")} ${k?.no_compte || ""} · ${non(k && M.clients.get(k.id_personne))}`; }
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
  const href = x.kind === "kliyan" ? `#/kliyan/${x.ref_id}` : x.kind === "cycle" || x.kind === "potfey" || x.kind === "siyati" ? `#/cycle/${x.ref_id}` : (() => { const tx = M.txs.get(x.ref_id); return tx ? `#/cycle/${tx.id_compte_epargne}` : "#/epay"; })();
  const ki = x.kind === "siyati" ? t(x.vale_avan ? "Chanje moun ki gen dwa siyati" : "Ajoute yon moun ki gen dwa siyati") : x.operasyon === "siprime" ? (x.kind === "tx" ? t("Anile tranzaksyon an") : t("Retire kliyan an nan Grandon")) : `${t("Modifye")}: ${(x.chan || []).map((k) => t(etikètChan(x.kind, k))).join(", ")}`;
  return `<div class="row col modif">
    <div><a href="${href}"><b>${x.kind === "kliyan" ? d(ciblModif(M, x.kind, x.ref_id)) : h(ciblModif(M, x.kind, x.ref_id))}</b></a> <span class="badge ${kl}">${t(et)}</span> ${x._pending ? `<span class="badge pend">${t("Poko voye")}</span>` : ""}
      <div class="sm">${ki}</div>
      ${x.kind === "cycle" && x.vale_apre && x.statut === "an_atant" ? `<div class="sm">${(x.chan || []).map((k0) => `${t(etikètChan("cycle", k0))}: <b>${valèIstorik("cycle", k0, x.vale_avan?.[k0])}</b> → <b>${valèIstorik("cycle", k0, x.vale_apre?.[k0])}</b>`).join(" · ")}${x.vale_apre.date_fin ? ` · ${t("fen")} → <b>${datFr(x.vale_apre.date_fin)}</b>` : ""}</div>` : ""}
      ${x.kind === "siyati" && x.vale_apre ? `<div class="siyati-m sm">${x.vale_apre.foto ? `<a href="${h(x.vale_apre.foto)}" target="_blank" rel="noopener"><img src="${h(x.vale_apre.foto)}" alt="${h(t("Foto pyès la"))}" loading="lazy"></a>` : ""}
        <div><b data-brut>${h(x.vale_apre.non || "")}</b><div class="mut">${h(x.vale_apre.piece || "")} · <span data-brut>${h(x.vale_apre.nif || "")}</span></div>${x.vale_avan?.non ? `<div class="mut">${t("Ranplase")}: <span data-brut>${h(x.vale_avan.non)}</span></div>` : ""}</div></div>` : ""}
      <div class="mut sm">${t("Rezon")}: ${d(x.rezon || "")} · ${lè(x.kreye_le)}${nomAjan(x.agent_id) ? ` · ${d(nomAjan(x.agent_id))}` : ""}</div>
      ${x.statut === "refize" && x.motif_refi ? `<div class="err-msg sm">${t("Rezon refi a")}: ${d(x.motif_refi)}</div>` : ""}</div>
    ${decide && x.statut === "an_atant" ? `<div class="btns"><button class="btn sm pri" data-mok="${h(x.id)}">${t("Apwouve")}</button><button class="btn sm danger" data-mnon="${h(x.id)}">${t("Refize")}</button></div>` : ""}
  </div>`;
}
async function mandeModif(M, kind, ref, { tekst, chan, siprime, deps = [] }) {
  const r = await ui.askModif({ titre: "Mande otorizasyon", tekst, chan, siprime });
  if (!r) return;
  await S.enqueue("modif_demann", { id: S.uuid(), kind, ref, operasyon: r.operasyon, chan: r.chan, rezon: r.rezon, kreye_le: new Date().toISOString() }, deps);
  toast(t(kind === "tx" ? "Demann lan voye bay responsab kès la." : "Demann lan voye bay manadjè a."));
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
    await S.patch("modif", [id], { statut: !ok ? "refize" : x.operasyon === "siprime" ? "itilize" : "apwouve" });
    S.pullFon();
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
  const fòm = (lis) => lis.map(([k, l]) => ({ k, label: l, type: k === "type_frais" ? "select" : k === "note" ? "text" : "number", value: valè[k] ?? "", options: [...new Set([...TYPES_FRE, ...(valè[k] && k === "type_frais" ? [valè[k]] : [])])] }));
  const voye = async (otorizasyon, lis, v) => {
    await S.enqueue("modif_aplike", { id: S.uuid(), otorizasyon, kind: "tx", ref: id, chan: lis, vale: v });
    toast("Modifikasyon an anrejistre."); render();
  };
  if (estKesye()) {
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
  if (demannModif(M, "tx", id)) return ui.info("Demann ou an atant.", "Responsab kès la poko reponn demann ou an pou tranzaksyon sa a.");
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
    // Se balans VALIDE a sèlman ki ka retire: depo ki poko valide pa konte.
    const valide = k?.solde_actuel != null ? Number(k.solde_actuel) : null;
    const lòt = [...M.demandes.values()].filter((x) => x.id !== id && x.id_compte_epargne === dm.id_compte_epargne && x.statut === "en_attente").reduce((a, x) => a + Number(x.montant || 0), 0);
    const dispo = valide == null ? null : valide - lòt;
    const twòp = dispo != null && Number(dm.montant) > dispo;
    if (!(await ui.ask({ titre: dm.type === "V" ? "Apwouve viman sa a?" : "Apwouve retrè sa a?", ok: "Apwouve", foto: c?.photo_url, danje: twòp, ikon: twòp ? "!" : "?",
      tekst: twòp ? "Balans valide a pa ase pou montan sa a: sèvè a ap refize l. Valide depo ki an atant yo anvan si kliyan an te vrèman bay kòb la." : "",
      detay: [["Kliyan", non(c)], ["Kont", k?.no_compte || ""], ["Montan (goud)", gd(dm.montant)],
        ...(dm.type === "V" ? [["Kont ki resevwa", M.comptes.get(dm.id_compte_dest)?.no_compte || ""]] : []),
        ...(valide != null ? [["Balans valide", gd(valide)]] : []),
        ...(Number(k?.depo_an_atant) > 0 ? [["Depo poko valide (pa konte)", gd(k.depo_an_atant)]] : []),
        ...(lòt > 0 ? [["Lòt demann an atant", gd(lòt)]] : []),
        ...(dispo != null ? [["Disponib pou retrè", gd(Math.max(0, dispo))]] : [])] }))) return;
  } else {
    motif = await ui.askText({ titre: "Refize demann sa a?", label: "Rezon refi a", min: 3 });
    if (!motif) return;
  }
  try {
    await api.rpc("grandon_decider", { p_id: id, p_ok: ok, p_motif: motif });
    toast(ok ? "Demann lan apwouve." : "Demann lan refize.");
    await S.patch("demandes", [id], { statut: ok ? "approuvee" : "refusee" });
    S.pullFon();
  } catch (e) { return ui.info("Erè", e.message); }
  render();
}
async function paPeye(k, c) {
  if (!(await leOk())) return montreLeFèmen();
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
const TX_ETA = [["", "Tout eta"], ["poko", "Poko voye"], ["atant", "An atant validasyon"], ["valide", "Valide ✓"], ["anile", "Anile / refize"]];
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
    return non(k && M.clients.get(k.id_personne)).toLowerCase().includes(v) || kontKoresponn(k, v);
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
// ---------- Lis kont (Epay → Kont): menm prensip — yon sèl kolòn, dènye depo (dat + lè), tri, gwoup ----------
const KX_TRI = [["priyorite", "Priyorite (jodi a anvan)"], ["kliyan", "Kliyan (A → Z)"], ["dennye", "Dènye depo (pi resan)"], ["ansyen", "Dènye depo (pi ansyen)"],
  ["reta", "Pi plis pou rekipere"], ["plan", "Plan pi gwo"], ["pwogre", "Pwogrè pi ba"]];
const kxF = { tri: "priyorite" };
const dennyeDepo = (k) => k._txs?.find((x) => S.txKind(x) === "depo" && x.validation_status !== "rejected") || null;
function koleLè(M, x) { // [lè, ti dat] pou kolòn agòch la
  if (!x) return ["—", t("Pa gen depo")];
  const j = S.jouTx(x);
  return [lèKout(x.date_transaction) || "—", j === M.today ? t("jodi a") : j === S.ajouteJou(M.today, -1) ? t("yè") : datKout(j)];
}
// Cycle fini men kont lan toujou gen kòb: ajan an dwe toujou jwenn li.
const finiAktif = (k) => !k._actif && !k._pending && !!k.date_fin && (k.gen_kob === true || (Number(k._solde) || 0) > 0 || (k._local || 0) > 0);
function seksyonFini(M, swiviJodi) {
  const l = [...M.comptes.values()].filter(finiAktif).sort((a, b) => String(b.date_fin).localeCompare(String(a.date_fin)));
  if (!l.length) return "";
  return `<section class="tx-seksyon kx-fini"><h2>${t("Cycle fini")} <small>${l.length}</small></h2>
    <p class="mut sm">${t("Cycle sa yo fini, men kliyan an toujou gen kòb sou kont lan. Yon manadjè ka lonje cycle a («Modifye cycle a»).")}</p>
    <div class="list tx-lis">${l.map((k) => rowKont(M, k, swiviJodi).replace('<span class="txr-t">', `<span class="txr-t"><span class="badge mut">${t("Fini")} ${datFr(k.date_fin)}</span> `)).join("")}</div></section>`;
}
function rowKont(M, k, swiviJodi) {
  const c = M.clients.get(k.id_personne) || {}, id = k.id_compte_epargne, plan = Number(k.montant_plan || 0);
  const ok = k._jodi >= plan, fb = swiviJodi.get(id), dx = dennyeDepo(k), [lèD, jouD] = koleLè(M, dx);
  const np = k._joursPeye.size, nv = k._prevuTotal;
  const badj = [k._jodiPeman ? (ok ? `<span class="badge ok">${t("Peye jodi a")}</span>` : `<span class="badge info">${t("Peman jodi a")}</span>`) : "",
    k._anReta > 0 ? `<span class="badge err">${t("An reta")}</span>` : "", fb && !ok ? `<span class="badge warn">${t("Fidbak anrejistre")} · ${t(MOTIF_KOUT[fb] || "Lòt")}</span>` : "", badgePend(k)].join(" ");
  const aksyon = k._jodiPeman && !ok
    ? `<a class="btn sm pri" href="#/tx/nouvo/${h(id)}">Depo</a><button type="button" class="btn sm" data-papeye="${h(id)}">Pa peye</button>`
    : ok && k._jodiPeman ? `<b class="in">✓ ${gd(k._jodi)}</b><a class="btn sm" href="#/tx/nouvo/${h(id)}">Depo</a>` : `<a class="btn sm pri" href="#/tx/nouvo/${h(id)}">Depo</a>`;
  return `<div class="row kxr${ok && k._jodiPeman ? " kxr-ok" : ""}" data-kx="${h(id)}">
    <span class="txr-le" title="${h(t("Dènye depo"))}"><b class="mono">${lèD}</b><small>${jouD}</small></span>
    <a class="kxr-main lnk" href="#/cycle/${h(id)}">
      <span class="txr-t"><b>${d(non(c))}</b> ${badj}</span>
      <span class="mut sm">${badjKat("epay")} ${d(k.no_compte || t("Cycle poko voye"))}${kane(k)} · ${k.plan_lib ? `plan ${t("Lib")} (min ${gd(plan)})` : `plan ${gd(plan)}`}${k.tip_plan === "vip" ? ` · <b class="vip-t">VIP</b>` : ""}${k.frequence_semaine ? ` · ${k.frequence_semaine}×/sem · ${lisJou(k.jours_paiement)}` : ""}</span>
      <span class="sm kxr-v"><b>${np}/${nv ?? "?"}</b> ${t("vèsman")}${k._aRekipere > 0 ? ` · <span class="err-t">${F.rekipere(k._aRekipere, k._anReta)}</span>` : ""}${estManager() && k._solde != null ? ` · ${t("Balans")}: <b>${gd(k._solde)}</b>` : ""}</span>
      ${nv ? `<span class="kxr-bar" aria-hidden="true"><i style="width:${k._pwosan || 0}%"></i></span>` : ""}</a>
    <span class="kxr-ak">${aksyon}</span></div>`;
}
function lisKont(M, aktif, swiviJodi, v) {
  const l = aktif.filter((k) => (filtKont === "jodi" ? k._jodiPeman : filtKont === "reta" ? k._anReta > 0 : filtKont === "rete" ? k._jodiPeman && k._jodi < Number(k.montant_plan || 0)
      : filtKont === "peye" ? k._jodiPeman && k._jodi >= Number(k.montant_plan || 0) : true))
    .filter((k) => !v || non(M.clients.get(k.id_personne)).toLowerCase().includes(v) || kontKoresponn(k, v));
  const nm = (k) => non(M.clients.get(k.id_personne));
  const dd = (k) => String(dennyeDepo(k)?.date_transaction || "");
  const CMP = { kliyan: (a, b) => nm(a).localeCompare(nm(b), "fr"), dennye: (a, b) => dd(b).localeCompare(dd(a)) || nm(a).localeCompare(nm(b), "fr"),
    ansyen: (a, b) => (dd(a) || "~").localeCompare(dd(b) || "~") || nm(a).localeCompare(nm(b), "fr"),
    reta: (a, b) => (b._aRekipere || 0) - (a._aRekipere || 0) || nm(a).localeCompare(nm(b), "fr"),
    plan: (a, b) => Number(b.montant_plan || 0) - Number(a.montant_plan || 0) || nm(a).localeCompare(nm(b), "fr"),
    pwogre: (a, b) => (a._pwosan || 0) - (b._pwosan || 0) || nm(a).localeCompare(nm(b), "fr") };
  const rann = (xs) => `<div class="list tx-lis">${xs.map((k) => rowKont(M, k, swiviJodi)).join("")}</div>`;
  let html = "";
  if (kxF.tri === "priyorite") {
    const plan = (k) => Number(k.montant_plan || 0);
    const G = [["rete", "Peman jodi a · poko peye", (k) => k._jodiPeman && k._jodi < plan(k)], ["reta", "An reta", (k) => !k._jodiPeman && k._anReta > 0],
      ["peye", "Peye jodi a", (k) => k._jodiPeman && k._jodi >= plan(k)], ["lot", "Lòt kont aktif", () => true]];
    const rest = [...l].sort(CMP.kliyan);
    for (const [cle, tit, f] of G) {
      const xs = rest.filter(f); if (!xs.length) continue;
      xs.forEach((k) => rest.splice(rest.indexOf(k), 1));
      const som = cle === "rete" ? xs.reduce((a, k) => a + plan(k) - (k._jodi || 0), 0) : cle === "reta" ? xs.reduce((a, k) => a + (k._aRekipere || 0), 0)
        : cle === "peye" ? xs.reduce((a, k) => a + (k._jodi || 0), 0) : 0;
      const somTxt = !som ? "" : cle === "peye" ? ` · ${t("kolekte")} <b class="in">${gd(som)}</b>` : ` · <b class="err-t">${gd(som)}</b> ${t(cle === "rete" ? "pou kolekte" : "pou rekipere")}`;
      html += `<section class="txj kxg-${cle}"><div class="txj-h"><h3>${t(tit)}</h3><span class="mut sm">${xs.length} ${t("kont")}${somTxt}</span></div>${rann(xs)}</section>`;
    }
  } else html = rann(l.sort(CMP[kxF.tri] || CMP.kliyan));
  return { html: html || `<p class="empty">${v || filtKont !== "tout" ? t("Anyen pa koresponn.") : t("Pa gen kont ak cycle aktif.")}</p>`, n: l.length };
}
function seksyonKont(M, aktif, swiviJodi, st, ek = null) {
  const v0 = filtEpay.trim().toLowerCase();
  const r = lisKont(v0 && ek ? ek.M0 : M, v0 && ek ? ek.tout : aktif, swiviJodi, v0);
  const nRete = aktif.filter((k) => k._jodiPeman && k._jodi < Number(k.montant_plan || 0)).length;
  const FILT = [["tout", "Tout", aktif.length], ["jodi", "Peman jodi a", st.pouJodi], ["rete", "Poko peye", nRete], ["peye", "Peye jodi a", st.peye], ["reta", "An reta", st.anReta]];
  return `<section class="tx-seksyon kx-seksyon"><h2>${ek?.sk === "mwen" ? t("Kont nan pòtfèy ou") : "Kont ak cycle aktif"} <small id="kx-n">${r.n}</small></h2>
    ${ek?.chwa || ""}${ek?.sk === "mwen" ? `<p class="mut sm potfey-not">${t("Pou touche pou yon kliyan lòt ajan, chèche non l oswa nimewo kont li: rechèch la gade tout kliyan yo.")}</p>` : ""}
    <div class="tx-tool kx-tool">
      <input id="q" type="search" class="search" placeholder="Chèche kliyan oswa nimewo kont…" aria-label="Chèche kont" value="${h(filtEpay)}" autocomplete="off">
      <label class="tx-sel"><span>Triye pa</span><select id="kx-tri">${KX_TRI.map(([k, l]) => `<option value="${k}" ${k === kxF.tri ? "selected" : ""}>${t(l)}</option>`).join("")}</select></label>
    </div>
    <div class="chips filt kx-filt" role="group" aria-label="Filt">${FILT.map(([v, l, n]) => `<button type="button" class="chip ${filtKont === v ? "on" : ""}" data-filt="${v}" aria-pressed="${filtKont === v}">${t(l)}<small>${n}</small></button>`).join("")}</div>
    <div id="kont">${r.html}</div></section>`;
}

// ---------- Lis fidbak (Epay → Fidbak): yon sèl kolòn, lè, tri, filt, gwoupe pa jou ----------
const FB_TRI = [["dat_desc", "Pi resan anvan"], ["dat_asc", "Pi ansyen anvan"], ["kliyan", "Kliyan (A → Z)"]];
const fbF = { tri: "dat_desc", motif: "", kw: "", q: "" };
function rowFb(M, x) {
  const k = M.comptes.get(x.id_compte_epargne), c = k && M.clients.get(k.id_personne), ajan = nomAjan(x.agent_id);
  const j = S.jouLokal(new Date(x.capture_le));
  return `<a class="row txr fbr" href="#/cycle/${h(x.id_compte_epargne)}">
    <span class="txr-le"><b class="mono">${lèKout(x.capture_le) || "—"}</b>${fbF.tri === "kliyan" ? `<small>${j === M.today ? t("jodi a") : datKout(j)}</small>` : ""}</span>
    <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> <span class="badge warn">${t(MOTIF_KOUT[x.motif] || "Lòt")}</span> ${badgePend(x)} ${estManager() ? badjKontwol(x) : ""}</span>
      <span class="sm rezon">${t(motifLabel(x.motif))}</span>
      <span class="mut sm txr-d">${d(k?.no_compte || t("Cycle poko voye"))}${ajan ? ` · <span data-brut>${h(ajan)}</span>` : ""}</span>
      ${x.note ? `<span class="sm nòt">«${d(x.note)}»</span>` : ""}
      ${x._error ? `<span class="err-msg sm">${d(t(x._error))}</span>` : ""}</span></a>`;
}
function lisFb(M, swivis, semenDe) {
  const jou = (x) => S.jouLokal(new Date(x.capture_le));
  const v = fbF.q.trim().toLowerCase();
  const nm = (x) => { const k = M.comptes.get(x.id_compte_epargne); return non(k && M.clients.get(k.id_personne)); };
  const l = swivis.filter((x) => (filtFidbak === "jodi" ? jou(x) === M.today : filtFidbak === "semen" ? jou(x) >= semenDe : true))
    .filter((x) => !fbF.motif || (fbF.motif === "lot" ? !MOTIF_KOUT[x.motif] || x.motif === "lot" : x.motif === fbF.motif))
    .filter((x) => !fbF.kw || (fbF.kw === "sispek" ? S.swiviSispèk(x) : x.kontwol === "ok"))
    .filter((x) => !v || nm(x).toLowerCase().includes(v) || kontKoresponn(M.comptes.get(x.id_compte_epargne), v));
  const dat = (x) => String(x.capture_le || "");
  l.sort(fbF.tri === "dat_asc" ? (a, b) => dat(a).localeCompare(dat(b)) : fbF.tri === "kliyan" ? (a, b) => nm(a).localeCompare(nm(b), "fr") || dat(b).localeCompare(dat(a)) : (a, b) => dat(b).localeCompare(dat(a)));
  let html = "";
  if (fbF.tri !== "kliyan") {
    const gr = new Map();
    for (const x of l) { const j = jou(x); if (!gr.has(j)) gr.set(j, []); gr.get(j).push(x); }
    for (const [j, xs] of gr) {
      const nSis = estManager() ? xs.filter((x) => S.swiviSispèk(x)).length : 0;
      html += `<section class="txj"><div class="txj-h"><h3>${jouLabel(M, j)}</h3><span class="mut sm">${xs.length} ${t("fidbak")}${nSis ? ` · <b class="err-t">${nSis} ${t("pa kote kliyan an")}</b>` : ""}</span></div>
        <div class="list tx-lis">${xs.map((x) => rowFb(M, x)).join("")}</div></section>`;
    }
  } else html = `<div class="list tx-lis">${l.map((x) => rowFb(M, x)).join("")}</div>`;
  const vid = v || fbF.motif || fbF.kw ? t("Anyen pa koresponn.") : t(filtFidbak === "jodi" ? "Pa gen fidbak jodi a." : filtFidbak === "semen" ? "Pa gen fidbak nan 7 dènye jou yo." : "Poko gen fidbak.");
  return { html: html || `<p class="empty">${vid}</p>`, n: l.length };
}
function seksyonFb(M, swivis, semenDe, FF) {
  const r = lisFb(M, swivis, semenDe);
  const sel = (id, lbl, L, v) => `<label class="tx-sel"><span>${t(lbl)}</span><select id="${id}">${L.map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${t(l)}</option>`).join("")}</select></label>`;
  return `<section class="tx-seksyon fb-seksyon"><h2>Fidbak yo <small id="fb-n">${r.n}</small></h2>
    <p class="mut sm sub">Sa kliyan yo di lè yo pa peye (bouton «Pa peye»).</p>
    <div class="chips filt" role="group" aria-label="Filt fidbak">${FF.map(([v, l, n]) => `<button type="button" class="chip ${filtFidbak === v ? "on" : ""}" data-ffb="${v}" aria-pressed="${filtFidbak === v}">${l}<small>${n}</small></button>`).join("")}</div>
    <div class="tx-tool${estManager() ? "" : " fb-tool-3"}">
      <input id="fb-q" type="search" class="search" placeholder="Chèche kliyan oswa nimewo kont…" aria-label="Chèche fidbak" value="${h(fbF.q)}" autocomplete="off">
      ${sel("fb-tri", "Triye pa", FB_TRI, fbF.tri)}${sel("fb-motif", "Rezon", [["", "Tout rezon"], ...Object.entries(MOTIF_KOUT)], fbF.motif)}
      ${estManager() ? sel("fb-kw", "Kote", [["", "Tout"], ["sispek", "Pa kote kliyan an"], ["ok", "Kote kliyan an"]], fbF.kw) : ""}
    </div>
    <div class="list-fb" id="fidbak-list">${r.html}</div></section>`;
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
  const M0 = await S.model();
  const sk = pòtfèy || skòp(M0); // Kont sèlman: tranzaksyon ak fidbak yo rete sou tout done ajan an wè
  const M = sk === "mwen" ? modèlPòtfèy(M0) : M0;
  ajans = (await db.meta("ajans")) || {};
  const man = estManager();
  const enAtant = [...M0.demandes.values()].filter((x) => x.statut === "en_attente").sort((a, b) => String(a.capture_le).localeCompare(String(b.capture_le)));
  if (ongEpay === "valid" && !man) ongEpay = "kont";
  const swivis = [...M0.suivis.values()].sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
  const jouSwivi = (x) => S.jouLokal(new Date(x.capture_le));
  const semenDe = S.ajouteJou(M.today, -6);
  const nFbJodi = swivis.filter((x) => jouSwivi(x) === M.today).length, nFbSemen = swivis.filter((x) => jouSwivi(x) >= semenDe).length;
  const modifAtant = [...M0.modif.values()].filter((x) => x.statut === "an_atant" && (x.kind === "kliyan" || x.kind === "cycle" || x.kind === "siyati" || x.kind === "tx")).sort((a, b) => String(a.kreye_le).localeCompare(String(b.kreye_le)));
  const vipAtant = [...M0.demandes.values()].filter((x) => x.statut === "otorizasyon" && !x._pending).sort((a, b) => String(a.capture_le).localeCompare(String(b.capture_le)));
  const ongs = [["kont", "Kont", null], ["tx", "Tranzaksyon", null], ["fidbak", "Fidbak", nFbJodi || null], ...(man ? [["valid", "Validasyon", modifAtant.length + vipAtant.length || null]] : [])];
  const st = statsEpay(M);
  const swiviJodi = new Map([...M0.suivis.values()].filter((x) => S.jouLokal(new Date(x.capture_le)) === M.today).map((x) => [x.id_compte_epargne, x.motif]));
  const pouJodi = [...M.comptes.values()].filter((k) => k._jodiPeman).sort((a, b) => (a._jodi >= a.montant_plan) - (b._jodi >= b.montant_plan));
  const aktif = [...M.comptes.values()].filter((k) => k._actif)
    .sort((a, b) => non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne))));
  const aktifTout = [...M0.comptes.values()].filter((k) => k._actif || finiAktif(k));
  const ekKont = { sk, M0, tout: aktifTout, chwa: chwaPòtfèy(M0, { sk, tout: "Tout kliyan" }) };
  const P = L().parts;
  const rowsKont = () => {
    const v = filtEpay.trim().toLowerCase();
    const l = aktif.filter((k) => (filtKont === "jodi" ? k._jodiPeman : filtKont === "reta" ? k._anReta > 0 : true))
      .filter((k) => !v || non(M.clients.get(k.id_personne)).toLowerCase().includes(v) || kontKoresponn(k, v));
    return l.map((k) => P.kontRow(ctxKontRow(M, k, "aktif", swiviJodi))).join("") || `<p class="empty">${v || filtKont !== "tout" ? t("Anyen pa koresponn.") : t("Pa gen kont ak cycle aktif.")}</p>`;
  };
  void rowsKont; // ansyen rann pa look (kontRow) — lis komen an (seksyonKont) ranplase l
  const ctx = {
    ...ctxBase(M), isoJou: S.isoJou(M.today), ong: ongEpay, ongs, stats: st, filt: filtKont, q: filtEpay, nJodi: pouJodi.length, nKont: aktif.length, nEnAtant: enAtant.length,
    jodiHtml: pouJodi.map((k) => P.kontRow(ctxKontRow(M, k, "jodi", swiviJodi))).join(""), kontHtml: rowsKont(),
    txHtml: "", demannHtml: "", validHtml: "", fidbakHtml: "", fidbakFilt: "", fidbakVid: "", nFidbak: 0, filtFb: filtFidbak,
    kontSeksyon: ongEpay === "kont" ? seksyonKont(M, aktif, swiviJodi, st, ekKont) + seksyonFini(M, swiviJodi) : "", fidbakSeksyon: "",
  };
  if (ongEpay === "fidbak") {
    const lis = swivis.filter((x) => (filtFidbak === "jodi" ? jouSwivi(x) === M.today : filtFidbak === "semen" ? jouSwivi(x) >= semenDe : true));
    const FF = [["jodi", "Jodi a", nFbJodi], ["semen", "7 jou", nFbSemen], ["tout", "Tout", swivis.length]];
    ctx.fidbakFilt = `<div class="chips filt" role="group" aria-label="Filt fidbak">${FF.map(([v, l, n]) => `<button type="button" class="chip ${filtFidbak === v ? "on" : ""}" data-ffb="${v}" aria-pressed="${filtFidbak === v}">${l}<small>${n}</small></button>`).join("")}</div>`;
    ctx.fidbakHtml = lis.map((x) => liSwivi(M0, x)).join("");
    ctx.nFidbak = lis.length;
    ctx.fidbakVid = filtFidbak === "jodi" ? "Pa gen fidbak jodi a." : filtFidbak === "semen" ? "Pa gen fidbak nan 7 dènye jou yo." : "Poko gen fidbak.";
    ctx.fidbakSeksyon = seksyonFb(M0, swivis, semenDe, FF);
  }
  if (ongEpay === "tx") {
    const mesDm = [...M0.demandes.values()].filter((x) => man || x.agent_id === moi.id || x.agent_id === "moi")
      .sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le))).slice(0, 20);
    const mesModif = [...M0.modif.values()].filter((x) => man || mwenSe(x.agent_id)).sort((a, b) => String(b.kreye_le).localeCompare(String(a.kreye_le))).slice(0, 20);
    ctx.demannHtml = mesDm.map((x) => liDemande(M0, x)).join("") + mesModif.map((x) => liModif(M0, x)).join("");
    ctx.txHtml = seksyonTx(M0);
  }
  if (ongEpay === "valid") {
    ctx.validNote = t("Demann modifikasyon fich kliyan ak cycle yo. Depo, retrè, viman ak modifikasyon tranzaksyon yo ale kay responsab kès la.");
    ctx.validHtml = (vipAtant.length ? `<h3 class="vip-h">${t("Retrè VIP pou otorize")} <small>${vipAtant.length}</small></h3>
      <p class="mut sm">${t("Apre otorizasyon an, demann lan ale kay responsab kès la pou l valide l epi peye kliyan an.")}</p>
      ${vipAtant.map((x) => liDemande(M0, x).replace(/<\/div>\s*$/, `<div class="btns"><button class="btn sm pri" data-oto-ok="${h(x.id)}">${t("Otorize")}</button><button class="btn sm danger" data-oto-non="${h(x.id)}">${t("Refize")}</button></div></div>`)).join("")}
      <h3>${t("Modifikasyon fich kliyan")}</h3>` : "") + modifAtant.map((x) => liModif(M0, x, { decide: true })).join("");
  }
  $app.innerHTML = `<div id="epay">${P.epay(ctx)}</div>`;
  // Apre yon klik sou onglè/filt, paj la re-rann: remete fokis la sou menm bouton an (klavye / lektè ekran).
  const reRann = (sel) => viewEpay().then(() => requestAnimationFrame(() => $app.querySelector(sel)?.focus({ preventScroll: true })));
  $app.querySelectorAll("[data-ong]").forEach((b) => (b.onclick = () => { ongEpay = b.dataset.ong; reRann(`[data-ong="${ongEpay}"]`); }));
  $app.querySelectorAll("[data-potfey]").forEach((b) => (b.onclick = () => { pòtfèy = b.dataset.potfey; reRann(`[data-potfey="${pòtfèy}"]`); }));
  $app.querySelectorAll("[data-filt]").forEach((b) => (b.onclick = () => { filtKont = b.dataset.filt; reRann(`[data-filt="${filtKont}"]`); }));
  $app.querySelectorAll("[data-ffb]").forEach((b) => (b.onclick = () => { filtFidbak = b.dataset.ffb; reRann(`[data-ffb="${filtFidbak}"]`); }));
  const q = document.getElementById("q");
  const rannKont = () => { const box = document.getElementById("kont"); if (!box) return; const v = filtEpay.trim().toLowerCase(), r = lisKont(v ? M0 : M, v ? aktifTout : aktif, swiviJodi, v); box.innerHTML = r.html; document.getElementById("kx-n").textContent = r.n; brancherKont(); };
  if (q) q.oninput = () => { filtEpay = q.value; rannKont(); };
  const kxTri = document.getElementById("kx-tri"); if (kxTri) kxTri.onchange = () => { kxF.tri = kxTri.value; rannKont(); };
  const rannFb = () => { const r = lisFb(M0, swivis, semenDe); document.getElementById("fidbak-list").innerHTML = r.html; document.getElementById("fb-n").textContent = r.n; };
  const fbq = document.getElementById("fb-q"); if (fbq) fbq.oninput = () => { fbF.q = fbq.value; rannFb(); };
  for (const [id, cle] of [["fb-tri", "tri"], ["fb-motif", "motif"], ["fb-kw", "kw"]]) { const e = document.getElementById(id); if (e) e.onchange = () => { fbF[cle] = e.value; rannFb(); }; }
  const brancherKont = () => $app.querySelectorAll("[data-papeye]").forEach((b) => (b.onclick = () => { const k = M0.comptes.get(b.dataset.papeye); paPeye(k, M0.clients.get(k.id_personne) || {}); }));
  brancherKont();
  brancheTx(M0);
  $app.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => decider(M0, b.dataset.ok, true)));
  $app.querySelectorAll("[data-non]").forEach((b) => (b.onclick = () => decider(M0, b.dataset.non, false)));
  $app.querySelectorAll("[data-mok]").forEach((b) => (b.onclick = () => decideModif(M0, b.dataset.mok, true)));
  const otorize = async (id, ok) => {
    if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou otorize yon retrè VIP.");
    const dm = M0.demandes.get(id);
    let motif = null;
    if (ok) { if (!(await ui.ask({ titre: "Otorize retrè VIP sa a?", ok: "Otorize", tekst: `${gd(dm.montant)} · ${t("Responsab kès la ap valide l apre sa.")}` }))) return; }
    else { motif = await ui.askText({ titre: "Refize retrè VIP sa a", label: "Rezon refi a", min: 3 }); if (!motif) return; }
    try { await api.rpc("grandon_demande_otorize", { p_id: id, p_ok: ok, p_motif: motif }); await S.pull(); toast(t(ok ? "Retrè a otorize: li ale kay responsab kès la." : "Retrè a refize."), ok ? "ok" : "info"); viewEpay(); }
    catch (e) { toast(t(e.message), "err"); }
  };
  $app.querySelectorAll("[data-oto-ok]").forEach((b) => (b.onclick = () => otorize(b.dataset.otoOk, true)));
  $app.querySelectorAll("[data-oto-non]").forEach((b) => (b.onclick = () => otorize(b.dataset.otoNon, false)));
  $app.querySelectorAll("[data-mnon]").forEach((b) => (b.onclick = () => decideModif(M0, b.dataset.mnon, false)));
}

// ---------- 4. Rapò ajan an (3 dènye jou) ----------
// Balans deklare (Soldes cumulés) : yon balans pa depo/retrè. Si kliyan an peye yon frè (pa « Frais carnet ») menm jou a APRE,
// se balans apre frè a ki konte. Liy frè yo pa ajoute yon lòt balans (avan : yo te konte 2 fwa).
function balDekl(txs) {
  const sd = (x) => x.solde_declare != null && x.solde_declare !== "";
  const lis = txs.filter((x) => (S.txKind(x) === "depo" || S.txKind(x) === "retre") && sd(x));
  const fre = txs.filter((f) => S.txKind(f) === "fre" && !freKane(f) && f.validation_status !== "rejected");
  const tot = lis.reduce((a, x) => a + Number(x.solde_declare) - fre.filter((f) => f.id_compte_epargne === x.id_compte_epargne
    && String(f.date_transaction) > String(x.date_transaction)).reduce((b, f) => b + Number(f.montant || 0), 0), 0);
  return { lis, tot };
}
let jouRapo = 0;
async function viewRapo() {
  const M = await S.model();
  const sipèvizè = estKesye() || estManager();
  if (sipèvizè) { ajans = (await db.meta("ajans")) || {}; rapoF.jou ||= M.today; }
  const jou = [0, 1, 2].map((n) => S.ajouteJou(M.today, -n));
  const D = sipèvizè ? rapoF.jou : jou[jouRapo];
  const moun = (x) => x.created_by ?? x.agent_id;
  const mwen = sipèvizè ? (x) => !rapoF.ajan || moun(x) === rapoF.ajan || (rapoF.ajan === moi.id && moun(x) === "moi")
    : (x) => x.created_by === moi.id || x.created_by === "moi" || x.agent_id === moi.id || x.agent_id === "moi";
  const txs = [...M.txs.values()].filter((x) => mwen(x) && S.jouTx(x) === D && x.validation_status !== "rejected")
    .sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)));
  const par = (k) => txs.filter((x) => S.txKind(x) === k);
  const sum = (l) => l.reduce((a, x) => a + Number(x.montant || 0), 0);
  const dep = par("depo"), ret = par("retre"), fre = par("fre"), vim = par("viman_out");
  const kane = fre.filter(freKane); // nouvo kanè: kliyan an peye kach → nan kach ajan an
  // Monnen (+) ak remiz (−) ajan an fè jou sa a: nan kach li, pa sou kont yo.
  const mnJ = (M.monnen || []).filter((x) => mwen({ created_by: x.agent_id, agent_id: x.agent_id }) && S.jouLokal(new Date(x.capture_le)) === D);
  const mnM = sum(mnJ.filter((x) => x.tip === "monnaie")), mnR = sum(mnJ.filter((x) => x.tip === "remise"));
  const depo = sum(dep), retre = sum(ret);
  const bD = balDekl(txs), deklare = bD.tot;
  // Kredi (peman ak penalite ajan an ankese jou sa a): kach li tou.
  const krTx = (M.kredi || []).flatMap((k) => k._txTout.map((y) => ({ ...y, _k: k }))).filter((y) => y.validation_status !== "rejected" && mwen(y) && S.jouKreTx(y) === D)
    .sort((a, b) => String(b.capture_le || b.date_transaction).localeCompare(String(a.capture_le || a.date_transaction)));
  const krPe = krTx.filter((y) => y.type_transaction === "Paiement"), krPen = krTx.filter((y) => y.type_transaction === "Penalite");
  const genKredi = (M.kredi || []).length > 0 || krTx.length > 0;
  // Kont garanti: depo (+) ak retrè (−) ajan an fè jou sa a.
  const garTx = (M.garanti || []).flatMap((g) => g._tx.map((y) => ({ ...y, _g: g }))).filter((y) => y.statut !== "rejected" && mwen(y) && S.jouLokal(new Date(y.capture_le)) === D)
    .sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le)));
  const garD = sum(garTx.filter((y) => y.tip === "D")), garR = sum(garTx.filter((y) => y.tip === "R"));
  const nDeklare = bD.lis.length;
  const cycles = [...M.comptes.values()].filter((k) => mwen(k) && k.created_at && S.jouLokal(new Date(k.created_at)) === D).length;
  const swivi = [...M.suivis.values()].filter((x) => mwen(x) && S.jouLokal(new Date(x.capture_le)) === D).length;
  const dmAtant = [...M.demandes.values()].filter((x) => mwen(x) && x.statut === "en_attente").length;
  const poko = txs.filter((x) => x._pending).length;
  const nonJou = sipèvizè ? () => (D === M.today ? "Jodi a" : D === S.ajouteJou(M.today, -1) ? "Yè" : datFr(D)) : (n) => (n === 0 ? "Jodi a" : n === 1 ? "Yè" : "Avan-yè");
  // Swivi kliyan jou sa a: peye / fidbak / poko wè (sèlman jodi a gen sans pou "poko wè")
  // Sèlman kliyan pòtfèy la ki te dwe peye jou sa a (jou peman yo, cycle la te kòmanse epi li poko fini, pa jou ferye).
  const jodiKont = [...M.comptes.values()].filter((k) => !k._pending && k.jours_paiement?.includes(S.isoJou(D)) && k.date_debut <= D && (!k.date_fin || D < k.date_fin)
    && !M.feries.has(D) && (D !== M.today || k._actif) && mwen(k));
  const peyeJou = jodiKont.filter((k) => k._joursPeye.has(D)).length;
  const fidbakJou = new Set([...M.suivis.values()].filter((x) => S.jouLokal(new Date(x.capture_le)) === D).map((x) => x.id_compte_epargne));
  const fidbakN = jodiKont.filter((k) => !k._joursPeye.has(D) && fidbakJou.has(k.id_compte_epargne)).length;
  const pokoWe = jodiKont.filter((k) => !k._joursPeye.has(D) && !fidbakJou.has(k.id_compte_epargne));
  const ctx = {
    ...ctxBase(M), isoJou: S.isoJou(D), i: jouRapo, D, nonJou,
    jou: jou.map((date, i) => ({ i, date, label: nonJou(i), on: i === jouRapo })),
    kpi: { depo, nDepo: dep.length, retre, nRetre: ret.length, fre: sum(fre), nFre: fre.length, vim: sum(vim), nVim: vim.length,
      deklare, nDeklare, cycles, swivi, dmAtant, kach: depo - retre + sum(kane) + mnM - mnR + (genKredi ? sum(krPe) + sum(krPen) : 0) + garD - garR,
      // Liy anplis nan rezime a (kach la): kredi ak kont garanti.
      ekstra: [...(kane.length ? [{ k: "kane", l: "Nouvo kanè", v: sum(kane), n: kane.length, sub: `${kane.length} ${t("kanè")} · ${t("kach")}` }] : []),
        ...(mnM ? [{ k: "monnen", l: "Monnen kenbe", v: mnM, n: mnJ.filter((x) => x.tip === "monnaie").length, sub: `${t("kliyan an dwe resevwa l")} · ${t("kach")}` }] : []),
        ...(mnR ? [{ k: "remiz", l: "Remiz monnen", v: mnR, n: mnJ.filter((x) => x.tip === "remise").length, out: true, sub: `${t("soti nan kach")}` }] : []), ...(genKredi ? [{ k: "kredi_pe", l: "Peman kredi", v: sum(krPe), n: krPe.length, sub: `${krPe.length} ${t("peman")}` },
          { k: "kredi_pen", l: "Penalite kredi", v: sum(krPen), n: krPen.length, sub: `${krPen.length} ${t("penalite")}` }] : []),
        ...(M.mod?.garanti ? [{ k: "gar_depo", l: "Depo garanti", v: garD, n: garTx.filter((y) => y.tip === "D").length, sub: `${garTx.filter((y) => y.tip === "D").length} depo · ${t("kont garanti")}` },
          { k: "gar_retre", l: "Retrè garanti", v: garR, n: garTx.filter((y) => y.tip === "R").length, out: true, sub: `${garTx.filter((y) => y.tip === "R").length} ${t("retrè")} · ${t("kont garanti")}` }] : [])],
      ...(genKredi || M.mod?.garanti ? { kachTxt: `${t(M.mod?.garanti ? "Depo + kredi + garanti − retrè peye" : "Depo + peman kredi + penalite − retrè peye")} · ${t("frè ak viman pa ladan l")}` } : {}) },
    swiviStats: { total: jodiKont.length, peye: peyeJou, fidbak: fidbakN, pokoWe: Math.max(0, jodiKont.length - peyeJou - fidbakN) },
    parLe: S.kolekParLe(txs), poko, txHtml: txs.map((x) => liTx(M, x)).join(""), nTx: txs.length,
  };
  if (sipèvizè) {
    const det = detayRapo(M, D, mwen);
    Object.assign(ctx, { jou: [], i: 0, txTit: t("Detay chak ribrik"), txHtml: det.html, nTx: det.n });
  }
  $app.innerHTML = `<div id="rapo">${sipèvizè ? baRapo(M) : ""}${estManager() ? `<a class="row rek-lyen" href="#/rekouvreman"><div class="grow"><b>${t("Rapò rekouvreman")}</b><div class="mut sm">${t("Kòb kliyan yo dwe pou mwa a, pa ajan · PDF")}</div></div><span aria-hidden="true">›</span></a><a class="row rek-lyen mob-lyen" href="#/mobilizasyon"><div class="grow"><b>${t("Mobilizasyon ak nouvo kliyan")}</b><div class="mut sm">${t("Moyenne mobilisation, nouvo kliyan, evolisyon pa ajan · PDF")}</div></div><span aria-hidden="true">›</span></a>` : ""}${L().parts.rapo(ctx)}${rapoPokoWe(M, pokoWe, D, sipèvizè && !rapoF.ajan)}${genKredi ? rapoKredi(M, krPe, krPen, sipèvizè && !rapoF.ajan, sipèvizè) : ""}${M.mod?.garanti && !sipèvizè ? rapoGaranti(M, garTx, garD, garR, false) : ""}</div>`;
  if (sipèvizè) brancheBaRapo(M);
  $app.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { jouRapo = Number(b.dataset.j); viewRapo().then(() => requestAnimationFrame(() => $app.querySelector(`[data-j="${jouRapo}"]`)?.focus({ preventScroll: true }))); }));
}

// Rapò: kont garanti (depo ak retrè jou a).
function rapoGaranti(M, l, dep, ret, montreAjan) {
  return `<details class="rb card" id="rapo-garanti" data-rb="garanti" ${l.length ? "open" : ""}><summary><b>${t("Kont garanti")}</b><span class="mut sm" data-kpi="garanti" data-val="${dep - ret}">${l.length} · +${gd(dep)}${ret ? ` · −${gd(ret)}` : ""}</span></summary>
    <div class="list tx-lis">${l.map((y) => { const c = M.clients.get(y._g.id_personne), D0 = y.tip === "D";
      return `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(y.capture_le) || "—"}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> <span class="badge ${D0 ? "info" : "warn"}">${D0 ? t("Depo") : t("Retrè")}</span> ${etaGarTx(y)}</span>
          <span class="mut sm">${t(GAR_NON[y._g.kalite])} · ${d(y._g.no_compte)}${montreAjan ? ` · <span data-brut>${h(nonAjan(y.created_by))}</span>` : ""}</span>
          ${y.solde_apres != null ? `<span class="mut sm">${t("kanè avan")} ${gd(y.solde_avant)} → ${t("kanè apre")} ${gd(y.solde_apres)}</span>` : ""}</span>
        <span class="txr-mon"><b class="${D0 ? "in" : "out"}">${D0 ? "+" : "−"}${gd(y.montant)}</b></span></div>`; }).join("") || `<p class="empty">${t("Pa gen tranzaksyon garanti jou sa a.")}</p>`}</div></details>`;
}

// Rapò: kliyan ki te dwe peye jou a, ki poko peye epi ki pa gen fidbak (ajan an poko wè yo).
function rapoPokoWe(M, l, D, montreAjan) {
  const nAj = (k) => nonAjan(k.created_by);
  const ls = [...l].sort((a, b) => (montreAjan ? nAj(a).localeCompare(nAj(b), "fr") : 0) || non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne)), "fr"));
  return `<details class="rb card rapo-poko" id="rapo-poko" ${ls.length ? "open" : ""}><summary><b>${t("Kliyan poko wè")}</b><span class="mut sm">${ls.length} · ${t("pa peye, pa gen fidbak")}</span></summary>
    <div class="list tx-lis">${ls.map((k) => { const c = M.clients.get(k.id_personne) || {}, tel = String(c.telephone || "").replace(/\D/g, "");
      return `<div class="row pokor"><a class="pokor-m lnk" href="#/cycle/${h(k.id_compte_epargne)}"><span class="txr-t"><b>${d(non(c))}</b>${k._anReta > 0 ? ` <span class="badge err">${k._anReta} ${t("an reta")}</span>` : ""}</span>
        <span class="mut sm">${d(k.no_compte || "")}${kane(k)} · plan ${gd(k.montant_plan || 0)}${montreAjan ? ` · <span data-brut>${h(nAj(k))}</span>` : ""}</span></a>
        ${tel.length >= 8 ? `<a class="btn sm pokor-tel" href="tel:${h(tel)}" aria-label="${h(t("Rele"))} ${h(non(c))}">📞 ${t("Rele")}</a>` : ""}</div>`; }).join("") || `<p class="empty">${t(D === M.today ? "Tout kliyan jodi a wè deja." : "Tout kliyan jou sa a te wè.")}</p>`}</div></details>`;
}

// Rapò: seksyon Kredi (peman, penalite, vèsman apre kanè a), pou ajan Grandon ak ajan Epargne.
function rapoKredi(M, pe, pen, montreAjan, sanLis = false) {
  const sum = (l) => l.reduce((a, x) => a + Number(x.montant || 0), 0);
  const vs = pe.filter((y) => y.versement_apres != null);
  const nVs = Math.round(vs.reduce((a, y) => a + (Number(y.versement_apres) - Number(y.versement_avant || 0)), 0) * 100) / 100;
  const row = (y) => { const c = M.clients.get(y._k.id_personne), p = y.type_transaction === "Penalite";
    return `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(y.capture_le || y.date_transaction) || "—"}</b></span>
      <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> <span class="badge ${p ? "err" : "info"}">${t(p ? "Penalite" : "Peman kredi")}</span> ${p ? "" : etaKreTx(y)}</span>
        <span class="mut sm"><a class="lnk" href="#/kredi/${h(y._k.id_compte_credit)}">${d(y._k.no_compte || "")}</a>${montreAjan ? ` · <span data-brut>${h(nonAjan(y.created_by))}</span>` : ""}</span>
        ${y.versement_apres != null ? `<span class="sm">${t("Vèsman avan")} <b>${Number(y.versement_avant)}</b> → ${t("vèsman apre")} <b>${Number(y.versement_apres)}</b></span>` : ""}</span>
      <span class="txr-mon"><b class="in">+${gd(y.montant)}</b></span></div>`; };
  return `<section class="rapo-kr" id="rapo-kredi"><div class="txj-h"><h2>${t("Kredi")}</h2><span class="mut sm">${pe.length + pen.length} ${t("tranzaksyon")}</span></div>
    <div class="kes-sum">
      <div class="card kes-k" data-kpi="kredi_peman" data-val="${sum(pe)}"><span>${t("Peman kredi")}</span><b class="in">${gd(sum(pe))}</b><small>${pe.length} ${t("peman")}</small></div>
      <div class="card kes-k" data-kpi="kredi_penalite" data-val="${sum(pen)}"><span>${t("Penalite")}</span><b class="in">${gd(sum(pen))}</b><small>${pen.length} ${t("penalite ankese")}</small></div>
      <div class="card kes-k" data-kpi="kredi_vesman" data-val="${nVs}"><span>${t("Vèsman")}</span><b>${nVs}</b><small>${t("vèsman sou kanè yo")}</small></div>
    </div>
    ${sanLis ? `<p class="mut sm">${t("Detay yo nan «Detay chak ribrik»: Peman kredi, Penalite kredi, Vèsman deklare (kredi).")}</p>` : `<div class="list tx-lis">${[...pe, ...pen].sort((a, b) => String(b.capture_le || b.date_transaction).localeCompare(String(a.capture_le || a.date_transaction))).map(row).join("") || `<p class="empty">${t("Pa gen tranzaksyon kredi jou sa a.")}</p>`}</div>`}</section>`;
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
    <div class="field foto-ch"><span>Foto kliyan an *</span>
      <div class="btns"><button type="button" class="btn pri" id="kam">📷 ${t("Ouvri kamera a")}</button>
        <label class="btn foto-fichye">🖼 ${t("Chwazi yon foto")}<input name="photo" type="file" accept="image/*"></label></div></div>
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
  const metFoto = async (file) => {
    try {
      photo = await compress(file);
      const img = document.getElementById("prev");
      img.src = URL.createObjectURL(photo);
      img.hidden = false;
    } catch { toast("Foto a pa ka li.", "err"); }
  };
  f.photo.onchange = () => { const file = f.photo.files[0]; if (file) metFoto(file); };
  document.getElementById("kam").onclick = async () => {
    const r = await ui.kamera();
    if (r?.erè) { toast(r.erè, "err", 7000); f.photo.click(); return; }
    if (r) metFoto(r);
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
const FEN_ALET = { manyel: "Fèmen pa yon manadjè", regle: "Fèmen lè pwoblèm lan regle", pa_reta: "Fèmen lè kliyan an pa an reta ankò", depo: "Fèmen lè kliyan an fè yon depo", dat: "Fèmen nan dat" };
// Alèt sistèm kredi (kredi ki lye ak kont epay la): penalite pou ankese, dat fen depase, reta. Yon sèl pa kredi (sa ki pi grav la).
function aletKredi(k, idKredi = null) {
  const l = [];
  for (const x of k._kredi || []) {
    if (idKredi && x.id_compte_credit !== idKredi) continue;
    const no = x.no_compte || "";
    const a = x._penDu > 0 ? { kod: "krp", nivo: "ijan", tit: "Penalite kredi", mesaj: `${t("Kredi")} ${d(no)}: ${t("ankese")} ${gd(x._penDu)} ${t("penalite")} (${x._penJou} ${t("jou")}).` }
      : x._depaseFen ? { kod: "krf", nivo: "ijan", tit: "Kredi depase dat fen li", mesaj: `${t("Kredi")} ${d(no)}: ${t("dat fen")} ${datFr(x.date_fin)} ${t("pase")}, ${t("rete")} ${gd(x._rete)}. ${t("Penalite kòmanse")} ${datFr(x._penDe)}.` }
      : x._jouReta > 0 ? { kod: "krr", nivo: x._jouReta >= 3 ? "ijan" : "enpotan", tit: "Kredi an reta", mesaj: `${t("Kredi")} ${d(no)}: ${t("kliyan an dwe")} ${gd(x._reta)} (${x._jouReta} ${t("jou")}).` } : null;
    if (a) l.push({ ...a, id: `${a.kod}-${x.id_compte_credit}`, sistem: true, kredi: x, k, _eta: "aktif", _anReta: false });
  }
  return l;
}
// Kredi yon alèt konsène: alèt sistèm kredi, alèt/rapèl sou yon kredi, oswa kanpay pwoblèm kredi (premye kredi kont lan).
const kredAlet = (a) => a.kredi?.id_compte_credit || a.id_compte_credit || (String(a.pwoblem || "").startsWith("kredi_") ? (a.k?._kredi || [])[0]?.id_compte_credit : null) || null;
const lyenAlet = (a) => (kredAlet(a) ? `#/kredi/${h(kredAlet(a))}` : `#/cycle/${h(a.k.id_compte_epargne)}`);
function aletYo(k, { tout = false } = {}) {
  const l = [...aletKredi(k)];
  if (k._actif && k._aRekipere > 0)
    l.push({ id: `sys-${k.id_compte_epargne}`, sistem: true, k, nivo: k._anReta >= 3 ? "ijan" : "enpotan", tit: "Rekouvreman",
      mesaj: `${t("Kliyan an dwe")} ${F.rekipere(k._aRekipere, k._anReta)}. ${t("Fè l peye anvan l ale pi lwen.")}`, _eta: "aktif" });
  if (k._fre?.pou && !k._alet.some((a) => a.pwoblem === "fre" && a._eta === "aktif"))
    l.push({ id: `fre-${k.id_compte_epargne}`, sistem: true, k, nivo: "enpotan", tit: "Frais sèvis",
      mesaj: `${t("Kont lan elijib: pran prelevman frais sèvis la")} (${gd(k._fre.montan)}).`, _eta: "aktif" });
  for (const a of k._alet) if (tout || a._eta === "aktif") l.push({ ...a, k });
  return l.sort((a, b) => (a._eta !== "aktif") - (b._eta !== "aktif") || ["ijan", "enpotan", "info"].indexOf(a.nivo) - ["ijan", "enpotan", "info"].indexOf(b.nivo));
}
function liAlet(a, { man = false, kont = false } = {}) {
  const [nl, kl] = NIVO_ALET[a.nivo] || NIVO_ALET.enpotan;
  const eta = a._eta === "fermen" ? `<span class="badge mut">${t("Fèmen")}</span>` : a._eta === "oto" ? `<span class="badge ok">${t("Rezoud otomatik")}</span>` : "";
  const rapel = a.tip === "rapel";
  const kr = a.kredi || (a.id_compte_credit && (a.k?._kredi || []).find((x) => x.id_compte_credit === a.id_compte_credit));
  const sous = a.sistem ? t(a.kredi ? "Alèt sistèm kredi · li disparèt lè kliyan an peye sa l dwe a" : "Alèt sistèm · li disparèt lè kliyan an peye sa l dwe a")
    : rapel ? `${t("Rapèl")} · ${nomAjan(a.kreye_pa) || t("Ajan")} · ${lè(a.kreye_le)}`
    : `${nomAjan(a.kreye_pa) || t("Manadjè")} · ${lè(a.kreye_le)} · ${t(FEN_ALET[a.fen_kondisyon] || "")}${a.fen_kondisyon === "dat" && a.fen_dat ? ` ${datFr(a.fen_dat)}` : ""}`;
  const pw = a.pwoblem ? pwoblemPa(a.pwoblem) : null;
  const dele = a.dele ? `<span class="badge ${a._anReta ? "err" : "mut"}">${t(rapel ? "Pou" : "Dèlè")} ${datFr(a.dele)}${a._anReta ? ` · ${t("an reta")}` : ""}</span>` : "";
  const kaFèmen = !a.sistem && a._eta === "aktif" && (man || (rapel && mwenSe(a.kreye_pa)));
  return `<div class="row alet ${h(a.nivo)} ${rapel ? "rapel" : ""} ${a._eta !== "aktif" ? "fini" : ""}" data-alet="${h(a.id)}">
    <div class="grow"><b>${a.sistem ? t(a.tit) : d(a.tit)}</b> ${rapel ? `<span class="badge info">⏰ ${t("Rapèl")}</span>` : `<span class="badge ${kl}">${t(nl)}</span>`} ${dele} ${eta} ${a._pending || a._fermenPending ? `<span class="badge pend">${t("Poko voye")}</span>` : ""}
      ${pw && d(a.tit) !== d(t(pw.l)) ? `<div class="mut sm">${t("Pwoblèm")}: ${t(pw.l)}</div>` : ""}
      ${a.id_compte_credit && !a.sistem ? `<div class="mut sm">${t("Kredi")} ${d(kr?.no_compte || "")}</div>` : ""}
      ${kont && !a.id_compte_credit ? `<div class="mut sm">${d(a.k.no_compte || t("Cycle poko voye"))}</div>` : ""}
      ${a.mesaj ? `<div class="sm alet-m">${a.sistem ? a.mesaj : d(a.mesaj)}</div>` : ""}
      <div class="mut sm">${sous}</div></div>
    ${kaFèmen ? `<button type="button" class="btn sm" data-fermen="${h(a.id)}" data-rapel="${rapel ? 1 : ""}">${t(rapel ? "Dezaktive" : "Fèmen l")}</button>` : ""}</div>`;
}
// Seksyon «Alèt» sou paj cycle/fich: manadjè wè tout (ak bouton), ajan wè sa ki aktif.
function seksyonAlet(ks, man) {
  const l = ks.flatMap((k) => aletYo(k, { tout: man }));
  const kAktif = ks.find((k) => k._actif) || ks[0];
  if (!kAktif || estKesye()) return "";
  return `<section class="alet-sek" id="alet-sek"><div class="alet-tit"><h2>${t("Alèt ak rapèl")}</h2><div class="btns">
    <button type="button" class="btn sm" data-rapel-nouvo="${h(kAktif.id_compte_epargne)}">＋ ${t("Rapèl")}</button>
    ${man ? `<button type="button" class="btn sm" data-alet-nouvo="${h(kAktif.id_compte_epargne)}">＋ ${t("Alèt")}</button>` : ""}</div></div>
    <div class="list">${l.map((a) => liAlet(a, { man, kont: ks.length > 1 })).join("") || `<p class="empty">${t("Pa gen alèt sou kliyan sa a.")}</p>`}</div></section>`;
}
async function kreyeAlet(M, k, kr = null) {
  const c = M.clients.get(k.id_personne) || {};
  const r = await ui.askAlet({ tekst: `${non(c)} · ${kr?.no_compte || k.no_compte || ""}`, jodi: M.today, pwoblem: kr ? PWOBLEM.filter((p) => p.kredi || !p.oto) : PWOBLEM });
  if (!r) return;
  await S.enqueue("alet", { id: S.uuid(), compte: k.id_compte_epargne, ...r, tip: "manyel", credit: kr?.id_compte_credit || null, kreye_le: new Date().toISOString() }, k._pending ? [k.id_compte_epargne] : []);
  toast("Alèt la kreye.");
  aletDenye = ""; render();
}
// Rapèl: nenpòt ajan ka kreye youn sou yon kliyan pou swivi l; se li sèlman (oswa yon manadjè) ki ka dezaktive l.
async function kreyeRapel(M, k, kr = null) {
  const c = M.clients.get(k.id_personne) || {};
  const r = await ui.askRapel({ tekst: `${non(c)} · ${kr?.no_compte || k.no_compte || ""}`, jodi: M.today });
  if (!r) return;
  await S.enqueue("alet", { id: S.uuid(), compte: k.id_compte_epargne, tit: r.tit, mesaj: null, nivo: "info", fen: "manyel", fen_dat: null, tip: "rapel", dele: r.dele, credit: kr?.id_compte_credit || null,
    kreye_le: new Date().toISOString() }, k._pending ? [k.id_compte_epargne] : []);
  toast(t("Rapèl la kreye."));
  aletDenye = location.hash; render();
}
async function fermenAlet(id, rapel = false) {
  if (!(await ui.ask(rapel ? { titre: "Dezaktive rapèl la?", tekst: t("Li p ap parèt ankò sou kliyan sa a."), ok: "Dezaktive" }
    : { titre: "Fèmen alèt la?", tekst: t("Ajan yo p ap wè l ankò."), ok: "Fèmen l" }))) return;
  await S.enqueue("alet_fermen", { id, le: new Date().toISOString() });
  toast(t(rapel ? "Rapèl la dezaktive." : "Alèt la fèmen."));
  aletDenye = location.hash; render();
}
function brancherAlet(M) {
  const kr = (b) => (b.dataset.kredi ? (M.kredi || []).find((x) => x.id_compte_credit === b.dataset.kredi) : null);
  $app.querySelectorAll("[data-alet-nouvo]").forEach((b) => (b.onclick = () => kreyeAlet(M, M.comptes.get(b.dataset.aletNouvo), kr(b))));
  $app.querySelectorAll("[data-rapel-nouvo]").forEach((b) => (b.onclick = () => kreyeRapel(M, M.comptes.get(b.dataset.rapelNouvo), kr(b))));
  $app.querySelectorAll("#alet-sek [data-fermen], .alet-tablo [data-fermen]").forEach((b) => (b.onclick = () => fermenAlet(b.dataset.fermen, !!b.dataset.rapel)));
}
// Popup la: yon fwa chak fwa ajan an antre sou paj la (pa lè paj la re-rann pou menm wout la).
let aletDenye = "";
async function montreAlet(M, ks, lisKredi = null) {
  const wout = location.hash;
  if (aletDenye === wout) return;
  aletDenye = wout;
  const l = lisKredi || ks.flatMap((k) => aletYo(k));
  if (!l.length) return;
  const man = estManager();
  const nivo = l.some((a) => a.nivo === "ijan") ? "ijan" : l.some((a) => a.nivo === "enpotan") ? "enpotan" : "info";
  if (prefs().son !== false) ui.son(nivo);
  const c = M.clients.get(ks[0].id_personne) || {};
  const r = await ui.aletPopup({ titre: l.length > 1 ? `${l.length} ${t("alèt sou kliyan sa a")}` : t("Alèt sou kliyan sa a"), soutit: non(c), nivo,
    html: l.map((a) => liAlet(a, { man, kont: ks.length > 1 })).join(""), nouvo: man });
  if (r?.fermen) await fermenAlet(r.fermen, M.alet.get(r.fermen)?.tip === "rapel");
  else if (r?.nouvo) await kreyeAlet(M, ks.find((k) => k._actif) || ks[0], lisKredi ? lisKredi[0]?.kredi || (M.kredi || []).find((x) => x.id_compte_credit === lisKredi[0]?.id_compte_credit) : null);
}
addEventListener("hashchange", () => {
  if (!/^#\/(kliyan|cycle|tx\/nouvo|kredi)\//.test(location.hash)) aletDenye = "";
  // Popup alèt yon paj fèmen lè ajan an kite paj la (pou 2 popup pa youn sou lòt).
  document.querySelectorAll(".modal-wrap:not(.out) .alet-lis").forEach((l) => { if (l.closest(".modal-wrap")?.dataset.wout !== location.hash) l.closest(".modal-wrap")?.querySelector("[data-v=ok]")?.click(); });
});

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
  const fotoAk = estKesye() ? "" : `<section class="foto-ak card${c.photo_url || c.photo_id ? "" : " foto-manke"}">
    ${c.photo_url || c.photo_id ? "" : `<p><b>${t("Kliyan sa a pa gen foto.")}</b> ${t("Pran youn kounye a.")}</p>`}
    ${c._fotoPending ? `<p class="mut sm"><span class="badge pend">${t("Poko voye")}</span> ${t("Nouvo foto a ap monte lè gen entènèt.")}</p>` : ""}
    <div class="btns"><button type="button" class="btn ${c.photo_url || c.photo_id ? "" : "pri"}" id="foto-kam">📷 ${t(c.photo_url || c.photo_id ? "Chanje foto a (kamera)" : "Ajoute foto (kamera)")}</button>
      <label class="btn foto-fichye">🖼 ${t("Chwazi yon foto")}<input type="file" accept="image/*" id="foto-fich"></label>
      ${c.photo_url || c.photo_id ? `<button type="button" class="btn" id="foto-vire">↻ ${t("Vire foto a")}</button>` : ""}</div>
    <div class="foto-vire" id="foto-vire-p" hidden><img id="foto-vire-img" alt="${h(t("Foto kliyan an"))}">
      <div class="btns"><button type="button" class="btn" id="foto-vire-1">↻ ${t("Vire")}</button><button type="button" class="btn" id="foto-vire-no">${t("Anile")}</button>
        <button type="button" class="btn pri" id="foto-vire-ok">${t("Anrejistre foto a")}</button></div></div></section>`;
  $app.innerHTML = `<div id="fich">${L().parts.fich(ctx)}${gpsBouton(c)}${seksyonGaranti(M, c)}${fotoAk}${seksyonAlet(ksM, man)}</div>`;
  brancherAlet(M); brancheGaranti(M, c);
  // Kategori sou chak kont epay nan fich la (tout look yo).
  $app.querySelectorAll('#fich a[href^="#/cycle/"]:not(.btn)').forEach((a) => { if (!a.querySelector("[data-kat]") && /^#\/cycle\/[\w-]+$/.test(a.getAttribute("href"))) a.insertAdjacentHTML("afterbegin", `${badjKat("epay")} `); });
  brancheGpsBouton(c);
  const wout = location.hash;
  (ksM.length ? montreAlet(M, ksM) : Promise.resolve()).then(() => location.hash === wout && proposeGps(c));
  const chanjeFoto = async (blob) => {
    if (!(await leOk())) return montreLeFèmen();
    let photo; try { photo = await compress(blob); } catch { return toast("Foto a pa ka li.", "err"); }
    const url = URL.createObjectURL(photo);
    if (!(await ui.ask({ titre: c.photo_url || c.photo_id ? "Chanje foto kliyan an?" : "Ajoute foto sa a?", foto: url, ok: "Anrejistre foto a", tekst: non(c) }))) return;
    const photo_id = S.uuid();
    await db.put("photos", { id: photo_id, blob: photo });
    await S.enqueue("foto", { id: S.uuid(), id_personne: id, photo_id, capture_le: new Date().toISOString() }, c._pending ? [id] : []);
    toast(t("Foto a anrejistre."), "ok");
    render();
  };
  document.getElementById("foto-kam")?.addEventListener("click", async () => {
    const r = await ui.kamera();
    if (r?.erè) { toast(r.erè, "err", 7000); document.getElementById("foto-fich")?.click(); return; }
    if (r) chanjeFoto(r);
  });
  document.getElementById("foto-fich")?.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) chanjeFoto(f); });
  // Vire foto a (foto ki tèt anba oswa sou kote): ajan an vire l 90° chak fwa jiskaske l dwat, epi li anrejistre l.
  let vSrc = null, vDeg = 0;
  const vireRann = async () => {
    const c2 = document.createElement("canvas"), r = vDeg % 180 !== 0;
    c2.width = r ? vSrc.height : vSrc.width; c2.height = r ? vSrc.width : vSrc.height;
    const x = c2.getContext("2d"); x.translate(c2.width / 2, c2.height / 2); x.rotate((vDeg * Math.PI) / 180); x.drawImage(vSrc, -vSrc.width / 2, -vSrc.height / 2);
    return new Promise((ok) => c2.toBlob(ok, "image/jpeg", 0.85));
  };
  const vireMontre = async () => { const b = await vireRann(); const im = document.getElementById("foto-vire-img"); if (im.src) URL.revokeObjectURL(im.src); im.src = URL.createObjectURL(b); };
  document.getElementById("foto-vire")?.addEventListener("click", async () => {
    try {
      let blob = null;
      if (c.photo_id) blob = (await db.get("photos", c.photo_id))?.blob || null;
      if (!blob && c.photo_url) blob = await (await fetch(c.photo_url, { cache: "no-store" })).blob();
      if (!blob) return toast(t("Foto a pa ka li."), "err");
      vSrc = await createImageBitmap(blob, { imageOrientation: "from-image" }).catch(() => createImageBitmap(blob)); vDeg = 90;
      document.getElementById("foto-vire-p").hidden = false; await vireMontre();
    } catch { toast(t("Fòk ou gen entènèt pou vire foto a."), "err"); }
  });
  document.getElementById("foto-vire-1")?.addEventListener("click", () => { vDeg = (vDeg + 90) % 360; vireMontre(); });
  document.getElementById("foto-vire-no")?.addEventListener("click", () => { document.getElementById("foto-vire-p").hidden = true; vSrc = null; });
  document.getElementById("foto-vire-ok")?.addEventListener("click", async () => {
    if (!vSrc || vDeg === 0) { document.getElementById("foto-vire-p").hidden = true; return; }
    if (!(await leOk())) return montreLeFèmen();
    const photo = await compress(await vireRann()), photo_id = S.uuid();
    await db.put("photos", { id: photo_id, blob: photo });
    await S.enqueue("foto", { id: S.uuid(), id_personne: id, photo_id, capture_le: new Date().toISOString() }, c._pending ? [id] : []);
    toast(t("Foto a vire epi li anrejistre."), "ok");
    render();
  });
}

// GPS: kliyan ki poko gen pozisyon GPS → mande ajan an si l nan biznis kliyan an pou aktive l (yon fwa chak fwa l antre sou paj la).
let gpsMande = "";
addEventListener("hashchange", () => { gpsMande = ""; });
async function proposeGps(c, { bouton = false } = {}) {
  if (!c || c.gps_lat != null || estKesye()) return;
  if (!bouton) {
    if (gpsMande === location.hash || document.querySelector(".modal-wrap:not(.out)")) return;
    gpsMande = location.hash;
    if (!(await ui.ask({ titre: "Èske ou nan biznis kliyan an?", ikon: "📍", ok: "Wi, mwen la", anile: "Non, pa kounye a",
      tekst: `${non(c)} ${t("poko gen pozisyon GPS. Si w nan biznis li kounye a, aplikasyon an ap anrejistre pozisyon an.")}` }))) return;
  }
  if (!(await leOk())) return montreLeFèmen();
  toast(t("Ap chèche pozisyon an…"), "info", 4000);
  const g = await getGps(20000, { fre: true });
  if (!g) return ui.info("GPS pa mache", t("Aplikasyon an pa jwenn pozisyon an. Aktive lokalizasyon telefòn nan epi pèmèt li pou Grandon, apre eseye ankò."));
  if (g.acc > 150) return ui.info("Pozisyon an pa presi ase", `${t("Presizyon")}: ${g.acc} m. ${t("Rete deyò, toupre biznis la, epi eseye ankò.")}`);
  await S.enqueue("gps", { id: S.uuid(), id_personne: c.id_personne, lat: g.lat, lng: g.lng, acc: g.acc, capture_le: new Date().toISOString() }, c._pending ? [c.id_personne] : []);
  toast(`${t("GPS kliyan an aktive")} ✓ (± ${g.acc} m)`, "ok", 5000);
  render();
}

// Bouton ki toujou la (fich, cycle, tranzaksyon) tank kliyan an pa gen GPS: ajan an ka aktive l nenpòt lè, menm apre l te di «Non».
const gpsBouton = (c) => (!c || c.gps_lat != null || estKesye() ? "" : `<div class="gps-ak card"><div class="grow"><b>📍 ${t("Kliyan sa a poko gen GPS")}</b>
  <div class="mut sm">${t("Lè w nan biznis kliyan an, peze bouton an pou anrejistre pozisyon an.")}</div></div>
  <button type="button" class="btn sm pri" data-gps-aktive>${t("Mwen nan biznis la: aktive GPS")}</button></div>`);
const brancheGpsBouton = (c) => $app.querySelectorAll("[data-gps-aktive]").forEach((b) => (b.onclick = () => proposeGps(c, { bouton: true })));

// Frais sèvis (sèvis Epargne): yon «men» = plan an (Lib: fre_lib). Nouveau Frais (kont depi fre_dat): elijib apre 3 depo valide
// oswa depo valide ≥ 3× plan (Lib: ≥ fre_lib_elijib). Frais Auto (anvan fre_dat): ajan an pran l lè kliyan an fè retrè oswa kanè a kraze.
let fePrefill = null;
function freSevis(k, cfg) {
  if (!cfg?.fre_sevis || !k || k._pending) return null;
  const kreye = S.jouLokal(new Date(k.date_kreye || k.created_at || `${k.date_debut}T12:00:00Z`));
  const plan = Number(k.montant_plan || 0);
  const depo = (k._txs || []).filter((x) => S.txKind(x) === "depo" && x.validation_status === "confirmed" && !x._pending);
  const som = depo.reduce((a, x) => a + Number(x.montant || 0), 0);
  return {
    regim: kreye >= cfg.fre_dat ? "nouveau" : "auto", montan: k.plan_lib ? Number(cfg.fre_lib) : plan, n: depo.length, som,
    deja: (k._txs || []).some((x) => x.type_transaction === "FL" && x.type_frais === "Frais service" && x.validation_status !== "rejected"),
    elijib: k.plan_lib ? som >= Number(cfg.fre_lib_elijib) : depo.length >= 3 || som >= 3 * plan,
    kondisyon: k.plan_lib ? `${t("depo valide")} ${gd(som)} / ${gd(cfg.fre_lib_elijib)}` : `${depo.length}/3 ${t("depo valide")} ${t("oswa")} ${gd(som)} / ${gd(3 * plan)}`,
  };
}
function freNot(k, fs) {
  if (!fs) return "";
  if (fs.deja) return `<p class="note ok-note fre-not">✓ ${t("Frais sèvis la pran")} (${t(fs.regim === "nouveau" ? "Nouveau Frais" : "Frais Auto")}).</p>`;
  const btn = `<button type="button" class="btn sm pri" data-fre="${h(k.id_compte_epargne)}">${t("Pran frais sèvis la")} · ${gd(fs.montan)}</button>`;
  if (fs.regim === "auto") return `<div class="note info-note fre-not"><p><b>${t("Frais Auto")}</b> · ${t("Frais sèvis")} ${gd(fs.montan)}: ${t("pran l lè kliyan an fè yon retrè oswa lè kanè a kraze.")}</p>${btn}</div>`;
  if (fs.elijib) return `<div class="note warn fre-not"><p><b>${t("Nouveau Frais")}</b> · ${t("Kont lan elijib: asire w prelevman frais sèvis la fèt")} (${gd(fs.montan)}).</p>${btn}</div>`;
  return `<div class="note info-note fre-not"><p><b>${t("Nouveau Frais")}</b> · ${t("Frais sèvis")} ${gd(fs.montan)}. ${t("Ou ka pran l depi kounye a; li vin obligatwa pou swivi lè kont lan elijib")} (${fs.kondisyon}).</p>${btn}</div>`;
}
const brancheFre = (M, cfg) => $app.querySelectorAll("[data-fre]").forEach((b) => (b.onclick = () => {
  const k = M.comptes.get(b.dataset.fre); const fs = freSevis(k, cfg); if (!fs) return;
  fePrefill = { compte: k.id_compte_epargne, montan: fs.montan }; go(`#/tx/nouvo/${k.id_compte_epargne}`);
}));

// ---------- Kredi: yon kredi konekte ak yon kont epay kliyan an; ranbousman chak jou (lendi a samdi, san jou ferye) ----------
const TIP_KREDI = ["Credit Cash", "Konfyans", "Electromenager", "Lekol Ptit", "Loyer"];
const FREK_KREDI = [1, 2, 3, 6];
const JOU_DEFO_KREDI = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 6: [1, 2, 3, 4, 5, 6] };
// Konfyans (dire > 0): to a sou montan an (pa pa mwa), N jou peman.
const kalkKredi = (montan, duree, taux, peman, debut, feries, jours = [1, 2, 3, 4, 5, 6], dire = 0) => {
  const final = Math.round(montan * (1 + (taux / 100) * (dire ? 1 : duree)) * 100) / 100;
  const n = dire || (peman > 0 ? Math.ceil(final / peman) : 0);
  const fin = debut && n && jours.length ? S.ajouteJou(S.finVesman(debut, [...jours].sort(), n, feries), -1) : null;
  return { final, n, fin, penalite: Math.round(peman * 0.2 * 100) / 100 };
};
// Done kredi yo (sync.model kalkile yo: peman, reta, penalite, fidbak).
const jouKreTx = S.jouKreTx;
async function kreDone(M) { return M.kredi || []; }
const badjKredi = (x) => (x._penDu ? `<span class="badge err">${t("Penalite")} ${gd(x._penDu)}</span>` : "") + (x._fini ? `<span class="badge ok">${t("Fini")}</span>`
  : `${x._jouReta ? `<span class="badge err">${x._jouReta} ${t(x._jouReta > 1 ? "jou reta" : "jou reta")}</span>` : ""}${x._peJodi ? `<span class="badge ok">${t("Peye jodi a ✓")}</span>` : x._fbJodi ? `<span class="badge warn">${t("Pa peye")} · ${t(MOTIF_KOUT[x._fbJodi.motif] || "Lòt")}</span>` : x._jodi ? `<span class="badge warn">${t("Pou peye jodi a")}</span>` : ""}${x._atant ? `<span class="badge mut">${gd(x._atant)} ${t("an atant")}</span>` : ""}`);
async function viewKredi() {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const l = (await kreDone(M)).sort((a, b) => (a._fini - b._fini) || (b._jouReta - a._jouReta) || (b._jodi && !b._peJodi) - (a._jodi && !a._peJodi) || non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne)), "fr"));
  const aktif = l.filter((x) => !x._fini);
  const som = (xs, f) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  const jodi = aktif.filter((x) => x._jodi), reta = aktif.filter((x) => x._jouReta);
  $app.innerHTML = `<div id="kredi"><div class="page-head"><h1>${t("Kredi")}</h1>${estManager() ? `<a class="btn pri" href="#/kredi/nouvo">＋ ${t("Nouvo kredi")}</a>` : ""}</div>
    <div class="kes-sum kes-sum4">
      <div class="card kes-k"><span>${t("Kredi aktif")}</span><b>${aktif.length}</b><small>${l.length} ${t("an tout")}</small></div>
      <div class="card kes-k"><span>${t("Pou ankese jodi a")}</span><b>${jodi.filter((x) => !x._peJodi).length}</b><small>${t("peye jodi a")} ${gd(som(l, (x) => x._peJodi))}</small></div>
      <div class="card kes-k"><span>${t("An reta")}</span><b class="${reta.length ? "out" : ""}">${reta.length}</b><small>${gd(som(reta, (x) => x._reta))}</small></div>
      <div class="card kes-k"><span>${t("Rete pou ranbouse")}</span><b>${gd(som(l, (x) => x.montant_restant))}</b><small>${t("deja peye")} ${gd(som(l, (x) => x.paiement_cumule))}</small></div>
    </div>
    <div class="list tx-lis">${l.map((x) => { const c = M.clients.get(x.id_personne); const pc = Number(x.montant_final) ? Math.round((Number(x.paiement_cumule) / Number(x.montant_final)) * 100) : 0;
      const dn = x._tx.find((y) => y.validation_status !== "rejected"), dj = dn && jouKreTx(dn);
      return `<div class="row kxr${x._peJodi ? " kxr-ok" : ""}" data-kredi="${h(x.id_compte_credit)}">
        <span class="txr-le" title="${h(t("Dènye peman"))}"><b class="mono">${dn ? lèKout(dn.capture_le || dn.date_transaction) || "—" : "—"}</b><small>${dn ? (dj === M.today ? t("jodi a") : datKout(dj)) : t("okenn")}</small></span>
        <a class="kxr-main lnk" href="#/kredi/${h(x.id_compte_credit)}"><span class="txr-t"><b>${d(non(c))}</b> ${badjKat(katKredi(x))} ${badjKredi(x)}</span>
        <span class="mut sm">${d(x.no_compte || "")}${kane(x)} · ${gd(x.paiement_journalier)}/${t("vèsman")} · ${x._jours.length}×/sem (${lisJou(x._jours)}) · ${t("fen")} ${datFr(x.date_fin)}</span>
        <span class="sm">${t("Prete")} <b>${gd(x.montant_prete)}</b> · ${t("rete")} <b>${gd(x.montant_restant)}</b> / ${gd(x.montant_final)}${x._reta ? ` · <span class="err-t">${t("reta")} ${gd(x._reta)}</span>` : ""}</span>
        <span class="kxr-bar" aria-hidden="true"><i style="width:${pc}%"></i></span></a>
        ${!estKesye() && x._rete > 0 ? `<span class="kxr-ak">${x._peJodi ? `<b class="in">✓ ${gd(x._peJodi)}</b>` : ""}<a class="btn sm${x._peJodi ? "" : " pri"}" href="#/kredi/${h(x.id_compte_credit)}/peye">${t("Peye")}</a>${x._jodi && !x._peJodi && !x._fbJodi ? `<button type="button" class="btn sm" data-kr-papeye="${h(x.id_compte_credit)}">${t("Pa peye")}</button>` : ""}</span>` : ""}</div>`; }).join("") || `<p class="empty">${t("Poko gen kredi.")}</p>`}</div></div>`;
  $app.querySelectorAll("[data-kr-papeye]").forEach((b) => (b.onclick = () => krediPaPeye(l.find((x) => x.id_compte_credit === b.dataset.krPapeye), M)));
}
// Fidbak «Pa peye» sou yon kredi (menm rezon ak epay la).
async function krediPaPeye(x, M) {
  if (!x) return;
  if (!(await leOk())) return montreLeFèmen();
  const r = await ui.askChoice({ titre: "Kliyan an pa peye", tekst: `${non(M.clients.get(x.id_personne))} · ${x.no_compte || ""}`, options: MOTIFS,
    noteLabel: "Nòt (opsyonèl)", noteObligatwaPou: ["lot"] });
  if (!r) return;
  await S.enqueue("kredi_suivi", { id: S.uuid(), credit: x.id_compte_credit, motif: r.valeur, note: r.note, gps: await getGps(8000, { fre: true }), capture_le: new Date().toISOString() });
  toast("Fidbak la anrejistre.");
  render();
}
const etaKreTx = (y) => y._err ? `<span class="badge err">${t("Erè")}</span>` : y._pending ? `<span class="badge mut">${t("Poko voye")}</span>`
  : y.validation_status === "pending" ? `<span class="badge warn">${t("An atant validasyon")}</span>` : y.validation_status === "rejected" ? `<span class="badge err">${t("Rejte ✗")}</span>` : `<span class="badge ok">${t("Valide ✓")}</span>`;
async function viewKrediFich(id) {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const x = (await kreDone(M)).find((k) => k.id_compte_credit === id);
  if (!x) { $app.innerHTML = `<a href="#/kredi" class="back">‹ ${t("Kredi")}</a><p class="empty">${t("Kredi sa a pa sou telefòn nan.")}</p>`; return; }
  const c = M.clients.get(x.id_personne);
  const kE = M.comptes.get(x.id_compte_epargne); // nimewo kanè a (A-BSI-…) anvan nimewo Supabase la
  const dl = [["Kliyan", d(non(c))], ["Kont epay", d(kE?.no_kane || x.no_compte_epargne || "") + (kE?.no_kane && x.no_compte_epargne ? ` <span class="mut sm">${d(x.no_compte_epargne)}</span>` : "")], ["Montan prete", gd(x.montant_prete)], ["Dire", `${x.duree_credit_mois} ${t("mwa")}`],
    ["To enterè", `${x.taux_interet}% ${t("pa mwa")}`], ["Kapital final", `<b>${gd(x.montant_final)}</b>`], ["Montan pa vèsman", gd(x.paiement_journalier)],
    ["Kalandriye peman", `${x._jours.length}× / ${t("semèn")} · ${lisJou(x._jours)}`],
    ...(x.kalite === "konfyans" ? [["Kalite kredi", `Konfyans · ${x.dire_jou || x.nb_vesman} ${t("jou peman")}`]] : M.mod?.konfyans ? [["Kalite kredi", t("Kredi klasik")]] : []),
    ...(x.gar_montan != null ? [["Garanti", `${gd(x.gar_montan)} (${Number(x.gar_pousantaj)}%) · ${x.kalite === "konfyans" ? "Fonds Garantie Konfyans" : "Epargne Bloquée"}`]] : []),
    ["Kantite vèsman", String(x.nb_vesman)], ["Dat kòmansman", datFr(x.date_debut)], ["Dat fen", datFr(x.date_fin)], ["Penalite pa jou (20%)", gd(x.penalite_jou)],
    ["Deja peye (valide)", gd(x.paiement_cumule)], ["An atant validasyon", gd(x._atant)], ["Rete pou ranbouse", `<b>${gd(x._rete)}</b>`],
    ["Reta", x._reta ? `<b class="err-t">${gd(x._reta)}</b> (${x._jouReta} ${t("jou")})` : t("Okenn")],
    ["Penalite kòmanse", x._penDe ? `${datFr(x._penDe)} <small class="mut">(${t("dat fen")} + ${x._gras} ${t("jou gras")})</small>` : "—"],
    ["Penalite total", x._penJou ? `${gd(x._penTotal)} <small class="mut">(${x._penJou} ${t("jou")} × ${gd(x._penPaJou)})</small>` : t("Okenn")],
    ["Penalite deja ankese", gd(x._penPeye)], ["Penalite pou ankese", x._penDu ? `<b class="err-t">${gd(x._penDu)}</b>` : t("Okenn")],
    ...(x.type_compte_credit ? [["Tip kredi", d(x.type_compte_credit)]] : [])];
  $app.innerHTML = `<a href="#/kredi" class="back">‹ ${t("Kredi")}</a><div class="page-head"><h1>${d(x.no_compte || t("Kredi"))}${x.no_kane ? ` <span class="mut sm" title="${t("Kòd ansyen (Airtable)")}" data-brut>${h(x.no_kane)}</span>` : ""}</h1>
      <span class="kr-ak">${!estKesye() && x._penDu > 0 ? `<a class="btn danger" id="kr-pen" href="#/kredi/${h(x.id_compte_credit)}/penalite">${t("Ankese penalite")}</a>` : ""}
      ${estManager() && !x._fini && x.kalite !== "konfyans" ? `<a class="btn" id="kr-kal" href="#/kredi/${h(x.id_compte_credit)}/kalandriye">${t("Modifye kalandriye")}</a>` : ""}
      ${!estKesye() && x._rete > 0 && !x._peJodi && !x._fbJodi && x._jodi ? `<button type="button" class="btn" id="kr-papeye">${t("Pa peye")}</button>` : ""}
      ${!estKesye() && x._rete > 0 ? `<a class="btn pri" id="kr-peye" href="#/kredi/${h(x.id_compte_credit)}/peye">＋ ${t("Anrejistre yon peman")}</a>` : ""}</span></div>
    <p>${badjKat(katKredi(x))} ${badjKredi(x)}</p>
    <div class="card"><dl class="kredi-dl">${dl.map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${v}</dd></div>`).join("")}</dl></div>
    <h2>${t("Peman yo")}</h2>
    <div class="list tx-lis" id="kr-tx">${x._txTout.map((y) => `<div class="row txr${y.validation_status === "rejected" ? " txr-anile" : ""}"><span class="txr-le"><b class="mono">${lèKout(y.capture_le || y.date_transaction) || "—"}</b><small>${datKout(jouKreTx(y))}</small></span>
      <span class="txr-main"><span class="txr-t">${y.type_transaction === "Penalite" ? `<b>${t("Penalite")}</b> ${y._pending ? etaKreTx(y) : ""}` : etaKreTx(y)}</span><span class="mut sm" data-brut>${h(nonAjan(y.created_by))}</span>
        ${y.versement_apres != null ? `<span class="mut sm">${t("vèsman")} ${Number(y.versement_avant)} → ${Number(y.versement_apres)}</span>` : ""}
        ${y.validation_status === "rejected" && y.validation_note ? `<span class="sm err-t">${t("Rezon")}: ${d(y.validation_note)}</span>` : ""}${y._err ? `<span class="sm err-t">${d(t(y._err))}</span>` : ""}</span>
      <span class="txr-mon"><b class="in">+${gd(y.montant)}</b></span></div>`).join("") || `<p class="empty">${t("Poko gen peman.")}</p>`}</div>
    <h2>${t("Fidbak")}</h2>
    <div class="list tx-lis" id="kr-fb">${x._fb.map((y) => `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(y.capture_le) || "—"}</b><small>${datKout(S.jouLokal(new Date(y.capture_le)))}</small></span>
      <span class="txr-main"><span class="txr-t"><span class="badge warn">${t(MOTIF_KOUT[y.motif] || "Lòt")}</span> ${y._pending ? `<span class="badge mut">${t("Poko voye")}</span>` : ""}</span>
        <span class="mut sm">${t(motifLabel(y.motif))} · <span data-brut>${h(nonAjan(y.agent_id))}</span></span>${y.note ? `<span class="sm">«${d(y.note)}»</span>` : ""}</span></div>`).join("") || `<p class="empty">${t("Pa gen fidbak.")}</p>`}</div>`;
  document.getElementById("kr-papeye")?.addEventListener("click", () => krediPaPeye(x, M));
  // Alèt ak rapèl sou kredi a (mare ak kont epay ki lye ak li a).
  const k = M.comptes.get(x.id_compte_epargne);
  if (k && !estKesye()) {
    const man = estManager();
    const la = [...aletKredi(k, x.id_compte_credit), ...k._alet.map((a) => ({ ...a, k })).filter((a) => kredAlet(a) === x.id_compte_credit && (man || a._eta === "aktif"))];
    $app.insertAdjacentHTML("beforeend", `<section class="alet-sek" id="alet-sek"><div class="alet-tit"><h2>${t("Alèt ak rapèl")}</h2><div class="btns">
      <button type="button" class="btn sm" data-rapel-nouvo="${h(k.id_compte_epargne)}" data-kredi="${h(x.id_compte_credit)}">＋ ${t("Rapèl")}</button>
      ${man ? `<button type="button" class="btn sm" data-alet-nouvo="${h(k.id_compte_epargne)}" data-kredi="${h(x.id_compte_credit)}">＋ ${t("Alèt")}</button>` : ""}</div></div>
      <div class="list">${la.map((a) => liAlet(a, { man })).join("") || `<p class="empty">${t("Pa gen alèt sou kredi sa a.")}</p>`}</div></section>`);
    brancherAlet(M);
    const aktif = la.filter((a) => a._eta === "aktif");
    if (aktif.length) montreAlet(M, [k], aktif);
  }
}
async function viewKrediPeye(id, pen = false) {
  if (!(await leOk())) return viewLeFèmen();
  const M = await S.model();
  const x = (await kreDone(M)).find((k) => k.id_compte_credit === id);
  if (!x) return go("#/kredi");
  const skB = M.kaneBlok("kredi", x.id_compte_credit);
  if (skB) { $app.innerHTML = kaneBlokHtml(M, skB, `<a href="#/kredi/${h(id)}" class="back">‹ ${d(x.no_compte || t("Kredi"))}</a>`, t("Tranzaksyon kredi")); brancheKaneBlok(skB); return; }
  if (pen) return viewKrediPenalite(M, x);
  const c = M.clients.get(x.id_personne), pj = Number(x.paiement_journalier) || 0;
  const back = `<a href="#/kredi/${h(id)}" class="back">‹ ${d(x.no_compte || t("Kredi"))}</a>`;
  if (x._rete <= 0) { $app.innerHTML = `${back}<h1>${t("Tranzaksyon kredi")}</h1>${tipKreTx(x, "peye")}<p class="empty">${t("Pa gen anyen ki rete pou peye sou kredi sa a (peman an atant yo konte).")}</p>`; return; }
  // Vèsman avan: dènye «vèsman apre» ki sou kanè a (dènye peman), oswa sa ki deja peye ÷ peman jounalye a.
  const dPe = x._tx.find((y) => y.validation_status !== "rejected" && y.versement_apres != null);
  const vAvan = dPe ? Number(dPe.versement_apres) : pj ? Math.round(((Number(x.paiement_cumule) || 0) + x._atant) / pj * 100) / 100 : 0;
  const sij = [[t("1 jou"), Math.min(pj, x._rete)], ...(x._reta ? [[`${t("Reta")} + ${t("jodi a")}`, Math.min(x._reta + pj, x._rete)]] : []), [t("Tout sa ki rete"), x._rete]]
    .filter((v, i, a) => a.findIndex((w) => w[1] === v[1]) === i);
  $app.innerHTML = `${back}<h1>${t("Tranzaksyon kredi")}</h1>${tipKreTx(x, "peye")}
  <form id="f" class="card form" novalidate>
    <p>${badjKat(katKredi(x))} <b>${d(non(c))}</b> · ${d(x.no_compte || "")}${kane(x)}</p>
    <p class="mut sm">${t("Montan pa vèsman")} ${gd(pj)} · ${lisJou(x._jours)} · ${t("rete")} ${gd(x._rete)}${x._reta ? ` · <span class="err-t">${t("reta")} ${gd(x._reta)} (${x._jouReta} ${t("jou")})</span>` : ""}</p>
    <div class="chips">${sij.map(([l, v]) => `<button type="button" class="chip" data-kr-m="${v}">${h(l)}<small>${gd(v)}</small></button>`).join("")}</div>
    <label>${t("Montan (goud)")} *<input name="montant" type="number" inputmode="decimal" min="1" step="any" value="${Math.min(pj, x._rete)}" required></label>
    ${M.skDispo && mwenSe(M.comptes.get(x.id_compte_epargne)?.created_by) ? kaneChk() : ""}
    <div class="grid2" id="kane-chan">
      <label>${t("Vèsman avan (kanè)")} *<input name="vesman_avan" type="number" inputmode="decimal" min="0" step="any" value="${vAvan}" required></label>
      <label>${t("Vèsman apre (kanè)")} *<input name="vesman_apre" type="number" inputmode="decimal" min="0" step="any" required></label>
    </div>
    <p class="mut sm">${t("Chak peman jounalye se 1 vèsman")} (${gd(pj)} = 1). ${t("Peman an ap tann responsab kès la valide l anvan li parèt sou balans kredi a.")}</p>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${t("Anrejistre peman an")}</button>
  </form>`;
  const f = document.getElementById("f");
  const r2 = (v) => Math.round(v * 100) / 100;
  // Vèsman apre = vèsman avan + montan ÷ peman jounalye (sof si ajan an chanje l limenm).
  const autoApre = () => { const av = f.vesman_avan.value, m = Number(f.montant.value); if (av === "" || !(m > 0) || !pj || f.vesman_apre.dataset.manuel) return; f.vesman_apre.value = r2(Number(av) + m / pj); };
  f.montant.addEventListener("input", autoApre); f.vesman_avan.addEventListener("input", autoApre);
  f.vesman_apre.oninput = () => (f.vesman_apre.dataset.manuel = "1");
  autoApre();
  if (f.san_kane) f.san_kane.onchange = () => { document.getElementById("kane-chan").hidden = f.san_kane.checked; if (f.san_kane.checked) { f.vesman_apre.dataset.manuel = ""; autoApre(); } };
  $app.querySelectorAll("[data-kr-m]").forEach((b) => (b.onclick = () => { f.montant.value = b.dataset.krM; autoApre(); }));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"), m = Math.round(Number(f.montant.value) * 100) / 100;
    if (!(m > 0)) return (err.textContent = t("Mete montan peman an."));
    if (m > x._rete) return (err.textContent = `${t("Peman an depase sa ki rete sou kredi a")} (${gd(x._rete)}).`);
    const sanKane = !!f.san_kane?.checked;
    if (sanKane) { f.vesman_apre.dataset.manuel = ""; autoApre(); }
    for (const [chan, mesaj] of [["vesman_avan", "Mete vèsman avan an (kanè a)."], ["vesman_apre", "Mete vèsman apre a (kanè a)."]]) {
      f[chan].removeAttribute("aria-invalid");
      if (f[chan].value.trim() === "" || !(Number(f[chan].value) >= 0)) { f[chan].setAttribute("aria-invalid", "true"); f[chan].focus(); return (err.textContent = t(mesaj)); }
    }
    const va = r2(Number(f.vesman_avan.value)), vp = r2(Number(f.vesman_apre.value));
    if (!(vp > va)) { f.vesman_apre.setAttribute("aria-invalid", "true"); return (err.textContent = t("Vèsman apre a dwe plis pase vèsman avan an.")); }
    if (!(await leOk())) return montreLeFèmen();
    const atann = pj ? r2(va + m / pj) : vp;
    if (!sanKane && Math.abs(atann - vp) > 0.01 && !(await ui.ask({ titre: "Vèsman yo pa koresponn ak montan an", ikon: "!", ok: "Kontinye",
      detay: [["Montan (goud)", gd(m)], ["Vèsman", `${va} → ${vp}`], ["Vèsman apre dapre montan an", String(atann)]] }))) return;
    if (!(await ui.ask({ titre: "Anrejistre peman kredi sa a?", ok: "Konfime", ikon: "+", foto: c?.photo_url, detay: [["Kliyan", non(c)], ["Kategori kont", t(KAT_KONT[katKredi(x)])], ["Kredi", x.no_compte || ""],
      ["Montan (goud)", gd(m)], ...(sanKane ? [["Kanè", `📒 ${t("San kanè")} · ${t("kont lan ap bloke")}`], ["Vèsman apre sou kanè a dwe vin", String(vp)]] : [["Vèsman avan", String(va)], ["Vèsman apre", String(vp)]]),
      ["Rete apre peman an", gd(Math.max(x._rete - m, 0))]] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const txId = S.uuid();
    if (sanKane) await S.enqueue("san_kane", { id: `sk-${txId}`, tx: txId, kind: "kredi", ref: x.id_compte_credit, tip: "Paiement", montant: m, kane_apre: vp, kreye_le: new Date().toISOString() });
    await S.enqueue("kredi_peye", { id: txId, credit: x.id_compte_credit, montant: m, vesman_avan: va, vesman_apre: vp, gps: await getGps(5000), capture_le: new Date().toISOString(), appareil: S.appareil() }, sanKane ? [`sk-${txId}`] : []);
    toast(t("Peman an anrejistre: l ap tann validasyon responsab kès la."), "ok", 5000);
    go(`#/kredi/${x.id_compte_credit}`);
  };
}
// Tip tranzaksyon sou paj peman kredi a: vèsman (peman) oswa penalite.
const tipKreTx = (x, akt) => `<div class="tabs" role="tablist" id="kr-tip">${[["peye", t("Peman (vèsman)"), x._rete > 0 ? gd(x._rete) : ""], ["penalite", t("Penalite"), x._penDu > 0 ? gd(x._penDu) : t("okenn")]]
  .map(([k, l, n]) => `<a role="tab" class="tab ${akt === k ? "on" : ""}" aria-selected="${akt === k}" data-kr-tip="${k}" href="#/kredi/${h(x.id_compte_credit)}/${k}">${l}${n ? ` <small class="mut">${n}</small>` : ""}</a>`).join("")}</div>`;
async function viewKrediPenalite(M, x) {
  const c = M.clients.get(x.id_personne), id = x.id_compte_credit;
  const back = `<a href="#/kredi/${h(id)}" class="back">‹ ${d(x.no_compte || t("Kredi"))}</a>`;
  if (x._penDu <= 0) { $app.innerHTML = `${back}<h1>${t("Tranzaksyon kredi")}</h1>${tipKreTx(x, "penalite")}<p class="empty">${t("Kliyan sa a pa dwe penalite.")}${x._penDe ? ` ${t("Penalite kòmanse")} ${datFr(x._penDe)} (${t("dat fen")} + ${x._gras} ${t("jou gras")}).` : ""}</p>`; return; }
  const sij = [[t("1 jou"), Math.min(x._penPaJou, x._penDu)], [t("Tout penalite a"), x._penDu]].filter((v, i, a) => a.findIndex((w) => w[1] === v[1]) === i);
  $app.innerHTML = `${back}<h1>${t("Tranzaksyon kredi")}</h1>${tipKreTx(x, "penalite")}
  <form id="f" class="card form" novalidate>
    <p>${badjKat(katKredi(x))} <b>${d(non(c))}</b> · ${d(x.no_compte || "")}${kane(x)}</p>
    <p class="mut sm">${t("Dat fen")} ${datFr(x.date_fin)} + ${x._gras} ${t("jou gras")} · ${x._penJou} ${t("jou")} × ${gd(x._penPaJou)} = ${gd(x._penTotal)} · ${t("deja ankese")} ${gd(x._penPeye)}</p>
    <div class="chips">${sij.map(([l, v]) => `<button type="button" class="chip" data-kr-m="${v}">${h(l)}<small>${gd(v)}</small></button>`).join("")}</div>
    <label>${t("Montan (goud)")} *<input name="montant" type="number" inputmode="decimal" min="1" step="any" value="${x._penDu}" required></label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${t("Anrejistre penalite a")}</button>
  </form>`;
  const f = document.getElementById("f");
  $app.querySelectorAll("[data-kr-m]").forEach((b) => (b.onclick = () => (f.montant.value = b.dataset.krM)));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"), m = Math.round(Number(f.montant.value) * 100) / 100;
    if (!(m > 0)) return (err.textContent = t("Mete montan penalite a."));
    if (m > x._penDu) return (err.textContent = `${t("Penalite a depase sa kliyan an dwe")} (${gd(x._penDu)}).`);
    if (!(await leOk())) return montreLeFèmen();
    if (!(await ui.ask({ titre: "Ankese penalite sa a?", ok: "Konfime", ikon: "!", foto: c?.photo_url, detay: [["Kliyan", non(c)], ["Kategori kont", t(KAT_KONT[katKredi(x)])], ["Kredi", x.no_compte || ""],
      ["Penalite (goud)", gd(m)], ["Penalite ki rete apre", gd(Math.max(x._penDu - m, 0))]] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    await S.enqueue("kredi_penalite", { id: S.uuid(), credit: id, montant: m, gps: await getGps(5000), capture_le: new Date().toISOString(), appareil: S.appareil() });
    toast(t("Penalite a anrejistre."), "ok", 4000);
    go(`#/kredi/${id}`);
  };
}
// ---------- Kont garanti (Bwat Sekrèm): Epargne Bloquée (kredi klasik) ak Fonds Garantie Konfyans (kredi Konfyans) ----------
// Yon kont pa kalite pou chak kliyan. Depo lè kliyan an vle, san frè. Retrè entèdi tank kliyan an gen yon kredi aktif menm kalite.
const GAR_NON = { klasik: "Epargne Bloquée", konfyans: "Fonds Garantie Konfyans" };
// Kategori kont: epay (sèvis sit la), kont garanti, kredi. Parèt toupatou pou ajan an pa antre yon tranzaksyon sou move kont.
const KAT_KONT = { epay: C?.SEVIS === "epargne" ? "Epargne" : "Grandon", gar_klasik: "Epargne Bloquée", gar_konfyans: "Fonds Garantie Konfyans", kr_klasik: "Kredi klasik", kr_konfyans: "Kredi Konfyans" };
const katKredi = (x) => (x?.kalite === "konfyans" || x?.type_compte_credit === "Konfyans" ? "kr_konfyans" : "kr_klasik");
const badjKat = (kat) => `<span class="badge kkat kkat-${kat.split("_")[0]}" data-kat="${kat}">${t(KAT_KONT[kat])}</span>`;
const etaGarTx = (y) => y._err ? `<span class="badge err">${t("Erè")}</span>` : y._pending ? `<span class="badge mut">${t("Poko voye")}</span>`
  : y.statut === "pending" ? `<span class="badge warn">${t("An atant validasyon")}</span>` : y.statut === "rejected" ? `<span class="badge err">${t("Rejte ✗")}</span>` : `<span class="badge ok">${t("Valide ✓")}</span>`;
function seksyonGaranti(M, c) {
  if (!M.mod?.garanti || estKesye()) return "";
  const kr = (M.kredi || []).filter((x) => x.id_personne === c.id_personne && (!x._fini || x._penDu > 0));
  const kal = M.mod.konfyans ? ["klasik", "konfyans"] : ["klasik"];
  const kat = (kl) => { const g = (M.garanti || []).find((x) => x.id_personne === c.id_personne && x.kalite === kl);
    if (!g) return `<div class="card gar-k" data-gar-kal="${kl}"><b>${t(GAR_NON[kl])}</b><p class="mut sm">${t("Kliyan an poko gen kont sa a.")}</p>
      <button type="button" class="btn sm pri" data-gar-ouvri="${kl}">＋ ${t("Ouvri kont lan")}</button></div>`;
    return `<div class="card gar-k" data-gar="${h(g.id)}"><div class="gar-h">${badjKat("gar_" + kl)} <span class="mut sm">${d(g.no_compte)}</span>
        ${g._bloke ? `<span class="badge warn">🔒 ${t("Bloke: kredi aktif")}</span>` : ""}</div>
      <div class="gar-b"><span class="mut sm">${t("Balans valide")}</span><b class="in">${gd(g._balans)}</b>
        ${g._atantD ? `<small class="mut">+${gd(g._atantD)} ${t("depo an atant")}</small>` : ""}${g._atantR ? `<small class="mut">−${gd(g._atantR)} ${t("retrè an atant")}</small>` : ""}</div>
      <div class="btns"><a class="btn sm pri" href="#/garanti/${h(g.id)}/depo">＋ ${t("Depo")}</a>
        ${g._bloke ? `<button type="button" class="btn sm" disabled title="${h(t("Kliyan an gen yon kredi aktif"))}">${t("Retrè")}</button>` : `<a class="btn sm" href="#/garanti/${h(g.id)}/retre">${t("Retrè")}</a>`}</div></div>`; };
  return `<section class="gar-sek" id="gar-sek"><h2>${t("Kredi ak kont garanti")}</h2>
    ${kr.length ? `<div class="list">${kr.map((x) => `<a class="row lnk" href="#/kredi/${h(x.id_compte_credit)}"><span class="grow"><b>${d(x.no_compte || "")}</b> ${badjKat(katKredi(x))}
      <span class="mut sm"> · ${t("rete")} ${gd(x._rete)}</span></span>${badjKredi(x)}</a>`).join("")}</div>` : ""}
    <div class="gar-g">${kal.map(kat).join("")}</div></section>`;
}
function brancheGaranti(M, c) {
  $app.querySelectorAll("[data-gar-ouvri]").forEach((b) => (b.onclick = async () => {
    const kl = b.dataset.garOuvri;
    if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou ouvri yon kont garanti.");
    if (!(await ui.ask({ titre: `${t("Ouvri kont")} ${t(GAR_NON[kl])}?`, ok: "Ouvri kont lan", detay: [["Kliyan", non(c)], ["Kont", t(GAR_NON[kl])]] }))) return;
    b.disabled = true;
    try { const r = await api.rpc("grandon_garanti_ouvri", { p_id: S.uuid(), p_personne: c.id_personne, p_kalite: kl }); await S.pull(); toast(`${t("Kont lan ouvri")} · ${r.no_compte} ✓`, "ok"); render(); }
    catch (e) { b.disabled = false; ui.info("Erè", t(e.message)); }
  }));
}
async function viewGarantiTx(id, tipR) {
  if (!(await leOk())) return viewLeFèmen();
  const M = await S.model();
  const g = (M.garanti || []).find((x) => x.id === id);
  if (!g) return go("#/");
  const c = M.clients.get(g.id_personne) || {}, depo = tipR === "depo";
  const back = `<a href="#/kliyan/${h(g.id_personne)}" class="back">‹ ${d(non(c))}</a>`;
  const skB = M.kaneBlok("garanti", g.id);
  if (skB) { $app.innerHTML = kaneBlokHtml(M, skB, back, `${depo ? t("Depo") : t("Retrè")} · ${t(GAR_NON[g.kalite])}`); brancheKaneBlok(skB); return; }
  const skOk = depo && M.skDispo && [...M.comptes.values()].some((k0) => k0.id_personne === g.id_personne && mwenSe(k0.created_by));
  const dG = g._tx.find((y) => y.statut !== "rejected" && y.solde_apres != null), gBaz = dG ? Number(dG.solde_apres) : null;
  if (!depo && g._bloke) { $app.innerHTML = `${back}<h1>${t("Retrè")} · ${t(GAR_NON[g.kalite])}</h1><p class="note warn">🔒 ${t("Kliyan an gen yon kredi aktif: li pa ka retire sou kont garanti a jiskaske kredi a fin peye.")}</p>`; return; }
  $app.innerHTML = `${back}<h1>${depo ? t("Depo") : t("Retrè")} · ${t(GAR_NON[g.kalite])}</h1>
  <form id="f" class="card form" novalidate>
    <p>${badjKat("gar_" + g.kalite)} <b>${d(non(c))}</b> · ${d(g.no_compte)}</p>
    <p class="mut sm">${t("Balans valide")} ${gd(g._balans)}${!depo ? ` · ${t("disponib pou retrè")} ${gd(g._dispo)}` : ""} · ${t("san frè")}</p>
    <label>${t("Montan (goud)")} *<input name="montant" type="number" inputmode="decimal" min="1" step="any" required></label>
    ${skOk ? kaneChk() : ""}
    <div class="grid2" id="kane-chan">
      <label>${t("Balans kanè a avan")} *<input name="solde_avant" type="number" inputmode="decimal" min="0" step="any" required></label>
      <label>${t("Balans kanè a apre")} *<input name="solde" type="number" inputmode="decimal" min="0" step="any" required></label>
    </div>
    <p class="mut sm">${t("Tranzaksyon an ap tann responsab kès la valide l anvan li parèt sou balans lan.")}</p>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${depo ? t("Anrejistre depo a") : t("Voye retrè a")}</button>
  </form>`;
  const f = document.getElementById("f");
  // Balans kanè apre = avan ± montan (sof si ajan an chanje l limenm).
  const autoApre = () => { const av = f.solde_avant.value, m = Number(f.montant.value); if (av === "" || !(m > 0) || f.solde.dataset.manuel) return; f.solde.value = Number(av) + (depo ? m : -m); };
  f.solde_avant.oninput = autoApre; f.montant.addEventListener("input", autoApre);
  f.solde.oninput = () => (f.solde.dataset.manuel = "1");
  if (f.san_kane) f.san_kane.onchange = () => (document.getElementById("kane-chan").hidden = f.san_kane.checked);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"), m = Math.round(Number(f.montant.value) * 100) / 100;
    if (!(m > 0)) return (err.textContent = t("Mete montan an."));
    const sanKane = !!f.san_kane?.checked;
    if (sanKane) { f.solde_avant.value = gBaz ?? 0; f.solde.value = (gBaz ?? 0) + m; }
    for (const [chan, mesaj] of [["solde_avant", "Mete balans kanè a avan."], ["solde", "Mete balans kanè a apre."]]) {
      const v = f[chan].value.trim(); f[chan].removeAttribute("aria-invalid");
      if (v === "" || !(Number(v) >= 0)) { f[chan].setAttribute("aria-invalid", "true"); f[chan].focus(); return (err.textContent = t(mesaj)); }
    }
    const av = Number(f.solde_avant.value), ap = Number(f.solde.value);
    if (!sanKane && Math.abs(av + (depo ? m : -m) - ap) > 0.01 && !(await ui.ask({ titre: "Balans kanè yo pa koresponn ak montan an", ikon: "!", ok: "Kontinye",
      detay: [["Montan (goud)", gd(m)], ["Kanè avan → apre", `${gd(av)} → ${gd(ap)}`], ["Kanè apre dapre montan an", gd(av + (depo ? m : -m))]] }))) return;
    if (!depo && m > g._dispo) return (err.textContent = `${t("Retrè a depase balans valide a")} (${gd(g._dispo)} ${t("disponib")}).`);
    if (!(await leOk())) return montreLeFèmen();
    if (!(await ui.ask({ titre: depo ? "Anrejistre depo garanti sa a?" : "Voye retrè garanti sa a?", ok: "Konfime", ikon: depo ? "+" : "−", foto: c.photo_url,
      detay: [["Kliyan", non(c)], ["Kategori kont", t(GAR_NON[g.kalite])], ["Kont", g.no_compte], ["Montan (goud)", gd(m)], ...(sanKane ? [["Kanè", `📒 ${t("San kanè")} · ${t("kont lan ap bloke")}`], ["Balans kanè a dwe vin", gd(ap)]] : [["Balans kanè a avan", gd(av)], ["Balans kanè a apre", gd(ap)]])] }))) return;
    f.querySelector("button[type=submit]").disabled = true;
    const txId = S.uuid();
    if (sanKane) await S.enqueue("san_kane", { id: `sk-${txId}`, tx: txId, kind: "garanti", ref: g.id, tip: "D", montant: m, kane_apre: ap, kreye_le: new Date().toISOString() });
    await S.enqueue("garanti_tx", { id: txId, garanti: g.id, tip: depo ? "D" : "R", montant: m, solde_avan: av, solde_apre: ap, gps: await getGps(5000), capture_le: new Date().toISOString(), appareil: S.appareil() }, sanKane ? [`sk-${txId}`] : []);
    toast(t(depo ? "Depo a anrejistre: l ap tann validasyon responsab kès la." : "Retrè a voye: l ap tann responsab kès la."), "ok", 5000);
    go(`#/kliyan/${g.id_personne}`);
  };
}
function kesGarantiHtml(M, l) {
  if (!l.length) return `<p class="empty">${kesF.q || kesF.ajan ? t("Anyen pa koresponn.") : t("Pa gen tranzaksyon garanti an atant validasyon.")}</p>`;
  return `<div class="list tx-lis">${l.map(({ y, g }) => { const c = M.clients.get(g.id_personne), D = y.tip === "D";
    return `<div class="row kesr" data-kes-gar="${h(y.id)}"><span class="txr-le"><b class="mono">${lèKout(y.capture_le) || "—"}</b><small>${S.jouLokal(new Date(y.capture_le)) === M.today ? t("jodi a") : datKout(S.jouLokal(new Date(y.capture_le)))}</small></span>
      <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> ${badjKat("gar_" + g.kalite)} <span class="badge ${D ? "info" : "warn"}">${D ? t("Depo") : t("Retrè")}</span></span>
        <span class="mut sm">${t(GAR_NON[g.kalite])} · ${d(g.no_compte)} · <span data-brut>${h(nonAjan(y.created_by))}</span></span>
        ${y.solde_apres != null ? `<span class="mut sm">${t("kanè avan")} ${gd(y.solde_avant)} → ${t("kanè apre")} ${gd(y.solde_apres)}</span>` : ""}
        <span class="mut sm">${t("Balans valide")} ${gd(g._balans)}${g._bloke ? ` · 🔒 ${t("kredi aktif")}` : ""}</span></span>
      <span class="kes-mon"><b class="${D ? "in" : "out"}">${D ? "+" : "−"}${gd(y.montant)}</b>
        <span class="kes-bt"><button type="button" class="btn sm pri" data-gav="${h(y.id)}">Valide</button><button type="button" class="btn sm danger" data-gar="${h(y.id)}">Rejte</button></span></span></div>`; }).join("")}</div>`;
}
async function kesGarantiDeside(ids, ok, total) {
  if (!ids.length) return;
  if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou valide oswa rejte tranzaksyon yo.");
  let motif = null;
  if (ok) { if (!(await ui.ask({ titre: "Valide tranzaksyon garanti sa a?", ok: "Valide", ikon: "✓", tekst: "Ou konfime kach la (depo resevwa oswa retrè peye).", detay: [["Total", gd(total)]] }))) return; }
  else { motif = await ui.askText({ titre: `${t("Rejte tranzaksyon garanti sa a")} (${gd(total)})?`, label: "Rezon refi a", min: 3 }); if (!motif) return; }
  try {
    const r = await api.rpc("grandon_garanti_valide", { p_ids: ids, p_ok: ok, p_motif: motif });
    toast(`${r?.trete ?? ids.length} ${t(ok ? "tranzaksyon valide" : "tranzaksyon rejte")} · ${gd(r?.total ?? total)}`, "ok");
    await S.patchMeta("garanti_tx", "id", ids, { statut: ok ? "confirmed" : "rejected" });
    S.pullFon();
  } catch (e) { return ui.info("Erè", t(e.message)); }
  render();
}

// ---------- «Peye san kanè» ----------
// Kont lan bloke pou tout tranzaksyon jiskaske yon ajan konfime li antre tranzaksyon san kanè a nan kanè a.
const KANE_TIT = { epay: "Balans kanè a dwe vin", kredi: "Vèsman apre sou kanè a dwe vin", garanti: "Balans kanè a dwe vin" };
function kaneBlokHtml(M, rec, back, tit) {
  const vale = rec.kane_apre != null ? (rec.kind === "kredi" ? String(Number(rec.kane_apre)) : gd(rec.kane_apre)) : "—";
  return `${back}<h1>${tit}</h1>
  <div class="card kane-blok" id="kane-blok"><p class="note warn"><b>📒 ${t("Kanè a pa ajou")}</b></p>
    <p>${t("Le")} <b>${datFr(S.jouLokal(new Date(rec.kreye_le)))}</b> ${t("a")} ${lèKout(rec.kreye_le) || ""}, <b data-brut>${h(nonAjan(rec.created_by))}</b> ${t("te touche")} <b>${gd(rec.montant)}</b> ${t("pou kliyan sa a san kanè.")}</p>
    <p>${t(KANE_TIT[rec.kind])} <b>${vale}</b>.</p>
    <p class="mut sm">${t("Antre tranzaksyon sa a nan kanè kliyan an, epi konfime l. Pa gen lòt tranzaksyon ki ka fèt sou kont sa a anvan sa.")}</p>
    <button type="button" class="btn pri" id="kane-ok">✓ ${t("Mwen antre l nan kanè a")}</button></div>`;
}
function brancheKaneBlok(rec) {
  document.getElementById("kane-ok")?.addEventListener("click", async () => {
    if (!(await ui.ask({ titre: "Kanè a ajou?", ok: "Wi, li ajou", tekst: t("Ou konfime tranzaksyon san kanè a antre nan kanè kliyan an."), detay: [["Montan (goud)", gd(rec.montant)]] }))) return;
    await S.enqueue("kane_konfime", { id: S.uuid(), sk: rec.id, le: new Date().toISOString() }, rec._pending ? [`sk-${rec.id}`] : []);
    toast(t("Kanè a ajou: kont lan debloke."), "ok"); render();
  });
}
// Chekbox «san kanè»: sèlman ajan pòtfèy kliyan an, sèlman pou kòb ki antre.
const kaneChk = () => `<label class="chk kane-chk" id="l-san-kane"><input type="checkbox" name="san_kane"> <span><b>${t("Kliyan an peye san kanè")}</b><br><small class="mut">${t("Kont lan ap bloke jiskaske tranzaksyon an antre nan kanè a.")}</small></span></label>`;

// Manadjè: modifye kalandriye peman yon kredi (frekans + jou). Dat fen an rekalkile ak vèsman ki rete yo, apati jodi a.
async function viewKrediKalandriye(id) {
  const M = await S.model();
  const x = (await kreDone(M)).find((k) => k.id_compte_credit === id);
  if (!x) return go("#/kredi");
  const c = M.clients.get(x.id_personne), pj = Number(x.paiement_journalier) || 0;
  const rete = Math.max((Number(x.montant_final) || 0) - (Number(x.paiement_cumule) || 0), 0), n = pj ? Math.ceil(rete / pj - 1e-9) : 0;
  const de = M.today > x.date_debut ? M.today : x.date_debut;
  let jours = [...x._jours], freq = FREK_KREDI.includes(jours.length) ? jours.length : 6;
  $app.innerHTML = `<a href="#/kredi/${h(id)}" class="back">‹ ${d(x.no_compte || t("Kredi"))}</a><h1>${t("Modifye kalandriye peman")}</h1>
  <form id="f" class="card form" novalidate>
    <p><b>${d(non(c))}</b> · ${d(x.no_compte || "")}${kane(x)}</p>
    <p class="mut sm">${t("Kalandriye kounye a")}: <b>${x._jours.length}× · ${lisJou(x._jours)}</b> · ${t("dat fen")} ${datFr(x.date_fin)}</p>
    <fieldset class="field"><legend>${t("Frekans")} * <small class="mut">(${t("kantite fwa pa semèn")})</small></legend>
      <div class="seg s4" id="kr-freq">${FREK_KREDI.map((m) => `<label><input type="radio" name="freq" value="${m}" ${m === freq ? "checked" : ""}><span>${m}×</span></label>`).join("")}</div>
    </fieldset>
    <fieldset class="field"><legend>${t("Jou peman yo")} * <small class="mut" id="jou-hint"></small></legend>
      <div class="jours j6" id="jours">${[1, 2, 3, 4, 5, 6].map((j) => `<label><input type="checkbox" name="jou" value="${j}"><span>${JOU_KOUT[j]}</span></label>`).join("")}</div>
    </fieldset>
    <label>${t("Rezon")} <small class="mut">(${t("opsyonèl")})</small><input name="rezon" maxlength="200" autocomplete="off"></label>
    <div class="recap" id="recap" aria-live="polite"></div>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${t("Anrejistre nouvo kalandriye a")}</button>
  </form>`;
  const f = document.getElementById("f");
  const boxes = [...f.querySelectorAll('input[name="jou"]')];
  const finNouvo = () => (n > 0 && jours.length ? S.ajouteJou(S.finVesman(de, [...jours].sort(), n, M.feries), -1) : x.date_fin);
  const recap = () => {
    boxes.forEach((b) => (b.checked = jours.includes(Number(b.value))));
    const rest = freq - jours.length;
    document.getElementById("jou-hint").textContent = rest > 0 ? `(${t("chwazi")} ${rest} ${t("ankò")})` : `(${freq} ${t("jou")})`;
    const ok = jours.length === freq;
    document.getElementById("recap").innerHTML = `
      <div><span>${t("Nouvo kalandriye")}</span><b>${ok ? `${freq}× · ${lisJou([...jours].sort())}` : "—"}</b></div>
      <div><span>${t("Vèsman ki rete")}</span><b>${n}</b><small class="mut">${gd(rete)} ÷ ${gd(pj)}</small></div>
      <div><span>${t("Nouvo dat fen")}</span><b>${ok ? datFr(finNouvo()) : "—"}</b><small class="mut">${t("avan")}: ${datFr(x.date_fin)}</small></div>`;
  };
  f.querySelectorAll('input[name="freq"]').forEach((r) => (r.onchange = () => { freq = Number(r.value); jours = [...JOU_DEFO_KREDI[freq]]; recap(); }));
  boxes.forEach((b) => (b.onchange = () => {
    const j = Number(b.value);
    if (b.checked) {
      if (jours.length >= freq) { if (freq === 1) jours = []; else { b.checked = false; toast(`${t("Ou deja chwazi")} ${freq} ${t("jou. Retire youn anvan.")}`, "err", 2500); return; } }
      jours.push(j);
    } else jours = jours.filter((v) => v !== j);
    recap();
  }));
  recap();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    if (jours.length !== freq) return (err.textContent = `${t("Chwazi egzakteman")} ${freq} ${t("jou peman.")}`);
    const js = [...jours].sort();
    if (js.join() === [...x._jours].sort().join()) return (err.textContent = t("Kalandriye a pa chanje."));
    if (!navigator.onLine) return (err.textContent = t("Fòk ou gen entènèt pou modifye kalandriye a."));
    if (!(await ui.ask({ titre: "Modifye kalandriye peman an?", ok: "Modifye l", foto: c?.photo_url, detay: [["Kliyan", non(c)], ["Kredi", x.no_compte || ""],
      ["Avan", `${x._jours.length}× · ${lisJou(x._jours)}`], ["Apre", `${js.length}× · ${lisJou(js)}`], ["Vèsman ki rete", String(n)],
      ["Dat fen", `${datFr(x.date_fin)} → ${datFr(finNouvo())}`]] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    try {
      const r = await api.rpc("grandon_kredi_kalandriye_modifye", { p_credit: id, p_jours: js, p_rezon: f.rezon.value.trim() || null });
      await S.pull();
      toast(`${t("Kalandriye a modifye")} · ${t("dat fen")} ${datFr(r?.date_fin || finNouvo())} ✓`, "ok", 5000);
      go(`#/kredi/${id}`);
    } catch (e2) { b.disabled = false; err.textContent = t(e2.message); }
  };
}
// Responsab kès: peman kredi an atant yo.
function kesKrediHtml(M, l) {
  if (!l.length) return `<p class="empty">${kesF.q || kesF.ajan ? t("Anyen pa koresponn.") : t("Pa gen peman kredi an atant validasyon.")}</p>`;
  return `<div class="kes-tout"><span>${l.length} ${t("peman")} · <b class="in">${gd(sumMon(l))}</b></span> <button type="button" class="btn sm pri" id="kes-kr-tout">${t("Valide tout")}</button></div>
    <div class="list tx-lis">${l.map(({ y, k }) => { const c = M.clients.get(k.id_personne);
      return `<div class="row kesr" data-kes-kr="${h(y.id_transaction_credit)}"><span class="txr-le"><b class="mono">${lèKout(y.capture_le || y.date_transaction) || "—"}</b><small>${jouKreTx(y) === M.today ? t("jodi a") : datKout(jouKreTx(y))}</small></span>
      <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> ${badjKat(katKredi(k))}</span><span class="mut sm">${d(k.no_compte || "")} · <span data-brut>${h(nonAjan(y.created_by))}</span></span>
        <span class="mut sm">${y.versement_apres != null ? `${t("vèsman")} ${Number(y.versement_avant)} → ${Number(y.versement_apres)} · ` : ""}${t("rete")} ${gd(k.montant_restant)} / ${gd(k.montant_final)}</span></span>
      <span class="kes-mon"><b class="in">+${gd(y.montant)}</b>
        <span class="kes-bt"><button type="button" class="btn sm pri" data-krv="${h(y.id_transaction_credit)}">Valide</button><button type="button" class="btn sm danger" data-krr="${h(y.id_transaction_credit)}">Rejte</button></span></span></div>`; }).join("")}</div>`;
}
function kesPenaliteHtml(M, kre) {
  const de = S.ajouteJou(M.today, -6);
  const l = kre.flatMap((k) => k._txTout.filter((y) => y.type_transaction === "Penalite" && !y._pending && jouKreTx(y) >= de).map((y) => ({ y, k, montant: y.montant })))
    .filter(({ y }) => !kesF.ajan || y.created_by === kesF.ajan).sort((a, b) => String(b.y.capture_le || b.y.date_transaction).localeCompare(String(a.y.capture_le || a.y.date_transaction)));
  if (!l.length) return "";
  return `<details class="rb card" id="kes-pen"><summary><b>${t("Penalite ajan yo ankese")}</b><span class="mut sm">${t("7 dènye jou")} · ${l.length} · ${gd(sumMon(l))}</span></summary>
    <div class="list tx-lis">${l.map(({ y, k }) => `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(y.capture_le || y.date_transaction) || "—"}</b><small>${jouKreTx(y) === M.today ? t("jodi a") : datKout(jouKreTx(y))}</small></span>
      <span class="txr-main"><span class="txr-t"><b>${d(non(M.clients.get(k.id_personne)))}</b></span><span class="mut sm">${d(k.no_compte || "")} · <span data-brut>${h(nonAjan(y.created_by))}</span></span></span>
      <span class="txr-mon"><b class="in">+${gd(y.montant)}</b></span></div>`).join("")}</div></details>`;
}
async function kesKrediDeside(ids, ok, total) {
  if (!ids.length) return;
  if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou valide oswa rejte peman yo.");
  let motif = null;
  if (ok) { if (!(await ui.ask({ titre: ids.length > 1 ? `${t("Valide")} ${ids.length} ${t("peman kredi")}?` : "Valide peman kredi sa a?", ok: "Valide", ikon: "✓",
    tekst: "Ou konfime ou resevwa kach la. Balans kredi a ap desann touswit.", detay: [["Total", gd(total)]] }))) return; }
  else { motif = await ui.askText({ titre: `${t("Rejte peman kredi sa a")} (${gd(total)})?`, label: "Rezon refi a", min: 3 }); if (!motif) return; }
  try {
    const r = await api.rpc("grandon_kredi_valide", { p_ids: ids, p_ok: ok, p_motif: motif });
    toast(`${r?.trete ?? ids.length} ${t(ok ? "peman valide" : "peman rejte")} · ${gd(r?.total ?? total)}`, "ok");
    await S.patchMeta("kredi_tx", "id_transaction_credit", ids, { validation_status: ok ? "confirmed" : "rejected" });
    S.pullFon();
  } catch (e) { return ui.info("Erè", e.message); }
  render();
}
async function viewKrediNouvo() {
  const M = await S.model();
  const moun = [...M.clients.values()].filter((c) => S.comptesDuClient(M, c.id_personne).some((k) => !k._pending)).sort((a, b) => non(a).localeCompare(non(b), "fr"));
  const demen = S.ajouteJou(S.jodi(), 1);
  const KF = M.mod?.konfyans, GA = M.mod?.garanti;
  const tipKlasik = KF ? TIP_KREDI.filter((x) => x !== "Konfyans") : TIP_KREDI;
  $app.innerHTML = `<a href="#/kredi" class="back">‹ ${t("Kredi")}</a><h1>${t("Nouvo kredi")}</h1>
  <form id="f" class="card form" novalidate>
    ${KF ? `<fieldset class="field"><legend>${t("Kalite kredi")} *</legend>
      <div class="seg s2" id="kr-kalite"><label><input type="radio" name="kalite" value="klasik" checked><span>${t("Kredi klasik")}</span></label><label><input type="radio" name="kalite" value="konfyans"><span>Konfyans</span></label></div>
    </fieldset>` : ""}
    <label>${t("Kliyan")} *<input id="kr-q" type="search" placeholder="${h(t("Chèche non kliyan an…"))}" autocomplete="off"></label>
    <div id="kr-moun" class="list kr-moun"></div>
    <fieldset class="field" id="kr-kont-f" hidden><legend>${t("Kont epay ki lye ak kredi a")} *</legend><div id="kr-kont" class="kr-kont"></div></fieldset>
    <div class="grid2">
      <label>${t("Montan l ap prete a")} *<input name="montan" type="number" inputmode="decimal" min="1" step="any" required></label>
      <label class="kr-klasik">${t("Dire")} *<select name="duree">${Array.from({ length: 24 }, (_, i) => i + 1).map((m) => `<option value="${m}">${m} ${t("mwa")}</option>`).join("")}</select></label>
      <label class="kr-konf" hidden>${t("Dire")} (${t("jou peman")}) *<input name="dire_jou" type="number" inputmode="numeric" min="1" max="60" step="1" value="${Number(KF?.jou ?? 11)}" ${estManager() ? "" : "readonly"}></label>
      <label><span id="kr-to-l">${t("To enterè")} (% ${t("pa mwa")})</span> *<input name="taux" type="number" inputmode="numeric" min="0" max="100" step="1" required></label>
      <label>${t("Montan pa vèsman")} *<input name="peman" type="number" inputmode="decimal" min="1" step="any" required></label>
      <label>${t("Dat kòmansman")} *<input name="debut" type="date" value="${demen}" required></label>
      <label class="kr-klasik">${t("Tip kredi")}<select name="tip"><option value="">—</option>${tipKlasik.map((x) => `<option>${h(x)}</option>`).join("")}</select></label>
      ${GA ? `<label>${t("Garanti")} (% ${t("montan prete a")}) *<input name="pousantaj" type="number" inputmode="decimal" min="0" max="100" step="any" value="${Number(GA.pousantaj ?? 20)}"></label>` : ""}
    </div>
    <fieldset class="field kr-klasik"><legend>${t("Frekans")} * <small class="mut">(${t("kantite fwa pa semèn")})</small></legend>
      <div class="seg s4" id="kr-freq">${FREK_KREDI.map((n) => `<label><input type="radio" name="freq" value="${n}" ${n === 6 ? "checked" : ""}><span>${n}×</span></label>`).join("")}</div>
    </fieldset>
    <fieldset class="field kr-klasik"><legend>${t("Jou peman yo")} * <small class="mut" id="jou-hint"></small></legend>
      <div class="jours j6" id="jours">${[1, 2, 3, 4, 5, 6].map((j) => `<label><input type="checkbox" name="jou" value="${j}"><span>${JOU_KOUT[j]}</span></label>`).join("")}</div>
    </fieldset>
    <p class="mut sm kr-konf" hidden>${t("Konfyans: kliyan an peye chak jou, lendi a samdi (san jou ferye), jiskaske li fini nan kantite jou yo.")}</p>
    ${GA ? `<div class="card kr-gar" id="kr-gar" aria-live="polite"></div>` : ""}
    <div class="recap" id="recap" aria-live="polite"></div>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${t("Kreye kredi a")}</button>
  </form>`;
  const f = document.getElementById("f");
  let kliyan = null;
  const konf = () => !!KF && f.querySelector("input[name=kalite]:checked")?.value === "konfyans";
  const kalite = () => (konf() ? "konfyans" : "klasik");
  // To enterè pa defo: 7% pa mwa pou kredi klasik, to Konfyans lan (10%) pou Konfyans. Si moun nan chanje l, nou pa touche l ankò.
  const TO_KLASIK = 7;
  f.taux.value = TO_KLASIK;
  f.taux.addEventListener("input", () => (f.taux.dataset.manuel = "1"));
  const rannMoun = () => {
    const v = document.getElementById("kr-q").value.trim().toLowerCase();
    const l = v ? moun.filter((c) => non(c).toLowerCase().includes(v) || String(c.code_client || "").toLowerCase().includes(v)).slice(0, 8) : [];
    document.getElementById("kr-moun").innerHTML = l.map((c) => `<button type="button" class="row" data-kr-moun="${h(c.id_personne)}"><b>${d(non(c))}</b> <span class="mut sm">${d(c.code_client || "")}</span></button>`).join("");
    document.querySelectorAll("[data-kr-moun]").forEach((b) => (b.onclick = () => chwaziMoun(b.dataset.krMoun)));
  };
  const chwaziMoun = (id) => {
    kliyan = M.clients.get(id);
    document.getElementById("kr-q").value = non(kliyan); document.getElementById("kr-moun").innerHTML = "";
    const ks = S.comptesDuClient(M, id).filter((k) => !k._pending);
    document.getElementById("kr-kont-f").hidden = false;
    document.getElementById("kr-kont").innerHTML = ks.map((k, i) => `<label class="chk"><input type="radio" name="kont" value="${h(k.id_compte_epargne)}" ${ks.length === 1 ? "checked" : ""}>
      <span><b>${d(k.no_compte || "")}</b>${kane(k)} · plan ${gd(k.montant_plan)} ${k._actif ? "" : `<span class="badge mut">${t("Fini")}</span>`}</span></label>`).join("") || `<p class="err-msg">${t("Kliyan sa a pa gen kont epay.")}</p>`;
    recap();
  };
  document.getElementById("kr-q").oninput = () => { kliyan = null; document.getElementById("kr-kont-f").hidden = true; rannMoun(); recap(); };
  // Kalandriye (kredi klasik): frekans + jou peman. Konfyans: lendi a samdi.
  let freq = 6, jours = [...JOU_DEFO_KREDI[6]];
  const boxes = [...f.querySelectorAll('input[name="jou"]')];
  const syncBoxes = () => {
    boxes.forEach((b) => (b.checked = jours.includes(Number(b.value))));
    const rest = freq - jours.length;
    document.getElementById("jou-hint").textContent = rest > 0 ? `(${t("chwazi")} ${rest} ${t("ankò")})` : `(${freq} ${t("jou")})`;
  };
  f.querySelectorAll('input[name="freq"]').forEach((r) => (r.onchange = () => { freq = Number(r.value); jours = [...JOU_DEFO_KREDI[freq]]; syncBoxes(); recap(); }));
  boxes.forEach((b) => (b.onchange = () => {
    const j = Number(b.value);
    if (b.checked) {
      if (jours.length >= freq) { if (freq === 1) jours = []; else { b.checked = false; toast(`${t("Ou deja chwazi")} ${freq} ${t("jou. Retire youn anvan.")}`, "err", 2500); return; } }
      jours.push(j);
    } else jours = jours.filter((x) => x !== j);
    syncBoxes(); recap();
  }));
  f.peman.addEventListener("input", () => (f.peman.dataset.manuel = "1"));
  const mete = () => {
    const k = konf();
    f.querySelectorAll(".kr-klasik").forEach((x) => (x.hidden = k));
    f.querySelectorAll(".kr-konf").forEach((x) => (x.hidden = !k));
    document.getElementById("kr-to-l").textContent = k ? `${t("To enterè")} (% ${t("sou montan an")})` : `${t("To enterè")} (% ${t("pa mwa")})`;
    f.peman.dataset.manuel = "";
    if (!f.taux.dataset.manuel) f.taux.value = k ? Number(KF?.to ?? 10) : TO_KLASIK;
    recap();
  };
  f.querySelectorAll("input[name=kalite]").forEach((r) => (r.onchange = mete));
  const val = () => ({ montan: Number(f.montan.value), duree: konf() ? 1 : Number(f.duree.value), taux: Number(f.taux.value), peman: Number(f.peman.value), debut: f.debut.value,
    dire: Number(f.dire_jou?.value) || 11, pous: GA ? Number(f.pousantaj.value) : 0 });
  const jsAk = () => (konf() ? [1, 2, 3, 4, 5, 6] : [...jours].sort());
  // Garanti: kont garanti kalite a pou kliyan an, balans valide a, ak sa ki nesesè a.
  const garEta = (v) => {
    if (!GA || !kliyan) return null;
    const g = (M.garanti || []).find((x) => x.id_personne === kliyan.id_personne && x.kalite === kalite());
    const bezwen = Math.round(v.montan * (v.pous || 0)) / 100;
    return { g, bezwen, ok: bezwen <= 0 || (!!g && g._balans >= bezwen) };
  };
  const krAktif = () => kliyan && (KF || GA) ? (M.kredi || []).find((x) => x.id_personne === kliyan.id_personne && (x.kalite || "klasik") === kalite() && !x._fini) : null;
  const recap = () => {
    const v = val();
    if (konf() && v.montan > 0 && !f.peman.dataset.manuel) f.peman.value = Math.ceil((v.montan * (1 + (v.taux || 0) / 100)) / v.dire);
    const v2 = val();
    const ok = v2.montan > 0 && v2.peman > 0 && f.taux.value !== "" && v2.debut && (konf() || jours.length === freq);
    const r = ok ? kalkKredi(v2.montan, v2.duree, v2.taux, v2.peman, v2.debut, M.feries, jsAk(), konf() ? v2.dire : 0) : null;
    document.getElementById("recap").innerHTML = `
      <div><span>${t("Kapital final")}</span><b>${r ? gd(r.final) : "—"}</b><small class="mut">${r ? (konf() ? `${gd(v2.montan)} × (1 + ${v2.taux}%)` : `${gd(v2.montan)} × (1 + ${v2.taux}% × ${v2.duree})`) : ""}</small></div>
      <div><span>${t("Kantite vèsman")}</span><b>${r ? r.n : "—"}</b><small class="mut">${r ? (konf() ? `${v2.dire} ${t("jou peman")}` : `${gd(r.final)} ÷ ${gd(v2.peman)}`) : ""}</small></div>
      <div><span>${t("Dat fen")}</span><b>${r?.fin ? datFr(r.fin) : "—"}</b><small class="mut">${lisJou(jsAk())} · ${t("san jou ferye")}</small></div>
      <div><span>${konf() ? t("Penalite") : t("Penalite pa jou peman")}</span><b>${konf() ? gd(KF?.penalite ?? 1000) : r ? gd(r.penalite) : "—"}</b><small class="mut">${konf() ? `${t("yon sèl fwa apre echeyans lan")}${KF?.penalite_aktif ? "" : ` (${t("poko aktif")})`}` : `20% ${t("montan pa vèsman an")}`}</small></div>`;
    const gb = document.getElementById("kr-gar");
    if (gb) {
      const e = garEta(v2), non_ = konf() ? "Fonds Garantie Konfyans" : "Epargne Bloquée", akt = krAktif();
      gb.innerHTML = !kliyan ? `<p class="mut sm">${t("Garanti")}: ${t("chwazi kliyan an")}.</p>`
        : `<div class="kr-gar-l"><b>${t("Garanti")} · ${non_}</b>${e.g ? ` <span class="mut sm">${d(e.g.no_compte)}</span>` : ""}</div>
        <div class="sm">${t("Nesesè")}: <b>${gd(e.bezwen)}</b> (${v2.pous || 0}%) · ${t("Balans valide")}: <b>${e.g ? gd(e.g._balans) : "—"}</b>
          ${e.ok ? `<span class="badge ok">${t("Garanti a ase ✓")}</span>` : `<span class="badge err">${e.g ? `${t("Manke")} ${gd(e.bezwen - e.g._balans)}` : t("Pa gen kont garanti")}</span>`}</div>
        ${!e.g ? `<p class="sm"><a class="lnk" href="#/kliyan/${h(kliyan.id_personne)}">${t("Ouvri kont garanti a sou fich kliyan an")} ›</a></p>` : ""}
        ${akt ? `<p class="sm err-t">${t("Kliyan an gen yon kredi")} ${konf() ? "Konfyans" : t("klasik")} ${t("aktif deja")} (${d(akt.no_compte || "")}).</p>` : ""}`;
    }
  };
  f.oninput = recap; syncBoxes(); mete();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"); const v = val();
    const kont = f.querySelector("input[name=kont]:checked")?.value;
    if (!kliyan) return (err.textContent = t("Chwazi kliyan an."));
    if (!kont) return (err.textContent = t("Chwazi kont epay ki lye ak kredi a."));
    if (!(v.montan > 0)) return (err.textContent = t("Mete montan kredi a."));
    if (f.taux.value === "" || !(v.taux >= 0 && v.taux <= 100) || !Number.isInteger(v.taux)) return (err.textContent = t("Mete to enterè a (0 a 100, san vigil)."));
    if (!(v.peman > 0)) return (err.textContent = t("Mete montan pa vèsman an."));
    if (!v.debut) return (err.textContent = t("Mete dat kòmansman an."));
    if (konf() && !(v.dire >= 1 && v.dire <= 60)) return (err.textContent = t("Dire Konfyans lan dwe ant 1 ak 60 jou."));
    if (!konf() && jours.length !== freq) return (err.textContent = `${t("Chwazi egzakteman")} ${freq} ${t("jou peman.")}`);
    const akt = krAktif();
    if (akt) return (err.textContent = `${t("Kliyan an gen yon kredi")} ${konf() ? "Konfyans" : t("klasik")} ${t("aktif deja")} (${akt.no_compte || ""}).`);
    if (GA) {
      if (!(v.pous >= 0 && v.pous <= 100)) return (err.textContent = t("Pousantaj garanti a dwe ant 0 ak 100."));
      const g = garEta(v);
      if (!g.ok) return (err.textContent = g.g ? `${t("Garanti a pa ase")}: ${gd(g.bezwen)} ${t("nesesè")}, ${gd(g.g._balans)} ${t("valide")}.` : t("Kliyan an pa gen kont garanti pou kalite kredi sa a."));
    }
    const js = jsAk();
    const r = kalkKredi(v.montan, v.duree, v.taux, v.peman, v.debut, M.feries, js, konf() ? v.dire : 0);
    if (v.peman > r.final) return (err.textContent = t("Montan pa vèsman an pa ka pi gwo pase kapital final la."));
    if (!navigator.onLine) return (err.textContent = t("Fòk ou gen entènèt pou kreye yon kredi."));
    const k = M.comptes.get(kont), ge = garEta(v);
    if (!(await ui.ask({ titre: konf() ? "Kreye kredi Konfyans sa a?" : "Kreye kredi sa a?", ok: "Kreye kredi a", foto: kliyan.photo_url, detay: [
      ["Kliyan", non(kliyan)], ...(KF ? [["Kalite kredi", konf() ? "Konfyans" : t("Kredi klasik")]] : []), ["Kont epay", k?.no_kane || k?.no_compte || ""], ["Montan prete", gd(v.montan)],
      ["Dire", konf() ? `${v.dire} ${t("jou peman")}` : `${v.duree} ${t("mwa")}`], ["To enterè", konf() ? `${v.taux}%` : `${v.taux}% ${t("pa mwa")}`],
      ["Kapital final", gd(r.final)], ["Montan pa vèsman", gd(v.peman)], ["Kalandriye peman", `${js.length}× · ${lisJou(js)}`], ["Kantite vèsman", String(r.n)],
      ["Dat kòmansman", datFr(v.debut)], ["Dat fen", datFr(r.fin)], ...(GA ? [["Garanti", `${gd(ge.bezwen)} (${v.pous}%) · ${ge.g?.no_compte || ""}`]] : []),
      ...(konf() ? [] : [["Penalite pa jou", gd(r.penalite)]])] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    try {
      const res = await api.rpc("grandon_kredi_kreye", { p_id: S.uuid(), p_compte: kont, p_montant: v.montan, p_duree: v.duree, p_taux: v.taux, p_paiement: v.peman,
        p_date_debut: v.debut, p_tip: konf() ? "Konfyans" : f.tip.value || null, p_jours: js, ...(GA ? { p_pousantaj: v.pous } : {}), ...(konf() ? { p_dire_jou: v.dire } : {}) });
      await S.pull();
      toast(`${t("Kredi a kreye")} · ${res.no_compte} ✓`, "ok", 5000);
      go(`#/kredi/${res.id}`);
    } catch (e2) { b.disabled = false; err.textContent = t(e2.message); }
  };
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
const FREKANS = [1, 2, 3, 6, 7];
const JOU_DEFO = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };
async function viewCycleNew(idPersonne, kontId = null) {
  const M = await S.model();
  const kMod = kontId ? M.comptes.get(kontId) : null; // mòd «modifye cycle» (manadjè / admin)
  if (kontId && !kMod) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Cycle la pa jwenn.</p>`; return; }
  if (kMod) idPersonne = kMod.id_personne;
  const c = M.clients.get(idPersonne);
  if (!c) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Kliyan an pa jwenn.</p>`; return; }
  const plans = M.plans.length ? M.plans : [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 7500, 8000, 9000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000, 75000, 100000];
  const dènye = kMod || S.comptesDuClient(M, idPersonne)[0];
  let freq = FREKANS.includes(dènye?.frequence_semaine) ? dènye.frequence_semaine : 2;
  let jours = dènye?.jours_paiement?.length === freq ? [...dènye.jours_paiement] : [...JOU_DEFO[freq]];
  const planDef = plans.includes(Number(dènye?.montant_plan)) ? Number(dènye.montant_plan) : plans[0];
  const planPaLis = kMod && Number(kMod.montant_plan) && !plans.includes(Number(kMod.montant_plan));
  // Règ sèvis la (Epargne): kanè ak yon kantite vèsman fiks, plan Lib, kont Regilye / VIP.
  const cfg = kMod ? null : await db.meta("sevis_cfg");
  const kane = cfg?.vesman || null;
  const finDe = (debut, duree) => (kane ? S.finVesman(debut, [...jours].sort(), kane, M.feries) : S.ajouteMwa(debut, duree));
  // Kliyan an gen yon kont aktif san kalandriye (ansyen kont): se sou kont sa a pou mete kalandriye a, pa sou yon 2yèm kont vid.
  const sanKal = kMod ? [] : [...M.comptes.values()].filter((k) => k.id_personne === idPersonne && k._actif && !k.frequence_semaine && !k._pending);
  const dureeDef = kMod ? (Number(kMod.duree_mois) >= 1 && Number(kMod.duree_mois) <= 12 ? Number(kMod.duree_mois) : 4) : (dènye?.duree_mois || 4);
  $app.innerHTML = `
  <a href="${kMod ? `#/cycle/${h(kontId)}` : `#/kliyan/${idPersonne}`}" class="back">‹ ${kMod ? d(kMod.no_compte || t("Cycle")) : d(non(c))}</a>
  <h1>${kMod ? (estManager() ? "Modifye cycle a" : t("Mande modifikasyon cycle a")) : "Nouvo cycle Grandon"}</h1>
  ${kMod && !estManager() ? `<p class="note info-note">${t("Demann lan ale bay manadjè a. Chanjman an ap aplike lè l apwouve l.")}</p>` : ""}
  <p class="mut">${d(non(c))} · ${kMod ? d(kMod.no_compte || "") : h(c.telephone || "")}</p>
  ${kMod ? `<p class="note info-note">${t("Sa chanje kalandriye peman an, vèsman prevwa yo ak reta yo. Tranzaksyon yo ak balans lan pa chanje.")}</p>` : ""}
  ${sanKal.length ? `<div class="note warn doub-kal"><p><b>${t("Kliyan sa a gen yon kont deja")}</b> (${sanKal.map((k) => `<a href="#/cycle/${h(k.id_compte_epargne)}">${d(k.no_compte || "")}</a>`).join(", ")}) ${t("ki pa gen jou peman. Kòb li ak depo li yo sou kont sa a.")}
    ${estManager() ? t("Pa kreye yon 2yèm kont: mete kalandriye a sou kont lan.") : t("Pa kreye yon 2yèm kont: mande manadjè a mete kalandriye a sou kont lan.")}</p>
    ${estManager() ? `<a class="btn sm pri" href="#/cycle/${h(sanKal[0].id_compte_epargne)}/modifye">${t("Mete kalandriye sou")} ${d(sanKal[0].no_compte || "")}</a>` : ""}</div>` : ""}
  ${planPaLis ? `<p class="note warn">${t("Plan aktyèl la")} (${gd(kMod.montant_plan)}) ${t("pa nan lis plan Grandon yo: chwazi youn.")}</p>` : ""}
  <form id="f" class="card form" novalidate>
    ${kane ? `<div class="field kane-f"><b class="lbl">${t("Kanè")}</b><p><b>${kane} ${t("vèsman")}</b> <small class="mut">(${t("dat fen an kalkile dapre jou peman yo; jou ferye pa konte")})</small></p><input type="hidden" name="duree" value="4"></div>` : `    <fieldset class="field"><legend>Dire * <small class="mut">(kantite mwa)</small></legend>
      ${kMod ? `<select name="duree" aria-label="${t("Dire")}">${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `<option value="${m}" ${m === dureeDef ? "selected" : ""}>${m} ${t("mwa")}</option>`).join("")}</select>`
        : `<select name="duree" aria-label="${t("Dire")}">${Array.from({ length: 11 }, (_, i) => i + 2).map((m) => `<option value="${m}" ${m === dureeDef ? "selected" : ""}>${m} ${t("mwa")}</option>`).join("")}</select>`}
    </fieldset>`}
    <fieldset class="field"><legend>Frekans * <small class="mut">(kantite fwa pa semèn)</small></legend>
      <div class="seg s5">${FREKANS.map((n) => `<label><input type="radio" name="freq" value="${n}" ${n === freq ? "checked" : ""}><span>${n}×</span></label>`).join("")}</div>
    </fieldset>
    <fieldset class="field"><legend>Jou peman yo * <small class="mut" id="jou-hint"></small></legend>
      <div class="jours" id="jours">${[1, 2, 3, 4, 5, 6, 7].map((j) => `<label><input type="checkbox" name="jou" value="${j}"><span>${JOU_KOUT[j]}</span></label>`).join("")}</div>
      <p class="mut sm" id="dim-not" hidden>${t("Kliyan sa a peye dimanch tou: pou li, dimanch pa jou konje.")}</p>
    </fieldset>
    <label>Plan * <small class="mut">(minimòm chak fwa li peye)</small>
      <select name="plan">${kMod ? "" : `<option value="" selected disabled>${t("Chwazi plan an…")}</option>`}${cfg?.plan_lib_min ? `<option value="lib">${t("Lib")} (${t("minimòm")} ${gd(cfg.plan_lib_min)} ${t("pa depo")})</option>` : ""}${plans.map((p) => `<option value="${p}" ${kMod && p === planDef ? "selected" : ""}>${gd(p)}</option>`).join("")}</select></label>
    ${cfg?.gen_vip ? `<fieldset class="field"><legend>${t("Kalite kont")} *</legend><div class="seg s2">
      <label><input type="radio" name="tip" value="regilye" checked><span>${t("Regilye")}</span></label>
      <label><input type="radio" name="tip" value="vip"><span>VIP</span></label></div>
      <small class="mut">${t("Regilye: kliyan an ka retire nenpòt lè. VIP: pa gen retrè, sof ak otorizasyon yon manadjè.")}</small></fieldset>` : ""}
    <label>Dat kòmansman<input name="debut" type="date" value="${kMod ? h(kMod.date_debut || S.jodi()) : S.jodi()}" min="${kMod ? "2020-01-01" : S.ajouteJou(S.jodi(), -30)}" max="${S.ajouteJou(S.jodi(), 30)}"></label>
    ${kMod ? `<label>Rezon <small class="mut">(${estManager() ? t("opsyonèl") : t("obligatwa")})</small><input name="rezon" maxlength="200" autocomplete="off" placeholder="${h(t("Egz.: enfòmasyon cycle la te manke"))}"></label>` : ""}
    ${kMod ? "" : `<details class="siyati-opt" id="siyati-opt"><summary>${t("Ajoute yon moun ki gen dwa siyati")} <small class="mut">(${t("opsyonèl")})</small></summary>${siyatiChan()}</details>`}
    <div class="recap" id="recap" aria-live="polite"></div>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${kMod ? (estManager() ? "Anrejistre modifikasyon an" : t("Voye demann lan")) : "Kreye cycle a"}</button>
  </form>`;
  const f = document.getElementById("f");
  const boxes = [...f.querySelectorAll('input[name="jou"]')];
  const syncBoxes = () => {
    boxes.forEach((b) => (b.checked = jours.includes(Number(b.value))));
    const rest = freq - jours.length;
    document.getElementById("jou-hint").textContent = rest > 0 ? `(chwazi ${rest} ankò)` : `(${freq} jou)`;
    document.getElementById("dim-not").hidden = !jours.includes(7);
  };
  const recap = () => {
    document.getElementById("err").textContent = "";
    const duree = Number(f.duree.value), plan = (f.plan.value === "lib" ? Number(cfg.plan_lib_min) : Number(f.plan.value)), debut = f.debut.value;
    if (!debut) return;
    const fin = finDe(debut, duree);
    const n = S.joursPeman(debut, S.ajouteJou(fin, -1), jours, M.feries);
    const ok = jours.length === freq;
    document.getElementById("recap").innerHTML = `
      <div><span>Fen cycle a</span><b>${datFr(fin)}</b></div>
      <div><span>Jou peman</span><b>${ok ? lisJou([...jours].sort()) : "—"}</b></div>
      <div><span>Vèsman prevwa</span><b>${ok ? n : "—"}</b><small class="mut">${jours.includes(7) ? t("san jou ferye") : t("san dimanch ni jou ferye")}</small></div>
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
  const pranSiyati = kMod ? () => null : brancheSiyati(f);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const duree = Number(f.duree.value), plan = (f.plan.value === "lib" ? Number(cfg.plan_lib_min) : Number(f.plan.value)), debut = f.debut.value;
    if (!(duree >= (kMod ? 1 : 2) && duree <= 12)) return (err.textContent = t(kMod ? "Chwazi dire a (1 a 12 mwa)." : "Chwazi dire a (2 a 12 mwa)."));
    if (jours.length !== freq) return (err.textContent = `Chwazi egzakteman ${freq} jou peman.`);
    if (!plans.includes(plan)) return (err.textContent = "Chwazi plan an.");
    const js = [...jours].sort();
    if (kMod) {
      if (!debut || debut > S.ajouteJou(S.jodi(), 30)) return (err.textContent = t("Dat kòmansman an pa bon."));
      if (!navigator.onLine) return (err.textContent = t("Fòk ou gen entènèt pou modifye yon cycle."));
      const demann = !estManager();
      if (demann && f.rezon.value.trim().length < 3) { f.rezon.focus(); return (err.textContent = t("Ekri rezon demann lan.")); }
      const avan = [["Dire", kMod.duree_mois ? `${kMod.duree_mois} ${t("mwa")}` : "—"], ["Frekans", kMod.frequence_semaine ? `${kMod.frequence_semaine}×` : "—"],
        ["Jou peman", kMod.jours_paiement?.length ? lisJou(kMod.jours_paiement) : "—"], ["Plan", gd(kMod.montant_plan || 0)], ["Dat kòmansman", datFr(kMod.date_debut)]];
      const apre = [`${duree} ${t("mwa")}`, `${freq}×`, lisJou(js), gd(plan), datFr(debut)];
      if (!(await ui.ask({ titre: demann ? "Voye demann modifikasyon sa a?" : "Modifye cycle a?", ok: demann ? "Voye demann lan" : "Anrejistre", foto: c.photo_url,
        detay: avan.map(([l, a], i) => [l, a === apre[i] ? a : `${a} → ${apre[i]}`]).concat([["Fen cycle a", datFr(finDe(debut, duree))]]) }))) return;
      const b = f.querySelector("button[type=submit]"); b.disabled = true;
      if (demann) try {
        await api.rpc("grandon_cycle_demann", { p_id: S.uuid(), p_compte: kontId, p_duree: duree, p_frequence: freq, p_jours: js, p_montant: plan, p_date_debut: debut,
          p_rezon: f.rezon.value.trim(), p_kreye_le: new Date().toISOString() });
        await S.pull();
        toast(t("Demann lan voye bay manadjè a."), "ok", 5000);
        return go(`#/cycle/${kontId}`);
      } catch (e2) { b.disabled = false; return (err.textContent = t(e2.message)); }
      try {
        const r = await api.rpc("grandon_cycle_modifye", { p_compte: kontId, p_duree: duree, p_frequence: freq, p_jours: js, p_montant: plan, p_date_debut: debut, p_rezon: f.rezon.value.trim() || null });
        await S.pull();
        toast(t(r?.chanje === false ? "Pa gen anyen ki chanje." : "Cycle la modifye ✓"), r?.chanje === false ? "info" : "ok");
        return go(`#/cycle/${kontId}`);
      } catch (e2) { b.disabled = false; return (err.textContent = t(e2.message)); }
    }
    if (!debut || debut < S.ajouteJou(S.jodi(), -30) || debut > S.ajouteJou(S.jodi(), 30)) return (err.textContent = "Dat kòmansman an dwe ant 30 jou pase ak 30 jou devan.");
    const sy = pranSiyati();
    if (sy?.erè) { document.getElementById("siyati-opt").open = true; return (err.textContent = t(sy.erè)); }
    if (sanKal.length && !(await ui.ask({ titre: "Kreye yon 2yèm kont?", danje: true, ikon: "!", ok: "Kreye 2yèm kont lan",
      tekst: `${t("Kliyan sa a gen kont")} ${sanKal.map((k) => k.no_compte).join(", ")} ${t("deja. Nouvo kont lan ap kòmanse a 0 G: depo ansyen kont lan p ap parèt ladan l.")}` }))) return;
    if (!(await ui.ask({ titre: "Kreye cycle Grandon sa a?", ok: "Kreye cycle a", foto: c.photo_url, detay: [
      ["Kliyan", non(c)], ["Dire", `${duree} ${t("mwa")}`], ["Frekans", `${freq}× ${t("pa semèn")}`],
      ["Jou peman", js.map((j) => t(JOU[j])).join(", ")], ["Plan", `${gd(plan)}`], ["Fen cycle a", datFr(finDe(debut, duree))],
      ["Vèsman prevwa", String(S.joursPeman(debut, S.ajouteJou(finDe(debut, duree), -1), js, M.feries))],
      ["Total pou l sanble", gd(plan * S.joursPeman(debut, S.ajouteJou(finDe(debut, duree), -1), js, M.feries))]].concat(sy ? [["Moun ki gen dwa siyati", `${sy.non} · ${sy.piece} ${sy.nif}`]] : []) }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const id = S.uuid();
    const gps = await getGps(5000);
    const no_compte = S.noKont(c.code_client);
    await S.enqueue("cycle", {
      id, id_personne: idPersonne, duree: kane ? Math.min(36, Math.max(1, Math.ceil((new Date(finDe(debut, duree)) - new Date(debut)) / 864e5 / 30.44))) : duree,
      frequence: freq, jours: js, montant: plan, date_debut: debut,
      ...(cfg?.gen_vip || cfg?.plan_lib_min ? { tip_plan: f.tip?.value || "regilye", plan_lib: f.plan.value === "lib" } : {}),
      ...(kane ? { date_fin: finDe(debut, duree), nb_vesman: kane } : {}),
      gps, capture_le: new Date().toISOString(), appareil: S.appareil(), no_compte,
    }, c._pending ? [idPersonne] : []);
    if (sy) await voyeSiyati(id, sy, [id]);
    toast(`${t("Cycle la anrejistre.")}${no_compte ? ` · ${no_compte}` : ""}`, "ok", 5000);
    go(`#/cycle/${id}`);
  };
}

// Manadjè / admin: mete kont lan nan pòtfèy yon lòt ajan (depo yo pa chanje).
async function chanjeAjanPòtfèy(k, c) {
  if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou chanje ajan pòtfèy la.");
  const avan = nomAjan(k.created_by) || t("San ajan");
  const ekip = ((await db.meta("ekip")) || []).filter((a) => a.actif !== false && ["agent", "manager", "admin"].includes(a.role) && a.user_id !== k.created_by)
    .sort((a, b) => (a.role === "agent" ? 0 : 1) - (b.role === "agent" ? 0 : 1) || a.nom.localeCompare(b.nom, "fr"));
  if (!ekip.length) return ui.info("Pa gen lòt ajan.", "");
  const r = await ui.askChoice({ titre: "Chanje ajan pòtfèy", tekst: `${non(c)} · ${k.no_compte || ""} — ${t("Ajan kounye a")}: ${avan}`,
    options: ekip.map((a) => [a.user_id, `${a.nom}${a.role !== "agent" ? ` (${t(WOL[a.role] || a.role)})` : ""}`]), noteLabel: "Rezon (opsyonèl)", ok: "Kontinye" });
  if (!r?.valeur) return;
  const nouvo = ekip.find((a) => a.user_id === r.valeur);
  if (!(await ui.ask({ titre: "Chanje ajan pòtfèy la?", foto: c.photo_url, ok: "Chanje ajan",
    tekst: t("Kliyan an ap parèt nan pòtfèy nouvo ajan an (Tablo, Kont, Ekip). Depo ki deja fèt yo pa chanje."),
    detay: [["Kliyan", non(c)], ["Kont", k.no_compte || "—"], ["Ajan pòtfèy", `${avan} → ${nouvo.nom}`]] }))) return;
  try {
    const res = await api.rpc("grandon_kont_chanje_ajan", { p_compte: k.id_compte_epargne, p_agent: nouvo.user_id, p_rezon: r.note || null });
    await S.pull();
    toast(res?.chanje === false ? t("Pa gen anyen ki chanje.") : `${t("Pòtfèy")}: ${nouvo.nom} ✓`, res?.chanje === false ? "info" : "ok");
    viewCycle(k.id_compte_epargne);
  } catch (e) { toast(t(e.message), "err"); }
}

// ---------- Moun ki gen dwa siyati (yon sèl cycle) ----------
// Pa obligatwa. Non konplè, tip pyès, nimewo (NIF/CIN/Paspò), foto pyès la (oswa foto moun nan si l pa gen pyès).
// Ajan: demann → manadjè a valide. Manadjè / admin: aplike touswit.
function siyatiChan(pre = "sy") {
  return `<div class="siyati-f">
    <label>${t("Non konplè moun nan")} *<input name="${pre}_non" maxlength="120" autocomplete="off"></label>
    <div class="grid2">
      <label>${t("Pyès idantifikasyon")} *<select name="${pre}_piece"><option value="">${t("Chwazi…")}</option>${PIECES.map((x) => `<option value="${x}">${x}</option>`).join("")}</select></label>
      <label>${t("Nimewo pyès la")} *<input name="${pre}_nif" autocomplete="off"></label>
    </div>
    <p class="mut sm" id="${pre}-hint"></p>
    <div class="field"><b class="lbl">${t("Foto pyès la")} *</b> <small class="mut">${t("Si moun nan pa gen pyès la sou li, pran foto moun nan.")}</small>
      <div class="btns"><button type="button" class="btn" id="${pre}-kam">📷 ${t("Pran foto")}</button>
        <label class="btn foto-fichye">🖼 ${t("Chwazi yon foto")}<input type="file" accept="image/*" id="${pre}-fich"></label></div>
      <img class="siyati-prev" id="${pre}-prev" alt="${h(t("Foto pyès la"))}" hidden></div>
  </div>`;
}
// Konekte chan yo; retounen yon fonksyon ki bay done yo (oswa yon erè, oswa null si tout chan yo vid).
function brancheSiyati(f, pre = "sy") {
  let foto = null;
  const hint = () => (document.getElementById(`${pre}-hint`).textContent = t(verifierPiece(f[`${pre}_piece`].value, f[`${pre}_nif`].value) || ""));
  f[`${pre}_piece`].onchange = hint; f[`${pre}_nif`].oninput = hint;
  const mete = async (blob) => {
    try { foto = await compress(blob); } catch { return toast(t("Foto a pa ka li."), "err"); }
    const im = document.getElementById(`${pre}-prev`); if (im.src) URL.revokeObjectURL(im.src); im.src = URL.createObjectURL(foto); im.hidden = false;
  };
  document.getElementById(`${pre}-kam`).onclick = async () => {
    const r = await ui.kamera();
    if (r?.erè) { toast(r.erè, "err", 7000); document.getElementById(`${pre}-fich`).click(); return; }
    if (r) mete(r);
  };
  document.getElementById(`${pre}-fich`).onchange = (e) => { const x = e.target.files[0]; if (x) mete(x); };
  return () => {
    const non0 = f[`${pre}_non`].value.trim(), piece = f[`${pre}_piece`].value, nif = f[`${pre}_nif`].value.trim();
    if (!non0 && !piece && !nif && !foto) return null;
    if (non0.length < 3) return { erè: "Mete non konplè moun ki gen dwa siyati a." };
    if (!piece) return { erè: "Chwazi tip pyès idantifikasyon an." };
    if (!nif) return { erè: "Mete nimewo pyès idantifikasyon an." };
    const ep = verifierPiece(piece, nif); if (ep) return { erè: ep };
    if (!foto) return { erè: "Pran foto pyès la (oswa foto moun nan)." };
    return { non: non0, piece, nif, foto };
  };
}
async function voyeSiyati(compte, sy, deps = []) {
  const photo_id = S.uuid();
  await db.put("photos", { id: photo_id, blob: sy.foto });
  await S.enqueue("siyati", { id: S.uuid(), compte, non: sy.non, piece: sy.piece, nif: sy.nif, photo_id, capture_le: new Date().toISOString() }, deps);
}
// Seksyon sou fich cycle la.
function seksyonSiyati(M, k) {
  const pend = (M._siyatiPend || []).filter((x) => x.compte === k.id_compte_epargne).pop();
  const dm = [...M.modif.values()].find((x) => x.kind === "siyati" && x.ref_id === k.id_compte_epargne && x.statut === "an_atant");
  const bouton = !estKesye() && !k._pending ? `<a class="btn sm" href="#/cycle/${h(k.id_compte_epargne)}/siyati">${t(k.siyati_non ? "Chanje moun nan" : "Ajoute yon moun")}</a>` : "";
  return `<section class="card siyati-k" id="siyati"><div class="ekip-sek-h"><h2>${t("Moun ki gen dwa siyati")}</h2>${bouton}</div>
    ${k.siyati_non ? `<div class="siyati-m">${k.siyati_foto ? `<a href="${h(k.siyati_foto)}" target="_blank" rel="noopener"><img src="${h(k.siyati_foto)}" alt="${h(t("Foto pyès la"))}" loading="lazy"></a>` : ""}
      <div><b data-brut>${h(k.siyati_non)}</b><div class="mut sm">${h(k.siyati_piece || "")} · <span data-brut>${h(k.siyati_nif || "")}</span></div><div class="mut sm">${t("Pou cycle sa a sèlman.")}</div></div></div>`
      : `<p class="mut sm">${t("Pa gen moun ki gen dwa siyati sou cycle sa a.")}</p>`}
    ${pend ? `<p class="note info-note"><span class="badge pend">${t("Poko voye")}</span> ${d(pend.non)} · ${h(pend.piece)} ${d(pend.nif)}${pend._error ? ` · <span class="err-t">${d(t(pend._error))}</span>` : ""}</p>` : ""}
    ${dm ? `<p class="note warn">${t("Demann an atant manadjè a")}: <b data-brut>${h(dm.vale_apre?.non || "")}</b> · ${h(dm.vale_apre?.piece || "")} ${d(dm.vale_apre?.nif || "")}</p>` : ""}
  </section>`;
}
async function viewSiyati(kontId) {
  const M = await S.model();
  const k = M.comptes.get(kontId);
  if (!k || estKesye()) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">${t("Cycle la pa jwenn.")}</p>`; return; }
  const c = M.clients.get(k.id_personne) || {};
  const man = estManager();
  $app.innerHTML = `<a href="#/cycle/${h(kontId)}" class="back">‹ ${d(k.no_compte || t("Cycle"))}</a>
    <h1>${t("Moun ki gen dwa siyati")}</h1>
    <p class="mut">${d(non(c))} · ${d(k.no_compte || "")}${kane(k)}</p>
    <p class="note info-note">${t("Moun sa a ap gen dwa siyati sou cycle sa a sèlman, pa sou lòt cycle kliyan an.")} ${man ? "" : t("Demann lan ale bay manadjè a pou l valide l.")}</p>
    ${k.siyati_non ? `<p class="note warn">${t("Moun ki gen dwa siyati kounye a")}: <b data-brut>${h(k.siyati_non)}</b>. ${t("Nouvo moun nan ap ranplase l.")}</p>` : ""}
    <form id="f" class="card form" novalidate>${siyatiChan()}<p class="err-msg" id="err" role="alert"></p>
      <button class="btn pri" type="submit">${t(man ? "Anrejistre" : "Voye demann lan")}</button></form>`;
  const f = document.getElementById("f");
  const pran = brancheSiyati(f);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const sy = pran();
    if (!sy) return (err.textContent = t("Mete enfòmasyon moun nan."));
    if (sy.erè) return (err.textContent = t(sy.erè));
    if (!(await ui.ask({ titre: man ? "Anrejistre moun ki gen dwa siyati a?" : "Voye demann lan bay manadjè a?", foto: URL.createObjectURL(sy.foto), ok: man ? "Anrejistre" : "Voye demann lan",
      detay: [["Kliyan", non(c)], ["Cycle", k.no_compte || ""], ["Non", sy.non], ["Pyès", `${sy.piece} · ${sy.nif}`]] }))) return;
    await voyeSiyati(kontId, sy, k._pending ? [kontId] : []);
    toast(t(man ? "Moun ki gen dwa siyati a anrejistre." : "Demann lan voye bay manadjè a."), "ok", 5000);
    go(`#/cycle/${kontId}`);
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
  $app.innerHTML = `<div id="cycle"><p class="kkat-l">${badjKat("epay")} <b>${d(k.no_compte || "")}</b>${kane(k)}</p>${L().parts.cycleTop(ctx)}
  ${!k._pending && !estKesye() ? (() => { const dm = [...M.modif.values()].find((x) => x.kind === "cycle" && x.ref_id === k.id_compte_epargne && x.statut === "an_atant");
    return dm && !man ? `<p class="note info-note">${t("Demann modifikasyon cycle a ap tann manadjè a")} (${(dm.chan || []).map((c0) => t(etikètChan("cycle", c0))).join(", ")}).</p>`
      : `<a class="btn block cycle-mod" href="#/cycle/${h(k.id_compte_epargne)}/modifye">${ICO.modifye || ""}<span>${t(man ? "Modifye cycle a" : "Mande modifikasyon cycle a")}</span></a>`; })() : ""}
  ${gpsBouton(c)}
  ${freNot(k, freSevis(k, await db.meta("sevis_cfg")))}
  ${monnenKat(M, k)}
  ${k.tip_plan === "vip" || k.plan_lib ? `<p class="note info-note kont-tip">${k.tip_plan === "vip" ? `<b>VIP</b> · ${t("Retrè ak viman bezwen otorizasyon yon manadjè anvan responsab kès la.")}` : ""}${k.tip_plan === "vip" && k.plan_lib ? "<br>" : ""}${k.plan_lib ? `<b>${t("Plan Lib")}</b> · ${t("Kliyan an bay sa l vle, men pa mwens pase")} ${gd(k.montant_plan)}.` : ""}</p>` : ""}
  ${man && !k._pending ? `<div class="card potfey-k"><div class="grow"><span class="mut sm">${t("Ajan pòtfèy")}</span><b data-brut>${h(nomAjan(k.created_by) || t("San ajan"))}</b></div>
    <button type="button" class="btn sm" id="chanje-ajan">${t("Chanje ajan")}</button></div>` : ""}
  ${seksyonSiyati(M, k)}
  ${man && !k.frequence_semaine && !k._pending ? `<p class="note warn">${t("Cycle sa a pa gen frekans ni jou peman: kalandriye peman an vid. Peze «Modifye cycle a» pou mete yo.")}</p>` : ""}
  ${seksyonAlet([k], man)}
  ${k._demandes.length ? `<h2>Demann retrè ak viman</h2><div class="list">${k._demandes.map((x) => liDemande(M, x)).join("")}</div>` : ""}
  ${k._suivis.length ? `<h2>Fidbak</h2><div class="list">${k._suivis.map((x) => liSwivi(M, x, { kliyan: false })).join("")}</div>` : ""}
  <h2>Tranzaksyon</h2>
  ${(() => { const otos = k._txs.map((x) => otorizasyon(M, "tx", x.id_transaction_epargne)).filter(Boolean);
    return otos.length ? `<p class="note info-note">${t("Otorizasyon apwouve: peze sou tranzaksyon an pou modifye l")} (${otos.map((o) => o.chan.map((c) => t(etikètChan("tx", c))).join(", ")).join(" · ")}).</p>` : ""; })()}
  <p class="mut sm">${t("Peze sou yon tranzaksyon pou mande otorizasyon pou modifye oswa anile l.")}</p>
  <div class="list">${k._txs.map((x) => liTx(M, x, { kliyan: false, bouton: true })).join("") || `<p class="empty">Poko gen tranzaksyon.</p>`}</div></div>`;
  document.getElementById("papeye")?.addEventListener("click", () => paPeye(k, c));
  document.getElementById("chanje-ajan")?.addEventListener("click", () => chanjeAjanPòtfèy(k, c));
  brancheFre(M, await db.meta("sevis_cfg"));
  brancheGpsBouton(c);
  $app.querySelectorAll("[data-tx]").forEach((b) => (b.onclick = () => aksyonTx(M, b.dataset.tx)));
  brancherAlet(M);
  montreAlet(M, [k]);
  $app.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => decider(M, b.dataset.ok, true)));
  $app.querySelectorAll("[data-non]").forEach((b) => (b.onclick = () => decider(M, b.dataset.non, false)));
}

// ---------- Nouvo tranzaksyon: Depo, Frè, Retrè, Viman ----------
const TIP_TX = [["D", "Depo"], ["FL", "Frè"], ["R", "Retrè"], ["V", "Viman"]];
// ---------- Monnen ak Remiz ----------
// Monnen: kliyan an bay plis kòb pase sa l dwe, ajan an pa gen monnen sou li → ajan an kenbe kòb la (kach li ogmante).
// Remiz: ajan an remèt kliyan an monnen li (kach li diminye). Ni youn ni lòt pa touche balans kont lan ni kanè a.
function monnenKat(M, k) {
  if (!M.monnenDispo || k._pending || estKesye()) return "";
  const dwe = M.monnenDwe(k.id_compte_epargne);
  const id = h(k.id_compte_epargne);
  return `<div class="card monnen-k${dwe > 0 ? " warn" : ""}" data-monnen-dwe="${dwe}"><div class="grow"><span class="mut sm">${t("Monnen kliyan an")}</span>
    <b>${dwe > 0 ? `${gd(dwe)} ${t("pou remèt")}` : t("Okenn monnen pou remèt")}</b></div>
    <div class="monnen-b"><a class="btn sm" href="#/monnen/${id}/monnaie">${t("Kenbe monnen")}</a>${dwe > 0 ? `<a class="btn sm pri" href="#/monnen/${id}/remise">${t("Remèt monnen")}</a>` : ""}</div></div>`;
}
async function viewMonnen(compteId, tip) {
  const M = await S.model();
  const k = M.comptes.get(compteId), c = k && M.clients.get(k.id_personne);
  const back = `<a href="#/cycle/${h(compteId)}" class="back">‹ ${d(k?.no_compte || t("Cycle"))}</a>`;
  if (!k || !M.monnenDispo) { $app.innerHTML = `${back}<p class="empty">${t("Opsyon sa a poko disponib.")}</p>`; return; }
  const dwe = M.monnenDwe(compteId), rem = tip === "remise";
  if (rem && dwe <= 0) { $app.innerHTML = `${back}<h1>${t("Remèt monnen")}</h1><p class="empty">${t("Kliyan sa a pa gen monnen pou l resevwa.")}</p>`; return; }
  const istorik = M.monnen.filter((x) => x.id_compte_epargne === compteId).sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le))).slice(0, 10);
  $app.innerHTML = `${back}
  <h1>${t(rem ? "Remèt monnen" : "Kenbe monnen kliyan an")}</h1>
  <p class="mut">${badjKat("epay")} ${d(non(c))} · ${d(k.no_compte || "")}</p>
  <p class="note info-note">${t(rem ? "Ou remèt kliyan an monnen ou te kenbe pou li. Kòb la soti nan kach ou. Balans kont lan ak kanè a pa chanje."
    : "Kliyan an bay plis kòb pase sa l dwe, epi ou pa gen monnen sou ou. Ou kenbe kòb la: li antre nan kach ou, epi kliyan an gen monnen pou l resevwa. Balans kont lan ak kanè a pa chanje.")}</p>
  ${dwe > 0 ? `<p class="note warn">${t("Kliyan an dwe resevwa")} <b>${gd(dwe)}</b> ${t("monnen")}.</p>` : ""}
  <form id="f" class="card form" novalidate>
    <label>${t("Montan (goud)")} *<input name="montant" type="number" inputmode="decimal" min="1" step="any" required ${rem ? `max="${dwe}" value="${dwe}"` : ""}></label>
    <label>${t("Nòt (opsyonèl)")}<input name="note" maxlength="200"></label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">${t(rem ? "Remèt monnen an" : "Anrejistre monnen an")}</button>
  </form>
  ${istorik.length ? `<h2>${t("Istorik monnen")}</h2><div class="list">${istorik.map((x) => `<div class="row"><span class="grow"><b>${t(x.tip === "remise" ? "Remiz" : "Monnen")}</b> · ${datFr(S.jouLokal(new Date(x.capture_le)))} <span class="mut sm" data-brut>${h(nonAjan(x.agent_id))}</span>${x._pending ? ` <span class="badge warn">${t("poko voye")}</span>` : ""}${x.note ? `<br><span class="mut sm">${d(x.note)}</span>` : ""}</span><b class="${x.tip === "remise" ? "out" : "in"}">${x.tip === "remise" ? "−" : "+"}${gd(x.montant)}</b></div>`).join("")}</div>` : ""}`;
  const f = document.getElementById("f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"), m = Number(f.montant.value);
    if (!(m > 0)) return (err.textContent = t("Mete montan an."));
    if (rem && m > dwe) return (err.textContent = `${t("Kliyan an dwe resevwa sèlman")} ${gd(dwe)}.`);
    if (!(await ui.ask({ titre: rem ? "Remèt monnen?" : "Kenbe monnen?", ok: "Konfime", ikon: rem ? "−" : "+", foto: c?.photo_url,
      detay: [["Kliyan", non(c)], ["Kont", k.no_compte || ""], ["Montan (goud)", gd(m)],
        ["Kach ou", rem ? `− ${gd(m)}` : `+ ${gd(m)}`], ["Monnen pou remèt apre", gd(dwe + (rem ? -m : m))], ["Balans kont lan", t("pa chanje")]] }))) return;
    f.querySelector("button[type=submit]").disabled = true;
    await S.enqueue("monnen", { id: S.uuid(), compte: compteId, tip, montant: m, note: f.note.value.trim() || null, gps: await getGps(5000),
      capture_le: new Date().toISOString(), appareil: S.appareil() });
    toast(t(rem ? "Remiz monnen an anrejistre." : "Monnen an anrejistre."), "ok");
    go(`#/cycle/${compteId}`);
  };
}

async function viewTxNew(compteId) {
  const M = await S.model();
  const k = M.comptes.get(compteId);
  const c = k && M.clients.get(k.id_personne);
  if (!k) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Cycle la pa jwenn.</p>`; return; }
  const fsTx = freSevis(k, await db.meta("sevis_cfg"));
  const plan = Number(k.montant_plan || 0);
  const skB = M.kaneBlok("epay", compteId);
  if (skB) { $app.innerHTML = kaneBlokHtml(M, skB, `<a href="#/cycle/${k.id_compte_epargne}" class="back">‹ ${d(k.no_compte || t("Cycle"))}</a>`, `${t("Tranzaksyon")} · ${d(non(c))}`); brancheKaneBlok(skB); return; }
  const skOk = M.skDispo && mwenSe(k.created_by) && !k._pending;
  // Dènye balans kanè ki te deklare sou kont lan (pou kalkile sa kanè a dwe vin si kliyan an peye san kanè).
  const dKane = k._txs.filter((x) => x.validation_status !== "rejected" && x.solde_declare != null && x.solde_declare !== "").sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)))[0];
  const lòt = [...M.comptes.values()].filter((x) => x.id_compte_epargne !== compteId && x.no_compte)
    .sort((a, b) => non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne))));
  $app.innerHTML = `
  <a href="#/cycle/${k.id_compte_epargne}" class="back">‹ ${d(k.no_compte || t("Cycle"))}</a>
  <h1>Tranzaksyon</h1>
  <p class="mut">${badjKat("epay")} ${d(non(c))} · ${d(k.no_compte || t("cycle poko voye"))}${kane(k)} · plan ${gd(plan)}</p>
  ${gpsBouton(c)}
  ${monnenKat(M, k)}
  <form id="f" class="card form" novalidate>
    <fieldset class="field"><legend class="sr">Tip</legend><div class="seg s4">
      ${TIP_TX.map(([v, l], i) => `<label><input type="radio" name="type" value="${v}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
    <p class="note info-note" id="oto" hidden>Sa a bezwen otorizasyon responsab kès la. Peye kliyan an sèlman lè demann lan apwouve.<br><b>Se sèlman kòb responsab kès la deja valide ki ka retire: depo ki poko valide pa konte.</b></p>
    ${k.tip_plan === "vip" ? `<p class="note warn" id="oto-vip" hidden><b>${t("Kont VIP")}</b> · ${t("Yon manadjè dwe otorize retrè sa a anvan responsab kès la ka valide l.")}</p>` : ""}
    <label id="l-fre" hidden>Tip frè *<select name="type_frais"><option value="">Chwazi…</option>${TYPES_FRE.filter((x) => x !== "Frais service" || fsTx).map((x) => `<option value="${h(x)}">${h(t(x === "Frais service" && fsTx ? `Frais service (${fsTx.regim === "auto" ? "Frais Auto" : "Nouveau Frais"})` : FRE_LABEL[x] || x))}</option>`).join("")}</select></label>
    ${fsTx && !fsTx.deja && fsTx.regim === "auto" ? `<div class="note warn" id="fre-retre" hidden><p><b>${t("Frais Auto")}</b> · ${t("Frais sèvis la poko pran sou kont sa a")} (${gd(fsTx.montan)}). ${t("Pran l anvan retrè a.")}</p><button type="button" class="btn sm pri" id="fre-mete">${t("Pran frais sèvis la")} · ${gd(fsTx.montan)}</button></div>` : ""}
    <label id="l-dest" hidden>Kont ki resevwa viman an *<select name="dest"><option value="">Chwazi…</option>${lòt.map((x) => `<option value="${x.id_compte_epargne}">${h(non(M.clients.get(x.id_personne)))} · ${h(x.no_compte)}</option>`).join("")}</select></label>
    <label>Montan (goud) *<input name="montant" type="number" inputmode="decimal" min="1" step="any" required value="${plan || ""}"></label>
    <p class="mut sm" id="hint"></p>
    ${skOk ? kaneChk() : ""}
    <div class="grid2" id="kane-chan">
      <label>Balans kanè a avan *<input name="solde_avant" type="number" inputmode="decimal" min="0" step="any" required${dKane ? ` placeholder="${t("dènye kanè")}: ${Number(dKane.solde_declare)}"` : ""}></label>
      <label>Balans kanè a apre *<input name="solde" type="number" inputmode="decimal" min="0" step="any" required></label>
    </div>
    <div class="kane-kw" id="kane-kw" aria-live="polite" hidden></div>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit" id="go">Anrejistre</button>
  </form>`;
  brancheGpsBouton(c);
  const woutTx = location.hash;
  const metFre = () => { // prelevman frais sèvis: tip «Frè», «Frais service», montan fiks
    f.querySelector('input[name="type"][value="FL"]').checked = true; maj();
    f.type_frais.value = "Frais service"; f.montant.value = fsTx.montan; f.montant.readOnly = true; f.montant.dispatchEvent(new Event("input"));
  };
  montreAlet(M, [k]).then(() => location.hash === woutTx && proposeGps(c));
  const f = document.getElementById("f");
  const maj = () => {
    const tp = f.type.value;
    document.getElementById("oto").hidden = !(tp === "R" || tp === "V");
    if (document.getElementById("oto-vip")) document.getElementById("oto-vip").hidden = !(tp === "R" || tp === "V");
    document.getElementById("l-fre").hidden = tp !== "FL";
    if (document.getElementById("fre-retre")) document.getElementById("fre-retre").hidden = tp !== "R";
    if (tp !== "FL") f.montant.readOnly = false;
    document.getElementById("l-dest").hidden = tp !== "V";
    const skL0 = document.getElementById("l-san-kane"); if (skL0) { skL0.hidden = !(tp === "D" || tp === "FL"); if (skL0.hidden) f.san_kane.checked = false; }
    document.getElementById("kane-chan").hidden = !!f.san_kane?.checked;
    document.getElementById("go").textContent = t(tp === "R" || tp === "V" ? "Voye demann lan" : "Anrejistre");
    document.getElementById("hint").textContent = tp === "D" ? `${t("Minimòm plan an")}: ${gd(plan)}${k._jodi ? ` · ${t("deja peye jodi a")}: ${gd(k._jodi)}` : ""}${S.isoJou(S.jodi()) === 6 && k.jours_paiement?.includes(7) ? ` · ${t("Pòtay la fèmen dimanch: kliyan an ka peye pou dimanch lan jodi a")} (${gd(plan * 2)} ${t("an tout")})` : ""}`
      : tp === "FL" ? (f.type_frais.value === "Frais carnet" ? t("Kliyan an peye kach pou yon nouvo kanè (li pèdi pa l la). Kòb la antre nan kach ou; li pa soti sou kont lan, balans kanè a pa chanje.") : t("Frè a soti sou kont kliyan an. Li pa afekte kach ou.")) : tp === "V" ? t("Kòb la ap soti sou kont sa a pou l antre sou lòt kont lan.") : "";
  };
  f.querySelectorAll('input[name="type"]').forEach((r) => (r.onchange = () => { f.montant.value = r.value === "D" ? plan || "" : ""; maj(); }));
  maj();
  f.type_frais.onchange = () => { if (f.type_frais.value === "Frais service" && fsTx) { f.montant.value = fsTx.montan; f.montant.readOnly = true; } else f.montant.readOnly = false; maj(); f.solde.dataset.manuel = ""; autoApre(); };
  document.getElementById("fre-mete")?.addEventListener("click", metFre);
  if (fePrefill?.compte === k.id_compte_epargne && fsTx) { metFre(); fePrefill = null; }
  // Si balans avan an ak montan an la, kalkile balans apre a.
  const autoApre = () => {
    const av = f.solde_avant.value, m = Number(f.montant.value);
    if (av === "" || !(m > 0) || f.solde.dataset.manuel) return;
    f.solde.value = Number(av) + (f.type.value === "D" ? m : f.type.value === "FL" && f.type_frais.value === "Frais carnet" ? 0 : -m);
  };
  f.solde_avant.oninput = autoApre; f.montant.addEventListener("input", autoApre);
  // Kontwòl kanè pandan ajan an ap tape: (1) kalkil avan ± montan = apre, (2) balans avan an konpare ak sistèm nan.
  // Ajan yo pa wè balans sistèm nan: sèvè a reponn sèlman «ok» oswa «diferan». San entènèt: konpare ak dènye kanè a.
  const kw = { avan: null, rez: null, pwomes: null }, kwEl = document.getElementById("kane-kw");
  const deltaKane = () => { const m = Number(f.montant.value), tp = f.type.value; return tp === "D" ? m : tp === "FL" && f.type_frais.value === "Frais carnet" ? 0 : -m; };
  const kontwolSis = (av) => { // 'ok' | 'diferan' | null (pa konnen)
    if (k._solde != null) return Promise.resolve(Math.abs(Number(k._solde) - av) < 0.01 ? "ok" : "diferan");
    if (k._pending || !navigator.onLine) return Promise.resolve(null);
    return Promise.race([api.rpc("grandon_kontwol_kane", { p_compte: k.id_compte_epargne, p_avan: av - (k._local || 0) }).catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 4000))]).then((r) => (r === "ok" || r === "diferan" ? r : null));
  };
  const kalkKw = (av) => { if (kw.avan !== av) { kw.avan = av; kw.rez = null; kw.pwomes = kontwolSis(av).then((r) => { if (kw.avan === av) kw.rez = r; return r; }); } return kw.pwomes; };
  const montreKw = async () => {
    const avS = f.solde_avant.value.trim(), apS = f.solde.value.trim(), m = Number(f.montant.value), l = [];
    if (f.san_kane?.checked || avS === "") { kwEl.hidden = true; return; }
    const av = Number(avS);
    if (apS !== "" && m > 0 && Math.abs(av + deltaKane() - Number(apS)) > 0.01)
      l.push(`<p class="kw-err">⚠ ${t("Kalkil kanè a pa bon")}: ${gd(av)} ${deltaKane() >= 0 ? "+" : "−"} ${gd(Math.abs(deltaKane()))} = <b>${gd(av + deltaKane())}</b>, ${t("men ou mete")} ${gd(Number(apS))}.</p>`);
    const r = await kalkKw(av);
    if (f.solde_avant.value.trim() !== avS) return;
    if (r === "diferan") l.push(`<p class="kw-err">⚠ ${t("Balans kanè avan an pa koresponn ak sa ki nan sistèm nan. Verifye kanè kliyan an anvan w anrejistre.")}</p>`);
    else if (r === "ok") l.push(`<p class="kw-ok">✓ ${t("Balans kanè avan an koresponn ak sistèm nan.")}</p>`);
    else if (dKane && Math.abs(av - Number(dKane.solde_declare)) > 0.01) l.push(`<p class="kw-err">⚠ ${t("Balans kanè avan an pa koresponn ak dènye kanè a")} (${gd(Number(dKane.solde_declare))}).</p>`);
    kwEl.innerHTML = l.join(""); kwEl.hidden = !l.length;
  };
  let kwT = 0; const kwPita = () => { clearTimeout(kwT); kwT = setTimeout(montreKw, 450); };
  [f.solde_avant, f.solde, f.montant].forEach((i) => i.addEventListener("input", kwPita));
  f.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener("change", kwPita));
  f.type_frais.addEventListener("change", kwPita);
  f.solde.oninput = () => (f.solde.dataset.manuel = "1");
  [f.solde_avant, f.solde].forEach((i) => i.addEventListener("input", () => { i.removeAttribute("aria-invalid"); f.solde.removeAttribute("aria-invalid"); }));
  if (f.san_kane) f.san_kane.onchange = maj;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const typ = f.type.value, m = Number(f.montant.value);
    if (!(m > 0)) return (err.textContent = t("Mete montan an."));
    if (typ === "D" && k.plan_lib && m < Number(k.montant_plan || 0)) return (err.textContent = `${t("Plan Lib: depo a dwe omwen")} ${gd(k.montant_plan)}.`);
    if (typ === "FL" && !f.type_frais.value) return (err.textContent = t("Chwazi tip frè a."));
    if (typ === "FL" && f.type_frais.value === "Frais service") {
      if (!fsTx) return (err.textContent = t("Frais sèvis pa aplike pou kont sa a."));
      if (fsTx.deja) return (err.textContent = t("Frais sèvis la deja pran sou kont sa a."));
      if (m !== fsTx.montan) return (err.textContent = `${t("Frais sèvis la se")} ${gd(fsTx.montan)}.`);
    }
    if (typ === "V" && !f.dest.value) return (err.textContent = t("Chwazi kont ki resevwa viman an."));
    // Balans kanè yo obligatwa (sof «san kanè»): tranzaksyon an pa ka konfime san yo.
    const sanKane = !!f.san_kane?.checked && (typ === "D" || typ === "FL");
    if (!sanKane) for (const [chan, mesaj] of [["solde_avant", "Mete balans kanè a avan."], ["solde", "Mete balans kanè a apre."]]) {
      const v = f[chan].value.trim();
      f[chan].removeAttribute("aria-invalid");
      if (v === "" || !(Number(v) >= 0)) { f[chan].setAttribute("aria-invalid", "true"); f[chan].focus(); return (err.textContent = t(mesaj)); }
    }
    // Balans avan an dwe swiv dènye balans kanè ki te deklare sou kont lan. Sa kenbe erè kote ajan an chanje plas
    // montan an ak balans avan an (kalkil avan + montan = apre a toujou bon nan ka sa a).
    if (!sanKane) {
      const av0 = Number(f.solde_avant.value), ap0 = Number(f.solde.value), at0 = av0 + deltaKane();
      if (Math.abs(at0 - ap0) > 0.01 && !(await ui.ask({ titre: "Kalkil kanè a pa bon", ikon: "!", ok: "Kontinye kanmenm", anile: "Korije",
        tekst: t("Balans apre a dwe egal balans avan an plis/mwens montan an."),
        detay: [["Balans kanè a avan", gd(av0)], ["Montan (goud)", gd(m)], ["Balans apre a dwe vin", gd(at0)], ["Balans apre ou mete", gd(ap0)]] }))) { f.solde.setAttribute("aria-invalid", "true"); f.solde.focus(); return; }
    }
    const rSis = sanKane ? null : await kalkKw(Number(f.solde_avant.value));
    if (rSis === "diferan" && !(await ui.ask({ titre: "Balans kanè avan an pa koresponn ak sistèm nan", ikon: "!", ok: "Kontinye kanmenm", anile: "Korije",
      tekst: t("Verifye kanè kliyan an ak montan an. Si kanè a bon, kontinye: manadjè a ap wè diferans lan."),
      detay: [["Balans avan ou mete", gd(Number(f.solde_avant.value))], ["Montan (goud)", gd(m)]] }))) { f.solde_avant.setAttribute("aria-invalid", "true"); f.solde_avant.focus(); return; }
    if (!sanKane && dKane && rSis == null) {
      const dBal = Number(dKane.solde_declare), avS = Number(f.solde_avant.value);
      if (Math.abs(avS - dBal) > 0.01 && !(await ui.ask({ titre: "Balans kanè avan an pa koresponn ak dènye kanè a", ikon: "!", ok: "Kontinye kanmenm", anile: "Korije",
        tekst: Math.abs(m - dBal) < 0.01 ? t("Verifye ou pa chanje plas montan an ak balans kanè avan an.") : t("Verifye kanè kliyan an ak montan an."),
        detay: [["Dènye balans kanè", gd(dBal)], ["Balans avan ou mete", gd(avS)], ["Montan (goud)", gd(m)]] }))) { f.solde_avant.setAttribute("aria-invalid", "true"); f.solde_avant.focus(); return; }
    }
    if (typ === "D" && plan && m < plan && !(await ui.ask({ titre: "Montan an pi piti pase plan an", ikon: "!", ok: "Kontinye",
      detay: [["Montan (goud)", gd(m)], ["Minimòm plan an", gd(plan)]] }))) return;
    // San kanè: app la ranpli balans avan/apre otomatikman (dènye balans kanè deklare, sinon balans sistèm lan),
    // pou tranzaksyon an pa parèt ak balans vid.
    const kSis = k._solde != null ? Number(k._solde) : k.solde_actuel != null ? Number(k.solde_actuel) : null;
    const kaneFre = typ === "FL" && f.type_frais.value === "Frais carnet"; // nouvo kanè: balans lan pa chanje
    const kBaz = dKane ? Number(dKane.solde_declare) : kSis, kAtann = kBaz != null ? kBaz + (typ === "D" ? m : kaneFre ? 0 : -m) : null;
    const av = sanKane ? kBaz : Number(f.solde_avant.value), ap = sanKane ? kAtann : Number(f.solde.value);
    const kd = typ === "V" ? M.comptes.get(f.dest.value) : null;
    const lib = Object.fromEntries(TIP_TX)[typ];
    if (!(await ui.ask({ titre: typ === "R" || typ === "V" ? `${t("Demann")} · ${t(lib)}` : lib, ok: typ === "R" || typ === "V" ? "Voye demann lan" : "Konfime",
      foto: c?.photo_url, ikon: typ === "D" ? "+" : "−", detay: [["Kliyan", non(c)], ["Kategori kont", t(KAT_KONT.epay)], ["Kont", k.no_compte || t("cycle poko voye")], ["Montan (goud)", gd(m)],
        ...(typ === "FL" ? [["Tip frè", t(FRE_LABEL[f.type_frais.value] || f.type_frais.value)]] : []),
        ...(kd ? [["Kont ki resevwa", `${non(M.clients.get(kd.id_personne))} · ${kd.no_compte}`]] : []),
        ...(sanKane ? [["Kanè", `📒 ${t("San kanè")} · ${t("kont lan ap bloke")}`], ["Balans kanè a avan (oto)", av != null ? gd(av) : "—"], ["Balans kanè a dwe vin (oto)", ap != null ? gd(ap) : "—"]] : [["Balans kanè a avan", gd(av)], ["Balans kanè a apre", gd(ap)]])] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const txId = S.uuid();
    if (sanKane) await S.enqueue("san_kane", { id: `sk-${txId}`, tx: txId, kind: "epay", ref: k.id_compte_epargne, tip: typ, montant: m, kane_apre: ap, kreye_le: new Date().toISOString() });
    const base = { id: txId, compte: k.id_compte_epargne, montant: m, solde_avant_declare: av, solde_declare: ap,
      note: null, gps: await getGps(5000), capture_le: new Date().toISOString() };
    const deps = [...(k._pending ? [k.id_compte_epargne] : []), ...(sanKane ? [`sk-${txId}`] : [])];
    if (typ === "R" || typ === "V") {
      await S.enqueue("demande", { ...base, type: typ, compte_dest: kd?.id_compte_epargne || null }, deps);
      toast(k.tip_plan === "vip" ? t("Demann lan voye: yon manadjè dwe otorize l anvan responsab kès la.") : t("Demann lan voye bay manadjè a."), "ok", 5000);
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
const KIND = { client: "Kliyan", adopte: "Kliyan (ajoute)", foto: "Foto kliyan", gps: "GPS kliyan", maj: "Enfòmasyon kliyan an", cycle: "Cycle", tx: "Tranzaksyon", demande: "Demann", suivi: "Fidbak", modif_demann: "Demann modifikasyon", modif_aplike: "Modifikasyon", alet: "Alèt", alet_fermen: "Alèt (fèmen)", kredi_peye: "Peman kredi", kredi_penalite: "Penalite kredi", kredi_suivi: "Fidbak kredi", garanti_tx: "Kont garanti", san_kane: "San kanè", kane_konfime: "Kanè ajou", monnen: "Monnen" };
function resume(o, M) {
  const p = o.payload;
  if (o.kind === "client") return `${p.prenom} ${p.nom} · ${p.telephone}`;
  if (o.kind === "adopte") return `${p.prenom} ${p.nom} · ${p.code_client || ""}`;
  if (o.kind === "maj") return non(M.clients.get(p.id));
  if (o.kind === "foto" || o.kind === "gps") return non(M.clients.get(p.id_personne));
  if (o.kind === "suivi") { const k = M.comptes.get(p.compte); return `${t(motifLabel(p.motif))} · ${non(k && M.clients.get(k.id_personne))}`; }
  if (o.kind === "demande") { const k = M.comptes.get(p.compte); return `${p.type === "V" ? t("Viman") : t("Retrè")} ${gd(p.montant)} · ${non(k && M.clients.get(k.id_personne))}`; }
  if (o.kind === "cycle") return `${non(M.clients.get(p.id_personne))} · ${p.duree} mwa · ${p.frequence}×/sem · ${gd(p.montant)}`;
  if (o.kind === "modif_demann" || o.kind === "modif_aplike") return `${ciblModif(M, p.kind, p.ref)} · ${(p.chan || []).map((k) => t(etikètChan(p.kind, k))).join(", ") || t("Siprime")}`;
  if (o.kind === "alet" || o.kind === "alet_fermen") return p.tit || "";
  if (o.kind === "san_kane") return `${gd(p.montant)} · ${t("san kanè")}`;
  if (o.kind === "monnen") return `${gd(p.montant)} · ${t(p.tip === "remise" ? "Remiz monnen" : "Monnen")}`;
  if (o.kind === "kane_konfime") return t("Kanè a ajou");
  if (o.kind === "garanti_tx") return `${p.tip === "D" ? t("Depo") : t("Retrè")} ${gd(p.montant)} · ${t("kont garanti")}`;
  if (o.kind === "kredi_suivi") return `${t(motifLabel(p.motif))} · ${t("kredi")}`;
  if (o.kind === "kredi_peye" || o.kind === "kredi_penalite") return `${gd(p.montant)} · ${t(o.kind === "kredi_peye" ? "kredi" : "penalite")}`;
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
    <div class="field notif-p"><b>${t("Notifikasyon telefòn")}</b>
      <p class="mut sm" id="notif-eta">${!("Notification" in window) ? t("Telefòn sa a pa kite aplikasyon an voye notifikasyon.") : Notification.permission === "granted" ? t("Aktive ✓ · Alèt yo sonnen, vibre epi parèt nan ba notifikasyon an.") : Notification.permission === "denied" ? t("Bloke: louvri paramèt navigatè a pou pèmèt notifikasyon pou sit sa a.") : t("Poko aktive.")}</p>
      <div class="btns">${"Notification" in window && Notification.permission === "default" ? `<button type="button" class="btn sm pri" id="notif-on">${t("Aktive notifikasyon")}</button>` : ""}
        <button type="button" class="btn sm" id="notif-tes">${t("Teste alèt la")}</button></div></div>
  </div>
  <h2>Senkronizasyon</h2>
  <a class="row senk-lyen" href="#/senk"><div class="grow"><b>${t("Senkronizasyon")}</b><div class="mut sm">${M.outbox.length ? `${M.outbox.length} ${t("poko voye")}` : t("Tout bagay voye ✓")} · ${t("Dènye senk")} ${lè(await db.meta("last_sync"))}</div></div><span aria-hidden="true">›</span></a>
  ${estManager() || moi.admin ? `<h2>Administrasyon</h2>` : ""}
  ${estManager() ? `<a class="btn block" href="#/alet">${t("Jesyon alèt yo")}</a>` : ""}
  ${estManager() ? `<a class="btn block" href="#/istorik">Istorik modifikasyon</a>` : ""}
  ${estManager() ? `<a class="btn block" href="#/aparey">Aparèy ajan yo</a>` : ""}
  ${estManager() ? `<a class="btn block" href="#/feries">Jou ferye</a>` : ""}
  ${moi.admin ? `<a class="btn block" href="#/ajan">Jere ajan yo</a>` : ""}
  ${estManager() ? `<a class="btn block" href="#/metrik">${t("Metrik Tablo ajan yo")}</a>` : ""}
  ${moi.admin ? `<a class="btn block" href="#/le">${t("Lè operasyon")}</a>` : ""}
  <button class="btn block danger" id="logout">Dekonekte</button>
  <p class="mut sm center">Grandon · vèsyon ${h(APP_VERSION)}</p>`;
  $app.querySelectorAll('input[name="lang"]').forEach((r) => (r.onchange = () => { setLang(r.value); location.reload(); }));
  $app.querySelectorAll('input[name="tem"], input[name="teks"]').forEach((r) => (r.onchange = () => {
    savePrefs({ tem: $app.querySelector('input[name="tem"]:checked').value, teks: $app.querySelector('input[name="teks"]:checked').value });
  }));
  $app.querySelectorAll('input[name="son"]').forEach((r) => (r.onchange = () => { savePrefs({ son: r.value === "1" }); if (r.value === "1") ui.son("info"); }));
  document.getElementById("notif-on")?.addEventListener("click", async () => { try { await Notification.requestPermission(); } catch { /* */ } viewParam(); });
  document.getElementById("notif-tes").onclick = async () => {
    if (prefs().son !== false) ui.son("ijan"); else try { navigator.vibrate?.(ui.VIBRE.ijan); } catch { /* */ }
    await ui.notifye({ titre: "Grandon · Tès alèt", tekst: t("Si w wè mesaj sa a, notifikasyon yo mache."), nivo: "ijan", tag: "grandon-tes", url: "#/param" });
  };
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

// ---------- Kès (responsab kès): validasyon depo, retrè / viman, modifikasyon tranzaksyon ----------
// Se responsab kès la sèlman ki deside sou sa ki touche kach li pral resevwa a.
const kesF = { ong: "depo", ajan: "", q: "" };
const kesChwa = new Set(); // depo ki chwazi pou validasyon an blòk
const sumMon = (l) => l.reduce((a, x) => a + Number(x.montant || 0), 0);
const nonAjan = (id) => ajans[id] || nomAjan(id) || t("Lòt ajan");
function depoAnAtant(M) {
  return [...M.txs.values()].filter((x) => x.type_transaction === "D" && !x.virement_from && x.validation_status === "pending" && !x._pending);
}
function kesFiltre(M, l, kle) {
  const v = kesF.q.trim().toLowerCase();
  return l.filter((x) => (!kesF.ajan || x[kle] === kesF.ajan) && (!v || (() => {
    const k = M.comptes.get(x.id_compte_epargne); const c = k && M.clients.get(k.id_personne);
    return non(c).toLowerCase().includes(v) || kontKoresponn(k, v);
  })()));
}
// Depo ki gen yon demann modifikasyon an atant (oswa apwouve men poko aplike): pa ka valide.
const modifBloke = (M, id) => [...M.modif.values()].find((m) => m.kind === "tx" && m.ref_id === id && (m.statut === "an_atant" || m.statut === "apwouve"));
function rowDepoKes(M, x) {
  const k = M.comptes.get(x.id_compte_epargne), c = k && M.clients.get(k.id_personne), j = S.jouTx(x), id = x.id_transaction_epargne;
  const kanè = [x.solde_avant_declare, x.solde_declare].map((v) => (v != null && v !== "" ? gd(v) : "—"));
  const dm = modifBloke(M, id);
  return `<div class="row kesr${kesChwa.has(id) ? " on" : ""}${dm ? " kes-bloke" : ""}" data-kesr="${h(id)}">
    <label class="kes-chk"><input type="checkbox" data-chk="${h(id)}" ${kesChwa.has(id) ? "checked" : ""} ${dm ? "disabled" : ""} aria-label="${h(t("Chwazi"))}: ${h(non(c))} ${h(gd(x.montant))}"></label>
    <span class="txr-le"><b class="mono">${lèKout(x.date_transaction) || "—"}</b><small>${j === M.today ? t("jodi a") : datKout(j)}</small></span>
    <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b></span>
      <span class="mut sm">${badjKat("epay")} ${d(k?.no_compte || "")} · plan ${gd(k?.montant_plan || 0)}</span>
      <span class="mut sm">${t("kanè avan")} ${kanè[0]} → ${t("kanè apre")} ${kanè[1]}</span>
      ${dm ? `<span class="kes-modif sm" data-modif-atant="${h(id)}">⚠ ${t(dm.statut === "apwouve" ? "Modifikasyon apwouve: ajan an poko korije l" : "Demann modifikasyon an atant")} (${(dm.chan || []).map((k0) => t(etikètChan("tx", k0))).join(", ")}) · ${t("trete l anvan ou valide")}</span>` : ""}</span>
    <span class="kes-mon"><b class="in">+${gd(x.montant)}</b>
      <span class="kes-bt"><button type="button" class="btn sm pri" data-dv="${h(id)}" ${dm ? "disabled" : ""}>Valide</button><button type="button" class="btn sm danger" data-dr="${h(id)}">Rejte</button></span></span>
  </div>`;
}
function kesDepoHtml(M, l) {
  if (!l.length) return `<p class="empty">${kesF.q || kesF.ajan ? t("Anyen pa koresponn.") : t("Pa gen depo an atant validasyon.")}</p>`;
  const gr = new Map();
  for (const x of [...l].sort((a, b) => String(a.date_transaction).localeCompare(String(b.date_transaction)))) {
    const a = x.created_by || ""; if (!gr.has(a)) gr.set(a, []); gr.get(a).push(x);
  }
  const tous = l.every((x) => kesChwa.has(x.id_transaction_epargne));
  return `<label class="kes-tout"><input type="checkbox" data-chkall ${tous ? "checked" : ""}> <span>${t("Chwazi tout")} (${l.length} · ${gd(sumMon(l))})</span></label>`
    + [...gr].sort((a, b) => nonAjan(a[0]).localeCompare(nonAjan(b[0]), "fr")).map(([a, xs]) => `<section class="txj kes-g" data-kesg="${h(a)}">
      <div class="txj-h"><label class="kes-gchk"><input type="checkbox" data-chkg="${h(a)}" ${xs.every((x) => kesChwa.has(x.id_transaction_epargne)) ? "checked" : ""} aria-label="${h(t("Chwazi tout depo"))} ${h(nonAjan(a))}">
        <h3 data-brut>${h(nonAjan(a))}</h3></label><span class="mut sm">${xs.length} ${t("depo")} · <b class="in">${gd(sumMon(xs))}</b></span></div>
      <div class="list tx-lis">${xs.map((x) => rowDepoKes(M, x)).join("")}</div></section>`).join("");
}
function kesIstorikHtml(M) {
  const de = S.ajouteJou(M.today, -6);
  const l = kesFiltre(M, [...M.txs.values()].filter((x) => x.validated_by === moi.id && x.validated_at && S.jouLokal(new Date(x.validated_at)) >= de), "created_by")
    .sort((a, b) => String(b.validated_at).localeCompare(String(a.validated_at)));
  const dm = [...M.demandes.values()].filter((x) => x.decide_par === moi.id && x.decide_le && S.jouLokal(new Date(x.decide_le)) >= de && (!kesF.ajan || x.agent_id === kesF.ajan));
  if (!l.length && !dm.length) return `<p class="empty">${t("Pa gen desizyon nan 7 dènye jou yo.")}</p>`;
  const ev = [...l.map((x) => ({ le: x.validated_at, x, tip: "tx" })), ...dm.map((x) => ({ le: x.decide_le, x, tip: "dm" }))].sort((a, b) => String(b.le).localeCompare(String(a.le)));
  const gr = new Map();
  for (const e of ev) { const j = S.jouLokal(new Date(e.le)); if (!gr.has(j)) gr.set(j, []); gr.get(j).push(e); }
  return [...gr].map(([j, es]) => {
    const ok = es.filter((e) => e.tip === "tx" && e.x.validation_status === "confirmed");
    return `<section class="txj"><div class="txj-h"><h3>${jouLabel(M, j)}</h3><span class="mut sm">${es.length} ${t("desizyon")}${ok.length ? ` · ${t("valide")} <b class="in">${gd(sumMon(ok.map((e) => e.x)))}</b>` : ""}</span></div>
    <div class="list tx-lis">${es.map(({ x, tip, le }) => {
      const k = M.comptes.get(x.id_compte_epargne), c = k && M.clients.get(k.id_personne);
      const okk = tip === "tx" ? x.validation_status === "confirmed" : x.statut === "approuvee";
      const sa = tip === "tx" ? `${t("Depo")} ${gd(x.montant)}` : `${x.type === "V" ? t("Viman") : t("Retrè")} ${gd(x.montant)}`;
      const motif = tip === "tx" ? x.validation_note : x.motif_refus;
      return `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(le)}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${sa}</b> · ${d(non(c))} <span class="badge ${okk ? "ok" : "err"}">${t(okk ? "Valide ✓" : "Rejte ✗")}</span></span>
          <span class="mut sm">${d(k?.no_compte || "")} · <span data-brut>${h(nonAjan(tip === "tx" ? x.created_by : x.agent_id))}</span></span>
          ${motif ? `<span class="sm err-t">${t("Rezon")}: ${d(motif)}</span>` : ""}</span></div>`; }).join("")}</div></section>`;
  }).join("");
}
async function viewKes() {
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  const depo = depoAnAtant(M);
  const dm = [...M.demandes.values()].filter((x) => x.statut === "en_attente" && !x._pending);
  const mo = [...M.modif.values()].filter((x) => x.kind === "tx" && x.statut === "an_atant");
  for (const id of [...kesChwa]) if (!depo.some((x) => x.id_transaction_epargne === id)) kesChwa.delete(id);
  const ajanIds = [...new Set([...Object.keys(ajans), ...depo.map((x) => x.created_by), ...dm.map((x) => x.agent_id), ...mo.map((x) => x.agent_id)].filter((x) => x && x !== moi.id))];
  const kont = (id) => depo.filter((x) => x.created_by === id).length + dm.filter((x) => x.agent_id === id).length + mo.filter((x) => x.agent_id === id).length;
  const dF = kesFiltre(M, depo, "created_by"), dmF = kesFiltre(M, dm, "agent_id"), moF = mo.filter((x) => !kesF.ajan || x.agent_id === kesF.ajan);
  const kre = kreDispo ? await kreDone(M) : [];
  const qv = kesF.q.trim().toLowerCase();
  const krF = kre.flatMap((k) => k._tx.filter((y) => y.validation_status === "pending" && !y._pending).map((y) => ({ y, k, montant: y.montant })))
    .filter(({ y, k }) => (!kesF.ajan || y.created_by === kesF.ajan) && (!qv || non(M.clients.get(k.id_personne)).toLowerCase().includes(qv) || kontKoresponn(k, qv)))
    .sort((a, b) => String(a.y.capture_le || a.y.date_transaction).localeCompare(String(b.y.capture_le || b.y.date_transaction)));
  const garF = (M.garanti || []).flatMap((g) => g._tx.filter((y) => y.statut === "pending" && !y._pending).map((y) => ({ y, g, montant: y.montant })))
    .filter(({ y, g }) => (!kesF.ajan || y.created_by === kesF.ajan) && (!qv || non(M.clients.get(g.id_personne)).toLowerCase().includes(qv) || String(g.no_compte).toLowerCase().includes(qv)))
    .sort((a, b) => String(a.y.capture_le).localeCompare(String(b.y.capture_le)));
  const ONG = [["depo", "Depo", dF.length], ...(kreDispo ? [["kredi", "Kredi", krF.length]] : []), ...(M.mod?.garanti ? [["garanti", "Garanti", garF.length]] : []), ["dm", "Retrè ak viman", dmF.length], ["modif", "Modifikasyon", moF.length], ["ist", "Istorik", null]];
  let kò = "";
  if ((kesF.ong === "kredi" && !kreDispo) || (kesF.ong === "garanti" && !M.mod?.garanti)) kesF.ong = "depo";
  if (kesF.ong === "depo") kò = kesDepoHtml(M, dF);
  else if (kesF.ong === "kredi") kò = kesKrediHtml(M, krF) + kesPenaliteHtml(M, kre);
  else if (kesF.ong === "garanti") kò = kesGarantiHtml(M, garF);
  else if (kesF.ong === "dm") kò = `<div class="list">${dmF.sort((a, b) => String(a.capture_le).localeCompare(String(b.capture_le))).map((x) => liDemande(M, x, { decide: true })).join("") || `<p class="empty">${t("Pa gen demann retrè oswa viman an atant.")}</p>`}</div>`;
  else if (kesF.ong === "modif") kò = `<p class="mut sm">${t("Ajan an mande pou modifye oswa anile yon tranzaksyon. Se ou sèlman ki ka bay otorizasyon an.")}</p><div class="list">${moF.map((x) => liModif(M, x, { decide: true })).join("") || `<p class="empty">${t("Pa gen demann modifikasyon tranzaksyon an atant.")}</p>`}</div>`;
  else kò = kesIstorikHtml(M);
  $app.innerHTML = `<div id="kes"><div class="page-head"><h1>Kès</h1></div>
    <div class="kes-sum">
      <div class="card kes-k"><span>${t("Depo pou resevwa")}</span><b class="in">${gd(sumMon(dF))}</b><small>${dF.length} ${t("depo an atant")}</small></div>
      <div class="card kes-k"><span>${t("Retrè ak viman")}</span><b>${dmF.length}</b><small>${gd(sumMon(dmF))} ${t("an atant")}</small></div>
      <div class="card kes-k"><span>${t("Modifikasyon")}</span><b>${moF.length}</b><small>${t("tranzaksyon an atant")}</small></div>
    </div>
    <div class="tx-tool kes-tool">
      <input id="kes-q" type="search" class="search" placeholder="Chèche kliyan oswa nimewo kont…" aria-label="Chèche" value="${h(kesF.q)}" autocomplete="off">
      <label class="tx-sel"><span>${t("Ajan")}</span><select id="kes-ajan"><option value="">${t("Tout ajan yo")}</option>${ajanIds.sort((a, b) => nonAjan(a).localeCompare(nonAjan(b), "fr")).map((id) => `<option value="${h(id)}" ${id === kesF.ajan ? "selected" : ""}>${h(nonAjan(id))}${kont(id) ? ` (${kont(id)})` : ""}</option>`).join("")}</select></label>
    </div>
    <div class="tabs" role="tablist" id="kes-ong">${ONG.map(([k, l, n]) => `<button type="button" role="tab" class="tab ${kesF.ong === k ? "on" : ""}" aria-selected="${kesF.ong === k}" data-kong="${k}">${t(l)}${n ? `<span class="cnt-b">${n}</span>` : ""}</button>`).join("")}</div>
    <div id="kes-ko">${kò}</div>
    ${kesF.ong === "depo" ? `<div class="kes-ba" id="kes-ba" ${kesChwa.size ? "" : "hidden"}><span id="kes-ba-t"></span><button type="button" class="btn danger" id="kes-rejte">Rejte</button><button type="button" class="btn pri" id="kes-valide">Valide</button></div>` : ""}
  </div>`;
  const mete = () => {
    const xs = dF.filter((x) => kesChwa.has(x.id_transaction_epargne));
    const ba = document.getElementById("kes-ba"); if (!ba) return;
    ba.hidden = !xs.length;
    document.getElementById("kes-ba-t").innerHTML = `<b>${xs.length}</b> ${t("chwazi")} · <b class="in">${gd(sumMon(xs))}</b>`;
    $app.querySelectorAll("[data-kesr]").forEach((r) => r.classList.toggle("on", kesChwa.has(r.dataset.kesr)));
    $app.querySelectorAll("[data-chkg]").forEach((c) => { const g = dF.filter((x) => (x.created_by || "") === c.dataset.chkg); c.checked = g.length && g.every((x) => kesChwa.has(x.id_transaction_epargne)); });
    const all = $app.querySelector("[data-chkall]"); if (all) all.checked = dF.length && dF.every((x) => kesChwa.has(x.id_transaction_epargne));
  };
  mete();
  $app.querySelectorAll("[data-chk]").forEach((c) => (c.onchange = () => { c.checked ? kesChwa.add(c.dataset.chk) : kesChwa.delete(c.dataset.chk); mete(); }));
  $app.querySelectorAll("[data-chkg]").forEach((c) => (c.onchange = () => {
    dF.filter((x) => (x.created_by || "") === c.dataset.chkg).forEach((x) => (c.checked ? kesChwa.add(x.id_transaction_epargne) : kesChwa.delete(x.id_transaction_epargne)));
    $app.querySelectorAll("[data-chk]").forEach((i) => (i.checked = kesChwa.has(i.dataset.chk))); mete();
  }));
  $app.querySelector("[data-chkall]")?.addEventListener("change", (e) => {
    dF.forEach((x) => (e.target.checked ? kesChwa.add(x.id_transaction_epargne) : kesChwa.delete(x.id_transaction_epargne)));
    $app.querySelectorAll("[data-chk]").forEach((i) => (i.checked = kesChwa.has(i.dataset.chk))); mete();
  });
  $app.querySelectorAll("[data-dv]").forEach((b) => (b.onclick = () => kesDeside(M, [b.dataset.dv], true)));
  $app.querySelectorAll("[data-dr]").forEach((b) => (b.onclick = () => kesDeside(M, [b.dataset.dr], false)));
  document.getElementById("kes-valide")?.addEventListener("click", () => kesDeside(M, dF.filter((x) => kesChwa.has(x.id_transaction_epargne)).map((x) => x.id_transaction_epargne), true));
  document.getElementById("kes-rejte")?.addEventListener("click", () => kesDeside(M, dF.filter((x) => kesChwa.has(x.id_transaction_epargne)).map((x) => x.id_transaction_epargne), false));
  $app.querySelectorAll("[data-kong]").forEach((b) => (b.onclick = () => { kesF.ong = b.dataset.kong; viewKes().then(() => $app.querySelector(`[data-kong="${kesF.ong}"]`)?.focus({ preventScroll: true })); }));
  document.getElementById("kes-ajan").onchange = (e) => { kesF.ajan = e.target.value; kesChwa.clear(); viewKes(); };
  const q = document.getElementById("kes-q");
  q.oninput = () => { kesF.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => viewKes().then(() => { const n = document.getElementById("kes-q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }), 250); };
  $app.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => decider(M, b.dataset.ok, true)));
  $app.querySelectorAll("[data-non]").forEach((b) => (b.onclick = () => decider(M, b.dataset.non, false)));
  $app.querySelectorAll("[data-gav]").forEach((b) => (b.onclick = () => kesGarantiDeside([b.dataset.gav], true, Number(garF.find((x) => x.y.id === b.dataset.gav)?.montant || 0))));
  $app.querySelectorAll("[data-gar]").forEach((b) => (b.onclick = () => kesGarantiDeside([b.dataset.gar], false, Number(garF.find((x) => x.y.id === b.dataset.gar)?.montant || 0))));
  $app.querySelectorAll("[data-krv]").forEach((b) => (b.onclick = () => kesKrediDeside([b.dataset.krv], true, Number(krF.find((x) => x.y.id_transaction_credit === b.dataset.krv)?.montant || 0))));
  $app.querySelectorAll("[data-krr]").forEach((b) => (b.onclick = () => kesKrediDeside([b.dataset.krr], false, Number(krF.find((x) => x.y.id_transaction_credit === b.dataset.krr)?.montant || 0))));
  document.getElementById("kes-kr-tout")?.addEventListener("click", () => kesKrediDeside(krF.map((x) => x.y.id_transaction_credit), true, sumMon(krF)));
  $app.querySelectorAll("[data-mok]").forEach((b) => (b.onclick = () => decideModif(M, b.dataset.mok, true)));
  $app.querySelectorAll("[data-mnon]").forEach((b) => (b.onclick = () => decideModif(M, b.dataset.mnon, false)));
}
async function kesDeside(M, ids, ok) {
  if (ok) {
    const bl = ids.filter((id) => modifBloke(M, id));
    if (bl.length) { ids = ids.filter((id) => !modifBloke(M, id)); if (!ids.length) return ui.info(t("Demann modifikasyon an atant"), t("Depo sa a gen yon demann modifikasyon an atant. Trete demann lan anvan ou valide l.")); toast(`${bl.length} ${t("depo gen demann modifikasyon: yo pa valide")}`, "info", 5000); }
  }
  if (!ids.length) return;
  if (!navigator.onLine) return ui.info("Pa gen koneksyon.", "Fòk ou gen entènèt pou valide oswa rejte depo yo.");
  const xs = ids.map((id) => M.txs.get(id)).filter(Boolean);
  const total = sumMon(xs);
  const ajanL = [...new Set(xs.map((x) => nonAjan(x.created_by)))].join(", ");
  const sèl = xs.length === 1 && (() => { const k = M.comptes.get(xs[0].id_compte_epargne); return non(k && M.clients.get(k.id_personne)); })();
  let motif = null;
  if (ok) {
    if (!(await ui.ask({ titre: xs.length > 1 ? `${t("Valide")} ${xs.length} ${t("depo")}?` : "Valide depo sa a?", ok: "Valide", ikon: "✓",
      tekst: "Ou konfime ou resevwa kach la. Balans kont kliyan yo ap monte touswit.",
      detay: [...(sèl ? [["Kliyan", sèl]] : [["Depo", String(xs.length)]]), ["Total", gd(total)], ["Ajan", ajanL]] }))) return;
  } else {
    motif = await ui.askText({ titre: xs.length > 1 ? `${t("Rejte")} ${xs.length} ${t("depo")} (${gd(total)})?` : `${t("Rejte depo sa a")} (${gd(total)})?`, label: "Rezon refi a", min: 3 });
    if (!motif) return;
  }
  try {
    const r = await api.rpc("grandon_depo_valide", { p_ids: ids, p_ok: ok, p_motif: motif });
    ids.forEach((i) => kesChwa.delete(i));
    toast(`${r?.trete ?? ids.length} ${t(ok ? "depo valide" : "depo rejte")} · ${gd(r?.total ?? total)}${r?.deja ? ` · ${r.deja} ${t("te deja trete")}` : ""}${r?.modif_an_atant ? ` · ${r.modif_an_atant} ${t("gen demann modifikasyon")}` : ""}`, "ok");
    // Paj la mete l ajou touswit; done sèvè yo (balans, elatriye) rive an awyè plan.
    if (!r?.modif_an_atant) await S.patch("transactions", ids, { validation_status: ok ? "confirmed" : "rejected" });
    S.pullFon();
  } catch (e) { return ui.info("Erè", e.message); }
  render();
}

// ---------- Rapò (responsab kès / manadjè): chwazi ajan ak dat, detay chak ribrik ----------
const rapoF = { ajan: "", jou: null };
function baRapo(M) {
  const ids = Object.keys(ajans).filter((id) => id !== moi.id).sort((a, b) => nonAjan(a).localeCompare(nonAjan(b), "fr"));
  return `<div class="card rapo-ba">
    <label class="tx-sel"><span>${t("Ajan")}</span><select id="rapo-ajan"><option value="">${t("Tout ajan yo")}</option>${ids.map((id) => `<option value="${h(id)}" ${id === rapoF.ajan ? "selected" : ""}>${h(nonAjan(id))}</option>`).join("")}</select></label>
    <label class="tx-sel"><span>${t("Dat")}</span><span class="rapo-dat"><button type="button" class="btn sm" id="rapo-prev" aria-label="${t("Jou anvan")}">‹</button>
      <input type="date" id="rapo-jou" value="${h(rapoF.jou)}" min="${h(S.ajouteJou(M.today, -199))}" max="${h(M.today)}">
      <button type="button" class="btn sm" id="rapo-next" aria-label="${t("Jou apre")}" ${rapoF.jou >= M.today ? "disabled" : ""}>›</button></span></label>
  </div>`;
}
function brancheBaRapo(M) {
  const ale = (j) => { if (!j) return; rapoF.jou = j > M.today ? M.today : j; viewRapo(); };
  document.getElementById("rapo-ajan").onchange = (e) => { rapoF.ajan = e.target.value; viewRapo(); };
  document.getElementById("rapo-jou").onchange = (e) => ale(e.target.value);
  document.getElementById("rapo-prev").onclick = () => ale(S.ajouteJou(rapoF.jou, -1));
  document.getElementById("rapo-next").onclick = () => ale(S.ajouteJou(rapoF.jou, 1));
}
// Chak sa ajan an te antre nan chak ribrik, pou jou a.
function detayRapo(M, D, pa) {
  const nmK = (id) => { const k = M.comptes.get(id); return non(k && M.clients.get(k.id_personne)); };
  const txJ = [...M.txs.values()].filter((x) => pa(x) && S.jouTx(x) === D).sort((a, b) => String(a.date_transaction).localeCompare(String(b.date_transaction)));
  const ajanTxt = (id) => (rapoF.ajan ? "" : ` · <span data-brut>${h(nonAjan(id))}</span>`);
  const etaB = (x) => (x.validation_status === "pending" ? `<span class="badge warn">${t("An atant validasyon")}</span>` : x.validation_status === "rejected" ? `<span class="badge err">${t("Rejte ✗")}</span>` : `<span class="badge ok">${t("Valide ✓")}</span>`);
  const rowT = (x) => { const k = M.comptes.get(x.id_compte_epargne), kind = S.txKind(x);
    const kanè = [x.solde_avant_declare, x.solde_declare].some((v) => v != null && v !== "") ? `${t("kanè avan")} ${x.solde_avant_declare != null && x.solde_avant_declare !== "" ? gd(x.solde_avant_declare) : "—"} → ${t("kanè apre")} ${x.solde_declare != null && x.solde_declare !== "" ? gd(x.solde_declare) : "—"}` : "";
    return `<div class="row txr${x.validation_status === "rejected" ? " txr-anile" : ""}"><span class="txr-le"><b class="mono">${lèKout(x.date_transaction) || "—"}</b></span>
      <span class="txr-main"><span class="txr-t"><b>${d(nmK(x.id_compte_epargne))}</b> ${etaB(x)}</span>
        <span class="mut sm">${d(k?.no_compte || "")}${kind === "fre" && x.type_frais ? ` · ${d(x.type_frais)}` : ""}${kind === "viman_out" && x.virement_to ? ` → ${d(x.virement_to)}` : ""}${ajanTxt(x.created_by)}</span>
        ${kanè ? `<span class="mut sm">${kanè}</span>` : ""}
        ${x.validation_status === "rejected" && x.validation_note ? `<span class="sm err-t">${t("Rezon")}: ${d(x.validation_note)}</span>` : ""}</span>
      <span class="txr-mon"><b class="${KLAS(kind)}">${SIY(kind)}${gd(x.montant)}</b></span></div>`; };
  const seksyon = (kle, tit, xs, rann, tot) => `<details class="rb card" data-rb="${kle}" ${xs.length ? "open" : ""}><summary><b>${t(tit)}</b><span class="mut sm">${xs.length}${tot != null ? ` · ${gd(tot)}` : ""}</span></summary>
    <div class="list tx-lis">${xs.map(rann).join("") || `<p class="empty">${t("Anyen.")}</p>`}</div></details>`;
  const par = (k) => txJ.filter((x) => S.txKind(x) === k);
  const ok = (l) => l.filter((x) => x.validation_status !== "rejected");
  const dep = par("depo"), ret = par("retre"), fre = par("fre"), vim = par("viman_out");
  const bDJ = balDekl(ok(txJ)), dekl = bDJ.lis;
  const cyc = [...M.comptes.values()].filter((k) => pa(k) && k.created_at && S.jouLokal(new Date(k.created_at)) === D);
  const fb = [...M.suivis.values()].filter((x) => pa(x) && S.jouLokal(new Date(x.capture_le)) === D).sort((a, b) => String(a.capture_le).localeCompare(String(b.capture_le)));
  const dmJ = [...M.demandes.values()].filter((x) => pa(x) && x.capture_le && S.jouLokal(new Date(x.capture_le)) === D);
  // Ribrik kredi yo: peman, penalite, vèsman deklare (kanè), kliyan kredi ki pa peye.
  let krRib = "", krN = 0;
  if ((M.kredi || []).length) {
    const kt = M.kredi.flatMap((k) => k._txTout.map((y) => ({ ...y, _k: k }))).filter((y) => pa(y) && S.jouKreTx(y) === D)
      .sort((a, b) => String(a.capture_le || a.date_transaction).localeCompare(String(b.capture_le || b.date_transaction)));
    const kfb = M.kredi.flatMap((k) => k._fb.map((y) => ({ ...y, _k: k }))).filter((y) => pa(y) && S.jouLokal(new Date(y.capture_le)) === D);
    const okK = (l) => l.filter((y) => y.validation_status !== "rejected");
    const kPe = kt.filter((y) => y.type_transaction === "Paiement"), kPen = kt.filter((y) => y.type_transaction === "Penalite"), kVs = kPe.filter((y) => y.versement_apres != null);
    const rowK = (y) => { const c = M.clients.get(y._k.id_personne);
      return `<div class="row txr${y.validation_status === "rejected" ? " txr-anile" : ""}"><span class="txr-le"><b class="mono">${lèKout(y.capture_le || y.date_transaction) || "—"}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> ${y.type_transaction === "Penalite" ? "" : etaKreTx(y)}</span>
          <span class="mut sm"><a class="lnk" href="#/kredi/${h(y._k.id_compte_credit)}">${d(y._k.no_compte || "")}</a>${ajanTxt(y.created_by)}</span>
          ${y.versement_apres != null ? `<span class="mut sm">${t("vèsman avan")} ${Number(y.versement_avant)} → ${t("vèsman apre")} ${Number(y.versement_apres)}</span>` : ""}
          ${y.validation_status === "rejected" && y.validation_note ? `<span class="sm err-t">${t("Rezon")}: ${d(y.validation_note)}</span>` : ""}</span>
        <span class="txr-mon"><b class="in">+${gd(y.montant)}</b></span></div>`; };
    krRib = seksyon("kredi_peman", "Peman kredi", kPe, rowK, sumMon(okK(kPe)))
      + seksyon("kredi_penalite", "Penalite kredi", kPen, rowK, sumMon(okK(kPen)))
      + `<details class="rb card" data-rb="kredi_vesman" ${kVs.length ? "open" : ""}><summary><b>${t("Vèsman deklare (kredi)")}</b><span class="mut sm">${kVs.length} · ${Math.round(okK(kVs).reduce((a, y) => a + Number(y.versement_apres) - Number(y.versement_avant || 0), 0) * 100) / 100} ${t("vèsman")}</span></summary>
        <div class="list tx-lis">${kVs.map(rowK).join("") || `<p class="empty">${t("Anyen.")}</p>`}</div></details>`
      + seksyon("kredi_papeye", "Kliyan kredi ki pa peye", kfb, (x) => `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(x.capture_le) || "—"}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${d(non(M.clients.get(x._k.id_personne)))}</b> <span class="badge warn">${t(MOTIF_KOUT[x.motif] || "Lòt")}</span></span>
        <span class="mut sm">${t(motifLabel(x.motif))} · <a class="lnk" href="#/kredi/${h(x._k.id_compte_credit)}">${d(x._k.no_compte || "")}</a>${ajanTxt(x.agent_id)}</span>${x.note ? `<span class="sm">«${d(x.note)}»</span>` : ""}</span></div>`);
    krN = kt.length + kfb.length;
  }
  // Ribrik kont garanti yo: depo ak retrè (ak balans kanè avan → apre).
  let garRib = "", garN = 0;
  if (M.mod?.garanti) {
    const gt = (M.garanti || []).flatMap((g) => g._tx.map((y) => ({ ...y, _g: g }))).filter((y) => pa(y) && S.jouLokal(new Date(y.capture_le)) === D)
      .sort((a, b) => String(a.capture_le).localeCompare(String(b.capture_le)));
    const okG = (l) => l.filter((y) => y.statut !== "rejected");
    const rowG = (y) => { const c = M.clients.get(y._g.id_personne), D0 = y.tip === "D";
      return `<div class="row txr${y.statut === "rejected" ? " txr-anile" : ""}"><span class="txr-le"><b class="mono">${lèKout(y.capture_le) || "—"}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${d(non(c))}</b> ${etaGarTx(y)}</span>
          <span class="mut sm">${t(GAR_NON[y._g.kalite])} · <a class="lnk" href="#/kliyan/${h(y._g.id_personne)}">${d(y._g.no_compte)}</a>${ajanTxt(y.created_by)}</span>
          ${y.solde_apres != null ? `<span class="mut sm">${t("kanè avan")} ${gd(y.solde_avant)} → ${t("kanè apre")} ${gd(y.solde_apres)}</span>` : ""}
          ${y.statut === "rejected" && y.validation_note ? `<span class="sm err-t">${t("Rezon")}: ${d(y.validation_note)}</span>` : ""}</span>
        <span class="txr-mon"><b class="${D0 ? "in" : "out"}">${D0 ? "+" : "−"}${gd(y.montant)}</b></span></div>`; };
    const gD = gt.filter((y) => y.tip === "D"), gR = gt.filter((y) => y.tip === "R");
    garRib = seksyon("garanti_depo", "Depo garanti", gD, rowG, sumMon(okG(gD))) + seksyon("garanti_retre", "Retrè garanti", gR, rowG, sumMon(okG(gR)));
    garN = gt.length;
  }
  const html = seksyon("depo", "Depo ankese", dep, rowT, sumMon(ok(dep)))
    + seksyon("retre", "Retrè peye", ret, rowT, sumMon(ok(ret)))
    + seksyon("fre", "Frè", fre, rowT, sumMon(ok(fre)))
    + seksyon("viman", "Viman", vim, rowT, sumMon(ok(vim)))
    + seksyon("deklare", "Balans deklare", dekl, rowT, bDJ.tot)
    + seksyon("cycles", "Cycle kreye", cyc, (k) => `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(k.created_at) || "—"}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${d(nmK(k.id_compte_epargne))}</b></span><span class="mut sm">${d(k.no_compte || "")} · plan ${gd(k.montant_plan || 0)} · ${k.duree_mois || "?"} ${t("mwa")}${ajanTxt(k.created_by)}</span></span></div>`)
    + seksyon("papeye", "Kliyan ki pa peye", fb, (x) => `<div class="row txr"><span class="txr-le"><b class="mono">${lèKout(x.capture_le) || "—"}</b></span>
        <span class="txr-main"><span class="txr-t"><b>${d(nmK(x.id_compte_epargne))}</b> <span class="badge warn">${t(MOTIF_KOUT[x.motif] || "Lòt")}</span> ${estManager() ? badjKontwol(x) : ""}</span>
        <span class="mut sm">${t(motifLabel(x.motif))}${ajanTxt(x.agent_id)}</span>${x.note ? `<span class="sm">«${d(x.note)}»</span>` : ""}</span></div>`)
    + seksyon("demann", "Demann retrè ak viman", dmJ, (x) => liDemande(M, x))
    + krRib + garRib;
  return { html, n: txJ.length + cyc.length + fb.length + dmJ.length + krN + garN };
}

// ---------- Istorik modifikasyon pa jou (manadjè) ----------
// Demann ajan yo, desizyon manadjè yo, modifikasyon ki fèt (ak valè avan → apre), anilasyon, modifikasyon dirèk manadjè.
let jouIstorik = null;
const DIRÈK = "Modifikasyon dirèk manadjè", DIRÈK_KES = "Modifikasyon dirèk responsab kès";
function evènmanModif(x) {
  const dirèk = x.rezon === DIRÈK || x.rezon === DIRÈK_KES || (x.operasyon === "siprime" && x.statut === "fini" && x.desizyon_pa && x.desizyon_pa === x.agent_id);
  if (dirèk) return [{ le: x.itilize_le || x.desizyon_le || x.kreye_le, tip: x.operasyon === "siprime" ? "anile_dirèk" : x.rezon === DIRÈK_KES ? "dirèk_kes" : "dirèk", pa: x.agent_id, x }];
  const l = [{ le: x.kreye_le, tip: "demann", pa: x.agent_id, x }];
  if (x.desizyon_le) l.push({ le: x.desizyon_le, tip: x.statut === "refize" ? "refize" : x.operasyon === "siprime" ? "anile" : "apwouve", pa: x.desizyon_pa, x });
  if (x.itilize_le && x.operasyon === "modifye") l.push({ le: x.itilize_le, tip: "aplike", pa: x.agent_id, x });
  return l;
}
function valèIstorik(kind, k, v) {
  if (v == null || v === "") return "—";
  if (k === "photo") return t("Foto");
  if (kind === "tx" && (k === "montant" || k.startsWith("solde"))) return gd(v);
  if (k === "telephone") return F.telFmt(v);
  if (k === "date_naissance" || k === "date_debut") return datFr(v);
  if (k === "montant_plan") return gd(v);
  if (k === "jours_paiement") return Array.isArray(v) ? lisJou(v) : String(v);
  if (k === "frequence_semaine") return `${v}× / ${t("semèn")}`;
  if (k === "duree_mois") return `${v} ${t("mwa")}`;
  return String(v);
}
async function viewIstorik() {
  if (!estManager()) return go("#/param");
  const M = await S.model();
  ajans = (await db.meta("ajans")) || {};
  jouIstorik ||= M.today;
  const TIP = { demann: ["info", "Demann"], apwouve: ["ok", "Apwouve"], refize: ["err", "Refize"], anile: ["err", "Anile (apwouve)"],
    aplike: ["ok", "Modifikasyon fèt"], dirèk: ["warn", "Modifikasyon dirèk manadjè"], dirèk_kes: ["warn", "Modifikasyon dirèk responsab kès"], anile_dirèk: ["err", "Anile pa manadjè"] };
  const ev = [...M.modif.values()].flatMap(evènmanModif).filter((e) => e.le && S.jouLokal(new Date(e.le)) === jouIstorik)
    .sort((a, b) => String(b.le).localeCompare(String(a.le)));
  const kont = (tips) => ev.filter((e) => tips.includes(e.tip)).length;
  const avanApre = (e) => {
    if (!["aplike", "dirèk", "dirèk_kes"].includes(e.tip) || !e.x.chan) return "";
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
      <div><span>${t("Refize yo")}</span><b>${kont(["refize"])}</b></div><div><span>${t("Modifikasyon fèt")}</span><b>${kont(["aplike", "dirèk", "dirèk_kes"])}</b></div>
      <div><span>${t("Anilasyon")}</span><b>${kont(["anile", "anile_dirèk"])}</b></div></div>
    <div class="list ist-lis">${ev.map((e) => { const [kl, et] = TIP[e.tip]; const x = e.x;
      const href = x.kind === "kliyan" ? `#/kliyan/${x.ref_id}` : x.kind === "cycle" || x.kind === "potfey" || x.kind === "siyati" ? `#/cycle/${x.ref_id}` : (() => { const tx = M.txs.get(x.ref_id); return tx ? `#/cycle/${tx.id_compte_epargne}` : "#/epay"; })();
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
        <label>Wòl<select name="wol"><option value="agent">Ajan</option><option value="manager">Manadjè</option><option value="kesye">Responsab kès</option><option value="admin">Admin</option></select></label>
        <label>Modpas * <small class="mut">(8+)</small><input name="modpas" type="text" required autocomplete="new-password" minlength="8"></label>
      </div>
      <fieldset class="field" id="sv-f"><legend>${t("Sèvis")}</legend><div id="sv-chek" class="sv-chek"></div>
        <small class="mut">${t("Ajan an wè sèlman sèvis li a. Admin ak responsab kès yo wè tout sèvis yo.")}</small></fieldset>
      <p class="err-msg" id="err" role="alert"></p>
      <button class="btn pri" type="submit" ${navigator.onLine ? "" : "disabled"}>Kreye kont lan</button>
    </form>`;
  const lis = document.getElementById("lis");
  let sevis = [];
  try { sevis = (await api.select("grandon_sevis?select=kod,non&aktif=is.true&order=kod")) || []; } catch { /* offline */ }
  const nonSv = (k) => sevis.find((x) => x.kod === k)?.non || k;
  document.getElementById("sv-chek").innerHTML = sevis.map((x) => `<label class="chk"><input type="checkbox" name="sevis" value="${h(x.kod)}" ${x.kod === (C.SEVIS || "grandon") ? "checked" : ""}><span data-brut>${h(x.non)}</span></label>`).join("");
  const charge = async () => {
    try {
      const { ajan } = await api.kont({ aksyon: "lis" });
      lis.innerHTML = ajan.map((a) => `<div class="row col">
        <div><b>${h(a.nom)}</b> <span class="badge ${a.actif ? "ok" : "mut"}">${a.actif ? WOL[a.role] : "Dezaktive"}</span>
          ${["admin", "kesye"].includes(a.role) ? `<span class="badge mut">${t("Tout sèvis")}</span>` : (a.sevis || ["grandon"]).map((k) => `<span class="badge info" data-brut>${h(nonSv(k))}</span>`).join(" ")}
          <div class="mut sm">${h(a.telephone.replace(/^509(\d{4})(\d{4})$/, "$1 $2"))}</div></div>
        ${a.user_id === moi.id ? `<div class="mut sm">${t("Se ou (ou pa ka chanje pwòp wòl ou)")}</div>` : `<div class="btns"><button class="btn sm" data-wol="${h(a.telephone)}" data-wol-a="${h(a.role)}" data-non="${h(a.nom)}">${t("Chanje wòl")}</button>${["admin", "kesye"].includes(a.role) || sevis.length < 2 ? "" : `<button class="btn sm" data-sv="${h(a.telephone)}" data-sv-a="${h((a.sevis || ["grandon"]).join(","))}" data-non="${h(a.nom)}">${t("Sèvis")}</button>`}<button class="btn sm" data-mp="${h(a.telephone)}">Nouvo modpas</button>
          <button class="btn sm ${a.actif ? "danger" : ""}" data-ak="${a.actif ? "desactiver" : "reactiver"}" data-tel="${h(a.telephone)}">${a.actif ? "Dezaktive" : "Reaktive"}</button></div>`}
      </div>`).join("") || `<p class="empty">Pa gen ajan.</p>`;
      lis.querySelectorAll("[data-wol]").forEach((b) => (b.onclick = async () => {
        const avan = b.dataset.wolA;
        const r = await ui.askChoice({ titre: `${t("Chanje wòl")} · ${b.dataset.non}`, tekst: `${t("Wòl kounye a")}: ${t(WOL[avan] || avan)}`,
          options: Object.entries(WOL).filter(([k]) => k !== avan).map(([k, l]) => [k, l]), ok: "Chanje wòl" });
        if (!r?.valeur) return;
        const nouvo = r.valeur;
        const avètisman = avan === "agent" ? t("Kont kliyan li yo ap rete atache avè l, men yo p ap parèt sou non l nan Ekip la toutotan li pa ajan.") : "";
        if (!(await ui.ask({ titre: `${b.dataset.non}: ${t(WOL[avan])} → ${t(WOL[nouvo])}?`, tekst: `${t("Nouvo wòl la ap aplike sou aplikasyon li nan pwochen senkronizasyon an.")} ${avètisman}`, ok: "Chanje wòl" }))) return;
        try { await api.kont({ aksyon: "wol", telefon: b.dataset.wol, wol: nouvo }); toast(`${b.dataset.non}: ${t(WOL[nouvo])} ✓`, "ok"); charge(); }
        catch (e) { toast(t(e.message), "err"); }
      }));
      lis.querySelectorAll("[data-sv]").forEach((b) => (b.onclick = async () => {
        const r = await ui.askChek({ titre: `${t("Sèvis")} · ${b.dataset.non}`, tekst: t("Moun nan wè sèlman sèvis ki tcheke yo."),
          opsyon: sevis.map((x) => [x.kod, x.non]), chwa: b.dataset.svA.split(",") });
        if (!r) return;
        try { await api.kont({ aksyon: "sevis", telefon: b.dataset.sv, sevis: r }); toast(`${b.dataset.non}: ${r.map(nonSv).join(", ")} ✓`, "ok"); charge(); }
        catch (e) { toast(t(e.message), "err"); }
      }));
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
    const svChwa = [...f.querySelectorAll("input[name=sevis]:checked")].map((x) => x.value);
    if (sevis.length && !svChwa.length && !["admin", "kesye"].includes(v.wol)) return (err.textContent = t("Chwazi omwen yon sèvis."));
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    try {
      await api.kont({ aksyon: "creer", non: v.non.trim(), telefon: api.telefon8(v.tel), wol: v.wol, modpas: v.modpas, sevis: svChwa.length ? svChwa : [C.SEVIS || "grandon"] });
      toast(`Kont ${v.non.trim()} kreye. Li konekte ak ${api.telefon8(v.tel)} + modpas la.`, "ok", 6000);
      f.reset(); err.textContent = ""; charge();
    } catch (e2) { err.textContent = e2.message; }
    b.disabled = false;
  };
}

// ---------- Routè ----------
const FORM = /^#\/(kredi\/nouvo|kredi\/[\w-]+\/(?:peye|penalite|kalandriye)|garanti\/|kliyan\/nouvo|kliyan\/[\w-]+\/modifye|cycle\/nouvo|cycle\/[\w-]+\/modifye|tx\/nouvo|ajan|modpas)/;
async function render() {
  const r = location.hash || "#/";
  const kreL = await db.meta("kredi");
  kreDispo = Array.isArray(kreL); kreGen = kreDispo && kreL.length > 0;
  const s = api.getSession();
  await updateBar();
  updateNav();
  if (!s || !moi || r === "#/login") return viewLogin(s?.expired);
  if (moi.modpasTanpore) return viewModpas(true);
  const mwen = ((await db.meta("ekip")) || []).find((x) => x.user_id === moi.id);
  if (mwen && moi.tel && mwen.role !== moi.role) {
    moi = { ...moi, role: mwen.role, admin: mwen.role === "admin", manager: mwen.role === "admin" || mwen.role === "manager" };
    await db.meta("moi", moi);
    toast(`${t("Wòl ou chanje")}: ${t(WOL[mwen.role] || mwen.role)}`, "info", 7000);
    updateNav();
    if (estKesye() && r !== "#/kes") return go("#/kes");
    if (!estKesye() && r === "#/kes") return go("#/");
  }
  const bl = await db.meta("aparey_bloke");
  if (bl) return viewAparèyBloke(bl);
  // Responsab kès: paj kliyan, epay ak kat yo pa pou li.
  if (estKesye() && (r === "#/" || r === "#" || /^#\/(kliyan|epay|kat|cycle|tx|chwazi|istorik|feries|aparey)/.test(r))) return go("#/kes");
  if (r === "#/kes") return estKesye() ? viewKes() : go("#/");
  let m;
  if (r === "#/" || r === "#") return viewTablo();
  if (r === "#/ekip") return estManager() ? viewEkip() : go("#/");
  if (r === "#/alet") return estManager() ? viewAlet() : go("#/");
  if (r === "#/potfey") return !estKesye() ? viewPotfey() : go("#/");
  if ((m = r.match(/^#\/ekip\/([\w-]+)$/))) return estManager() ? viewTablo(m[1]) : go("#/");
  if (r === "#/kliyan") return viewKliyan();
  if (r === "#/epay") return viewEpay();
  if (r === "#/kredi") return (estManager() ? kreDispo : kreGen) ? viewKredi() : go("#/");
  if (r === "#/kredi/nouvo") return estManager() ? viewKrediNouvo() : go("#/");
  if ((m = r.match(/^#\/kredi\/([\w-]+)\/peye$/))) return viewKrediPeye(m[1]);
  if ((m = r.match(/^#\/kredi\/([\w-]+)\/penalite$/))) return viewKrediPeye(m[1], true);
  if ((m = r.match(/^#\/garanti\/([\w-]+)\/(depo|retre)$/))) return estKesye() ? go("#/kes") : viewGarantiTx(m[1], m[2]);
  if ((m = r.match(/^#\/kredi\/([\w-]+)\/kalandriye$/))) return estManager() ? viewKrediKalandriye(m[1]) : go("#/kredi");
  if ((m = r.match(/^#\/kredi\/([\w-]+)$/))) return viewKrediFich(m[1]);
  if (r === "#/rapo") return viewRapo();
  if (r === "#/rekouvreman") return viewRekouvreman();
  if (r === "#/mobilizasyon") return viewMobilizasyon();
  if (r === "#/kat") { const M = await S.model(); ajans = (await db.meta("ajans")) || {}; return KAT.viewKat({ $app, M, man: estManager(), moi, ajans, getGps, toast }); }
  if (/^#\/(kliyan\/nouvo|cycle\/nouvo|tx\/nouvo|chwazi)/.test(r) && !(await leOk())) return viewLeFèmen();
  if (r === "#/le") return moi.admin ? viewLe() : go("#/");
  if (r === "#/kliyan/nouvo") return viewClientNew();
  if ((m = r.match(/^#\/kliyan\/([\w-]+)\/modifye$/))) return viewClientEdit(m[1]);
  if ((m = r.match(/^#\/kliyan\/([\w-]+)$/))) return viewClient(m[1]);
  if ((m = r.match(/^#\/chwazi\/(cycle|tx)$/))) return viewPick(m[1]);
  if ((m = r.match(/^#\/cycle\/nouvo\/([\w-]+)$/))) return viewCycleNew(m[1]);
  if ((m = r.match(/^#\/cycle\/([\w-]+)\/siyati$/))) return !estKesye() ? viewSiyati(m[1]) : go(`#/cycle/${m[1]}`);
  if ((m = r.match(/^#\/cycle\/([\w-]+)\/modifye$/))) return !estKesye() ? viewCycleNew(null, m[1]) : go(`#/cycle/${m[1]}`);
  if ((m = r.match(/^#\/cycle\/([\w-]+)$/))) return viewCycle(m[1]);
  if ((m = r.match(/^#\/tx\/nouvo\/([\w-]+)$/))) return viewTxNew(m[1]);
  if ((m = r.match(/^#\/monnen\/([\w-]+)\/(monnaie|remise)$/))) return !estKesye() ? viewMonnen(m[1], m[2]) : go(`#/cycle/${m[1]}`);
  if (r === "#/param") return viewParam();
  if (r === "#/senk") return viewSenk();
  if (r === "#/istorik") return viewIstorik();
  if (r === "#/modpas") return viewModpas(false);
  if (r === "#/aparey") return viewAparey();
  if (r === "#/ajan" && moi.admin) return viewAjan();
  if (r === "#/feries") return viewFeries();
  if (r === "#/metrik") return viewMetrik();
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
    if (!FORM.test(location.hash) && location.hash !== "#/login" && !tape) render().then(() => setTimeout(avètiAlet, 600));
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
  addEventListener("hashchange", () => { clearTimeout(pendingRender); render().then(() => setTimeout(avètiAlet, 800)); scrollTo(0, 0); });
  addEventListener("online", () => { updateBar(); S.run().then((r) => r.notices.forEach((n) => toast(n, "info", 6000))); });
  addEventListener("offline", updateBar);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") S.run(); });
  setInterval(() => S.run(), 60000);
  await render();
  setTimeout(avètiAlet, 1500);
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
