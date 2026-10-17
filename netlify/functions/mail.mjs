// Trimmy · opgemaakte e-mail versturen via SMTP
// Route:  GET  /api/mail?code=…   -> { configured: true/false }
//         POST /api/mail?code=…   -> { to, subject, html, text }
// Omgevingsvariabelen (Netlify > Site configuration > Environment variables):
//   SMTP_HOST      bv. smtp.gmail.com, smtp-relay.brevo.com of de server van je hostingpartij
//   SMTP_PORT      465 (SSL) of 587 (STARTTLS)
//   SMTP_USER      gebruikersnaam van de mailbox
//   SMTP_PASS      wachtwoord of app-wachtwoord
//   MAIL_FROM      afzender, bv. "Trimsalon Vachtwerk <info@vachtwerk.nl>"
//   MAIL_REPLY_TO  (optioneel) antwoordadres
//   TRIMMY_CODE    dezelfde geheime code als voor de database
import nodemailer from "nodemailer";

const cors = { "Access-Control-Allow-Origin": process.env.TRIMMY_ORIGIN || "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: cors });
const configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);

let transport;
function getTransport() {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  if (!process.env.TRIMMY_CODE || url.searchParams.get("code") !== process.env.TRIMMY_CODE) return json(401, { error: "onjuiste of ontbrekende code in het adres" });
  if (req.method === "GET") return json(200, { configured: configured() });
  if (req.method !== "POST") return json(405, { error: "alleen GET en POST" });
  if (!configured()) return json(500, { error: "e-mail is nog niet ingesteld op Netlify (SMTP_HOST, SMTP_USER, SMTP_PASS en MAIL_FROM)" });

  const body = await req.json().catch(() => null);
  const to = String(body?.to || "").trim();
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) return json(400, { error: "ongeldig e-mailadres" });
  const subject = String(body?.subject || "").slice(0, 200);
  const html = String(body?.html || "");
  const text = String(body?.text || "");
  if (!subject || (!html && !text)) return json(400, { error: "onderwerp en bericht zijn verplicht" });
  if (html.length > 300000) return json(413, { error: "bericht is te groot" });

  try {
    const info = await getTransport().sendMail({
      from: process.env.MAIL_FROM, to, subject, html: html || undefined, text: text || undefined,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
    });
    return json(200, { ok: true, id: info.messageId });
  } catch (e) {
    console.error("mail", e);
    const msg = e.code === "EAUTH" ? "de mailserver weigert de inlog; controleer SMTP_USER en SMTP_PASS (bij Gmail een app-wachtwoord)"
      : e.code === "ECONNECTION" || e.code === "ETIMEDOUT" ? "de mailserver is niet bereikbaar; controleer SMTP_HOST en SMTP_PORT"
      : "versturen mislukt: " + (e.response || e.message);
    return json(502, { error: msg });
  }
};

export const config = { path: "/api/mail" };
