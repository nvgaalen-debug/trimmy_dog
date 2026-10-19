/* Trimmy · factuur.js */
"use strict";
/* ---------- factuur A4 ---------- */
function invHtml(f){const k=get("klanten",f.klantId),h=get("honden",f.hondId),sp=btwSpec(f.regels,f.korting);
 return`<div class="inv"><div class="top"><div>${bed.logo?`<img src="${bed.logo}" alt="${esc(bed.naam)}" style="display:block;width:${logoSize(70,220).w}px;height:${logoSize(70,220).h}px;margin-bottom:10px">`:""}<b style="font:800 16pt var(--f-d)">${esc(bed.naam)}</b><br>${esc(bed.straat)}<br>${esc([bed.pc,bed.plaats].filter(Boolean).join(" "))}<br>${esc(bed.tel)}${bed.mail?"<br>"+esc(bed.mail):""}</div>
 <div><h1>Factuur</h1><table style="width:auto;margin-left:auto"><tr><td class="m" style="border:0">Factuurnummer</td><td style="border:0;padding-left:16px">${esc(f.nr)}</td></tr><tr><td class="m" style="border:0">Datum</td><td style="border:0;padding-left:16px">${new Date(f.ts).toLocaleDateString("nl-NL")}</td></tr>${f.vervalt?`<tr><td class="m" style="border:0">Vervaldatum</td><td style="border:0;padding-left:16px">${fDate(f.vervalt)}</td></tr>`:""}</table></div></div>
 <div class="to"><div><span class="m">Aan</span><br>${k?`<b>${esc(k.naam)}</b><br>${esc(k.straat)}<br>${esc([k.pc,k.plaats].filter(Boolean).join(" "))}`:"Contante verkoop"}</div>${SJ.object&&h?`<div><span class="m">${W.Hond}</span><br><b>${esc(h.naam)}</b>${h.ras?"<br>"+esc(h.ras):""}</div>`:""}</div>
 <table><thead><tr><th>Omschrijving</th><th class="r">Aantal</th><th class="r">Prijs</th><th class="r">Btw</th><th class="r">Bedrag</th></tr></thead><tbody>${f.regels.map(r=>`<tr><td>${esc(r.naam)}</td><td class="r">${nm(r.aantal)}</td><td class="r">${eur(r.prijs)}</td><td class="r">${r.btw}%</td><td class="r">${eur(r.totaal)}</td></tr>`).join("")}</tbody></table>
 <table class="tt">${f.korting?`<tr><td>Subtotaal</td><td class="r">${eur(f.sub)}</td></tr><tr><td>Korting ${nm(f.korting)}%</td><td class="r">− ${eur(f.sub-f.totaal)}</td></tr>`:""}
 ${sp.map(b=>`<tr><td>Grondslag ${b.pct}%</td><td class="r">${eur(b.grondslag)}</td></tr><tr><td>Btw ${b.pct}%</td><td class="r">${eur(b.btw)}</td></tr>`).join("")}
 <tr class="b"><td>Totaal incl. btw</td><td class="r">${eur(f.totaal)}</td></tr>${f.betalingen.map(p=>`<tr><td>Betaald ${esc(p.methode)} ${new Date(p.ts).toLocaleDateString("nl-NL")}</td><td class="r">− ${eur(p.bedrag)}</td></tr>`).join("")}${f.rest>0?`<tr class="b"><td>Te betalen</td><td class="r">${eur(f.rest)}</td></tr>`:""}</table>
 ${f.rest>0?`<p style="margin-top:18px;border:1px solid #151515;padding:10px 12px">Graag ${eur(f.rest)} overmaken${bed.iban?" naar "+esc(bed.iban):""} ten name van ${esc(bed.naam)}, onder vermelding van factuurnummer ${esc(f.nr)}${f.vervalt?", vóór "+fDate(f.vervalt):""}.</p>`:`<p class="m" style="text-align:right">Deze factuur is voldaan.</p>`}
 ${bed.voet?`<p>${esc(bed.voet)}</p>`:""}
 <div class="foot">${esc([bed.naam,bed.kvk&&"KvK "+bed.kvk,bed.btwnr&&"Btw "+bed.btwnr,bed.iban&&"IBAN "+bed.iban].filter(Boolean).join(" · "))}</div></div>`}
function invDlg(f){const d=modal(`<div class="acts" style="justify-content:space-between"><h2>Factuur ${esc(f.nr)}</h2><div class="acts">${f.rest>0?`<button class="btn" type="button" id="iR">Restant afrekenen</button>`:""}${STANDALONE?`<button class="btn" type="button" id="iP">Printen of pdf</button>`:""}<button class="btn p" type="button" id="iX">Sluiten</button></div></div><div class="invwrap">${invHtml(f)}</div>${STANDALONE?"":`<small>Printen en pdf maken werkt in de versie die op jullie eigen webadres draait (Netlify).</small>`}`,"wide");
 d.q("#iX").onclick=()=>d.close();if(d.q("#iR"))d.q("#iR").onclick=()=>{d.close();restDlg(f)};
 if(d.q("#iP"))d.q("#iP").onclick=()=>{const p=$("#printArea");p.className="";p.innerHTML=invHtml(f);window.print()}}
function restDlg(f){let pm="PIN";const d=modal(`<h2>Restant afrekenen</h2><div class="note">Factuur ${esc(f.nr)} · open: <b>${eur(f.rest)}</b></div>
 <div class="methods" style="grid-template-columns:repeat(3,1fr)">${["PIN","Contant","Overboeking"].map(m=>`<button type="button" data-pm="${m}">${m}</button>`).join("")}</div>
 <label>Bedrag (€)<input id="rB" inputmode="decimal" value="${nm(f.rest)}"></label><div class="msg" id="rM"></div>
 <div class="acts"><button class="btn" type="button" id="rX">Annuleren</button><button class="btn p" type="button" id="rOk">Betaling vastleggen</button></div>`);
 const s=()=>d.querySelectorAll("[data-pm]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.pm===pm));s();
 d.querySelector(".methods").onclick=e=>{if(e.target.dataset.pm){pm=e.target.dataset.pm;s()}};d.q("#rX").onclick=()=>d.close();
 d.q("#rOk").onclick=()=>{const b=rnd(num(d.q("#rB").value));if(!(b>0)||b>f.rest+1e-9){d.q("#rM").textContent=`Vul een bedrag in tussen € 0,01 en ${eur(f.rest)}.`;return}
  f.betalingen.push({ts:Date.now(),methode:pm,bedrag:b});f.betaald=rnd(f.betaald+b);f.rest=rnd(f.totaal-f.betaald);saveC("facturen");d.close();draw()}}
