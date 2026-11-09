// Bwat dyalòg (ranplase confirm/alert/prompt navigatè a) + foto an gwo.
import { t } from "./i18n.js";

const h = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function ouvrir(html, { onOpen } = {}) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t">${html}</div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");
    const fin = (v) => {
      if (wrap.classList.contains("out")) return;
      wrap.classList.add("out");
      document.removeEventListener("keydown", key, true);
      removeEventListener("hashchange", kite);
      setTimeout(() => { wrap.remove(); if (!document.querySelector(".modal-wrap")) document.body.classList.remove("modal-open"); remetFokis(prev); }, 120);
      resolve(v);
    };
    const key = (e) => {
      if (e.key === "Escape") { e.preventDefault(); fin(null); }
      if (e.key === "Tab") { // kenbe fokis la nan bwat la
        const f = [...wrap.querySelectorAll("button, input, a[href]")].filter((x) => !x.disabled);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", key, true);
    const kite = () => fin(null); // bouton «retou» telefòn nan / chanjman paj: fèmen bwat la
    addEventListener("hashchange", kite);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) fin(null); });
    wrap.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => fin(b.dataset.v === "ok" ? (onOpen?.valeur?.() ?? true) : null)));
    onOpen?.(wrap, fin);
    requestAnimationFrame(() => (wrap.querySelector("[autofocus]") || wrap.querySelector("[data-v=ok]"))?.focus());
  });
}

