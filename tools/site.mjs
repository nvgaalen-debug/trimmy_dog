// Trimmy · tools/site.mjs
// Draait bij elke publicatie op Netlify (zie netlify.toml). Leest de Netlify-instelling TRIMMY_SJABLOON
// (bijvoorbeeld "nagelstudio") en schrijft public/js/site.js, zodat de app vanaf de allereerste start in de
// juiste branche opent. Past ook de naam en kleur van de installeerbare app (manifest) aan.
// Zonder TRIMMY_SJABLOON verandert er niets: dan is het gewoon Trimmy.
import fs from "node:fs";

const APPS = {
  trimsalon: { naam: "Trimmy", omschrijving: "Kassa, agenda en klantbeheer voor de trimsalon", kleur: "#6a3560" },
  nagelstudio: { naam: "Nailly", omschrijving: "Agenda, kassa en klantbeheer voor de nagelstudio", kleur: "#9c3a6c" },
};
const gevraagd = String(process.env.TRIMMY_SJABLOON || "").trim().toLowerCase();
const id = APPS[gevraagd] ? gevraagd : "";
if (gevraagd && !id) console.warn(`TRIMMY_SJABLOON="${gevraagd}" is onbekend; kies uit: ${Object.keys(APPS).join(", ")}. Trimmy start als trimsalon.`);

fs.writeFileSync("public/js/site.js",
  `/* Gemaakt bij het publiceren door tools/site.mjs (Netlify-instelling TRIMMY_SJABLOON). Niet met de hand aanpassen. */\n"use strict";\nself.SITE=${JSON.stringify({ sjabloon: id })};\n`);

if (id && id !== "trimsalon") {
  const pad = "public/manifest.webmanifest", m = JSON.parse(fs.readFileSync(pad, "utf8")), a = APPS[id];
  Object.assign(m, { name: a.naam, short_name: a.naam, description: a.omschrijving, theme_color: a.kleur });
  fs.writeFileSync(pad, JSON.stringify(m, null, 2) + "\n");
}
console.log(`Trimmy site-instelling: sjabloon = ${id || "trimsalon (standaard)"}`);
