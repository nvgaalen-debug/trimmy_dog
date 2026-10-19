// Trimmy · abonnement van een salon via Mollie
//   GET  /api/abonnement            -> status van het abonnement (eigenaar)
//   POST /api/abonnement/start      -> eerste betaling (legt de machtiging vast); antwoord { checkoutUrl }
//   POST /api/abonnement/opzeggen   -> automatische incasso stoppen; toegang loopt door tot de betaalde datum
//   POST /api/mollie                -> webhook van Mollie (form: id=tr_…); de status wordt altijd bij Mollie zelf opgevraagd
// Omgevingsvariabelen: MOLLIE_API_KEY, en APP_URL zodra je een eigen domein gebruikt.
import { getPool } from "./db.mjs";
import { P, ensurePlatform, cookieVan, sha, salonInfo } from "../lib/platform.mjs";
import { mollie, mollieAan, bedrag, plusMaand } from "../lib/mollie.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const appUrl = url => (process.env.APP_URL || url.origin).replace(/\/+$/, "");
const vandaag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const dag = v => v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null;
const PLATFORM_NAAM = () => process.env.PLATFORM_NAAM || "Trimmy";

/* webhook: één betaling verwerken (idempotent) */
export async function verwerkBetaling(db, url, id) {
  if (!/^tr_[A-Za-z0-9]{4,40}$/.test(id)) return "ongeldig";
  const p = await mollie(`/payments/${id}`);
  const salonId = p.metadata && p.metadata.salon;
  const s = salonId && (await db.query(`SELECT * FROM ${P("salons")} WHERE id = $1`, [salonId])).rows[0];
  if (!s) return "onbekende salon";
  const soort = p.sequenceType === "first" ? "eerste" : p.subscriptionId ? "maand" : "los";
  const oud = (await db.query(`SELECT * FROM ${P("betalingen")} WHERE id = $1`, [id])).rows[0];
  await db.query(`INSERT INTO ${P("betalingen")} (id, salon_id, soort, status, bedrag, betaald_op) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, betaald_op = EXCLUDED.betaald_op, bijgewerkt = now()`,
    [id, s.id, soort, p.status, +(p.amount && p.amount.value) || 0, p.paidAt || null]);
  if (oud && oud.verwerkt) return "al verwerkt";
  if (p.status === "paid") {
    const basis = [dag(s.betaald_tot), vandaag()].filter(Boolean).sort().pop();   // de laatste van "betaald tot" en vandaag
    const tot = plusMaand(basis, 1);
    let abo = s.mollie_abonnement;
    if (soort === "eerste" && !abo && p.customerId) {
      const sub = await mollie(`/customers/${p.customerId}/subscriptions`, "POST", {
        amount: bedrag(s.prijs), interval: "1 month", startDate: tot, description: `${PLATFORM_NAAM()} abonnement ${s.naam}`.slice(0, 100),
        webhookUrl: `${appUrl(url)}/api/mollie`, metadata: { salon: s.id } });
      abo = sub.id;
    }
    await db.query(`UPDATE ${P("salons")} SET status = 'actief', betaald_tot = $1, betaalstatus = 'ok', mollie_abonnement = $2, mollie_klant = COALESCE(mollie_klant, $3) WHERE id = $4`, [tot, abo, p.customerId || null, s.id]);
    await db.query(`UPDATE ${P("betalingen")} SET verwerkt = true WHERE id = $1`, [id]);
    return "betaald";
  }
  if (["failed", "expired", "canceled"].includes(p.status)) {
    if (soort === "maand") await db.query(`UPDATE ${P("salons")} SET betaalstatus = 'mislukt' WHERE id = $1`, [s.id]);
    await db.query(`UPDATE ${P("betalingen")} SET verwerkt = true WHERE id = $1`, [id]);
    return "mislukt";
  }
  return p.status;   // open/pending: Mollie roept de webhook later opnieuw aan
}

