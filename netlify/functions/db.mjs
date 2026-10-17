// Trimmy · koppelservice tussen de app en PostgreSQL (Aiven), in een eigen schema
// Route:  GET  /api/db/<tabel>?code=…&since=<versie>   -> wijzigingen ophalen
//         POST /api/db/<tabel>?code=…                   -> { kassa, records:[{id,data,deleted}] } opslaan
//         GET  /api/db/status?code=…                    -> verbinding en schema controleren
// Omgevingsvariabelen (Netlify > Project configuration > Environment variables):
//   DATABASE_URL   postgres://trimmy_app:WACHTWOORD@host:poort/defaultdb?sslmode=require  (eigen gebruiker voor Trimmy)
//   AIVEN_CA_CERT  (aanbevolen) inhoud van het CA-certificaat (ca.pem) uit de Aiven-console
//   DB_SCHEMA      (optioneel) naam van het schema, standaard "trimmy"
//   TRIMMY_CODE    geheime code; de app zet die als ?code=… in het adres
//   TRIMMY_ORIGIN  (optioneel) toegestane herkomst, bv. https://trimmydog.netlify.app
// De tabellen worden bij de eerste verbinding automatisch aangemaakt in het schema.
import pg from "pg";

const SCHEMA = /^[a-z_][a-z0-9_]{0,40}$/.test(process.env.DB_SCHEMA || "") ? process.env.DB_SCHEMA : "trimmy";
const Q = n => `"${SCHEMA}"."${n}"`;
const SEQ = `"${SCHEMA}"."sync_versie"`;

const d = v => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);          // datum
const tm = v => (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : null);            // tijd
const s = (v, max = 200) => (v == null || v === "" ? null : String(v).slice(0, max));
const n = v => (v === "" || v == null || !isFinite(+v) ? null : +v);
const ts = ms => (ms && isFinite(+ms) ? new Date(+ms).toISOString() : null);

