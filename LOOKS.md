# Look yo (A · Prestige, B · Mache, C · Lannuit): kontra teknik

Aplikasyon an gen 3 aparans konplè. Ajan an chwazi youn nan **Paramèt → Look**. Tout 3 yo dwe mache ak menm done, menm fonksyon, menm tès.

## Fichye yo

| Fichye | Wòl | Kiyès ki modifye l |
|---|---|---|
| `looks.js` | Rejis look yo, `applyLook()`, polis Google Fonts | app (pa touche) |
| `look-base.js` | Pati "baz" (rann ble marin senp). Yon look ka re-itilize yo. | app (pa touche) |
| `look-a.js` + `look-a.css` | Look A · Prestige | ekip A |
| `look-b.js` + `look-b.css` | Look B · Mache | ekip B |
| `look-c.js` + `look-c.css` | Look C · Lannuit | ekip C |
| `fmt.js` | Zouti fòma + ti moso HTML komen (`h, d, gd, datFr, lè, lèKout, non, inisyal, tel4, telFmt, JOU, JOU_KOUT, lisJou, avatar, badge*, ICO, LABEL_TX, SIY, KLAS, MOTIFS, motifLabel, MOTIF_KOUT, pct, t`) | app (pa touche; si w bezwen yon zouti, mete l nan modil look ou a) |
| `app.css` | Stil baz (neyit). Look yo ranplase sa yo bezwen. | app (pa touche) |
| `tests/refonte/*.dc.html` | Modèl vizyèl (maket) chak look | referans |

Chak look CSS mete **tout règ li yo anba `html[data-look="x"]`** (pa gen règ global). Li ka ranplase nenpòt klas baz (`.card`, `.btn`, `.row`, `.tabbar`, `#bar`, `.modal`, `.toast`, fòmilè yo, `.seg`, `.chips`, `.kpi`…) pou tout aplikasyon an gen menm aparans, pa sèlman 5 paj yo.

## Modil yon look

```js
export default {
  id: "a", nom: "Prestige", deskripsyon: "…",
  fonts: ["https://fonts.googleapis.com/css2?family=…&display=swap"],   // chaje pa looks.js, cache pa SW (offline)
  tem: "both" | "dark",         // "dark": toujou fonse (C). "both": swiv Paramèt → Tèm (Otomatik / Klè / Fonse)
  themeColor: { light: "#…", dark: "#…" },
  fr: { "fraz kreyòl": "traduction française", … },   // pou tout nouvo tèks look la itilize
  parts: { tablo, epay, kontRow, fich, cycleTop, rapo },
};
```

Chak pati se `fn(ctx) → string HTML`. `app.js` mete HTML la nan paj la epi **li menm** branche evènman yo sou hook yo. Hook yo (id, klas, data-attribut) **obligatwa**: si youn manke, fonksyon an pa mache oswa tès yo echwe.

Règ pou tout pati:
- Tèks UI an kreyòl, dirèkteman nan markup la (tradiktè a ranplase yo an franse). Tout nouvo fraz dwe gen tradiksyon nan `fr`.
- Done brit (non moun, kòd kliyan, nimewo kont, nòt) toujou nan `d(...)` (`<span data-brut>`), pa `h(...)` sèl.
- Montan: `gd(n)` → "2 500 G". Dat: `datFr(iso)`. Lè: `lè(iso)` / `lèKout(iso)`.
- Ikòn: `ICO.x` (SVG stroke, koulè `currentColor`). Pa emoji.
- Lyen ant paj yo: `<a href="#/…">`. Bouton ki fè aksyon: `<button>` (pa `div onclick`).
- Zòn ki ka peze: ≥ 44 px. Kontras tèks ≥ 4.5:1 (3:1 pou tèks ≥ 24 px). Pa depase lajè ekran an (320 px).
- `ctx.man` = manadjè/admin (ka wè balans). Ajan senp **pa dwe janm** wè balans sistèm nan (`solde` ap `null` pou li).