// Kamera nan aplikasyon an (getUserMedia): ajan an wè imaj la, li peze «Pran foto a». Retounen yon Blob JPEG oswa null.
// { erè } si navigatè a pa ka louvri kamera a (pa gen pèmisyon, pa gen kamera).
export async function kamera({ titre = "Pran foto kliyan an" } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) return { erè: t("Navigatè sa a pa ka louvri kamera a. Itilize «Chwazi yon foto».") };
  let stream = null, fasing = "environment", video = null, erè = null;
  const lanse = async () => {
    stream?.getTracks().forEach((x) => x.stop());
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: fasing }, width: { ideal: 1600 }, height: { ideal: 1600 } }, audio: false });
    video.srcObject = stream;
    await video.play().catch(() => {});
  };
  const opts = { onOpen: (w, fin) => {
    video = w.querySelector("video");
    const okb = w.querySelector("[data-v=ok]"), msg = w.querySelector(".kam-err");
    const kòmanse = () => { okb.disabled = true; lanse().then(() => (okb.disabled = false)).catch((e) => {
      erè = e?.name === "NotAllowedError" ? t("Ou pa bay aplikasyon an pèmisyon pou kamera a. Pèmèt kamera a nan paramèt navigatè a.") : t("Kamera a pa ka louvri sou aparèy sa a.");
      msg.textContent = erè; msg.hidden = false; }); };
    kòmanse();
    w.querySelector("[data-vire]").onclick = () => { fasing = fasing === "environment" ? "user" : "environment"; kòmanse(); };
  } };
  opts.onOpen.valeur = () => {
    if (!video?.videoWidth) return null;
    const s = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(video.videoWidth * s); c.height = Math.round(video.videoHeight * s);
    c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
    return c;
  };
  const c = await ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">📷</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    <div class="kam"><video class="kam-v" playsinline muted autoplay></video></div>
    <p class="err-msg sm kam-err" role="alert" hidden></p>
    <div class="modal-b kam-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn" type="button" data-vire>${h(t("Vire kamera a"))}</button><button class="btn pri" data-v="ok" disabled>${h(t("Pran foto a"))}</button></div>`, opts);
  stream?.getTracks().forEach((x) => x.stop());
  if (!c || c === true) return erè ? { erè } : null;
  return await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
}

// Chwazi plizyè opsyon (kaz). opsyon: [[valè, etikèt]]. Retounen [valè…] oswa null.
export function askChek({ titre, tekst = "", opsyon, chwa = [], ok = "Anrejistre", min = 1 }) {
  let form;
  const opts = { onOpen: (w) => {
    form = w.querySelector("form");
    const okb = w.querySelector("[data-v=ok]");
    const chk = () => (okb.disabled = form.querySelectorAll("input:checked").length < min);
    form.onchange = chk; chk();
  } };
  opts.onOpen.valeur = () => [...form.querySelectorAll("input:checked")].map((x) => x.value);
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">✎</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p" data-brut>${h(tekst)}</p>` : ""}
    <form class="modal-choix"><fieldset><legend class="sr">${h(t(titre))}</legend>
      ${opsyon.map(([v, l]) => `<label class="chk"><input type="checkbox" value="${h(v)}" ${chwa.includes(v) ? "checked" : ""}><span data-brut>${h(l)}</span></label>`).join("")}</fieldset></form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t(ok))}</button></div>`, opts);
}

// Konfimasyon. Retounen true/false.
// detay: lis [etikèt, valè] pou montre yon rezime klè.
export async function ask({ titre, tekst = "", detay = [], ok = "Konfime", anile = "Anile", danje = false, foto = null, ikon = "?" }) {
  const r = await ouvrir(`
    <div class="modal-h">${foto ? `<img class="modal-foto" src="${h(foto)}" alt="">` : `<span class="modal-ico ${danje ? "danger" : ""}" aria-hidden="true">${ikon}</span>`}
      <h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p">${h(t(tekst))}</p>` : ""}
    ${detay.length ? `<dl class="modal-dl">${detay.map(([k, v]) => `<div><dt>${h(t(k))}</dt><dd data-brut>${h(v)}</dd></div>`).join("")}</dl>` : ""}
    <div class="modal-b">
      ${anile ? `<button class="btn" data-v="no">${h(t(anile))}</button>` : ""}
      <button class="btn ${danje ? "danger-full" : "pri"}" data-v="ok">${h(t(ok))}</button>
    </div>`);
  return r === true;
}

export const info = (titre, tekst = "") => ask({ titre, tekst, ok: "OK", anile: null, ikon: "i" });

// Mande yon tèks (pa egzanp, yon nouvo modpas). Retounen tèks la oswa null.
export function askText({ titre, tekst = "", label = "", type = "text", min = 0 }) {
  let input;
  const opts = {
    onOpen: (w) => {
      input = w.querySelector("input");
      const okb = w.querySelector("[data-v=ok]");
      const chk = () => (okb.disabled = input.value.length < min);
      input.oninput = chk; chk();
      input.onkeydown = (e) => { if (e.key === "Enter" && !okb.disabled) okb.click(); };
    },
  };
  opts.onOpen.valeur = () => input.value;
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">✎</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p">${h(t(tekst))}</p>` : ""}
    <label class="modal-l">${h(t(label))}<input type="${type}" autocomplete="off" autofocus></label>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t("Konfime"))}</button></div>`, opts);
}

// Foto an gwo (peze foto a pou wè l).
export function zoom(src, legend = "") {
  return ouvrir(`
    <figure class="zoom"><img src="${h(src)}" alt="${h(legend)}">${legend ? `<figcaption data-brut>${h(legend)}</figcaption>` : ""}</figure>
    <div class="modal-b"><button class="btn" data-v="no" autofocus>${h(t("Fèmen"))}</button></div>`)
    .then(() => {});
}

// Nenpòt foto kliyan (thumb/avatar/aperçu) ka louvri an gwo, menm si l nan yon lyen.
export function activerZoom() {
  document.addEventListener("click", (e) => {
    const img = e.target.closest?.("img.thumb, img.avatar, img.prev, img.modal-foto");
    if (!img || img.closest(".zoom")) return;
    e.preventDefault(); e.stopPropagation();
    zoom(img.src, img.dataset.legend || "");
  }, true);
}

// Chwazi yon opsyon nan yon lis + nòt (pa egzanp, fidbak lè kliyan an pa peye).
// Retounen { valeur, note } oswa null.
export function askChoice({ titre, tekst = "", options, noteLabel = "Nòt", noteObligatwaPou = [], ok = "Anrejistre" }) {
  let form;
  const opts = {
    onOpen: (w) => {
      form = w.querySelector("form");
      const okb = w.querySelector("[data-v=ok]");
      const chk = () => {
        const v = form.querySelector("input[name=ch]:checked")?.value;
        const n = form.note.value.trim();
        okb.disabled = !v || (noteObligatwaPou.includes(v) && !n);
      };
      form.oninput = chk; chk();
      form.onsubmit = (e) => { e.preventDefault(); if (!okb.disabled) okb.click(); };
    },
  };
  opts.onOpen.valeur = () => ({ valeur: form.querySelector("input[name=ch]:checked")?.value, note: form.note.value.trim() });
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">✎</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p" data-brut>${h(tekst)}</p>` : ""}
    <form class="modal-choix">
      <fieldset><legend class="sr">${h(t(titre))}</legend>
      ${options.map(([v, l], i) => `<label><input type="radio" name="ch" value="${h(v)}" ${i === 0 ? "autofocus" : ""}><span>${h(t(l))}</span></label>`).join("")}
      </fieldset>
      <label class="modal-l">${h(t(noteLabel))}<textarea name="note" rows="2"></textarea></label>
    </form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t(ok))}</button></div>`, opts);
}

// Remete fokis la apre yon popup fèmen: sou eleman ki te genyen l, oswa (si paj la re-rann epi eleman an disparèt)
// sou menm eleman an (menm data-papeye / id / href), sinon sou tit paj la.
function remetFokis(prev, ankò = true) {
  // Paj la ka re-rann kèk milisegonn apre (anrejistreman): re-verifye 2 fwa si fokis la tonbe sou <body>.
  if (ankò) [300, 900].forEach((ms) => setTimeout(() => { if (document.activeElement === document.body && !document.querySelector(".modal-wrap")) remetFokis(prev, false); }, ms));
  if (prev && prev.isConnected && prev !== document.body) { prev.focus?.(); return; }
  let sel = null;
  if (prev?.dataset?.papeye) sel = `[data-papeye="${CSS.escape(prev.dataset.papeye)}"]`;
  else if (prev?.id) sel = `#${CSS.escape(prev.id)}`;
  else if (prev?.getAttribute?.("href")) sel = `a[href="${CSS.escape(prev.getAttribute("href"))}"]`;
  const same = sel ? document.querySelector(sel) : null;
  if (same) { same.focus?.(); return; }
  const h1 = document.querySelector("#app h1");
  if (h1) { if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
}

