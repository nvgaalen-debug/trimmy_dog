/* Trimmy · online.js
   Online boeken aan de kant van de salon: instellingen, blokkades in de agenda (pauze, verlof, administratie)
   en het goedkeuren of afwijzen van aanvragen. Welke tijden een klant ziet, rekent de server uit
   (netlify/lib/beschikbaar.mjs) met dezelfde regels als hieronder. */
"use strict";
const ONLINE0={aan:false,wijze:"direct",nieuweKlant:"aanvraag",nieuwDier:"aanvraag",planning:"slim",interval:15,minUur:2,maxDag:60,annuleerUur:24,kiesMw:true,geenVoorkeur:true,buffer:0,tekst:""};
const onl=()=>({...ONLINE0,...(bed.online&&typeof bed.online==="object"?bed.online:{})});
function boekUrl(){let p=null;try{p=JSON.parse(localStorage.getItem("tr_platform")||"null")}catch(e){}return location.origin+"/boeken"+(p&&p.salon&&p.salon.slug?"?s="+encodeURIComponent(p.salon.slug):"")}

/* ---------- instellingen ---------- */
function onlineUi(){if(!$("#oAan"))return;const o=onl();
 $("#oAan").checked=!!o.aan;$("#oWijze").value=o.wijze;$("#oNieuweKlant").value=o.nieuweKlant;$("#oNieuwDier").value=o.nieuwDier;
 $$('input[name="oPlan"]').forEach(r=>r.checked=r.value===o.planning);
 $("#oInterval").value=String(o.interval);$("#oBuffer").value=o.buffer||0;$("#oMinUur").value=String(o.minUur);$("#oMaxDag").value=String(o.maxDag);$("#oAnnuleer").value=String(o.annuleerUur);
 $("#oKiesMw").checked=!!o.kiesMw;$("#oGeenVoorkeur").checked=!!o.geenVoorkeur;$("#oGeenVoorkeur").disabled=!o.kiesMw;$("#oTekst").value=o.tekst||"";
 $("#oOpen").href=boekUrl();
 const db=typeof dbOn==="function"&&dbOn(),n=D.artikelen.filter(a=>a.type==="dienst"&&a.actief!==false&&a.online!==false&&+a.duur>0).length;
 $("#oStat").className="note"+(o.aan&&(!db||!n)?" w":"");
 $("#oStat").textContent=!db?"Online boeken werkt alleen met de database aan (Koppelingen).":!o.aan?"Staat uit. Zet het aan zodra je regels en behandelingen kloppen; bekijk de boekpagina gerust eerst.":!n?"Er staan geen behandelingen online. Vink hieronder minstens één behandeling aan.":`Staat aan. ${n} behandeling${n===1?"":"en"} online te boeken. Deel de link naar je boekpagina op je website, Instagram of in WhatsApp.`;
 const mws=D.medewerkers;$("#oMwKop").hidden=mws.length<2;
 $("#oDiensten").innerHTML=D.artikelen.filter(a=>a.type==="dienst"&&a.actief!==false).sort(by("naam")).map(a=>`<tr data-oa="${esc(a.id)}"><td><input type="checkbox" data-of="online" aria-label="${esc(a.naam)} online" ${a.online!==false?"checked":""}></td><td>${esc(a.naam)}${+a.duur>0?"":` <small class="mute">(geen duur: niet te boeken)</small>`}</td><td class="r">${+a.duur||0} min</td><td class="r"><input type="number" min="0" max="120" step="5" data-of="buffer" value="${+a.buffer||0}" style="width:70px;text-align:right" aria-label="Buffer ${esc(a.naam)}"></td>${mws.length<2?"":`<td><div class="mwchips">${mws.map(m=>`<label class="chk"><input type="checkbox" data-of="mw" value="${esc(m.id)}" ${!Array.isArray(a.mw)||!a.mw.length||a.mw.includes(m.id)?"checked":""}> ${esc(m.naam)}</label>`).join("")}</div></td>`}</tr>`).join("")||`<tr><td colspan="5" class="empty">Nog geen behandelingen. Voeg ze toe onder Artikelen.</td></tr>`}
