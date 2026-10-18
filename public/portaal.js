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

async function api(pad, body) {
  const opt = body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Trimmy-Portaal": "1" }, body: JSON.stringify(body) } : { cache: "no-store" };
  let r; try { r = await fetch("/api/portaal/" + pad, opt); } catch (e) { throw Object.assign(new Error("Geen verbinding. Controleer je internet en probeer het opnieuw."), { net: true }); }
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
  $$("#tabs button").forEach(b => { b.setAttribute("aria-selected", b.dataset.t === tab); if (b.dataset.t === "berichten") b.innerHTML = "Berichten" + (nieuw && tab !== "berichten" ? ` <span class="nb">${nieuw}</span>` : ""); });
  $$(".view").forEach(v => { v.hidden = v.id !== "v-" + tab; });
  ({ overzicht: tOverzicht, historie: tHistorie, facturen: tFacturen, berichten: tBerichten, gegevens: tGegevens })[tab]();
  clearInterval(poll); if (tab === "berichten") poll = setInterval(() => { if (document.visibilityState === "visible") laad(true); }, 30000);
}

function tOverzicht() {
  const d = data, open = d.facturen.reduce((s, f) => s + (f.rest > 0.004 ? f.rest : 0), 0);
  $("#v-overzicht").innerHTML = `
   ${open > 0 ? `<div class="card"><div class="row"><div><b>Openstaand bedrag</b><br><span class="mute">Bekijk je facturen voor de details.</span></div><div class="when" style="color:var(--warn)">${eur(open)}</div></div></div>` : ""}
   <div class="card"><h2>Komende afspraken</h2>${d.afspraken.length ? `<div class="list">${d.afspraken.map(a => `<div class="row"><div><div class="when">${esc(fDag(a.datum))}</div><div>${esc(a.start)}–${esc(eind(a.start, a.duur))} · <b>${esc(a.hond)}</b></div><div class="mute">${esc(a.behandelingen.join(", "))}</div></div>${a.bevestigd ? `<span class="pill ok">Bevestigd</span>` : `<span class="pill">Gepland</span>`}</div>`).join("")}</div>` : `<p class="empty">Er staat geen afspraak gepland. Stuur ons een bericht als je een afspraak wilt maken.</p>`}
   <p class="mute" style="margin:12px 0 0;font-size:14px">Verhinderd of een andere tijd nodig? Stuur een bericht${d.salon.tel ? " of bel " + esc(d.salon.tel) : ""}.</p></div>
   <div class="card"><h2>${d.honden.length === 1 ? "Je hond" : "Je honden"}</h2>${d.honden.length ? `<div class="dogs">${d.honden.map(h => `<div class="dog"><div class="av" ${h.foto ? `style="background-image:url('${esc(h.foto)}')"` : ""}>${h.foto ? "" : esc((h.naam || "?")[0])}</div><div><b style="font:700 18px var(--f-d)">${esc(h.naam)}</b><div class="mute" style="font-size:14px">${esc([h.ras, leeftijd(h.geb), h.geslacht, h.gewicht !== "" && h.gewicht != null ? String(h.gewicht).replace(".", ",") + " kg" : "", h.vacht].filter(Boolean).join(" · "))}</div></div></div>`).join("")}</div>` : `<p class="empty">Nog geen hond bekend.</p>`}</div>`;
}
function tHistorie() {
  const h = data.historie;
  $("#v-historie").innerHTML = `<div class="card"><h2>Historie</h2>${h.length ? `<div class="list">${h.map(b => `<div style="border-bottom:1px solid var(--line);padding-bottom:10px"><div class="row"><b>${esc(fDatum(b.datum))}</b><span class="mute">${esc(b.hond)}</span></div><div>${esc(b.behandelingen)}</div>${b.mesje ? `<div class="mute" style="font-size:14px">Mesje/techniek: ${esc(b.mesje)}${b.vacht ? " · vacht: " + esc(b.vacht) : ""}</div>` : ""}${b.notitie ? `<div class="note">${esc(b.notitie)}</div>` : ""}</div>`).join("")}</div>` : `<p class="empty">Nog geen behandelingen.</p>`}</div>`;
}
function tFacturen() {
  const f = data.facturen;
  $("#v-facturen").innerHTML = `<div class="card"><h2>Facturen en betalingen</h2>${f.length ? `<table><thead><tr><th>Factuur</th><th class="hide-s">Datum</th><th class="r">Bedrag</th><th class="r">Status</th></tr></thead><tbody>${f.map(x => `<tr class="click" data-f="${esc(x.id)}"><td><b>${esc(x.nr)}</b><div class="mute" style="font-size:13px">${esc(fTs(x.ts))}${x.hond ? " · " + esc(x.hond) : ""}</div></td><td class="hide-s">${esc(fTs(x.ts))}</td><td class="r">${eur(x.totaal)}</td><td class="r">${x.rest > 0.004 ? `<span class="pill warn">${eur(x.rest)} open</span>` : `<span class="pill ok">Betaald</span>`}</td></tr>`).join("")}</tbody></table><p class="mute" style="font-size:14px;margin:10px 0 0">Tik op een factuur om hem te bekijken, te printen of als pdf op te slaan.</p>` : `<p class="empty">Nog geen facturen.</p>`}</div>`;
}
$("#v-facturen").onclick = e => { const r = e.target.closest("[data-f]"); if (r) factuur(data.facturen.find(f => f.id === r.dataset.f)); };
function factuur(f) {
  if (!f) return; const s = data.salon, k = data.klant;
  const btw = {}; f.regels.forEach(r => { const inc = r.totaal * (1 - (f.korting || 0) / 100); btw[r.btw] = (btw[r.btw] || 0) + (inc - inc / (1 + r.btw / 100)); });
  $("#factuur").innerHTML = `<div class="inv"><div class="kop"><div>${s.logo ? `<img src="${esc(s.logo)}" alt="" style="max-height:56px;max-width:200px;display:block;margin-bottom:6px">` : `<h2>${esc(s.naam)}</h2>`}<div class="mute" style="font-size:14px">${esc([s.straat, [s.pc, s.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", "))}<br>${esc([s.tel, s.mail].filter(Boolean).join(" · "))}${s.kvk ? "<br>KvK " + esc(s.kvk) : ""}${s.btwnr ? " · Btw " + esc(s.btwnr) : ""}</div></div>
   <div style="text-align:right"><h2>Factuur</h2><div><b>${esc(f.nr)}</b></div><div class="mute" style="font-size:14px">${esc(fTs(f.ts))}${f.vervalt && f.rest > 0.004 ? "<br>Te betalen voor " + esc(fDatum(f.vervalt)) : ""}</div></div></div>
   <p style="margin:0 0 12px"><b>${esc(k.naam)}</b><br><span class="mute" style="font-size:14px">${esc([k.straat, [k.pc, k.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</span>${f.hond ? `<br><span class="mute" style="font-size:14px">Hond: ${esc(f.hond)}</span>` : ""}</p>
   <table><thead><tr><th>Omschrijving</th><th class="r">Aantal</th><th class="r">Prijs</th><th class="r">Totaal</th></tr></thead><tbody>${f.regels.map(r => `<tr><td>${esc(r.naam)}</td><td class="r">${r.aantal}</td><td class="r">${eur(r.prijs)}</td><td class="r">${eur(r.totaal)}</td></tr>`).join("")}</tbody></table>
   <table class="tot" style="max-width:300px;margin:10px 0 0 auto">${f.korting ? `<tr><td>Korting</td><td class="r">${f.korting}%</td></tr>` : ""}${Object.entries(btw).map(([p, b]) => `<tr><td class="mute">waarvan btw ${String(p).replace(".", ",")}%</td><td class="r mute">${eur(b)}</td></tr>`).join("")}<tr><td>Totaal</td><td class="r">${eur(f.totaal)}</td></tr></table>
   ${f.betalingen.length ? `<h3>Betalingen</h3><table><tbody>${f.betalingen.map(p => `<tr><td>${esc(fTs(p.ts))}</td><td>${esc(p.methode)}</td><td class="r">${eur(p.bedrag)}</td></tr>`).join("")}</tbody></table>` : ""}
   <p style="margin:12px 0 0">${f.rest > 0.004 ? `<b style="color:var(--warn)">Nog te betalen: ${eur(f.rest)}</b>${s.iban ? `<br><span class="mute" style="font-size:14px">Graag overmaken naar ${esc(s.iban)} t.n.v. ${esc(s.naam)} onder vermelding van ${esc(f.nr)}.</span>` : ""}` : `<span class="pill ok">Volledig betaald</span>`}</p>
   ${s.voet ? `<p class="mute" style="font-size:13px;margin-top:16px">${esc(s.voet)}</p>` : ""}</div>`;
  $("#fdlg").showModal();
}
$("#fClose").onclick = () => $("#fdlg").close();
$("#fPrint").onclick = () => window.print();

function tBerichten() {
  const b = data.berichten;
  $("#chat").innerHTML = b.length ? b.map(m => `<div class="bub ${m.van}">${esc(m.tekst)}<small>${m.van === "salon" ? esc(data.salon.naam || "Salon") + " · " : ""}${esc(fTijd(m.ts))}</small></div>`).join("") : `<p class="empty">Nog geen berichten. Stel hieronder je vraag aan de salon.</p>`;
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
laad();
