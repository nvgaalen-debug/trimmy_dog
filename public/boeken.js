/* Trimmy · online boeken (pagina voor klanten)
   De klant kiest wat, voor wie, bij wie en wanneer. Welke dagen en tijden er te kiezen zijn, rekent de server uit
   volgens de regels van de salon; deze pagina toont alleen wat de server aanbiedt. */
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => (+n || 0).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const fDag = s => new Date(s + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const hoofd = t => t.charAt(0).toUpperCase() + t.slice(1);
const plus = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const SALON = (new URLSearchParams(location.search).get("s") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);

async function api(pad, body) {
  const opt = body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Trimmy-Portaal": "1" }, body: JSON.stringify(body) } : { cache: "no-store" };
  let r; try { r = await fetch("/api/portaal/" + pad + (SALON ? (pad.includes("?") ? "&" : "?") + "s=" + encodeURIComponent(SALON) : ""), opt); }
  catch (e) { throw new Error("Geen verbinding. Controleer je internet en probeer het opnieuw."); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Er ging iets mis."), { status: r.status, ...j });
  return j;
}

let O = null;                                  // opties van de server
const K = { diensten: [], hond: null, mwId: "", datum: "", start: "", van: "", codeVerstuurd: false };
let stap = "wat";

/* ---------- kop en stappen ---------- */
function kop(s) {
  if (s.naam) { $("#salonNaam").textContent = s.naam; document.title = "Afspraak maken · " + s.naam; }
  if (s.logo) { $("#logo").src = s.logo; $("#logo").alt = s.naam || "Logo"; $("#logo").hidden = false; $("#salonNaam").hidden = true; }
  if (/^#[0-9a-f]{6}$/i.test(s.kleur || "") && !matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.style.setProperty("--acc", s.kleur);
  $("#prvLink").href = "portaal" + (SALON ? "?s=" + encodeURIComponent(SALON) : "") + "#privacy";
}
const obj = () => O && O.salon && O.salon.object !== false;
const stappen = () => ["wat", ...(obj() ? ["wie"] : []), ...(O.regels.kiesMw ? ["bij"] : []), "wanneer", "klaar"];
const NAAM = { wat: "Behandeling", wie: "Hond", bij: "Medewerker", wanneer: "Dag en tijd", klaar: "Bevestigen" };
function naar(s) {
  stap = s;
  $$(".stap").forEach(x => x.hidden = x.dataset.stap !== s);
  const L = stappen(), i = L.indexOf(s);
  $("#stappen").hidden = i < 0;
  $("#stappen").innerHTML = L.map((x, j) => `<li class="${j < i ? "af" : j === i ? "nu" : ""}" ${j === i ? 'aria-current="step"' : ""}><span>${j + 1}</span>${esc(NAAM[x])}</li>`).join("");
  if (s === "wanneer") laadDagen();
  if (s === "klaar") tekenKlaar();
  const el = document.querySelector(`.stap[data-stap="${s}"]`); if (el) { el.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); const f = el.querySelector("input,button"); if (f && s !== "wat") f.focus({ preventScroll: true }); }
}
const volgende = () => { const L = stappen(); naar(L[L.indexOf(stap) + 1]); };
const vorige = () => { const L = stappen(); naar(L[Math.max(0, L.indexOf(stap) - 1)]); };
$$("[data-terug]").forEach(b => b.onclick = vorige);

/* ---------- laden ---------- */
async function laad() {
  try { O = await api("boek-opties"); }
  catch (e) { $("#laden").hidden = true; $("#uitStaat").hidden = false; if (!e.uit) $("#uitTekst").textContent = e.message; return; }
  kop(O.salon); $("#laden").hidden = true; $("#boek").hidden = false;
  if (O.regels.tekst) { $("#intro").textContent = O.regels.tekst; $("#intro").hidden = false; }
  if (O.ik) { $("#wieIk").hidden = false; $("#wieIk").textContent = "Ingelogd als " + (O.ik.naam || O.ik.email); }
  tekenDiensten(); tekenHonden(); tekenMws(); naar("wat");
}

/* ---------- 1 wat ---------- */
function tekenDiensten() {
  const groep = {}; O.diensten.forEach(d => (groep[d.cat || "Behandelingen"] ||= []).push(d));
  $("#diensten").innerHTML = O.diensten.length ? Object.entries(groep).map(([g, L]) => `<fieldset><legend>${esc(g)}</legend>${L.map(d => `<label class="keuze"><input type="checkbox" name="dienst" value="${esc(d.id)}" ${K.diensten.includes(d.id) ? "checked" : ""}><span class="kn">${esc(d.naam)}</span><span class="kd">${d.duur} min</span><span class="kp">${d.prijs ? eur(d.prijs) : ""}</span></label>`).join("")}</fieldset>`).join("")
    : `<p class="empty">Er zijn nog geen behandelingen die je online kunt boeken. Bel of mail de salon.</p>`;
}
$("#s-wat").onsubmit = e => {
  e.preventDefault(); K.diensten = $$('input[name="dienst"]:checked').map(x => x.value);
  if (!K.diensten.length) { $("#watMsg").textContent = "Kies minstens één behandeling."; return; }
  if (K.diensten.length > 4) { $("#watMsg").textContent = "Kies maximaal vier behandelingen. Bel de salon voor een langere afspraak."; return; }
  $("#watMsg").textContent = ""; K.datum = ""; K.start = ""; tekenMws(); volgende();
};

/* ---------- 2 voor wie ---------- */
function tekenHonden() {
  const hs = (O.ik && O.ik.honden) || [];
  $("#honden").innerHTML = hs.map(h => `<label class="keuze"><input type="radio" name="hond" value="${esc(h.id)}"><span class="kn">${esc(h.naam)}</span><span class="kd">${esc(h.ras)}</span></label>`).join("")
    + `<label class="keuze"><input type="radio" name="hond" value="" ${hs.length ? "" : "checked"}><span class="kn">${hs.length ? "Een andere hond" : "Mijn hond"}</span><span class="kd">${hs.length ? "Nog niet bij ons bekend" : ""}</span></label>`;
  const upd = () => { $("#nieuweHond").hidden = !!($('input[name="hond"]:checked') || {}).value; };
  $("#honden").onchange = upd; upd();
}
$("#s-wie").onsubmit = e => {
  e.preventDefault(); const v = ($('input[name="hond"]:checked') || {}).value;
  if (v) { K.hond = { id: v, naam: (O.ik.honden.find(h => h.id === v) || {}).naam }; }
  else { const n = $("#hNaam").value.trim(); if (!n) { $("#wieMsg").textContent = "Vul de naam van je hond in."; return; } K.hond = { naam: n, ras: $("#hRas").value.trim() }; }
  $("#wieMsg").textContent = ""; volgende();
};

/* ---------- 3 bij wie ---------- */
function tekenMws() {
  if (!O.regels.kiesMw) return;
  const mag = m => K.diensten.every(id => { const d = O.diensten.find(x => x.id === id); return !d || !d.mw || d.mw.includes(m.id); });
  const L = O.medewerkers.filter(mag);
  if (K.mwId && !L.some(m => m.id === K.mwId)) K.mwId = "";
  if (!K.mwId && !O.regels.geenVoorkeur && L[0]) K.mwId = L[0].id;
  $("#mws").innerHTML = (O.regels.geenVoorkeur ? `<label class="keuze"><input type="radio" name="mw" value="" ${K.mwId ? "" : "checked"}><span class="kn">Geen voorkeur</span><span class="kd">Eerste plek die vrij is</span></label>` : "")
    + L.map(m => `<label class="keuze"><input type="radio" name="mw" value="${esc(m.id)}" ${K.mwId === m.id ? "checked" : ""}><span class="kn">${m.kleur ? `<i class="stip" style="background:${esc(m.kleur)}"></i>` : ""}${esc(m.naam)}</span></label>`).join("");
}
$("#s-bij").onsubmit = e => { e.preventDefault(); K.mwId = ($('input[name="mw"]:checked') || {}).value || ""; K.datum = ""; K.start = ""; volgende(); };

/* ---------- 4 wanneer ---------- */
const keuzeQ = () => "d=" + encodeURIComponent(K.diensten.join(",")) + "&mw=" + encodeURIComponent(K.mwId);
let laatste = "";
async function laadDagen(van) {
  K.van = van || K.van || O.nu.datum;
  $("#dagen").innerHTML = `<p class="mute">Vrije dagen zoeken…</p>`; $("#tijden").innerHTML = ""; $("#tijdenKop").hidden = true; $("#whMsg").textContent = "";
  try {
    const j = await api(`boek-dagen?${keuzeQ()}&van=${K.van}&n=14`); laatste = j.laatste;
    const eerste = j.dagen.find(d => d.aantal > 0);
    $("#dLabel").textContent = `${new Date(K.van + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${new Date(plus(K.van, 13) + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
    $("#dVorig").disabled = K.van <= O.nu.datum; $("#dVolg").disabled = plus(K.van, 14) > laatste;
    $("#dagen").innerHTML = j.dagen.map(d => { const x = new Date(d.datum + "T12:00:00"); return `<button type="button" class="dag${d.datum === K.datum ? " gekozen" : ""}" data-datum="${d.datum}" ${d.aantal ? "" : "disabled"} aria-pressed="${d.datum === K.datum}" aria-label="${esc(fDag(d.datum))}${d.aantal ? "" : ", vol"}"><span>${x.toLocaleDateString("nl-NL", { weekday: "short" })}</span><b>${x.getDate()}</b><small>${d.aantal ? x.toLocaleDateString("nl-NL", { month: "short" }) : "vol"}</small></button>`; }).join("");
    if (!eerste) { $("#whMsg").textContent = plus(K.van, 14) > laatste ? "Er is in deze periode geen plek meer. Bel de salon voor een andere mogelijkheid." : "Geen plek in deze twee weken. Kijk verder met ›."; return; }
    if (!K.datum || !j.dagen.some(d => d.datum === K.datum && d.aantal)) K.datum = eerste.datum;
    kiesDag(K.datum);
  } catch (e) { $("#dagen").innerHTML = ""; $("#whMsg").textContent = e.message; }
}
$("#dVorig").onclick = () => laadDagen(plus(K.van, -14) < O.nu.datum ? O.nu.datum : plus(K.van, -14));
$("#dVolg").onclick = () => laadDagen(plus(K.van, 14));
$("#dagen").onclick = e => { const b = e.target.closest("[data-datum]"); if (b && !b.disabled) kiesDag(b.dataset.datum); };
async function kiesDag(datum) {
  K.datum = datum; K.start = "";
  $$("#dagen .dag").forEach(b => { const ja = b.dataset.datum === datum; b.classList.toggle("gekozen", ja); b.setAttribute("aria-pressed", ja); });
  $("#tijdenKop").hidden = false; $("#tijdenKop").textContent = hoofd(fDag(datum));
  $("#tijden").innerHTML = `<p class="mute">Tijden zoeken…</p>`;
  try {
    const j = await api(`boek-tijden?${keuzeQ()}&datum=${datum}`);
    $("#tijden").innerHTML = j.tijden.length ? j.tijden.map(t => `<button type="button" class="tijd" data-start="${esc(t.start)}"><b>${esc(t.start)}</b>${t.mw ? `<small>${esc(t.mw)}</small>` : ""}</button>`).join("") : `<p class="mute">Op deze dag is geen plek meer.</p>`;
  } catch (e) { $("#tijden").innerHTML = ""; $("#whMsg").textContent = e.message; }
}
$("#tijden").onclick = e => { const b = e.target.closest("[data-start]"); if (!b) return; K.start = b.dataset.start; K.mwNaam = (b.querySelector("small") || {}).textContent || ""; volgende(); };

/* ---------- 5 bevestigen ---------- */
function tekenKlaar() {
  const ds = K.diensten.map(id => O.diensten.find(d => d.id === id)).filter(Boolean);
  const duur = ds.reduce((s, d) => s + d.duur, 0), prijs = ds.reduce((s, d) => s + (+d.prijs || 0), 0);
  const mw = K.mwId ? (O.medewerkers.find(m => m.id === K.mwId) || {}).naam : K.mwNaam;
  $("#samen").innerHTML = `<dl>
    <dt>Behandeling</dt><dd>${esc(ds.map(d => d.naam).join(", "))} <span class="mute">(${duur} min)</span></dd>
    ${obj() && K.hond ? `<dt>Hond</dt><dd>${esc(K.hond.naam)}</dd>` : ""}
    <dt>Wanneer</dt><dd>${esc(hoofd(fDag(K.datum)))} om ${esc(K.start)}</dd>
    ${mw ? `<dt>Bij</dt><dd>${esc(mw)}</dd>` : ""}
    ${prijs ? `<dt>Prijs</dt><dd>${eur(prijs)} <span class="mute">(betalen in de salon)</span></dd>` : ""}
   </dl>${O.regels.wijze === "aanvraag" ? `<p class="mute klein">Dit is een aanvraag. De salon bevestigt je afspraak zo snel mogelijk.</p>` : !O.ik && O.regels.nieuweKlant === "aanvraag" ? `<p class="mute klein">Ben je nieuw bij ons? Dan is dit een aanvraag en bevestigt de salon je afspraak zo snel mogelijk.</p>` : obj() && O.ik && K.hond && !K.hond.id && O.regels.nieuwDier === "aanvraag" ? `<p class="mute klein">Omdat je hond nog niet bij ons bekend is, is dit een aanvraag. De salon bevestigt zo snel mogelijk.</p>` : ""}`;
  $("#nieuwKlant").hidden = !!O.ik;
  $("#bevestig").textContent = O.ik ? "Afspraak bevestigen" : (K.codeVerstuurd ? "Afspraak bevestigen" : "Code sturen");
  $("#codeVak").hidden = !K.codeVerstuurd;
}
$("#s-klaar").onsubmit = async e => {
  e.preventDefault(); const m = $("#klMsg"), b = $("#bevestig"); m.textContent = "";
  let nieuw = null;
  if (!O.ik) {
    nieuw = { naam: $("#kNaam").value.trim(), email: $("#kMail").value.trim(), tel: $("#kTel").value.trim() };
    if (!nieuw.naam || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nieuw.email)) { m.textContent = "Vul je naam en een geldig e-mailadres in."; return; }
    if (!K.codeVerstuurd) {
      b.disabled = true; b.textContent = "Bezig…";
      try { await api("boek-code", { email: nieuw.email }); K.codeVerstuurd = true; $("#codeVak").hidden = false; $("#nkUitleg").textContent = `We hebben een code gestuurd naar ${nieuw.email}. Vul hem hieronder in.`; $("#kCode").focus(); }
      catch (x) { m.textContent = x.message; }
      b.disabled = false; tekenKlaar(); return;
    }
    nieuw.code = $("#kCode").value.trim();
    if (!/^\d{6}$/.test(nieuw.code)) { m.textContent = "Vul de code van 6 cijfers uit de e-mail in."; return; }
  }
  b.disabled = true; b.textContent = "Bezig…";
  try {
    const j = await api("boek", { diensten: K.diensten, datum: K.datum, start: K.start, mwId: K.mwId, hond: K.hond, opmerking: $("#opm").value.trim(), k: O.ik ? O.ik.kSel : undefined, nieuw });
    gedaan(j);
  } catch (x) {
    b.disabled = false; tekenKlaar();
    if (x.bezet) { naar("wanneer"); $("#whMsg").textContent = x.message; return; }
    if (x.code) { $("#kCode").select(); }
    m.textContent = x.message;
  }
};
function gedaan(j) {
  const a = j.afspraak;
  $$(".stap").forEach(x => x.hidden = true); $("#stappen").hidden = true;
  const portaal = O.portaal ? `portaal${SALON ? "?s=" + encodeURIComponent(SALON) : ""}` : "";
  $("#s-gedaan").hidden = false;
  $("#s-gedaan").innerHTML = `<div class="gedaan ${j.aanvraag ? "aanv" : "ok"}"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${j.aanvraag ? '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' : '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'}</svg>
    <h2>${j.aanvraag ? "Je aanvraag is verstuurd" : "Je afspraak staat vast"}</h2>
    <p><b>${esc(a.wat)}</b>${a.voor ? " voor " + esc(a.voor) : ""}<br>${esc(hoofd(fDag(a.datum)))} om ${esc(a.start)}${a.bij ? " bij " + esc(a.bij) : ""}</p>
    <p class="mute">${j.aanvraag ? "De salon bevestigt je afspraak zo snel mogelijk. Je krijgt bericht per mail." : "Je krijgt een bevestiging per mail."}</p>
    <div class="acts l">${portaal ? `<a class="btn p" href="${portaal}">Naar mijn afspraken</a>` : ""}<a class="btn" href="${location.pathname + location.search}">Nog een afspraak maken</a></div></div>`;
  $("#s-gedaan").focus?.();
}

/* ---------- inloggen (bestaande klant) ---------- */
let lStap = 1;
$("#naarLogin").onclick = () => { $$(".stap").forEach(x => x.hidden = true); $("#s-login").hidden = false; $("#lMail").value = $("#kMail").value; $("#lMail").focus(); };
$("#lTerug").onclick = () => { $("#s-login").hidden = true; naar("klaar"); };
$("#s-login").onsubmit = async e => {
  e.preventDefault(); const m = $("#lMsg"), b = $("#lOk"); m.textContent = ""; b.disabled = true;
  try {
    if (lStap === 1) { const j = await api("code", { email: $("#lMail").value.trim() }); m.className = "msg ok"; m.textContent = j.melding; $("#lCodeVak").hidden = false; b.textContent = "Inloggen"; lStap = 2; $("#lCode").focus(); }
    else {
      await api("login", { email: $("#lMail").value.trim(), code: $("#lCode").value.trim() });
      const keuze = { ...K }; O = await api("boek-opties"); Object.assign(K, keuze);
      $("#wieIk").hidden = false; $("#wieIk").textContent = "Ingelogd als " + (O.ik ? O.ik.naam || O.ik.email : "");
      tekenHonden(); $("#s-login").hidden = true;
      if (obj() && !(K.hond && K.hond.id)) { const h = O.ik && O.ik.honden.find(x => K.hond && x.naam.toLowerCase() === String(K.hond.naam || "").toLowerCase()); if (h) K.hond = { id: h.id, naam: h.naam }; }
      naar("klaar");
    }
  } catch (x) { m.className = "msg"; m.textContent = x.message; }
  b.disabled = false;
};

laad();
