/* Trimmy · klantportaal (pagina voor klanten) */
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => (+n || 0).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const fDag = s => s ? new Date(s + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) : "";
const fDatum = s => s ? new Date(s + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
const fTs = ms => ms ? new Date(+ms).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
const fTijd = ms => ms ? new Date(+ms).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const eind = (t, d) => { const [h, m] = String(t).split(":").map(Number); const x = h * 60 + m + (+d || 30); return String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0"); };
const leeftijd = g => { if (!g) return ""; const d = new Date(g), n = new Date(); let j = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) j--; return j < 1 ? "pup" : j + " jaar"; };

/* bij meerdere salons op één adres: welke salon (uit de link, bijv. /portaal?s=glans) */
const SALON = (new URLSearchParams(location.search).get("s") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
async function api(pad, body) {
  const opt = body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Trimmy-Portaal": "1" }, body: JSON.stringify(body) } : { cache: "no-store" };
  let r; try { r = await fetch("/api/portaal/" + pad + (SALON ? (pad.includes("?") ? "&" : "?") + "s=" + encodeURIComponent(SALON) : ""), opt); } catch (e) { throw Object.assign(new Error("Geen verbinding. Controleer je internet en probeer het opnieuw."), { net: true }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Er ging iets mis."), { status: r.status, login: j.login, uit: j.uit });
  return j;
}

let data = null, tab = "overzicht", poll = null, lastSeen = 0, selK = "";
try { selK = localStorage.getItem("tp_klant") || ""; } catch (e) {}
try { lastSeen = +localStorage.getItem("tp_gezien") || 0; } catch (e) {}
const show = id => ["laden", "login", "uitStaat", "app"].forEach(x => { $("#" + x).hidden = x !== id; });

function salonKop(s) {
  if (!s) return;
  if (s.naam) { $("#salonNaam").textContent = s.naam; document.title = "Klantportaal · " + s.naam; }
  if (s.logo) { $("#logo").src = s.logo; $("#logo").alt = s.naam || "Logo"; $("#logo").hidden = false; $("#salonNaam").hidden = true; }
  if (/^#[0-9a-f]{6}$/i.test(s.kleur || "") && !matchMedia("(prefers-color-scheme: dark)").matches) { document.documentElement.style.setProperty("--acc", s.kleur); }
}

async function laad(stil) {
  try {
    data = await api("ik" + (selK ? "?k=" + encodeURIComponent(selK) : ""));
    selK = data.kSel; try { localStorage.setItem("tp_klant", selK); } catch (e) {}
    salonKop(data.salon); show("app"); $("#uit").hidden = false; teken();
  } catch (e) {
    if (e.uit) { show("uitStaat"); return; }
    if (e.login || e.status === 401) { show("login"); $("#uit").hidden = true; return; }
    if (!stil) { show("login"); $("#lmsg").textContent = e.message; }
  }
}

/* ---------- inloggen ---------- */
let email = "";
$("#f1").onsubmit = async e => {
  e.preventDefault(); const b = e.submitter || $("#f1 button"); email = $("#email").value.trim(); $("#lmsg").textContent = ""; b.disabled = true; b.textContent = "Bezig…";
  try { const j = await api("code", { email }); $("#f1").hidden = true; $("#f2").hidden = false; $("#f2tekst").textContent = j.melding + " Kijk ook even in je spam-map."; setTimeout(() => $("#code").focus(), 50); }
  catch (x) { if (x.uit) show("uitStaat"); else $("#lmsg").textContent = x.message; }
  finally { b.disabled = false; b.textContent = "Code sturen"; }
};
$("#f2").onsubmit = async e => {
  e.preventDefault(); const b = $("#f2 button[type=submit]"); $("#lmsg").textContent = ""; b.disabled = true; b.textContent = "Bezig…";
  try { await api("login", { email, code: $("#code").value }); $("#code").value = ""; $("#f2").hidden = true; $("#f1").hidden = false; await laad(); }
  catch (x) { $("#lmsg").textContent = x.message; $("#code").select(); }
  finally { b.disabled = false; b.textContent = "Inloggen"; }
};
$("#terug").onclick = () => { $("#f2").hidden = true; $("#f1").hidden = false; $("#lmsg").textContent = ""; $("#email").focus(); };
$("#uit").onclick = async () => { try { await api("uit", {}); } catch (e) {} data = null; clearInterval(poll); $("#uit").hidden = true; show("login"); };

/* ---------- tabs ---------- */
$("#tabs").onclick = e => { const b = e.target.closest("[data-t]"); if (b) { tab = b.dataset.t; teken(); } };
function teken() {
  if (!data) return;
  const nm = String(data.klant.naam || "").trim(), w = nm.split(/\s+/);
  $("#hoi").textContent = "Hoi " + (w.length > 1 && !/^(fam(ilie)?\.?|dhr\.?|mevr\.?|mw\.?|de|van)$/i.test(w[0]) ? w[0] : nm) + "!";
  const nieuw = data.berichten.filter(b => b.van === "salon" && (+b.ts || 0) > lastSeen).length;
  const wie = $("#wie");
  if (data.klanten.length > 1) { wie.hidden = false; $("#wieSel").innerHTML = data.klanten.map(k => `<option value="${esc(k.id)}" ${k.id === data.kSel ? "selected" : ""}>${esc(k.naam)}</option>`).join(""); } else wie.hidden = true;
  $$("#tabs button").forEach(b => { b.setAttribute("aria-selected", b.dataset.t === (["afspraken", "honden"].includes(tab) ? "overzicht" : tab)); if (b.dataset.t === "berichten") b.innerHTML = "Berichten" + (nieuw && tab !== "berichten" ? ` <span class="nb">${nieuw}</span>` : ""); });
  $$(".view").forEach(v => { v.hidden = v.id !== "v-" + tab; });
  ({ overzicht: tOverzicht, afspraken: tAfspraken, honden: tHonden, historie: tHistorie, facturen: tFacturen, berichten: tBerichten, gegevens: tGegevens })[tab]();
  clearInterval(poll); if (tab === "berichten") poll = setInterval(() => { if (document.visibilityState === "visible") laad(true); }, 30000);
}

/* is er een apart onderwerp (hond), of is de klant zelf het onderwerp (bv. nagelstudio)? */
const OBJ = () => { const s = (data && data.salon) || salonPub || {}; return s.object !== false; };
/* ---------- startscherm met tegels ---------- */
const PICO = {
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/>',
  hond: '<path d="M10 5.5 8 3 4 4.5l1 4"/><path d="M14 5.5 16 3l4 1.5-1 4"/><path d="M5 8.5C4.5 15 7.5 20 12 20s7.5-5 7-11.5c-1-2-3.5-3-7-3s-6 1-7 3Z"/><circle cx="9.5" cy="12" r=".6" fill="currentColor"/><circle cx="14.5" cy="12" r=".6" fill="currentColor"/><path d="M11 15.5h2l-1 1.2z"/>',
  historie: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>',
  factuur: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  bericht: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  gegevens: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  slot: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};
const pico = (k, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PICO[k]}</svg>`;
function tOverzicht() {
  const d = data, open = d.facturen.reduce((s, f) => s + (f.rest > 0.004 ? f.rest : 0), 0), nOpen = d.facturen.filter(f => f.rest > 0.004).length;
  const nieuw = d.berichten.filter(b => b.van === "salon" && (+b.ts || 0) > lastSeen).length;
  const volg = d.afspraken[0], laatst = d.historie[0];
  const honden = d.honden.map(h => h.naam).filter(Boolean);
  const tel = String(d.salon.tel || "").replace(/[^\d+]/g, "");
  const T = [
    ["afspraken", "agenda", "Afspraken", d.afspraken.length ? `${d.afspraken.length} gepland` : "Geen gepland", volg ? `Volgende: ${fKort(volg.datum)} ${volg.start}` : "Stuur ons een bericht", 0],
    OBJ() && ["honden", "hond", honden.length === 1 ? "Mijn hond" : "Mijn honden", honden.length ? honden.slice(0, 2).join(" en ") + (honden.length > 2 ? ` +${honden.length - 2}` : "") : "Nog niet bekend", honden.length ? "Ras, leeftijd en vacht" : "", 0],
    ["historie", "historie", "Historie", d.historie.length ? `${d.historie.length} keer geweest` : "Nog geen bezoek", laatst ? `Laatst: ${fDatum(laatst.datum)}` : "", 0],
    ["facturen", "factuur", "Facturen", nOpen ? `${eur(open)} open` : "Alles betaald", nOpen ? `${nOpen} factu${nOpen === 1 ? "ur" : "ren"} te betalen` : `${d.facturen.length} factu${d.facturen.length === 1 ? "ur" : "ren"}`, nOpen],
    ["berichten", "bericht", "Berichten", nieuw ? `${nieuw} nieuw` : "Stel een vraag", nieuw ? "Van de salon" : "We reageren zo snel mogelijk", nieuw],
    ["gegevens", "gegevens", "Mijn gegevens", "Adres en telefoon", "Zelf aanpassen", 0],
    tel && ["tel:" + tel, "bel", "Bel de salon", d.salon.tel, "Verhinderd? Laat het weten", 0],
    ["#privacy", "slot", "Privacy", "Je gegevens", "Wat we bewaren en waarom", 0],
  ].filter(Boolean);
  const tegel = ([doel, ic, l, big, sub, alert]) => {
    const inh = `<span class="ti">${pico(ic)}</span><span class="tl">${esc(l)}</span><b>${esc(big)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}${alert ? `<span class="nb" aria-hidden="true">${alert}</span>` : ""}`;
    return /^(tel:|#privacy)/.test(doel) ? `<a class="tegel${alert ? " let" : ""}" href="${esc(doel)}">${inh}</a>` : `<button type="button" class="tegel${alert ? " let" : ""}" data-doel="${esc(doel)}">${inh}</button>`;
  };
  $("#v-overzicht").innerHTML = `
   ${volg ? `<div class="hero"><span class="ti">${pico("agenda", 26)}</span><div><span class="tl">Volgende afspraak</span><b>${esc((t => t.charAt(0).toUpperCase() + t.slice(1))(fDag(volg.datum)))}</b><div>${esc(volg.start)}–${esc(eind(volg.start, volg.duur))}${OBJ() ? " · " + esc(volg.hond) : ""}${volg.behandelingen.length ? " · " + esc(volg.behandelingen.join(", ")) : ""}</div></div>${volg.bevestigd ? `<span class="pill ok">Bevestigd</span>` : ""}</div>` : ""}
   <div class="tegels">${T.map(tegel).join("")}</div>
  `;
}
function tAfspraken() { const d = data; $("#v-afspraken").innerHTML = `<button type="button" class="btn link terug" data-doel="overzicht">← Start</button><div class="card"><h2>Komende afspraken</h2>${d.afspraken.length ? `<div class="list">${d.afspraken.map(a => `<div class="row"><div><div class="when">${esc(fDag(a.datum))}</div><div>${esc(a.start)}–${esc(eind(a.start, a.duur))}${OBJ() ? ` · <b>${esc(a.hond)}</b>` : ""}</div><div class="mute">${esc(a.behandelingen.join(", "))}</div></div>${a.bevestigd ? `<span class="pill ok">Bevestigd</span>` : `<span class="pill">Gepland</span>`}</div>`).join("")}</div>` : `<p class="empty">Er staat geen afspraak gepland. Stuur ons een bericht als je een afspraak wilt maken.</p>`}
   <p class="mute" style="margin:12px 0 0;font-size:14px">Verhinderd of een andere tijd nodig? Stuur een bericht${d.salon.tel ? " of bel " + esc(d.salon.tel) : ""}.</p></div>`; }
function tHonden() { const d = data; $("#v-honden").innerHTML = `<button type="button" class="btn link terug" data-doel="overzicht">← Start</button><div class="card"><h2>${d.honden.length === 1 ? "Je hond" : "Je honden"}</h2>${d.honden.length ? `<div class="dogs">${d.honden.map(h => `<div class="dog"><div class="av" ${h.foto ? `style="background-image:url('${esc(h.foto)}')"` : ""}>${h.foto ? "" : esc((h.naam || "?")[0])}</div><div><b style="font:700 18px var(--f-d)">${esc(h.naam)}</b><div class="mute" style="font-size:14px">${esc([h.ras, leeftijd(h.geb), h.geslacht, h.gewicht !== "" && h.gewicht != null ? String(h.gewicht).replace(".", ",") + " kg" : "", h.vacht].filter(Boolean).join(" · "))}</div></div></div>`).join("")}</div>` : `<p class="empty">Nog geen hond bekend.</p>`}</div>`; }
const fKort = s => s ? new Date(s + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "";
["#v-overzicht", "#v-afspraken", "#v-honden"].forEach(v => $(v).addEventListener("click", e => {
  const t = e.target.closest("[data-doel]"); if (!t) return; const doel = t.dataset.doel;
  if (doel[0] === "#") { const el = $(doel); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  else { tab = doel; teken(); scrollTo(0, 0); }
}));
function tHistorie() {
  const h = data.historie;
  $("#v-historie").innerHTML = `<div class="card"><h2>Historie</h2>${h.length ? `<div class="list">${h.map(b => `<div style="border-bottom:1px solid var(--line);padding-bottom:10px"><div class="row"><b>${esc(fDatum(b.datum))}</b><span class="mute">${OBJ() ? esc(b.hond) : ""}</span></div><div>${esc(b.behandelingen)}</div>${b.mesje ? `<div class="mute" style="font-size:14px">Mesje/techniek: ${esc(b.mesje)}${b.vacht ? " · vacht: " + esc(b.vacht) : ""}</div>` : ""}${[b.techniek, b.vorm, b.kleur, b.extra].some(Boolean) ? `<div class="mute" style="font-size:14px">${esc([b.techniek, b.vorm, b.kleur, b.extra].filter(Boolean).join(" · "))}</div>` : ""}${b.notitie ? `<div class="note">${esc(b.notitie)}</div>` : ""}</div>`).join("")}</div>` : `<p class="empty">Nog geen behandelingen.</p>`}</div>`;
}
function tFacturen() {
  const f = data.facturen;
  $("#v-facturen").innerHTML = `<div class="card"><h2>Facturen en betalingen</h2>${f.length ? `<table><thead><tr><th>Factuur</th><th class="hide-s">Datum</th><th class="r">Bedrag</th><th class="r">Status</th></tr></thead><tbody>${f.map(x => `<tr class="click" data-f="${esc(x.id)}"><td><b>${esc(x.nr)}</b>${x.credit ? ` <span class="mute" style="font-size:13px">creditfactuur</span>` : ""}<div class="mute" style="font-size:13px">${esc(fTs(x.ts))}${x.hond ? " · " + esc(x.hond) : ""}</div></td><td class="hide-s">${esc(fTs(x.ts))}</td><td class="r">${eur(x.totaal)}</td><td class="r">${x.rest > 0.004 ? `<span class="pill warn">${eur(x.rest)} open</span>` : x.rest < -0.004 ? `<span class="pill">${eur(-x.rest)} terug</span>` : x.credit ? `<span class="pill ok">Credit</span>` : `<span class="pill ok">Betaald</span>`}</td></tr>`).join("")}</tbody></table><p class="mute" style="font-size:14px;margin:10px 0 0">Tik op een factuur om hem te bekijken, te printen of als pdf op te slaan.</p>` : `<p class="empty">Nog geen facturen.</p>`}</div>`;
}
$("#v-facturen").onclick = e => { const r = e.target.closest("[data-f]"); if (r) factuur(data.facturen.find(f => f.id === r.dataset.f)); };
function factuur(f) {
  if (!f) return; const s = data.salon, k = data.klant;
  const btw = {}; f.regels.forEach(r => { const inc = r.totaal * (1 - (f.korting || 0) / 100); btw[r.btw] = (btw[r.btw] || 0) + (inc - inc / (1 + r.btw / 100)); });
  $("#factuur").innerHTML = `<div class="inv"><div class="kop"><div>${s.logo ? `<img src="${esc(s.logo)}" alt="" style="max-height:56px;max-width:200px;display:block;margin-bottom:6px">` : `<h2>${esc(s.naam)}</h2>`}<div class="mute" style="font-size:14px">${esc([s.straat, [s.pc, s.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", "))}<br>${esc([s.tel, s.mail].filter(Boolean).join(" · "))}${s.kvk ? "<br>KvK " + esc(s.kvk) : ""}${s.btwnr ? " · Btw " + esc(s.btwnr) : ""}</div></div>
   <div style="text-align:right"><h2>${f.credit ? "Creditfactuur" : "Factuur"}</h2><div><b>${esc(f.nr)}</b></div>${f.credit && f.creditNr ? `<div class="mute" style="font-size:14px">Credit op factuur ${esc(f.creditNr)}</div>` : ""}<div class="mute" style="font-size:14px">${esc(fTs(f.ts))}${f.vervalt && f.rest > 0.004 ? "<br>Te betalen voor " + esc(fDatum(f.vervalt)) : ""}</div></div></div>
   <p style="margin:0 0 12px"><b>${esc(k.naam)}</b><br><span class="mute" style="font-size:14px">${esc([k.straat, [k.pc, k.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</span>${f.hond ? `<br><span class="mute" style="font-size:14px">Hond: ${esc(f.hond)}</span>` : ""}</p>
   ${f.credit && f.reden ? `<p class="mute" style="margin:0 0 10px;font-size:14px">Reden: ${esc(f.reden)}</p>` : ""}<table><thead><tr><th>Omschrijving</th><th class="r">Aantal</th><th class="r">Prijs</th><th class="r">Totaal</th></tr></thead><tbody>${f.regels.map(r => `<tr><td>${esc(r.naam)}</td><td class="r">${r.aantal}</td><td class="r">${eur(r.prijs)}</td><td class="r">${eur(r.totaal)}</td></tr>`).join("")}</tbody></table>
   <table class="tot" style="max-width:300px;margin:10px 0 0 auto">${f.korting ? `<tr><td>Korting</td><td class="r">${f.korting}%</td></tr>` : ""}${Object.entries(btw).map(([p, b]) => `<tr><td class="mute">waarvan btw ${String(p).replace(".", ",")}%</td><td class="r mute">${eur(b)}</td></tr>`).join("")}<tr><td>Totaal</td><td class="r">${eur(f.totaal)}</td></tr></table>
   ${f.betalingen.length ? `<h3>Betalingen</h3><table><tbody>${f.betalingen.map(p => `<tr><td>${esc(fTs(p.ts))}</td><td>${esc(p.methode === "Creditnota" ? "Verrekend met creditfactuur" : p.methode === "Verrekend" ? "Verrekend met factuur" : p.bedrag < 0 ? "Terugbetaald " + p.methode : p.methode)}</td><td class="r">${eur(Math.abs(p.bedrag))}</td></tr>`).join("")}</tbody></table>` : ""}
   <p style="margin:12px 0 0">${f.rest > 0.004 ? `<b style="color:var(--warn)">Nog te betalen: ${eur(f.rest)}</b>${s.iban ? `<br><span class="mute" style="font-size:14px">Graag overmaken naar ${esc(s.iban)} t.n.v. ${esc(s.naam)} onder vermelding van ${esc(f.nr)}.</span>` : ""}` : f.rest < -0.004 ? `<b>Wij betalen ${eur(-f.rest)} aan je terug.</b>` : f.credit ? `<span class="pill ok">Verrekend of terugbetaald</span>` : `<span class="pill ok">Volledig betaald</span>`}</p>
   ${s.voet ? `<p class="mute" style="font-size:13px;margin-top:16px">${esc(s.voet)}</p>` : ""}</div>`;
  $("#fdlg").showModal();
}
$("#fClose").onclick = () => $("#fdlg").close();
$("#fPrint").onclick = () => window.print();

function tBerichten() {
  const b = data.berichten;
  $("#chat").innerHTML = b.length ? b.map(m => `<div class="bub ${m.van}">${esc(m.tekst)}<small>${m.van === "salon" ? esc((m.door ? m.door + ", " : "") + (data.salon.naam || "Salon")) + " · " : ""}${esc(fTijd(m.ts))}</small></div>`).join("") : `<p class="empty">Nog geen berichten. Stel hieronder je vraag aan de salon.</p>`;
  $("#chat").scrollTop = $("#chat").scrollHeight;
  const max = Math.max(0, ...b.filter(m => m.van === "salon").map(m => +m.ts || 0));
  if (max > lastSeen) { lastSeen = max; try { localStorage.setItem("tp_gezien", String(max)); } catch (e) {} }
}
$("#fb").onsubmit = async e => {
  e.preventDefault(); const t = $("#btekst").value.trim(); if (!t) return; const btn = $("#fb button"); btn.disabled = true; $("#bmsg").textContent = ""; $("#bmsg").className = "msg";
  try { await api("bericht", { tekst: t, k: selK }); $("#btekst").value = ""; await laad(true); $("#bmsg").className = "msg ok"; $("#bmsg").textContent = "Verstuurd. De salon krijgt een melding."; }
  catch (x) { if (x.login) return laad(); $("#bmsg").textContent = x.message; }
  finally { btn.disabled = false; }
};
$("#btekst").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("#fb").requestSubmit(); });

function tGegevens() {
  const k = data.klant; $("#gNaam").value = k.naam; $("#gMail").value = k.email; $("#gTel").value = k.tel; $("#gStraat").value = k.straat; $("#gPc").value = k.pc; $("#gPlaats").value = k.plaats;
}
$("#fg").onsubmit = async e => {
  e.preventDefault(); const btn = $("#fg button"); btn.disabled = true; $("#gmsg").className = "msg"; $("#gmsg").textContent = "";
  try { const j = await api("gegevens", { k: selK, tel: $("#gTel").value, straat: $("#gStraat").value, pc: $("#gPc").value, plaats: $("#gPlaats").value });
    await laad(true); $("#gmsg").className = "msg ok"; $("#gmsg").textContent = j.gewijzigd ? "Opgeslagen. De salon ziet je nieuwe gegevens." : "Er was niets gewijzigd."; }
  catch (x) { if (x.login) return laad(); $("#gmsg").textContent = x.message; }
  finally { btn.disabled = false; }
};

$("#wieSel").onchange = e => { selK = e.target.value; tab = "overzicht"; laad(); };
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && data) laad(true); });
/* ---------- privacyverklaring ---------- */
let salonPub = null, sesDagen = 60;
async function laadSalon() { try { const j = await api("salon"); salonPub = j.salon; sesDagen = j.sessieDagen || 60; if (!data) salonKop(salonPub); } catch (e) {} }
function privacyHtml(s) {
  const p = { ...(s.privacy || {}), obj: s.object !== false }, S = esc(s.naam || "de trimsalon"), mail = esc(p.mail || s.mail || ""), jaren = +p.jaren || 2;
  const adres = [s.straat, [s.pc, s.plaats].filter(Boolean).join(" ")].filter(Boolean).map(esc).join(", ");
  const diensten = p.diensten ? esc(p.diensten) : "Netlify (hosting van de app en dit portaal), Aiven (database) en onze e-mailprovider (versturen van e-mails)";
  const contact = [mail ? `<a href="mailto:${mail}">${mail}</a>` : "", s.tel ? "telefoon " + esc(s.tel) : ""].filter(Boolean).join(" of ");
  const datum = p.datum ? new Date(p.datum + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
  const alinea = t => esc(t).split(/\n{2,}/).map(x => `<p>${x.replace(/\n/g, "<br>")}</p>`).join("");
  return `<button type="button" class="btn link prvTerug" data-terug>← Terug</button>
  <h1 id="prvTitel">Privacyverklaring</h1>
  <p class="mute">${S}${datum ? " · bijgewerkt op " + datum : ""}</p>
  <p>In deze verklaring lees je welke gegevens ${S} van jou${p.obj ? " en je hond" : ""} bewaart, waarvoor, hoe lang, en welke rechten je hebt.</p>
  <h2>Wie is verantwoordelijk</h2>
  <p>${S}${adres ? ", " + adres : ""}${s.kvk ? ", KvK " + esc(s.kvk) : ""}.${contact ? ` Vragen over je gegevens? Neem contact op via ${contact}, of stuur een bericht in dit portaal.` : " Vragen over je gegevens? Stuur een bericht in dit portaal."}</p>
  <h2>Welke gegevens we bewaren</h2>
  <ul>
   <li><b>Contactgegevens:</b> naam, adres, telefoonnummer en e-mailadres.</li>
   ${p.obj ? `<li><b>Over je hond:</b> naam, ras, geboortedatum, chipnummer, vacht, gedrag en gezondheidsbijzonderheden die belangrijk zijn voor de behandeling, en eventueel een foto.</li>` : s.sjabloon === "pedicure" ? `<li><b>Over je behandelingen:</b> je voorkeuren (zoals lakkleur), de conditie van je voeten en nagels en, alleen als je daar toestemming voor geeft, medische aandachtspunten die belangrijk zijn voor een veilige behandeling (zoals diabetes of bloedverdunners).</li>` : `<li><b>Over je behandelingen:</b> je voorkeuren (zoals vorm, lengte en kleuren), de conditie van je nagels en, alleen als je daar toestemming voor geeft, een allergie of gevoeligheid die belangrijk is voor de behandeling.</li>`}
   <li><b>Afspraken en behandelingen:</b> wanneer ${p.obj ? "je hond is" : "je bent"} geweest, wat er is gedaan en aantekeningen voor de volgende keer.</li>
   <li><b>Facturen en betalingen.</b></li>
   <li><b>Wat je via dit portaal doet:</b> berichten die je stuurt en wijzigingen in je gegevens.</li>
   <li><b>Bij het inloggen:</b> je e-mailadres, het tijdstip en je IP-adres, om misbruik te voorkomen.</li>
  </ul>
  <h2>Waarvoor we ze gebruiken</h2>
  <ul>
   <li>Afspraken maken en ${p.obj ? "je hond" : "je"} goed verzorgen. Dit is nodig voor de afspraak die we met je hebben.</li>
   <li>Facturen maken en onze administratie bijhouden. Dit verplicht de wet.</li>
   <li>Je herinneren aan een afspraak${p.herinneringen ? " (per e-mail)" : ""} en laten weten wanneer ${p.obj ? "je hond weer aan de beurt is" : "het tijd is om op te vullen"}. Dit doen we omdat het jou en ons helpt; wil je dit niet, laat het ons weten, dan stoppen we ermee.</li>
   <li>Dit portaal veilig houden.</li>
  </ul>
  <p>We gebruiken je gegevens niet voor iets anders. We verkopen ze niet en sturen je geen reclame van anderen.</p>
  <h2>Hoe lang we ze bewaren</h2>
  <ul>
   <li><b>Facturen en betalingen:</b> 7 jaar, zoals de wet voorschrijft.</li>
   <li><b>Gegevens van jou${p.obj ? " en je hond" : ""}, afspraken en berichten:</b> tot ${jaren} jaar na je laatste bezoek. Daarna verwijderen we ze.</li>
   <li><b>Inloggen:</b> een inlogcode is 10 minuten geldig en wordt binnen een dag verwijderd. Je blijft maximaal ${sesDagen} dagen ingelogd, of tot je uitlogt.</li>
  </ul>
  <h2>Wie je gegevens kan zien</h2>
  <p>Alleen medewerkers van ${S}, en alleen als dat nodig is voor hun werk. Voor de techniek werken we met dienstverleners die je gegevens in onze opdracht verwerken: ${diensten}. Met hen hebben we afspraken gemaakt over beveiliging en geheimhouding. Aan anderen geven we je gegevens alleen als de wet dat verplicht.</p>
  <h2>Hoe we je gegevens beveiligen</h2>
  <ul>
   <li>De verbinding is altijd versleuteld (https).</li>
   <li>Je logt in met een code die je per e-mail krijgt; er is geen wachtwoord dat kan uitlekken.</li>
   <li>Je ziet in dit portaal alleen je eigen gegevens.</li>
   <li>Medewerkers loggen in met een eigen code.</li>
  </ul>
  <h2>Cookies</h2>
  <p>Dit portaal gebruikt één cookie, om je ingelogd te houden. Je browser onthoudt verder welke berichten je al hebt gezien en, als er meerdere klanten bij je e-mailadres horen, welke je bekijkt. We gebruiken geen cookies voor statistieken of advertenties en volgen je niet op andere websites.</p>
  <h2>Je rechten</h2>
  <p>Je mag:</p>
  <ul>
   <li>je gegevens inzien;</li>
   <li>onjuiste gegevens laten verbeteren (telefoon en adres pas je zelf aan bij <i>Mijn gegevens</i>);</li>
   <li>je gegevens laten verwijderen, behalve wat we volgens de wet moeten bewaren;</li>
   <li>bezwaar maken tegen herinneringen en andere berichten;</li>
   <li>je gegevens ontvangen in een bestand, bijvoorbeeld om aan een andere salon te geven.</li>
  </ul>
  <p>Stuur hiervoor een bericht in dit portaal${mail ? ` of mail naar <a href="mailto:${mail}">${mail}</a>` : ""}. We reageren binnen een maand.</p>
  <h2>Een klacht</h2>
  <p>Ben je niet tevreden over hoe we met je gegevens omgaan? Laat het ons eerst weten, dan zoeken we samen een oplossing. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens: <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener">autoriteitpersoonsgegevens.nl</a>.</p>
  ${p.extra ? `<h2>Verder</h2>${alinea(p.extra)}` : ""}
  <h2>Wijzigingen</h2>
  <p>Passen we deze verklaring aan, dan zie je bovenaan de nieuwe datum.</p>
  <button type="button" class="btn" data-terug>Terug</button>`;
}
async function route() {
  const pv = location.hash === "#privacy"; document.body.classList.toggle("pv", pv); $("#privacy").hidden = !pv;
  if (!pv) return;
  if (!(data && data.salon && data.salon.privacy) && !salonPub) await laadSalon(); if (location.hash !== "#privacy") return;
  const s = (data && data.salon && data.salon.privacy) ? data.salon : salonPub;
  $("#privacy").innerHTML = s ? privacyHtml(s) : `<h1>Privacyverklaring</h1><p>De privacyverklaring kan nu niet worden geladen. Probeer het later opnieuw of neem contact op met de salon.</p><button type="button" class="btn" data-terug>Terug</button>`;
  scrollTo(0, 0);
}
let pvIntern = false; // via een link in het portaal geopend (dan is "terug" de vorige stap)
$("#privacy").addEventListener("click", e => { if (e.target.closest("[data-terug]")) { if (pvIntern) history.back(); else { history.replaceState("", "", location.pathname + location.search); route(); } } });
addEventListener("hashchange", () => { pvIntern = location.hash === "#privacy"; route(); });
/* eerst de klantgegevens (daar zit de salon al in); alleen als je niet bent ingelogd de salongegevens apart ophalen */
laad().then(() => { if (!data) laadSalon(); }); route();
