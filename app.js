import * as db from "./db.js";
import * as api from "./api.js";
import * as S from "./sync.js";

const $app = document.getElementById("app");
const $bar = document.getElementById("bar");
const C = window.GRANDON_CONFIG;

// ---------- Ti zouti ----------
const h = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const gd = (n) => `${nf.format(Number(n) || 0)} G`;
const datFr = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const lè = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: C.FUSEAU }) : "jamè");
const non = (c) => `${c?.prenom || ""} ${c?.nom || ""}`.trim() || "—";
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
const JOU = ["", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi", "Dimanch"];
const JOU_KOUT = ["", "Len", "Mad", "Mèk", "Jed", "Van", "Sam", "Dim"];
const lisJou = (j) => (j?.length ? j.map((x) => JOU_KOUT[x]).join(" · ") : "—");

function toast(msg, kind = "ok", ms = 3500) {
  document.querySelectorAll(".toast:not(.update)").forEach((x) => x.remove());
  const t = document.createElement("div");
  t.className = `toast ${kind}`;
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
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
    <a href="#/senk" class="net ${on ? "on" : "off"}" aria-label="Senkronizasyon: ${on ? "anliy" : "offline"}, ${pend} poko voye, ${err} erè">
      <span class="dot"></span>${on ? "Anliy" : "Offline"}
      ${S.isRunning() ? `<span class="spin" aria-hidden="true"></span>` : ""}
      ${pend ? `<span class="cnt">${pend}</span>` : ""}
      ${err ? `<span class="cnt err">${err}!</span>` : ""}
      ${s?.expired ? `<span class="cnt err">Konekte</span>` : ""}
    </a>`;
}

// ---------- Koneksyon ----------
function viewLogin(expired) {
  $app.innerHTML = `
  <section class="login">
    <img src="icons/icon-192.png" alt="" width="76" height="76">
    <h1>Grandon</h1>
    <p class="mut">Aplikasyon ajan ${C.ANVIWONMAN ? `· ${h(C.ANVIWONMAN)}` : ""}</p>
    ${expired ? `<p class="note warn">Sesyon w fini. Konekte ankò: done ki sou telefòn nan ap rete.</p>` : ""}
    <form id="f-login" class="card">
      <label>Telefòn<input name="tel" inputmode="tel" autocomplete="username" placeholder="3700 1234" required></label>
      <label>Modpas<input name="pw" type="password" autocomplete="current-password" required></label>
      <button class="btn pri" type="submit">Konekte</button>
      <p class="err-msg" id="login-err" role="alert"></p>
    </form>
    ${navigator.onLine ? "" : `<p class="note">Fòk ou gen entènèt pou premye koneksyon an.</p>`}
  </section>`;
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
        ? { id: s.user.id, nom: ga.nom, role: ga.role, admin: ga.role === "admin" }
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

// ---------- Akèy ----------
let rechèch = "";
function lisKliyan(M, filtre) {
  const q = filtre.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  return [...M.clients.values()]
    .filter((c) => !q || non(c).toLowerCase().includes(q) || (qd.length >= 3 && String(c.telephone || "").replace(/\D/g, "").includes(qd)) || String(c.code_client || "").toLowerCase().includes(q))
    .sort((a, b) => (b._pending ? 1 : 0) - (a._pending ? 1 : 0) || non(a).localeCompare(non(b)));
}
function liKliyan(M, c, href) {
  const ks = S.comptesDuClient(M, c.id_personne).filter((k) => k._actif);
  return `<a class="row" href="${href}">
    <div><b>${h(non(c))}</b> ${badgePend(c)}
      <div class="mut sm">${h(c.telephone || "")}${ks.length ? ` · ${ks.length} cycle aktif` : " · San cycle aktif"}</div></div>
    <div class="right">${ks[0] ? badgeKont(ks[0]) : ""}</div></a>`;
}

async function viewHome() {
  const M = await S.model();
  const today = S.jodi();
  const pouJodi = [...M.comptes.values()].filter((k) => k._jodiPeman)
    .sort((a, b) => (a._jodi >= a.montant_plan) - (b._jodi >= b.montant_plan));
  const peye = pouJodi.filter((k) => k._jodi >= Number(k.montant_plan || 0)).length;
  $app.innerHTML = `
  <p class="hello">Bonjou ${h(moi.nom.split(" ")[0])} · <span class="mut">${JOU[S.isoJou(today)]} ${datFr(today)}</span></p>
  <div class="actions">
    <a class="act" href="#/kliyan/nouvo"><span aria-hidden="true">＋</span>Nouvo kliyan</a>
    <a class="act" href="#/chwazi/cycle"><span aria-hidden="true">↻</span>Nouvo cycle</a>
    <a class="act" href="#/chwazi/tx"><span aria-hidden="true">G</span>Depo / Retrè</a>
  </div>
  <h2>Peman jodi a <small class="mut">(${peye}/${pouJodi.length})</small></h2>
  <div class="list">${pouJodi.map((k) => { const c = M.clients.get(k.id_personne); return `<a class="row" href="#/tx/nouvo/${k.id_compte_epargne}">
      <div><b>${h(non(c))}</b><div class="mut sm">${h(k.no_compte || "Cycle poko voye")} · plan ${gd(k.montant_plan)}</div></div>
      <div class="right">${k._jodi >= Number(k.montant_plan || 0) ? `<span class="badge ok">✓ ${gd(k._jodi)}</span>` : k._jodi > 0 ? `<span class="badge warn">${gd(k._jodi)}</span>` : `<span class="btn sm pri">Depo</span>`}</div></a>`; }).join("")
    || `<p class="empty">Pa gen peman ki tonbe jodi a.</p>`}</div>
  <h2>Kliyan yo <small class="mut">(${M.clients.size})</small></h2>
  <input id="q" type="search" class="search" placeholder="Chèche non, telefòn, kòd…" aria-label="Chèche kliyan" value="${h(rechèch)}">
  <div class="list" id="list">${lisKliyan(M, rechèch).slice(0, 200).map((c) => liKliyan(M, c, `#/kliyan/${c.id_personne}`)).join("") || `<p class="empty">Pa gen kliyan.</p>`}</div>`;
  const q = document.getElementById("q");
  q.oninput = () => {
    rechèch = q.value;
    document.getElementById("list").innerHTML = lisKliyan(M, rechèch).slice(0, 200).map((c) => liKliyan(M, c, `#/kliyan/${c.id_personne}`)).join("") || `<p class="empty">Anyen pa koresponn.</p>`;
  };
}

