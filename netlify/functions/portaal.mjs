// Trimmy · klantportaal (server)
// Klanten loggen in met een eenmalige code per e-mail en zien ALLEEN hun eigen gegevens.
// Routes (alle onder /api/portaal/):
//   POST code     { email }          -> stuurt een code van 6 cijfers (antwoord is altijd hetzelfde)
//   POST login    { email, code }    -> zet een sessie-cookie (HttpOnly, Secure, SameSite=Strict)
//   GET  ik                          -> eigen gegevens, honden, afspraken, historie, facturen, berichten
//   POST bericht  { tekst }          -> bericht aan de salon
//   POST gegevens { tel, straat, pc, plaats }
//   POST uit                         -> uitloggen
//   GET  salon                       -> openbare salongegevens voor de kop en de privacyverklaring
// Online boeken (alleen als de salon het aanzet bij Instellingen > Online boeken):
//   GET  boek-opties                 -> behandelingen, medewerkers, regels; met sessie ook de eigen klant en honden
//   GET  boek-dagen  ?d=ids&mw=&van= -> per dag het aantal vrije tijden
//   GET  boek-tijden ?d=ids&mw=&datum= -> vrije begintijden (door de server berekend volgens de regels van de salon)
//   POST boek-code   { email }       -> code voor een nieuwe klant (bevestigt het e-mailadres)
//   POST boek        { diensten, datum, start, mwId, hond, opmerking, nieuw:{naam,email,tel,code} }
//   POST annuleer    { id }          -> eigen afspraak annuleren, als dat nog mag volgens de salon
// Beveiliging:
//   - codes en sessies staan alleen gehasht in de database; code 10 minuten geldig, max. 5 pogingen
//   - max. 3 codes per e-mailadres per 15 minuten en 10 per IP-adres per uur
//   - elke opvraging filtert op het e-mailadres van de sessie; er wordt nooit iets van een andere klant gestuurd
//   - interne velden (notities, gedrag, medisch, medewerkers, inkoop) gaan nooit naar het portaal
//   - POST alleen met header X-Trimmy-Portaal en JSON (blokkeert formulieren van andere sites)
// Omgevingsvariabelen: DATABASE_URL, SMTP_*, MAIL_FROM (zelfde als de rest), PORTAAL_SECRET (aanbevolen).
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getPool, ensureSchema, upsertRow, foutmelding, Q as Q0, SCHEMA, qs } from "./db.mjs";
import { P, ensurePlatform, salonOpen, afzender } from "../lib/platform.mjs";
import { online, onlineDiensten, tijden, dagen, vraag, nuLokaal, plusDagen, toMin, toHM } from "../lib/beschikbaar.mjs";
/* per verzoek: het schema van de salon (via ?s=<salon>) of het standaardschema (één salon per site).
   Netlify voert per functie-exemplaar één verzoek tegelijk uit, dus deze waarden lopen niet door elkaar. */
let Q = Q0, SCH = SCHEMA;

let COOKIE = "tp_sessie";
const SESSIE_DAGEN = 60;
const SECRET = process.env.PORTAAL_SECRET || ("trimmy-portaal|" + (process.env.TRIMMY_CODE || ""));
const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...H, ...extra } });
const sha = (...p) => crypto.createHash("sha256").update(p.join("|")).digest("hex");
const mailOk = e => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(e) && e.length <= 200;
const norm = e => String(e || "").trim().toLowerCase();
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const str = (v, max) => String(v ?? "").trim().slice(0, max);

let transport;
const smtpOk = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
function mailer() {
  if (!transport) { const port = Number(process.env.SMTP_PORT || 587); transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }); }
  return transport;
}
function mailHtml(salon, titel, inhoud) {
  const c = /^#[0-9a-f]{6}$/i.test(salon.kleur || "") ? salon.kleur : "#6a3560";
  return `<!doctype html><html lang="nl"><body style="margin:0;background:#f1f3f1;font-family:Arial,Helvetica,sans-serif"><div style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:${c};color:#fff;padding:18px 26px;font-size:19px;font-weight:bold">${esc(salon.naam || "Trimsalon")}</td></tr>
<tr><td style="padding:24px 26px;color:#1c2220;font-size:15px;line-height:1.55"><h1 style="font-size:20px;margin:0 0 14px">${esc(titel)}</h1>${inhoud}</td></tr></table></div></body></html>`;
}

