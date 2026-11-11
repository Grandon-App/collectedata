// LOOK A · Prestige — ble marin ak lò. (Kontra: LOOKS.md. Modèl vizyèl: tests/refonte/Main.dc.html, A-Fich.dc.html, A-Rapo.dc.html)
// Chak pati = fn(ctx) → HTML. app.js branche evènman yo sou hook yo (id, klas, data-attribut) — pa retire yo.
import { h, d, gd, gn, datFr, datKout, non, inisyal, JOU, lisJou, badgePend, badgeKont, ICO, pct, t, MOTIF_KOUT, objektif, mwa, rekipere } from "./fmt.js";

// ---------- Ti zouti lokal ----------
// Jou ISO (1 = lendi … 7 = dimanch) yon dat "YYYY-MM-DD".
const isoJouDe = (iso) => ((new Date(String(iso).slice(0, 10) + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
const prenon = (moi) => String(moi?.nom || "").trim().split(" ")[0] || "";
// Ton avatar (1 = ble marin, 2 = lò, 3 = gri): toujou menm koulè pou menm moun.
const ton = (c) => { let s = 7; for (const ch of `${c?.prenom || ""}${c?.nom || ""}`) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return (s % 3) + 1; };
// Foto kliyan (wonn) oswa inisyal li, ak yon ton koulè. `plat`: san ton (sou fon ble marin).
const av = (c, cls = "thumb", plat = false) => c?.photo_url
  ? `<img class="${cls}" src="${h(c.photo_url)}" alt="" loading="lazy" data-legend="${h(non(c))}">`
  : `<span class="${cls} ph${plat ? "" : ` av-${ton(c)}`}" aria-hidden="true" data-brut>${h(inisyal(c))}</span>`;
// Wonn pwogrè (conic-gradient lò sou fon klè) ak yon tèks nan mitan. Se yon imaj pou lektè ekran (non + valè).
const ring = (p, label) => `<div class="ring" role="img" aria-label="Pwogrè: ${label}" style="--p:${Math.max(0, Math.min(100, Number(p) || 0))}%"><b>${label}</b></div>`;
const hello = (ctx) => `<p class="hello">Bonjou ${d(prenon(ctx.moi))} · <span>${t(JOU[isoJouDe(ctx.today)])} ${datKout(ctx.today)}</span></p>`;
// Ba pwogrè ak yon non pou lektè ekran (`non`: tèks kreyòl, tradiktè a okipe l).
const bar = (p, cls = "", non = "Pwogrè cycle") => `<div class="bar ${cls}" role="progressbar" aria-label="${non}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><i style="width:${p}%"></i></div>`;
const soutit = (stats) => {
  const rete = Math.max(0, stats.pouJodi - stats.peye);
  if (!stats.pouJodi) return "Pa gen peman ki tonbe jodi a.";
  return rete ? `${rete} kliyan rete pou w wè` : "Tout kliyan jodi a peye ✓";
};

// ---------- Tablo de bò ----------
export function tablo(ctx) {
  const { stats } = ctx;
  return `
  <div class="band">${hello(ctx)}<h1>Tablo de bò</h1></div>
  <div class="tablo-g">
  <div class="card float sum">
    ${ring(pct(stats.peye, stats.pouJodi), `${stats.peye}/${stats.pouJodi}`)}
    <div class="grow"><span class="sum-l">Peman jodi a</span><b class="sum-v">${gd(stats.kolekte)}</b><small>${soutit(stats)}</small></div>
    <div class="mini4">
      <div><span>Kont aktif</span><b>${stats.aktif}</b></div>
      <div><span>An reta</span><b class="${stats.anReta ? "warn" : ""}">${stats.anReta}</b></div>
      <div><span>Demann an atant</span><b>${stats.enAtant}</b></div>
      <div><span>Kliyan</span><b>${stats.kliyan}</b></div>
    </div>
  </div>
  <div class="tiles">
    <a class="tile" href="#/kliyan">${ICO.kliyan}<span>Kliyan</span></a>
    <a class="tile pri" href="#/epay">${ICO.epay}<span>Epay</span></a>
    <a class="tile" href="#/rapo">${ICO.rapo}<span>Rapò</span></a>
  </div>
  </div>
  ${objektif(stats)}
  ${mwa(stats)}`;
}

// ---------- Yon liy kont (Epay) ----------
export function kontRow(r) {
  const { k, c, man, sekyon, ok, fidbakJodi } = r;
  const id = k.id_compte_epargne;
  const prog = r.nPrevu ? bar(r.pwosan, "thin") : "";
  const sub = `<div class="mut sm">${d(r.noKont || t("Cycle poko voye"))} · <span class="nw">plan ${gd(r.plan)}</span></div>`;
  if (sekyon === "jodi") {
    const fb = fidbakJodi && !ok;
    return `<div class="row kr${ok ? " peye" : ""}">
      ${av(c)}<a class="grow lnk" href="#/cycle/${id}"><b>${d(r.nonKliyan)}</b> ${badgePend(k)}${sub}
        ${fb ? `<div><span class="fbk">Fidbak anrejistre · ${t(MOTIF_KOUT[fidbakJodi] || "Fidbak")}</span></div>` : prog}</a>
      ${ok ? `<span class="pill ok">✓ ${gd(r.jodiMontan)}</span>`
        : `<div class="btns-v"><a class="btn sm pri" href="#/tx/nouvo/${id}">Depo</a><button type="button" class="btn sm" data-papeye="${id}">Pa peye</button></div>`}</div>`;
  }
  // Liy detay: sèlman moso ki egziste yo (pa gen "—" k ap pandye lè pa gen frekans).
  const liy = [k.frequence_semaine ? `${k.frequence_semaine}×/sem · ${lisJou(k.jours_paiement)}` : "", `${r.nPeye}/${r.nPrevu ?? "?"} ${t("vèsman")}`,
    r.aRekipere ? `<span class="reta">${rekipere(r.aRekipere, r.anReta)}</span>` : ""].filter(Boolean).join(" · ");
  return `<div class="row kr">
    ${av(c)}<a class="grow lnk" href="#/cycle/${id}"><b>${d(r.nonKliyan)}</b> ${badgePend(k)}${sub}
      <div class="mut sm">${liy}</div>
      ${man && r.solde != null ? `<div class="sm bal">${t("Balans")}: <b>${gd(r.solde)}</b></div>` : ""}${prog}</a>
    <a class="btn sm pri" href="#/tx/nouvo/${id}">Depo</a></div>`;
}

// ---------- Epay ----------
export function epay(ctx) {
  const { ong, ongs, stats, filt, q } = ctx;
  let body = "";
  if (ong === "kont") {
    body = ctx.kontSeksyon;
  } else if (ong === "tx") {
    body = `${ctx.demannHtml ? `<h2>Demann retrè ak viman</h2><div class="list">${ctx.demannHtml}</div>` : ""}
    ${ctx.txHtml}`;
  } else if (ong === "fidbak") {
    body = ctx.fidbakSeksyon;
  } else {
    body = `<p class="note info-note">${ctx.validNote || ""}</p>
    <div class="list">${ctx.validHtml || `<p class="empty">Pa gen demann an atant.</p>`}</div>`;
  }
  return `
  <div class="band">${hello(ctx)}<h1>Epay</h1></div>
  <div class="card float sum">
    ${ring(pct(stats.peye, stats.pouJodi), `${stats.peye}/${stats.pouJodi}`)}
    <div class="grow"><span class="sum-l">Peman jodi a</span><b class="sum-v">${gd(stats.kolekte)}</b><small>${soutit(stats)}</small></div>
    <a class="btn pri sum-b" href="#/chwazi/cycle">＋ Cycle</a>
  </div>
  <div class="tabs" role="tablist">${ongs.map(([k, l, n]) => `<button type="button" role="tab" class="tab ${k === ong ? "on" : ""}" aria-selected="${k === ong}" data-ong="${k}">${l}${n ? `<span class="cnt-b">${n}</span>` : ""}</button>`).join("")}</div>
  <div id="ong">${body}</div>`;
}

// ---------- Fich kliyan ----------
export function fich(ctx) {
  const { c, photo, ks, man, info, gpsOk } = ctx;
  const nAktif = ks.filter((x) => x.on).length, nFini = ks.length - nAktif;
  const I = Object.fromEntries(info.map((x) => [x.key, x]));
  const kv = (x, sub = "") => x ? `<div class="kv"><span>${x.label}</span><b>${x.html || `<span class="mut">—</span>`}${sub ? `<span class="kv-sub">${sub}</span>` : ""}</b></div>` : "";
  // Aktivite: sektè ak kapasite anba l. Si pa gen aktivite, sektè a pran plas li (ak pwòp etikèt li).
  const akt = I.aktivite?.html ? I.aktivite : I.sekte?.html ? I.sekte : I.aktivite || { label: "Aktivite", html: "" };
  const aktSub = (I.aktivite?.html ? [I.sekte?.html, I.kapasite?.html] : [I.kapasite?.html]).filter(Boolean).join(" · ");
  return `
  <div class="fich-g">
  <div class="band fich-h">
    <div class="band-top"><a href="#/kliyan" class="back">‹ Kliyan</a><a class="btn gold" href="${ctx.hrefModifye}">${ICO.modifye}Modifye</a></div>
    <div class="fich-id">
      ${photo ? `<img class="avatar" src="${h(photo)}" alt="" data-legend="${h(non(c))}" title="Peze foto a pou wè l pi gwo">` : `<div class="avatar ph" aria-hidden="true" data-brut>${h(inisyal(c))}</div>`}
      <div class="grow">
        <h1>${d(non(c))}</h1>
        <div class="fich-sub">${c.pseudo ? `« ${d(c.pseudo)} » · ` : ""}${d(c.code_client || t("ID poko vini"))}</div>
        <div class="fich-chips">${gpsOk ? `<span class="bchip ok">GPS aktive</span>` : `<span class="bchip warn">Pa gen GPS</span>`}<span class="bchip gold">${nAktif} cycle aktif</span>${badgePend(c)}</div>
      </div>
    </div>
  </div>
  ${ctx.errHtml || ""}
  <div class="tiles">
    ${ctx.telHref ? `<a class="tile" href="${h(ctx.telHref)}">${ICO.rele}<span>Rele</span></a>` : `<span class="tile off" role="button" aria-disabled="true" tabindex="-1" title="Pa gen telefòn">${ICO.rele}<span>Rele</span></span>`}
    ${ctx.mapsHref ? `<a class="tile" href="${h(ctx.mapsHref)}" target="_blank" rel="noopener">${ICO.kat}<span>Kat</span></a>` : `<span class="tile off" role="button" aria-disabled="true" tabindex="-1" title="Pa gen GPS">${ICO.kat}<span>Kat</span></span>`}
    <a class="tile pri" href="${ctx.hrefNouvoCycle}">${ICO.plus}<span>Nouvo cycle</span></a>
  </div>
  <div class="fich-2">
    <div>
      <h2>Enfòmasyon kliyan an</h2>
      <div class="card info">${kv(I.telefon)}${kv(I.pyes)}${kv(I.nesans)}${kv(I.adres)}${kv(I.biznis)}${kv(I.vant)}${kv(akt, aktSub)}</div>
    </div>
    <div>
      <h2>Cycle yo <small>${nAktif} aktif · ${nFini} fini</small></h2>
      <div class="list">${ks.map((x) => `<a class="row col cyc ${x.on ? "on" : ""}" href="${x.href}">
        <div class="cyc-h"><b>${d(x.k.no_compte || t("Cycle poko voye"))}</b><span>${badgeKont(x.k)} ${badgePend(x.k)}</span></div>
        <div class="mut sm">${gd(x.k.montant_plan)} · ${x.k.frequence_semaine ? `${x.k.frequence_semaine}×/sem (${lisJou(x.k.jours_paiement)})` : "—"} · ${datKout(x.k.date_debut)} → ${datKout(x.k.date_fin)}</div>
        <div class="cyc-n"><span>${x.nPeye} / ${x.nPrevu ?? "?"} ${t("vèsman")}</span><span class="mut">${x.k._totalPrevu != null ? `${gn(x.k._depots)} / ${gd(x.k._totalPrevu)}` : gd(x.k._depots)}</span></div>
        ${man && x.solde != null ? `<div class="sm bal">${t("Balans")}: <b>${gd(x.solde)}</b></div>` : ""}
        ${bar(x.pwosan)}</a>`).join("") || `<p class="empty">Pa gen cycle.</p>`}</div>
    </div>
  </div>
  </div>`;
}

// ---------- Tèt fich cycle ----------
export function cycleTop(ctx) {
  const { k, c, man, fè, prevu } = ctx;
  return `
  <div class="cyc-g">
  <div class="band cyc-b">
    <div class="band-top"><a href="#/epay" class="back">‹ Epay</a><a class="band-k" href="${ctx.hrefKliyan}">${av(c, "thumb", true)}<span>${d(non(c))}</span>${ICO.retou}</a></div>
    <h1>${d(k.no_compte || t("Cycle poko voye"))} ${ctx.badges.kont} ${ctx.badges.pend}</h1>
    <div class="band-sub">${t("Plan")} ${gd(k.montant_plan)}${k.frequence_semaine ? ` · ${k.frequence_semaine}×/sem (${lisJou(k.jours_paiement)})` : ""} · ${datKout(k.date_debut)} → ${datKout(k.date_fin)}</div>
  </div>
  ${man && ctx.solde != null
    ? `<div class="card float solde">${ring(ctx.pwosan, `${ctx.pwosan}%`)}<div class="grow"><span>Balans kont lan</span><b>${gd(ctx.solde)}</b>
        <small>Balans valide: ${gd(ctx.soldeValide)}${Number(ctx.depoAnAtant) ? ` · an atant validasyon: ${gd(ctx.depoAnAtant)}` : ""}${ctx.local ? ` · poko voye: ${gd(ctx.local)}` : ""}</small></div></div>`
    : `<div class="card float solde">${ring(ctx.pwosan, `${ctx.pwosan}%`)}<div class="grow"><span>Vèsman fèt</span><b>${ctx.nDepots}</b><small>${gd(ctx.depots)} · ${t("depo ou wè sou telefòn nan")}</small></div></div>`}
  ${ctx.errHtml || ""}
  <div class="card stats">
    <div><span>Plan (minimòm)</span><b>${gd(k.montant_plan)}</b></div>
    <div><span>Frekans</span><b>${k.frequence_semaine ? `${k.frequence_semaine}× ${t("pa semèn")}` : "—"}</b></div>
    <div class="wide"><span>Jou peman</span><b>${k.jours_paiement?.length ? k.jours_paiement.map((j) => t(JOU[j])).join(", ") : "—"}</b></div>
    <div><span>Kòmanse</span><b>${datFr(k.date_debut)}</b></div>
    <div><span>Fini</span><b>${datFr(k.date_fin)}</b></div>
    ${ctx.prevuTotal != null ? `<div><span>Vèsman prevwa</span><b>${ctx.prevuTotal}</b><small>san dimanch ni jou ferye</small></div>
    <div><span>Total pou l sanble</span><b>${gd(ctx.totalPrevu)}</b></div>` : ""}
    ${k.jours_paiement?.length ? `<div class="wide"><span>Peman jiska jodi a</span><b>${fè} ${t("jou peye")} · ${prevu} ${t("jou prevwa")}${ctx.aRekipere ? ` · <span class="reta">${rekipere(ctx.aRekipere, ctx.anReta)}</span>` : ""}</b>
      ${bar(pct(fè, prevu), "", "Peman jiska jodi a")}</div>` : ""}
  </div>
  ${k._actif ? `<div class="btn-row"><a class="btn pri" href="${ctx.hrefTx}" data-act="tx">＋ Tranzaksyon</a><button type="button" class="btn" id="papeye">Pa peye · Fidbak</button></div>` : ""}
  </div>`;
}

// ---------- Rapò ----------
export function rapo(ctx) {
  const { jou, kpi, poko, nonJou, i, swiviStats: sw } = ctx;
  const K = (key, label, val, valHtml, small, cls = "") => `<div class="kpi ${cls}" data-kpi="${key}" data-val="${val}"><span>${label}</span><b>${valHtml}</b><small>${small}</small></div>`;
  const R = (key, label, val, valHtml, small) => `<div class="kpi-r" data-kpi="${key}" data-val="${val}"><span>${label}<small>${small}</small></span><b>${valHtml}</b></div>`;
  const tot = sw?.total || 0;
  const w = (n) => (tot ? Math.round(((n || 0) / tot) * 100) : 0);
  const jouTxt = t(nonJou(i)).toLowerCase();
  return `
  <div class="band rapo-h">
    <h1>Rapò</h1>
    <div class="jr" role="tablist" aria-label="Jou">${jou.map((x) => `<button type="button" role="tab" aria-selected="${x.on}" class="jchip ${x.on ? "on" : ""}" data-j="${x.i}">${x.label}<small>${datKout(x.date)}</small></button>`).join("")}</div>
    ${K("kach", "Kach nan men pou remèt nan kès", kpi.kach, gd(kpi.kach), `${kpi.kachTxt || `Depo − retrè peye · ${t("frè ak viman pa ladan l")}`}`, "main")}
  </div>
  <div class="rapo-g">
  <div class="kpis">
    ${K("depo", "Depo ankese", kpi.depo, `<span class="in">${gd(kpi.depo)}</span>`, `${kpi.nDepo} depo`)}
    ${K("retre", "Retrè peye", kpi.retre, `<span class="out">${gd(kpi.retre)}</span>`, `${kpi.nRetre} retrè`)}
    ${K("fre", "Frè", kpi.fre, `<span class="fee">${gd(kpi.fre)}</span>`, `${kpi.nFre} · ${t("pa afekte kach la")}`)}
    ${K("cycles", "Cycle kreye", kpi.cycles, kpi.cycles, jouTxt)}
  </div>
  <div class="rapo-2">
    <div class="card kpi-l">
      ${R("viman", "Viman", kpi.vim, gd(kpi.vim), `${kpi.nVim} · ${t("pa afekte kach la")}`)}
      ${R("deklare", "Balans deklare (total)", kpi.deklare, gd(kpi.deklare), `${kpi.nDeklare} ${t("kont deklare")}`)}
      ${(kpi.ekstra || []).map((x) => R(x.k, x.l, x.v, `<span class="${x.out ? "out" : "in"}">${x.v ? (x.out ? "−" : "+") : ""}${gd(x.v)}</span>`, x.sub)).join("")}
      ${R("papeye", "Kliyan ki pa peye", kpi.swivi, kpi.swivi, t("fidbak anrejistre"))}
      ${R("demann", "Demann an atant", kpi.dmAtant, kpi.dmAtant, t("retrè / viman"))}
    </div>
    <div class="card swivi">
      <h2>Swivi kliyan yo <small>${tot === 1 ? "1 kliyan" : `${tot} ${t("Kliyan").toLowerCase()}`} · ${jouTxt}</small></h2>
      <div class="stack" aria-hidden="true"><i class="s1" style="width:${w(sw?.peye)}%"></i><i class="s2" style="width:${w(sw?.fidbak)}%"></i></div>
      <div class="legend"><span class="l1"><b>${sw?.peye || 0}</b> Peye</span><span class="l2"><b>${sw?.fidbak || 0}</b> Fidbak</span><span class="l3"><b>${sw?.pokoWe || 0}</b> Poko wè</span></div>
    </div>
  </div>
  <div class="rapo-tx">
  ${poko ? `<p class="note warn">${poko} tranzaksyon poko voye: yo konte nan rapò a, men sèvè a poko resevwa yo.</p>` : ""}
  <h2>${ctx.txTit || "Tranzaksyon mwen yo"} <small>${ctx.nTx}</small></h2>
  <div class="list">${ctx.txHtml || `<p class="empty">Pa gen tranzaksyon ${jouTxt}.</p>`}</div>
  </div>
  </div>`;
}

export default {
  id: "a",
  nom: "Prestige",
  deskripsyon: "Ble marin ak lò. Elegan, pou kliyan ak manadjè.",
  fonts: ["https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"],
  tem: "both",
  themeColor: { light: "#14284b", dark: "#0b1222" },
  // Tradiksyon franse pou nouvo fraz look la (sa ki deja nan i18n.js pa bezwen repete).
  fr: {
    "Ble marin ak lò. Elegan, pou kliyan ak manadjè.": "Bleu marine et or. Élégant, pour clients et managers.",
    "Kont aktif": "Comptes actifs",
    "Tout kliyan jodi a peye ✓": "Tous les clients du jour ont payé ✓",
    "1 kliyan rete pou w wè": "1 client reste à voir",
    "1 kliyan": "1 client",
    "Pwogrè cycle": "Progression du cycle", "Pwogrè": "Progression",
    "Pa gen telefòn": "Pas de téléphone",
    "0 cycle aktif": "Aucun cycle actif", "1 cycle aktif": "1 cycle actif", "2 cycle aktif": "2 cycles actifs", "3 cycle aktif": "3 cycles actifs",
    "4 cycle aktif": "4 cycles actifs", "5 cycle aktif": "5 cycles actifs", "6 cycle aktif": "6 cycles actifs",
    "1 jou an reta": "1 jour de retard", "jou an reta": "jours de retard",
    "Poko wè": "Pas encore vus",
    "aktif": "en cours",
    "fini": "terminés",
    "Jou": "Jour",
  },
  parts: { tablo, epay, kontRow, fich, cycleTop, rapo },
};