// ---------- Nouvo kliyan ----------
async function viewClientNew() {
  const M = await S.model();
  const aktivite = [...new Set([...M.clients.values()].map((c) => c.activite).filter(Boolean))].sort();
  $app.innerHTML = `
  <a href="#/" class="back">‹ Retounen</a>
  <h1>Nouvo kliyan</h1>
  <form id="f" class="card form" novalidate>
    <div class="grid2">
      <label>Prenon *<input name="prenom" required autocomplete="off"></label>
      <label>Non *<input name="nom" required autocomplete="off"></label>
    </div>
    <label>Telefòn * <small class="mut">(8 chif)</small><input name="telephone" inputmode="tel" required placeholder="3700 1234"></label>
    <div class="grid2">
      <label>NIF / CIN<input name="nif" autocomplete="off"></label>
      <label>Sèks<select name="sexe"><option value="">—</option><option value="F">Fi</option><option value="M">Gason</option></select></label>
    </div>
    <label>Aktivite<input name="activite" list="dl-akt" autocomplete="off"><datalist id="dl-akt">${aktivite.map((a) => `<option value="${h(a)}">`).join("")}</datalist></label>
    <label>Adrès<input name="adresse"></label>
    <label>Foto kliyan an<input name="photo" type="file" accept="image/*" capture="environment"></label>
    <img id="prev" class="prev" alt="Foto kliyan an" hidden>
    <div class="gps"><span id="gps-t" class="mut sm" aria-live="polite">GPS: ap chèche…</span><button type="button" class="btn sm" id="gps-b">Rekòmanse</button></div>
    <label class="chk"><input type="checkbox" name="cycle" checked> Kreye yon cycle Grandon touswit apre</label>
    <p class="err-msg" id="err" role="alert"></p>
    <button class="btn pri" type="submit">Anrejistre kliyan an</button>
  </form>`;
  const f = document.getElementById("f");
  let gps = null, photo = null;
  const gpsT = document.getElementById("gps-t");
  const prendGps = async () => {
    gpsT.textContent = "GPS: ap chèche…";
    gps = await getGps();
    gpsT.textContent = gps ? `GPS: ✓ (±${gps.acc} m)` : "GPS: pa jwenn (pa obligatwa)";
  };
  document.getElementById("gps-b").onclick = prendGps;
  prendGps();
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
    if (!v.prenom.trim() || !v.nom.trim()) return (err.textContent = "Mete prenon ak non kliyan an.");
    if (!tel) return (err.textContent = "Nimewo telefòn nan dwe gen 8 chif.");
    const dbl = [...M.clients.values()].find((c) => String(c.telephone || "").replace(/\D/g, "").endsWith(tel));
    if (dbl && !confirm(`${non(dbl)} gen menm telefòn lan deja.\nSe menm moun nan? Peze Anile pou w ale sou fich li.`)) return go(`#/kliyan/${dbl.id_personne}`);
    const id = S.uuid();
    let photo_id = null;
    if (photo) { photo_id = S.uuid(); await db.put("photos", { id: photo_id, blob: photo }); }
    await S.enqueue("client", {
      id, prenom: v.prenom.trim(), nom: v.nom.trim(), telephone: tel, nif: v.nif.trim(), sexe: v.sexe,
      activite: v.activite.trim(), adresse: v.adresse.trim(), gps, photo_id, capture_le: new Date().toISOString(),
    });
    toast(navigator.onLine ? "Kliyan anrejistre." : "Kliyan anrejistre sou telefòn nan. L ap voye lè gen entènèt.");
    go(f.cycle.checked ? `#/cycle/nouvo/${id}` : `#/kliyan/${id}`);
  };
}

