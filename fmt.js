// Zouti fòma ak ti moso HTML komen: app.js ak modil look yo (look-a/b/c.js) itilize yo.
// Pa gen eta aplikasyon isit la (pa gen `moi`, pa gen modèl): fonksyon pi yo sèlman.
import { t } from "./i18n.js";

const C = window.GRANDON_CONFIG || {};
export const FUSEAU = C.FUSEAU || "America/Port-au-Prince";

// Echape tèks pou HTML.
export const h = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Done brit (non moun, kòd, nimewo): tradiktè a pa dwe touche yo.
export const d = (v) => `<span data-brut>${h(v)}</span>`;

export const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
// Montan an goud: "2 500 G"
export const gd = (n) => `${nf.format(Number(n) || 0)} G`;
// Montan san inite (pou chif an gwo): "2 500"
export const gn = (n) => nf.format(Number(n) || 0);
// Dat kout: "05 nov. 2026"
export const datFr = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
// Dat san ane: "05 nov."
export const datKout = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }) : "—");
// Dat + lè (lè Ayiti): "05 nov., 10:42"
export const lè = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: FUSEAU }) : "jamè");
// Lè sèlman: "10:42". Dat sèvè yo (san fuseau) se lè Ayiti deja.
export const lèKout = (iso) => {
  if (!iso) return "";
  const s = String(iso);
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(s) && s.length >= 16) return s.slice(11, 16);
  return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU });
};

export const non = (c) => `${c?.prenom || ""} ${c?.nom || ""}`.trim() || "—";
export const inisyal = (c) => `${(c?.prenom || "")[0] || ""}${(c?.nom || "")[0] || ""}`.toUpperCase() || "?";
export const tel4 = (c) => (c?.telephone ? String(c.telephone).replace(/\D/g, "").slice(-4) : c?.tel4 || "");
export const telFmt = (tel) => { const x = String(tel || "").replace(/\D/g, "").slice(-8); return x.length === 8 ? `${x.slice(0, 4)} ${x.slice(4)}` : String(tel || ""); };

