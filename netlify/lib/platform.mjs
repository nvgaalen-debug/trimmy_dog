// Trimmy · platform: meerdere salons vanuit één omgeving
// Elke salon heeft een eigen schema in dezelfde database (sterke scheiding, eenvoudig per salon te back-uppen of te verwijderen).
// In het platform-schema staan alleen de salons, hun gebruikers, gekoppelde apparaten en uitnodigingen.
//
// Een verzoek van de app hoort bij een salon via het apparaat-cookie "tr_app" (HttpOnly, alleen gehasht in de database).
// De oude manier (één salon per Netlify-site met TRIMMY_CODE en DB_SCHEMA) blijft gewoon werken.
//
// Omgevingsvariabelen (naast DATABASE_URL e.d.):
//   PLATFORM_SCHEMA  (optioneel) standaard "platform"
//   BEHEER_CODE      lange geheime code voor de beheeromgeving (/beheer)
//   PLATFORM_SECRET  (aanbevolen) geheime sleutel voor het ondertekenen van de beheer-sessie; anders afgeleid van BEHEER_CODE
import crypto from "node:crypto";

export const PLATFORM = /^[a-z_][a-z0-9_]{0,40}$/.test(process.env.PLATFORM_SCHEMA || "") ? process.env.PLATFORM_SCHEMA : "platform";
export const P = n => `"${PLATFORM}"."${n}"`;
export const DEF_SCHEMA = /^[a-z_][a-z0-9_]{0,40}$/.test(process.env.DB_SCHEMA || "") ? process.env.DB_SCHEMA : "trimmy";
export const SCHEMA_OK = s => /^[a-z_][a-z0-9_]{0,40}$/.test(String(s || "")) && !["public", "pg_catalog", "information_schema", PLATFORM].includes(s);

export const sha = (...p) => crypto.createHash("sha256").update(p.join("|")).digest("hex");
export const nieuwToken = () => crypto.randomBytes(32).toString("base64url");
export const uid = () => Date.now().toString(36) + crypto.randomBytes(5).toString("hex");
export const norm = e => String(e || "").trim().toLowerCase();
export const mailOk = e => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(e);
export const ipVan = req => (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64);

