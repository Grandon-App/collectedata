import * as db from "./db.js";
import * as api from "./api.js";
import * as S from "./sync.js";
import * as ui from "./ui.js";
import * as TX from "./taxonomy.js";
import { t, setLang, getLang, demarrerTraduction } from "./i18n.js";

const $app = document.getElementById("app");
const $bar = document.getElementById("bar");
const C = window.GRANDON_CONFIG;

// ---------- Ti zouti ----------
const APP_VERSION = "2.2";
const WOL = { agent: "Ajan", manager: "Manadjè", admin: "Admin" };
// Preferans aparans: pou aparèy sa a sèlman.
function prefs() {
  try { return { tem: "auto", teks: "n", ...JSON.parse(localStorage.getItem("grandon-prefs") || "{}") }; }
  catch { return { tem: "auto", teks: "n" }; }
}
function applyPrefs(p = prefs()) {
  const r = document.documentElement;
  if (p.tem === "auto") delete r.dataset.theme; else r.dataset.theme = p.tem;
  r.dataset.teks = p.teks;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = "#14284b";
}
function savePrefs(p) {
  try { localStorage.setItem("grandon-prefs", JSON.stringify(p)); } catch { /* navigatè prive */ }
  applyPrefs(p);
}
const ICO = {
  tablo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z"/></svg>',
  kliyan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.7-7 4v2h14v-2c0-2.3-3.7-4-7-4zm8-2a3 3 0 1 0 0-6v6zm1 2.2c1.8.6 4 1.7 4 3.8v2h-4v-2c0-1.5-.7-2.8-1.8-3.8z"/></svg>',
  epay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-2-2v2H5V5zm2 14H5V9h14zm-4-6h3v3h-3z"/></svg>',
  rapo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5zm2 2v14h10V8h-3V5zm2 7h6v2H9zm0 4h6v2H9zm0-8h3v2H9z"/></svg>',
  param: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.3 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.3-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
};
const h = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const gd = (n) => `${nf.format(Number(n) || 0)} G`;
const datFr = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const lè = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: C.FUSEAU }) : "jamè");
const d = (v) => `<span data-brut>${h(v)}</span>`;
const adopteInfo = (r) => ({ id: r.id_personne, prenom: r.prenom, nom: r.nom, code_client: r.code_client, photo_url: r.photo_url, tel4: r.tel4 });
const non = (c) => `${c?.prenom || ""} ${c?.nom || ""}`.trim() || "—";
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
const JOU = ["", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi", "Dimanch"];
const JOU_KOUT = ["", "Len", "Mad", "Mèk", "Jed", "Van", "Sam", "Dim"];
const lisJou = (j) => (j?.length ? j.map((x) => JOU_KOUT[x]).join(" · ") : "—");

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

const badgePend = (o) => (o?._error ? `<span class="badge err">Erè sync</span>` : o?._pending ? `<span class="badge pend">Poko voye</span>` : "");
const badgeTx = (t) => t._error ? `<span class="badge err">Erè</span>` : t._pending ? `<span class="badge pend">Poko voye</span>`
  : t.validation_status === "pending" ? `<span class="badge warn">An atant validasyon</span>`
  : t.validation_status === "rejected" ? `<span class="badge err">Refize</span>` : "";
const badgeKont = (k) => !k._actif ? `<span class="badge mut">Fini</span>`
  : k._jodiPeman ? (k._jodi >= Number(k.montant_plan || 0) ? `<span class="badge ok">Peye jodi a</span>` : `<span class="badge info">Peman jodi a</span>`) : `<span class="badge ok">Aktif</span>`;

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
    <a href="#/" class="brand"><img src="icons/icon-192.png" alt="" width="26" height="26">Grandon ${C.ANVIWONMAN ? `<small>${h(C.ANVIWONMAN)}</small>` : ""}</a>
    <a href="#/param" class="net ${on ? "on" : "off"}" aria-label="Senkronizasyon: ${on ? "anliy" : "offline"}, ${pend} poko voye, ${err} erè">
      <span class="dot"></span>${on ? "Anliy" : "Offline"}
      ${S.isRunning() ? `<span class="spin" aria-hidden="true"></span>` : ""}
      ${pend ? `<span class="cnt">${pend}</span>` : ""}
      ${err ? `<span class="cnt err">${err}!</span>` : ""}
      ${s?.expired ? `<span class="cnt err">Konekte</span>` : ""}
    </a>`;
}

// ---------- Ba navigasyon anba ----------
const $nav = document.getElementById("nav");
const TABS = [["tablo", "#/", "Tablo"], ["kliyan", "#/kliyan", "Kliyan"], ["epay", "#/epay", "Epay"], ["rapo", "#/rapo", "Rapò"], ["param", "#/param", "Paramèt"]];
function tabActif(r) {
  if (/^#\/(kliyan)/.test(r)) return "kliyan";
  if (/^#\/(epay|cycle|tx|chwazi)/.test(r)) return "epay";
  if (/^#\/rapo/.test(r)) return "rapo";
  if (/^#\/(param|ajan)/.test(r)) return "param";
  return "tablo";
}
function updateNav() {
  const r = location.hash || "#/";
  if (!moi || r === "#/login") { $nav.hidden = true; document.body.classList.remove("has-nav"); return; }
  const a = tabActif(r);
  $nav.hidden = false;
  document.body.classList.add("has-nav");
  $nav.innerHTML = TABS.map(([k, href, label]) => `<a href="${href}" class="${k === a ? "on" : ""}" ${k === a ? 'aria-current="page"' : ""}>${ICO[k]}<span>${label}</span></a>`).join("");
}

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
        ? { id: s.user.id, nom: ga.nom, role: ga.role, admin: ga.role === "admin", tel: api.telefon8(f.tel.value) }
        : { id: s.user.id, nom: `${p.firstname || ""} ${p.name || ""}`.trim() || s.user.email, role: Number(p.role), admin: Number(p.role) === 1 };
      await db.meta("owner", s.user.id);
      await db.meta("moi", moi);
      navigator.storage?.persist?.();
      b.textContent = "Ap telechaje done yo…";
      await S.run();
      go("#/");
    } catch (err) {
      out.textContent = err.message;
      b.disabled = false; b.textContent = "Konekte";
    }
  };
}

// ---------- Lis kliyan (pati komen) ----------
const tel4 = (c) => (c.telephone ? String(c.telephone).replace(/\D/g, "").slice(-4) : c.tel4 || "");
const avatar = (c, cls = "thumb") => c.photo_url
  ? `<img class="${cls}" src="${h(c.photo_url)}" alt="" loading="lazy" data-legend="${h(non(c))}">`
  : `<span class="${cls} ph" aria-hidden="true">${h((c.prenom || "?")[0])}</span>`;
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
  const today = S.jodi();
  $app.innerHTML = `
  <p class="hello">Bonjou ${h(moi.nom.split(" ")[0])} · <span class="mut">${JOU[S.isoJou(today)]} ${datFr(today)}</span></p>
  <div class="card soon">
    <div class="soon-ico" aria-hidden="true">${ICO.tablo}</div>
    <h1>Tablo de bò</h1>
    <p class="mut">Paj sa a ap vini byento.</p>
    <div class="soon-links">
      <a class="btn" href="#/kliyan">Kliyan</a><a class="btn" href="#/epay">Epay</a><a class="btn" href="#/rapo">Rapò</a>
    </div>
  </div>`;
}

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

// ---------- 3. Epay: kont ak cycle aktif, tranzaksyon ----------
let filtEpay = "";
async function viewEpay() {
  const M = await S.model();
  const pouJodi = [...M.comptes.values()].filter((k) => k._jodiPeman)
    .sort((a, b) => (a._jodi >= a.montant_plan) - (b._jodi >= b.montant_plan));
  const peye = pouJodi.filter((k) => k._jodi >= Number(k.montant_plan || 0)).length;
  const aktif = [...M.comptes.values()].filter((k) => k._actif)
    .sort((a, b) => non(M.clients.get(a.id_personne)).localeCompare(non(M.clients.get(b.id_personne))));
  const txs = [...M.txs.values()].sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction))).slice(0, 30);
  const liKont = (k) => { const c = M.clients.get(k.id_personne) || {}; return `<div class="row">
      <a class="grow lnk" href="#/cycle/${k.id_compte_epargne}"><b>${d(non(c))}</b> ${badgePend(k)}
        <div class="mut sm">${d(k.no_compte || "Cycle poko voye")} · plan ${gd(k.montant_plan)}</div>
        <div class="mut sm">${k.frequence_semaine ? `${k.frequence_semaine}×/sem · ${lisJou(k.jours_paiement)}` : "—"} · ${gd(k._total)}</div></a>
      <a class="btn sm pri" href="#/tx/nouvo/${k.id_compte_epargne}">Depo</a></div>`; };
  $app.innerHTML = `
  <div class="page-head"><h1>Epay</h1><a class="btn pri" href="#/chwazi/cycle">＋ Nouvo cycle</a></div>
  <h2>Peman jodi a <small class="mut">(${peye}/${pouJodi.length})</small></h2>
  <div class="list grid-t">${pouJodi.map((k) => { const c = M.clients.get(k.id_personne) || {}; return `<a class="row" href="#/tx/nouvo/${k.id_compte_epargne}">
      ${avatar(c)}<div class="grow"><b>${d(non(c))}</b><div class="mut sm">${d(k.no_compte || "Cycle poko voye")} · plan ${gd(k.montant_plan)}</div></div>
      <div class="right">${k._jodi >= Number(k.montant_plan || 0) ? `<span class="badge ok">✓ ${gd(k._jodi)}</span>` : k._jodi > 0 ? `<span class="badge warn">${gd(k._jodi)}</span>` : `<span class="btn sm pri">Depo</span>`}</div></a>`; }).join("")
    || `<p class="empty">Pa gen peman ki tonbe jodi a.</p>`}</div>
  <h2>Kont ak cycle aktif <small class="mut">(${aktif.length})</small></h2>
  <input id="q" type="search" class="search" placeholder="Chèche kliyan oswa nimewo kont…" aria-label="Chèche kont" value="${h(filtEpay)}">
  <div class="list grid-t" id="kont"></div>
  <h2>Dènye tranzaksyon yo</h2>
  <div class="list">${txs.map((t) => { const k = M.comptes.get(t.id_compte_epargne); const c = k && M.clients.get(k.id_personne); return `<a class="row" href="#/cycle/${t.id_compte_epargne}">
      <div class="grow"><b>${t.type_transaction === "D" ? "Depo" : "Retrè"}</b> · ${d(non(c))} ${badgeTx(t)}
        <div class="mut sm">${d(k?.no_compte || "")} · ${S.jouTx(t) === S.jodi() ? "jodi a" : datFr(S.jouTx(t))}</div></div>
      <div class="right"><b class="${t.type_transaction === "D" ? "in" : "out"}">${t.type_transaction === "D" ? "+" : "−"}${gd(t.montant)}</b></div></a>`; }).join("") || `<p class="empty">Poko gen tranzaksyon.</p>`}</div>`;
  const q = document.getElementById("q");
  const draw = () => {
    const v = filtEpay.trim().toLowerCase();
    const l = aktif.filter((k) => !v || non(M.clients.get(k.id_personne)).toLowerCase().includes(v) || String(k.no_compte || "").toLowerCase().includes(v));
    document.getElementById("kont").innerHTML = l.map(liKont).join("") || `<p class="empty">${v ? "Anyen pa koresponn." : "Pa gen kont ak cycle aktif."}</p>`;
  };
  q.oninput = () => { filtEpay = q.value; draw(); };
  draw();
}

// ---------- 4. Rapò ajan an (3 dènye jou) ----------
let jouRapo = 0;
async function viewRapo() {
  const M = await S.model();
  const jou = [0, 1, 2].map((n) => S.ajouteJou(S.jodi(), -n));
  const D = jou[jouRapo];
  const mwen = (x) => x.created_by === moi.id || x.created_by === "moi";
  const txs = [...M.txs.values()].filter((t) => mwen(t) && S.jouTx(t) === D && t.validation_status !== "rejected")
    .sort((a, b) => String(b.date_transaction).localeCompare(String(a.date_transaction)));
  const dep = txs.filter((t) => t.type_transaction === "D"), ret = txs.filter((t) => t.type_transaction === "R");
  const sum = (l) => l.reduce((a, t) => a + Number(t.montant || 0), 0);
  const depo = sum(dep), retre = sum(ret);
  const deklare = txs.reduce((a, t) => a + Number(t.solde_declare || 0), 0);
  const nDeklare = txs.filter((t) => t.solde_declare != null && t.solde_declare !== "").length;
  const cycles = [...M.comptes.values()].filter((k) => mwen(k) && k.created_at && S.jouLokal(new Date(k.created_at)) === D).length;
  const poko = txs.filter((t) => t._pending).length;
  const nonJou = (n) => (n === 0 ? "Jodi a" : n === 1 ? "Yè" : "Avan-yè");
  $app.innerHTML = `
  <div class="page-head"><h1>Rapò</h1></div>
  <div class="chips" role="tablist">${jou.map((d, i) => `<button role="tab" aria-selected="${i === jouRapo}" class="chip ${i === jouRapo ? "on" : ""}" data-j="${i}">${nonJou(i)}<small>${datFr(d)}</small></button>`).join("")}</div>
  <div class="kpis">
    <div class="kpi"><span>Depo ankese</span><b class="in">${gd(depo)}</b><small>${dep.length} depo</small></div>
    <div class="kpi"><span>Retrè</span><b class="out">${ret.length}</b><small>${gd(retre)}</small></div>
    <div class="kpi"><span>Balans deklare (total)</span><b>${gd(deklare)}</b><small>${nDeklare} kont deklare</small></div>
    <div class="kpi"><span>Cycle kreye</span><b>${cycles}</b><small>${nonJou(jouRapo).toLowerCase()}</small></div>
    <div class="kpi main"><span>Kach nan men pou remèt nan kès</span><b>${gd(depo - retre)}</b><small>Depo − retrè</small></div>
  </div>
  ${poko ? `<p class="note warn">${poko} tranzaksyon poko voye: yo konte nan rapò a, men sèvè a poko resevwa yo.</p>` : ""}
  <h2>Tranzaksyon mwen yo <small class="mut">(${txs.length})</small></h2>
  <div class="list">${txs.map((t) => { const k = M.comptes.get(t.id_compte_epargne); const c = k && M.clients.get(k.id_personne); return `<div class="row">
      <div class="grow"><b>${t.type_transaction === "D" ? "Depo" : "Retrè"}</b> · ${d(non(c))} ${badgeTx(t)}
        <div class="mut sm">${d(k?.no_compte || "")}${t.solde_declare != null && t.solde_declare !== "" ? ` · balans deklare ${gd(t.solde_declare)}` : ""}</div></div>
      <div class="right"><b class="${t.type_transaction === "D" ? "in" : "out"}">${t.type_transaction === "D" ? "+" : "−"}${gd(t.montant)}</b></div></div>`; }).join("") || `<p class="empty">Pa gen tranzaksyon ${nonJou(jouRapo).toLowerCase()}.</p>`}</div>`;
  $app.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { jouRapo = Number(b.dataset.j); viewRapo(); }));
}

// ---------- Chan okipasyon (komen pou nouvo kliyan ak modifye) ----------
const opt = (v, cur, label = v) => `<option value="${h(v)}" ${v === cur ? "selected" : ""}>${h(label)}</option>`;
function champsOccupation(c = {}) {
  const sec = c.secteur || (c.activite && TX.secteurDe(c.activite)) || "";
  return `
    <label>Kote biznis la <small class="mut">(ri, mache, zòn)</small><input name="lieu_de_travail" value="${h(c.lieu_de_travail || "")}" autocomplete="off"></label>
    <label>Adrès<input name="adresse" value="${h(c.adresse || "")}" autocomplete="off"></label>
    <label>Okipasyon<input name="occupation" value="${h(c.occupation || "")}" placeholder="Commerçante, Entrepreneur…" autocomplete="off"></label>
    <div class="grid2">
      <label>Sektè<select name="secteur"><option value="">Chwazi…</option>${Object.keys(TX.SECTEURS).map((x) => opt(x, sec)).join("")}</select></label>
      <label>Aktivite<select name="activite" ${sec ? "" : "disabled"}>${sec ? `<option value="">Chwazi…</option>${TX.SECTEURS[sec].map((x) => opt(x, c.activite)).join("")}` : `<option value="">Chwazi sektè a anvan</option>`}</select></label>
    </div>
    <div class="grid2">
      <label>Pwen de vant<select name="point_de_vente"><option value="">Chwazi…</option>${TX.POINTS_DE_VENTE.map((x) => opt(x, c.point_de_vente)).join("")}</select></label>
      <label>Kapasite distribisyon<select name="capacite_distribution"><option value="">Chwazi…</option>${TX.CAPACITES.map((x) => opt(x, c.capacite_distribution)).join("")}</select></label>
    </div>`;
}
const PIECES = ["NIF", "CIN", "Passeport"];
const ageMax = () => S.ajouteJou(S.jodi(), -16 * 365 - 4);
function champsIdentite(c = {}) {
  return `
    <label>Pseudo <small class="mut">(non yo konnen l)</small><input name="pseudo" value="${h(c.pseudo || "")}" autocomplete="off"></label>
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
    <label>Telefòn * <small class="mut">(8 chif)</small><input name="telephone" inputmode="tel" required placeholder="3700 1234"></label>
    <div id="dbl" aria-live="polite"></div>
    <label>Sèks<select name="sexe"><option value="">—</option><option value="F">Fi</option><option value="M">Gason</option></select></label>
    ${champsIdentite()}
    ${champsOccupation()}
    <label>Foto kliyan an<input name="photo" type="file" accept="image/*" capture="environment"></label>
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
  const ks = S.comptesDuClient(M, id);
  let photo = c.photo_url || null;
  if (c.photo_id) { const ph = await db.get("photos", c.photo_id); if (ph) photo = URL.createObjectURL(ph.blob); }
  const gpsOk = c.gps_lat != null && c.gps_lng != null;
  const li = (k, v, brut = true) => `<div class="kv"><span>${k}</span><b>${v ? (brut ? d(v) : v) : `<span class="mut">—</span>`}</b></div>`;
  $app.innerHTML = `
  <a href="#/kliyan" class="back">‹ Kliyan</a>
  <div class="card head">
    ${photo ? `<img class="avatar" src="${h(photo)}" alt="" data-legend="${d(non(c))}" title="Peze foto a pou wè l pi gwo">` : `<div class="avatar ph" aria-hidden="true">${h((c.prenom || "?")[0])}</div>`}
    <div class="grow"><h1>${d(non(c))}</h1>
      <div class="mut">${d(c.code_client || t("ID poko vini"))}</div>
      ${badgePend(c)}</div>
  </div>
  ${c._error ? `<p class="note err">${d(t(c._error))} <a href="#/param">Wè</a></p>` : ""}
  <div class="page-head sub"><h2>Enfòmasyon kliyan an</h2><a class="btn sm" href="#/kliyan/${id}/modifye">Modifye</a></div>
  <div class="card info">
    ${li("Telefòn", c.telephone ? `<a href="tel:${h(String(c.telephone).replace(/\D/g, ""))}" data-brut>${h(c.telephone)}</a>` : c.tel4 ? `•••• ${c.tel4}` : "", false)}
    ${li("Pseudo", c.pseudo)}
    ${li("Dat nesans", c.date_naissance ? `${datFr(c.date_naissance)} · ${age(c.date_naissance)} ${getLang() === "fr" ? "ans" : "an"}` : "", false)}
    ${li("Pyès idantifikasyon", c.piece ? `${h(c.piece)} · ${d(c.numero_piece || "—")}` : c.numero_piece ? d(c.numero_piece) : "", false)}
    ${li("Adrès", c.adresse)}
    ${li("Kote biznis la", c.lieu_de_travail)}
    ${li("GPS", gpsOk ? `<span class="badge ok">GPS aktive</span> <a href="https://maps.google.com/?q=${c.gps_lat},${c.gps_lng}" target="_blank" rel="noopener">Wè sou kat la</a>` : `<span class="badge warn">Pa gen GPS</span>`, false)}
    ${li("Okipasyon", c.occupation)}
    ${li("Sektè", c.secteur || (c.activite && TX.secteurDe(c.activite)))}
    ${li("Aktivite", c.activite)}
    ${li("Pwen de vant", c.point_de_vente)}
    ${li("Kapasite distribisyon", c.capacite_distribution)}
  </div>
  <a class="btn pri block" href="#/cycle/nouvo/${c.id_personne}">＋ Nouvo cycle Grandon</a>
  <h2>Cycle yo</h2>
  <div class="list">${ks.map((k) => `<a class="row" href="#/cycle/${k.id_compte_epargne}">
      <div class="grow"><b>${d(k.no_compte || t("Cycle poko voye"))}</b> ${badgePend(k)}
        <div class="mut sm">Plan ${gd(k.montant_plan)} · ${k.frequence_semaine ? `${k.frequence_semaine}×/sem (${lisJou(k.jours_paiement)})` : "—"}</div>
        <div class="mut sm">${datFr(k.date_debut)} → ${datFr(k.date_fin)}</div></div>
      <div class="right"><b>${gd(k._total)}</b><br>${badgeKont(k)}</div></a>`).join("") || `<p class="empty">Pa gen cycle.</p>`}</div>`;
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
      <div class="jours" id="jours">${[1, 2, 3, 4, 5, 6, 7].map((j) => `<label><input type="checkbox" name="jou" value="${j}"><span>${JOU_KOUT[j]}</span></label>`).join("")}</div>
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
    const n = S.joursPeman(debut, fin, jours);
    document.getElementById("recap").innerHTML = `
      <div><span>Fen cycle a</span><b>${datFr(fin)}</b></div>
      <div><span>Jou peman</span><b>${jours.length === freq ? lisJou([...jours].sort()) : "—"}</b></div>
      <div><span>Minimòm pa semèn</span><b>${gd(plan * freq)}</b></div>
      <div><span>Minimòm sou ${duree} mwa</span><b>${jours.length === freq ? `${gd(plan * n)}` : "—"}</b><small class="mut">${jours.length === freq ? `${n} peman` : ""}</small></div>`;
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
      ["Jou peman", js.map((j) => t(JOU[j])).join(", ")], ["Plan", `${gd(plan)}`], ["Fen cycle a", datFr(S.ajouteMwa(debut, duree))]] }))) return;
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
  const k = M.comptes.get(id);
  if (!k) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Cycle sa a pa sou telefòn nan.</p>`; return; }
  const c = M.clients.get(k.id_personne);
  const fè = k._joursPeye.size, prevu = k._prevu;
  $app.innerHTML = `
  <a href="#/epay" class="back">‹ Epay</a>
  <h1>${d(k.no_compte || "Cycle poko voye")} ${badgeKont(k)} ${badgePend(k)}</h1>
  ${k._error ? `<p class="note err">${h(k._error)} <a href="#/param">Wè</a></p>` : ""}
  <div class="card solde"><span>Total kliyan an mete</span><b>${gd(k._total)}</b>
    <small class="mut">Balans valide: ${gd(k.solde_actuel)}${Number(k.depo_an_atant) ? ` · an atant validasyon: ${gd(k.depo_an_atant)}` : ""}${k._local ? ` · poko voye: ${gd(k._local)}` : ""}</small></div>
  <div class="card stats">
    <div><span>Plan (minimòm)</span><b>${gd(k.montant_plan)}</b></div>
    <div><span>Frekans</span><b>${k.frequence_semaine ? `${k.frequence_semaine}× pa semèn` : "—"}</b></div>
    <div class="wide"><span>Jou peman</span><b>${k.jours_paiement?.length ? k.jours_paiement.map((j) => JOU[j]).join(", ") : "—"}</b></div>
    <div><span>Kòmanse</span><b>${datFr(k.date_debut)}</b></div>
    <div><span>Fini</span><b>${datFr(k.date_fin)}</b></div>
    ${k.jours_paiement?.length ? `<div class="wide"><span>Peman jiska jodi a</span><b>${fè} jou peye · ${prevu} jou prevwa</b>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${prevu}" aria-valuenow="${fè}"><i style="width:${prevu ? Math.min(100, (fè / prevu) * 100) : 0}%"></i></div></div>` : ""}
  </div>
  ${k._actif ? `<a class="btn pri block" href="#/tx/nouvo/${k.id_compte_epargne}">＋ Depo / Retrè</a>` : ""}
  <h2>Tranzaksyon</h2>
  <div class="list">${k._txs.map((t) => `<div class="row">
      <div><b>${t.type_transaction === "D" ? "Depo" : "Retrè"}</b> ${badgeTx(t)}
        <div class="mut sm">${t._pending ? lè(t.date_transaction) : datFr(t.date_transaction)}</div>
        ${t._error ? `<div class="err-msg sm">${h(t._error)}</div>` : ""}</div>
      <div class="right"><b class="${t.type_transaction === "D" ? "in" : "out"}">${t.type_transaction === "D" ? "+" : "−"}${gd(t.montant)}</b></div></div>`).join("") || `<p class="empty">Poko gen tranzaksyon.</p>`}</div>`;
}

// ---------- Nouvo tranzaksyon ----------
async function viewTxNew(compteId) {
  const M = await S.model();
  const k = M.comptes.get(compteId);
  const c = k && M.clients.get(k.id_personne);
  if (!k) { $app.innerHTML = `<a href="#/epay" class="back">‹ Epay</a><p class="empty">Cycle la pa jwenn.</p>`; return; }
  const plan = Number(k.montant_plan || 0);
  const disponib = Number(k.solde_actuel || 0) + Math.min(0, k._local); // retrè: sèlman balans valide
  $app.innerHTML = `
  <a href="#/cycle/${k.id_compte_epargne}" class="back">‹ ${d(k.no_compte || "Cycle")}</a>
  <h1>Depo / Retrè</h1>
  <p class="mut">${d(non(c))} · ${d(k.no_compte || "cycle poko voye")} · plan ${gd(plan)}</p>
  <form id="f" class="card form" novalidate>
    <fieldset class="field"><legend class="sr">Tip</legend><div class="seg">
      <label><input type="radio" name="type" value="D" checked><span>Depo</span></label>
      <label><input type="radio" name="type" value="R"><span>Retrè</span></label></div></fieldset>
    <label>Montan (goud) *<input name="montant" type="number" inputmode="decimal" min="1" step="any" required value="${plan || ""}"></label>
    <p class="mut sm" id="hint"></p>
    <label>Balans sou kanè a apre tranzaksyon an <small class="mut">(opsyonèl)</small><input name="solde" type="number" inputmode="decimal" step="any"></label>
    <label>Nòt<textarea name="note" rows="2"></textarea></label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">Anrejistre</button>
  </form>`;
  const f = document.getElementById("f");
  const hint = () => {
    document.getElementById("hint").textContent = f.type.value === "D"
      ? `Minimòm plan an: ${gd(plan)}${k._jodi ? ` · deja peye jodi a: ${gd(k._jodi)}` : ""}`
      : `Balans valide disponib: ${gd(disponib)}`;
  };
  f.querySelectorAll('input[name="type"]').forEach((r) => (r.onchange = () => { f.montant.value = r.value === "D" ? plan || "" : ""; hint(); }));
  hint();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    const typ = f.type.value, m = Number(f.montant.value);
    if (!(m > 0)) return (err.textContent = "Mete montan an.");
    if (typ === "D" && plan && m < plan && !(await ui.ask({ titre: "Montan an pi piti pase plan an", ikon: "!", ok: "Kontinye",
      detay: [["Montan (goud)", gd(m)], ["Minimòm plan an", gd(plan)]] }))) return;
    if (typ === "R" && m > disponib) return (err.textContent = `Retrè a depase balans valide a (${gd(disponib)}).`);
    const solde = f.solde.value === "" ? null : Number(f.solde.value);
    if (!(await ui.ask({ titre: typ === "D" ? "Depo" : "Retrè", ok: "Konfime", foto: c?.photo_url, ikon: typ === "D" ? "+" : "−",
      detay: [["Kliyan", non(c)], ["Kont", k.no_compte || t("cycle poko voye")], ["Montan (goud)", gd(m)],
        ...(f.solde.value !== "" ? [["Balans sou kanè a apre tranzaksyon an", gd(f.solde.value)]] : [])] }))) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const gps = await getGps(5000);
    await S.enqueue("tx", {
      id: S.uuid(), compte: k.id_compte_epargne, type: typ, montant: m, solde_declare: solde, note: f.note.value.trim() || null,
      gps, capture_le: new Date().toISOString(), appareil: S.appareil(),
    }, k._pending ? [k.id_compte_epargne] : []);
    toast(typ === "D" ? "Depo anrejistre." : "Retrè anrejistre.");
    go(`#/cycle/${k.id_compte_epargne}`);
  };
}

