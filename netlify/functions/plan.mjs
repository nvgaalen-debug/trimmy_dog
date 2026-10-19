// Trimmy · herinneringen inplannen (opslag in Netlify Blobs)
// GET  /api/plan?code=…   -> { items: [{ id, sendAt, afspraakAt, to, status, sentAt, error, tries }] }
// POST /api/plan?code=…   -> { upsert: [{ id, sendAt, afspraakAt, to, subject, html, text, logo }], remove: [id, …] }
import { getStore } from "@netlify/blobs";
import { getPool } from "./db.mjs";
import { tenant, afzender } from "../lib/platform.mjs";

const cors = { "Access-Control-Allow-Origin": process.env.TRIMMY_ORIGIN || "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Trimmy-Code, X-Trimmy-App", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: cors });
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const ID = /^[A-Za-z0-9_-]{1,60}$/;

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  let t;
  try { t = await tenant(req, url, getPool()); } catch (e) { console.error("plan tenant", e); return json(503, { error: "even niet bereikbaar" }); }
  if (!t) return json(401, { error: "niet ingelogd of onjuiste code", login: true });
  if (t.rol === "support" && t.support !== "volledig" && req.method === "POST") return json(403, { error: "Supportmodus: alleen meekijken." });
  if (t.fout) return json(t.status || 403, { error: t.fout, geblokkeerd: !!t.geblokkeerd });
  if (req.method === "POST" && !t.legacy && req.headers.get("x-trimmy-app") !== "1") return json(403, { error: "ongeldig verzoek" });
  const store = getStore("trimmy-herinneringen");
  // elke salon heeft zijn eigen herinneringen (sleutel "<salon-id>/<id>"); de oude manier gebruikt sleutels zonder "/"
  const pre = t.salon ? t.salon.id + "/" : "";
  const sleutel = id => pre + id;
  let af = null;
  if (t.salon) { const r = await getPool().query(`SELECT data FROM "${t.schema}"."bedrijf" WHERE id = 'bedrijf' AND NOT deleted`).catch(() => ({ rows: [] })); const b = (r.rows[0] && r.rows[0].data) || {}; af = afzender(b.naam || t.salon.naam, b.mail); }

  if (req.method === "GET") {
    const { blobs } = await store.list(pre ? { prefix: pre } : {});
    const items = [];
    for (const b of blobs) {
      if (!pre && b.key.includes("/")) continue;
      const it = await store.get(b.key, { type: "json" });
      if (it) items.push({ id: it.id, sendAt: it.sendAt, afspraakAt: it.afspraakAt, to: it.to, status: it.status, sentAt: it.sentAt || null, error: it.error || null, tries: it.tries || 0 });
    }
    return json(200, { items });
  }
  if (req.method !== "POST") return json(405, { error: "alleen GET en POST" });

  const body = await req.json().catch(() => null);
  if (!body) return json(400, { error: "ongeldige gegevens" });
  const upsert = Array.isArray(body.upsert) ? body.upsert : [];
  const remove = Array.isArray(body.remove) ? body.remove : [];
  if (upsert.length > 50 || remove.length > 500) return json(413, { error: "te veel herinneringen in één keer" });

  let saved = 0, removed = 0;
  for (const it of upsert) {
    if (!it || !ID.test(String(it.id)) || !EMAIL.test(String(it.to || "").trim()) || !isFinite(it.sendAt) || !isFinite(it.afspraakAt)) continue;
    const html = String(it.html || ""), text = String(it.text || ""), subject = String(it.subject || "").slice(0, 200);
    if (!subject || html.length > 300000) continue;
    const prev = await store.get(sleutel(String(it.id)), { type: "json" });
    // al verstuurd voor dezelfde afspraaktijd: niet opnieuw versturen
    if (prev && prev.status === "verstuurd" && prev.afspraakAt === Number(it.afspraakAt)) continue;
    await store.setJSON(sleutel(String(it.id)), {
      id: String(it.id), sendAt: Number(it.sendAt), afspraakAt: Number(it.afspraakAt), to: String(it.to).trim(),
      subject, html, text, logo: typeof it.logo === "string" ? it.logo : null,
      status: "gepland", tries: 0, error: null, sentAt: null, updated: Date.now(), ...(af ? { from: af.from, replyTo: af.replyTo } : {}),
    });
    saved++;
  }
  for (const id of remove) {
    if (!ID.test(String(id))) continue;
    const prev = await store.get(sleutel(String(id)), { type: "json" });
    if (prev && prev.status !== "verstuurd") { await store.delete(sleutel(String(id))); removed++; }
  }
  return json(200, { ok: true, saved, removed });
};

export const config = { path: "/api/plan" };
