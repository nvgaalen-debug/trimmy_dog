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

// PLATFORM_NAAM: één algemene naam voor alle salons (inlogscherm, app, beginschermicoon, mails) in plaats van Trimmy/Nailly
const naam = String(process.env.PLATFORM_NAAM || "").replace(/[<>"&]/g, "").trim().slice(0, 30);

fs.writeFileSync("public/js/site.js",
  `/* Gemaakt bij het publiceren door tools/site.mjs (Netlify-instellingen TRIMMY_SJABLOON en PLATFORM_NAAM). Niet met de hand aanpassen. */\n"use strict";\nself.SITE=${JSON.stringify({ sjabloon: id, naam })};\n`);

if (naam) {
  const pad = "public/manifest.webmanifest", m = JSON.parse(fs.readFileSync(pad, "utf8"));
  Object.assign(m, { name: naam, short_name: naam.slice(0, 12), description: "Agenda, kassa en klantbeheer voor je salon", theme_color: "#4f3d6b" });
  m.icons = m.icons.map(i => ({ ...i, src: i.src.replace("/icons/", "/icons/algemeen/") }));
  fs.writeFileSync(pad, JSON.stringify(m, null, 2) + "\n");
  const ip = "public/index.html";
  let h = fs.readFileSync(ip, "utf8");
  h = h.replace("<title>Trimmy</title>", `<title>${naam}</title>`).replace('content="Trimmy"', `content="${naam}"`)
       .replace('href="icons/favicon-32.png"', 'href="icons/algemeen/favicon-32.png"').replace('href="icons/apple-touch-icon.png"', 'href="icons/algemeen/apple-touch-icon.png"');
  fs.writeFileSync(ip, h);
}

if (!naam && id && id !== "trimsalon") {
  const pad = "public/manifest.webmanifest", m = JSON.parse(fs.readFileSync(pad, "utf8")), a = APPS[id];
  Object.assign(m, { name: a.naam, short_name: a.naam, description: a.omschrijving, theme_color: a.kleur });
  fs.writeFileSync(pad, JSON.stringify(m, null, 2) + "\n");
}
console.log(`Site-instelling: sjabloon = ${id || "trimsalon (standaard)"}, naam = ${naam || "per branche (Trimmy/Nailly)"}`);