// ---------- Alèt kliyan (popup + son) ----------
// Son: pwodui nan aplikasyon an (Web Audio), kidonk li mache san entènèt. Vibrasyon sou Android.
let ac = null;
// Vibrasyon: pi long pou alèt ijan. (iPhone pa kite sit entènèt vibre: se sèlman son an ki mache la.)
export const VIBRE = { ijan: [500, 150, 500, 150, 500, 150, 900], enpotan: [400, 150, 400, 150, 400], info: [250, 100, 250] };
export function son(nivo = "enpotan") {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    ac.resume?.();
    // Son fò: onn kare + konpresè (volim maksimòm san distòsyon), motif la repete 3 fwa (1 fwa pou «info»).
    const kp = ac.createDynamicsCompressor();
    kp.threshold.value = -12; kp.knee.value = 6; kp.ratio.value = 6; kp.attack.value = 0.002; kp.release.value = 0.1;
    kp.connect(ac.destination);
    const motif = nivo === "ijan" ? [988, 740, 988, 740, 988, 740] : nivo === "info" ? [784, 1047] : [880, 1175, 880, 1175];
    const fwa = nivo === "info" ? 1 : 3, dt = 0.17;
    let i = 0;
    for (let r = 0; r < fwa; r++, i += 2) for (const f of motif) {
      const t0 = ac.currentTime + 0.02 + i++ * dt;
      for (const [tip, vol] of [["square", 0.55], ["sine", 0.9]]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = tip; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.setValueAtTime(vol, t0 + dt - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt - 0.01);
        o.connect(g).connect(kp); o.start(t0); o.stop(t0 + dt);
      }
    }
  } catch { /* navigatè san Web Audio */ }
  try { navigator.vibrate?.(VIBRE[nivo] || VIBRE.enpotan); } catch { /* */ }
}
// Notifikasyon telefòn (ba notifikasyon an), ak vibrasyon. Sèlman si ajan an te bay pèmisyon an (Paramèt).
export const notifOk = () => "Notification" in window && Notification.permission === "granted";
export async function notifye({ titre, tekst = "", tag = "grandon", nivo = "enpotan", url = "" }) {
  if (!notifOk()) return false;
  try {
    const reg = await navigator.serviceWorker?.ready;
    const baz = window.GRANDON_CONFIG?.BAZ || "";
    const opt = { body: tekst, tag, renotify: true, vibrate: VIBRE[nivo] || VIBRE.enpotan, requireInteraction: nivo === "ijan",
      icon: `${baz}icons/icon-192.png`, badge: `${baz}icons/icon-192.png`, data: { url } };
    if (reg?.showNotification) await reg.showNotification(t(titre), opt); else new Notification(t(titre), opt);
    return true;
  } catch { return false; }
}