// Per tabel: kolomdefinitie (DDL) en hoe een record uit de app naar kolommen gaat
const TABLES = {
  klanten: {
    ddl: [["naam", "VARCHAR(200) NOT NULL DEFAULT ''"], ["straat", "VARCHAR(200)"], ["postcode", "VARCHAR(12)"], ["plaats", "VARCHAR(120)"], ["telefoon", "VARCHAR(40)"], ["email", "VARCHAR(200)"], ["notitie", "TEXT"]],
    map: r => ({ naam: s(r.naam) || "", straat: s(r.straat), postcode: s(r.pc, 12), plaats: s(r.plaats, 120), telefoon: s(r.tel, 40), email: s(r.email), notitie: s(r.notitie, 65000) }),
    idx: ["naam"],
  },
  honden: {
    ddl: [["klant_id", "VARCHAR(40)"], ["naam", "VARCHAR(120) NOT NULL DEFAULT ''"], ["ras", "VARCHAR(120)"], ["geboortedatum", "DATE"], ["geslacht", "VARCHAR(10)"], ["gecastreerd", "BOOLEAN"], ["gewicht_kg", "NUMERIC(6,2)"], ["vachttype", "VARCHAR(40)"], ["kleur", "VARCHAR(80)"], ["chipnummer", "VARCHAR(20)"], ["gedrag", "TEXT"], ["medisch", "TEXT"], ["notitie", "TEXT"], ["actief", "BOOLEAN NOT NULL DEFAULT true"]],
    map: r => ({ klant_id: s(r.klantId, 40), naam: s(r.naam, 120) || "", ras: s(r.ras, 120), geboortedatum: d(r.geb), geslacht: s(r.geslacht, 10), gecastreerd: r.gecast == null ? null : !!r.gecast, gewicht_kg: n(r.gewicht), vachttype: s(r.vacht, 40), kleur: s(r.kleur, 80), chipnummer: s(r.chip, 20), gedrag: s(r.gedrag, 65000), medisch: s(r.medisch, 65000), notitie: s(r.notitie, 65000), actief: !r.inactief }),
    idx: ["klant_id", "chipnummer"],
  },
  artikelen: {
    ddl: [["naam", "VARCHAR(200) NOT NULL DEFAULT ''"], ["categorie", "VARCHAR(80)"], ["soort", "VARCHAR(10) NOT NULL DEFAULT 'dienst'"], ["prijs_incl", "NUMERIC(10,2) NOT NULL DEFAULT 0"], ["btw_pct", "NUMERIC(4,1) NOT NULL DEFAULT 21"], ["duur_min", "INTEGER"], ["voorraad", "INTEGER"], ["artikelnummer", "VARCHAR(60)"], ["actief", "BOOLEAN NOT NULL DEFAULT true"]],
    map: r => ({ naam: s(r.naam) || "", categorie: s(r.cat, 80), soort: r.type === "product" ? "product" : "dienst", prijs_incl: n(r.prijs) ?? 0, btw_pct: n(r.btw) ?? 21, duur_min: n(r.duur) == null ? null : Math.round(n(r.duur)), voorraad: n(r.voorraad) == null ? null : Math.round(n(r.voorraad)), artikelnummer: s(r.nr, 60), actief: !!r.actief }),
    idx: [],
  },
  medewerkers: {
    ddl: [["naam", "VARCHAR(120) NOT NULL DEFAULT ''"], ["kleur", "VARCHAR(9)"], ["rol", "VARCHAR(20)"]],
    map: r => ({ naam: s(r.naam, 120) || "", kleur: s(r.kleur, 9), rol: s(r.rol, 20) }),
    idx: [],
  },
  afspraken: {
    ddl: [["datum", "DATE"], ["starttijd", "TIME"], ["duur_min", "INTEGER"], ["klant_id", "VARCHAR(40)"], ["hond_id", "VARCHAR(40)"], ["medewerker_id", "VARCHAR(40)"], ["behandelingen", "TEXT"], ["status", "VARCHAR(20)"], ["notitie", "TEXT"], ["factuur_id", "VARCHAR(40)"]],
    map: r => ({ datum: d(r.datum), starttijd: tm(r.start), duur_min: n(r.duur) == null ? null : Math.round(n(r.duur)), klant_id: s(r.klantId, 40), hond_id: s(r.hondId, 40), medewerker_id: s(r.mwId, 40), behandelingen: Array.isArray(r.diensten) ? r.diensten.join(",") : null, status: s(r.status, 20), notitie: s(r.notitie, 65000), factuur_id: s(r.factuurId, 40) }),
    idx: ["datum", "hond_id"],
  },
  facturen: {
    ddl: [["nummer", "VARCHAR(30) NOT NULL"], ["datum", "TIMESTAMPTZ"], ["klant_id", "VARCHAR(40)"], ["hond_id", "VARCHAR(40)"], ["afspraak_id", "VARCHAR(40)"], ["subtotaal", "NUMERIC(10,2)"], ["korting_pct", "NUMERIC(5,2)"], ["totaal", "NUMERIC(10,2)"], ["btw_bedrag", "NUMERIC(10,2)"], ["betaald", "NUMERIC(10,2)"], ["openstaand", "NUMERIC(10,2)"], ["vervaldatum", "DATE"], ["medewerker", "VARCHAR(120)"]],
    map: r => {
      const regels = Array.isArray(r.regels) ? r.regels : [], k = n(r.korting) || 0;
      const btw = regels.reduce((t, x) => { const inc = (+x.aantal * +x.prijs) * (1 - k / 100); return t + inc - inc / (1 + (+x.btw || 0) / 100); }, 0);
      return { nummer: s(r.nr, 30) || String(r.id), datum: ts(r.ts), klant_id: s(r.klantId, 40), hond_id: s(r.hondId, 40), afspraak_id: s(r.afspraakId, 40), subtotaal: n(r.sub), korting_pct: k, totaal: n(r.totaal), btw_bedrag: Math.round(btw * 100) / 100, betaald: n(r.betaald), openstaand: n(r.rest), vervaldatum: d(r.vervalt), medewerker: s(r.door, 120) };
    },
    idx: ["klant_id", "datum"], uniek: ["nummer"],
  },
  behandelingen: {
    ddl: [["datum", "DATE"], ["hond_id", "VARCHAR(40)"], ["klant_id", "VARCHAR(40)"], ["afspraak_id", "VARCHAR(40)"], ["factuur_id", "VARCHAR(40)"], ["medewerker", "VARCHAR(120)"], ["behandelingen", "TEXT"], ["mesje_techniek", "VARCHAR(200)"], ["vachtconditie", "VARCHAR(40)"], ["gedrag", "VARCHAR(40)"], ["notitie", "TEXT"]],
    map: r => ({ datum: d(r.datum), hond_id: s(r.hondId, 40), klant_id: s(r.klantId, 40), afspraak_id: s(r.afspraakId, 40), factuur_id: s(r.factuurId, 40), medewerker: s(r.mw, 120), behandelingen: s(r.diensten, 65000), mesje_techniek: s(r.mesje), vachtconditie: s(r.vacht, 40), gedrag: s(r.gedrag, 40), notitie: s(r.notitie, 65000) }),
    idx: ["hond_id"],
  },
  bedrijf: {
    ddl: [["naam", "VARCHAR(200)"], ["kvk", "VARCHAR(20)"], ["btw_nummer", "VARCHAR(30)"], ["iban", "VARCHAR(40)"]],
    map: r => ({ naam: s(r.naam), kvk: s(r.kvk, 20), btw_nummer: s(r.btwnr, 30), iban: s(r.iban, 40) }),
    idx: [],
  },
};
const NO_DELETE = new Set(["facturen"]);   // facturen worden nooit verwijderd (bewaarplicht)
const PAGE = 500;