### `tablo(ctx)`
`ctx = { M, moi, man, today, t, lang, isoJou, stats: { pouJodi, peye, kolekte, enAtant, aktif, anReta, kliyan } }`
Paj "Tablo de bò" (poko devlope): yon akèy ak kèk chif + lyen `#/kliyan`, `#/epay`, `#/rapo`.

### `epay(ctx)` — paj Epay konplè
```
ctx = { M, moi, man, today, t, lang, isoJou (1..7 pou today),
  ong: "kont"|"tx"|"valid", ongs: [[id, label, countOrNull]],
  stats: { pouJodi, peye, kolekte, enAtant, aktif, anReta },
  filt: "jodi"|"tout"|"reta", q: "tèks rechèch",
  jodiHtml, kontHtml,            // liy kont yo, deja rann ak kontRow() (mete yo nan #jodi-list / #kont)
  nJodi, nKont, nEnAtant,
  txHtml, demannHtml, validHtml  // lis deja rann (onglè tx / valid); vid pou lòt onglè yo
}
```
Hook obligatwa:
- Onglè: eleman `[data-ong="kont"|"tx"|"valid"]` (`<button role="tab" aria-selected>`; `.on` sou sa ki aktif). "valid" sèlman si li nan `ongs`. Montre kantite a (`ongs[i][2]`) si li pa null.
- `#ong`: kontenè kò onglè aktif la.
- Onglè kont: `#jodi-list` (gen `jodiHtml`, oswa `<p class="empty">Pa gen peman ki tonbe jodi a.</p>`), `#kont` (gen `kontHtml`), `<input id="q" type="search" aria-label="Chèche kont" value="${h(q)}">`, filt `[data-filt="jodi"|"tout"|"reta"]` (`.on` sou `filt`).
- Lyen `#/chwazi/cycle` (nouvo cycle).
- Onglè tx: `demannHtml` (si pa vid) + `txHtml` (oswa "Poko gen tranzaksyon."). Onglè valid: `validHtml` (oswa "Pa gen demann an atant.").

### `kontRow(r)` — yon liy kont (itilize nan 2 lis Epay yo)
```
r = { k, c, man, today, sekyon: "jodi"|"aktif", ok (peye jodi a ≥ plan), jodiPeman, fidbakJodi: motif|null,
      dots: [{ j: 1..6, date, state: "pa"|"ferye"|"peye"|"rate"|"jodi"|"avni", jodi }],   // semèn sa a
      heat: [{ debut, fen, prevu, peye, state: "okenn"|"konple"|"pasyel"|"rate"|"ankou"|"avni" }],  // 13 semèn
      anReta (jou), plan, jodiMontan, solde (null pou ajan), pwosan (0..100), nPeye, nPrevu (oswa null), noKont (oswa null), nonKliyan }
```
Hook obligatwa:
- Lyen `#/cycle/${k.id_compte_epargne}` (sou non an / liy lan).
- `d(nonKliyan)`, `d(noKont || t("Cycle poko voye"))`, plan.
- `sekyon === "jodi"`: si `!ok` → lyen `#/tx/nouvo/${id}` (Depo) **ak** `<button data-papeye="${id}">Pa peye</button>`; si `ok` → montre "✓ ${gd(jodiMontan)}". Si `fidbakJodi && !ok` → yon eleman ak tèks `Fidbak anrejistre` (oswa `MOTIF_KOUT[fidbakJodi]` + badj; tès la chèche tèks "Fidbak anrejistre", kidonk kenbe l nan `title` oswa `aria-label` omwen… pi senp: afiche l).
- `sekyon === "aktif"`: `badgePend(k)`, `${nPeye}/${nPrevu ?? "?"}`, lyen Depo `#/tx/nouvo/${id}`; si `man && solde != null` → tèks `Balans: ${gd(solde)}`.

