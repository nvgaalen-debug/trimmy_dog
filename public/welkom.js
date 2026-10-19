/* Trimmy · welkom.js: wachtwoord kiezen via een uitnodigings- of herstellink */
"use strict";
const $ = s => document.querySelector(s);
const tok = new URLSearchParams(location.search).get("t") || "";
history.replaceState(null, "", location.pathname);   // token niet in de geschiedenis laten staan
async function call(pad, body) {
  const r = await fetch("/api/auth/" + pad, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Trimmy-App": "1" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Er ging iets mis."); return j;
}
function apparaat() { const u = navigator.userAgent; return (/iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS/.test(u) ? "Mac" : "Apparaat") + " · eerste keer"; }
(async () => {
  if (!tok) { $("#wT").textContent = "Link niet compleet"; $("#wIntro").textContent = "Open de link uit de e-mail opnieuw, of vraag een nieuwe aan."; return; }
  try {
    const j = await call("uitnodiging", { token: tok });
    $("#wT").textContent = j.soort === "herstel" ? "Nieuw wachtwoord kiezen" : "Welkom!";
    $("#wIntro").textContent = j.soort === "herstel" ? `Kies een nieuw wachtwoord voor ${j.salon}. Je wordt daarna op je andere apparaten afgemeld.` : `Kies een wachtwoord voor je account bij ${j.salon}. Daarna kun je meteen beginnen.`;
    $("#wE").value = j.email; $("#wF").hidden = false; $("#wW1").focus();
  } catch (e) { $("#wT").textContent = "Link verlopen"; $("#wIntro").textContent = e.message; $("#wNaar").hidden = false; }
})();
$("#wF").onsubmit = async e => {
  e.preventDefault(); const m = $("#wM"), b = $("#wF button");
  if ($("#wW1").value !== $("#wW2").value) { m.textContent = "De twee wachtwoorden zijn niet gelijk."; return; }
  b.disabled = true; b.textContent = "Bezig…"; m.textContent = "";
  try {
    const j = await call("wachtwoord", { token: tok, wachtwoord: $("#wW1").value, apparaat: apparaat() });
    try { localStorage.setItem("tr_platform", JSON.stringify({ salon: j.salon, gebruiker: j.gebruiker, ts: Date.now() })); localStorage.setItem("tr_nieuwLogin", "1"); } catch (x) {}
    $("#wF").hidden = true; $("#wT").textContent = "Gelukt"; $("#wIntro").textContent = "Je wachtwoord is opgeslagen en dit apparaat is ingelogd."; $("#wNaar").hidden = false;
    setTimeout(() => location.href = "/", 1200);
  } catch (x) { m.textContent = x.message; b.disabled = false; b.textContent = "Opslaan en inloggen"; }
};
