# Grandon

Aplikasyon ajan Grandon (PWA): kliyan, cycle epay ak depo, menm san entènèt.

- Mache offline. Done yo voye poukont yo lè entènèt tounen.
- GPS ak foto kliyan.
- Ajan an konekte ak nimewo telefòn li + modpas.
- Epay: onglè Kont, Tranzaksyon, Fidbak (sa kliyan yo di lè yo pa peye) ak Validasyon (manadjè).

Aplikasyon an pibliye sou GitHub Pages chak fwa ou pouse sou branch `main`. Lè w pibliye yon nouvo vèsyon, chanje `VERSION` nan `sw.js` (ak `APP_VERSION` nan `app.js`).

- **Prodiksyon:** rasin sit la (`config.js`, memwa telefòn `grandon-prod`).
- **Tès:** dosye `tes/` (`tes/config.js`, memwa `grandon-ajan`). Se menm fichye aplikasyon yo (`../`); `tes/` gen sèlman pwòp `index.html`, `config.js`, `manifest.webmanifest` ak `sw.js`. De kopi yo pa pataje ni sesyon, ni done offline, ni cache.

## Look (aparans)

Aplikasyon an gen 3 aparans konplè; chak ajan chwazi pa l nan **Paramèt → Look**:

- **A · Prestige**: ble marin ak lò, elegan (klè oswa fonse).
- **B · Mache**: fon blan, gwo bouton jòn safran, fèt pou teren an (klè oswa fonse).
- **C · Lannuit**: toujou fonse, kontras fò, chif an premye (ekonomi batri).

Chak look adapte l ak ekran an: telefòn (navigasyon anba), tablèt, ak laptop / ekran laj (navigasyon agòch, kontni an plizyè kolòn).

Detay teknik yo (kontra, hook obligatwa, tès) nan `LOOKS.md`.
