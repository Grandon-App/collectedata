// LOOK B · Mache — klè, gwo bouton jòn safran, fèt pou teren an. (Kontra: LOOKS.md. Modèl vizyèl: tests/refonte/B-*.dc.html)
import { h, d, gd, gn, datFr, datKout, lè, non, inisyal, telFmt, JOU, JOU_KOUT, lisJou, badgePend, badgeKont, ICO, MOTIF_KOUT, pct, t, objektif, mwa, rekipere } from "./fmt.js";

// ---------- Ti zouti pwòp look la ----------
const prenon = (moi) => h(String(moi?.nom || "").trim().split(" ")[0] || "");
// Avatar kare awondi (48 px): foto oswa inisyal. Koulè a varye selon inisyal yo (navy / safran / vèt).
function tile(c, cls = "thumb") {
  if (c?.photo_url) return `<img class="${cls}" src="${h(c.photo_url)}" alt="" loading="lazy" data-legend="${h(non(c))}">`;
  const ini = inisyal(c);
  const n = (ini.charCodeAt(0) + (ini.charCodeAt(1) || 0)) % 3;
  return `<span class="${cls} ph t${n}" aria-hidden="true">${h(ini)}</span>`;
}
// Pwen semèn nan (Len → Sam): vèt plen = peye · safran = jodi a / k ap vini · kare wouj = rate · ti pwen gri = pa jou peman · pwentiye = ferye
function dotsRow(dots) {
  const l = dots || [];
  if (!l.some((x) => x.state !== "pa")) return "";
  const nPeye = l.filter((x) => x.state === "peye").length;
  const nPlan = l.filter((x) => x.state !== "pa" && x.state !== "ferye").length;
  const nRate = l.filter((x) => x.state === "rate").length;
  return `<span class="dots" role="img" aria-label="Semèn sa a: ${nPeye}/${nPlan} jou peye${nRate ? ` · ${nRate} an reta` : ""}">${l.map((x) => `<i class="dt ${x.state}"></i>`).join("")}</span>`;
}
// Liy semèn nan (Len → Sam) ak wonn 26 px, pou kat navy a.
const ETA_JOU = { peye: "Jou peye", jodi: "Jodi a", avni: "K ap vini", rate: "An reta", ferye: "Jou ferye", pa: "" };
function semèn(dots) {
  return `<div class="wk" role="list" aria-label="Semèn sa a">${(dots || []).map((x) => `<div class="wd ${x.state}${x.jodi ? " now" : ""}" role="listitem" aria-label="${JOU_KOUT[x.j]}${ETA_JOU[x.state] ? ` · ${ETA_JOU[x.state]}` : ""}"><span aria-hidden="true">${JOU_KOUT[x.j]}</span><i aria-hidden="true">${x.state === "peye" ? ICO.ok : x.state === "rate" ? ICO.x : ""}</i></div>`).join("")}</div>`;
}
const jouKout = (k) => (k.jours_paiement?.length ? k.jours_paiement.map((j) => JOU_KOUT[j]).join(", ") : "—");