// Popup alèt yo pou yon kliyan. html: liy alèt yo (app.js bati yo). Retounen { fermen: id } | { nouvo: true } | null.
export function aletPopup({ titre, soutit = "", html, nivo = "enpotan", nouvo = false }) {
  return ouvrir(`
    <div class="modal-h alet-h ${h(nivo)}"><span class="modal-ico" aria-hidden="true">!</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${soutit ? `<p class="modal-p" data-brut>${h(soutit)}</p>` : ""}
    <div class="alet-lis">${html}</div>
    <div class="modal-b">${nouvo ? `<button class="btn" data-nouvo>${h(t("＋ Nouvo alèt"))}</button>` : ""}<button class="btn pri" data-v="ok" autofocus>${h(t("Mwen konprann"))}</button></div>`,
  { onOpen: (w, fin) => {
    w.querySelectorAll("[data-fermen]").forEach((b) => (b.onclick = () => fin({ fermen: b.dataset.fermen })));
    w.querySelector("[data-nouvo]")?.addEventListener("click", () => fin({ nouvo: true }));
    w.querySelectorAll(".alet-lis a[href]").forEach((x) => x.addEventListener("click", () => fin(null)));
  } }).then((v) => (v === true ? null : v));
}

// Fòm pou yon manadjè kreye yon alèt.
export function askAlet({ titre = "Nouvo alèt", tekst = "", jodi = "", pwoblem = [] }) {
  let form;
  const opts = {
    onOpen: (w) => {
      form = w.querySelector("form");
      const okb = w.querySelector("[data-v=ok]");
      const chk = () => {
        const fen = form.fen.value, pw = pwoblem.find((x) => x.k === form.pwoblem.value);
        if (pw && !form.tit.value.trim()) form.tit.value = t(pw.l);
        w.querySelector(".alet-dat").hidden = fen !== "dat";
        okb.disabled = !form.tit.value.trim() || (fen === "dat" && !form.dat.value) || (fen === "regle" && !pw?.oto);
        w.querySelector(".alet-regle").hidden = !(fen === "regle" && !pw?.oto);
      };
      form.oninput = chk; form.onchange = chk; chk();
      form.onsubmit = (e) => { e.preventDefault(); if (!okb.disabled) okb.click(); };
    },
  };
  opts.onOpen.valeur = () => ({ tit: form.tit.value.trim(), mesaj: form.mesaj.value.trim(), nivo: form.nivo.value, fen: form.fen.value, fen_dat: form.dat.value || null,
    pwoblem: form.pwoblem.value || null, dele: form.dele.value || null });
  const NIVO = [["info", "Enfòmasyon"], ["enpotan", "Enpòtan"], ["ijan", "Ijan"]];
  const FEN = [["manyel", "Lè yon manadjè fèmen l"], ["regle", "Lè pwoblèm lan regle"], ["pa_reta", "Lè kliyan an pa an reta ankò"], ["depo", "Lè kliyan an fè yon depo"], ["dat", "Nan yon dat"]];
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">!</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p" data-brut>${h(tekst)}</p>` : ""}
    <form class="modal-choix alet-form">
      <label class="modal-l">${h(t("Pwoblèm"))} <small>(${h(t("opsyonèl"))})</small><select name="pwoblem"><option value="">${h(t("Okenn"))}</option>${pwoblem.map((x) => `<option value="${h(x.k)}">${h(t(x.l))}</option>`).join("")}</select></label>
      <label class="modal-l">${h(t("Tit"))} *<input name="tit" maxlength="120" required autofocus></label>
      <label class="modal-l">${h(t("Mesaj pou ajan an"))}<textarea name="mesaj" rows="3" maxlength="1000"></textarea></label>
      <label class="modal-l">${h(t("Dèlè pou swivi a"))} <small>(${h(t("opsyonèl"))})</small><input type="date" name="dele" min="${h(jodi)}"></label>
      <fieldset><legend>${h(t("Nivo"))}</legend>
      ${NIVO.map(([v, l]) => `<label><input type="radio" name="nivo" value="${v}" ${v === "enpotan" ? "checked" : ""}><span>${h(t(l))}</span></label>`).join("")}</fieldset>
      <label class="modal-l">${h(t("Alèt la fèmen poukont li"))}<select name="fen">${FEN.map(([v, l]) => `<option value="${v}">${h(t(l))}</option>`).join("")}</select></label>
      <label class="modal-l alet-dat" hidden>${h(t("Dat"))}<input type="date" name="dat" min="${h(jodi)}"></label>
      <p class="err-msg sm alet-regle" hidden>${h(t("Chwazi yon pwoblèm aplikasyon an ka verifye (pa egzanp «Pa gen foto»), oswa yon lòt fason pou alèt la fèmen."))}</p>
    </form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t("Kreye alèt la"))}</button></div>`, opts);
}