export default async (req) => {
  const url = new URL(req.url), pad = url.pathname.replace(/\/+$/, "");
  let db;
  try { db = getPool(); await ensurePlatform(db); } catch (e) { console.error("abonnement", e); return json(503, { error: "Even niet beschikbaar." }); }

  /* ---------- webhook van Mollie ---------- */
  if (pad === "/api/mollie") {
    if (req.method !== "POST") return json(405, { error: "alleen POST" });
    if (!mollieAan()) return json(503, { error: "Mollie niet ingesteld" });
    const id = new URLSearchParams(await req.text()).get("id") || "";
    try { const r = await verwerkBetaling(db, url, id); console.log("mollie webhook", id, r); return new Response("ok"); }
    catch (e) { console.error("mollie webhook", id, e && e.message); return new Response("fout", { status: 500 }); }   // Mollie probeert het later opnieuw
  }

  /* ---------- eigenaar van een salon ---------- */
  if (req.method === "POST" && (req.headers.get("x-trimmy-app") !== "1" || !/application\/json/i.test(req.headers.get("content-type") || ""))) return json(403, { error: "ongeldig verzoek" });
  const tok = cookieVan(req, "tr_app");
  const a = tok && (await db.query(`SELECT a.salon_id, a.support, g.rol, g.email, g.naam FROM ${P("apparaten")} a LEFT JOIN ${P("gebruikers")} g ON g.id = a.gebruiker_id WHERE a.token_hash = $1 AND a.verloopt > now()`, [sha("app", tok)])).rows[0];
  if (!a) return json(401, { error: "Log eerst in.", login: true });
  if (a.support || (a.rol || "eigenaar") !== "eigenaar") return json(403, { error: "Alleen de eigenaar van de salon regelt het abonnement." });
  const s = (await db.query(`SELECT * FROM ${P("salons")} WHERE id = $1`, [a.salon_id])).rows[0];
  if (!s) return json(404, { error: "Onbekende salon." });
  const actie = pad.split("/").pop();
  try {
    if (req.method === "GET") {
      const bet = (await db.query(`SELECT id, soort, status, bedrag, betaald_op, bijgewerkt FROM ${P("betalingen")} WHERE salon_id = $1 ORDER BY bijgewerkt DESC LIMIT 12`, [s.id])).rows;
      return json(200, { ok: true, mollie: mollieAan(), salon: salonInfo(s), betalingen: bet.map(b => ({ soort: b.soort, status: b.status, bedrag: +b.bedrag, datum: b.betaald_op || b.bijgewerkt })) });
    }
    if (!mollieAan()) return json(503, { error: "Online betalen is nog niet ingesteld. Neem contact op met de leverancier." });
    if (actie === "start" && req.method === "POST") {
      let klant = s.mollie_klant;
      if (!klant) { const k = await mollie("/customers", "POST", { name: s.naam.slice(0, 100), email: a.email, metadata: { salon: s.id } }); klant = k.id; await db.query(`UPDATE ${P("salons")} SET mollie_klant = $1 WHERE id = $2`, [klant, s.id]); }
      if (s.mollie_abonnement) {   // bestaand abonnement (bv. nieuwe bankrekening): oude stoppen, nieuwe start na de eerste betaling
        await mollie(`/customers/${klant}/subscriptions/${s.mollie_abonnement}`, "DELETE").catch(() => {});
        await db.query(`UPDATE ${P("salons")} SET mollie_abonnement = NULL WHERE id = $1`, [s.id]);
      }
      const p = await mollie("/payments", "POST", {
        amount: bedrag(s.prijs), customerId: klant, sequenceType: "first",
        description: `${PLATFORM_NAAM()} abonnement ${s.naam} (eerste maand)`.slice(0, 100),
        redirectUrl: `${appUrl(url)}/?abonnement=terug`, webhookUrl: `${appUrl(url)}/api/mollie`, metadata: { salon: s.id } });
      await db.query(`INSERT INTO ${P("betalingen")} (id, salon_id, soort, status, bedrag) VALUES ($1, $2, 'eerste', $3, $4) ON CONFLICT (id) DO NOTHING`, [p.id, s.id, p.status, +s.prijs]);
      return json(200, { ok: true, checkoutUrl: p._links && p._links.checkout && p._links.checkout.href });
    }
    if (actie === "opzeggen" && req.method === "POST") {
      if (s.mollie_klant && s.mollie_abonnement) await mollie(`/customers/${s.mollie_klant}/subscriptions/${s.mollie_abonnement}`, "DELETE");
      await db.query(`UPDATE ${P("salons")} SET mollie_abonnement = NULL WHERE id = $1`, [s.id]);
      return json(200, { ok: true, totEnMet: dag(s.betaald_tot) });
    }
    return json(404, { error: "onbekend" });
  } catch (e) {
    console.error("abonnement /" + actie, e && e.message);
    return json(502, { error: "Mollie: " + (e && e.message || "onbekende fout") });
  }
};

export const config = { path: ["/api/abonnement", "/api/abonnement/*", "/api/mollie"] };