### `fich(ctx)` — fich kliyan
```
ctx = { M, moi, man, today, t, lang, c, photo (url|null), gpsOk, age (nimewo|null),
  ks: [{ k, href, on, nPeye, nPrevu, solde, pwosan, dots, heat }],
  info: [{ key: telefon|pseudo|nesans|pyes|adres|biznis|gps|sekte|aktivite|vant|kapasite, label, html }],  // html deja echape; "" si vid
  hrefModifye, hrefNouvoCycle, mapsHref|null, telHref|null, errHtml }
```
Hook obligatwa: `img.avatar` (ak `data-legend`) si gen foto, sinon `.avatar.ph` ak inisyal; `h1` ak `d(non(c))`; lyen "Modifye" (`hrefModifye`); lyen `hrefNouvoCycle`; chak `info` ak `label` + `html` (oswa "—"); lyen `tel:` si `telHref`; lyen kat si `mapsHref`; chak cycle → lyen `x.href`. `badgePend(c)`, `errHtml`.

### `cycleTop(ctx)` — tèt fich cycle (app.js ajoute demann/fidbak/tranzaksyon anba l)
```
ctx = { M, moi, man, today, t, lang, k, c, fè, prevu, dots, heat, nPeye, nPrevu, pwosan,
  solde|null, soldeValide, depoAnAtant, local, nDepots, depots, prevuTotal|null, totalPrevu|null, anReta,
  badges: { kont, pend }, hrefTx, hrefKliyan, errHtml }
```
Hook obligatwa: `h1` ak `d(k.no_compte || t("Cycle poko voye"))` + `badges.kont` + `badges.pend`; lyen `hrefKliyan`; `.solde` (ajan: etikèt "Vèsman fèt" + `nDepots`; manadjè: "Balans kont lan" + `gd(solde)`); etikèt "Plan (minimòm)", "Frekans", "Jou peman", "Kòmanse", "Fini"; si `prevuTotal != null`: "Vèsman prevwa" + `prevuTotal`, "Total pou l sanble" + `gd(totalPrevu)`; pwogrè `fè`/`prevu`; si `k._actif`: `<a href="${hrefTx}" data-act="tx">＋ Tranzaksyon</a>` ak `<button id="papeye">Pa peye · Fidbak</button>`.

### `rapo(ctx)` — rapò ajan an
```
ctx = { M, moi, man, today, t, lang, i (0..2), D (dat), isoJou (1..7 pou D), nonJou (fn), jou: [{ i, date, label, on }],
  kpi: { depo, nDepo, retre, nRetre, fre, nFre, vim, nVim, deklare, nDeklare, cycles, swivi, dmAtant, kach },
  swiviStats: { total, peye, fidbak, pokoWe }, parLe: [{ h, montant, n }] (6è→19è), poko, txHtml, nTx }
```
Hook obligatwa: `[data-j="0|1|2"]` (`role="tab"`, `aria-selected`, `.on`); 9 KPI, chak ak `data-kpi="depo|retre|fre|viman|deklare|cycles|papeye|demann|kach"` ak `data-val="${nimewo}"` ak etikèt yo (Depo ankese, Retrè peye, Frè, Viman, Balans deklare (total), Cycle kreye, Kliyan ki pa peye, Demann an atant, Kach nan men pou remèt nan kès — oswa fòm kout «Kach pou remèt nan kès»; tès la chèche «remèt nan kès»); nòt si `poko > 0`; lis `txHtml` anba tit "Tranzaksyon mwen yo" (oswa "Pa gen tranzaksyon …").

## Tès

```bash
LOOK=b PORT=8781 node tests/e2e.js      # 60+ tès, dwe pase pou chak look
LOOK=b node tests/width.js              # 320/360/390/820 px, klè + fonse
LOOK=b node tests/shots.js              # foto ekran yo nan tests/shots/b-*.png
```
```bash
PORT=8855 node tests/contrast.js b [--dark] [--manager]   # kontras tèks (WCAG) sou paj prensipal yo
```

