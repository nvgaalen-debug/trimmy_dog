/* Trimmy · factuur.js */
"use strict";
/* ---------- factuur A4 ---------- */
function invHtml(f){const k=get("klanten",f.klantId),h=get("honden",f.hondId),sp=btwSpec(f.regels,f.korting);
 return`<div class="inv"><div class="top"><div>${bed.logo?`<img src="${bed.logo}" alt="${esc(bed.naam)}" style="display:block;width:${logoSize(70,220).w}px;height:${logoSize(70,220).h}px;margin-bottom:10px">`:""}<b style="font:800 16pt var(--f-d)">${esc(bed.naam)}</b><br>${esc(bed.straat)}<br>${esc([bed.pc,bed.plaats].filter(Boolean).join(" "))}<br>${esc(bed.tel)}${bed.mail?"<br>"+esc(bed.mail):""}</div>
 <div><h1>${isCred(f)?"Creditfactuur":"Factuur"}</h1><table style="width:auto;margin-left:auto"><tr><td class="m" style="border:0">${isCred(f)?"Creditfactuurnummer":"Factuurnummer"}</td><td style="border:0;padding-left:16px">${esc(f.nr)}</td></tr>${isCred(f)?`<tr><td class="m" style="border:0">Credit op factuur</td><td style="border:0;padding-left:16px">${esc(f.creditNr||"")}${f.creditDatum?" van "+new Date(f.creditDatum).toLocaleDateString("nl-NL"):""}</td></tr>`:""}<tr><td class="m" style="border:0">Datum</td><td style="border:0;padding-left:16px">${new Date(f.ts).toLocaleDateString("nl-NL")}</td></tr>${f.vervalt?`<tr><td class="m" style="border:0">Vervaldatum</td><td style="border:0;padding-left:16px">${fDate(f.vervalt)}</td></tr>`:""}</table></div></div>
 <div class="to"><div><span class="m">Aan</span><br>${k?`<b>${esc(k.naam)}</b><br>${esc(k.straat)}<br>${esc([k.pc,k.plaats].filter(Boolean).join(" "))}`:"Contante verkoop"}</div>${SJ.object&&h?`<div><span class="m">${W.Hond}</span><br><b>${esc(h.naam)}</b>${h.ras?"<br>"+esc(h.ras):""}</div>`:""}</div>
 ${isCred(f)&&f.reden?`<p style="margin:0 0 12px"><span class="m">Reden</span><br>${esc(f.reden)}</p>`:""}<table><thead><tr><th>Omschrijving</th><th class="r">Aantal</th><th class="r">Prijs</th><th class="r">Btw</th><th class="r">Bedrag</th></tr></thead><tbody>${f.regels.map(r=>`<tr><td>${esc(r.naam)}</td><td class="r">${nm(r.aantal)}</td><td class="r">${eur(r.prijs)}</td><td class="r">${r.btw}%</td><td class="r">${eur(r.totaal)}</td></tr>`).join("")}</tbody></table>
 <table class="tt">${f.korting?`<tr><td>Subtotaal</td><td class="r">${eur(f.sub)}</td></tr><tr><td>Korting ${nm(f.korting)}%</td><td class="r">− ${eur(f.sub-f.totaal)}</td></tr>`:""}
 ${sp.map(b=>`<tr><td>Grondslag ${b.pct}%</td><td class="r">${eur(b.grondslag)}</td></tr><tr><td>Btw ${b.pct}%</td><td class="r">${eur(b.btw)}</td></tr>`).join("")}
 <tr class="b"><td>Totaal incl. btw</td><td class="r">${eur(f.totaal)}</td></tr>${f.betalingen.map(p=>`<tr><td>${esc(betLabel(p))} ${new Date(p.ts).toLocaleDateString("nl-NL")}</td><td class="r">${p.bedrag<0?"+":"−"} ${eur(Math.abs(p.bedrag))}</td></tr>`).join("")}${f.rest>0?`<tr class="b"><td>Te betalen</td><td class="r">${eur(f.rest)}</td></tr>`:""}${f.rest<-0.004?`<tr class="b"><td>Nog terug te betalen</td><td class="r">${eur(-f.rest)}</td></tr>`:""}</table>
 ${f.rest>0?`<p style="margin-top:18px;border:1px solid #151515;padding:10px 12px">Graag ${eur(f.rest)} overmaken${bed.iban?" naar "+esc(bed.iban):""} ten name van ${esc(bed.naam)}, onder vermelding van factuurnummer ${esc(f.nr)}${f.vervalt?", vóór "+fDate(f.vervalt):""}.</p>`:(isCred(f)?(f.rest<-0.004?`<p style="margin-top:18px;border:1px solid #151515;padding:10px 12px">Wij betalen ${eur(-f.rest)} aan u terug${get("klanten",f.klantId)&&get("klanten",f.klantId).iban?" op rekening "+esc(get("klanten",f.klantId).iban):""}.</p>`:`<p class="m" style="text-align:right">Deze creditfactuur is verrekend of terugbetaald.</p>`):`<p class="m" style="text-align:right">Deze factuur is voldaan.</p>`)}${!isCred(f)&&creditsVan(f).length?`<p class="m">Gecrediteerd met: ${creditsVan(f).map(c=>esc(c.nr)+" ("+eur(c.totaal)+")").join(", ")}</p>`:""}
 ${sjTekst("voet")?`<p>${esc(sjTekst("voet"))}</p>`:""}
 <div class="foot">${esc([bed.naam,bed.kvk&&"KvK "+bed.kvk,bed.btwnr&&"Btw "+bed.btwnr,bed.iban&&"IBAN "+bed.iban].filter(Boolean).join(" · "))}</div></div>`}