// ---------- Tablo de bò ----------
export function tablo(ctx) {
  const { moi, today, stats } = ctx;
  const tou = stats.pouJodi ? stats.pouJodi - stats.peye : 0;
  return `
  <div class="bhead">
    <div><div class="eyebrow">Bonjou <span data-brut>${prenon(moi)}</span> · ${t(JOU[ctx.isoJou])} ${datKout(today)}</div><h1>Tablo de bò</h1></div>
  </div>
  <div class="tiles3">
    <div class="tile y"><span>Pou wè jodi a</span><b>${stats.peye}<small>/${stats.pouJodi}</small></b><em>${tou ? `${tou} ${t("kliyan rete pou w wè")}` : t("Peye")}</em></div>
    <div class="tile b"><span>Kolekte jodi a</span><b class="amt">${gd(stats.kolekte)}</b></div>
    <div class="tile ${stats.enAtant ? "r" : "g"}"><span>Demann an atant</span><b>${stats.enAtant}</b><em>${t("retrè / viman")}</em></div>
  </div>
  ${objektif(stats)}
  ${mwa(stats)}
  <div class="bigl">
    <a href="#/kliyan"><span class="bi b">${ICO.kliyan}</span><span class="grow"><b>Kliyan</b><small>${stats.kliyan} ${t("Kliyan")}</small></span><i>${ICO.retou}</i></a>
    <a href="#/epay"><span class="bi y">${ICO.epay}</span><span class="grow"><b>Epay</b><small>${stats.aktif} ${t("cycle aktif")}${stats.anReta ? ` · ${stats.anReta} ${t("an reta")}` : ""}</small></span><i>${ICO.retou}</i></a>
    <a href="#/rapo"><span class="bi g">${ICO.rapo}</span><span class="grow"><b>Rapò</b><small>${t("Kach pou remèt nan kès")}</small></span><i>${ICO.retou}</i></a>
  </div>`;
}

// ---------- Yon liy kont (Epay) ----------
export function kontRow(r) {
  const { k, c, man, sekyon, ok, fidbakJodi } = r;
  const id = k.id_compte_epargne;
  const plan = Number(r.plan || k.montant_plan || 0);
  const kont = d(r.noKont || k.no_compte || t("Cycle poko voye"));
  if (sekyon === "jodi") {
    return `<div class="row jcard${ok ? " ok" : ""}">
      <div class="jtop">
        ${tile(c)}
        <a class="grow lnk" href="#/cycle/${id}"><b class="nm">${d(r.nonKliyan || non(c))}</b>
          <div class="mut sm">Plan ${gd(plan)} · ${jouKout(k)}</div>
          <div class="mut xs">${kont} ${badgePend(k)}</div></a>
        ${dotsRow(r.dots)}
      </div>
      ${fidbakJodi && !ok ? `<div class="fb"><span class="chip-fb">${ICO.modifye}<span>Fidbak anrejistre</span>${MOTIF_KOUT[fidbakJodi] ? ` · ${t(MOTIF_KOUT[fidbakJodi])}` : ""}</span></div>` : ""}
      ${ok ? `<div class="jact one"><span class="paid"><i>✓</i> <b class="amt">${gd(r.jodiMontan ?? k._jodi)}</b><small>${t("Peye jodi a")}</small></span></div>`
        : `<div class="jact"><a class="btn pri" href="#/tx/nouvo/${id}">＋ Depo ${gd(plan)}</a><button type="button" class="btn" data-papeye="${id}">Pa peye</button></div>`}
    </div>`;
  }
  const np = r.nPeye ?? k._joursPeye?.size ?? 0, nv = r.nPrevu ?? k._prevuTotal;
  return `<div class="row acard${r.anReta > 0 ? " reta" : ""}">
    ${tile(c)}
    <a class="grow lnk" href="#/cycle/${id}"><b class="nm" id="nm-${id}">${d(r.nonKliyan || non(c))}</b> ${badgePend(k)}
      <div class="mut sm">${kont} · Plan ${gd(plan)}</div>
      <div class="mut xs">${[k.frequence_semaine ? `${k.frequence_semaine}×/sem · ${lisJou(k.jours_paiement)}` : "", `<b class="ink">${np}/${nv ?? "?"}</b> ${t("vèsman")}`, r.aRekipere > 0 ? `<b class="err-t">${rekipere(r.aRekipere, r.anReta)}</b>` : ""].filter(Boolean).join(" · ")}</div>
      ${man && r.solde != null ? `<div class="sm bal">${t("Balans")}: <b>${gd(r.solde)}</b></div>` : ""}
      <div class="bar mini" aria-hidden="true"><i style="width:${pct(np, nv || 0)}%"></i></div></a>
    <a class="btn pri sm sq" href="#/tx/nouvo/${id}" aria-labelledby="dep-${id} nm-${id}">${ICO.plus}<span id="dep-${id}">Depo</span></a>
  </div>`;
}

