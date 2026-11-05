// LOOK B · Mache — klè, gwo bouton, fèt pou teren an. (Kontra: LOOKS.md. Modèl vizyèl: tests/refonte/B-*.dc.html)
import * as base from "./look-base.js";

export default {
  id: "b",
  nom: "Mache",
  deskripsyon: "Klè, gwo bouton jòn safran. Fèt pou teren an, anba solèy.",
  fonts: ["https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"],
  tem: "both",
  themeColor: { light: "#ffffff", dark: "#0f172a" },
  fr: {},
  parts: { ...base.parts },
};
