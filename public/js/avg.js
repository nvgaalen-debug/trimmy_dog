/* Trimmy · avg.js */
"use strict";
/* ---------- AVG: gegevens van één klant exporteren, en oude klantgegevens opruimen ---------- */

/* alles wat over één klant is vastgelegd */
function klantDossier(kid){const k=get("klanten",kid);if(!k)return null;const hIds=new Set(D.honden.filter(h=>h.klantId===kid).map(h=>h.id));
 const van=(c,f)=>D[c].filter(x=>x.klantId===kid||(x.hondId&&hIds.has(x.hondId))).filter(f||(()=>true));
 return{klant:k,honden:D.honden.filter(h=>h.klantId===kid),afspraken:van("afspraken"),behandelingen:van("behandelingen"),facturen:D.facturen.filter(f=>f.klantId===kid),berichten:D.berichten.filter(b=>b.klantId===kid)}}

/* ---------- export: één html-bestand, leesbaar voor de klant én met de gegevens als JSON erin ---------- */
const AVG_LAB={naam:"Naam",straat:"Straat en huisnummer",pc:"Postcode",plaats:"Plaats",tel:"Telefoon",email:"E-mail",notitie:"Notitie",ras:"Ras",geb:"Geboortedatum",geslacht:"Geslacht",chip:"Chipnummer",vacht:"Vacht",gedrag:"Gedrag",medisch:"Medisch",kleur:"Kleur",gewicht:"Gewicht",interval:"Trim-interval (weken)",datum:"Datum",start:"Begintijd",duur:"Duur (min)",status:"Status",diensten:"Behandeling",mw:"Medewerker",mesje:"Mesje",klantNotitie:"Notitie voor de klant",nr:"Factuurnummer",totaal:"Totaal",betaald:"Betaald",open:"Openstaand",tekst:"Bericht",van:"Van",ts:"Tijdstip",door:"Door",opm:"Opmerking",inactief:"Niet meer actief",gecast:"Gecastreerd",hond:"Hond",opgeruimd:"Opgeruimd op"};
const AVG_SKIP=/^(auto|id|klantId|hondId|afspraakId|factuurId|mwId|doorId|behId|salt|pin|gelezen|foto)$/;
function avgWaarde(k,v){if(v==null||v==="")return"";if(typeof v==="boolean")return v?"ja":"nee";
 if((k==="ts"||k==="tijdstip")&&+v>1e11)return new Date(+v).toLocaleString("nl-NL");
 if(k==="van")return v==="salon"?"de salon":"jij";if(["totaal","betaald","open"].includes(k)&&typeof v==="number")return eur(v);
 if(typeof v==="object")return Array.isArray(v)?v.map(x=>typeof x==="object"?Object.values(x).filter(y=>typeof y!=="object").join(" · "):x).join("\n"):JSON.stringify(v);return String(v)}