function invDlg(f){const d=modal(`<div class="acts" style="justify-content:space-between"><h2>${isCred(f)?"Creditfactuur":"Factuur"} ${esc(f.nr)}</h2><div class="acts">${isCred(f)&&f.creditVan&&get("facturen",f.creditVan)?`<button class="btn" type="button" id="iO">Factuur ${esc(f.creditNr||"")}</button>`:""}${magCrediteren(f)?`<button class="btn" type="button" id="iC">Crediteren</button>`:""}${f.rest>0?`<button class="btn" type="button" id="iR">Restant afrekenen</button>`:""}${f.rest<-0.004?`<button class="btn" type="button" id="iR">Terugbetaling vastleggen</button>`:""}${STANDALONE?`<button class="btn" type="button" id="iP">Printen of pdf</button>`:""}<button class="btn p" type="button" id="iX">Sluiten</button></div></div><div class="invwrap">${invHtml(f)}</div>${STANDALONE?"":`<small>Printen en pdf maken werkt in de versie die op jullie eigen webadres draait (Netlify).</small>`}`,"wide");
 d.q("#iX").onclick=()=>d.close();if(d.q("#iR"))d.q("#iR").onclick=()=>{d.close();restDlg(f)};if(d.q("#iC"))d.q("#iC").onclick=()=>{d.close();creditDlg(f)};if(d.q("#iO"))d.q("#iO").onclick=()=>{d.close();invDlg(get("facturen",f.creditVan))};
 if(d.q("#iP"))d.q("#iP").onclick=()=>{const p=$("#printArea");p.className="";p.innerHTML=invHtml(f);window.print()}}
