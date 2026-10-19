// Trimmy · inloggen voor salons (platform)
// Routes (alle onder /api/auth/):
//   POST login       { email, wachtwoord, apparaat }  -> koppelt dit apparaat (cookie tr_app, 1 jaar, intrekbaar)
//   GET  ik                                            -> salon en eigenaar van dit apparaat, plus gekoppelde apparaten
//   POST uit                                           -> dit apparaat afmelden
//   POST apparaat-weg { id }                           -> een ander apparaat van dezelfde salon afmelden
//   POST uitnodiging  { token }                        -> gegevens bij een uitnodigings- of herstellink
//   POST wachtwoord   { token, wachtwoord, apparaat }  -> wachtwoord instellen (uitnodiging of vergeten) en meteen inloggen
//   POST vergeten     { email }                        -> herstellink per mail (antwoord is altijd hetzelfde)
//   POST uitnodigen   { email, naam, medewerkerId }    -> (eigenaar) medewerker een eigen login geven; mailt een activatielink
//   POST gebruiker-weg { id }                          -> (eigenaar) login van een medewerker intrekken (ook op al diens apparaten)
// Beveiliging: wachtwoorden met scrypt, tokens alleen gehasht, max. 5 inlogpogingen per e-mailadres per 15 min en 30 per IP per uur,
// cookies HttpOnly/Secure/SameSite=Strict, POST alleen met X-Trimmy-App: 1 en JSON.
import nodemailer from "nodemailer";
import { getPool } from "./db.mjs";
import { P, ensurePlatform, sha, nieuwToken, uid, norm, mailOk, ipVan, hashWachtwoord, checkWachtwoord, wachtwoordFout, cookieVan, zetCookie, APPARAAT_DAGEN, salonOpen, salonInfo, teVaak, afzender } from "../lib/platform.mjs";

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra } });
const smtpOk = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
let tr; const mailer = () => tr || (tr = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: +(process.env.SMTP_PORT || 587) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }));
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const appUrl = url => (process.env.APP_URL || url.origin).replace(/\/+$/, "");
const apparaatNaam = (req, body) => String((body && body.apparaat) || req.headers.get("user-agent") || "Apparaat").replace(/[\r\n]/g, " ").slice(0, 200);

async function koppel(db, req, body, eig) {
  const tok = nieuwToken();
  await db.query(`INSERT INTO ${P("apparaten")} (token_hash, salon_id, gebruiker_id, naam, verloopt) VALUES ($1, $2, $3, $4, now() + interval '${APPARAAT_DAGEN} days')`, [sha("app", tok), eig.salon_id, eig.id, apparaatNaam(req, body)]);
  await db.query(`UPDATE ${P("gebruikers")} SET laatst_ingelogd = now() WHERE id = $1`, [eig.id]);
  return zetCookie("tr_app", tok, APPARAAT_DAGEN * 86400);
}
const salonVan = async (db, id) => (await db.query(`SELECT * FROM ${P("salons")} WHERE id = $1`, [id])).rows[0];

