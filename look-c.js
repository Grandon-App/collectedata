// LOOK C · Lannuit — toujou fonse, kontras fò, chif an mono. (Kontra: LOOKS.md. Modèl vizyèl: tests/refonte/C-*.dc.html)
// Chak pati = fn(ctx) → HTML. app.js branche evènman yo sou hook yo (id, klas, data-attribut) — pa retire yo.
import { h, d, gd, gn, datFr, datKout, lèKout, non, inisyal, JOU, JOU_KOUT, lisJou, avatar, badgePend, badgeKont, ICO, MOTIF_KOUT, pct, t, FUSEAU, objektif, mwa, rekipere } from "./fmt.js";

// ---------- Ti zouti pwòp look la ----------
const isoJouDe = (iso) => ((new Date(String(iso).slice(0, 10) + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
const prenon = (moi) => String(moi?.nom || "").trim().split(" ")[0] || "";
const fmtJouLokal = new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" });
// Jou (YYYY-MM-DD, lè Ayiti) yon tranzaksyon: sa ki poko voye yo gen yon dat ISO (UTC).
const jouDe = (tx) => (tx._pending || tx._local_date ? fmtJouLokal.format(new Date(tx.date_transaction)) : String(tx.date_transaction || "").slice(0, 10));
// Lè dènye depo jodi a (k._txs klase nouvo → ansyen).
function lèDènyeDepo(k, today) {
  const tx = (k._txs || []).find((x) => x.type_transaction === "D" && !x.virement_from && x.validation_status !== "rejected" && jouDe(x) === today);
  return tx ? lèKout(tx.date_transaction) : "";
}
// Montan an mono ak yon ti "G" (pou gwo chif yo).
const gnM = (n) => gn(n).replace(/^-/, "−"); // siy mwens vre (U+2212), menm jan ak liy liv kont lan
const mG = (n, cls = "") => `<b class="mono ${cls}">${gnM(n)}<i>G</i></b>`;
// Etikèt seksyon (majiskil, 11 px) ak yon ti kontè mono adwat.
const lbl = (txt, right = "") => `<h2>${txt}${right ? `<small>${right}</small>` : ""}</h2>`;
const ETA_H = { konple: "semèn konplè", pasyel: "pasyèl", rate: "rate", ankou: "semèn sa a", okenn: "", avni: "" };
// Chalè 13 semèn (ansyen → kounye a): 13 ti kare.
function heatmap(heat) {
  const l = heat || [];
  if (!l.length) return "";
  const n = (s) => l.filter((x) => x.state === s).length;
  const sum = [["konple", n("konple")], ["pasyel", n("pasyel")], ["rate", n("rate")]].filter(([, c]) => c).map(([s, c]) => `${c} ${t(ETA_H[s])}`).join(" · ") || t("okenn vèsman");
  return `<div class="heat" role="img" aria-label="${h(t("13 dènye semèn"))}: ${h(sum)}">${l.map((x) => `<i class="${x.state}" title="${datKout(x.debut)} → ${datKout(x.fen)}${x.prevu ? ` · ${x.peye}/${x.prevu}` : ""}"></i>`).join("")}</div>
  <div class="legend"><span class="konple">semèn konplè</span><span class="pasyel">pasyèl</span><span class="rate">rate</span><span class="ankou">semèn sa a</span></div>`;
}
// Semèn aktyèl la (Len → Sam) ak eta chak jou.
const ETA_J = { peye: "peye", jodi: "jodi a, poko peye", avni: "k ap vini", rate: "rate", ferye: "jou ferye", pa: "pa jou peman" };
function semèn(dots) {
  const l = dots || [];
  if (!l.length) return "";
  return `<div class="wk" role="list" aria-label="Semèn sa a">${l.map((x) => `<span class="wd ${x.state}${x.jodi ? " now" : ""}" role="listitem" aria-label="${JOU_KOUT[x.j]} · ${t(ETA_J[x.state] || "")}"><i class="mono" aria-hidden="true">${JOU_KOUT[x.j]}</i></span>`).join("")}</div>`;
}
// Kat yon cycle aktif (Fich + Cycle): no_compte, AKTIF, Plan / Vèsman / Objektif, chalè 13 semèn.
function cycCard(x, { man, href = null, dots = null, extra = "" } = {}) {
  const k = x.k;
  const body = `
    <div class="cyc-h"><b class="mono">${d(k.no_compte || t("Cycle poko voye"))}</b><span>${badgePend(k)}<i class="st ${k._actif ? "ok" : "mut"}">${k._actif ? "Aktif" : "Fini"}</i></span></div>
    <div class="cyc-3">
      <div><span>Plan</span><b class="mono">${gd(k.montant_plan)}</b></div>
      <div><span>Vèsman</span><b class="mono">${x.nPeye}/${x.nPrevu ?? "?"}</b></div>
      <div><span>Objektif</span><b class="mono">${k._totalPrevu != null ? gd(k._totalPrevu) : "—"}</b></div>
    </div>
    ${man && x.solde != null ? `<div class="cyc-bal">${t("Balans")}: <b class="mono">${gd(x.solde)}</b></div>` : ""}
    ${heatmap(x.heat)}${dots ? semèn(dots) : ""}${extra}`;
  return href ? `<a class="card cyc lnk" href="${href}">${body}</a>` : `<div class="card cyc">${body}</div>`;
}
const stile = (label, valHtml, small, cls = "") => `<div class="stile ${cls}"><span>${label}</span>${valHtml}<small>${small}</small></div>`;

// ---------- Tablo de bò ----------
export function tablo(ctx) {
  const { moi, today, stats } = ctx;
  const rete = Math.max(0, stats.pouJodi - stats.peye);
  return `
  <p class="hello">Bonjou ${d(prenon(moi))} · ${t(JOU[ctx.isoJou])} <span class="mono">${datKout(today)}</span></p>
  <h1>Tablo de bò</h1>
  <div class="stat2">
    ${stile("Kolekte jodi a", mG(stats.kolekte, "ok"), `<span class="mono">${stats.peye} / ${stats.pouJodi}</span> kliyan${rete ? ` · <span class="mono">${rete}</span> poko wè` : ""}`)}
    ${stile("Demann", `<b class="mono ${stats.enAtant ? "gold" : ""}">${stats.enAtant}</b>`, "retrè · viman")}
  </div>
  ${objektif(stats)}
  ${mwa(stats)}
  ${lbl("Ale nan")}
  <div class="nl">
    <a href="#/kliyan">${ICO.kliyan}<span class="grow"><b>Kliyan</b><small><span class="mono">${stats.kliyan}</span> kliyan</small></span><i>${ICO.retou}</i></a>
    <a href="#/epay">${ICO.epay}<span class="grow"><b>Epay</b><small><span class="mono">${stats.aktif}</span> cycle aktif${stats.anReta ? ` · <span class="err-t"><span class="mono">${stats.anReta}</span> an reta</span>` : ""}</small></span><i>${ICO.retou}</i></a>
    <a href="#/rapo">${ICO.rapo}<span class="grow"><b>Rapò</b><small>Kach pou remèt nan kès</small></span><i>${ICO.retou}</i></a>
  </div>`;
}

// ---------- Yon liy kont (Epay) ----------
export function kontRow(r) {
  const { k, c, man, sekyon, ok, fidbakJodi, today } = r;
  const id = k.id_compte_epargne;
  const nom = `<b class="nm">${d(r.nonKliyan || non(c))}</b>`;
  const sub = `<div class="mono sub">${d(r.noKont || k.no_compte || t("Cycle poko voye"))} · ${gd(r.plan ?? k.montant_plan)}</div>`;
  if (sekyon === "jodi") {
    const fb = fidbakJodi && !ok;
    const lè = ok ? lèDènyeDepo(k, today) : ""; // vid si depo jodi a pa nan k._txs: pa ekri "peye" san lè
    return `<div class="row kr${ok ? " peye" : ""}">
      ${avatar(c)}
      <a class="grow lnk" href="#/cycle/${id}"><div class="nml">${nom} ${badgePend(k)}</div>${sub}
        ${fb ? `<div class="fbk">Fidbak anrejistre · ${t(MOTIF_KOUT[fidbakJodi] || "Fidbak")}</div>` : ""}</a>
      ${ok ? `<div class="right"><b class="mono ok-t">✓ ${gn(r.jodiMontan ?? k._jodi)}</b>${lè ? `<small>peye <span class="mono">${h(lè)}</span></small>` : ""}</div>`
        : `<div class="btns-v"><a class="btn sm ${fb ? "" : "pri"}" href="#/tx/nouvo/${id}">Depo</a><button type="button" class="btn sm ghost" data-papeye="${id}">Pa peye</button></div>`}
    </div>`;
  }
  return `<div class="row kr">
    ${avatar(c)}
    <a class="grow lnk" href="#/cycle/${id}"><div class="nml">${nom} ${badgePend(k)}</div>${sub}
      ${k.frequence_semaine || r.aRekipere > 0 ? `<div class="mut xs">${[k.frequence_semaine ? `${k.frequence_semaine}×/sem · ${lisJou(k.jours_paiement)}` : "", r.aRekipere > 0 ? `<span class="err-t">${rekipere(r.aRekipere, r.anReta)}</span>` : ""].filter(Boolean).join(" · ")}</div>` : ""}
      ${man && r.solde != null ? `<div class="bal">${t("Balans")}: <b class="mono">${gd(r.solde)}</b></div>` : ""}</a>
    <div class="btns-v"><b class="mono cnt-v">${r.nPeye}/${r.nPrevu ?? "?"}</b><a class="btn sm pri" href="#/tx/nouvo/${id}">Depo</a></div>
  </div>`;
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
  <div class="page-head"><h1>Epay</h1><a class="btn sm" href="#/chwazi/cycle">＋ Nouvo cycle</a></div>
  <div class="stat2">
    ${stile("Kolekte jodi a", mG(stats.kolekte, "ok"), `<span class="mono">${stats.peye} / ${stats.pouJodi}</span> kliyan`)}
    ${stile("Demann", `<b class="mono ${stats.enAtant ? "gold" : ""}">${stats.enAtant}</b>`, "retrè · viman")}
  </div>
  <div class="tabs" role="tablist">${ongs.map(([k, l, n]) => `<button type="button" role="tab" id="tab-${k}" class="tab ${k === ong ? "on" : ""}" aria-selected="${k === ong}" aria-controls="ong" data-ong="${k}">${l}${n ? `<span class="cnt-b mono">${n}</span>` : ""}</button>`).join("")}</div>
  <div id="ong" role="tabpanel" aria-labelledby="tab-${ong}">${body}</div>`;
}

// ---------- Fich kliyan ----------
export function fich(ctx) {
  const { c, photo, ks, man, info, gpsOk } = ctx;
  const I = Object.fromEntries(info.map((x) => [x.key, x]));
  const val = (x) => (x && x.html) || "";
  const join = (...l) => l.filter(Boolean).join(" · ");
  const kv = (label, html, mono = false) => `<div class="kv"><span>${label}</span><b class="${mono ? "mono" : ""}">${html || `<span class="mut">—</span>`}</b></div>`;
  const aktif = ks.filter((x) => x.on), lot = ks.filter((x) => !x.on);
  return `
  <div class="topr"><a href="#/kliyan" class="back">‹ Kliyan</a><a class="btn sm" href="${ctx.hrefModifye}">Modifye</a></div>
  <div class="fich-2">
  <div class="fich-l">
  <div class="fich-h">
    ${photo ? `<img class="avatar" src="${h(photo)}" alt="" data-legend="${h(non(c))}" title="Peze foto a pou wè l pi gwo">` : `<div class="avatar ph" aria-hidden="true">${h(inisyal(c))}</div>`}
    <div class="grow">
      <h1>${d(non(c))}</h1>
      <div class="mono sub">${d(c.code_client || t("ID poko vini"))}${c.pseudo ? ` · ${d(c.pseudo)}` : ""}</div>
      <div class="fich-g">${gpsOk ? `<span class="ok-t">● GPS aktive</span>${ctx.mapsHref ? ` · <a href="${h(ctx.mapsHref)}" target="_blank" rel="noopener">Wè sou kat la</a>` : ""}` : `<span class="mut">○ Pa gen GPS</span>`}${badgePend(c) ? ` ${badgePend(c)}` : ""}</div>
    </div>
  </div>
  ${ctx.errHtml || ""}
  <div class="card info">
    ${kv(I.telefon?.label || "Telefòn", val(I.telefon), true)}
    ${kv(c.piece ? d(c.piece) : (I.pyes?.label || "Pyès idantifikasyon"), c.piece ? d(c.numero_piece || "—") : val(I.pyes), true)}
    ${kv(I.nesans?.label || "Dat nesans", val(I.nesans))}
    ${kv(I.adres?.label || "Adrès", val(I.adres))}
    ${kv(I.biznis?.label || "Kote biznis la", val(I.biznis))}
    ${kv(val(I.sekte) || !val(I.aktivite) ? (I.sekte?.label || "Sektè") : (I.aktivite?.label || "Aktivite"), join(val(I.sekte), val(I.aktivite)))}
    ${kv(val(I.vant) || !val(I.kapasite) ? (I.vant?.label || "Pwen de vant") : (I.kapasite?.label || "Kapasite distribisyon"), join(val(I.vant), val(I.kapasite)))}
  </div>
  </div>
  <div class="fich-r">
  <div class="lrow">${lbl("Cycle aktif", aktif.length > 1 ? String(aktif.length) : "")}<a class="lnk-a" href="${ctx.hrefNouvoCycle}">＋ Nouvo cycle</a></div>
  ${aktif.length ? aktif.map((x) => cycCard(x, { man, href: x.href })).join("") : `<p class="empty">${ks.length ? "Pa gen cycle aktif." : "Pa gen cycle."}</p>`}
  ${lot.length ? `${lbl("Lòt cycle", String(lot.length))}<div class="list">${lot.map((x) => `<a class="row" href="${x.href}">
      <div class="grow"><b class="mono">${d(x.k.no_compte || t("Cycle poko voye"))}</b> ${badgePend(x.k)}
        <div class="mut xs">Plan <span class="mono">${gd(x.k.montant_plan)}</span> · ${x.k.frequence_semaine ? `${x.k.frequence_semaine}×/sem (${lisJou(x.k.jours_paiement)})` : "—"}</div>
        <div class="mut xs mono">${datKout(x.k.date_debut)} → ${datFr(x.k.date_fin)}</div></div>
      <div class="right"><b class="mono">${man && x.solde != null ? gd(x.solde) : `${x.nPeye}/${x.nPrevu ?? "?"}`}</b><br>${badgeKont(x.k)}</div></a>`).join("")}</div>` : ""}
  </div>
  </div>`;
}

// ---------- Tèt fich cycle ----------
export function cycleTop(ctx) {
  const { k, c, man, fè, prevu } = ctx;
  const prog = k.jours_paiement?.length ? `<div class="prog"><span>Peman jiska jodi a</span><b><span class="mono">${fè}</span> jou peye · <span class="mono">${prevu}</span> jou prevwa${ctx.aRekipere ? ` · <span class="err-t">${rekipere(ctx.aRekipere, ctx.anReta)}</span>` : ""}</b>
      <div class="bar" role="progressbar" aria-label="${h(t("Peman jiska jodi a"))}" aria-valuemin="0" aria-valuemax="${prevu}" aria-valuenow="${fè}"><i style="width:${pct(fè, prevu)}%"></i></div></div>` : "";
  return `
  <div class="topr"><a href="#/epay" class="back">‹ Epay</a><a class="kli" href="${ctx.hrefKliyan}">${avatar(c, "thumb xs")}<span>${d(non(c))}</span>${ICO.retou}</a></div>
  <h1 class="mono">${d(k.no_compte || t("Cycle poko voye"))} ${ctx.badges.kont} ${ctx.badges.pend}</h1>
  <div class="sub">${d(non(c))} · ${t("Plan")} <span class="mono">${gd(k.montant_plan)}</span>${k.frequence_semaine ? ` · ${k.frequence_semaine}×/sem` : ""} · <span class="mono">${datKout(k.date_debut)} → ${datKout(k.date_fin)}</span></div>
  ${ctx.errHtml || ""}
  <div class="cyc-2">
  ${man && ctx.solde != null
    ? `<div class="card solde"><span>Balans kont lan</span>${mG(ctx.solde, "gold")}<small>Balans valide: <span class="mono">${gd(ctx.soldeValide)}</span>${Number(ctx.depoAnAtant) ? ` · an atant validasyon: <span class="mono">${gd(ctx.depoAnAtant)}</span>` : ""}${ctx.local ? ` · poko voye: <span class="mono">${gd(ctx.local)}</span>` : ""}</small></div>`
    : `<div class="card solde"><span>Vèsman fèt</span><b class="mono gold">${ctx.nDepots}</b><small><span class="mono">${gd(ctx.depots)}</span> · ${t("depo ou wè sou telefòn nan")}</small></div>`}
  ${cycCard({ k, nPeye: ctx.nPeye, nPrevu: ctx.nPrevu, heat: ctx.heat, solde: null }, { man, dots: ctx.dots, extra: prog })}
  ${k._actif ? `<div class="btn-row"><a class="btn pri" href="${ctx.hrefTx}" data-act="tx">＋ Tranzaksyon</a><button type="button" class="btn" id="papeye">Pa peye · Fidbak</button></div>` : ""}
  <div class="card info stats-l">
    <div class="kv"><span>Plan (minimòm)</span><b class="mono">${gd(k.montant_plan)}</b></div>
    <div class="kv"><span>Frekans</span><b>${k.frequence_semaine ? `<span class="mono">${k.frequence_semaine}×</span> ${t("pa semèn")}` : "—"}</b></div>
    <div class="kv"><span>Jou peman</span><b>${k.jours_paiement?.length ? k.jours_paiement.map((j) => t(JOU[j])).join(", ") : "—"}</b></div>
    <div class="kv"><span>Kòmanse</span><b class="mono">${datFr(k.date_debut)}</b></div>
    <div class="kv"><span>Fini</span><b class="mono">${datFr(k.date_fin)}</b></div>
    ${ctx.prevuTotal != null ? `<div class="kv"><span>Vèsman prevwa</span><b><span class="mono">${ctx.prevuTotal}</span> <small>san dimanch ni jou ferye</small></b></div>
    <div class="kv"><span>Total pou l sanble</span><b class="mono">${gd(ctx.totalPrevu)}</b></div>` : ""}
  </div>
  </div>`;
}

// ---------- Rapò ----------
export function rapo(ctx) {
  const { jou, kpi, poko, nonJou, i, D, parLe, swiviStats: sw } = ctx;
  const jouTxt = t(nonJou(i)).toLowerCase();
  const H = ctx.lang === "fr" ? "h" : "è"; // sifiks lè: 9è / 9h
  const L = (key, label, val, valHtml, small = "") => `<div class="lr" data-kpi="${key}" data-val="${val}"><span>${label}${small ? `<small>· ${small}</small>` : ""}</span>${valHtml}</div>`;
  const M = (key, label, val, cls = "") => `<div class="mini" data-kpi="${key}" data-val="${val}"><b class="mono ${cls}">${val}</b><span>${label}</span></div>`;
  // Kolèk pa lè: 6è → 19è
  const bars = parLe || [];
  const max = Math.max(1, ...bars.map((x) => Number(x.montant) || 0)); // ≥ 1: pa gen NaN si tout montan yo 0
  const tot = bars.reduce((a, x) => a + (x.n || 0), 0);
  const pik = tot ? bars.reduce((a, x) => (x.montant > a.montant ? x : a), bars[0]) : null;
  const chart = bars.length ? `
  <div class="hbar" role="img" aria-label="${h(t("Kolèk pa lè"))}: ${tot ? `${tot} ${h(t("depo"))} · ${h(t("pi fò"))} ${pik.h}${H}` : h(t("pa gen depo"))}">
    ${bars.map((x) => `<i class="${x.montant > 0 ? "on" : ""}" style="height:${x.montant > 0 ? Math.max(12, Math.round((x.montant / max) * 100)) : 6}%" title="${x.h}${H} · ${gd(x.montant)}"></i>`).join("")}
  </div>
  <div class="hlab mono" aria-hidden="true">${bars.map((x) => `<span>${x.h % 2 === 0 ? `${x.h}${H}` : ""}</span>`).join("")}</div>` : "";
  return `
  <div class="page-head"><h1>Rapò</h1>
    <div class="segj" role="tablist" aria-label="Jou">${jou.map((x) => `<button type="button" role="tab" aria-selected="${x.on}" class="${x.on ? "on" : ""}" data-j="${x.i}" title="${datFr(x.date)}">${x.label}</button>`).join("")}</div>
  </div>
  <p class="sub dat">${t(JOU[isoJouDe(D)])} <span class="mono">${datFr(D)}</span></p>
  <div class="rapo-g">
  <div>
    <div class="kach" data-kpi="kach" data-val="${kpi.kach}">
      <span>Kach pou remèt nan kès</span>
      ${mG(kpi.kach, kpi.kach < 0 ? "err-t" : "gold")}
      <small>Depo − retrè peye · ${t("frè ak viman pa ladan l")}</small>
    </div>
    <div class="card ledger">
      ${L("depo", "Depo ankese", kpi.depo, kpi.depo ? `<b class="mono in">+${gn(kpi.depo)}</b>` : `<b class="mono mut">0</b>`, `<span class="mono">${kpi.nDepo}</span>`)}
      ${L("retre", "Retrè peye", kpi.retre, kpi.retre ? `<b class="mono out">−${gn(kpi.retre)}</b>` : `<b class="mono mut">0</b>`, `<span class="mono">${kpi.nRetre}</span>`)}
      ${L("fre", "Frè", kpi.fre, `<b class="mono mut">${gn(kpi.fre)}</b>`, t("pa nan kach"))}
      ${L("viman", "Viman", kpi.vim, `<b class="mono mut">${gn(kpi.vim)}</b>`, t("pa nan kach"))}
      ${L("deklare", "Balans deklare", kpi.deklare, `<b class="mono${kpi.deklare ? "" : " mut"}">${gn(kpi.deklare)}</b>`, kpi.nDeklare ? `<span class="mono">${kpi.nDeklare}</span> ${t("kont deklare")}` : "")}
    </div>
  </div>
  <div>
    <div class="mini3">
      ${M("cycles", "Cycle kreye", kpi.cycles)}
      ${M("papeye", "Kliyan ki pa peye", kpi.swivi, kpi.swivi ? "gold" : "")}
      ${M("demann", "Demann an atant", kpi.dmAtant)}
    </div>
    ${sw && sw.total ? `<p class="swv mut xs">Swivi kliyan yo · <span class="mono">${sw.total}</span> kliyan ${jouTxt}: <span class="ok-t"><span class="mono">${sw.peye}</span> peye</span> · <span class="gold"><span class="mono">${sw.fidbak}</span> fidbak</span>${i === 0 ? ` · <span class="mono">${sw.pokoWe}</span> poko wè` : ""}</p>` : ""}
    ${lbl("Kolèk pa lè")}
    ${chart}
  </div>
  </div>
  ${poko ? `<p class="note warn">${poko} tranzaksyon poko voye: yo konte nan rapò a, men sèvè a poko resevwa yo.</p>` : ""}
  ${lbl(ctx.txTit || "Tranzaksyon mwen yo", String(ctx.nTx))}
  <div class="list">${ctx.txHtml || `<p class="empty">Pa gen tranzaksyon ${jouTxt}.</p>`}</div>`;
}

export default {
  id: "c",
  nom: "Lannuit",
  deskripsyon: "Fonse, kontras fò, chif an premye. Ekonomi batri.",
  fonts: ["https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"],
  tem: "dark",
  themeColor: { light: "#0f1830", dark: "#0f1830" },
  // Tradiksyon franse pou nouvo fraz look la (sa ki deja nan i18n.js pa bezwen repete).
  fr: {
    "kliyan": "clients", "Ale nan": "Aller à",
    "Pa gen cycle aktif.": "Aucun cycle actif.", "Lòt cycle": "Autres cycles", "semèn sa a": "cette semaine", "rate": "manquée",
    "okenn vèsman": "aucun versement", "peye": "payé", "jodi a, poko peye": "aujourd'hui, pas encore payé", "k ap vini": "à venir",
    "jou ferye": "jour férié", "pa jou peman": "pas un jour de paiement", "jou an reta": "jours de retard",
    "Balans deklare": "Solde déclaré", "pa nan kach": "hors caisse", "pi fò": "pic", "pa gen depo": "aucun dépôt", "fidbak": "retours",
  },
  parts: { tablo, epay, kontRow, fich, cycleTop, rapo },
};
