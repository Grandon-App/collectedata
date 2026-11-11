// Sistèm "look": 3 aparans konplè (A · Prestige, B · Mache, C · Lannuit).
// Chak look se yon modil (look-a.js, look-b.js, look-c.js) ki bay:
//   { id, nom, deskripsyon, fonts: [url css Google Fonts], tem: "both" | "dark", themeColor: {light, dark}, fr: {…}, parts: {…} }
// Kontra pati yo (ctx ak hook obligatwa yo): gade LOOKS.md.
import A from "./look-a.js";
import B from "./look-b.js";
import C from "./look-c.js";
import { addTranslations } from "./i18n.js";

export const LOOKS = { a: A, b: B, c: C };
export const LOOK_IDS = ["a", "b", "c"];
export const LOOK_DEFO = "a";

for (const L of Object.values(LOOKS)) addTranslations(L.fr || {});

export const idLook = () => (LOOKS[document.documentElement.dataset.look] ? document.documentElement.dataset.look : LOOK_DEFO);
export const current = () => LOOKS[idLook()];

// Mete look la an plas: atribi data-look, polis Google Fonts (ak cache SW pou offline), koulè ba navigatè a.
export function applyLook(id, tem = "auto") {
  const L = LOOKS[id] || LOOKS[LOOK_DEFO];
  const r = document.documentElement;
  r.dataset.look = L.id;
  // Tèm: look C toujou fonse; lòt yo swiv preferans lan.
  const fonse = L.tem === "dark" || tem === "dark" || (tem === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (L.tem === "dark") r.dataset.theme = "dark";
  else if (tem === "auto") delete r.dataset.theme;
  else r.dataset.theme = tem;
  // Polis yo
  const head = document.head;
  for (const old of head.querySelectorAll("link[data-look-font]")) if (!(L.fonts || []).includes(old.href)) old.remove();
  if ((L.fonts || []).length && !head.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
    for (const href of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
      const l = document.createElement("link"); l.rel = "preconnect"; l.href = href; if (href.includes("gstatic")) l.crossOrigin = "anonymous"; head.appendChild(l);
    }
  }
  for (const href of L.fonts || []) {
    if (head.querySelector(`link[data-look-font][href="${href}"]`)) continue;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; l.dataset.lookFont = L.id; head.appendChild(l);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = (fonse ? L.themeColor?.dark : L.themeColor?.light) || L.themeColor?.light || "#14284b";
  return L;
}