/* ---------- wachtwoorden (scrypt, met eigen zout) ---------- */
export function hashWachtwoord(w) {
  const zout = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(w), zout, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${zout.toString("base64")}$${h.toString("base64")}`;
}
export function checkWachtwoord(w, opgeslagen) {
  const [soort, z, h] = String(opgeslagen || "").split("$");
  if (soort !== "scrypt" || !z || !h) { crypto.scryptSync("x", "y", 32); return false; }   // zelfde tijd, ook zonder account
  const a = Buffer.from(h, "base64"), b = crypto.scryptSync(String(w), Buffer.from(z, "base64"), a.length, { N: 16384, r: 8, p: 1 });
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const wachtwoordFout = w => String(w || "").length < 10 ? "Kies een wachtwoord van minstens 10 tekens." : null;

/* ---------- cookies ---------- */
export function cookieVan(req, naam) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + naam + "=([A-Za-z0-9_.-]{20,200})"));
  return m ? m[1] : null;
}
export const zetCookie = (naam, waarde, sec, pad = "/api") => `${naam}=${waarde}; Path=${pad}; HttpOnly; Secure; SameSite=Strict; Max-Age=${sec}`;
export const APPARAAT_DAGEN = 365;

/* ---------- oude manier: één salon per site met TRIMMY_CODE ---------- */
export function codeOk(req, url) {
  const want = process.env.TRIMMY_CODE; if (!want) return false;
  const got = req.headers.get("x-trimmy-code") || url.searchParams.get("code") || "";
  const h = x => crypto.createHash("sha256").update(String(x)).digest();
  return crypto.timingSafeEqual(h(got), h(want));
}

/* ---------- platform-schema ---------- */
let platformKlaar = false;
export async function ensurePlatform(db) {
  if (platformKlaar) return;
  const c = await db.connect();
  try {
    const ok = await c.query(`SELECT 1 FROM ${P("salons")} LIMIT 1`).then(() => true).catch(() => false);
    const ok2 = ok && await c.query(`SELECT 1 FROM ${P("pogingen")} LIMIT 1`).then(() => true).catch(() => false) && await c.query(`SELECT 1 FROM ${P("betalingen")} LIMIT 1`).then(() => true).catch(() => false) && await c.query(`SELECT 1 FROM ${P("support_log")} LIMIT 1`).then(() => true).catch(() => false);
    if (!ok2) {
      await c.query("BEGIN");
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["trimmy-platform:" + PLATFORM]);
      await c.query(`CREATE SCHEMA IF NOT EXISTS "${PLATFORM}"`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("salons")} (id VARCHAR(40) PRIMARY KEY, slug VARCHAR(40) NOT NULL UNIQUE, naam VARCHAR(120) NOT NULL, sjabloon VARCHAR(30) NOT NULL DEFAULT 'trimsalon', schema_naam VARCHAR(63) NOT NULL UNIQUE, status VARCHAR(12) NOT NULL DEFAULT 'proef', proef_tot DATE, prijs NUMERIC(8,2) NOT NULL DEFAULT 19.95, mollie_klant VARCHAR(40), mollie_abonnement VARCHAR(40), betaald_tot DATE, betaalstatus VARCHAR(20), notitie TEXT, aangemaakt TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("gebruikers")} (id VARCHAR(40) PRIMARY KEY, salon_id VARCHAR(40) NOT NULL REFERENCES ${P("salons")}(id), email VARCHAR(200) NOT NULL, naam VARCHAR(120), rol VARCHAR(12) NOT NULL DEFAULT 'eigenaar', medewerker_id VARCHAR(40), hash VARCHAR(200), aangemaakt TIMESTAMPTZ NOT NULL DEFAULT now(), laatst_ingelogd TIMESTAMPTZ)`);
      await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS gebruikers_email ON ${P("gebruikers")} (lower(email))`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("apparaten")} (token_hash VARCHAR(64) PRIMARY KEY, salon_id VARCHAR(40) NOT NULL REFERENCES ${P("salons")}(id), gebruiker_id VARCHAR(40), naam VARCHAR(200), aangemaakt TIMESTAMPTZ NOT NULL DEFAULT now(), laatst TIMESTAMPTZ NOT NULL DEFAULT now(), verloopt TIMESTAMPTZ NOT NULL)`);
      await c.query(`CREATE INDEX IF NOT EXISTS apparaten_salon ON ${P("apparaten")} (salon_id)`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("uitnodigingen")} (token_hash VARCHAR(64) PRIMARY KEY, gebruiker_id VARCHAR(40) NOT NULL, soort VARCHAR(12) NOT NULL DEFAULT 'uitnodiging', verloopt TIMESTAMPTZ NOT NULL, gebruikt BOOLEAN NOT NULL DEFAULT false, aangemaakt TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("betalingen")} (id VARCHAR(40) PRIMARY KEY, salon_id VARCHAR(40) NOT NULL, soort VARCHAR(12), status VARCHAR(20), bedrag NUMERIC(8,2), betaald_op TIMESTAMPTZ, verwerkt BOOLEAN NOT NULL DEFAULT false, bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await c.query(`CREATE INDEX IF NOT EXISTS betalingen_salon ON ${P("betalingen")} (salon_id)`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("pogingen")} (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sleutel VARCHAR(220) NOT NULL, tijd TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await c.query(`CREATE INDEX IF NOT EXISTS pogingen_sleutel ON ${P("pogingen")} (sleutel, tijd)`);
      // supporttoegang vanuit /beheer: tijdelijk, vastgelegd, en door de eigenaar uit te zetten
      await c.query(`ALTER TABLE ${P("salons")} ADD COLUMN IF NOT EXISTS support_toegestaan BOOLEAN NOT NULL DEFAULT true`);
      await c.query(`ALTER TABLE ${P("apparaten")} ADD COLUMN IF NOT EXISTS support VARCHAR(10)`);
      await c.query(`CREATE TABLE IF NOT EXISTS ${P("support_log")} (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, salon_id VARCHAR(40) NOT NULL, soort VARCHAR(10) NOT NULL, reden VARCHAR(300), begin TIMESTAMPTZ NOT NULL DEFAULT now(), tot TIMESTAMPTZ NOT NULL, ip VARCHAR(64))`);
      await c.query(`CREATE INDEX IF NOT EXISTS support_log_salon ON ${P("support_log")} (salon_id, begin)`);
      await c.query("COMMIT");
    }
    platformKlaar = true;
  } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
  finally { c.release(); }
}

/* te veel pogingen? (bijv. inloggen). Telt en geeft true als de grens bereikt is. */
export async function teVaak(db, sleutel, max, minuten) {
  await db.query(`DELETE FROM ${P("pogingen")} WHERE tijd < now() - interval '1 day'`).catch(() => {});
  const r = await db.query(`SELECT count(*) FROM ${P("pogingen")} WHERE sleutel = $1 AND tijd > now() - ($2 || ' minutes')::interval`, [sleutel, String(minuten)]);
  if (+r.rows[0].count >= max) return true;
  await db.query(`INSERT INTO ${P("pogingen")} (sleutel) VALUES ($1)`, [sleutel]);
  return false;
}

