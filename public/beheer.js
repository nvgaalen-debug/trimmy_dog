/* Trimmy · beheer.js: salons aanmaken en beheren (alleen voor de leverancier) */
"use strict";
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => (+n || 0).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const fd = v => v ? new Date(String(v).length === 10 ? v + "T12:00" : v).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "–";
const SJL = { trimsalon: "Trimsalon (Trimmy)", nagelstudio: "Nagelstudio (Nailly)", pedicure: "Pedicure (Pedly)" };
let data = null;
async function api(pad, body) {
  const r = await fetch("/api/beheer/" + pad, body ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Trimmy-Beheer": "1" }, body: JSON.stringify(body) } : { cache: "no-store", credentials: "same-origin" });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || "Er ging iets mis."), { status: r.status, login: j.login }); return j;
}
const show = id => { $("#login").hidden = id !== "login"; $("#app").hidden = id !== "app"; $("#uit").hidden = id !== "app"; };
async function laad() {
  try { data = await api("salons"); show("app"); teken(); }
  catch (e) { if (e.login || e.status === 401) { show("login"); setTimeout(() => $("#lc").focus(), 30); } else { show("login"); $("#lm").textContent = e.message; } }
}
function teken() {
  const L = data.salons, act = L.filter(s => s.status === "actief"), mrr = act.filter(s => s.abonnement).reduce((t, s) => t + s.prijs, 0);
  $("#kpi").innerHTML = [[L.length, "salons"], [act.length, "actief"], [L.filter(s => s.status === "proef").length, "in proefperiode"], [L.filter(s => s.betaalstatus === "mislukt").length, "betaling mislukt"], [eur(mrr), "per maand via Mollie"]].map(([b, t]) => `<div><b>${b}</b><span>${t}</span></div>`).join("");
  $("#lijst").innerHTML = L.length ? L.map(s => `<tr>
   <td><b>${esc(s.naam)}</b><div class="klein">${esc(SJL[s.sjabloon] || s.sjabloon)} · /${esc(s.slug)} · schema ${esc(s.schema)}</div>${s.notitie ? `<div class="klein">${esc(s.notitie)}</div>` : ""}</td>
   <td><span class="pill ${esc(s.status)}">${esc(s.status)}</span>${s.status === "proef" && s.proefTot ? `<div class="klein">tot ${fd(s.proefTot)}</div>` : ""}</td>
   <td>${esc(s.eigenaar || "–")}<div class="klein">${s.eigenaarActief ? "account actief" : "uitgenodigd, nog niet actief"}</div></td>
   <td>${s.gebruikers} gebruiker${s.gebruikers === 1 ? "" : "s"} · ${s.apparaten} apparat${s.apparaten === 1 ? "" : "en"}<div class="klein">laatst actief ${fd(s.laatst)}</div></td>
   <td>${eur(s.prijs)}/mnd<div class="klein">${s.abonnement ? "incasso actief" : "geen incasso"}${s.betaaldTot ? " · betaald tot " + fd(s.betaaldTot) : ""}${s.betaalstatus === "mislukt" ? ' · <b style="color:var(--warn)">mislukt</b>' : ""}</div></td>
   <td><div class="acts"><button class="btn s" data-b="${esc(s.id)}">Bewerken</button><button class="btn s" data-u="${esc(s.id)}">Uitnodiging</button><button class="btn s" data-p="${esc(s.portaal)}">Portaallink</button><button class="btn s${s.supportActief ? " p" : ""}" data-sup="${esc(s.id)}" title="${s.supportToegestaan ? "Meekijken of helpen in deze salon" : "De salon heeft supporttoegang uitgezet"}">${s.supportActief ? "Support actief" : "Support"}</button></div></td></tr>`).join("") : `<tr><td colspan="6" class="mute">Nog geen salons. Maak de eerste aan met Nieuwe salon.</td></tr>`;
}
const dlg = $("#dlg"), open = h => { $("#dlgIn").innerHTML = h; dlg.showModal(); };
function linkHtml(j) { return j.gemaild ? `<p class="msg ok">Uitnodiging gemaild.</p><p class="klein">Link (ook te kopiëren): <input readonly value="${esc(j.link)}" onclick="this.select()"></p>` : `<p class="msg">Mailen lukte niet (controleer SMTP). Geef deze link zelf door:</p><input readonly value="${esc(j.link)}" onclick="this.select()">`; }
$("#nieuw").onclick = () => {
  const p30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  open(`<h2>Nieuwe salon</h2><form id="nf"><div class="g3">
   <label>Naam salon<input id="nN" required></label><label>Branche<select id="nS">${data.sjablonen.map(x => `<option value="${x}">${esc(SJL[x] || x)}</option>`).join("")}</select></label>
   <label>Naam eigenaar<input id="nE"></label><label>E-mail eigenaar<input id="nM" type="email" required></label>
   <label>Status<select id="nSt"><option value="proef">Proefperiode</option><option value="actief">Actief</option></select></label><label>Proef tot<input id="nP" type="date" value="${p30}"></label>
   <label>Prijs per maand (€)<input id="nPr" inputmode="decimal" value="19,95"></label></div>
   <details style="margin:10px 0"><summary>Bestaande gegevens koppelen</summary><label>Bestaand databaseschema (bijv. <code>trimmy</code> voor je huidige salon)<input id="nB" placeholder="leeg = nieuw, leeg schema"></label></details>
   <p class="msg" id="nm"></p><div class="acts"><button class="btn" type="button" id="nx">Annuleren</button><button class="btn p" type="submit">Aanmaken en uitnodigen</button></div></form>`);
  $("#nx").onclick = () => dlg.close();
  $("#nf").onsubmit = async e => { e.preventDefault(); const b = e.submitter; b.disabled = true; $("#nm").textContent = "";
    try { const j = await api("salon", { naam: $("#nN").value, sjabloon: $("#nS").value, eigenaar: $("#nE").value, email: $("#nM").value, status: $("#nSt").value, proefTot: $("#nP").value, prijs: $("#nPr").value.replace(",", "."), bestaandSchema: $("#nB").value.trim() });
      $("#dlgIn").innerHTML = `<h2>Salon aangemaakt</h2><p>Adres van het klantportaal: <b>${esc(location.origin)}/portaal?s=${esc(j.slug)}</b><br><span class="klein">Schema: ${esc(j.schema)}</span></p>${linkHtml(j)}<div class="acts" style="margin-top:12px"><button class="btn p" id="ok">Klaar</button></div>`;
      $("#ok").onclick = () => { dlg.close(); laad(); };
    } catch (x) { $("#nm").textContent = x.message; b.disabled = false; } };
};
document.addEventListener("click", async e => {
  const sp = e.target.closest("[data-sup]");
  if (sp) { const s = data.salons.find(x => x.id === sp.dataset.sup); if (s) supportDlg(s); return; }
  const b = e.target.closest("[data-b],[data-u],[data-p]"); if (!b) return;
  if (b.dataset.p) { try { await navigator.clipboard.writeText(b.dataset.p); b.textContent = "Gekopieerd"; } catch (x) { prompt("Portaallink", b.dataset.p); } return; }
  const s = data.salons.find(x => x.id === (b.dataset.b || b.dataset.u)); if (!s) return;
  if (b.dataset.u) { try { const j = await api("uitnodiging", { id: s.id }); open(`<h2>Link voor ${esc(s.eigenaar)}</h2>${linkHtml(j)}<div class="acts" style="margin-top:12px"><button class="btn p" id="ok">Klaar</button></div>`); $("#ok").onclick = () => dlg.close(); } catch (x) { alert(x.message); } return; }
  open(`<h2>${esc(s.naam)}</h2><form id="bf"><div class="g3">
   <label>Naam<input id="bN" value="${esc(s.naam)}"></label>
   <label>Status<select id="bSt">${["proef", "actief", "geblokkeerd"].map(x => `<option ${x === s.status ? "selected" : ""}>${x}</option>`).join("")}</select></label>
   <label>Proef tot<input id="bP" type="date" value="${esc(s.proefTot || "")}"></label>
   <label>Prijs per maand (€)<input id="bPr" inputmode="decimal" value="${String(s.prijs).replace(".", ",")}"></label></div>
   <label style="margin-top:10px">Notitie (alleen voor jou)<textarea id="bNo" rows="2">${esc(s.notitie)}</textarea></label>
   <label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="bAf" style="width:auto;margin:0"> Bij blokkeren ook alle apparaten afmelden</label>
   <p class="klein">Een nieuwe prijs geldt voor nieuwe abonnementen; een lopende incasso houdt de oude prijs tot de salon opnieuw start.</p>
   <p class="msg" id="bm"></p><div class="acts"><button class="btn" type="button" id="bDel" style="color:#b3261e">Salon verwijderen…</button><span class="sp"></span><button class="btn" type="button" id="bx">Annuleren</button><button class="btn p" type="submit">Opslaan</button></div></form>`);
  $("#bx").onclick = () => dlg.close();
  $("#bDel").onclick = () => { open(`<h2>${esc(s.naam)} verwijderen?</h2>
   <p>Dit verwijdert de salon, alle accounts en gekoppelde apparaten${s.schema && /^s_/.test(s.schema) ? `, en <b>alle gegevens</b> in de database (klanten, afspraken, facturen; schema ${esc(s.schema)})` : `. Het gekoppelde schema ${esc(s.schema || "")} blijft bewaard`}. Dit is niet terug te draaien.</p>
   <p class="klein">Laat de salon eerst een back-up maken als de gegevens bewaard moeten blijven.</p>
   <form id="vf"><label>Typ ter bevestiging de korte naam: <b>${esc(s.slug)}</b><input id="vN" autocomplete="off"></label>
   <p class="msg" id="vm"></p><div class="acts"><span class="sp"></span><button class="btn" type="button" id="vx">Annuleren</button><button class="btn p" type="submit" style="background:#b3261e;border-color:#b3261e">Definitief verwijderen</button></div></form>`);
    $("#vx").onclick = () => dlg.close();
    $("#vf").onsubmit = async ev => { ev.preventDefault(); $("#vm").textContent = "";
      try { await api("verwijder", { id: s.id, bevestig: $("#vN").value }); dlg.close(); laad(); }
      catch (x) { $("#vm").textContent = x.message; } }; };
  $("#bf").onsubmit = async ev => { ev.preventDefault();
    try { await api("bijwerken", { id: s.id, naam: $("#bN").value, status: $("#bSt").value, proefTot: $("#bP").value || null, prijs: $("#bPr").value.replace(",", "."), notitie: $("#bNo").value, afmelden: $("#bAf").checked }); dlg.close(); laad(); }
    catch (x) { $("#bm").textContent = x.message; } };
});
$("#lf").onsubmit = async e => { e.preventDefault(); $("#lm").textContent = ""; try { await api("login", { code: $("#lc").value }); $("#lc").value = ""; laad(); } catch (x) { $("#lm").textContent = x.message; } };
$("#uit").onclick = async () => { try { await api("uit", {}); } catch (e) {} show("login"); };
laad();

/* ---------- supporttoegang: tijdelijk meekijken of helpen in een salon ---------- */
function supportDlg(s) {
  open(`<h2>Support bij ${esc(s.naam)}</h2>
   ${s.supportToegestaan ? "" : `<p class="msg">Deze salon heeft supporttoegang uitgezet. Vraag de eigenaar om die even aan te zetten bij Instellingen, Koppelingen.</p>`}
   <p class="klein">Je opent de app van deze salon in dit browservenster, 2 uur lang. De eigenaar ziet in zijn app dat er support is geweest, met de reden die je hier opgeeft. Ben je in deze browser zelf als salon ingelogd? Dan word je daar afgemeld; gebruik daarom liever een apart browserprofiel.</p>
   <form id="sf"><label>Soort toegang<select id="sS"><option value="lezen">Meekijken (alleen lezen, er wordt niets opgeslagen)</option><option value="volledig">Volledige toegang (wijzigingen worden opgeslagen)</option></select></label>
   <label>Reden (zichtbaar voor de eigenaar)<input id="sR" maxlength="300" required placeholder="Bijvoorbeeld: vraag over de agenda, telefoontje 19 okt"></label>
   <p class="msg" id="sm"></p>
   <div class="acts">${s.supportActief ? `<button class="btn" type="button" id="sStop">Support beëindigen</button>` : ""}<span class="sp"></span><button class="btn" type="button" id="sx">Annuleren</button><button class="btn p" type="submit" ${s.supportToegestaan ? "" : "disabled"}>Salon openen</button></div></form>`);
  $("#sx").onclick = () => dlg.close();
  if ($("#sStop")) $("#sStop").onclick = async () => { try { await api("support-stop", { id: s.id }); dlg.close(); laad(); } catch (x) { $("#sm").textContent = x.message; } };
  $("#sf").onsubmit = async e => { e.preventDefault(); $("#sm").textContent = "";
    try { await api("support", { id: s.id, soort: $("#sS").value, reden: $("#sR").value }); dlg.close(); try { localStorage.setItem("tr_nieuwLogin", "1"); } catch (x) {} window.open("/", "_blank"); laad(); }
    catch (x) { $("#sm").textContent = x.message; } };
}