export async function stuurLink(db, url, eig, soort) {
  const tok = nieuwToken(), uren = soort === "herstel" ? 2 : 24 * 7;
  await db.query(`UPDATE ${P("uitnodigingen")} SET gebruikt = true WHERE gebruiker_id = $1 AND NOT gebruikt`, [eig.id]);
  await db.query(`INSERT INTO ${P("uitnodigingen")} (token_hash, gebruiker_id, soort, verloopt) VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)`, [sha("uitn", tok), eig.id, soort, String(uren)]);
  const link = `${appUrl(url)}/welkom?t=${tok}`;
  let gemaild = false;
  if (smtpOk() && mailOk(norm(eig.email))) {
    const s = await salonVan(db, eig.salon_id), af = afzender(process.env.PLATFORM_NAAM || "Trimmy", process.env.MAIL_REPLY_TO);
    const kop = soort === "herstel" ? "Nieuw wachtwoord instellen" : `Je account bij ${s ? s.naam : (process.env.PLATFORM_NAAM || "Trimmy")}`;
    const zin = soort === "herstel" ? "Je hebt gevraagd om een nieuw wachtwoord. Klik op de knop om er een te kiezen. De link is 2 uur geldig." : `Er staat een account voor je klaar voor ${s ? s.naam : "je salon"}. Klik op de knop, kies een wachtwoord en je kunt meteen beginnen. De link is 7 dagen geldig.`;
    try {
      await mailer().sendMail({ ...af, to: eig.email, subject: kop,
        text: `Hoi ${eig.naam || ""},\n\n${zin}\n\n${link}\n\nHeb je dit niet verwacht? Dan kun je deze mail negeren.`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:520px"><h2 style="margin:0 0 12px">${esc(kop)}</h2><p>Hoi ${esc(eig.naam || "")},</p><p>${esc(zin)}</p><p style="margin:22px 0"><a href="${esc(link)}" style="background:#6a3560;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${soort === "herstel" ? "Wachtwoord kiezen" : "Account activeren"}</a></p><p style="color:#777;font-size:13px">Werkt de knop niet? Kopieer dan deze link: ${esc(link)}<br>Heb je dit niet verwacht? Dan kun je deze mail negeren.</p></div>` });
      gemaild = true;
    } catch (e) { console.error("auth mail", e && (e.response || e.message)); }
  }
  return { link, gemaild };
}

export default async (req) => {
  const url = new URL(req.url), actie = url.pathname.replace(/\/+$/, "").split("/").pop();
  if (req.method === "POST" && (req.headers.get("x-trimmy-app") !== "1" || !/application\/json/i.test(req.headers.get("content-type") || ""))) return json(403, { error: "ongeldig verzoek" });
  const platformAan = !!process.env.BEHEER_CODE;
  // zonder platform (één salon per site) of zonder apparaat-cookie: "ik" meteen beantwoorden, zonder database
  if (actie === "ik" && (!platformAan || !cookieVan(req, "tr_app"))) return json(401, { error: "niet ingelogd", login: true, platform: platformAan });
  if (!platformAan) return json(404, { error: "Inloggen met een account is op deze site niet ingeschakeld.", platform: false });
  let db;
  try { db = getPool(); await ensurePlatform(db); }
  catch (e) { console.error("auth platform", e); return json(503, { error: e && e.code === "42501" ? "De databasegebruiker mag het platform-schema niet aanmaken. Zie de LEESMIJ (Platform, eenmalig)." : "Inloggen is even niet mogelijk. Probeer het later opnieuw." }); }
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  try {
    if (actie === "login" && req.method === "POST") {
      const email = norm(body.email), ww = String(body.wachtwoord || ""), fout = json(401, { error: "Dit e-mailadres of wachtwoord klopt niet." });
      if (!mailOk(email) || !ww) return fout;
      if (await teVaak(db, "login:" + email, 5, 15) || await teVaak(db, "loginip:" + ipVan(req), 30, 60)) return json(429, { error: "Te veel pogingen. Wacht een kwartier en probeer het dan opnieuw." });
      const eig = (await db.query(`SELECT * FROM ${P("gebruikers")} WHERE lower(email) = $1`, [email])).rows[0];
      if (!checkWachtwoord(ww, eig && eig.hash) || !eig) return fout;
      const s = await salonVan(db, eig.salon_id), open = salonOpen(s);
      if (!open.ok) return json(403, { error: open.fout, geblokkeerd: true });
      const ck = await koppel(db, req, body, eig);
      return json(200, { ok: true, salon: salonInfo(s), gebruiker: { naam: eig.naam || "", email: eig.email, rol: eig.rol || "eigenaar", medewerkerId: eig.medewerker_id || null } }, { "Set-Cookie": ck });
    }
    if (actie === "uitnodiging" && req.method === "POST") {
      const r = await db.query(`SELECT u.soort, e.email, e.naam, s.naam AS salon FROM ${P("uitnodigingen")} u JOIN ${P("gebruikers")} e ON e.id = u.gebruiker_id JOIN ${P("salons")} s ON s.id = e.salon_id WHERE u.token_hash = $1 AND NOT u.gebruikt AND u.verloopt > now()`, [sha("uitn", String(body.token || ""))]);
      if (!r.rowCount) return json(404, { error: "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan." });
      return json(200, { ok: true, ...r.rows[0] });
    }
    if (actie === "wachtwoord" && req.method === "POST") {
      const f = wachtwoordFout(body.wachtwoord); if (f) return json(400, { error: f });
      if (await teVaak(db, "ww:" + ipVan(req), 20, 60)) return json(429, { error: "Te veel pogingen. Probeer het later opnieuw." });
      const r = await db.query(`SELECT u.token_hash, e.* FROM ${P("uitnodigingen")} u JOIN ${P("gebruikers")} e ON e.id = u.gebruiker_id WHERE u.token_hash = $1 AND NOT u.gebruikt AND u.verloopt > now()`, [sha("uitn", String(body.token || ""))]);
      const eig = r.rows[0]; if (!eig) return json(404, { error: "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan." });
      const s = await salonVan(db, eig.salon_id), open = salonOpen(s);
      if (!open.ok) return json(403, { error: open.fout, geblokkeerd: true });
      await db.query(`UPDATE ${P("gebruikers")} SET hash = $1 WHERE id = $2`, [hashWachtwoord(body.wachtwoord), eig.id]);
      await db.query(`UPDATE ${P("uitnodigingen")} SET gebruikt = true WHERE gebruiker_id = $1`, [eig.id]);
      await db.query(`DELETE FROM ${P("apparaten")} WHERE gebruiker_id = $1`, [eig.id]);   // nieuw wachtwoord: alle oude apparaten afmelden
      const ck = await koppel(db, req, body, eig);
      return json(200, { ok: true, salon: salonInfo(s), gebruiker: { naam: eig.naam || "", email: eig.email, rol: eig.rol || "eigenaar", medewerkerId: eig.medewerker_id || null } }, { "Set-Cookie": ck });
    }
    if (actie === "vergeten" && req.method === "POST") {
      const email = norm(body.email), t0 = Date.now();
      const klaar = () => new Promise(r => setTimeout(r, Math.max(0, 1200 - (Date.now() - t0)))).then(() => json(200, { ok: true, melding: "Als dit e-mailadres bij ons bekend is, ontvang je binnen een paar minuten een link om een nieuw wachtwoord te kiezen." }));
      if (!mailOk(email) || await teVaak(db, "vergeten:" + email, 3, 60)) return klaar();
      const eig = (await db.query(`SELECT * FROM ${P("gebruikers")} WHERE lower(email) = $1`, [email])).rows[0];
      if (eig) await stuurLink(db, url, eig, "herstel");
      return klaar();
    }

    /* ---------- vanaf hier met een gekoppeld apparaat ---------- */
    const tok = cookieVan(req, "tr_app");
    const a = tok && (await db.query(`SELECT a.*, e.naam AS e_naam, e.email AS e_email, e.rol AS e_rol, e.medewerker_id AS e_mw FROM ${P("apparaten")} a LEFT JOIN ${P("gebruikers")} e ON e.id = a.gebruiker_id WHERE a.token_hash = $1 AND a.verloopt > now()`, [sha("app", tok)])).rows[0];
    if (!a) return json(401, { error: "Dit apparaat is niet (meer) gekoppeld.", login: true, platform: true, ingetrokken: true }, { "Set-Cookie": zetCookie("tr_app", "x".repeat(20), 0) });
    if (actie === "uit" && req.method === "POST") {
      await db.query(`DELETE FROM ${P("apparaten")} WHERE token_hash = $1`, [a.token_hash]);
      return json(200, { ok: true }, { "Set-Cookie": zetCookie("tr_app", "x".repeat(20), 0) });
    }
    const s = await salonVan(db, a.salon_id);
    /* supportsessie vanuit /beheer: nooit eigenaarsrechten, geen accountbeheer */
    const rolVan = a.support ? "support" : (a.e_rol || "eigenaar");
    if (a.support && s && s.support_toegestaan === false) { await db.query(`DELETE FROM ${P("apparaten")} WHERE token_hash = $1`, [a.token_hash]); return json(401, { error: "De salon heeft supporttoegang uitgezet.", login: true, platform: true, ingetrokken: true }, { "Set-Cookie": zetCookie("tr_app", "x".repeat(20), 0) }); }
    if (actie === "ik" && req.method === "GET" && a.support) {
      return json(200, { ok: true, salon: salonInfo(s), open: true, fout: null, gebruiker: { naam: "Support", email: "", rol: "support", support: a.support, tot: a.verloopt }, gebruikers: [], apparaten: [] });
    }
    if (actie === "ik" && req.method === "GET") {
      const ap = (await db.query(`SELECT token_hash, naam, aangemaakt, laatst FROM ${P("apparaten")} WHERE salon_id = $1 AND verloopt > now() AND support IS NULL ORDER BY laatst DESC LIMIT 50`, [a.salon_id])).rows;
      const open = salonOpen(s);
      const eig = (a.e_rol || "eigenaar") === "eigenaar";
      const gb = eig ? (await db.query(`SELECT id, email, naam, rol, medewerker_id, laatst_ingelogd, hash IS NOT NULL AS actief FROM ${P("gebruikers")} WHERE salon_id = $1 ORDER BY rol, lower(email)`, [a.salon_id])).rows : [];
      const sl = eig ? (await db.query(`SELECT soort, reden, begin, tot FROM ${P("support_log")} WHERE salon_id = $1 ORDER BY begin DESC LIMIT 10`, [a.salon_id])).rows : [];
      return json(200, { ok: true, salon: { ...salonInfo(s), supportToegestaan: s.support_toegestaan !== false }, support: sl.map(x => ({ soort: x.soort, reden: x.reden, begin: x.begin, tot: x.tot, actief: new Date(x.tot) > new Date() })), open: open.ok, fout: open.ok ? null : open.fout, gebruiker: { naam: a.e_naam || "", email: a.e_email || "", rol: a.e_rol || "eigenaar", medewerkerId: a.e_mw || null },
        gebruikers: gb.map(g => ({ id: g.id, email: g.email, naam: g.naam || "", rol: g.rol, medewerkerId: g.medewerker_id, laatst: g.laatst_ingelogd, actief: g.actief, ik: g.id === a.gebruiker_id })),
        apparaten: (eig ? ap : ap.filter(x => x.token_hash === a.token_hash)).map(x => ({ id: x.token_hash.slice(0, 16), naam: x.naam, sinds: x.aangemaakt, laatst: x.laatst, dit: x.token_hash === a.token_hash })) });
    }
    const isEig = rolVan === "eigenaar";
    if (["apparaat-weg", "uitnodigen", "gebruiker-weg", "support-instelling"].includes(actie) && !isEig) return json(403, { error: "Alleen de eigenaar van de salon kan dit." });
    if (actie === "uitnodigen" && req.method === "POST") {
      const email = norm(body.email), naam = String(body.naam || "").slice(0, 120), mw = /^[A-Za-z0-9_-]{1,40}$/.test(String(body.medewerkerId || "")) ? String(body.medewerkerId) : null;
      if (!mailOk(email)) return json(400, { error: "Vul een geldig e-mailadres in." });
      let g = (await db.query(`SELECT * FROM ${P("gebruikers")} WHERE lower(email) = $1`, [email])).rows[0];
      if (g && g.salon_id !== a.salon_id) return json(409, { error: "Dit e-mailadres wordt al gebruikt bij een andere salon. Kies een ander adres." });
      if (g && g.rol === "eigenaar") return json(409, { error: "Dit is het adres van de eigenaar." });
      if (!g) { g = { id: uid(), salon_id: a.salon_id, email, naam, rol: "medewerker", medewerker_id: mw }; await db.query(`INSERT INTO ${P("gebruikers")} (id, salon_id, email, naam, rol, medewerker_id) VALUES ($1, $2, $3, $4, 'medewerker', $5)`, [g.id, a.salon_id, email, naam, mw]); }
      else await db.query(`UPDATE ${P("gebruikers")} SET naam = $1, medewerker_id = $2 WHERE id = $3`, [naam || g.naam, mw, g.id]);
      const r = await stuurLink(db, url, { ...g, naam: naam || g.naam }, "uitnodiging");
      return json(200, { ok: true, ...r });
    }
    if (actie === "gebruiker-weg" && req.method === "POST") {
      const id = String(body.id || "");
      const r = await db.query(`DELETE FROM ${P("gebruikers")} WHERE id = $1 AND salon_id = $2 AND rol <> 'eigenaar' RETURNING id`, [id, a.salon_id]);
      if (r.rowCount) await db.query(`DELETE FROM ${P("apparaten")} WHERE gebruiker_id = $1`, [id]);
      return json(200, { ok: true, verwijderd: r.rowCount || 0 });
    }
    if (actie === "support-instelling" && req.method === "POST") {
      const aan = body.aan !== false;
      await db.query(`UPDATE ${P("salons")} SET support_toegestaan = $1 WHERE id = $2`, [aan, a.salon_id]);
      if (!aan) await db.query(`DELETE FROM ${P("apparaten")} WHERE salon_id = $1 AND support IS NOT NULL`, [a.salon_id]);   // lopende supportsessies meteen stoppen
      return json(200, { ok: true, aan });
    }
    if (actie === "apparaat-weg" && req.method === "POST") {
      const id = String(body.id || "");
      if (!/^[0-9a-f]{16}$/.test(id)) return json(400, { error: "onbekend apparaat" });
      const r = await db.query(`DELETE FROM ${P("apparaten")} WHERE salon_id = $1 AND left(token_hash, 16) = $2 AND token_hash <> $3`, [a.salon_id, id, a.token_hash]);
      return json(200, { ok: true, verwijderd: r.rowCount || 0 });
    }
    return json(404, { error: "onbekend" });
  } catch (e) {
    console.error("auth fout bij /" + actie + ":", e && (e.stack || e.message || e));
    return json(500, { error: "Er ging iets mis. Probeer het later opnieuw." });
  }
};

export const config = { path: "/api/auth/*" };