// ---------- schema ----------
export function schemaSql() {
  const out = [`CREATE SEQUENCE IF NOT EXISTS ${SEQ}`];
  for (const [t, def] of Object.entries(TABLES)) {
    const cols = def.ddl.map(([c, ty]) => `"${c}" ${ty}`).join(", ");
    out.push(`CREATE TABLE IF NOT EXISTS ${Q(t)} (id VARCHAR(40) PRIMARY KEY, ${cols}, data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now())`);
    out.push(`CREATE INDEX IF NOT EXISTS "${t}_versie" ON ${Q(t)} (versie)`);
    for (const c of def.idx) out.push(`CREATE INDEX IF NOT EXISTS "${t}_${c}" ON ${Q(t)} ("${c}")`);
    for (const c of def.uniek || []) out.push(`CREATE UNIQUE INDEX IF NOT EXISTS "${t}_${c}_uniek" ON ${Q(t)} ("${c}")`);
  }
  out.push(`CREATE TABLE IF NOT EXISTS ${Q("factuurregels")} (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, factuur_id VARCHAR(40) NOT NULL, regelnr INTEGER NOT NULL, artikel_id VARCHAR(40), omschrijving VARCHAR(200), soort VARCHAR(10), vrij BOOLEAN NOT NULL DEFAULT false, aantal NUMERIC(10,2), prijs_incl NUMERIC(10,2), btw_pct NUMERIC(4,1), totaal_incl NUMERIC(10,2))`);
  out.push(`CREATE INDEX IF NOT EXISTS "factuurregels_factuur" ON ${Q("factuurregels")} (factuur_id)`);
  out.push(`CREATE TABLE IF NOT EXISTS ${Q("betalingen")} (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, factuur_id VARCHAR(40) NOT NULL, tijdstip TIMESTAMPTZ, methode VARCHAR(20), bedrag NUMERIC(10,2))`);
  out.push(`CREATE INDEX IF NOT EXISTS "betalingen_factuur" ON ${Q("betalingen")} (factuur_id)`);
  out.push(`CREATE OR REPLACE VIEW ${Q("v_omzet_per_dag")} AS SELECT (b.tijdstip AT TIME ZONE 'Europe/Amsterdam')::date AS dag, b.methode, SUM(b.bedrag) AS ontvangen, COUNT(*) AS aantal FROM ${Q("betalingen")} b JOIN ${Q("facturen")} f ON f.id = b.factuur_id AND NOT f.deleted GROUP BY 1, 2`);
  out.push(`CREATE OR REPLACE VIEW ${Q("v_hond_historie")} AS SELECT h.naam AS hond, h.ras, k.naam AS klant, bh.datum, bh.behandelingen, bh.mesje_techniek, bh.vachtconditie, bh.gedrag, bh.medewerker, bh.notitie FROM ${Q("behandelingen")} bh JOIN ${Q("honden")} h ON h.id = bh.hond_id LEFT JOIN ${Q("klanten")} k ON k.id = h.klant_id WHERE NOT bh.deleted`);
  out.push(`CREATE OR REPLACE VIEW ${Q("v_openstaande_facturen")} AS SELECT f.nummer, f.datum, f.vervaldatum, k.naam AS klant, k.email, f.totaal, f.openstaand FROM ${Q("facturen")} f LEFT JOIN ${Q("klanten")} k ON k.id = f.klant_id WHERE NOT f.deleted AND f.openstaand > 0`);
  return out;
}

