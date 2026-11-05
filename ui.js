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
      wrap.classList.add("out");
      document.removeEventListener("keydown", key, true);
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
    wrap.addEventListener("click", (e) => { if (e.target === wrap) fin(null); });
    wrap.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => fin(b.dataset.v === "ok" ? (onOpen?.valeur?.() ?? true) : null)));
    onOpen?.(wrap, fin);
    requestAnimationFrame(() => (wrap.querySelector("[autofocus]") || wrap.querySelector("[data-v=ok]"))?.focus());
  });
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
