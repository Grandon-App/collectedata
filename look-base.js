// Pati "baz": rann aktyèl la (ble marin senp). Chak look kòmanse ak yo, epi ranplase yo ak pwòp vèsyon li.
// Kontra ctx yo: LOOKS.md.
import { h, d, gd, datFr, lè, non, JOU, lisJou, avatar, badgePend, badgeKont, ICO, pct, t } from "./fmt.js";

export function tablo(ctx) {
  const { moi, today, stats } = ctx;
  return `
  <p class="hello">Bonjou ${h(moi.nom.split(" ")[0])} · <span class="mut">${t(JOU[ctx.isoJou])} ${datFr(today)}</span></p>
  <div class="card soon">
    <div class="soon-ico" aria-hidden="true">${ICO.tablo}</div>
    <h1>Tablo de bò</h1>
    <p class="mut">Paj sa a ap vini byento.</p>
    <p class="mut sm">${stats.peye}/${stats.pouJodi} ${t("peman jodi a")} · ${gd(stats.kolekte)} ${t("kolekte")}</p>
    <div class="soon-links">
      <a class="btn" href="#/kliyan">Kliyan</a><a class="btn" href="#/epay">Epay</a><a class="btn" href="#/rapo">Rapò</a>
    </div>
  </div>`;
}

export function kontRow(r) {
  const { k, c, man, sekyon, ok, fidbakJodi } = r;
  const id = k.id_compte_epargne;
  if (sekyon === "jodi") {
    return `<div class="row">
      ${avatar(c)}<a class="grow lnk" href="#/cycle/${id}"><b>${d(non(c))}</b><div class="mut sm">${d(k.no_compte || t("Cycle poko voye"))} · plan ${gd(k.montant_plan)}</div>
        ${fidbakJodi && !ok ? `<div class="sm"><span class="badge warn">Fidbak anrejistre</span></div>` : ""}</a>
      ${ok ? `<span class="badge ok">✓ ${gd(k._jodi)}</span>` : `<div class="btns-v"><a class="btn sm pri" href="#/tx/nouvo/${id}">Depo</a><button class="btn sm" data-papeye="${id}">Pa peye</button></div>`}</div>`;
  }
  return `<div class="row">
    <a class="grow lnk" href="#/cycle/${id}"><b>${d(non(c))}</b> ${badgePend(k)}
      <div class="mut sm">${d(k.no_compte || t("Cycle poko voye"))} · plan ${gd(k.montant_plan)}</div>
      <div class="mut sm">${k.frequence_semaine ? `${k.frequence_semaine}×/sem · ${lisJou(k.jours_paiement)}` : "—"} · ${r.nPeye}/${r.nPrevu ?? "?"} ${t("vèsman")}</div>
      ${man && r.solde != null ? `<div class="sm"><b>${t("Balans")}: ${gd(r.solde)}</b></div>` : ""}</a>
    <a class="btn sm pri" href="#/tx/nouvo/${id}">Depo</a></div>`;
}

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
    body = `<p class="mut sm">Retrè ak viman yo bezwen otorizasyon yon manadjè. Lè ou apwouve, ekriti yo pase touswit sou kont yo.</p>
    <div class="list">${ctx.validHtml || `<p class="empty">Pa gen demann an atant.</p>`}</div>`;
  }
  return `
  <div class="page-head"><h1>Epay</h1><a class="btn pri" href="#/chwazi/cycle">＋ Nouvo cycle</a></div>
  <div class="tabs" role="tablist">${ongs.map(([k, l, n]) => `<button role="tab" class="tab ${k === ong ? "on" : ""}" aria-selected="${k === ong}" data-ong="${k}">${l}${n ? ` <span class="cnt-b">${n}</span>` : ""}</button>`).join("")}</div>
  <div id="ong">${body}</div>`;
}

export function fich(ctx) {
  const { c, photo, ks, man, info } = ctx;
  const li = (x) => `<div class="kv"><span>${x.label}</span><b>${x.html || `<span class="mut">—</span>`}</b></div>`;
  return `
  <a href="#/kliyan" class="back">‹ Kliyan</a>
  <div class="card head">
    ${photo ? `<img class="avatar" src="${h(photo)}" alt="" data-legend="${h(non(c))}" title="Peze foto a pou wè l pi gwo">` : `<div class="avatar ph" aria-hidden="true">${h((c.prenom || "?")[0])}</div>`}
    <div class="grow"><h1>${d(non(c))}</h1>
      <div class="mut">${d(c.code_client || t("ID poko vini"))}</div>
      ${badgePend(c)}</div>
  </div>
  ${ctx.errHtml || ""}
  <div class="page-head sub"><h2>Enfòmasyon kliyan an</h2><a class="btn sm" href="${ctx.hrefModifye}">Modifye</a></div>
  <div class="card info">${info.map(li).join("")}</div>
  <a class="btn pri block" href="${ctx.hrefNouvoCycle}">＋ Nouvo cycle Grandon</a>
  <h2>Cycle yo</h2>
  <div class="list">${ks.map((x) => `<a class="row" href="${x.href}">
      <div class="grow"><b>${d(x.k.no_compte || t("Cycle poko voye"))}</b> ${badgePend(x.k)}
        <div class="mut sm">Plan ${gd(x.k.montant_plan)} · ${x.k.frequence_semaine ? `${x.k.frequence_semaine}×/sem (${lisJou(x.k.jours_paiement)})` : "—"}</div>
        <div class="mut sm">${datFr(x.k.date_debut)} → ${datFr(x.k.date_fin)}</div></div>
      <div class="right"><b>${man && x.solde != null ? gd(x.solde) : `${x.nPeye}/${x.nPrevu ?? "?"}`}</b><br>${badgeKont(x.k)}</div></a>`).join("") || `<p class="empty">Pa gen cycle.</p>`}</div>`;
}

