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
      setTimeout(() => { wrap.remove(); if (!document.querySelector(".modal-wrap")) document.body.classList.remove("modal-open"); prev?.focus?.(); }, 120);
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