export const JOU = ["", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi", "Dimanch"];
export const JOU_KOUT = ["", "Len", "Mad", "Mèk", "Jed", "Van", "Sam", "Dim"];
export const lisJou = (j) => (j?.length ? j.map((x) => JOU_KOUT[x]).join(" · ") : "—");

// Foto kliyan (ti wonn) oswa inisyal li. `cls`: thumb | avatar. Peze foto a louvri l an gwo (ui.activerZoom).
export const avatar = (c, cls = "thumb") => c?.photo_url
  ? `<img class="${cls}" src="${h(c.photo_url)}" alt="" loading="lazy" data-legend="${h(non(c))}">`
  : `<span class="${cls} ph" aria-hidden="true">${h(inisyal(c))}</span>`;

// Badj estati
export const badgePend = (o) => (o?._error ? `<span class="badge err">Erè sync</span>` : o?._pending ? `<span class="badge pend">Poko voye</span>` : "");
export const badgeTx = (x) => x._error ? `<span class="badge err">Erè</span>` : x._pending ? `<span class="badge pend">Poko voye</span>`
  : x.validation_status === "pending" ? `<span class="badge warn">An atant validasyon</span>`
  : x.validation_status === "rejected" ? `<span class="badge err">Anile / refize</span>` : "";
export const badgeKont = (k) => !k._actif ? `<span class="badge mut">Fini</span>`
  : k._jodiPeman ? (k._jodi >= Number(k.montant_plan || 0) ? `<span class="badge ok">Peye jodi a</span>` : `<span class="badge info">Peman jodi a</span>`) : `<span class="badge ok">Aktif</span>`;
export const badgeDm = (dm) => dm._error ? `<span class="badge err">Erè sync</span>` : dm._pending ? `<span class="badge pend">Poko voye</span>`
  : dm.statut === "approuvee" ? `<span class="badge ok">Apwouve</span>` : dm.statut === "refusee" ? `<span class="badge err">Refize</span>`
  : dm.statut === "otorizasyon" ? `<span class="badge warn">VIP · an atant manadjè</span>`
  : `<span class="badge warn">An atant otorizasyon</span>`;

// Tranzaksyon
export const LABEL_TX = { depo: "Depo", retre: "Retrè", fre: "Frè", viman_out: "Viman voye", viman_in: "Viman resevwa", lot: "Tranzaksyon" };
export const SIY = (kind) => (kind === "depo" || kind === "viman_in" ? "+" : "−");
export const KLAS = (kind) => (kind === "depo" || kind === "viman_in" ? "in" : kind === "fre" ? "fee" : "out");
export const TYPES_FRE = ["Frais carnet", "Frais d'ouverture", "Frais de gestion", "Frais service", "Pénalité", "Autre"];
export const MOTIFS = [["repase", "Kliyan an di pou m repase"], ["pa_la", "Kliyan an pa la jodi a"], ["pa_gen_kob", "Kliyan an di li pa gen kòb jodi a"],
  ["refize", "Kliyan an refize peye"], ["fenmen", "Biznis la fèmen"], ["malad", "Kliyan an malad"], ["lot", "Lòt rezon"]];
export const motifLabel = (m) => (MOTIFS.find(([v]) => v === m) || [m, "Lòt rezon"])[1];
// Fidbak kout (pou yon ti chip sou yon liy kliyan)
export const MOTIF_KOUT = { repase: "Repase", pa_la: "Pa la", pa_gen_kob: "Pa gen kòb", refize: "Refize", fenmen: "Fèmen", malad: "Malad", lot: "Lòt" };

// Ikòn SVG (stroke, koulè = currentColor). Itilize `ICO.x` nan markup la.
const svg = (p, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${p}</svg>`;
export const ICO = {
  tablo: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  kliyan: svg('<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M17 4a4 4 0 0 1 0 8M22 21c0-3-1.5-5-4-6"/>'),
  kredi: svg('<path d="M12 3v18"/><path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/>'),
  epay: svg('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>'),
  kes: svg('<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.6"/><path d="M6 9.5v.01M18 15.5v.01M5 3h14"/>'),
  alet: svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  ekip: svg('<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3 2.7-5 6-5s6 2 6 5"/><path d="M14.5 15.2c.5-.1 1-.2 1.5-.2 3.3 0 6 2 6 5"/>'),
  rapo: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h6M9 16h6"/>'),
  param: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  rele: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  senk: svg('<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/>'),
  kat: svg('<path d="M12 21s-7-7.6-7-12a7 7 0 0 1 14 0c0 4.4-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
  chèche: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  retou: svg('<path d="m15 18-6-6 6-6"/>'),
  monte: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  desann: svg('<path d="M12 5v14M5 12l7 7 7-7"/>'),
  liy: svg('<path d="M4 7h16M4 12h10M4 17h6"/>'),
  ok: svg('<path d="m5 12 5 5 9-9"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  kalandriye: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  moun: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
  foto: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  modifye: svg('<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m12.5 7.5 4 4"/>'),
  kòb: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>'),
  avèti: svg('<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>'),
  gps: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>'),
};

// Kalandriye rapid: pwosantaj (0..100) san depase
export const pct = (a, b) => (b ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);

export { t };

// Blòk «Objektif jodi a» (Tablo de bò): sa ajan an ta dwe kolekte sou potfèy li jodi a, sa l kolekte, sa k rete.
// stats: prevuJodi, kolekPlan (chak kliyan konte pou plan li maks), rete, kolekte (tout depo), anplis, pouJodi, peye, pwosanPlan.
export function objektif(st) {
  const pa = Math.max(0, st.pouJodi - st.peye);
  return `<section class="obj" aria-labelledby="obj-t">
  <h2 id="obj-t">Objektif jodi a</h2>
  <div class="obj-g">
    <div class="obj-i" data-obj="prevu" data-val="${st.prevuJodi}"><span>Pou kolekte jodi a</span><b>${gd(st.prevuJodi)}</b><small>${st.pouJodi} ${t("kliyan dwe peye")}</small></div>
    <div class="obj-i ok" data-obj="plan" data-val="${st.kolekPlan}"><span>Kolekte sou plan</span><b>${gd(st.kolekPlan)}</b><small>${st.peye}/${st.pouJodi} ${t("kliyan peye")}</small></div>
    <div class="obj-i ${st.rete ? "warn" : "ok"}" data-obj="rete" data-val="${st.rete}"><span>Rete pou kolekte</span><b>${gd(st.rete)}</b><small>${pa ? `${pa} ${t("kliyan poko peye")}` : t("Tout moun peye")}</small></div>
  </div>
  <div class="bar obj-bar" role="progressbar" aria-label="${t("Objektif jodi a")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pwosanPlan}"><i style="width:${Math.min(100, st.pwosanPlan)}%"></i></div>
  <p class="obj-p"><b>${st.pwosanPlan}%</b> ${t("objektif la rive")}</p>
  <div class="obj-tot" data-obj="total" data-val="${st.kolekte}"><span>Total kolekte jodi a <small>(tout depo)</small></span><b>${gd(st.kolekte)}</b>${st.anplis ? `<small>${t("ladan l")} ${gd(st.anplis)} ${t("anplis plan yo")}</small>` : ""}</div>
</section>`;
}

// Blòk «Mwa a» (Tablo de bò, pati 2): kòb kliyan potfèy la te dwe peye depi kòmansman mwa a jiska jodi a epi ki poko rantre.
export function mwa(st) {
  return `<section class="obj mwa" aria-labelledby="mwa-t">
  <h2 id="mwa-t">Mwa a <small>${h(st.nonMwa)}</small></h2>
  <div class="obj-dwe ${st.mwaDwe ? "warn" : "ok"}" data-obj="mwa-dwe" data-val="${st.mwaDwe}"><span>Kòb ki dwe pou mwa a, poko rantre</span><b>${gd(st.mwaDwe)}</b>
    <small>${st.nDwe ? `${st.nDwe} ${t("kliyan pou ale fè peye")}` : t("Okenn kliyan pa dwe")} · ${t("li desann lè yo peye, li monte lè yo rate")}</small></div>
  ${st.nDwe ? `<p class="obj-p"><a href="#/epay" data-mwa-reta>${t("Wè kliyan ki an reta yo")} →</a></p>` : ""}
</section>`;
}

// «2 000 G pou rekipere (1 vèsman)»: sa kliyan an dwe sou cycle la jiska jodi a.
export const rekipere = (a, n) => `${gd(a)} ${t("pou rekipere")} (${n} ${n > 1 ? t("vèsman") : t("vèsman (1)").replace(" (1)", "")})`;