function onlineSave(){const o=onl();
 Object.assign(o,{aan:$("#oAan").checked,wijze:$("#oWijze").value,nieuweKlant:$("#oNieuweKlant").value,nieuwDier:$("#oNieuwDier").value,planning:($('input[name="oPlan"]:checked')||{}).value||"slim",
  interval:+$("#oInterval").value||15,buffer:Math.max(0,Math.min(120,Math.round(num($("#oBuffer").value))||0)),minUur:+$("#oMinUur").value,maxDag:+$("#oMaxDag").value,annuleerUur:+$("#oAnnuleer").value,
  kiesMw:$("#oKiesMw").checked,geenVoorkeur:$("#oGeenVoorkeur").checked,tekst:$("#oTekst").value.trim().slice(0,1000)});
 bed.online=o;saveC("bedrijf");onlineUi()}
if($("#oAan")){
 $$('[data-p="online"] .sbody > label select, [data-p="online"] .sbody > .g2 select, [data-p="online"] .sbody > .g2 input, #oAan, #oKiesMw, #oGeenVoorkeur, input[name="oPlan"]').forEach(el=>el.addEventListener("change",onlineSave));
 $("#oTekst").addEventListener("change",onlineSave);
 $("#oDiensten").addEventListener("change",e=>{const tr=e.target.closest("[data-oa]"),a=tr&&get("artikelen",tr.dataset.oa);if(!a)return;const f=e.target.dataset.of;
  if(f==="online")a.online=e.target.checked;
  else if(f==="buffer")a.buffer=Math.max(0,Math.min(120,Math.round(num(e.target.value))||0));
  else if(f==="mw"){const ids=[...tr.querySelectorAll('[data-of="mw"]:checked')].map(x=>x.value);if(!ids.length){e.target.checked=true;toast("Minstens één medewerker moet deze behandeling kunnen doen.");return}a.mw=ids.length===D.medewerkers.length?[]:ids}
  saveC("artikelen")});
 $("#oKopieer").onclick=async()=>{const u=boekUrl();try{await navigator.clipboard.writeText(u);toast("Link gekopieerd: "+u)}catch(x){prompt("Link naar je boekpagina",u)}};
}
{const _di=drawInst;drawInst=function(){_di();onlineUi()}}

/* ---------- blokkades ---------- */
const BLOKSOORT=[["pauze","Pauze"],["verlof","Verlof"],["ziek","Ziek"],["admin","Administratie"],["overig","Geblokkeerd"]];
const blokNaam=b=>(BLOKSOORT.find(x=>x[0]===b.soort)||BLOKSOORT[4])[1];
/* geldt blokkade b op datum (YYYY-MM-DD)? geeft [begin, eind] in minuten of null */
function blokOp(b,datum){if(!b)return null;const van=b.van||b.datum,tot=b.tot||"";if(!van||datum<van)return null;
 if(b.herhaal==="week"){if((tot&&datum>tot)||fromYmd(datum).getDay()!==fromYmd(van).getDay())return null}
 else if(b.herhaal==="dag"){if(tot&&datum>tot)return null}
 else if(datum>(tot||van))return null;
 const s=b.start?toMin(b.start):null,e=b.eind?toMin(b.eind):null;return s!=null&&e!=null&&e>s?[s,e]:[0,1440]}
/* blokkades in een agendakolom: voor een medewerker de eigen plus die voor de hele salon */
function blokkadesVoor(datum,mw){return D.blokkades.map(b=>({b,r:blokOp(b,datum)})).filter(x=>x.r&&(!x.b.mwId||(mw&&mw!=="-"&&x.b.mwId===mw)))}
/* valt een afspraak in een blokkade? (alleen ter waarschuwing; de salon mag altijd zelf inplannen) */
function blokConflict(x){if(!x||!x.datum||!x.start)return null;const s=toMin(x.start),e=s+(+x.duur||30);
 return D.blokkades.find(b=>(!b.mwId||b.mwId===x.mwId)&&(r=>r&&r[0]<e&&r[1]>s)(blokOp(b,x.datum)))||null}
