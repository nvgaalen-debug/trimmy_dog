// Trimmy · beschikbaarheid voor online boeken
// Rekent uit welke begintijden een klant mag kiezen. De klant kiest nooit zelf een gat in de agenda:
// de salon bepaalt met regels welke tijden zichtbaar zijn.
//
//   tijden(ctx, datum, { diensten, mwId }) -> [{ start: "HH:MM", mwId }]
//   dagen(ctx, van, n, { diensten, mwId }) -> [{ datum, aantal }]
//
// ctx = { salon (bedrijf-record), medewerkers, afspraken (alle niet-verwijderde in de periode), blokkades, artikelen, nu: { datum, min } }
// Tijden zijn minuten sinds middernacht (lokale tijd van de salon).

const DOOD = ["geannuleerd", "noshow"];
export const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "")); return m ? +m[1] * 60 + +m[2] : null; };
export const toHM = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const ymd = d => d.toISOString().slice(0, 10);
const dag = s => new Date(s + "T12:00:00Z");
const weekdag = s => dag(s).getUTCDay();
export const plusDagen = (s, n) => { const d = dag(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

/* standaardinstellingen voor online boeken; wat de salon instelt gaat voor */
export const ONLINE0 = { aan: false, wijze: "direct", nieuweKlant: "aanvraag", nieuwDier: "aanvraag", planning: "slim", interval: 15, minUur: 2, maxDag: 60, annuleerUur: 24, kiesMw: true, geenVoorkeur: true, buffer: 0, tekst: "" };
export function online(salon) {
  const o = { ...ONLINE0, ...((salon && typeof salon.online === "object" && salon.online) || {}) };
  o.interval = [5, 10, 15, 20, 30, 60].includes(+o.interval) ? +o.interval : 15;
  o.minUur = Math.max(0, Math.min(24 * 14, +o.minUur || 0));
  o.maxDag = Math.max(1, Math.min(365, +o.maxDag || 60));
  o.annuleerUur = Math.max(-1, Math.min(24 * 14, o.annuleerUur === "" || o.annuleerUur == null ? 24 : +o.annuleerUur));
  o.buffer = Math.max(0, Math.min(120, +o.buffer || 0));
  if (!["vrij", "slim", "strak"].includes(o.planning)) o.planning = "slim";
  if (!["direct", "aanvraag"].includes(o.wijze)) o.wijze = "direct";
  if (!["direct", "aanvraag", "nee"].includes(o.nieuweKlant)) o.nieuweKlant = "aanvraag";
  if (!["direct", "aanvraag"].includes(o.nieuwDier)) o.nieuwDier = "aanvraag";
  return o;
}

/* behandelingen die online te boeken zijn */
export const onlineDiensten = artikelen => (artikelen || []).filter(a => a && a.type === "dienst" && a.actief !== false && a.online !== false && +a.duur > 0);

/* werktijd van een medewerker op een dag: [begin, eind] of null (vrij); zonder rooster de openingstijden van de salon */
function salonTijd(salon) { const o = (+salon.open || 8) * 60; return [o, Math.max(o + 60, (+salon.sluit || 18) * 60)]; }
export function werkTijd(salon, m, datum) {
  const wd = weekdag(datum);
  if (m && m.rooster && typeof m.rooster === "object") { const r = m.rooster[wd]; return Array.isArray(r) && +r[1] > +r[0] ? [+r[0], +r[1]] : null; }
  if (wd === 0 && !salon.zondag) return null;
  return salonTijd(salon);
}

/* geldt een blokkade op deze dag (en voor deze medewerker)? geeft [begin, eind] of null */
export function blokOp(b, datum, mwId) {
  if (!b || b.deleted) return null;
  if (b.mwId && b.mwId !== mwId) return null;
  const van = b.van || b.datum, tot = b.tot || "";
  if (!van || datum < van) return null;
  if (b.herhaal === "week") { if ((tot && datum > tot) || weekdag(datum) !== weekdag(van)) return null; }
  else if (b.herhaal === "dag") { if (tot && datum > tot) return null; }
  else if (datum > (tot || van)) return null;
  const s = toMin(b.start), e = toMin(b.eind);
  return s != null && e != null && e > s ? [s, e] : [0, 24 * 60];
}

/* bezette tijd van één medewerker op een dag, samengevoegd */
/* mwId leeg = salon zonder medewerkers: dan telt elke afspraak */
function bezet(ctx, datum, mwId) {
  const L = [];
  for (const a of ctx.afspraken || []) {
    if (!a || a.datum !== datum || DOOD.includes(a.status)) continue;
    if (mwId && a.mwId !== mwId) continue;
    const s = toMin(a.start); if (s == null) continue;
    L.push([s, s + (+a.duur || 30) + (+a.buffer || 0)]);
  }
  for (const b of ctx.blokkades || []) { const r = blokOp(b, datum, mwId); if (r) L.push(r); }
  L.sort((x, y) => x[0] - y[0]);
  const uit = [];
  for (const r of L) { const l = uit[uit.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else uit.push([...r]); }
  return uit;
}
function gaten(venster, bz) {
  const uit = []; let t = venster[0];
  for (const [s, e] of bz) { if (e <= t) continue; if (s >= venster[1]) break; if (s > t) uit.push([t, Math.min(s, venster[1])]); t = Math.max(t, e); }
  if (t < venster[1]) uit.push([t, venster[1]]);
  return uit;
}

/* wat de gekozen behandelingen samen vragen */
export function vraag(ctx, ids) {
  const alle = onlineDiensten(ctx.artikelen), o = online(ctx.salon);
  const ds = (ids || []).map(id => alle.find(a => a.id === id)).filter(Boolean);
  if (!ds.length) return null;
  const duur = ds.reduce((s, a) => s + Math.round(+a.duur || 0), 0);
  const buffer = Math.max(o.buffer, ...ds.map(a => Math.max(0, Math.min(120, +a.buffer || 0))));
  /* wie mag alle gekozen behandelingen doen? een lege lijst betekent: iedereen */
  const mws = (ctx.medewerkers || []).filter(m => m && !m.inactief && ds.every(a => !Array.isArray(a.mw) || !a.mw.length || a.mw.includes(m.id)));
  /* kleinste blok dat online nog te boeken valt: kleinere restgaten zijn verloren tijd */
  const minBlok = Math.min(...alle.map(a => Math.round(+a.duur || 0) + Math.max(o.buffer, Math.max(0, +a.buffer || 0))));
  return { ds, duur, buffer, blok: duur + buffer, mws, minBlok: isFinite(minBlok) ? minBlok : 30 };
}

/* begintijden voor één medewerker (of de hele salon zonder medewerkers) op een dag */
function voorMw(ctx, datum, v, m, o) {
  const venster = werkTijd(ctx.salon, m, datum); if (!venster) return [];
  const bz = bezet(ctx, datum, m ? m.id : "");
  const I = o.interval, uit = [];
  for (const [g0, g1] of gaten(venster, bz)) {
    if (g1 - g0 < v.blok) continue;
    const kand = new Set();
    if (o.planning === "strak") { kand.add(g0); kand.add(g1 - v.blok); }
    else {
      for (let s = Math.ceil(g0 / I) * I; s + v.blok <= g1; s += I) kand.add(s);
      if (o.planning === "slim") { kand.add(g0); kand.add(g1 - v.blok); }
    }
    for (const s of [...kand].sort((a, b) => a - b)) {
      const voor = s - g0, na = g1 - (s + v.blok);
      if (voor < 0 || na < 0) continue;
      if (o.planning === "slim" && ((voor > 0 && voor < v.minBlok) || (na > 0 && na < v.minBlok))) continue;
      uit.push({ s, score: (voor ? 1 : 0) + (na ? 1 : 0) });
    }
  }
  return uit;
}

/* alle begintijden op een dag; mwId leeg = geen voorkeur (per tijd de medewerker die het best past) */
export function tijden(ctx, datum, { diensten, mwId } = {}) {
  const o = online(ctx.salon), v = vraag(ctx, diensten); if (!v) return [];
  const nu = ctx.nu || { datum: "0000-00-00", min: 0 };
  if (datum < nu.datum || datum > plusDagen(nu.datum, o.maxDag)) return [];
  /* vroegste begintijd op deze dag (minuten na middernacht): nu + minimaal vooraf */
  const min0 = nu.min + o.minUur * 60 - dagVerschil(nu.datum, datum) * 1440;
  const heeftMw = (ctx.medewerkers || []).some(m => m && !m.inactief);
  const kandidaten = heeftMw ? v.mws.filter(m => !mwId || m.id === mwId) : [null];
  const per = new Map();
  for (const m of kandidaten) {
    for (const t of voorMw(ctx, datum, v, m, o)) {
      if (t.s < min0) continue;
      const l = per.get(t.s);
      if (!l || t.score < l.score) per.set(t.s, { score: t.score, mwId: m ? m.id : "" });
    }
  }
  return [...per.entries()].sort((a, b) => a[0] - b[0]).map(([s, x]) => ({ start: toHM(s), mwId: x.mwId }));
}
function dagVerschil(a, b) { return Math.round((dag(b) - dag(a)) / 864e5); }

export function dagen(ctx, van, n, keuze) {
  const uit = [];
  for (let i = 0; i < n; i++) { const d = plusDagen(van, i); uit.push({ datum: d, aantal: tijden(ctx, d, keuze).length }); }
  return uit;
}

/* lokale datum en minuten in de tijdzone van de salon */
export function nuLokaal(tz = "Europe/Amsterdam", t = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { datum: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