// Rapèl swivi yon ajan kreye pou tèt li (pa egzanp «Mande dokiman dosye kredi yo»). Retounen { tit, dele } oswa null.
export function askRapel({ tekst = "", jodi = "" }) {
  let form;
  const opts = { onOpen: (w) => {
    form = w.querySelector("form");
    const okb = w.querySelector("[data-v=ok]");
    const chk = () => (okb.disabled = form.tit.value.trim().length < 3);
    form.oninput = chk; chk();
    form.onsubmit = (e) => { e.preventDefault(); if (!okb.disabled) okb.click(); };
  } };
  opts.onOpen.valeur = () => ({ tit: form.tit.value.trim(), dele: form.dele.value || null });
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">⏰</span><h2 id="modal-t">${h(t("Nouvo rapèl"))}</h2></div>
    ${tekst ? `<p class="modal-p" data-brut>${h(tekst)}</p>` : ""}
    <form class="modal-choix alet-form">
      <label class="modal-l">${h(t("Kisa pou w pa bliye?"))} *<input name="tit" maxlength="120" required autofocus placeholder="${h(t("Egz.: Mande dokiman dosye kredi yo"))}"></label>
      <label class="modal-l">${h(t("Pou ki dat"))} <small>(${h(t("opsyonèl"))})</small><input type="date" name="dele" min="${h(jodi)}"></label>
      <p class="mut sm">${h(t("Rapèl la parèt chak fwa ou louvri kliyan sa a, jiskaske ou dezaktive l."))}</p>
    </form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t("Kreye rapèl la"))}</button></div>`, opts);
}

// Kanpay alèt (manadjè): ajan = [[id, non, kantite kont]]. Retounen { tit, mesaj, nivo, dele, ajan: [id] } oswa null.
export function askKanpay({ titre, pwoblem, ajan, jodi, tit = "", dele = "", ajanDefo = null }) {
  let form;
  const opts = { onOpen: (w) => {
    form = w.querySelector("form");
    const okb = w.querySelector("[data-v=ok]");
    const chk = () => {
      const n = [...form.querySelectorAll("input[name=ajan]:checked")].reduce((a, x) => a + Number(x.dataset.n || 0), 0);
      w.querySelector(".kp-n").textContent = String(n);
      okb.disabled = !form.tit.value.trim() || !n || !form.dele.value;
    };
    form.oninput = chk; form.onchange = chk; chk();
    form.onsubmit = (e) => { e.preventDefault(); if (!okb.disabled) okb.click(); };
  } };
  opts.onOpen.valeur = () => ({ tit: form.tit.value.trim(), mesaj: form.mesaj.value.trim(), nivo: form.nivo.value, dele: form.dele.value,
    ajan: [...form.querySelectorAll("input[name=ajan]:checked")].map((x) => x.value) });
  const NIVO = [["info", "Enfòmasyon"], ["enpotan", "Enpòtan"], ["ijan", "Ijan"]];
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">!</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    <p class="modal-p">${h(t("Pwoblèm"))}: <b>${h(t(pwoblem))}</b></p>
    <form class="modal-choix alet-form">
      <fieldset><legend>${h(t("Sou pòtfèy ki ajan"))}</legend>
        ${ajan.map(([id, nom, n]) => `<label class="chk"><input type="checkbox" name="ajan" value="${h(id)}" data-n="${n}" ${!ajanDefo || ajanDefo === id ? "checked" : ""}><span data-brut>${h(nom)} <small>· ${n} ${h(t("kont"))}</small></span></label>`).join("")}</fieldset>
      <label class="modal-l">${h(t("Tit"))} *<input name="tit" maxlength="120" value="${h(t(tit))}" required></label>
      <label class="modal-l">${h(t("Mesaj pou ajan yo"))}<textarea name="mesaj" rows="2" maxlength="1000"></textarea></label>
      <label class="modal-l">${h(t("Dèlè pou swivi a fèt"))} *<input type="date" name="dele" min="${h(jodi)}" value="${h(dele)}" required></label>
      <fieldset><legend>${h(t("Nivo"))}</legend>
      ${NIVO.map(([v, l]) => `<label><input type="radio" name="nivo" value="${v}" ${v === "enpotan" ? "checked" : ""}><span>${h(t(l))}</span></label>`).join("")}</fieldset>
      <p class="mut sm">${h(t("Alèt la parèt kòm notifikasyon pou ajan an epi chak fwa l louvri kliyan an. Li fèmen poukont li lè pwoblèm lan regle."))}</p>
    </form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t("Lanse alèt la"))} (<span class="kp-n">0</span>)</button></div>`, opts);
}

