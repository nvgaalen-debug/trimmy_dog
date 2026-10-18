/* Trimmy · artikelen.js */
"use strict";
/* ---------- artikelen ---------- */
let aFil="alle";
function drawArt(){
 $$("#aSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.a===aFil));
 const q=$("#aq").value.trim().toLowerCase();
 const L=D.artikelen.filter(x=>(aFil==="alle"||x.type===aFil)&&[x.naam,x.cat,x.nr].join(" ").toLowerCase().includes(q)).sort((a,b)=>(a.type===b.type?String(a.cat).localeCompare(b.cat)||a.naam.localeCompare(b.naam):a.type==="dienst"?-1:1));
 $("#aBody").innerHTML=L.length?L.map(x=>`<tr class="click" data-a="${x.id}"><td><b>${esc(x.naam)}</b>${x.nr?`<br><small>${esc(x.nr)}</small>`:""}</td><td>${esc(x.cat||"")}</td><td>${x.type==="dienst"?"Behandeling":"Product"}</td><td class="r">${eur(x.prijs)}</td><td class="r">${x.btw}%</td><td class="r">${x.type==="dienst"?(x.duur||0)+" min":(x.voorraad===""||x.voorraad==null?`<span class="mute">niet bijgehouden</span>`:`<span style="color:${+x.voorraad<=3?"var(--warn)":"inherit"};font-weight:${+x.voorraad<=3?700:400}">${x.voorraad} st.</span>`)}</td><td>${x.actief?`<span class="pill ok">Actief</span>`:`<span class="pill">Uit</span>`}</td></tr>`).join(""):`<tr><td colspan="7" class="empty">Geen artikelen gevonden.</td></tr>`;
}
$("#aq").oninput=drawArt;$("#aSeg").onclick=e=>{if(e.target.dataset.a){aFil=e.target.dataset.a;drawArt()}};
$("#aNew").onclick=()=>artDlg(null);$("#aBody").onclick=e=>{const r=e.target.closest("[data-a]");if(r)artDlg(r.dataset.a)};
function artDlg(id){
 const x=id?get("artikelen",id):{naam:"",cat:"",type:aFil==="product"?"product":"dienst",prijs:0,btw:21,duur:30,voorraad:"",nr:"",actief:true};
 const used=id&&D.facturen.some(f=>f.regels.some(r=>r.artId===id));
 const d=modal(`<h2>${id?"Artikel wijzigen":"Nieuw artikel"}</h2>
  <label>Naam<input id="xN" value="${esc(x.naam)}"></label>
  <div class="g2"><label>Soort<select id="xT"><option value="dienst" ${x.type==="dienst"?"selected":""}>Behandeling</option><option value="product" ${x.type==="product"?"selected":""}>Product</option></select></label><label>Categorie<input id="xC" list="catL" value="${esc(x.cat)}"></label></div>
  <datalist id="catL">${[...new Set(D.artikelen.map(a=>a.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
  <div class="g2"><label>Prijs incl. btw (€)<input id="xP" inputmode="decimal" value="${nm(x.prijs)}"></label><label>Btw-tarief<select id="xB">${[21,9,0].map(r=>`<option value="${r}" ${+x.btw===r?"selected":""}>${r}%</option>`).join("")}</select></label></div>
  <label id="xDuL">Standaardduur (minuten)<input id="xDu" type="number" min="0" step="5" value="${x.duur??""}"></label>
  <label id="xVoL">Voorraad (leeg laten als je die niet bijhoudt)<input id="xVo" type="number" step="1" value="${x.voorraad??""}"></label>
  <label>Artikelnummer of EAN (optioneel)<input id="xNr" value="${esc(x.nr)}"></label>
  <label class="chk"><input type="checkbox" id="xA" ${x.actief?"checked":""}> Actief (zichtbaar in kassa en agenda)</label>
  <div class="msg" id="xM"></div>
  <div class="acts">${id?`<button class="btn d" type="button" id="xDel">${used?"Op inactief zetten":"Verwijderen"}</button><span class="sp"></span>`:""}<button class="btn" type="button" id="xX">Annuleren</button><button class="btn p" type="button" id="xOk">Opslaan</button></div>`);
 const t=()=>{const p=d.q("#xT").value==="product";d.q("#xDuL").hidden=p;d.q("#xVoL").hidden=!p};d.q("#xT").onchange=t;t();
 d.q("#xX").onclick=()=>d.close();
 d.q("#xOk").onclick=()=>{const ty=d.q("#xT").value,v={naam:d.q("#xN").value.trim(),type:ty,cat:d.q("#xC").value.trim(),prijs:rnd(num(d.q("#xP").value)),btw:+d.q("#xB").value,duur:ty==="dienst"?Math.round(num(d.q("#xDu").value)):null,voorraad:ty==="product"&&d.q("#xVo").value!==""?Math.round(num(d.q("#xVo").value)):(ty==="product"?"":null),nr:d.q("#xNr").value.trim(),actief:d.q("#xA").checked};
  if(!v.naam){d.q("#xM").textContent="Vul een naam in.";return}if(!(v.prijs>=0)){d.q("#xM").textContent="Vul een geldige prijs in.";return}
  if(id)Object.assign(get("artikelen",id),v);else D.artikelen.push({id:uid(),...v});saveC("artikelen");d.close();draw()};
 if(d.q("#xDel"))d.q("#xDel").onclick=e=>{if(used){get("artikelen",id).actief=false;saveC("artikelen");d.close();draw();return}arm(e.target,()=>{D.artikelen=D.artikelen.filter(a=>a.id!==id);saveC("artikelen");d.close();draw()},"Nogmaals: verwijderen")};
}
