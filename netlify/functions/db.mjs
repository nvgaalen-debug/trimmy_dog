// Trimmy · koppelservice tussen de app en Aiven for MySQL
// Route:  GET  /api/db/<tabel>?code=…&since=<getal>   -> wijzigingen ophalen
//         POST /api/db/<tabel>?code=…                  -> { kassa, records:[{id,data,deleted}] } opslaan
// Omgevingsvariabelen (Netlify > Site configuration > Environment variables):
//   AIVEN_MYSQL_URI   Service URI uit de Aiven-console, bv. mysql://avnadmin:WACHTWOORD@naam-project.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
//   AIVEN_CA_CERT     Inhoud van het CA-certificaat (ca.pem) uit de Aiven-console
//   TRIMMY_CODE       Zelfgekozen geheime code; de app zet die als ?code=… in het adres
//   TRIMMY_ORIGIN     (optioneel) toegestane herkomst, bv. https://jouw-trimmy.netlify.app. Leeg = alles.
import mysql from "mysql2/promise";

const d = v => (v ? String(v).slice(0, 10) : null);                     // 'YYYY-MM-DD'
const s = (v, n = 200) => (v == null || v === "" ? null : String(v).slice(0, n));
const n = v => (v === "" || v == null || !isFinite(+v) ? null : +v);
const b = v => (v ? 1 : 0);
const dt = ms => (ms ? new Date(+ms).toISOString().slice(0, 19).replace("T", " ") : null);

// Per tabel: welke leesbare kolommen uit het record komen
const TABLES = {
  klanten: r => ({ naam: s(r.naam) || "", straat: s(r.straat), postcode: s(r.pc, 12), plaats: s(r.plaats, 120), telefoon: s(r.tel, 40), email: s(r.email), notitie: s(r.notitie, 65000) }),
  honden: r => ({ klant_id: s(r.klantId, 40), naam: s(r.naam, 120) || "", ras: s(r.ras, 120), geboortedatum: d(r.geb), geslacht: s(r.geslacht, 10), gecastreerd: r.gecast == null ? null : b(r.gecast), gewicht_kg: n(r.gewicht), vachttype: s(r.vacht, 40), kleur: s(r.kleur, 80), chipnummer: s(r.chip, 20), gedrag: s(r.gedrag, 65000), medisch: s(r.medisch, 65000), notitie: s(r.notitie, 65000), actief: r.inactief ? 0 : 1 }),
  artikelen: r => ({ naam: s(r.naam) || "", categorie: s(r.cat, 80), soort: r.type === "product" ? "product" : "dienst", prijs_incl: n(r.prijs) ?? 0, btw_pct: n(r.btw) ?? 21, duur_min: n(r.duur), voorraad: n(r.voorraad), artikelnummer: s(r.nr, 60), actief: b(r.actief) }),
  medewerkers: r => ({ naam: s(r.naam, 120) || "", kleur: s(r.kleur, 9) }),
  afspraken: r => ({ datum: d(r.datum), starttijd: s(r.start, 8), duur_min: n(r.duur), klant_id: s(r.klantId, 40), hond_id: s(r.hondId, 40), medewerker_id: s(r.mwId, 40), behandelingen: (r.diensten || []).join(","), status: s(r.status, 20), notitie: s(r.notitie, 65000), factuur_id: s(r.factuurId, 40) }),
  facturen: r => {
    const regels = r.regels || [], k = n(r.korting) || 0;
    const btw = regels.reduce((t, x) => { const inc = (+x.aantal * +x.prijs) * (1 - k / 100); return t + inc - inc / (1 + (+x.btw || 0) / 100); }, 0);
    return { nummer: s(r.nr, 30) || String(r.id), datum: dt(r.ts), klant_id: s(r.klantId, 40), hond_id: s(r.hondId, 40), afspraak_id: s(r.afspraakId, 40), subtotaal: n(r.sub), korting_pct: k, totaal: n(r.totaal), btw_bedrag: Math.round(btw * 100) / 100, betaald: n(r.betaald), openstaand: n(r.rest), vervaldatum: d(r.vervalt), medewerker: s(r.door, 120) };
  },
  behandelingen: r => ({ datum: d(r.datum), hond_id: s(r.hondId, 40), klant_id: s(r.klantId, 40), afspraak_id: s(r.afspraakId, 40), factuur_id: s(r.factuurId, 40), medewerker: s(r.mw, 120), behandelingen: s(r.diensten, 65000), mesje_techniek: s(r.mesje), vachtconditie: s(r.vacht, 40), gedrag: s(r.gedrag, 40), notitie: s(r.notitie, 65000) }),
  bedrijf: r => ({ naam: s(r.naam), kvk: s(r.kvk, 20), btw_nummer: s(r.btwnr, 30), iban: s(r.iban, 40) }),
};
const NO_DELETE = new Set(["facturen"]); // facturen worden nooit verwijderd (bewaarplicht)
const PAGE = 500;