// ---------- Demann modifikasyon / siprime ----------
// chan: [[kle, etikèt]]. Retounen { operasyon: "modifye"|"siprime", chan: [...], rezon } oswa null.
export function askModif({ titre, tekst = "", chan, siprime = "Siprime" }) {
  let form;
  const opts = {
    onOpen: (w) => {
      form = w.querySelector("form");
      const okb = w.querySelector("[data-v=ok]");
      const chk = () => {
        const op = form.op.value;
        w.querySelector(".modif-chan").hidden = op !== "modifye";
        const n = form.querySelectorAll("input[name=chan]:checked").length;
        okb.disabled = form.rezon.value.trim().length < 3 || (op === "modifye" && !n);
      };
      form.oninput = chk; form.onchange = chk; chk();
      form.onsubmit = (e) => { e.preventDefault(); if (!okb.disabled) okb.click(); };
    },
  };
  opts.onOpen.valeur = () => ({ operasyon: form.op.value, chan: form.op.value === "modifye" ? [...form.querySelectorAll("input[name=chan]:checked")].map((x) => x.value) : null, rezon: form.rezon.value.trim() });
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">✎</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p" data-brut>${h(tekst)}</p>` : ""}
    <form class="modal-choix modif-form">
      <fieldset><legend>${h(t("Kisa ou bezwen?"))}</legend>
        <label><input type="radio" name="op" value="modifye" checked autofocus><span>${h(t("Modifye"))}</span></label>
        <label><input type="radio" name="op" value="siprime"><span>${h(t(siprime))}</span></label></fieldset>
      <fieldset class="modif-chan"><legend>${h(t("Ki chan ou bezwen modifye?"))}</legend>
        ${chan.map(([k, l]) => `<label class="chk"><input type="checkbox" name="chan" value="${h(k)}"><span>${h(t(l))}</span></label>`).join("")}</fieldset>
      <label class="modal-l">${h(t("Rezon (obligatwa)"))}<textarea name="rezon" rows="2" maxlength="500"></textarea></label>
    </form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t("Voye demann lan"))}</button></div>`, opts);
}

// Fòm modifikasyon: chan [{ k, label, type: "text"|"number"|"select", value, options }]. Retounen { k: valè } oswa null.
export function askChan({ titre, tekst = "", chan, ok = "Anrejistre", rezon = false }) {
  let form;
  const opts = {
    onOpen: (w) => {
      form = w.querySelector("form");
      const okb = w.querySelector("[data-v=ok]");
      const chk = () => { okb.disabled = rezon && form.rezon.value.trim().length < 3; };
      form.oninput = chk; chk();
      form.onsubmit = (e) => { e.preventDefault(); if (!okb.disabled) okb.click(); };
    },
  };
  opts.onOpen.valeur = () => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
  return ouvrir(`
    <div class="modal-h"><span class="modal-ico" aria-hidden="true">✎</span><h2 id="modal-t">${h(t(titre))}</h2></div>
    ${tekst ? `<p class="modal-p">${h(t(tekst))}</p>` : ""}
    <form class="modal-choix modif-form">
      ${chan.map((c, i) => c.type === "select"
        ? `<label class="modal-l">${h(t(c.label))}<select name="${h(c.k)}" ${i === 0 ? "autofocus" : ""}>${c.options.map((o) => `<option ${o === c.value ? "selected" : ""}>${h(o)}</option>`).join("")}</select></label>`
        : `<label class="modal-l">${h(t(c.label))}<input name="${h(c.k)}" type="${c.type === "number" ? "number" : "text"}" ${c.type === "number" ? 'inputmode="numeric" min="0" step="1"' : ""} value="${h(c.value ?? "")}" ${i === 0 ? "autofocus" : ""}></label>`).join("")}
      ${rezon ? `<label class="modal-l">${h(t("Rezon (obligatwa)"))}<textarea name="rezon" rows="2" maxlength="500"></textarea></label>` : ""}
    </form>
    <div class="modal-b"><button class="btn" data-v="no">${h(t("Anile"))}</button><button class="btn pri" data-v="ok">${h(t(ok))}</button></div>`, opts);
}
