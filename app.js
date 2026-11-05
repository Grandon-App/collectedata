import * as db from "./db.js";
import * as api from "./api.js";
import * as S from "./sync.js";
import * as ui from "./ui.js";
import * as TX from "./taxonomy.js";
import { t, setLang, getLang, demarrerTraduction } from "./i18n.js";
import * as F from "./fmt.js";
import * as looks from "./looks.js";

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
const APP_VERSION = "4.1";
const WOL = { agent: "Ajan", manager: "Manadjè", admin: "Admin" };
// Preferans aparans: pou aparèy sa a sèlman.
const PREFS_DEFO = { tem: "auto", teks: "n", look: looks.LOOK_DEFO };
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
  LABEL_TX, SIY, KLAS, MOTIFS, motifLabel, TYPES_FRE } = F;
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

function getGps(timeout = 10000) {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      () => res(null),
      { enableHighAccuracy: true, timeout, maximumAge: 120000 });
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
    <a href="#/param" class="net ${on ? "on" : "off"}" aria-label="Senkronizasyon: ${on ? "anliy" : "offline"}, ${pend} poko voye, ${err} erè">
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
const TABS = [["tablo", "#/", "Tablo"], ["kliyan", "#/kliyan", "Kliyan"], ["epay", "#/epay", "Epay"], ["rapo", "#/rapo", "Rapò"], ["param", "#/param", "Paramèt"]];
function tabActif(r) {
  if (/^#\/(kliyan)/.test(r)) return "kliyan";
  if (/^#\/(epay|cycle|tx|chwazi)/.test(r)) return "epay";
  if (/^#\/rapo/.test(r)) return "rapo";
  if (/^#\/(param|ajan|feries)/.test(r)) return "param";
  return "tablo";
}
function updateNav() {
  const r = location.hash || "#/";
  if (!moi || r === "#/login") { $nav.hidden = true; document.body.classList.remove("has-nav"); return; }
  const a = tabActif(r);
  $nav.hidden = false;
  document.body.classList.add("has-nav");
  $nav.innerHTML = TABS.map(([k, href, label]) => `<a href="${href}" class="${k === a ? "on" : ""}" ${k === a ? 'aria-current="page"' : ""}>${ICO[k]}<span>${label}</span></a>`).join("")
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
      // Ajan Grandon (telefòn) oswa administratè (imèl).
      const [ga] = await api.select(`grandon_ajan?user_id=eq.${s.user.id}&select=nom,role,actif`);
      const [p] = ga?.actif ? [null] : await api.select(`profiles?user_id=eq.${s.user.id}&select=firstname,name,role`);
      if (!ga?.actif && !(p && [1, 2, 3, 5].includes(Number(p.role)))) {
        await api.clearSession();
        throw new Error("Kont sa a pa gen aksè nan Grandon.");
      }
      if (prev && prev !== s.user.id) { const keep = await db.meta("session"); await db.wipe(); await db.meta("session", keep); }
      moi = ga?.actif
        ? { id: s.user.id, nom: ga.nom, role: ga.role, admin: ga.role === "admin", manager: ga.role === "admin" || ga.role === "manager", tel: api.telefon8(f.tel.value) }
        : { id: s.user.id, nom: `${p.firstname || ""} ${p.name || ""}`.trim() || s.user.email, role: Number(p.role), admin: Number(p.role) === 1, manager: [1, 2, 5].includes(Number(p.role)) };
      await db.meta("owner", s.user.id);
      await db.meta("moi", moi);
      navigator.storage?.persist?.();
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
  $app.innerHTML = `<div id="tablo">${L().parts.tablo({ ...ctxBase(M), stats: st, isoJou: S.isoJou(M.today) })}</div>`;
}

// Chif komen pou Epay/Tablo
function statsEpay(M) {
  const pouJodi = [...M.comptes.values()].filter((k) => k._jodiPeman);
  const aktif = [...M.comptes.values()].filter((k) => k._actif);
  return {
    pouJodi: pouJodi.length, peye: pouJodi.filter((k) => k._jodi >= Number(k.montant_plan || 0)).length,
    kolekte: [...M.comptes.values()].reduce((a, k) => a + k._jodi, 0),
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
const jourTx = (tx) => (S.jouTx(tx) === S.jodi() ? t("jodi a") : datFr(S.jouTx(tx)));
const nomAjan = (id) => (id === moi?.id || id === "moi" ? t("Mwen") : (ajans[id] || ""));
let ajans = {};

function liTx(M, tx, { kliyan = true } = {}) {
  const k = M.comptes.get(tx.id_compte_epargne); const c = k && M.clients.get(k.id_personne);
  const kind = S.txKind(tx);
  const detay = [
    kind === "fre" && tx.type_frais ? d(tx.type_frais) : "",
    kind === "viman_out" && tx.virement_to ? `→ ${d(tx.virement_to)}` : "", kind === "viman_in" && tx.virement_from ? `← ${d(tx.virement_from)}` : "",
    tx.solde_avant_declare != null && tx.solde_avant_declare !== "" ? `${t("kanè avan")} ${gd(tx.solde_avant_declare)}` : "",
    tx.solde_declare != null && tx.solde_declare !== "" ? `${t("kanè apre")} ${gd(tx.solde_declare)}` : "",
  ].filter(Boolean).join(" · ");
  return `<a class="row" href="#/cycle/${tx.id_compte_epargne}">
    <div class="grow"><b>${t(LABEL_TX[kind])}</b>${kliyan ? ` · ${d(non(c))}` : ""} ${badgeTx(tx)}
      <div class="mut sm">${kliyan ? `${d(k?.no_compte || t("Cycle poko voye"))} · ` : ""}${jourTx(tx)}</div>
      ${detay ? `<div class="mut sm">${detay}</div>` : ""}
      ${tx._error ? `<div class="err-msg sm">${d(t(tx._error))}</div>` : ""}</div>
    <div class="right"><b class="${KLAS(kind)}">${SIY(kind)}${gd(tx.montant)}</b></div></a>`;
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
  await S.enqueue("suivi", { id: S.uuid(), compte: k.id_compte_epargne, motif: r.valeur, note: r.note, gps: await getGps(4000), capture_le: new Date().toISOString() },
    k._pending ? [k.id_compte_epargne] : []);
  toast("Fidbak la anrejistre.");
  render();
}

// ---------- 3. Epay: onglè Kont / Tranzaksyon / Validasyon ----------
let filtEpay = "", ongEpay = "kont", filtKont = "tout";
function ctxKontRow(M, k, sekyon, swiviJodi) {
  const c = M.clients.get(k.id_personne) || {};
  return {
    k, c, man: estManager(), sekyon, ok: k._jodi >= Number(k.montant_plan || 0), jodiPeman: k._jodiPeman,
    fidbakJodi: swiviJodi.get(k.id_compte_epargne) || null, dots: k._dots, heat: k._heat, anReta: k._anReta,
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
  const ongs = [["kont", "Kont", null], ["tx", "Tranzaksyon", null], ...(man ? [["valid", "Validasyon", enAtant.length || null]] : [])];
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
    txHtml: "", demannHtml: "", validHtml: "",
  };
  if (ongEpay === "tx") {
    const mesDm = [...M.demandes.values()].filter((x) => man || x.agent_id === moi.id || x.agent_id === "moi")
      .sort((a, b) => String(b.capture_le).localeCompare(String(a.capture_le))).slice(0, 20);
    const txs = [...M.txs.values()].sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction))).slice(0, 60);
    ctx.demannHtml = mesDm.map((x) => liDemande(M, x)).join("");
    ctx.txHtml = txs.map((x) => liTx(M, x)).join("");
  }
  if (ongEpay === "valid") ctx.validHtml = enAtant.map((x) => liDemande(M, x, { decide: true })).join("");
  $app.innerHTML = `<div id="epay">${P.epay(ctx)}</div>`;
  $app.querySelectorAll("[data-ong]").forEach((b) => (b.onclick = () => { ongEpay = b.dataset.ong; viewEpay(); }));
  $app.querySelectorAll("[data-filt]").forEach((b) => (b.onclick = () => { filtKont = b.dataset.filt; viewEpay(); }));
  const q = document.getElementById("q");
  if (q) q.oninput = () => { filtEpay = q.value; const box = document.getElementById("kont"); if (box) { box.innerHTML = rowsKont(); brancherKont(); } };
  const brancherKont = () => $app.querySelectorAll("[data-papeye]").forEach((b) => (b.onclick = () => { const k = M.comptes.get(b.dataset.papeye); paPeye(k, M.clients.get(k.id_personne) || {}); }));
  brancherKont();
  $app.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => decider(M, b.dataset.ok, true)));
  $app.querySelectorAll("[data-non]").forEach((b) => (b.onclick = () => decider(M, b.dataset.non, false)));
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
  $app.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { jouRapo = Number(b.dataset.j); viewRapo(); }));
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
  const go_ = async () => { txt.textContent = t("GPS: ap chèche…"); const g = await getGps(); cb(g); txt.textContent = g ? `GPS: ✓ (±${g.acc} m)` : t("GPS: pa jwenn (pa obligatwa)"); };
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
    await S.enqueue("client", {
      id, prenom: v.prenom.trim(), nom: v.nom.trim(), telephone: tel, sexe: v.sexe,
      ...valeursOccupation(v), gps, photo_id, capture_le: new Date().toISOString(),
    });
    toast(navigator.onLine ? "Kliyan anrejistre." : "Kliyan anrejistre sou telefòn nan. L ap voye lè gen entènèt.");
    go(f.cycle.checked ? `#/cycle/nouvo/${id}` : `#/kliyan/${id}`);
  };
}