let pool;
function getPool() {
  if (pool) return pool;
  const u = new URL(process.env.AIVEN_MYSQL_URI || "");
  pool = mysql.createPool({
    host: u.hostname, port: +u.port || 3306,
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "defaultdb",
    ssl: process.env.AIVEN_CA_CERT ? { ca: process.env.AIVEN_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false },
    connectionLimit: 3, waitForConnections: true, timezone: "Z", dateStrings: true,
  });
  return pool;
}

let lastStamp = 0;
const stamp = () => { const t = Date.now() * 1000; lastStamp = t > lastStamp ? t : lastStamp + 1; return lastStamp; };

const cors = req => {
  const allow = process.env.TRIMMY_ORIGIN || "*";
  return { "Access-Control-Allow-Origin": allow === "*" ? "*" : allow, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
};
const json = (req, status, body) => new Response(JSON.stringify(body), { status, headers: cors(req) });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  const url = new URL(req.url);
  if (!process.env.TRIMMY_CODE || url.searchParams.get("code") !== process.env.TRIMMY_CODE) return json(req, 401, { error: "onjuiste of ontbrekende code in het adres" });
  if (!process.env.AIVEN_MYSQL_URI) return json(req, 500, { error: "AIVEN_MYSQL_URI is niet ingesteld op Netlify" });
  const table = url.pathname.split("/").filter(Boolean).pop();
  const cols = TABLES[table];
  if (!cols) return json(req, 404, { error: `onbekende tabel '${table}'` });
  const db = getPool();

  try {
    if (req.method === "GET") {
      const since = Number(url.searchParams.get("since") || 0) || 0;
      const [rows] = await db.query(`SELECT id, data, deleted, updated_ms FROM \`${table}\` WHERE updated_ms > ? ORDER BY updated_ms LIMIT ?`, [since, PAGE]);
      const records = rows.map(r => ({ id: r.id, deleted: !!r.deleted, data: typeof r.data === "string" ? JSON.parse(r.data) : r.data }));
      const max = rows.length ? Number(rows[rows.length - 1].updated_ms) : since;
      return json(req, 200, { records, max, more: rows.length === PAGE });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || !Array.isArray(body.records)) return json(req, 400, { error: "verwacht { records: [...] }" });
      if (body.records.length > 200) return json(req, 413, { error: "maximaal 200 records per keer" });
      const kassa = s(body.kassa, 10);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        for (const rec of body.records) {
          const id = s(rec.id, 40);
          if (!id) continue;
          if (rec.deleted) {
            if (NO_DELETE.has(table)) continue;
            await conn.query(`UPDATE \`${table}\` SET deleted = 1, updated_ms = ?, kassa = ? WHERE id = ?`, [stamp(), kassa, id]);
            continue;
          }
          const data = rec.data && typeof rec.data === "object" ? rec.data : {};
          const row = { id, ...cols(data), data: JSON.stringify(data), updated_ms: stamp(), deleted: 0, kassa };
          const keys = Object.keys(row);
          await conn.query(
            `INSERT INTO \`${table}\` (${keys.map(k => "`" + k + "`").join(",")}) VALUES (${keys.map(() => "?").join(",")})
             ON DUPLICATE KEY UPDATE ${keys.filter(k => k !== "id").map(k => "`" + k + "` = VALUES(`" + k + "`)").join(", ")}`,
            keys.map(k => row[k]));

          if (table === "facturen") {
            await conn.query("DELETE FROM factuurregels WHERE factuur_id = ?", [id]);
            await conn.query("DELETE FROM betalingen WHERE factuur_id = ?", [id]);
            const regels = Array.isArray(data.regels) ? data.regels : [];
            if (regels.length) await conn.query(
              "INSERT INTO factuurregels (factuur_id, regelnr, artikel_id, omschrijving, soort, aantal, prijs_incl, btw_pct, totaal_incl) VALUES ?",
              [regels.map((r, i) => [id, i + 1, s(r.artId, 40), s(r.naam), s(r.type, 10), n(r.aantal), n(r.prijs), n(r.btw), n(r.totaal)])]);
            const bet = Array.isArray(data.betalingen) ? data.betalingen : [];
            if (bet.length) await conn.query(
              "INSERT INTO betalingen (factuur_id, tijdstip, methode, bedrag) VALUES ?",
              [bet.map(p => [id, dt(p.ts), s(p.methode, 20), n(p.bedrag)])]);
          }
        }
        await conn.commit();
      } catch (e) { await conn.rollback(); throw e; }
      finally { conn.release(); }
      return json(req, 200, { ok: true, saved: body.records.length });
    }
    return json(req, 405, { error: "alleen GET en POST" });
  } catch (e) {
    console.error(table, e);
    const msg = e.code === "ER_NO_SUCH_TABLE" ? `tabel '${table}' bestaat niet; voer database/schema.sql uit in Aiven`
      : e.code === "ER_DUP_ENTRY" ? "factuurnummer bestaat al; geef elk apparaat een eigen Kassa-ID"
      : "databasefout: " + (e.code || e.message);
    return json(req, 500, { error: msg });
  }
};

export const config = { path: "/api/db/*" };