function cookieVan(req) { const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([A-Za-z0-9_-]{20,100})")); return m ? m[1] : null; }
const setCookie = (tok, maxAge) => `${COOKIE}=${tok}; Path=/api/portaal; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const ipVan = req => (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || "onbekend";

async function salonVan(db) {
  const r = await db.query(`SELECT data FROM ${Q("bedrijf")} WHERE id = 'bedrijf' AND NOT deleted`);
  return (r.rows[0] && r.rows[0].data) || {};
}
async function sessie(db, req) {
  const tok = cookieVan(req); if (!tok) return null;
  const r = await db.query(`SELECT email FROM ${Q("portaal_sessies")} WHERE token_hash = $1 AND verloopt > now()`, [sha(SECRET, "sessie", tok)]);
  if (!r.rowCount) return null;
  await db.query(`UPDATE ${Q("portaal_sessies")} SET laatst = now() WHERE token_hash = $1`, [sha(SECRET, "sessie", tok)]);
  return { email: r.rows[0].email, tok };
}
/* gegevens die toch al op elke factuur staan, plus de instellingen voor de privacyverklaring */
function publiekSalon(s) {
  const t = (v, n) => String(v || "").slice(0, n);
  return {
    sjabloon: t(s.sjabloon || process.env.TRIMMY_SJABLOON || "trimsalon", 30), object: (s.sjabloon || process.env.TRIMMY_SJABLOON || "trimsalon") === "trimsalon", naam: t(s.naam, 120), straat: t(s.straat, 200), pc: t(s.pc, 12), plaats: t(s.plaats, 120), tel: t(s.tel, 40), mail: t(s.mail, 200), kvk: t(s.kvk, 20), kleur: t(s.kleur, 7),
    logo: typeof s.logo === "string" && s.logo.length < 400000 ? s.logo : "",
    privacy: { mail: t(s.privacyMail, 200), jaren: Math.min(20, Math.max(1, +s.privacyJaren || 2)), diensten: t(s.privacyDiensten, 2000), extra: t(s.privacyExtra, 4000), datum: t(s.privacyDatum, 10), herinneringen: !!s.autoHer },
  };
}

async function klantenVan(db, email) {
  const r = await db.query(`SELECT id, data FROM ${Q("klanten")} WHERE NOT deleted AND lower(trim(email)) = $1 ORDER BY lower(data->>'naam'), id`, [email]);
  return r.rows;
}

export default async (req) => {
  const url = new URL(req.url);
  const actie = url.pathname.replace(/\/+$/, "").split("/").pop();
  if (req.method === "POST" && (req.headers.get("x-trimmy-portaal") !== "1" || !/application\/json/i.test(req.headers.get("content-type") || "")))
    return json(403, { error: "ongeldig verzoek" });

  let db;
  try {
    db = getPool(); Q = Q0; SCH = SCHEMA; COOKIE = "tp_sessie";
    const slug = String(url.searchParams.get("s") || "").toLowerCase();
    if (slug) {
      if (!/^[a-z0-9-]{1,40}$/.test(slug)) return json(404, { error: "Onbekende salon." });
      await ensurePlatform(db);
      const ps = (await db.query(`SELECT * FROM ${P("salons")} WHERE slug = $1`, [slug])).rows[0];
      if (!ps || !salonOpen(ps).ok) return json(403, { error: "Het klantportaal van deze salon is niet beschikbaar.", uit: true });
      SCH = ps.schema_naam; Q = qs(SCH); COOKIE = "tp_" + slug.replace(/-/g, "_");
    }
    await ensureSchema(db, SCH);
  }
  catch (e) { console.error("portaal schema", e); return json(503, { error: "Het portaal is even niet bereikbaar. Probeer het later opnieuw." }); }

  try {
    const salon = await salonVan(db), ob = online(salon);
    const boekRoute = actie === "boek" || actie.startsWith("boek-");
    if (boekRoute && !ob.aan) return json(403, { error: "Online boeken staat bij deze salon uit.", uit: true });
    /* inloggen, uitloggen en annuleren mogen ook als alleen online boeken aanstaat (de boekpagina gebruikt ze) */
    if (!boekRoute && !salon.portaal && !(ob.aan && ["salon", "code", "login", "uit", "annuleer"].includes(actie))) return json(403, { error: "Het klantportaal staat uit.", uit: true });
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    /* ---------- openbaar: salongegevens voor de kop en de privacyverklaring (geen klantgegevens) ---------- */
    if (actie === "salon" && req.method === "GET") return json(200, { salon: publiekSalon(salon), sessieDagen: SESSIE_DAGEN });

    /* ---------- online boeken: keuzes, dagen en tijden (openbaar; met sessie ook de eigen klant) ---------- */
    const objMode = (salon.sjabloon || process.env.TRIMMY_SJABLOON || "trimsalon") === "trimsalon";
    const lijstIds = v => String(v || "").split(",").map(x => x.trim()).filter(x => /^[\w-]{1,40}$/.test(x)).slice(0, 6);
    const laadCtx = async (c, van, tot) => {
      const rij = async (t, extra = "", p = []) => (await c.query(`SELECT id, data FROM ${Q(t)} WHERE NOT deleted ${extra}`, p)).rows.map(r => ({ ...r.data, id: r.id }));
      const [medewerkers, artikelen, blokkades, afspraken] = await Promise.all([rij("medewerkers"), rij("artikelen"), rij("blokkades"), rij("afspraken", "AND datum BETWEEN $1 AND $2", [van, tot])]);
      return { salon, medewerkers, artikelen, blokkades, afspraken, nu: nuLokaal() };
    };
    const mwNaam = (ctx, id) => ((ctx.medewerkers.find(m => m.id === id) || {}).naam) || "";
    if (actie === "boek-opties" && req.method === "GET") {
      const ctx = await laadCtx(db, "1900-01-01", "1900-01-01");
      const ds = onlineDiensten(ctx.artikelen);
      const mws = ctx.medewerkers.filter(m => m && !m.inactief);
      const ses0 = await sessie(db, req);
      let ik = null;
      if (ses0) {
        const kl0 = await klantenVan(db, ses0.email);
        if (kl0.length) {
          const g = String(url.searchParams.get("k") || ""), k0 = kl0.find(k => k.id === g) || kl0[0];
          const hs = objMode ? (await db.query(`SELECT id, data FROM ${Q("honden")} WHERE NOT deleted AND klant_id = $1`, [k0.id])).rows.map(r => ({ id: r.id, ...r.data })).filter(h => !h.auto && !h.inactief) : [];
          ik = { email: ses0.email, klanten: kl0.map(k => ({ id: k.id, naam: (k.data && k.data.naam) || "Klant" })), kSel: k0.id, naam: (k0.data && k0.data.naam) || "", honden: hs.map(h => ({ id: h.id, naam: String(h.naam || ""), ras: String(h.ras || "") })) };
        }
      }
      return json(200, {
        salon: publiekSalon(salon), portaal: !!salon.portaal,
        regels: { wijze: ob.wijze, nieuweKlant: ob.nieuweKlant, nieuwDier: ob.nieuwDier, kiesMw: ob.kiesMw && mws.length > 1, geenVoorkeur: ob.geenVoorkeur, maxDag: ob.maxDag, minUur: ob.minUur, annuleerUur: ob.annuleerUur, tekst: String(ob.tekst || "").slice(0, 1000) },
        diensten: ds.map(a => ({ id: a.id, naam: String(a.naam || ""), cat: String(a.cat || ""), duur: Math.round(+a.duur || 0), prijs: +a.prijs || 0, mw: Array.isArray(a.mw) && a.mw.length ? a.mw : null })),
        medewerkers: ob.kiesMw ? mws.map(m => ({ id: m.id, naam: String(m.naam || ""), kleur: String(m.kleur || "") })) : [],
        ik, nu: nuLokaal(),
      });
    }
    if ((actie === "boek-dagen" || actie === "boek-tijden") && req.method === "GET") {
      const diensten = lijstIds(url.searchParams.get("d")), mwId0 = ob.kiesMw ? String(url.searchParams.get("mw") || "") : "";
      const mwId = /^[\w-]{0,40}$/.test(mwId0) ? mwId0 : "";
      if (!mwId && !ob.geenVoorkeur && ob.kiesMw) return json(400, { error: "Kies bij wie je wilt boeken." });
      const nu = nuLokaal();
      if (actie === "boek-dagen") {
        const van0 = String(url.searchParams.get("van") || ""), van = /^\d{4}-\d{2}-\d{2}$/.test(van0) && van0 >= nu.datum ? van0 : nu.datum;
        const n = Math.min(42, Math.max(1, +url.searchParams.get("n") || 14)), tot = plusDagen(van, n - 1);
        const ctx = await laadCtx(db, van, tot);
        if (!vraag(ctx, diensten)) return json(400, { error: "Kies eerst een behandeling." });
        return json(200, { dagen: dagen(ctx, van, n, { diensten, mwId }), laatste: plusDagen(nu.datum, ob.maxDag) });
      }
      const datum = String(url.searchParams.get("datum") || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return json(400, { error: "Kies een dag." });
      const ctx = await laadCtx(db, datum, datum), v = vraag(ctx, diensten);
      if (!v) return json(400, { error: "Kies eerst een behandeling." });
      const toon = ob.kiesMw && mwId === "";
      return json(200, { duur: v.duur, tijden: tijden(ctx, datum, { diensten, mwId }).map(t => ({ start: t.start, ...(toon ? { mw: mwNaam(ctx, t.mwId) } : {}) })) });
    }
    /* ---------- online boeken: code voor een nieuwe klant ---------- */
    if (actie === "boek-code" && req.method === "POST") {
      const email = norm(body.email), ip = ipVan(req);
      if (!mailOk(email)) return json(400, { error: "Vul een geldig e-mailadres in." });
      const lim = await db.query(`SELECT (SELECT count(*) FROM ${Q("portaal_codes")} WHERE email = $1 AND aangemaakt > now() - interval '15 minutes') AS per_mail, (SELECT count(*) FROM ${Q("portaal_codes")} WHERE ip = $2 AND aangemaakt > now() - interval '1 hour') AS per_ip`, [email, ip]);
      if (+lim.rows[0].per_mail >= 3 || +lim.rows[0].per_ip >= 10) return json(429, { error: "Je hebt al een paar codes aangevraagd. Wacht een kwartier en probeer het dan opnieuw." });
      if (!smtpOk()) { console.error("boek-code: SMTP ontbreekt"); return json(503, { error: "De salon kan nu geen e-mail versturen. Bel de salon om je afspraak te maken." }); }
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
      await db.query(`INSERT INTO ${Q("portaal_codes")} (email, code_hash, ip, verloopt) VALUES ($1, $2, $3, now() + interval '15 minutes')`, [email, sha(SECRET, "boek", email, code), ip]);
      try {
        await mailer().sendMail({ ...afzender(salon.naam, salon.mail), to: email, subject: `Je code om te boeken: ${code}`,
          text: `Je code om je afspraak bij ${salon.naam || "de salon"} te bevestigen is: ${code}\n\nDe code is 15 minuten geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.`,
          html: mailHtml(salon, "Je code om te boeken", `<p>Je code om je afspraak te bevestigen is:</p><p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:10px 0 16px">${code}</p><p style="color:#6b706d;font-size:13px">De code is 15 minuten geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.</p>`) });
      } catch (e) { console.error("boek-code mail", e && e.message); return json(503, { error: "De e-mail met de code kon niet worden verstuurd. Probeer het over een paar minuten opnieuw." }); }
      return json(200, { ok: true });
    }
    /* ---------- online boeken: de afspraak vastleggen ---------- */
    if (actie === "boek" && req.method === "POST") {
      const diensten = lijstIds((body.diensten || []).join(",")), datum = String(body.datum || ""), start = String(body.start || "");
      const mwId = ob.kiesMw && /^[\w-]{1,40}$/.test(String(body.mwId || "")) ? String(body.mwId) : "";
      if (!diensten.length || !/^\d{4}-\d{2}-\d{2}$/.test(datum) || toMin(start) == null) return json(400, { error: "Kies een behandeling, dag en tijd." });
      if (!mwId && ob.kiesMw && !ob.geenVoorkeur) return json(400, { error: "Kies bij wie je wilt boeken." });
      const opm = str(body.opmerking, 500);
      /* wie boekt er? met sessie: die klant; anders een (nieuwe) klant die zijn e-mailadres met een code bevestigt */
      const ses1 = await sessie(db, req);
      let email, klant = null, nieuwKlant = false, kl1 = [];
      if (ses1) { email = ses1.email; kl1 = await klantenVan(db, email); const g = String(body.k || ""); klant = kl1.find(k => k.id === g) || kl1[0] || null; }
      if (!klant) {
        const n0 = body.nieuw || {}; email = norm(n0.email);
        const naam = str(n0.naam, 120), tel = str(n0.tel, 40), code = String(n0.code || "").replace(/\D/g, "");
        if (!naam || !mailOk(email)) return json(400, { error: "Vul je naam en e-mailadres in." });
        if (tel && !/^[0-9+()\s-]{6,40}$/.test(tel)) return json(400, { error: "Dit telefoonnummer lijkt niet te kloppen." });
        const r = await db.query(`SELECT id, code_hash, pogingen FROM ${Q("portaal_codes")} WHERE email = $1 AND verloopt > now() AND code_hash <> 'x' ORDER BY aangemaakt DESC LIMIT 1`, [email]);
        const row = r.rows[0], fout = json(401, { error: "Deze code klopt niet of is verlopen. Vraag eventueel een nieuwe code aan.", code: true });
        if (!row || code.length !== 6) return fout;
        if (row.pogingen >= 5) return json(429, { error: "Te veel pogingen. Vraag een nieuwe code aan.", code: true });
        await db.query(`UPDATE ${Q("portaal_codes")} SET pogingen = pogingen + 1 WHERE id = $1`, [row.id]);
        const a = Buffer.from(row.code_hash), b = Buffer.from(sha(SECRET, "boek", email, code));
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fout;
        await db.query(`DELETE FROM ${Q("portaal_codes")} WHERE id = $1`, [row.id]);
        kl1 = await klantenVan(db, email);
        if (kl1.length) klant = kl1[0];   // al klant met dit e-mailadres: daaraan koppelen
        else {
          if (ob.nieuweKlant === "nee") return json(403, { error: "Nieuwe klanten kunnen nog niet online boeken. Bel of mail de salon voor je eerste afspraak." });
          nieuwKlant = true; klant = { id: "k" + crypto.randomBytes(7).toString("hex"), data: { naam, email, tel, bron: "online", aangemaakt: Date.now() } };
        }
      }
      if (!nieuwKlant && klant) { const n24 = await db.query(`SELECT count(*) FROM ${Q("afspraken")} WHERE klant_id = $1 AND data->>'bron' = 'online' AND bijgewerkt > now() - interval '1 day'`, [klant.id]); if (+n24.rows[0].count >= 5) return json(429, { error: "Je hebt vandaag al een paar afspraken geboekt. Bel de salon als je er nog meer wilt maken." }); }
      /* voor wie (trimsalon: welke hond) */
      let hond = null, nieuwDier = false;
      if (objMode) {
        const h0 = body.hond || {};
        if (h0.id && !nieuwKlant) { const r = await db.query(`SELECT id, data FROM ${Q("honden")} WHERE NOT deleted AND id = $1 AND klant_id = $2`, [String(h0.id).slice(0, 40), klant.id]); if (r.rowCount) hond = { id: r.rows[0].id, data: r.rows[0].data }; }
        if (!hond) {
          const hn = str(h0.naam, 120); if (!hn) return json(400, { error: "Vul de naam van je hond in." });
          if (!nieuwKlant) { const r = await db.query(`SELECT id, data FROM ${Q("honden")} WHERE NOT deleted AND klant_id = $1 AND lower(trim(data->>'naam')) = $2`, [klant.id, hn.toLowerCase()]); if (r.rowCount) hond = { id: r.rows[0].id, data: r.rows[0].data }; }
          if (!hond) { nieuwDier = true; hond = { id: "h" + crypto.randomBytes(7).toString("hex"), data: { klantId: klant.id, naam: hn, ras: str(h0.ras, 120), bron: "online", aangemaakt: Date.now() } }; }
        }
      }
      /* een nieuwe klant volgt de regel voor nieuwe klanten (zijn eerste hond hoort daarbij); een bekende klant met een nieuwe hond de regel voor nieuwe honden */
      const aanvraag = ob.wijze === "aanvraag" || (nieuwKlant ? ob.nieuweKlant === "aanvraag" : (nieuwDier && ob.nieuwDier === "aanvraag"));
      /* vastleggen met een slot: twee klanten kunnen nooit hetzelfde tijdstip krijgen */
      const c = await db.connect(); let af, ctx;
      try {
        await c.query("BEGIN");
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["boek:" + SCH]);
        ctx = await laadCtx(c, datum, datum);
        const v = vraag(ctx, diensten);
        const vrij = v ? tijden(ctx, datum, { diensten, mwId }) : [];
        const slot = vrij.find(t => t.start === toHM(toMin(start)));
        if (!slot) { await c.query("ROLLBACK"); return json(409, { error: "Dit tijdstip is net niet meer vrij. Kies een andere tijd.", bezet: true }); }
        if (nieuwKlant) await upsertRow(c, "klanten", klant.id, { id: klant.id, ...klant.data }, "ONLINE", SCH);
        let hondId = null;
        if (objMode) { if (nieuwDier) await upsertRow(c, "honden", hond.id, { id: hond.id, ...hond.data }, "ONLINE", SCH); hondId = hond.id; }
        else { hondId = "s_" + klant.id; const r = await c.query(`SELECT 1 FROM ${Q("honden")} WHERE id = $1`, [hondId]); if (!r.rowCount) await upsertRow(c, "honden", hondId, { id: hondId, klantId: klant.id, naam: (klant.data && klant.data.naam) || "", auto: true, inactief: false }, "ONLINE", SCH); }
        af = { id: "ob" + crypto.randomBytes(7).toString("hex"), datum, start: slot.start, duur: v.duur, buffer: v.buffer, klantId: klant.id, hondId, mwId: slot.mwId || "", diensten: v.ds.map(a => a.id), status: aanvraag ? "aanvraag" : "bevestigd", notitie: opm ? "Opmerking van de klant: " + opm : "", factuurId: null, bron: "online", aangemaakt: Date.now() };
        await upsertRow(c, "afspraken", af.id, af, "ONLINE", SCH);
        const wat = v.ds.map(a => a.naam).join(", "), wanneer = new Date(datum + "T12:00:00Z").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) + " om " + slot.start;
        const voorWie = objMode && hond ? " voor " + (hond.data.naam || "") : "", bij = slot.mwId ? " bij " + mwNaam(ctx, slot.mwId) : "";
        const bid = "pb" + crypto.randomBytes(8).toString("hex");
        await upsertRow(c, "berichten", bid, { id: bid, klantId: klant.id, van: "klant", ts: Date.now(), gelezen: false, afspraakId: af.id,
          tekst: (aanvraag ? "Online aanvraag: " : "Online geboekt: ") + wat + voorWie + " op " + wanneer + bij + "." + (nieuwKlant ? " (nieuwe klant)" : "") + (nieuwDier && !nieuwKlant ? " (nieuwe hond)" : "") + (opm ? "\nOpmerking: " + opm : "") + (aanvraag ? "\nKeur de aanvraag goed of af in de agenda." : "") }, "ONLINE", SCH);
        await c.query("COMMIT");
        af._wat = wat; af._wanneer = wanneer; af._bij = bij; af._voorWie = voorWie;
      } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
      /* mails (na het vastleggen; een mislukte mail maakt de afspraak niet ongedaan) */
      const naamK = (klant.data && klant.data.naam) || "";
      if (smtpOk()) {
        const kop = aanvraag ? "We hebben je aanvraag ontvangen" : "Je afspraak staat vast";
        const uitleg = aanvraag ? "We kijken zo snel mogelijk of het lukt en laten het je weten." : (ob.annuleerUur >= 0 ? `Verhinderd? Je kunt tot ${ob.annuleerUur} uur van tevoren annuleren${salon.portaal ? " in het klantportaal" : ""}, of bel ons${salon.tel ? " op " + salon.tel : ""}.` : `Verhinderd? Bel ons${salon.tel ? " op " + salon.tel : ""}.`);
        mailer().sendMail({ ...afzender(salon.naam, salon.mail), to: email, subject: `${kop}: ${af._wanneer}`,
          text: `Hoi ${naamK},\n\n${kop}.\n\n${af._wat}${af._voorWie}\n${af._wanneer}${af._bij}\n${[salon.straat, salon.plaats].filter(Boolean).join(", ")}\n\n${uitleg}\n\nGroet, ${salon.naam || ""}`,
          html: mailHtml(salon, kop, `<p>Hoi ${esc(naamK)},</p><table style="border-left:4px solid #6a3560;padding:6px 14px;margin:0 0 14px"><tr><td><b>${esc(af._wat)}${esc(af._voorWie)}</b><br>${esc(af._wanneer)}${esc(af._bij)}<br><span style="color:#6b706d">${esc([salon.straat, salon.plaats].filter(Boolean).join(", "))}</span></td></tr></table><p>${esc(uitleg)}</p>`) }).catch(e => console.error("boek mail klant", e && e.message));
        const naar = salon.mail || process.env.MAIL_REPLY_TO;
        if (naar) mailer().sendMail({ from: afzender(salon.naam).from, to: naar, replyTo: email, subject: `${aanvraag ? "Online aanvraag" : "Online geboekt"}: ${naamK}, ${af._wanneer}`,
          text: `${naamK} (${email}) ${aanvraag ? "vraagt aan" : "heeft geboekt"}: ${af._wat}${af._voorWie} op ${af._wanneer}${af._bij}.${opm ? "\nOpmerking: " + opm : ""}${aanvraag ? "\n\nKeur de aanvraag goed of af in de agenda." : ""}` }).catch(e => console.error("boek mail salon", e && e.message));
      }
      /* een nieuwe of niet-ingelogde klant meteen inloggen, zodat hij zijn afspraak terugziet */
      let extra = {};
      if (!ses1) { const tok = crypto.randomBytes(32).toString("base64url"); await db.query(`INSERT INTO ${Q("portaal_sessies")} (token_hash, email, verloopt) VALUES ($1, $2, now() + interval '${SESSIE_DAGEN} days')`, [sha(SECRET, "sessie", tok), email]); extra = { "Set-Cookie": setCookie(tok, SESSIE_DAGEN * 86400) }; }
      return json(200, { ok: true, aanvraag, afspraak: { id: af.id, datum: af.datum, start: af.start, duur: af.duur, wat: af._wat, bij: af._bij.replace(/^ bij /, ""), voor: af._voorWie.replace(/^ voor /, "") } }, extra);
    }

    /* ---------- code aanvragen ---------- */
    if (actie === "code" && req.method === "POST") {
      const email = norm(body.email), ip = ipVan(req), t0 = Date.now();
      const generiek = () => new Promise(r => setTimeout(r, Math.max(0, 1500 - (Date.now() - t0)))).then(() => json(200, { ok: true, melding: "Als dit e-mailadres bij ons bekend is, ontvang je binnen een minuut een code." }));
      if (!mailOk(email)) return json(400, { error: "Vul een geldig e-mailadres in." });
      await db.query(`DELETE FROM ${Q("portaal_codes")} WHERE verloopt < now() - interval '1 day'`);
      const lim = await db.query(`SELECT (SELECT count(*) FROM ${Q("portaal_codes")} WHERE email = $1 AND aangemaakt > now() - interval '15 minutes') AS per_mail, (SELECT count(*) FROM ${Q("portaal_codes")} WHERE ip = $2 AND aangemaakt > now() - interval '1 hour') AS per_ip`, [email, ip]);
      if (+lim.rows[0].per_mail >= 3 || +lim.rows[0].per_ip >= 10) return json(429, { error: "Je hebt al een paar codes aangevraagd. Wacht een kwartier en probeer het dan opnieuw." });
      const kl = await klantenVan(db, email);
      // ook bij een onbekend adres een (nutteloze) rij, zodat de limieten niet verraden of een adres bestaat
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
      await db.query(`INSERT INTO ${Q("portaal_codes")} (email, code_hash, ip, verloopt) VALUES ($1, $2, $3, now() + interval '10 minutes')`, [email, kl.length ? sha(SECRET, "code", email, code) : "x", ip]);
      if (kl.length && !smtpOk()) { console.error("portaal code: SMTP_HOST/SMTP_USER/SMTP_PASS/MAIL_FROM ontbreken in Netlify"); return json(503, { error: "De salon kan nu geen e-mail versturen. Neem contact op met de salon." }); }
      if (kl.length) {
        const naam = kl.length === 1 ? ((kl[0].data && kl[0].data.naam) || "") : "";
        try {
          await mailer().sendMail({
          ...afzender(salon.naam, salon.mail), to: email, subject: `Je inlogcode: ${code}`,
          text: `Hoi ${naam},\n\nJe code om in te loggen bij het klantportaal van ${salon.naam || "de salon"} is: ${code}\n\nDe code is 10 minuten geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.`,
          html: mailHtml(salon, "Je inlogcode", `<p>Hoi ${esc(naam)},</p><p>Je code om in te loggen bij het klantportaal is:</p><p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:10px 0 16px">${code}</p><p style="color:#6b706d;font-size:13px">De code is 10 minuten geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.</p>`),
        });
        } catch (e) {
          console.error("portaal code: e-mail versturen mislukt:", e && (e.response || e.message || e));
          return json(503, { error: "De e-mail met de code kon niet worden verstuurd. Probeer het over een paar minuten opnieuw of neem contact op met de salon." + (process.env.PORTAAL_DEBUG ? " " + (e && e.message) : "") });
        }
      }
      return generiek();
    }

    /* ---------- inloggen met code ---------- */
    if (actie === "login" && req.method === "POST") {
      const email = norm(body.email), code = String(body.code || "").replace(/\D/g, "");
      const fout = json(401, { error: "Deze code klopt niet of is verlopen. Vraag eventueel een nieuwe code aan." });
      if (!mailOk(email) || code.length !== 6) return fout;
      const r = await db.query(`SELECT id, code_hash, pogingen FROM ${Q("portaal_codes")} WHERE email = $1 AND verloopt > now() AND code_hash <> 'x' ORDER BY aangemaakt DESC LIMIT 1`, [email]);
      if (!r.rowCount) return fout;
      const row = r.rows[0];
      if (row.pogingen >= 5) return json(429, { error: "Te veel pogingen. Vraag een nieuwe code aan." });
      await db.query(`UPDATE ${Q("portaal_codes")} SET pogingen = pogingen + 1 WHERE id = $1`, [row.id]);
      const a = Buffer.from(row.code_hash), b = Buffer.from(sha(SECRET, "code", email, code));
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fout;
      if (!(await klantenVan(db, email)).length) return fout;
      await db.query(`DELETE FROM ${Q("portaal_codes")} WHERE email = $1`, [email]);
      await db.query(`DELETE FROM ${Q("portaal_sessies")} WHERE verloopt < now()`);
      const tok = crypto.randomBytes(32).toString("base64url");
      await db.query(`INSERT INTO ${Q("portaal_sessies")} (token_hash, email, verloopt) VALUES ($1, $2, now() + interval '${SESSIE_DAGEN} days')`, [sha(SECRET, "sessie", tok), email]);
      return json(200, { ok: true }, { "Set-Cookie": setCookie(tok, SESSIE_DAGEN * 86400) });
    }

    /* ---------- vanaf hier alleen met geldige sessie ---------- */
    const ses = await sessie(db, req);
    if (!ses) return json(401, { error: "Niet ingelogd.", login: true });
    const kl = await klantenVan(db, ses.email);
    if (!kl.length) return json(401, { error: "Niet ingelogd.", login: true }, { "Set-Cookie": setCookie("x".repeat(20), 0) });
    const ids = kl.map(k => k.id);
    // deelt een e-mailadres meerdere klanten (bv. een gezin), dan kiest de klant welke hij bekijkt; alles gaat over die ene klant
    const gevraagd = String((req.method === "POST" ? body.k : url.searchParams.get("k")) || "");
    const sel = ids.includes(gevraagd) ? gevraagd : ids[0];
    const kSel = kl.find(k => k.id === sel);

    if (actie === "uit" && req.method === "POST") {
      await db.query(`DELETE FROM ${Q("portaal_sessies")} WHERE token_hash = $1`, [sha(SECRET, "sessie", ses.tok)]);
      return json(200, { ok: true }, { "Set-Cookie": setCookie("x".repeat(20), 0) });
    }

    /* mag de klant deze afspraak zelf annuleren? alleen als online boeken aanstaat en het nog ruim genoeg van tevoren is */
    function magAnnuleren(a) {
      if (!ob.aan || ob.annuleerUur < 0 || !a || ["afgerekend", "geannuleerd", "noshow", "binnen", "klaar"].includes(a.status)) return false;
      const nu = nuLokaal(), s = toMin(a.start); if (s == null) return false;
      const minuten = Math.round((new Date(a.datum + "T00:00:00Z") - new Date(nu.datum + "T00:00:00Z")) / 6e4) + s - nu.min;
      return minuten >= ob.annuleerUur * 60;
    }
    if (actie === "annuleer" && req.method === "POST") {
      const id = String(body.id || "").slice(0, 40);
      const r = await db.query(`SELECT id, data FROM ${Q("afspraken")} WHERE NOT deleted AND id = $1 AND klant_id = ANY($2)`, [id, ids]);
      if (!r.rowCount) return json(404, { error: "Deze afspraak is niet gevonden." });
      const a = { ...r.rows[0].data, id };
      if (!magAnnuleren(a)) return json(403, { error: ob.annuleerUur >= 0 ? `Annuleren kan tot ${ob.annuleerUur} uur van tevoren. Bel de salon${salon.tel ? " op " + salon.tel : ""}.` : `Bel de salon${salon.tel ? " op " + salon.tel : ""} om je afspraak te annuleren.` });
      const c = await db.connect();
      try {
        await c.query("BEGIN");
        await upsertRow(c, "afspraken", id, { ...a, status: "geannuleerd", geannuleerdDoor: "klant", geannuleerdOp: Date.now() }, "ONLINE", SCH);
        const bid = "pb" + crypto.randomBytes(8).toString("hex"), wanneer = new Date(a.datum + "T12:00:00Z").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) + " om " + a.start;
        await upsertRow(c, "berichten", bid, { id: bid, klantId: a.klantId, van: "klant", ts: Date.now(), gelezen: false, afspraakId: id, tekst: `Ik heb mijn afspraak van ${wanneer} geannuleerd via ${salon.portaal ? "het klantportaal" : "de boekpagina"}.` }, "ONLINE", SCH);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
      return json(200, { ok: true });
    }

    if (actie === "ik" && req.method === "GET") {
      const q = (t, extra = "") => db.query(`SELECT id, data FROM ${Q(t)} WHERE NOT deleted AND klant_id = $1 ${extra}`, [sel]).then(r => r.rows.map(x => ({ id: x.id, ...x.data })));
      const [honden, afs, beh, fac, ber] = await Promise.all([q("honden"), q("afspraken", "AND datum >= (now() AT TIME ZONE 'Europe/Amsterdam')::date - 1"), q("behandelingen"), q("facturen"), q("berichten")]);
      const artIds = [...new Set(afs.flatMap(a => a && Array.isArray(a.diensten) ? a.diensten.filter(x => typeof x === "string") : []))];
      const arts = artIds.length ? (await db.query(`SELECT id, data->>'naam' AS naam FROM ${Q("artikelen")} WHERE id = ANY($1)`, [artIds])).rows : [];
      const artNaam = Object.fromEntries(arts.map(a => [a.id, a.naam]));
      const hondNaam = Object.fromEntries(honden.filter(h => h && !h.auto).map(h => [h.id, h.naam]));
      const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
      const k0 = kSel.data || {};
      const lijst = v => Array.isArray(v) ? v : [];
      // één afwijkend record mag nooit het hele portaal stoppen: overslaan en in het logboek melden
      const veilig = (naam, rijen, fn) => { const uit = []; for (const r of lijst(rijen)) { try { const x = fn(r); if (x) uit.push(x); } catch (e) { console.error(`portaal ik: ${naam} ${r && r.id} overgeslagen:`, e && e.message); } } return uit; };
      const tekst = v => v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : String(v);
      const ts = v => +v || 0;
      // alleen velden die voor de klant bedoeld zijn
      return json(200, {
        salon: { ...publiekSalon(salon), btwnr: salon.btwnr || "", iban: salon.iban || "", voet: salon.voet || "" },
        boeken: ob.aan,
        klanten: kl.map(k => ({ id: k.id, naam: (k.data && k.data.naam) || "Klant" })), kSel: sel,
        klant: { naam: tekst(k0.naam), straat: tekst(k0.straat), pc: tekst(k0.pc), plaats: tekst(k0.plaats), tel: tekst(k0.tel), email: ses.email },
        honden: veilig("hond", honden.filter(h => h && !h.inactief && !h.auto), h => ({ id: h.id, naam: tekst(h.naam), ras: tekst(h.ras), geb: tekst(h.geb), geslacht: tekst(h.geslacht), gewicht: h.gewicht ?? "", vacht: tekst(h.vacht), kleur: tekst(h.kleur), chip: tekst(h.chip), foto: typeof h.foto === "string" && h.foto.length < 200000 ? h.foto : "" })),
        afspraken: veilig("afspraak", afs.filter(a => a && typeof a.datum === "string" && a.datum >= vandaag && !["geannuleerd", "noshow", "afgerekend"].includes(a.status)).sort((a, b) => (a.datum + tekst(a.start)).localeCompare(b.datum + tekst(b.start))),
          a => ({ id: a.id, datum: a.datum, start: tekst(a.start), duur: +a.duur || 30, hond: hondNaam[a.hondId] || "", behandelingen: lijst(a.diensten).map(i => artNaam[i]).filter(Boolean), bevestigd: a.status === "bevestigd", aanvraag: a.status === "aanvraag", magAnnuleren: magAnnuleren(a) })),
        historie: veilig("behandeling", beh.filter(Boolean).sort((a, b) => tekst(b.datum).localeCompare(tekst(a.datum))).slice(0, 100),
          b => ({ datum: tekst(b.datum), hond: hondNaam[b.hondId] || "", behandelingen: tekst(b.diensten), mesje: tekst(b.mesje), vacht: tekst(b.vacht), techniek: tekst(b.techniek), vorm: tekst(b.vorm), kleur: tekst(b.kleur), extra: tekst(b.extra), notitie: tekst(b.klantNotitie) })),
        facturen: veilig("factuur", fac.filter(Boolean).sort((a, b) => ts(b.ts) - ts(a.ts)), f => ({ id: f.id, nr: tekst(f.nr), ts: f.ts, vervalt: tekst(f.vervalt), hond: hondNaam[f.hondId] || "", korting: +f.korting || 0, sub: +f.sub || 0, totaal: +f.totaal || 0, betaald: +f.betaald || 0, rest: +f.rest || 0, credit: !!f.credit, creditNr: f.credit ? tekst(f.creditNr) : "", reden: f.credit ? tekst(f.reden) : "",
          regels: lijst(f.regels).filter(Boolean).map(r => ({ naam: tekst(r.naam), aantal: +r.aantal || 0, prijs: +r.prijs || 0, btw: +r.btw || 0, totaal: +r.totaal || 0 })), betalingen: lijst(f.betalingen).filter(Boolean).map(p => ({ ts: p.ts, methode: tekst(p.methode), bedrag: +p.bedrag || 0 })) })),
        berichten: veilig("bericht", ber.filter(Boolean).sort((a, b) => ts(a.ts) - ts(b.ts)).slice(-200), b => ({ id: b.id, van: b.van === "salon" ? "salon" : "klant", tekst: tekst(b.tekst), ts: b.ts, ...(b.van === "salon" && b.door ? { door: tekst(b.door).slice(0, 40) } : {}) })),
      });
    }

    if (actie === "bericht" && req.method === "POST") {
      const tekst = str(body.tekst, 2000);
      if (!tekst) return json(400, { error: "Typ eerst een bericht." });
      const n = await db.query(`SELECT count(*) FROM ${Q("berichten")} WHERE klant_id = ANY($1) AND van = 'klant' AND bijgewerkt > now() - interval '1 day'`, [ids]);
      if (+n.rows[0].count >= 20) return json(429, { error: "Je hebt vandaag al veel berichten gestuurd. Bel ons gerust als het dringend is." });
      const id = "pb" + crypto.randomBytes(8).toString("hex");
      const c = await db.connect();
      try { await upsertRow(c, "berichten", id, { id, klantId: sel, van: "klant", tekst, ts: Date.now(), gelezen: false }, "PORTAAL", SCH); } finally { c.release(); }
      const naar = salon.mail || process.env.MAIL_REPLY_TO || process.env.SMTP_USER;
      if (naar && smtpOk()) {
        const naam = (kSel.data && kSel.data.naam) || ses.email;
        mailer().sendMail({ from: afzender(salon.naam).from, to: naar, replyTo: ses.email, subject: `Nieuw bericht van ${naam} via het klantportaal`,
          text: `${naam} (${ses.email}) schreef via het klantportaal:\n\n${tekst}\n\nBeantwoord het bericht in ${process.env.PLATFORM_NAAM || ({ nagelstudio: "Nailly", pedicure: "Pedly" }[salon.sjabloon] || "Trimmy")} bij Berichten.`,
          html: mailHtml(salon, "Nieuw bericht via het klantportaal", `<p><b>${esc(naam)}</b> (${esc(ses.email)}) schreef:</p><blockquote style="margin:0 0 14px;padding:10px 14px;background:#f4f1f4;border-left:4px solid #6a3560;white-space:pre-wrap">${esc(tekst)}</blockquote><p style="color:#6b706d;font-size:13px">Beantwoord het bericht in ${esc(process.env.PLATFORM_NAAM || ({ nagelstudio: "Nailly", pedicure: "Pedly" }[salon.sjabloon] || "Trimmy"))} bij Berichten; de klant ziet je antwoord in het portaal en krijgt een mailtje.</p>`) }).catch(e => console.error("portaal mail salon", e));
      }
      return json(200, { ok: true, id });
    }

    if (actie === "gegevens" && req.method === "POST") {
      const nieuw = { tel: str(body.tel, 40), straat: str(body.straat, 200), pc: str(body.pc, 12).toUpperCase(), plaats: str(body.plaats, 120) };
      if (nieuw.tel && !/^[0-9+()\s-]{6,40}$/.test(nieuw.tel)) return json(400, { error: "Dit telefoonnummer lijkt niet te kloppen." });
      const oud = kSel.data || {}, lab = { tel: "Telefoon", straat: "Straat en huisnummer", pc: "Postcode", plaats: "Plaats" };
      const wijz = Object.keys(nieuw).filter(k => (oud[k] || "") !== nieuw[k]);
      if (!wijz.length) return json(200, { ok: true, gewijzigd: 0 });
      const c = await db.connect();
      try {
        await c.query("BEGIN");
        await upsertRow(c, "klanten", sel, { ...oud, ...nieuw, id: sel }, "PORTAAL", SCH);
        const id = "pb" + crypto.randomBytes(8).toString("hex");
        await upsertRow(c, "berichten", id, { id, klantId: sel, van: "klant", ts: Date.now(), gelezen: false, tekst: "Ik heb mijn gegevens aangepast in het portaal:\n" + wijz.map(k => `${lab[k]}: ${oud[k] || "–"} → ${nieuw[k] || "–"}`).join("\n") }, "PORTAAL", SCH);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
      return json(200, { ok: true, gewijzigd: wijz.length });
    }

    return json(404, { error: "onbekend" });
  } catch (e) {
    console.error("portaal fout bij /" + actie + ":", e && (e.stack || e.message || e));
    return json(500, { error: "Er ging iets mis. Probeer het later opnieuw." + (process.env.PORTAAL_DEBUG ? " " + foutmelding(e) : "") });
  }
};

export const config = { path: "/api/portaal/*" };