// ---------- Senkronizasyon ----------
const KIND = { client: "Kliyan", adopte: "Kliyan (ajoute)", maj: "Enfòmasyon kliyan an", cycle: "Cycle", tx: "Tranzaksyon" };
function resume(o, M) {
  const p = o.payload;
  if (o.kind === "client") return `${p.prenom} ${p.nom} · ${p.telephone}`;
  if (o.kind === "adopte") return `${p.prenom} ${p.nom} · ${p.code_client || ""}`;
  if (o.kind === "maj") return non(M.clients.get(p.id));
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
    <fieldset class="field"><legend>Lang</legend><div class="seg"><label><input type="radio" name="lang" value="ht" ${getLang() === "ht" ? "checked" : ""}><span data-brut>Kreyòl</span></label><label><input type="radio" name="lang" value="fr" ${getLang() === "fr" ? "checked" : ""}><span data-brut>Français</span></label></div></fieldset>
    <fieldset class="field"><legend>Tèm</legend><div class="seg s3">
      ${[["auto", "Otomatik"], ["light", "Klè"], ["dark", "Fonse"]].map(([v, l]) => `<label><input type="radio" name="tem" value="${v}" ${pref.tem === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
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
      <div><b>${KIND[o.kind]}</b> ${o.status === "erè" ? `<span class="badge err">Erè</span>` : `<span class="badge pend">Poko voye</span>`}
        <div class="mut sm">${h(resume(o, M))} · ${lè(o.created)}</div>
        ${o.error ? `<div class="err-msg sm">${h(o.error)}</div>` : ""}</div>
      ${o.status === "erè" ? `<div class="btns"><button class="btn sm" data-retry="${o.seq}">Eseye ankò</button><button class="btn sm danger" data-drop="${o.seq}">Efase</button></div>` : ""}
    </div>`).join("") || `<p class="empty">Tout bagay voye ✓</p>`}</div>
  ${moi.admin ? `<h2>Administrasyon</h2><a class="btn block" href="#/ajan">Jere ajan yo</a>` : ""}
  <button class="btn block danger" id="logout">Dekonekte</button>
  <p class="mut sm center">Grandon · vèsyon ${h(APP_VERSION)}</p>`;
  $app.querySelectorAll('input[name="lang"]').forEach((r) => (r.onchange = () => { setLang(r.value); location.reload(); }));
  $app.querySelectorAll('input[name="tem"], input[name="teks"]').forEach((r) => (r.onchange = () => {
    savePrefs({ tem: $app.querySelector('input[name="tem"]:checked').value, teks: $app.querySelector('input[name="teks"]:checked').value });
  }));
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
