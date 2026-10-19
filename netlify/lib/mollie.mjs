// Trimmy · Mollie (abonnementen met automatische incasso)
// MOLLIE_API_KEY: test_… of live_… uit het Mollie-dashboard. MOLLIE_API_URL alleen voor tests.
const BASIS = () => (process.env.MOLLIE_API_URL || "https://api.mollie.com/v2").replace(/\/+$/, "");
export const mollieAan = () => /^(test|live)_[A-Za-z0-9]{10,}$/.test(process.env.MOLLIE_API_KEY || "");
export const bedrag = v => ({ currency: "EUR", value: (Math.round(+v * 100) / 100).toFixed(2) });
export async function mollie(pad, methode = "GET", body) {
  const r = await fetch(BASIS() + pad, { method: methode, headers: { Authorization: "Bearer " + process.env.MOLLIE_API_KEY, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j && (j.detail || j.title)) || "Mollie gaf een fout (" + r.status + ")"), { status: r.status });
  return j;
}
/* datum over n maanden (YYYY-MM-DD), dag afgekapt op het einde van de maand */
export function plusMaand(van, n = 1) {
  const d = new Date(String(van).slice(0, 10) + "T12:00:00Z"), dag = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const max = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dag, max)); return d.toISOString().slice(0, 10);
}