// ---------- Modifye fich kliyan an ----------
async function viewClientEdit(id) {
  const M = await S.model();
  const c = M.clients.get(id);
  if (!c) return go("#/kliyan");
  $app.innerHTML = `
  <a href="#/kliyan/${id}" class="back">‹ ${d(non(c))}</a>
  <h1>Modifye enfòmasyon yo</h1>
  <form id="f" class="card form" novalidate>
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
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!okObligatwa(f, document.getElementById("err"))) return;
    if (!(await okIdentite(f, document.getElementById("err")))) return;
    const v = valeursOccupation(Object.fromEntries(new FormData(f)));
    await S.enqueue("maj", { id, ...v, gps, capture_le: new Date().toISOString() }, c._pending ? [id] : []);
    toast("Enfòmasyon yo anrejistre.");
    go(`#/kliyan/${id}`);
  };
}

// ---------- Fich kliyan ----------
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
    errHtml: c._error ? `<p class="note err">${d(t(c._error))} <a href="#/param">Wè</a></p>` : "" };
  $app.innerHTML = `<div id="fich">${L().parts.fich(ctx)}</div>`;
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
    await S.enqueue("cycle", {
      id, id_personne: idPersonne, duree, frequence: freq, jours: js, montant: plan, date_debut: debut,
      gps, capture_le: new Date().toISOString(), appareil: S.appareil(),
    }, c._pending ? [idPersonne] : []);
    toast("Cycle la anrejistre.");
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
    prevuTotal: k._prevuTotal, totalPrevu: k._totalPrevu, anReta: k._anReta,
    badges: { kont: badgeKont(k), pend: badgePend(k) }, hrefTx: `#/tx/nouvo/${k.id_compte_epargne}`, hrefKliyan: `#/kliyan/${c.id_personne}`,
    errHtml: k._error ? `<p class="note err">${d(t(k._error))} <a href="#/param">Wè</a></p>` : "",
  };
  $app.innerHTML = `<div id="cycle">${L().parts.cycleTop(ctx)}
  ${k._demandes.length ? `<h2>Demann retrè ak viman</h2><div class="list">${k._demandes.map((x) => liDemande(M, x, { decide: man })).join("")}</div>` : ""}
  ${k._suivis.length ? `<h2>Fidbak</h2><div class="list">${k._suivis.map((x) => `<div class="row">
      <div class="grow"><b>${t(motifLabel(x.motif))}</b> ${badgePend(x)}
        <div class="mut sm">${lè(x.capture_le)}${nomAjan(x.agent_id) ? ` · ${d(nomAjan(x.agent_id))}` : ""}</div>
        ${x.note ? `<div class="sm">${d(x.note)}</div>` : ""}</div></div>`).join("")}</div>` : ""}
  <h2>Tranzaksyon</h2>
  <div class="list">${k._txs.map((x) => liTx(M, x, { kliyan: false })).join("") || `<p class="empty">Poko gen tranzaksyon.</p>`}</div></div>`;
  document.getElementById("papeye")?.addEventListener("click", () => paPeye(k, c));
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
      <label>Balans kanè a avan <small class="mut">(opsyonèl)</small><input name="solde_avant" type="number" inputmode="decimal" step="any"></label>
      <label>Balans kanè a apre <small class="mut">(opsyonèl)</small><input name="solde" type="number" inputmode="decimal" step="any"></label>
    </div>
    <label>Nòt<textarea name="note" rows="2"></textarea></label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit" id="go">Anrejistre</button>
  </form>`;
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
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const typ = f.type.value, m = Number(f.montant.value);
    if (!(m > 0)) return (err.textContent = t("Mete montan an."));
    if (typ === "FL" && !f.type_frais.value) return (err.textContent = t("Chwazi tip frè a."));
    if (typ === "V" && !f.dest.value) return (err.textContent = t("Chwazi kont ki resevwa viman an."));
    if (typ === "D" && plan && m < plan && !(await ui.ask({ titre: "Montan an pi piti pase plan an", ikon: "!", ok: "Kontinye",
      detay: [["Montan (goud)", gd(m)], ["Minimòm plan an", gd(plan)]] }))) return;
    const av = f.solde_avant.value === "" ? null : Number(f.solde_avant.value);
    const ap = f.solde.value === "" ? null : Number(f.solde.value);
    const kd = typ === "V" ? M.comptes.get(f.dest.value) : null;
    const lib = Object.fromEntries(TIP_TX)[typ];
    if (!(await ui.ask({ titre: typ === "R" || typ === "V" ? `${t("Demann")} · ${t(lib)}` : lib, ok: typ === "R" || typ === "V" ? "Voye demann lan" : "Konfime",
      foto: c?.photo_url, ikon: typ === "D" ? "+" : "−", detay: [["Kliyan", non(c)], ["Kont", k.no_compte || t("cycle poko voye")], ["Montan (goud)", gd(m)],
        ...(typ === "FL" ? [["Tip frè", f.type_frais.value]] : []),
        ...(kd ? [["Kont ki resevwa", `${non(M.clients.get(kd.id_personne))} · ${kd.no_compte}`]] : []),
        ...(av != null ? [["Balans kanè a avan", gd(av)]] : []), ...(ap != null ? [["Balans kanè a apre", gd(ap)]] : [])] }))) return;
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
const KIND = { client: "Kliyan", adopte: "Kliyan (ajoute)", maj: "Enfòmasyon kliyan an", cycle: "Cycle", tx: "Tranzaksyon", demande: "Demann", suivi: "Fidbak" };
function resume(o, M) {
  const p = o.payload;
  if (o.kind === "client") return `${p.prenom} ${p.nom} · ${p.telephone}`;
  if (o.kind === "adopte") return `${p.prenom} ${p.nom} · ${p.code_client || ""}`;
  if (o.kind === "maj") return non(M.clients.get(p.id));
  if (o.kind === "suivi") { const k = M.comptes.get(p.compte); return `${t(motifLabel(p.motif))} · ${non(k && M.clients.get(k.id_personne))}`; }
  if (o.kind === "demande") { const k = M.comptes.get(p.compte); return `${p.type === "V" ? t("Viman") : t("Retrè")} ${gd(p.montant)} · ${non(k && M.clients.get(k.id_personne))}`; }
  if (o.kind === "cycle") return `${non(M.clients.get(p.id_personne))} · ${p.duree} mwa · ${p.frequence}×/sem · ${gd(p.montant)}`;
  const k = M.comptes.get(p.compte);
  return `${p.type === "D" ? "Depo" : "Retrè"} ${gd(p.montant)} · ${non(k && M.clients.get(k.id_personne))}`;
}
async function viewSync() {
  const M = await S.model();
  const s = api.getSession();
  const pref = prefs();
  $app.innerHTML = `
  <div class="page-head"><h1>Paramèt</h1></div>
  <h2>Kont mwen</h2>
  <div class="card">
    <div class="kv"><span>Non</span><b>${h(moi.nom)}</b></div>
    ${moi.tel ? `<div class="kv"><span>Telefòn</span><b>${h(moi.tel)}</b></div>` : ""}
    <div class="kv"><span>Wòl</span><b>${h(WOL[moi.role] || "Anplwaye")}</b></div>
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
  </div>
  <h2>Senkronizasyon</h2>
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
    </div>`).join("") || `<p class="empty">Tout bagay voye ✓</p>`}</div>
  ${estManager() || moi.admin ? `<h2>Administrasyon</h2>` : ""}
  ${estManager() ? `<a class="btn block" href="#/feries">Jou ferye</a>` : ""}
  ${moi.admin ? `<a class="btn block" href="#/ajan">Jere ajan yo</a>` : ""}
  <button class="btn block danger" id="logout">Dekonekte</button>
  <p class="mut sm center">Grandon · vèsyon ${h(APP_VERSION)}</p>`;
  $app.querySelectorAll('input[name="lang"]').forEach((r) => (r.onchange = () => { setLang(r.value); location.reload(); }));
  $app.querySelectorAll('input[name="tem"], input[name="teks"]').forEach((r) => (r.onchange = () => {
    savePrefs({ tem: $app.querySelector('input[name="tem"]:checked').value, teks: $app.querySelector('input[name="teks"]:checked').value });
  }));
  $app.querySelectorAll('input[name="look"]').forEach((r) => (r.onchange = () => { savePrefs({ look: r.value }); toast(`${looks.LOOKS[r.value].nom} ✓`); render(); }));
  document.getElementById("sync").onclick = async () => {
    const r = await S.run();
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
  document.getElementById("logout").onclick = async () => {
    if (M.outbox.length) return ui.info("Gen operasyon ki poko voye", `${M.outbox.length} · ${t("Senkronize yo anvan w dekonekte.")}`);
    if (!(await ui.ask({ titre: "Dekonekte?", tekst: "Done yo ap efase sou telefòn nan.", ok: "Dekonekte", danje: true }))) return;
    await db.wipe();
    moi = null;
    await api.clearSession();
    go("#/login");
  };
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
const FORM = /^#\/(kliyan\/nouvo|kliyan\/[\w-]+\/modifye|cycle\/nouvo|tx\/nouvo|ajan)/;
async function render() {
  const r = location.hash || "#/";
  const s = api.getSession();
  await updateBar();
  updateNav();
  if (!s || !moi || r === "#/login") return viewLogin(s?.expired);
  let m;
  if (r === "#/" || r === "#") return viewTablo();
  if (r === "#/kliyan") return viewKliyan();
  if (r === "#/epay") return viewEpay();
  if (r === "#/rapo") return viewRapo();
  if (r === "#/kliyan/nouvo") return viewClientNew();
  if ((m = r.match(/^#\/kliyan\/([\w-]+)\/modifye$/))) return viewClientEdit(m[1]);
  if ((m = r.match(/^#\/kliyan\/([\w-]+)$/))) return viewClient(m[1]);
  if ((m = r.match(/^#\/chwazi\/(cycle|tx)$/))) return viewPick(m[1]);
  if ((m = r.match(/^#\/cycle\/nouvo\/([\w-]+)$/))) return viewCycleNew(m[1]);
  if ((m = r.match(/^#\/cycle\/([\w-]+)$/))) return viewCycle(m[1]);
  if ((m = r.match(/^#\/tx\/nouvo\/([\w-]+)$/))) return viewTxNew(m[1]);
  if (r === "#/param" || r === "#/senk") return viewSync();
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
    const reg = await navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW", e));
    reg?.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw?.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          const t = document.createElement("button");
          t.className = "toast info update";
          t.textContent = "Nouvo vèsyon disponib · Peze pou rechaje";
          t.onclick = () => {
            navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
            nw.postMessage("skipWaiting");
          };
          document.body.appendChild(t);
        }
      });
    });
  }
}
boot();
