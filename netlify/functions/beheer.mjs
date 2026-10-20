// Trimmy · beheeromgeving van het platform (alleen voor jou als leverancier)
//   POST /api/beheer/login       { code }            -> beheer-sessie (cookie, 12 uur)
//   POST /api/beheer/uit
//   GET  /api/beheer/salons                          -> alle salons met eigenaar, gebruik en betaalstatus
//   POST /api/beheer/salon       { naam, sjabloon, email, eigenaar, status, proefTot, prijs, slug?, bestaandSchema? }
//   POST /api/beheer/bijwerken   { id, naam?, status?, proefTot?, prijs?, notitie? }
//   POST /api/beheer/uitnodiging { id }              -> nieuwe activatielink voor de eigenaar
//   POST /api/beheer/support     { id, soort, reden } -> supporttoegang tot een salon (2 uur, vastgelegd, zichtbaar voor de eigenaar)
//   POST /api/beheer/support-stop { id }             -> alle supportsessies bij die salon beëindigen
// Omgevingsvariabelen: BEHEER_CODE (verplicht, lang en geheim), PLATFORM_SECRET (aanbevolen).
import crypto from "node:crypto";
import { getPool, ensureSchema, upsertRow, vergeetSchema } from "./db.mjs";
import { P, ensurePlatform, SCHEMA_OK, DEF_SCHEMA, uid, norm, mailOk, ipVan, cookieVan, zetCookie, teVaak, sha, nieuwToken } from "../lib/platform.mjs";
import { stuurLink } from "./auth.mjs";

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra } });
const SJABLONEN = ["trimsalon", "nagelstudio", "pedicure"];
const geheim = () => process.env.PLATFORM_SECRET || crypto.createHash("sha256").update("beheer|" + (process.env.BEHEER_CODE || "")).digest("hex");
const teken = exp => crypto.createHmac("sha256", geheim()).update("beheer|" + exp).digest("base64url");
function sessieOk(req) {
  const v = (req.headers.get("cookie") || "").match(/(?:^|;\s*)tr_beheer=(\d{10,15})\.([A-Za-z0-9_-]{20,100})/);
  if (!v || +v[1] < Date.now()) return false;
  const a = Buffer.from(v[2]), b = Buffer.from(teken(v[1]));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const slugVan = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "salon";
const datum = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null;
const dag = v => v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null;

export default async (req) => {
  const url = new URL(req.url), actie = url.pathname.replace(/\/+$/, "").split("/").pop();
  if (!process.env.BEHEER_CODE || process.env.BEHEER_CODE.length < 16) return json(503, { error: "Zet eerst BEHEER_CODE (minstens 16 tekens) bij de omgevingsvariabelen in Netlify." });
  if (req.method === "POST" && (req.headers.get("x-trimmy-beheer") !== "1" || !/application\/json/i.test(req.headers.get("content-type") || ""))) return json(403, { error: "ongeldig verzoek" });
  let db;
  try { db = getPool(); await ensurePlatform(db); }
  catch (e) { console.error("beheer platform", e); return json(503, { error: e && e.code === "42501" ? "De databasegebruiker mag het platform-schema niet aanmaken. Voer eenmalig als avnadmin uit: GRANT CREATE ON DATABASE defaultdb TO trimmy_app;" : "Database niet bereikbaar: " + (e && e.message) }); }
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  if (actie === "login" && req.method === "POST") {
    if (await teVaak(db, "beheer:" + ipVan(req), 10, 60)) return json(429, { error: "Te veel pogingen. Probeer het over een uur opnieuw." });
    const a = crypto.createHash("sha256").update(String(body.code || "")).digest(), b = crypto.createHash("sha256").update(process.env.BEHEER_CODE).digest();
    if (!crypto.timingSafeEqual(a, b)) { await new Promise(r => setTimeout(r, 800)); return json(401, { error: "Deze code klopt niet." }); }
    const exp = Date.now() + 12 * 3600e3;
    return json(200, { ok: true }, { "Set-Cookie": `tr_beheer=${exp}.${teken(exp)}; Path=/api/beheer; HttpOnly; Secure; SameSite=Strict; Max-Age=${12 * 3600}` });
  }
  if (actie === "uit") return json(200, { ok: true }, { "Set-Cookie": "tr_beheer=x; Path=/api/beheer; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });
  if (!sessieOk(req)) return json(401, { error: "Log eerst in.", login: true });

  try {
    if (actie === "salons" && req.method === "GET") {
      const r = await db.query(`SELECT s.*, (SELECT email FROM ${P("gebruikers")} g WHERE g.salon_id = s.id AND g.rol = 'eigenaar' LIMIT 1) AS eigenaar_email,
        (SELECT hash IS NOT NULL FROM ${P("gebruikers")} g WHERE g.salon_id = s.id AND g.rol = 'eigenaar' LIMIT 1) AS eigenaar_actief,
        (SELECT count(*) FROM ${P("gebruikers")} g WHERE g.salon_id = s.id) AS gebruikers,
        (SELECT count(*) FROM ${P("apparaten")} a WHERE a.salon_id = s.id AND a.verloopt > now() AND a.support IS NULL) AS apparaten,
        (SELECT max(laatst) FROM ${P("apparaten")} a WHERE a.salon_id = s.id AND a.support IS NULL) AS laatst,
        (SELECT max(tot) FROM ${P("support_log")} l WHERE l.salon_id = s.id) AS support_tot
        FROM ${P("salons")} s ORDER BY s.aangemaakt DESC`);
      return json(200, { ok: true, sjablonen: SJABLONEN, salons: r.rows.map(s => ({ id: s.id, slug: s.slug, naam: s.naam, sjabloon: s.sjabloon, schema: s.schema_naam, status: s.status, proefTot: dag(s.proef_tot), prijs: +s.prijs,
        betaaldTot: dag(s.betaald_tot), betaalstatus: s.betaalstatus, abonnement: !!s.mollie_abonnement, notitie: s.notitie || "", aangemaakt: s.aangemaakt,
        eigenaar: s.eigenaar_email, eigenaarActief: !!s.eigenaar_actief, supportToegestaan: s.support_toegestaan !== false, supportActief: !!(s.support_tot && new Date(s.support_tot) > new Date()), gebruikers: +s.gebruikers, apparaten: +s.apparaten, laatst: s.laatst,
        portaal: `${(process.env.APP_URL || url.origin).replace(/\/+$/, "")}/portaal?s=${s.slug}` })) });
    }
    if (actie === "salon" && req.method === "POST") {
      const naam = String(body.naam || "").trim().slice(0, 120), email = norm(body.email), sjabloon = SJABLONEN.includes(body.sjabloon) ? body.sjabloon : "trimsalon";
      if (!naam) return json(400, { error: "Vul de naam van de salon in." });
      if (!mailOk(email)) return json(400, { error: "Vul een geldig e-mailadres van de eigenaar in." });
      if ((await db.query(`SELECT 1 FROM ${P("gebruikers")} WHERE lower(email) = $1`, [email])).rowCount) return json(409, { error: "Dit e-mailadres heeft al een account bij een salon." });
      let slug = slugVan(body.slug || naam);
      for (let i = 2; (await db.query(`SELECT 1 FROM ${P("salons")} WHERE slug = $1`, [slug])).rowCount; i++) slug = slugVan(body.slug || naam).slice(0, 26) + "-" + i;
      const bestaand = String(body.bestaandSchema || "").trim();
      const schema = bestaand || ("s_" + slug.replace(/-/g, "_")).slice(0, 40);
      if (!SCHEMA_OK(schema)) return json(400, { error: "Ongeldige naam voor het databaseschema." });
      if ((await db.query(`SELECT 1 FROM ${P("salons")} WHERE schema_naam = $1`, [schema])).rowCount) return json(409, { error: `Schema '${schema}' hoort al bij een andere salon.` });
      if (bestaand && !(await db.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema])).rowCount) return json(404, { error: `Schema '${schema}' bestaat niet in de database.` });
      /* nieuw schema mag nog niet bestaan: nooit per ongeluk een nieuwe salon koppelen aan achtergebleven gegevens */
      if (!bestaand && (await db.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema])).rowCount) return json(409, { error: `Er staat al een schema '${schema}' in de database (bijvoorbeeld van een eerdere salon). Kies een andere korte naam, of vul dit schema in bij "Bestaand schema" als je die gegevens juist wilt overnemen.` });
      try { if (!bestaand) await db.query(`CREATE SCHEMA "${schema}"`); }
      catch (e) { if (e.code === "42501") return json(403, { error: `De databasegebruiker mag geen schema aanmaken. Voer eenmalig als avnadmin uit: GRANT CREATE ON DATABASE defaultdb TO trimmy_app;  (of maak het schema zelf aan: CREATE SCHEMA ${schema} AUTHORIZATION trimmy_app;)` }); throw e; }
      await ensureSchema(db, schema);
      const id = uid(), status = ["proef", "actief", "geblokkeerd"].includes(body.status) ? body.status : "proef";
      const proefTot = datum(body.proefTot) || (status === "proef" ? new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) : null);
      const prijs = Math.max(0, Math.min(9999, +body.prijs || 19.95));
      await db.query(`INSERT INTO ${P("salons")} (id, slug, naam, sjabloon, schema_naam, status, proef_tot, prijs, notitie) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [id, slug, naam, sjabloon, schema, status, proefTot, prijs, String(body.notitie || "").slice(0, 2000)]);
      // salongegevens klaarzetten (alleen bij een nieuw, leeg schema)
      const heeft = (await db.query(`SELECT 1 FROM "${schema}"."bedrijf" WHERE id = 'bedrijf' AND NOT deleted`)).rowCount;
      if (!heeft) { const c = await db.connect(); try { await upsertRow(c, "bedrijf", "bedrijf", { id: "bedrijf", naam, sjabloon, mail: email }, "BEHEER", schema); } finally { c.release(); } }
      const eig = { id: uid(), salon_id: id, email, naam: String(body.eigenaar || "").slice(0, 120), rol: "eigenaar" };
      await db.query(`INSERT INTO ${P("gebruikers")} (id, salon_id, email, naam, rol) VALUES ($1, $2, $3, $4, 'eigenaar')`, [eig.id, id, email, eig.naam]);
      const l = await stuurLink(db, url, eig, "uitnodiging");
      return json(200, { ok: true, id, slug, schema, ...l });
    }
    if (actie === "bijwerken" && req.method === "POST") {
      const s = (await db.query(`SELECT * FROM ${P("salons")} WHERE id = $1`, [String(body.id || "")])).rows[0];
      if (!s) return json(404, { error: "Onbekende salon." });
      const v = {
        naam: body.naam != null ? String(body.naam).trim().slice(0, 120) || s.naam : s.naam,
        status: ["proef", "actief", "geblokkeerd"].includes(body.status) ? body.status : s.status,
        proef_tot: body.proefTot !== undefined ? datum(body.proefTot) : s.proef_tot,
        prijs: body.prijs != null && isFinite(+body.prijs) ? Math.max(0, Math.min(9999, +body.prijs)) : s.prijs,
        notitie: body.notitie != null ? String(body.notitie).slice(0, 2000) : s.notitie,
      };
      await db.query(`UPDATE ${P("salons")} SET naam = $1, status = $2, proef_tot = $3, prijs = $4, notitie = $5 WHERE id = $6`, [v.naam, v.status, v.proef_tot, v.prijs, v.notitie, s.id]);
      if (v.status === "geblokkeerd" && body.afmelden) await db.query(`DELETE FROM ${P("apparaten")} WHERE salon_id = $1`, [s.id]);
      return json(200, { ok: true });
    }
    if (actie === "uitnodiging" && req.method === "POST") {
      const eig = (await db.query(`SELECT * FROM ${P("gebruikers")} WHERE salon_id = $1 AND rol = 'eigenaar' LIMIT 1`, [String(body.id || "")])).rows[0];
      if (!eig) return json(404, { error: "Geen eigenaar gevonden." });
      return json(200, { ok: true, ...(await stuurLink(db, url, eig, eig.hash ? "herstel" : "uitnodiging")) });
    }
    /* ---------- salon verwijderen (alleen na intypen van de korte naam; niet terug te draaien) ---------- */
    if (actie === "verwijder" && req.method === "POST") {
      const s = (await db.query(`SELECT * FROM ${P("salons")} WHERE id = $1`, [String(body.id || "")])).rows[0];
      if (!s) return json(404, { error: "Onbekende salon." });
      if (String(body.bevestig || "").trim() !== s.slug) return json(400, { error: `Typ ter bevestiging de korte naam: ${s.slug}` });
      if (s.mollie_abonnement) return json(409, { error: "Deze salon heeft nog een lopend Mollie-abonnement. Laat de eigenaar eerst opzeggen, of stop het abonnement in Mollie." });
      /* alleen een schema dat voor deze salon is aangemaakt (s_…) wordt gewist; een gekoppeld bestaand schema (zoals trimmy) blijft staan */
      const wis = /^s_[a-z0-9_]{1,60}$/.test(s.schema_naam) && s.schema_naam !== DEF_SCHEMA;
      const c = await db.connect();
      try {
        await c.query("BEGIN");
        const g = `SELECT id FROM ${P("gebruikers")} WHERE salon_id = $1`;
        await c.query(`DELETE FROM ${P("uitnodigingen")} WHERE gebruiker_id IN (${g})`, [s.id]);
        for (const t of ["apparaten", "support_log", "betalingen", "gebruikers"]) await c.query(`DELETE FROM ${P(t)} WHERE salon_id = $1`, [s.id]);
        await c.query(`DELETE FROM ${P("salons")} WHERE id = $1`, [s.id]);
        if (wis) await c.query(`DROP SCHEMA IF EXISTS "${s.schema_naam}" CASCADE`);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
      vergeetSchema(s.schema_naam);
      console.log("beheer: salon verwijderd", s.slug, wis ? "(schema gewist)" : "(schema bewaard)");
      return json(200, { ok: true, schemaGewist: wis, schema: s.schema_naam });
    }
    /* ---------- supporttoegang ---------- */
    if (actie === "support" && req.method === "POST") {
      const s = (await db.query(`SELECT * FROM ${P("salons")} WHERE id = $1`, [String(body.id || "")])).rows[0];
      if (!s) return json(404, { error: "Onbekende salon." });
      if (s.support_toegestaan === false) return json(403, { error: "Deze salon heeft supporttoegang uitgezet. Vraag de eigenaar om die even aan te zetten (Instellingen, Koppelingen)." });
      const soort = body.soort === "volledig" ? "volledig" : "lezen", reden = String(body.reden || "").trim().slice(0, 300);
      if (reden.length < 3) return json(400, { error: "Geef kort de reden op; die is zichtbaar voor de eigenaar." });
      const tok = nieuwToken(), uren = 2;
      await db.query(`INSERT INTO ${P("apparaten")} (token_hash, salon_id, gebruiker_id, naam, support, verloopt) VALUES ($1, $2, NULL, $3, $4, now() + ($5 || ' hours')::interval)`, [sha("app", tok), s.id, "Support (" + (soort === "volledig" ? "volledige toegang" : "meekijken") + ")", soort, String(uren)]);
      await db.query(`INSERT INTO ${P("support_log")} (salon_id, soort, reden, tot, ip) VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval, $5)`, [s.id, soort, reden, String(uren), ipVan(req)]);
      // de app op deze browser gaat naar deze salon; het eigen salon-account in deze browser wordt daarmee vervangen
      return json(200, { ok: true, naam: s.naam, uren }, { "Set-Cookie": zetCookie("tr_app", tok, uren * 3600) });
    }
    if (actie === "support-stop" && req.method === "POST") {
      const id = String(body.id || "");
      await db.query(`DELETE FROM ${P("apparaten")} WHERE salon_id = $1 AND support IS NOT NULL`, [id]);
      await db.query(`UPDATE ${P("support_log")} SET tot = least(tot, now()) WHERE salon_id = $1`, [id]);
      return json(200, { ok: true });
    }
    return json(404, { error: "onbekend" });
  } catch (e) {
    console.error("beheer /" + actie, e && (e.stack || e.message));
    return json(500, { error: "Fout: " + (e && e.message || "onbekend") });
  }
};

export const config = { path: "/api/beheer/*" };