export function cycleTop(ctx) {
  const { k, c, man, fè, prevu } = ctx;
  return `
  <a href="#/epay" class="back">‹ Epay</a>
  <div class="card head">
    ${avatar(c, "avatar")}
    <div class="grow"><h1>${d(k.no_compte || t("Cycle poko voye"))} ${ctx.badges.kont} ${ctx.badges.pend}</h1>
      <a class="mut" href="${ctx.hrefKliyan}">${d(non(c))}</a></div>
  </div>
  ${ctx.errHtml || ""}
  ${man && ctx.solde != null ? `<div class="card solde"><span>Balans kont lan</span><b>${gd(ctx.solde)}</b>
      <small class="mut">Balans valide: ${gd(ctx.soldeValide)}${Number(ctx.depoAnAtant) ? ` · an atant validasyon: ${gd(ctx.depoAnAtant)}` : ""}${ctx.local ? ` · poko voye: ${gd(ctx.local)}` : ""}</small></div>`
    : `<div class="card solde"><span>Vèsman fèt</span><b>${ctx.nDepots}</b><small class="mut">${gd(ctx.depots)} · ${t("depo ou wè sou telefòn nan")}</small></div>`}
  <div class="card stats">
    <div><span>Plan (minimòm)</span><b>${gd(k.montant_plan)}</b></div>
    <div><span>Frekans</span><b>${k.frequence_semaine ? `${k.frequence_semaine}× pa semèn` : "—"}</b></div>
    <div class="wide"><span>Jou peman</span><b>${k.jours_paiement?.length ? k.jours_paiement.map((j) => t(JOU[j])).join(", ") : "—"}</b></div>
    <div><span>Kòmanse</span><b>${datFr(k.date_debut)}</b></div>
    <div><span>Fini</span><b>${datFr(k.date_fin)}</b></div>
    ${ctx.prevuTotal != null ? `<div><span>Vèsman prevwa</span><b>${ctx.prevuTotal}</b><small class="mut">san dimanch ni jou ferye</small></div>
    <div><span>Total pou l sanble</span><b>${gd(ctx.totalPrevu)}</b></div>` : ""}
    ${k.jours_paiement?.length ? `<div class="wide"><span>Peman jiska jodi a</span><b>${fè} jou peye · ${prevu} jou prevwa</b>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${prevu}" aria-valuenow="${fè}"><i style="width:${pct(fè, prevu)}%"></i></div></div>` : ""}
  </div>
  ${k._actif ? `<div class="btn-row"><a class="btn pri" href="${ctx.hrefTx}" data-act="tx">＋ Tranzaksyon</a><button class="btn" id="papeye">Pa peye · Fidbak</button></div>` : ""}`;
}

export function rapo(ctx) {
  const { jou, kpi, poko, nonJou, i } = ctx;
  const K = (key, label, val, valHtml, small, cls = "") => `<div class="kpi ${cls}" data-kpi="${key}" data-val="${val}"><span>${label}</span><b>${valHtml}</b><small>${small}</small></div>`;
  return `
  <div class="page-head"><h1>Rapò</h1></div>
  <div class="chips" role="tablist">${jou.map((x) => `<button role="tab" aria-selected="${x.on}" class="chip ${x.on ? "on" : ""}" data-j="${x.i}">${x.label}<small>${datFr(x.date)}</small></button>`).join("")}</div>
  <div class="kpis">
    ${K("depo", "Depo ankese", kpi.depo, `<span class="in">${gd(kpi.depo)}</span>`, `${kpi.nDepo} depo`)}
    ${K("retre", "Retrè peye", kpi.retre, `<span class="out">${gd(kpi.retre)}</span>`, `${kpi.nRetre} retrè`)}
    ${K("fre", "Frè", kpi.fre, `<span class="fee">${gd(kpi.fre)}</span>`, `${kpi.nFre} · ${t("pa afekte kach la")}`)}
    ${K("viman", "Viman", kpi.vim, gd(kpi.vim), `${kpi.nVim} · ${t("pa afekte kach la")}`)}
    ${K("deklare", "Balans deklare (total)", kpi.deklare, gd(kpi.deklare), `${kpi.nDeklare} kont deklare`)}
    ${K("cycles", "Cycle kreye", kpi.cycles, kpi.cycles, t(nonJou(i)).toLowerCase())}
    ${K("papeye", "Kliyan ki pa peye", kpi.swivi, kpi.swivi, t("fidbak anrejistre"))}
    ${K("demann", "Demann an atant", kpi.dmAtant, kpi.dmAtant, t("retrè / viman"))}
    ${K("kach", "Kach nan men pou remèt nan kès", kpi.kach, gd(kpi.kach), `Depo − retrè peye · ${t("frè ak viman pa ladan l")}`, "main")}
  </div>
  ${poko ? `<p class="note warn">${poko} tranzaksyon poko voye: yo konte nan rapò a, men sèvè a poko resevwa yo.</p>` : ""}
  <h2>Tranzaksyon mwen yo <small class="mut">(${ctx.nTx})</small></h2>
  <div class="list">${ctx.txHtml || `<p class="empty">Pa gen tranzaksyon ${t(nonJou(i)).toLowerCase()}.</p>`}</div>`;
}

export const parts = { tablo, epay, kontRow, fich, cycleTop, rapo };