// ---------- Fich kliyan ----------
async function viewClient(id) {
  const M = await S.model();
  const c = M.clients.get(id);
  if (!c) { $app.innerHTML = `<a href="#/" class="back">‹ Retounen</a><p class="empty">Kliyan sa a pa sou telefòn nan.</p>`; return; }
  const ks = S.comptesDuClient(M, id);
  let photo = c.photo_url || null;
  if (c.photo_id) { const ph = await db.get("photos", c.photo_id); if (ph) photo = URL.createObjectURL(ph.blob); }
  $app.innerHTML = `
  <a href="#/" class="back">‹ Retounen</a>
  <div class="card head">
    ${photo ? `<img class="avatar" src="${h(photo)}" alt="">` : `<div class="avatar ph" aria-hidden="true">${h((c.prenom || "?")[0])}</div>`}
    <div><h1>${h(non(c))}</h1>
      <div class="mut">${h(c.telephone || "")}${c.code_client ? ` · ${h(c.code_client)}` : ""}</div>
      <div class="mut sm">${h([c.activite, c.adresse].filter(Boolean).join(" · "))}</div>
      ${badgePend(c)}</div>
  </div>
  ${c._error ? `<p class="note err">${h(c._error)} <a href="#/senk">Wè</a></p>` : ""}
  <a class="btn pri block" href="#/cycle/nouvo/${c.id_personne}">＋ Nouvo cycle Grandon</a>
  <h2>Cycle yo</h2>
  <div class="list">${ks.map((k) => `<a class="row" href="#/cycle/${k.id_compte_epargne}">
      <div><b>${h(k.no_compte || "Cycle poko voye")}</b> ${badgePend(k)}
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
  $app.innerHTML = `<a href="#/" class="back">‹ Retounen</a><h1>${titre}</h1>
    ${kind === "cycle" ? `<a class="btn block" href="#/kliyan/nouvo">＋ Nouvo kliyan</a>` : ""}
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
  if (!c) { $app.innerHTML = `<a href="#/" class="back">‹ Retounen</a><p class="empty">Kliyan an pa jwenn.</p>`; return; }
  const plans = M.plans.length ? M.plans : [1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000, 75000, 100000];
  const dènye = S.comptesDuClient(M, idPersonne)[0];
  let freq = FREKANS.includes(dènye?.frequence_semaine) ? dènye.frequence_semaine : 2;
  let jours = dènye?.jours_paiement?.length === freq ? [...dènye.jours_paiement] : [...JOU_DEFO[freq]];
  const planDef = plans.includes(Number(dènye?.montant_plan)) ? Number(dènye.montant_plan) : plans[0];
  $app.innerHTML = `
  <a href="#/kliyan/${idPersonne}" class="back">‹ ${h(non(c))}</a>
  <h1>Nouvo cycle Grandon</h1>
  <p class="mut">${h(non(c))} · ${h(c.telephone || "")}</p>
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
    if (!confirm(`Kreye cycle Grandon pou ${non(c)}?\n${duree} mwa · ${freq}×/semèn (${lisJou(js)})\nPlan: ${gd(plan)} chak fwa`)) return;
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
  if (!k) { $app.innerHTML = `<a href="#/" class="back">‹ Retounen</a><p class="empty">Cycle sa a pa sou telefòn nan.</p>`; return; }
  const c = M.clients.get(k.id_personne);
  const fè = k._joursPeye.size, prevu = k._prevu;
  $app.innerHTML = `
  <a href="${c ? `#/kliyan/${c.id_personne}` : "#/"}" class="back">‹ ${h(c ? non(c) : "Retounen")}</a>
  <h1>${h(k.no_compte || "Cycle poko voye")} ${badgeKont(k)} ${badgePend(k)}</h1>
  ${k._error ? `<p class="note err">${h(k._error)} <a href="#/senk">Wè</a></p>` : ""}
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
  if (!k) { $app.innerHTML = `<a href="#/" class="back">‹ Retounen</a><p class="empty">Cycle la pa jwenn.</p>`; return; }
  const plan = Number(k.montant_plan || 0);
  const disponib = Number(k.solde_actuel || 0) + Math.min(0, k._local); // retrè: sèlman balans valide
  $app.innerHTML = `
  <a href="#/cycle/${k.id_compte_epargne}" class="back">‹ ${h(k.no_compte || "Cycle")}</a>
  <h1>Depo / Retrè</h1>
  <p class="mut">${h(non(c))} · ${h(k.no_compte || "cycle poko voye")} · plan ${gd(plan)}</p>
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
    const t = f.type.value, m = Number(f.montant.value);
    if (!(m > 0)) return (err.textContent = "Mete montan an.");
    if (t === "D" && plan && m < plan && !confirm(`${gd(m)} pi piti pase minimòm plan an (${gd(plan)}). Kontinye?`)) return;
    if (t === "R" && m > disponib) return (err.textContent = `Retrè a depase balans valide a (${gd(disponib)}).`);
    const solde = f.solde.value === "" ? null : Number(f.solde.value);
    if (!confirm(`${t === "D" ? "Depo" : "Retrè"}: ${gd(m)}\n${non(c)}\nKonfime?`)) return;
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const gps = await getGps(5000);
    await S.enqueue("tx", {
      id: S.uuid(), compte: k.id_compte_epargne, type: t, montant: m, solde_declare: solde, note: f.note.value.trim() || null,
      gps, capture_le: new Date().toISOString(), appareil: S.appareil(),
    }, k._pending ? [k.id_compte_epargne] : []);
    toast(t === "D" ? "Depo anrejistre." : "Retrè anrejistre.");
    go(`#/cycle/${k.id_compte_epargne}`);
  };
}

