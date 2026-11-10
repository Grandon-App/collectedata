// Pwoblèm nan dosye kliyan yo (pou kanpay alèt regilarizasyon manadjè yo).
// oto: aplikasyon an detekte pwoblèm lan poukont li, epi alèt la fèmen poukont li lè l regle.
// manyèl: manadjè a make kliyan an (pa egzanp foto a la, men li pa bon); alèt la fèmen lè manadjè a fèmen l.
const vid = (v) => !String(v ?? "").trim();
export const PWOBLEM = [
  { k: "tel", l: "Telefòn vid oswa pa bon", oto: true, f: (c) => String(c.telephone || "").replace(/\D/g, "").length < 8 },
  { k: "foto", l: "Pa gen foto", oto: true, f: (c) => vid(c.photo_url) && !c.photo_id },
  { k: "gps", l: "Pa gen pozisyon GPS", oto: true, f: (c) => c.gps_lat == null || c.gps_lng == null },
  { k: "biznis", l: "Kote biznis la vid", oto: true, f: (c) => vid(c.lieu_de_travail) },
  { k: "adres", l: "Adrès vid", oto: true, f: (c) => vid(c.adresse) },
  { k: "pyes", l: "Pa gen nimewo pyès idantite", oto: true, f: (c) => vid(c.numero_piece) },
  { k: "kal", l: "Kont san jou peman", oto: true, f: (c, k) => !k.frequence_semaine },
  { k: "fre", l: "Frais sèvis pou pran", oto: true, kont: true, sevis: true, f: (c, k) => !!k._fre?.pou },
  { k: "kredi_reta", l: "Kredi an reta", oto: true, kont: true, kredi: true, f: (c, k) => (k._kredi || []).some((x) => x._jouReta > 0) },
  { k: "kredi_penalite", l: "Penalite kredi pou ankese", oto: true, kont: true, kredi: true, f: (c, k) => (k._kredi || []).some((x) => x._penDu > 0) },
  { k: "kredi_fen", l: "Kredi depase dat fen li", oto: true, kont: true, kredi: true, f: (c, k) => (k._kredi || []).some((x) => x._depaseFen) },
  { k: "foto_move", l: "Foto a pa bon" },
  { k: "biznis_move", l: "Kote biznis la pa bon" },
  { k: "tel_move", l: "Telefòn nan pa bon" },
  { k: "dokiman", l: "Dokiman ki manke nan dosye a" },
];
export const pwoblemPa = (k) => PWOBLEM.find((p) => p.k === k) || null;
// true: pwoblèm lan toujou la · false: li regle · null: aplikasyon an pa ka konnen (pwoblèm manyèl, kliyan pa sou telefòn nan).
export function genPwoblem(kod, c, k) {
  const p = pwoblemPa(kod);
  if (!p?.oto || !c || !k) return null;
  return !!p.f(c, k);
}