/* is de salon (nog) toegankelijk? */
export function salonOpen(s) {
  if (!s) return { ok: false, fout: "Onbekende salon." };
  if (s.status === "geblokkeerd") return { ok: false, fout: "Dit account is geblokkeerd. Neem contact op met de leverancier van de app." };
  if (s.status === "actief" && s.betaalstatus === "mislukt" && s.betaald_tot && new Date(String(s.betaald_tot instanceof Date ? s.betaald_tot.toISOString() : s.betaald_tot).slice(0, 10) + "T23:59:59").getTime() + 14 * 864e5 < Date.now()) return { ok: false, fout: "De betaling van het abonnement is al langer dan twee weken achterstallig. Werk je betaalgegevens bij via de eigenaar, of neem contact op." , betalen: true };
  if (s.status === "actief" && !s.mollie_abonnement && s.betaald_tot && new Date(String(s.betaald_tot instanceof Date ? s.betaald_tot.toISOString() : s.betaald_tot).slice(0, 10) + "T23:59:59") < new Date()) return { ok: false, fout: "Het abonnement is beëindigd. Start een nieuw abonnement of neem contact op.", betalen: true };
  if (s.status === "proef" && s.proef_tot && new Date(String(s.proef_tot).slice(0, 10) + "T23:59:59") < new Date()) return { ok: false, fout: "De proefperiode is verlopen. Neem contact op om verder te gaan." };
  return { ok: true };
}
const dag = v => v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null;
export const salonInfo = s => ({ id: s.id, slug: s.slug, naam: s.naam, sjabloon: s.sjabloon, status: s.status, proefTot: dag(s.proef_tot), prijs: s.prijs != null ? +s.prijs : null, betaaldTot: dag(s.betaald_tot), betaalstatus: s.betaalstatus || null, abonnement: !!s.mollie_abonnement });

/* ---------- bij welke salon hoort dit verzoek? ----------
   { schema, salon } bij een gekoppeld apparaat; { schema: DEF_SCHEMA, legacy: true } met de oude code;
   { fout, status } als het apparaat bekend is maar de salon niet open is; null als het verzoek niet mag. */
export async function tenant(req, url, db) {
  const tok = cookieVan(req, "tr_app");
  if (tok) {
    await ensurePlatform(db);
    const r = await db.query(`SELECT s.*, a.gebruiker_id, a.laatst AS a_laatst, a.support AS a_support, g.rol, g.medewerker_id FROM ${P("apparaten")} a JOIN ${P("salons")} s ON s.id = a.salon_id LEFT JOIN ${P("gebruikers")} g ON g.id = a.gebruiker_id WHERE a.token_hash = $1 AND a.verloopt > now()`, [sha("app", tok)]);
    const s = r.rows[0];
    if (s) {
      if (s.a_support && s.support_toegestaan === false) return { fout: "De salon heeft supporttoegang uitgezet.", status: 403, geblokkeerd: true };
      const open = salonOpen(s);
      if (!open.ok && !s.a_support) return { fout: open.fout, status: 403, geblokkeerd: true };   // support mag ook bij een geblokkeerde salon helpen
      if (!SCHEMA_OK(s.schema_naam)) return { fout: "Onjuiste salon-instelling.", status: 500 };
      if (Date.now() - new Date(s.a_laatst).getTime() > 10 * 60e3) db.query(`UPDATE ${P("apparaten")} SET laatst = now() WHERE token_hash = $1`, [sha("app", tok)]).catch(() => {});
      if (s.a_support) return { schema: s.schema_naam, salon: s, rol: "support", support: s.a_support, medewerkerId: null };
      return { schema: s.schema_naam, salon: s, rol: s.rol || "eigenaar", medewerkerId: s.medewerker_id || null };
    }
  }
  if (codeOk(req, url)) return { schema: DEF_SCHEMA, legacy: true };
  return null;
}

/* afzender van e-mails namens een salon: naam van de salon, adres uit MAIL_FROM, antwoorden naar de salon */
export function afzender(salonNaam, salonMail) {
  const from = process.env.MAIL_FROM || "";
  const adres = (from.match(/<([^>]+)>/) || [, from])[1].trim();
  const naam = String(salonNaam || "").replace(/["<>\r\n]/g, "").slice(0, 80);
  return { from: naam && adres ? `"${naam}" <${adres}>` : from, replyTo: mailOk(norm(salonMail)) ? salonMail : (process.env.MAIL_REPLY_TO || undefined) };
}