// ---------- Epay ----------
// Sa chif onglè a vle di, pou lektè ekran sèlman (i18n tradui l): Fidbak = fidbak jodi a, Validasyon = demann an atant.
const SR_CNT = { fidbak: "jodi a", valid: "Demann an atant" };
// Onglè yo: sèl onglè aktif la nan lòd Tab (tabindex 0); flèch yo (app.js) deplase fokis la sou lòt yo (tabindex -1).
export function epay(ctx) {
  const { ong, ongs, stats, filt, q, moi, today } = ctx;
  let body = "";
  if (ong === "kont") {
    body = `
    <div class="tiles3 stat">
      <div class="tile y"><span>Peye</span><b>${stats.peye}<small>/${stats.pouJodi}</small></b></div>
      <div class="tile b"><span>Kolekte</span><b class="amt">${gd(stats.kolekte)}</b></div>
      <div class="tile ${stats.enAtant ? "r" : "n"}"><span>Demann</span><b>${stats.enAtant}</b></div>
    </div>
    ${ctx.kontSeksyon}`;
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
  <div class="bhead">
    <div><div class="eyebrow">${t(JOU[ctx.isoJou])} ${datKout(today)} · <span data-brut>${prenon(moi)}</span></div><h1>Epay</h1></div>
    <a class="btn pri sq" href="#/chwazi/cycle" aria-label="Nouvo cycle">${ICO.plus}<span>Nouvo cycle</span></a>
  </div>
  <div class="tabs" role="tablist">${ongs.map(([k, l, n]) => `<button role="tab" class="tab ${k === ong ? "on" : ""}" aria-selected="${k === ong}" tabindex="${k === ong ? 0 : -1}" data-ong="${k}">${l}${n ? ` <span class="cnt-b">${n}</span>${SR_CNT[k] ? `<span class="sr"> ${SR_CNT[k]}</span>` : ""}` : ""}</button>`).join("")}</div>
  <div id="ong">${body}</div>`;
}

// ---------- Fich kliyan ----------
export function fich(ctx) {
  const { c, photo, ks, man, info, age } = ctx;
  const by = (key) => info.find((x) => x.key === key);
  const TIL = ["biznis", "pyes", "aktivite", "vant"];
  const tel = by("telefon");
  const li = (x) => `<div class="kv"><span>${x.label}</span><b>${x.html || `<span class="mut">—</span>`}</b></div>`;
  const aktif = ks.filter((x) => x.on), lot = ks.filter((x) => !x.on);
  const kat = (x) => {
    const k = x.k;
    const np = x.nPeye ?? 0, nv = x.nPrevu;
    return `<a class="ncard" href="${x.href}" aria-label="Cycle ${h(k.no_compte || t("Cycle poko voye"))} · ${np}/${nv ?? "?"} ${t("vèsman")}">
      <div class="nt"><b>${d(k.no_compte || t("Cycle poko voye"))}</b> ${badgePend(k)}<span class="nd">${datKout(k.date_debut)} → ${datKout(k.date_fin)}</span></div>
      ${semèn(x.dots)}
      <div class="nr"><span><b>${np}</b> / ${nv ?? "?"} ${t("vèsman")}</span><b>${man && x.solde != null ? `${t("Balans")} ${gd(x.solde)}` : `${gd(k._depots || 0)}${k._totalPrevu != null ? ` / ${gd(k._totalPrevu)}` : ""}`}</b></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${x.pwosan || 0}"><i style="width:${x.pwosan || 0}%"></i></div>
    </a>`;
  };
  return `
  <div class="topr">
    <a href="#/kliyan" class="back sq" aria-label="Retounen">${ICO.retou}</a>
    <a class="btn" href="${ctx.hrefModifye}">${ICO.modifye}Modifye</a>
  </div>
  <div class="fich2">
  <div class="fcol fl">
  <div class="head center">
    ${photo ? `<img class="avatar" src="${h(photo)}" alt="" data-legend="${h(non(c))}" title="Peze foto a pou wè l pi gwo">` : `<div class="avatar ph" aria-hidden="true">${h(inisyal(c))}</div>`}
    <h1>${d(non(c))}</h1>
    <div class="sub">${[c.pseudo ? d(c.pseudo) : "", d(c.code_client || t("ID poko vini")), age != null ? `${age} ${ctx.lang === "fr" ? "ans" : "an"}` : ""].filter(Boolean).join(" · ")}</div>
    ${badgePend(c) ? `<div class="sub">${badgePend(c)}</div>` : ""}
  </div>
  ${ctx.errHtml || ""}
  <div class="acts3">
    ${ctx.telHref ? `<a class="act b" href="${h(ctx.telHref)}">${ICO.rele}<span data-brut>${h(telFmt(c.telephone))}</span></a>` : `<div class="act n">${ICO.rele}<span>${tel?.html || t("Telefòn")}</span></div>`}
    ${ctx.mapsHref ? `<a class="act g" href="${h(ctx.mapsHref)}" target="_blank" rel="noopener">${ICO.kat}<span>GPS aktive</span></a>` : `<div class="act w">${ICO.kat}<span>Pa gen GPS</span></div>`}
    <a class="act y" href="${ctx.hrefNouvoCycle}">${ICO.plus}<span>Nouvo cycle</span></a>
  </div>
  <div class="info2">${TIL.map((key) => { const x = by(key); return x ? `<div class="it"><span>${x.label}</span><b>${x.html || `<span class="mut">—</span>`}</b></div>` : ""; }).join("")}</div>
  </div>
  <div class="fcol fr">
  <div class="page-head sub"><h2>Lòt enfòmasyon</h2></div>
  <div class="card info">${info.filter((x) => !TIL.includes(x.key) && x.key !== "gps").map(li).join("")}</div>
  <h2>Cycle aktif</h2>
  ${aktif.length ? aktif.map(kat).join("") : `<p class="empty">Pa gen cycle.</p>`}
  ${lot.length ? `<h2>Cycle yo</h2><div class="list">${lot.map((x) => `<a class="row" href="${x.href}">
      <div class="grow"><b>${d(x.k.no_compte || t("Cycle poko voye"))}</b> ${badgePend(x.k)}
        <div class="mut sm">Plan ${gd(x.k.montant_plan)} · ${x.k.frequence_semaine ? `${x.k.frequence_semaine}×/sem (${lisJou(x.k.jours_paiement)})` : "—"}</div>
        <div class="mut sm">${datFr(x.k.date_debut)} → ${datFr(x.k.date_fin)}</div></div>
      <div class="right"><b>${man && x.solde != null ? gd(x.solde) : `${x.nPeye}/${x.nPrevu ?? "?"}`}</b><br>${badgeKont(x.k)}</div></a>`).join("")}</div>` : ""}
  </div>
  </div>`;
}

// ---------- Tèt fich cycle ----------
export function cycleTop(ctx) {
  const { k, c, man, fè, prevu } = ctx;
  return `
  <div class="topr">
    <a href="#/epay" class="back sq" aria-label="Retounen">${ICO.retou}</a>
    <a class="btn" href="${ctx.hrefKliyan}">${tile(c, "thumb xs")}<span>${d(non(c))}</span></a>
  </div>
  <div class="head center">
    <h1>${d(k.no_compte || t("Cycle poko voye"))} ${ctx.badges.kont} ${ctx.badges.pend}</h1>
    <div class="sub">${d(non(c))} · ${t("Plan (minimòm)")} ${gd(k.montant_plan)}</div>
  </div>
  ${ctx.errHtml || ""}
  ${k._actif ? `<div class="btn-row"><a class="btn pri" href="${ctx.hrefTx}" data-act="tx">＋ Tranzaksyon</a><button type="button" class="btn" id="papeye">Pa peye · Fidbak</button></div>` : ""}
  <div class="ctop">
  <div class="ncard">
    <div class="nt"><b>${t("Semèn sa a")}</b><span class="nd">${datKout(k.date_debut)} → ${datKout(k.date_fin)}</span></div>
    ${semèn(ctx.dots)}
    <div class="nr"><span><b>${ctx.nPeye}</b> / ${ctx.nPrevu ?? "?"} ${t("vèsman")}</span><b>${gd(ctx.depots)}${ctx.totalPrevu != null ? ` / ${gd(ctx.totalPrevu)}` : ""}</b></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ctx.pwosan || 0}"><i style="width:${ctx.pwosan || 0}%"></i></div>
  </div>
  ${man && ctx.solde != null ? `<div class="solde tiles2">
      <div class="tile b"><span>Balans kont lan</span><b class="amt">${gd(ctx.solde)}</b></div>
      <div class="tile n"><span>Balans valide</span><b class="amt">${gd(ctx.soldeValide)}</b><em>${[Number(ctx.depoAnAtant) ? `${t("an atant validasyon")}: ${gd(ctx.depoAnAtant)}` : "", ctx.local ? `${t("poko voye")}: ${gd(ctx.local)}` : ""].filter(Boolean).join(" · ") || "&nbsp;"}</em></div>
    </div>`
    : `<div class="solde tiles2">
      <div class="tile g"><span>Vèsman fèt</span><b>${ctx.nDepots}</b><em>${t("depo ou wè sou telefòn nan")}</em></div>
      <div class="tile n"><span>Total kliyan an mete</span><b class="amt">${gd(ctx.depots)}</b>${ctx.aRekipere > 0 ? `<em class="err-t">${rekipere(ctx.aRekipere, ctx.anReta)}</em>` : `<em>${t("Aktif")}</em>`}</div>
    </div>`}
  <div class="stats card">
    <div><span>Plan (minimòm)</span><b>${gd(k.montant_plan)}</b></div>
    <div><span>Frekans</span><b>${k.frequence_semaine ? `${k.frequence_semaine}× ${t("pa semèn")}` : "—"}</b></div>
    <div class="wide"><span>Jou peman</span><b>${k.jours_paiement?.length ? k.jours_paiement.map((j) => t(JOU[j])).join(", ") : "—"}</b></div>
    <div><span>Kòmanse</span><b>${datFr(k.date_debut)}</b></div>
    <div><span>Fini</span><b>${datFr(k.date_fin)}</b></div>
    ${ctx.prevuTotal != null ? `<div><span>Vèsman prevwa</span><b>${ctx.prevuTotal}</b><small class="mut">san dimanch ni jou ferye</small></div>
    <div><span>Total pou l sanble</span><b>${gd(ctx.totalPrevu)}</b></div>` : ""}
    ${k.jours_paiement?.length ? `<div class="wide"><span>Peman jiska jodi a</span><b>${fè} ${t("jou peye")} · ${prevu} ${t("jou prevwa")}</b>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${prevu}" aria-valuenow="${fè}"><i style="width:${pct(fè, prevu)}%"></i></div></div>` : ""}
  </div>
  </div>`;
}

// ---------- Rapò ----------
export function rapo(ctx) {
  const { jou, kpi, poko, nonJou, i, D, swiviStats: sw } = ctx;
  return `
  <div class="bhead"><div><h1>Rapò</h1></div></div>
  <div class="chips" role="tablist">${jou.map((x) => `<button role="tab" aria-selected="${x.on}" class="chip ${x.on ? "on" : ""}" data-j="${x.i}" title="${datFr(x.date)}">${x.label}</button>`).join("")}</div>
  <p class="eyebrow rdate">${t(JOU[ctx.isoJou])} ${datFr(D)}</p>
  <div class="rtop">
  <div class="kach" data-kpi="kach" data-val="${kpi.kach}">
    <span>Kach pou remèt nan kès</span>
    <b class="${kpi.kach < 0 ? "neg" : ""}">${gd(kpi.kach)}</b>
    <div class="kp"><i>+${gn(kpi.depo)} depo</i><i>−${gn(kpi.retre)} retrè</i></div>
    <small>${kpi.kachTxt || `Depo − retrè peye · ${t("frè ak viman pa ladan l")}`}</small>
  </div>
  <div class="rlist">
    <div class="rl" data-kpi="depo" data-val="${kpi.depo}"><div class="ri g">${ICO.monte}</div><div class="grow"><b>Depo ankese</b><div class="mut sm">${kpi.nDepo} depo${kpi.nDeklare ? ` · ${gd(kpi.deklare)} ${t("balans deklare")}` : ""}</div></div><b class="rv in">${gd(kpi.depo)}</b></div>
    <div class="rl" data-kpi="retre" data-val="${kpi.retre}"><div class="ri r">${ICO.desann}</div><div class="grow"><b>Retrè peye</b><div class="mut sm">${kpi.nRetre} retrè</div></div><b class="rv out">${gd(kpi.retre)}</b></div>
    <div class="rl" data-kpi="fre" data-val="${kpi.fre}"><div class="ri y">${ICO.liy}</div><div class="grow"><b>Frè ak viman</b><div class="mut sm">${kpi.nFre} frè · <span class="vim" data-kpi="viman" data-val="${kpi.vim}">${kpi.nVim} viman <b>${gd(kpi.vim)}</b></span> · ${t("Pa afekte kach la")}</div></div><b class="rv fee">${gd(kpi.fre)}<small>frè</small></b></div>
  </div>
  </div>
  <div class="tiles3 mini">
    <div class="tile n" data-kpi="cycles" data-val="${kpi.cycles}"><b>${kpi.cycles}</b><span>Cycle kreye</span></div>
    <div class="tile n" data-kpi="papeye" data-val="${kpi.swivi}"><b>${kpi.swivi}</b><span><span aria-hidden="true">Pa peye</span><span class="sr">Kliyan ki pa peye</span></span></div>
    <div class="tile n" data-kpi="demann" data-val="${kpi.dmAtant}"><b>${kpi.dmAtant}</b><span><span aria-hidden="true">Demann</span><span class="sr">Demann an atant</span></span></div>
    <div class="tile n wide dek" data-kpi="deklare" data-val="${kpi.deklare}"><span>Balans deklare (total)</span><b class="amt">${gd(kpi.deklare)}</b><em>${kpi.nDeklare} ${t("kont deklare")}</em></div>
  </div>
  ${sw && sw.total ? `<div class="swv"><b>Swivi kliyan yo</b><span class="ok-t">${sw.peye} ${t("Peye")}</span><span class="warn-t">${sw.fidbak} ${t("fidbak anrejistre")}</span>${i === 0 ? `<span class="mut">${sw.pokoWe} ${t("poko wè")}</span>` : ""}</div>` : ""}
  ${poko ? `<p class="note warn">${poko} tranzaksyon poko voye: yo konte nan rapò a, men sèvè a poko resevwa yo.</p>` : ""}
  <h2>${ctx.txTit || "Tranzaksyon mwen yo"} <span class="cnt-h">${ctx.nTx}</span></h2>
  <div class="list rtx">${ctx.txHtml || `<p class="empty">Pa gen tranzaksyon ${t(nonJou(i)).toLowerCase()}.</p>`}</div>`;
}

export default {
  id: "b",
  nom: "Mache",
  deskripsyon: "Klè, gwo bouton jòn safran. Fèt pou teren an, anba solèy.",
  fonts: ["https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"],
  tem: "both",
  themeColor: { light: "#ffffff", dark: "#0f172a" },
  fr: { "Lòt enfòmasyon": "Autres informations", "K ap vini": "À venir", "Frè ak viman": "Frais et virements", "frè": "frais", "viman": "virement(s)" },
  parts: { tablo, epay, kontRow, fich, cycleTop, rapo },
};