function blokDlg(id,init={}){const b=id?get("blokkades",id):{id:null,van:init.van||ymd(today()),tot:"",start:init.start||"12:00",eind:init.eind||"12:30",herhaal:"",mwId:init.mwId||"",soort:"pauze",notitie:""};if(!b)return;
 const heleDag=!b.start&&!b.eind;
 const d=modal(`<h2>${id?"Blokkade":"Tijd blokkeren"}</h2>
  <p class="mute" style="margin:0 0 10px">Op een geblokkeerde tijd kunnen klanten niet online boeken. In de agenda zie je de blokkade gearceerd.</p>
  <div class="g2"><label>Soort<select id="blS">${BLOKSOORT.map(([v,l])=>`<option value="${v}" ${v===b.soort?"selected":""}>${l}</option>`).join("")}</select></label>
   <label>Voor<select id="blM"><option value="">Hele salon</option>${D.medewerkers.map(m=>`<option value="${esc(m.id)}" ${m.id===b.mwId?"selected":""}>${esc(m.naam)}</option>`).join("")}</select></label></div>
  <div class="g2"><label>Van<input id="blV" type="date" value="${esc(b.van)}"></label><label>Tot en met (optioneel)<input id="blT" type="date" value="${esc(b.tot||"")}"></label></div>
  <label class="chk"><input type="checkbox" id="blH" ${heleDag?"checked":""}> Hele dag</label>
  <div class="g2" id="blTijd" ${heleDag?"hidden":""}><label>Begintijd<input id="blB" type="time" step="900" value="${esc(b.start||"12:00")}"></label><label>Eindtijd<input id="blE" type="time" step="900" value="${esc(b.eind||"12:30")}"></label></div>
  <label>Herhalen<select id="blR"><option value="" ${!b.herhaal?"selected":""}>Niet herhalen</option><option value="week" ${b.herhaal==="week"?"selected":""}>Elke week op deze dag</option><option value="dag" ${b.herhaal==="dag"?"selected":""}>Elke dag</option></select></label>
  <label>Notitie (optioneel)<input id="blN" maxlength="200" value="${esc(b.notitie||"")}"></label>
  <div class="msg" id="blMsg"></div>
  <div class="acts">${id?`<button class="btn d" type="button" id="blDel">Verwijderen</button><span class="sp"></span>`:""}<button class="btn" type="button" id="blX">Annuleren</button><button class="btn p" type="button" id="blOk">Opslaan</button></div>`);
 d.q("#blH").onchange=()=>{d.q("#blTijd").hidden=d.q("#blH").checked};
 d.q("#blX").onclick=()=>d.close();
 d.q("#blOk").onclick=()=>{const v={soort:d.q("#blS").value,mwId:d.q("#blM").value,van:d.q("#blV").value,tot:d.q("#blT").value,herhaal:d.q("#blR").value,notitie:d.q("#blN").value.trim(),start:"",eind:""};
  if(!v.van){d.q("#blMsg").textContent="Kies een begindatum.";return}if(v.tot&&v.tot<v.van){d.q("#blMsg").textContent="De einddatum ligt voor de begindatum.";return}
  if(!d.q("#blH").checked){v.start=d.q("#blB").value;v.eind=d.q("#blE").value;if(!(toMin(v.eind)>toMin(v.start))){d.q("#blMsg").textContent="De eindtijd moet na de begintijd liggen.";return}}
  if(id)Object.assign(b,v);else D.blokkades.push({id:uid(),...v});saveC("blokkades");d.close();draw();
  const n=D.afspraken.filter(a=>!["geannuleerd","noshow","afgerekend"].includes(a.status)&&a.datum>=v.van&&blokConflict(a)===(id?b:D.blokkades[D.blokkades.length-1])).length;
  toast(n?`Opgeslagen. Let op: ${n} afspra${n===1?"ak valt":"ken vallen"} in deze blokkade.`:"Opgeslagen.")};
 if(d.q("#blDel"))d.q("#blDel").onclick=e=>arm(e.target,()=>{D.blokkades=D.blokkades.filter(x=>x.id!==id);saveC("blokkades");d.close();draw()},"Nogmaals: verwijderen")}
if($("#agBlok"))$("#agBlok").onclick=()=>blokDlg(null,{van:ymd(agMode==="dag"?agD:(agDays().some(d=>ymd(d)===ymd(today()))?today():agD)),mwId:agMw||""});

/* ---------- aanvragen goedkeuren of afwijzen ---------- */
function aanvraagGoed(a){a.status="bevestigd";a.goedgekeurd=Date.now();saveC("afspraken");draw();msgDlg(a,"bevestiging")}
function aanvraagAf(a){a.status="geannuleerd";a.afgewezen=Date.now();saveC("afspraken");draw();msgDlg(a,"afwijzing")}