// ---------- Senkronizasyon ----------
const KIND = { client: "Kliyan", cycle: "Cycle", tx: "Tranzaksyon" };
function resume(o, M) {
  const p = o.payload;
  if (o.kind === "client") return `${p.prenom} ${p.nom} · ${p.telephone}`;
  if (o.kind === "cycle") return `${non(M.clients.get(p.id_personne))} · ${p.duree} mwa · ${p.frequence}×/sem · ${gd(p.montant)}`;
  const k = M.comptes.get(p.compte);
  return `${p.type === "D" ? "Depo" : "Retrè"} ${gd(p.montant)} · ${non(k && M.clients.get(k.id_personne))}`;
}
async function viewSync() {
  const M = await S.model();
  const s = api.getSession();
  $app.innerHTML = `
  <a href="#/" class="back">‹ Retounen</a>
  <h1>Senkronizasyon</h1>
  <div class="card">
    <div class="kv"><span>Koneksyon</span><b>${navigator.onLine ? "Anliy" : "Offline"}</b></div>
    <div class="kv"><span>Dènye senk</span><b>${lè(await db.meta("last_sync"))}</b></div>
    <div class="kv"><span>Dènye telechajman</span><b>${lè(await db.meta("last_pull"))}</b></div>
    <div class="kv"><span>Ajan</span><b>${h(moi.nom)}</b></div>
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
  ${moi.admin ? `<a class="btn block" href="#/ajan">Jere ajan yo</a>` : ""}
  <button class="btn block" id="logout">Dekonekte</button>`;
  document.getElementById("sync").onclick = async () => {
    const r = await S.run();
    r.notices.forEach((n) => toast(n, "info", 6000));
    toast(r.offline ? "Pa gen koneksyon." : r.session ? "Konekte ankò." : r.errors ? `${r.errors} erè.` : "Senkronizasyon fini ✓", r.errors || r.offline ? "err" : "ok");
    render();
  };
  $app.querySelectorAll("[data-retry]").forEach((b) => (b.onclick = () => S.retryOp(Number(b.dataset.retry)).then(render)));
  $app.querySelectorAll("[data-drop]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Efase operasyon sa a ak tout sa ki depann de li? Sa p ap ka defèt.")) return;
    const n = await S.dropOp(Number(b.dataset.drop));
    toast(`${n} operasyon efase.`);
    render();
  }));
  document.getElementById("logout").onclick = async () => {
    if (M.outbox.length) return alert(`Gen ${M.outbox.length} operasyon ki poko voye. Senkronize yo anvan w dekonekte.`);
    if (!confirm("Dekonekte? Done yo ap efase sou telefòn nan.")) return;
    await db.wipe();
    moi = null;
    await api.clearSession();
    go("#/login");
  };
}