### Espesifisite tokens (enpòtan)
`app.css` gen règ fonse ak espesifisite (0,2,0) (`:root[data-theme="dark"]` ak `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`). Pou look ou a toujou genyen:
```css
/* Look ki gen 2 tèm (A, B) */
html[data-look="a"] { /* tokens klè */ }
html[data-look="a"][data-theme="dark"] { /* tokens fonse */ }
@media (prefers-color-scheme: dark) { html[data-look="a"]:not([data-theme="light"]) { /* menm tokens fonse */ } }
/* Look ki toujou fonse (C): double atribi a bay (0,2,1) */
html[data-look="c"][data-look="c"] { /* tokens */ color-scheme: dark; }
```

## Laptop / ekran laj (≥ 1024 px)

Aplikasyon an dwe adapte afichaj li: telefòn (< 768 px, navigasyon anba), tablèt (768–1023 px, navigasyon anba santre), **laptop (≥ 1024 px, navigasyon agòch)**. Markup la pa chanje; se CSS chak look ki fè travay la (règ phone yo nan look CSS la gen plis espesifisite pase `app.css`, kidonk chak look **dwe** ekri pwòp seksyon `@media (min-width: 1024px)` li).

Estrikti obligatwa sou laptop:
- `#bar` rete anlè, sou tout lajè a (sticky). `app.js` mete wotè l nan `--bar-h` (sou `:root`). `app.css` deja fè `body.has-nav #bar { margin-left: calc(-1 * var(--nav-w)) }` pou ba a soti nan padding body a; pa mete `max-width`/santre sou `#bar` a ≥ 1024 px.
- `#nav.tabbar`: `position: fixed; left: 0; top: var(--bar-h); bottom: 0; width: var(--nav-w)` (look la chwazi 220–260 px e mete `--nav-w` sou `html[data-look="x"]`), kolòn vètikal: chak `a` = ikòn + etikèt sou yon liy (≥ 48 px wotè), eta aktif klè, hover (`@media (hover: hover)`), `:focus-visible`. `.nav-foot` (non ajan an, wòl, vèsyon) parèt anba kolòn nan (`margin-top: auto`).
- `body.has-nav { padding-left: var(--nav-w) }` (deja nan app.css; li aktif sèlman lè look la mete `--nav-w`); `main` 1120–1240 px maks, padding 24–32 px; `body.has-nav main { padding-bottom: 40px }` (pa gen ba anba ankò). Toast anba adwat. Modal santre.
- Paj yo (gride laptop): Epay = rezime/estatistik sou tout lajè, lis «Peman jodi a» ak «Kont ak cycle aktif» kòt a kòt (2 kolòn, ~5fr/7fr) oswa liy yo an 2 kolòn; rechèch `#q` ≤ 480 px. Tablo = tuil yo sou yon liy. Kliyan = `.list.grid-t` 2 kolòn (3 a ≥ 1440 px, deja nan app.css). Fich = kolòn gòch (avatar, aksyon, enfòmasyon) + kolòn dwat (cycle yo). Cycle = tèt la an 2 kolòn (solde + estatistik), lis yo anba. Rapò = KPI 4 pa liy, swivi/graf + tranzaksyon kòt a kòt. Fòm = 720 px maks, santre. Paramèt = kat look yo sou yon liy, seksyon ≤ 760 px. Koneksyon = kat santre ~440 px.
- Pa kraze telefòn/tablèt: tout tès yo dwe pase toujou.

```bash
LOOK=b node tests/width.js              # kounye a tcheke 1366 ak 1920 px tou (nav agòch, pa gen chevochman)
LOOK=b node tests/shots.js b            # + foto -lap.png (1366 px)
PORT=8855 node tests/contrast.js b      # pase sou 390 ak 1366 px
```