let pool, ready = false;
function getPool() {
  if (pool) return pool;
  const raw = process.env.DATABASE_URL;
  if (!raw) throw Object.assign(new Error("DATABASE_URL is niet ingesteld op Netlify"), { code: "NOURL" });
  // sslmode uit het adres halen: de ssl-instelling hieronder bepaalt het (anders negeert pg het certificaat)
  const u = new URL(raw); ["sslmode", "ssl", "sslrootcert"].forEach(k => u.searchParams.delete(k));
  const ca = process.env.AIVEN_CA_CERT;
  pool = new pg.Pool({
    connectionString: u.toString(),
    ssl: ca ? { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000,
  });
  return pool;
}
async function ensureSchema(db) {
  if (ready) return;
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["trimmy-schema:" + SCHEMA]);
    const ex = await c.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [SCHEMA]);
    if (!ex.rowCount) await c.query(`CREATE SCHEMA "${SCHEMA}"`);
    for (const sql of schemaSql()) await c.query(sql);
    await c.query("COMMIT");
    ready = true;
  } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
  finally { c.release(); }
}

const cors = { "Access-Control-Allow-Origin": process.env.TRIMMY_ORIGIN || "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: cors });

function foutmelding(e, table) {
  const c = e && e.code;
  if (c === "NOURL") return e.message;
  if (c === "28P01") return "de database weigert de inlog; controleer gebruiker en wachtwoord in DATABASE_URL";
  if (c === "42501") return `de databasegebruiker heeft geen rechten op schema '${SCHEMA}'; zie de LEESMIJ (stap Database)`;
  if (c === "3D000") return "de database in DATABASE_URL bestaat niet";
  if (c === "23505") return "factuurnummer bestaat al; geef elk apparaat een eigen Kassa-ID";
  if (c === "ENOTFOUND" || c === "ECONNREFUSED" || c === "ETIMEDOUT") return "de database is niet bereikbaar; controleer het adres in DATABASE_URL en of de Aiven-service aan staat";
  if (/self[- ]signed|certificate/i.test(e && e.message)) return "het certificaat van de database wordt niet vertrouwd; controleer AIVEN_CA_CERT";
  return "databasefout" + (table ? ` (${table})` : "") + ": " + (c || (e && e.message) || "onbekend");
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  if (!process.env.TRIMMY_CODE || url.searchParams.get("code") !== process.env.TRIMMY_CODE) return json(401, { error: "onjuiste of ontbrekende code in het adres" });
  const table = url.pathname.split("/").filter(Boolean).pop();

  let db;
  try { db = getPool(); await ensureSchema(db); }
  catch (e) { console.error("schema", e); return json(500, { error: foutmelding(e) }); }

  if (table === "status") {
    const r = await db.query("SELECT current_user AS gebruiker, current_database() AS database").catch(() => ({ rows: [{}] }));
    return json(200, { ok: true, schema: SCHEMA, ...r.rows[0], tabellen: Object.keys(TABLES) });
  }
  const def = TABLES[table];
  if (!def) return json(404, { error: `onbekende tabel '${table}'` });

  try {
    if (req.method === "GET") {
      const since = Math.max(0, Math.floor(Number(url.searchParams.get("since") || 0) || 0));
      const { rows } = await db.query(`SELECT id, data, deleted, versie FROM ${Q(table)} WHERE versie > $1 ORDER BY versie LIMIT $2`, [since, PAGE]);
      const records = rows.map(r => ({ id: r.id, deleted: !!r.deleted, data: r.data }));
      const max = rows.length ? Number(rows[rows.length - 1].versie) : since;
      return json(200, { records, max, more: rows.length === PAGE });
    }
    if (req.method !== "POST") return json(405, { error: "alleen GET en POST" });

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.records)) return json(400, { error: "verwacht { records: [...] }" });
    if (body.records.length > 200) return json(413, { error: "maximaal 200 records per keer" });
    const kassa = s(body.kassa, 10);
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      for (const rec of body.records) {
        const id = s(rec && rec.id, 40);
        if (!id) continue;
        if (rec.deleted) {
          if (NO_DELETE.has(table)) continue;
          await c.query(`UPDATE ${Q(table)} SET deleted = true, versie = nextval('${SEQ}'), kassa = $2, bijgewerkt = now() WHERE id = $1`, [id, kassa]);
          continue;
        }
        const data = rec.data && typeof rec.data === "object" ? rec.data : {};
        const row = { id, ...def.map(data) };
        const keys = Object.keys(row), vals = keys.map(k => row[k]);
        vals.push(JSON.stringify(data), kassa);
        const ph = keys.map((_, i) => `$${i + 1}`);
        const di = keys.length + 1, ki = keys.length + 2;
        const set = keys.filter(k => k !== "id").map(k => `"${k}" = EXCLUDED."${k}"`).concat(["data = EXCLUDED.data", "versie = EXCLUDED.versie", "deleted = false", "kassa = EXCLUDED.kassa", "bijgewerkt = now()"]);
        await c.query(
          `INSERT INTO ${Q(table)} (${keys.map(k => `"${k}"`).join(", ")}, data, versie, deleted, kassa) VALUES (${ph.join(", ")}, $${di}::jsonb, nextval('${SEQ}'), false, $${ki}) ON CONFLICT (id) DO UPDATE SET ${set.join(", ")}`,
          vals);

        if (table === "facturen") {
          await c.query(`DELETE FROM ${Q("factuurregels")} WHERE factuur_id = $1`, [id]);
          await c.query(`DELETE FROM ${Q("betalingen")} WHERE factuur_id = $1`, [id]);
          const regels = Array.isArray(data.regels) ? data.regels : [];
          for (let i = 0; i < regels.length; i++) {
            const r = regels[i] || {};
            await c.query(`INSERT INTO ${Q("factuurregels")} (factuur_id, regelnr, artikel_id, omschrijving, soort, vrij, aantal, prijs_incl, btw_pct, totaal_incl) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [id, i + 1, s(r.artId, 40), s(r.naam), s(r.type, 10), !!(r.vrij || !r.artId), n(r.aantal), n(r.prijs), n(r.btw), n(r.totaal)]);
          }
          const bet = Array.isArray(data.betalingen) ? data.betalingen : [];
          for (const p of bet) await c.query(`INSERT INTO ${Q("betalingen")} (factuur_id, tijdstip, methode, bedrag) VALUES ($1,$2,$3,$4)`, [id, ts(p && p.ts), s(p && p.methode, 20), n(p && p.bedrag)]);
        }
      }
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
    finally { c.release(); }
    return json(200, { ok: true, saved: body.records.length });
  } catch (e) {
    console.error(table, e);
    return json(500, { error: foutmelding(e, table) });
  }
};

export const config = { path: "/api/db/*" };