function avgTabel(o){const r=Object.entries(o).filter(([k,v])=>!AVG_SKIP.test(k)&&avgWaarde(k,v)!=="");return r.length?`<table>${r.map(([k,v])=>`<tr><th>${esc(AVG_LAB[k]||([...SJ.dossier,...SJ.beh].find(f=>f.k===k)||{}).l||k)}</th><td>${esc(avgWaarde(k,v)).replace(/\n/g,"<br>")}</td></tr>`).join("")}</table>`:""}
function klantExport(kid){const x=klantDossier(kid);if(!x)return;const k=x.klant,nu=new Date(),S=bed.naam||"de "+W.zaak;
 const sec=(t,l,f)=>`<h2>${t} <small>(${l.length})</small></h2>`+(l.length?l.map(f).join(""):`<p class="m">Niets vastgelegd.</p>`);
 const datum=a=>(a.datum||"")+" "+(a.start||"");
 const html=`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gegevens van ${esc(k.naam)} bij ${esc(S)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:780px;margin:0 auto;padding:24px 16px;color:#1f1a1e}h1{margin:0 0 4px}h2{margin:28px 0 8px;border-bottom:2px solid #6a3560;padding-bottom:4px}h3{margin:16px 0 6px}small,.m{color:#6b6268}table{border-collapse:collapse;width:100%;margin:0 0 12px}th,td{text-align:left;vertical-align:top;padding:5px 8px;border-bottom:1px solid #e2dbe0}th{width:34%;font-weight:600;color:#4a3f47}img{max-width:180px;border-radius:8px;display:block;margin:6px 0}.card{border:1px solid #e2dbe0;border-radius:8px;padding:8px 12px;margin:0 0 10px}@media print{h2{break-after:avoid}.card{break-inside:avoid}}</style></head><body>
<h1>Gegevens van ${esc(k.naam)}</h1><p class="m">Vastgelegd door ${esc(S)}${bed.kvk?", KvK "+esc(bed.kvk):""} · overzicht gemaakt op ${esc(nu.toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}))}</p>
<p>Dit zijn alle gegevens die ${esc(S)} over jou${SJ.object?" en je "+(x.honden.length>1?W.honden:W.hond):""} bewaart. Onderaan dit bestand staan dezelfde gegevens ook in een vorm die andere programma's kunnen inlezen (JSON). Klopt er iets niet, of wil je dat we gegevens verwijderen? Laat het ons weten${bed.mail?" via "+esc(bed.privacyMail||bed.mail):""}.</p>
${sec("Jouw gegevens",[k],o=>avgTabel(o))}
${!SJ.object?"":sec(W.Honden,x.honden,h=>`<div class="card"><h3>${esc(h.naam)}</h3>${h.foto&&/^data:image\//.test(h.foto)?`<img src="${h.foto}" alt="Foto van ${esc(h.naam)}">`:""}${avgTabel(h)}</div>`)}
${sec("Afspraken",x.afspraken.slice().sort((a,b)=>datum(b).localeCompare(datum(a))),a=>`<div class="card">${avgTabel({...a,hond:SJ.object?(get("honden",a.hondId)||{}).naam:""})}</div>`)}
${sec("Behandelingen en notities",x.behandelingen.slice().sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")),b=>`<div class="card">${avgTabel({...b,hond:SJ.object?(get("honden",b.hondId)||{}).naam:""})}</div>`)}
${sec("Facturen",x.facturen.slice().sort((a,b)=>(b.ts||0)-(a.ts||0)),f=>`<div class="card">${avgTabel(f)}</div>`)}
${sec("Berichten",x.berichten.slice().sort((a,b)=>(a.ts||0)-(b.ts||0)),b=>`<div class="card">${avgTabel(b)}</div>`)}
<h2>Gegevens voor andere programma's</h2><p class="m">Hieronder staan dezelfde gegevens als JSON.</p>
<pre style="white-space:pre-wrap;word-break:break-all;font-size:11px;background:#f3f1f3;padding:10px;border-radius:8px">${esc(JSON.stringify({gemaakt:nu.toISOString(),salon:{naam:bed.naam,kvk:bed.kvk,email:bed.mail},...x},null,1))}</pre>
</body></html>`;
 const naam=("gegevens-"+(k.naam||"klant")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+ymd(today())+".html";
 saveFile(naam,new Blob([html],{type:"text/html"})).then(r=>{if(r==="saved")toast(`Opgeslagen als ${naam}. Stuur dit bestand naar de klant; het opent in elke browser.`)}).catch(e=>toast(e.message))}

/* ---------- opruimen na de bewaartermijn ---------- */
function laatsteContact(kid){const x=klantDossier(kid);let t=0;const d=s=>{const v=s?new Date(String(s).slice(0,10)+"T12:00").getTime():0;return isNaN(v)?0:v};
 x.afspraken.forEach(a=>t=Math.max(t,d(a.datum)));x.behandelingen.forEach(b=>t=Math.max(t,d(b.datum)));
 x.facturen.forEach(f=>t=Math.max(t,+f.ts||d(f.datum)));x.berichten.forEach(b=>t=Math.max(t,+b.ts||0));
 if(!t){const c=parseInt(String(kid).slice(0,8),36);if(c>1.4e12&&c<=Date.now())t=c}/* aanmaakmoment uit de id */
 return t}
function opruimLijst(){const jaren=+bed.privacyJaren||2,grens=new Date(today());grens.setFullYear(grens.getFullYear()-jaren);
 return D.klanten.filter(k=>!k.opgeruimd).map(k=>({k,t:laatsteContact(k.id),f:D.facturen.some(f=>f.klantId===k.id)})).filter(x=>x.t<grens.getTime()).sort((a,b)=>a.t-b.t)}
function klantOpruimen(kid){const x=klantDossier(kid);if(!x)return;const ids=c=>new Set(x[c].map(o=>o.id));
 const weg={afspraken:ids("afspraken"),behandelingen:ids("behandelingen"),berichten:ids("berichten")};
 Object.entries(weg).forEach(([c,s])=>{D[c]=D[c].filter(o=>!s.has(o.id))});
 if(x.facturen.length){/* facturen moeten 7 jaar blijven: alleen wat op de factuur staat, blijft bewaard */
  const k=x.klant;Object.keys(k).forEach(f=>{if(!["id","naam","straat","pc","plaats"].includes(f))delete k[f]});k.opgeruimd=ymd(today());
  x.honden.forEach(h=>{Object.keys(h).forEach(f=>{if(!["id","klantId","naam","ras"].includes(f))delete h[f]});h.inactief=true;h.opgeruimd=ymd(today())})}
 else{D.klanten=D.klanten.filter(k=>k.id!==kid);const hs=new Set(x.honden.map(h=>h.id));D.honden=D.honden.filter(h=>!hs.has(h.id))}}
function opruimDlg(){const L=opruimLijst(),jaren=+bed.privacyJaren||2,fd=t=>t?new Date(t).toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"}):"onbekend";
 const d=modal(`<h2>Oude klantgegevens opruimen</h2>
  <p class="mute" style="margin:0 0 10px">Klanten die langer dan ${jaren} jaar niet zijn geweest (de bewaartermijn uit je privacyverklaring). Klanten <b>zonder</b> facturen verdwijnen helemaal. Bij klanten <b>met</b> facturen blijven alleen naam en adres bewaard, omdat facturen 7 jaar moeten blijven; ${SJ.object?W.honden+", ":""}afspraken, behandelingen, notities en berichten gaan weg.</p>
  ${L.length?`<label class="chk"><input type="checkbox" id="opAll" checked> Alles selecteren</label><div class="oplist">${L.map(x=>`<label class="chk"><input type="checkbox" data-op="${esc(x.k.id)}" checked> <span><b>${esc(x.k.naam||"Zonder naam")}</b> <span class="mute">· laatst ${fd(x.t)} · ${x.f?"naam en adres blijven (facturen)":"helemaal verwijderen"}</span></span></label>`).join("")}</div>`
   :`<div class="note">Er zijn geen klanten die langer dan ${jaren} jaar niet zijn geweest. Je hoeft nu niets op te ruimen.</div>`}
  <div class="msg" id="opM"></div>
  <div class="acts"><span class="sp"></span><button class="btn" type="button" id="opX">${L.length?"Annuleren":"Sluiten"}</button>${L.length?`<button class="btn d" type="button" id="opGo">Opruimen</button>`:""}</div>`);
 const tel=()=>{const n=d.querySelectorAll("[data-op]:checked").length;const b=d.q("#opGo");if(b&&!b.dataset.armed){b.textContent=n?`${n} klant${n===1?"":"en"} opruimen`:"Opruimen";b.disabled=!n}};
 d.q("#opX").onclick=()=>d.close();if(!L.length)return;tel();
 d.q("#opAll").onchange=e=>{d.querySelectorAll("[data-op]").forEach(c=>c.checked=e.target.checked);tel()};
 d.querySelector(".oplist").onchange=tel;
 d.q("#opGo").onclick=e=>arm(e.target,()=>{const ids=[...d.querySelectorAll("[data-op]:checked")].map(c=>c.dataset.op);ids.forEach(klantOpruimen);
  ["klanten","honden","afspraken","behandelingen","berichten"].forEach(saveC);bed.opgeruimdOp=ymd(today());saveC("bedrijf");
  if(ids.includes(selKl))selKl=null;d.close();draw();toast(`${ids.length} klant${ids.length===1?"":"en"} opgeruimd.`)},"Zeker? Dit kan niet ongedaan worden");
}
function avgUi(){const el=$("#avgStat");if(!el)return;const n=opruimLijst().length,j=+bed.privacyJaren||2;
 el.textContent=(n?`${n} klant${n===1?" is":"en zijn"} langer dan ${j} jaar niet geweest.`:`Geen klanten langer dan ${j} jaar niet geweest.`)+(bed.opgeruimdOp?` Laatst opgeruimd op ${new Date(bed.opgeruimdOp+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"})}.`:"");
 el.classList.toggle("w",!!n);$("#avgGo").hidden=!(isAdmin()||can("klantDel"))}
$("#avgGo").onclick=opruimDlg;
