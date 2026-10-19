/* Trimmy · thuis.js */
"use strict";
/* ---------- startscherm: tegels met icoon en de belangrijkste cijfers ---------- */
const ICO={
 agenda:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/>',
 kassa:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
 klanten:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21 20a6 6 0 0 0-4-5.6"/>',
 berichten:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
 historie:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>',
 facturen:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
 dashboard:'<path d="M5 20v-7M12 20V5M19 20v-11M3 20h18"/>',
 artikelen:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 inst:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',pijl:'<path d="M5 12h14M13 6l6 6-6 6"/>'};
const ico=(k,s=24)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;
function drawStart(){const nu=new Date(),tdy=ymd(today()),uur=nu.getHours(),m=cur(),nuMin=uur*60+nu.getMinutes();
 const groet=uur<6?"Goedenacht":uur<12?"Goedemorgen":uur<18?"Goedemiddag":"Goedenavond";
 const levend=a=>!DEAD.includes(a.status);
 const vandaag=D.afspraken.filter(a=>a.datum===tdy&&levend(a)).sort(by("start"));
 const nogTeKomen=vandaag.filter(a=>toMin(a.start)+(+a.duur||30)>nuMin);
 const afTeRekenen=vandaag.filter(a=>a.status!=="afgerekend"&&toMin(a.start)<=nuMin);
 const volgende=D.afspraken.filter(a=>a.datum>tdy&&levend(a)).sort((a,b)=>(a.datum+a.start).localeCompare(b.datum+b.start))[0];
 const hn=a=>(get("honden",a.hondId)||{}).naam||"",kn=a=>(get("klanten",a.klantId)||{}).naam||"";
 const beurt=beurtLijst(0).length,nieuw=berOngelezen().length,open=D.facturen.filter(f=>(+f.rest||0)>0.004),openSom=open.reduce((s,f)=>s+(+f.rest||0),0);
 const mnd=tdy.slice(0,7),omzetMnd=D.facturen.filter(f=>f.ts&&ymd(new Date(f.ts)).slice(0,7)===mnd).reduce((s,f)=>s+(+f.totaal||0),0);
 const behMnd=D.behandelingen.filter(b=>(b.datum||"").slice(0,7)===mnd).length;
 const berZicht=!!bed.portaal||D.berichten.length>0;
 const T=[
  ["agenda","Agenda",vandaag.length?`${vandaag.length} afspra${vandaag.length===1?"ak":"ken"} vandaag`:"Vandaag vrij",nogTeKomen[0]?`Volgende: ${nogTeKomen[0].start} ${hn(nogTeKomen[0])}`:volgende?`Volgende: ${new Date(volgende.datum+"T12:00").toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} ${volgende.start}`:"Geen afspraken gepland",0],
  ["kassa","Kassa","Afrekenen",afTeRekenen.length?`${afTeRekenen.length} nog af te rekenen`:"Alles van vandaag is afgerekend",afTeRekenen.length],
  ["klanten","Klanten",`${D.klanten.filter(k=>!k.opgeruimd).length} klanten`,beurt?`${beurt} ${beurt===1?"hond":"honden"} weer aan de beurt`:"Niemand achterstallig",beurt],
  berZicht&&["berichten","Berichten",nieuw?`${nieuw} nieuw`:"Geen nieuwe",nieuw?"Uit het klantportaal":"Alles gelezen",nieuw],
  ["historie","Historie","Trimhistorie",`${behMnd} behandeling${behMnd===1?"":"en"} deze maand`,0],
  ["facturen","Facturen",open.length?`${open.length} openstaand`:"Alles betaald",open.length?eur(openSom)+" nog te ontvangen":`${D.facturen.length} facturen`,open.length],
  ["dashboard","Dashboard",eur(omzetMnd).replace(/,00$/,""),"Omzet deze maand",0],
  ["artikelen","Artikelen",`${D.artikelen.length} artikelen`,"Behandelingen en producten",0],
  ["inst","Instellingen","Salon en team","Werktijden, berichten, koppelingen",0]
 ].filter(x=>x&&canTab(x[0]));
 const af=a=>{const voorbij=toMin(a.start)+(+a.duur||30)<=nuMin,bezig=!voorbij&&toMin(a.start)<=nuMin;
  return`<button type="button" class="sa${voorbij?" voorbij":""}${bezig?" bezig":""}" data-af="${esc(a.id)}"><span class="st">${esc(a.start)}</span><i style="background:${esc(mwKleur(a.mwId))}"></i><span class="sn"><b>${esc(hn(a)||"Afspraak")}</b><small>${esc(kn(a))}${bezig?" · nu bezig":a.status==="afgerekend"?" · afgerekend":""}</small></span></button>`};
 $("#startBody").innerHTML=`<div class="shead"><div><h1>${groet}${m?", "+esc(m.naam):""}</h1><p class="mute">${esc(nu.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"}))}${bed.naam?" · "+esc(bed.naam):""}</p></div>
  <div class="acts">${canTab("agenda")?`<button class="btn p" type="button" data-q="af">${ico("plus",18)} Nieuwe afspraak</button>`:""}<button class="btn" type="button" data-q="kl">${ico("klanten",18)} Nieuwe klant</button></div></div>
 <div class="sgrid">
  <div class="tiles2">${T.map(([k,l,big,sub,alert])=>`<button type="button" class="tegel${alert?" let":""}" data-go="${k}"><span class="ti">${ico(k)}</span><span class="tl">${esc(l)}</span><b>${esc(big)}</b><small>${esc(sub)}</small>${alert?`<span class="nb" aria-hidden="true">${alert}</span>`:""}</button>`).join("")}</div>
  ${canTab("agenda")?`<div class="panel svan"><div class="svh"><h2>Vandaag</h2><button class="btn s" type="button" data-go="agenda">Agenda ${ico("pijl",16)}</button></div>
   ${vandaag.length?`<div class="slist">${vandaag.map(af).join("")}</div>`:`<div class="empty">Geen afspraken vandaag.${volgende?` De volgende is op ${esc(new Date(volgende.datum+"T12:00").toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"}))} om ${esc(volgende.start)}.`:""}</div>`}</div>`:""}
 </div>`}
$("#startBody").addEventListener("click",e=>{const g=e.target.closest("[data-go]"),a=e.target.closest("[data-af]"),q=e.target.closest("[data-q]");
 if(g){go(g.dataset.go);return}if(a){afDlg(a.dataset.af);return}
 if(q){if(q.dataset.q==="af"){const n=new Date(),mm=Math.ceil((n.getHours()*60+n.getMinutes())/15)*15;afDlg(null,{datum:ymd(today()),start:toHM(Math.min(Math.max(mm,salonTijd()[0]),salonTijd()[1]-30))})}
  else{go("klanten");klantDlg(null,k=>{selKl=k.id;drawKl();hondDlg(null,k.id)})}}});
setInterval(()=>{if(tab==="start"&&!document.querySelector("dialog[open]")&&document.visibilityState==="visible")drawStart()},60000);
