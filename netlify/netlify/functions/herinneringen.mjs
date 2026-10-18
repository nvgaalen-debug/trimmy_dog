// Trimmy · geplande taak: verstuurt ingeplande herinneringen (elke 10 minuten)
import { getStore } from "@netlify/blobs";
import nodemailer from "nodemailer";

let transport;
const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);

function getTransport() {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

function logoAttachment(logo, html) {
  if (!logo || !html || !html.includes("cid:trimmy-logo")) return [];
  const m = String(logo).match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 700000) return [];
  const ext = m[1].split("/")[1] === "jpeg" ? "jpg" : m[1].split("/")[1];
  return [{ filename: "logo." + ext, content: m[2], encoding: "base64", contentType: m[1], cid: "trimmy-logo", contentDisposition: "inline" }];
}

async function sendMail({ to, subject, html, text, logo }) {
  const attachments = logoAttachment(logo, html);
  return getTransport().sendMail({
    from: process.env.MAIL_FROM, to, subject, html: html || undefined, text: text || undefined,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    attachments: attachments.length ? attachments : undefined,
  });
}

function mailError(e) {
  return e && e.code === "EAUTH" ? "de mailserver weigert de inlog; controleer SMTP_USER en SMTP_PASS"
    : e && (e.code === "ECONNECTION" || e.code === "ETIMEDOUT") ? "de mailserver is niet bereikbaar; controleer SMTP_HOST en SMTP_PORT"
    : "versturen mislukt: " + ((e && (e.response || e.message)) || "onbekende fout");
}


export default async () => {
  if (!smtpConfigured()) { console.log("herinneringen: SMTP niet ingesteld"); return; }
  const store = getStore("trimmy-herinneringen");
  const { blobs } = await store.list();
  const now = Date.now();
  let sent = 0, failed = 0;
  for (const b of blobs) {
    const it = await store.get(b.key, { type: "json" });
    if (!it) continue;
    if (it.afspraakAt < now - 7 * 864e5) { await store.delete(b.key); continue; }   // opruimen na een week
    if (it.status !== "gepland" || it.sendAt > now) continue;
    if (it.afspraakAt <= now) { it.status = "vervallen"; await store.setJSON(b.key, it); continue; }
    try {
      await sendMail(it);
      it.status = "verstuurd"; it.sentAt = Date.now(); it.error = null; sent++;
    } catch (e) {
      it.tries = (it.tries || 0) + 1; it.error = mailError(e); failed++;
      if (it.tries >= 3) it.status = "mislukt";
      console.error("herinnering", b.key, e);
    }
    await store.setJSON(b.key, it);
    if (sent >= 40) break;   // binnen de tijdslimiet van een geplande taak blijven
  }
  console.log(`herinneringen: ${sent} verstuurd, ${failed} mislukt`);
};

export const config = { schedule: "*/10 * * * *" };