function restDlg(f){let pm="PIN";const terug=f.rest<0,open=Math.abs(f.rest);const d=modal(`<h2>${terug?"Terugbetaling vastleggen":"Restant afrekenen"}</h2><div class="note">${terug?"Creditfactuur":"Factuur"} ${esc(f.nr)} · ${terug?"nog terug te betalen":"open"}: <b>${eur(open)}</b></div>
 <div class="methods" style="grid-template-columns:repeat(3,1fr)">${["PIN","Contant","Overboeking"].map(m=>`<button type="button" data-pm="${m}">${m}</button>`).join("")}</div>
 <label>Bedrag (€)<input id="rB" inputmode="decimal" value="${nm(open)}"></label><div class="msg" id="rM"></div>
 <div class="acts"><button class="btn" type="button" id="rX">Annuleren</button><button class="btn p" type="button" id="rOk">${terug?"Terugbetaling vastleggen":"Betaling vastleggen"}</button></div>`);
 const s=()=>d.querySelectorAll("[data-pm]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.pm===pm));s();
 d.querySelector(".methods").onclick=e=>{if(e.target.dataset.pm){pm=e.target.dataset.pm;s()}};d.q("#rX").onclick=()=>d.close();
 d.q("#rOk").onclick=()=>{const b=rnd(num(d.q("#rB").value));if(!(b>0)||b>open+1e-9){d.q("#rM").textContent=`Vul een bedrag in tussen € 0,01 en ${eur(open)}.`;return}
  f.betalingen.push({ts:Date.now(),methode:pm,bedrag:terug?-b:b});f.betaald=rnd(f.betaald+(terug?-b:b));f.rest=rnd(f.totaal-f.betaald);saveC("facturen");d.close();draw()}}

/* ---------- creditfacturen (geheel of gedeeltelijk) ----------
   Een creditfactuur is een eigen factuur met een eigen nummer uit dezelfde reeks en negatieve bedragen; de originele factuur blijft
   ongewijzigd (bewaarplicht). Staat de originele factuur nog open, dan wordt het creditbedrag daarmee verrekend; de rest wordt
   terugbetaald (nu of later). Omzet, btw-overzicht en export tellen de negatieve bedragen vanzelf mee. */
const isCred=f=>!!(f&&f.credit);
const creditsVan=f=>f?D.facturen.filter(c=>c.creditVan===f.id):[];
const creditRuimte=f=>rnd((+f.totaal||0)+creditsVan(f).reduce((s,c)=>s+(+c.totaal||0),0));
const regelRest=(f,i)=>rnd((+f.regels[i].aantal||0)+creditsVan(f).reduce((s,c)=>s+(c.regels||[]).filter(x=>x.bron===i).reduce((a,x)=>a+(+x.aantal||0),0),0));
const magCrediteren=f=>!!f&&!isCred(f)&&can("omzet")&&creditRuimte(f)>0.004;
function betLabel(p){const m=p.methode||"";if(m==="Creditnota")return"Verrekend met creditfactuur "+(p.ref||"");if(m==="Verrekend")return"Verrekend met factuur "+(p.ref||"");return(p.bedrag<0?"Terugbetaald ":"Betaald ")+m}
function creditDlg(f){if(!magCrediteren(f))return;
 const ruimte=creditRuimte(f),k=+f.korting||0,rest=f.regels.map((r,i)=>Math.max(0,regelRest(f,i))),kanRegels=rest.some(x=>x>0.0001)&&f.regels.every(r=>(+r.aantal||0)>=0);
 let modus=kanRegels?"heel":"bedrag",pm="PIN";
 const btwM={};f.regels.forEach(r=>btwM[r.btw]=(btwM[r.btw]||0)+Math.abs(+r.totaal||0));const btwStd=+((Object.entries(btwM).sort((a,b)=>b[1]-a[1])[0]||[21])[0]);
 const d=modal(`<h2>Factuur ${esc(f.nr)} crediteren</h2>
  <div class="note">Factuur ${eur(f.totaal)}${ruimte<f.totaal-0.004?` · al gecrediteerd ${eur(f.totaal-ruimte)}`:""} · nog te crediteren maximaal <b>${eur(ruimte)}</b>${f.rest>0.004?` · nog open ${eur(f.rest)}`:""}</div>
  <div class="seg" id="cM" style="margin:4px 0 12px">${kanRegels?`<button type="button" data-m="heel">Hele factuur</button><button type="button" data-m="regels">Regels kiezen</button>`:""}<button type="button" data-m="bedrag">Vrij bedrag</button></div>
  <div id="cR"><div class="scroll"><table><thead><tr><th>Omschrijving</th><th class="r">Prijs</th><th class="r">Nog te crediteren</th><th class="r" style="width:110px">Crediteren</th></tr></thead><tbody>${f.regels.map((r,i)=>`<tr><td>${esc(r.naam)}</td><td class="r">${eur(r.prijs)}</td><td class="r">${nm(rest[i])}</td><td class="r"><input data-ci="${i}" type="number" min="0" max="${rest[i]}" step="any" value="${nm(rest[i]).replace(",",".")}" style="width:90px;text-align:right" ${rest[i]>0?"":"disabled"}></td></tr>`).join("")}</tbody></table></div>${k?`<small class="mute">De korting van ${nm(k)}% op de factuur wordt ook op de creditering toegepast.</small>`:""}</div>
  <div id="cB" hidden><label>Omschrijving<input id="cBo" maxlength="120" value="Creditering factuur ${esc(f.nr)}"></label>
   <div class="g2"><label>Bedrag incl. btw (€)<input id="cBb" inputmode="decimal" placeholder="bijv. 10,00"></label><label>Btw-tarief<select id="cBt">${[21,9,0].map(x=>`<option value="${x}" ${x===btwStd?"selected":""}>${x}%</option>`).join("")}</select></label></div></div>
  <label>Reden (komt op de creditfactuur)<input id="cRe" maxlength="200" placeholder="Bijvoorbeeld: behandeling deels niet uitgevoerd"></label>
  <label class="chk" id="cVoW" hidden><input type="checkbox" id="cVo" checked> Gecrediteerde producten terug op voorraad</label>
  <div class="note" id="cT" style="margin-top:10px"></div>
  <div id="cTerug" hidden><div class="mute" style="margin:8px 0 6px">Hoe betaal je het bedrag terug?</div><div class="methods" style="grid-template-columns:repeat(4,1fr)">${["PIN","Contant","Overboeking","Later"].map(m=>`<button type="button" data-pm="${m}">${m}</button>`).join("")}</div></div>
  <div class="msg" id="cMsg"></div>
  <div class="acts"><button class="btn" type="button" id="cX">Annuleren</button><button class="btn p" type="button" id="cOk">Creditfactuur maken</button></div>`);
 const q=s=>d.q(s);
 function bereken(){
  if(modus==="bedrag"){const X=rnd(num(q("#cBb").value)),btw=+q("#cBt").value,naam=q("#cBo").value.trim()||"Creditering factuur "+f.nr;
   if(!(X>0))return{fout:"Vul het bedrag in dat je wilt crediteren."};if(X>ruimte+0.004)return{fout:`Je kunt maximaal ${eur(ruimte)} crediteren.`};
   return{regels:[{artId:null,naam,type:"dienst",aantal:-1,prijs:X,btw,totaal:-X,vrij:true}],korting:0,sub:-X,totaal:-X,prod:[]}}
  const regels=[],prod=[];f.regels.forEach((r,i)=>{let n=modus==="heel"?rest[i]:Math.min(rest[i],Math.max(0,num(String((q(`[data-ci="${i}"]`)||{}).value||"0").replace(".",","))));n=Math.round(n*1000)/1000;
   if(n>0){regels.push({artId:r.artId||null,naam:r.naam,type:r.type,aantal:-n,prijs:r.prijs,btw:r.btw,totaal:rnd(-n*r.prijs),bron:i,...(r.vrij?{vrij:true}:{})});if(r.type==="product"&&r.artId)prod.push({artId:r.artId,n})}});
  if(!regels.length)return{fout:"Kies ten minste één regel om te crediteren."};
  const sub=rnd(regels.reduce((s,r)=>s+r.totaal,0));let tot=rnd(sub*(1-k/100));
  if(-tot>ruimte+0.004){if(-tot-ruimte<0.03)tot=-ruimte;else return{fout:`Dit is meer dan er nog te crediteren valt (${eur(ruimte)}). Kies minder regels of een vrij bedrag.`}}
  return{regels,korting:k,sub,totaal:tot,prod}}
 function ui(){d.querySelectorAll("#cM [data-m]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===modus));q("#cR").hidden=modus==="bedrag";q("#cB").hidden=modus!=="bedrag";
  d.querySelectorAll("[data-ci]").forEach(x=>x.disabled=modus==="heel"||!(rest[+x.dataset.ci]>0));
  d.querySelectorAll("[data-pm]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.pm===pm));
  const b=bereken();q("#cMsg").textContent="";if(b.fout){q("#cT").textContent=modus==="bedrag"&&!q("#cBb").value?"Vul een bedrag in.":b.fout;q("#cTerug").hidden=true;q("#cVoW").hidden=true;return b}
  const X=-b.totaal,v=f.rest>0.004?Math.min(rnd(f.rest),X):0,r=rnd(X-v);
  q("#cT").innerHTML=`Creditfactuur: <b>${eur(b.totaal)}</b>${v>0?`<br>Verrekend met wat nog open staat op ${esc(f.nr)}: ${eur(v)}`:""}${r>0.004?`<br>Terug te betalen aan de klant: <b>${eur(r)}</b>`:""}`;
  q("#cTerug").hidden=!(r>0.004);q("#cVoW").hidden=!b.prod.length;return b}
 q("#cM").onclick=e=>{const m=e.target.closest("[data-m]");if(m){modus=m.dataset.m;ui()}};
 d.addEventListener("input",ui);q("#cTerug").onclick=e=>{const m=e.target.closest("[data-pm]");if(m){pm=m.dataset.pm;ui()}};
 q("#cX").onclick=()=>d.close();
 q("#cOk").onclick=()=>{const b=ui();if(b.fout){q("#cMsg").textContent=b.fout;return}
  const now=Date.now(),X=-b.totaal,v=f.rest>0.004?Math.min(rnd(f.rest),X):0,r=rnd(X-v),wie=(typeof cur==="function"&&cur())||null;
  const c={id:uid(),nr:nextNr(),ts:now,klantId:f.klantId||null,hondId:f.hondId||null,afspraakId:null,credit:true,creditVan:f.id,creditNr:f.nr,creditDatum:f.ts,reden:q("#cRe").value.trim(),
   regels:b.regels,korting:b.korting,sub:b.sub,totaal:b.totaal,betalingen:[],betaald:0,rest:0,kassa:bed.kassa||"K1",door:wie&&wie.naam||"",vervalt:null};
  if(v>0){f.betalingen.push({ts:now,methode:"Creditnota",bedrag:v,ref:c.nr});f.betaald=rnd((+f.betaald||0)+v);f.rest=rnd(f.totaal-f.betaald);c.betalingen.push({ts:now,methode:"Verrekend",bedrag:-v,ref:f.nr})}
  if(r>0.004&&pm!=="Later")c.betalingen.push({ts:now,methode:pm,bedrag:-r});
  c.betaald=rnd(c.betalingen.reduce((s,p)=>s+p.bedrag,0));c.rest=rnd(c.totaal-c.betaald);
  D.facturen.push(c);saveC("facturen");
  if(b.prod.length&&q("#cVo").checked){let vc=false;b.prod.forEach(x=>{const a=get("artikelen",x.artId);if(a&&a.type==="product"&&a.voorraad!==""&&a.voorraad!=null){a.voorraad=+a.voorraad+x.n;vc=true}});if(vc)saveC("artikelen")}
  d.close();draw();toast(`Creditfactuur ${c.nr} gemaakt${r>0.004?(pm==="Later"?`; nog ${eur(r)} terug te betalen`:`; ${eur(r)} terugbetaald (${pm})`):""}.`);invDlg(c)};
 ui()}