// ---------- Jesyon ajan (admin, anliy sèlman) ----------
const WOL = { agent: "Ajan", manager: "Manadjè", admin: "Admin" };
async function viewAjan() {
  $app.innerHTML = `<a href="#/senk" class="back">‹ Retounen</a><h1>Ajan yo</h1>
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
        const mp = prompt("Nouvo modpas (omwen 8 karaktè):");
        if (!mp) return;
        try { await api.kont({ aksyon: "modpas", telefon: b.dataset.mp, modpas: mp }); toast("Modpas la chanje."); }
        catch (e) { toast(e.message, "err"); }
      }));
      lis.querySelectorAll("[data-ak]").forEach((b) => (b.onclick = async () => {
        if (b.dataset.ak === "desactiver" && !confirm("Dezaktive kont sa a? Ajan an p ap ka konekte ankò.")) return;
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
const FORM = /^#\/(kliyan\/nouvo|cycle\/nouvo|tx\/nouvo|ajan)/;
async function render() {
  const r = location.hash || "#/";
  const s = api.getSession();
  await updateBar();
  if (!s || !moi || r === "#/login") return viewLogin(s?.expired);
  let m;
  if (r === "#/" || r === "#") return viewHome();
  if (r === "#/kliyan/nouvo") return viewClientNew();
  if ((m = r.match(/^#\/kliyan\/([\w-]+)$/))) return viewClient(m[1]);
  if ((m = r.match(/^#\/chwazi\/(cycle|tx)$/))) return viewPick(m[1]);
  if ((m = r.match(/^#\/cycle\/nouvo\/([\w-]+)$/))) return viewCycleNew(m[1]);
  if ((m = r.match(/^#\/cycle\/([\w-]+)$/))) return viewCycle(m[1]);
  if ((m = r.match(/^#\/tx\/nouvo\/([\w-]+)$/))) return viewTxNew(m[1]);
  if (r === "#/senk") return viewSync();
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
