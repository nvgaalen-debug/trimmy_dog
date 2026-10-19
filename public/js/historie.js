/* Trimmy · historie.js */
"use strict";
/* ---------- historie ---------- */
function evts(){const out=[];
 D.behandelingen.forEach(b=>out.push({id:"b:"+b.id,soort:"beh",datum:b.datum,ts:fromYmd(b.datum).getTime()+1,klantId:b.klantId,hondId:b.hondId,b}));
 D.facturen.forEach(f=>out.push({id:"f:"+f.id,soort:"fac",datum:ymd(new Date(f.ts)),ts:f.ts,klantId:f.klantId,hondId:f.hondId,f}));
 D.afspraken.filter(a=>["noshow","geannuleerd"].includes(a.status)).forEach(a=>out.push({id:"a:"+a.id,soort:"mis",datum:a.datum,ts:fromYmd(a.datum).getTime()+toMin(a.start)*6e4,klantId:a.klantId,hondId:a.hondId,a}));
 return out.sort((a,b)=>b.datum.localeCompare(a.datum)||b.ts-a.ts)}
const evText=e=>{const h=get("honden",e.hondId),k=get("klanten",e.klantId);return[h&&h.naam,h&&h.ras,k&&k.naam,e.b&&[e.b.diensten,e.b.notitie,e.b.mw,...SJ.beh.map(f=>e.b[f.k])].join(" "),e.f&&[e.f.nr,...e.f.regels.map(r=>r.naam)].join(" "),e.a&&e.a.notitie].join(" ").toLowerCase()};
function hisRows(L,withDays){let last="",h="";for(const e of L){if(withDays&&e.datum!==last){h+=`<div class="day">${fromYmd(e.datum).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>`;last=e.datum}
  const hd=get("honden",e.hondId),k=get("klanten",e.klantId),who=SJ.object?`<b>${esc(hd?hd.naam:"")}</b>${hd&&hd.ras?` <span class="mute">${esc(hd.ras)}</span>`:""}${k?` · ${esc(k.naam)}`:""}`:(k?`<b>${esc(k.naam)}</b>`:"");
  let kind,body,right="";
  if(e.soort==="beh"){const b=e.b;kind=`<span class="k beh">Behandeling</span>`;const sm=behSamen(b);body=`${who}<br>${esc(b.diensten||"")}${sm.kort?` · <i>${esc(sm.kort)}</i>`:""}<br><small>${esc([...sm.meer,b.mw].filter(Boolean).join(" · "))}</small>${b.notitie?`<div class="note" style="margin-top:6px">${esc(b.notitie)}</div>`:""}`}
  else if(e.soort==="fac"){const f=e.f;kind=`<span class="k fac">Factuur</span>`;body=`${who||`<span class="mute">Losse verkoop</span>`}<br>${esc(f.nr)} · ${esc(f.regels.map(r=>r.naam).join(", "))}`;right=`<b>${eur(f.totaal)}</b>${f.rest>0?`<br><span class="pill amber">Open ${eur(f.rest)}</span>`:""}`}
  else{const a=e.a;kind=`<span class="k mis">${a.status==="noshow"?"Niet gekomen":"Geannuleerd"}</span>`;body=`${who}<br>Afspraak ${a.start}${a.notitie?" · "+esc(a.notitie):""}`}
  h+=`<div class="ev" role="button" tabindex="0" data-ev="${e.id}" style="cursor:pointer"><div>${kind}${withDays?"":`<br><small>${fDate(e.datum)}</small>`}</div><div>${body}</div><div style="text-align:right">${right}</div></div>`}return h}
function drawHis(){const q=$("#hq").value.trim().toLowerCase(),f=$("#hf").value;
 const L=evts().filter(e=>(!f||e.soort===f)&&(!q||evText(e).includes(q))).slice(0,300);
 $("#hList").innerHTML=L.length?hisRows(L,true):`<div class="panel empty">${q||f?"Niets gevonden. Pas de zoekterm of het filter aan.":"Nog geen historie. Behandelingen worden vastgelegd bij het afrekenen."}</div>`}
function openEv(id){const[t,x]=id.split(":");if(t==="b")behDlg(x);else if(t==="f")invDlg(get("facturen",x));else afDlg(x)}
$("#hq").oninput=drawHis;$("#hf").onchange=drawHis;$("#hNew").onclick=()=>behDlg(null);
$("#hList").onclick=e=>{const r=e.target.closest("[data-ev]");if(r)openEv(r.dataset.ev)};
$("#hList").onkeydown=e=>{if(e.key==="Enter"){const r=e.target.closest("[data-ev]");if(r)openEv(r.dataset.ev)}};
function behDlg(id){
 const b=id?get("behandelingen",id):{datum:ymd(today()),hondId:null,klantId:null,diensten:"",mw:(get("medewerkers",lastDoor)||{}).naam||"",...Object.fromEntries(SJ.beh.map(f=>[f.k,f.t==="select"?f.o[0]:""])),notitie:""};
 const d=modal(`<h2>${id?"Behandeling":"Behandeling vastleggen"}</h2>${khHtml(b.klantId)}
  <div class="g2"><label>Datum<input id="bD" type="date" value="${b.datum}"></label><label>Medewerker<input id="bMw" list="mwL" value="${esc(b.mw)}"></label></div><datalist id="mwL">${D.medewerkers.map(m=>`<option value="${esc(m.naam)}">`).join("")}</datalist>
  <label>Behandelingen<input id="bDi" value="${esc(b.diensten)}" placeholder="${esc(SJ.behVb)}"></label>
  ${veldenHtml(SJ.beh,b,"bF_")}
  <label>Interne notitie (alleen voor de salon)<textarea id="bNo" rows="3">${esc(b.notitie)}</textarea></label>
  <label>Notitie voor de klant (zichtbaar in het klantportaal)<textarea id="bKn" rows="2" placeholder="${esc(SJ.knVb)}">${esc(b.klantNotitie||"")}</textarea></label>${b.factuurId?`<small>Hoort bij factuur ${esc((get("facturen",b.factuurId)||{}).nr||"")}</small>`:""}
  <div class="msg" id="bM"></div>
  <div class="acts">${id?`<button class="btn d" type="button" id="bDel">Verwijderen</button><span class="sp"></span>`:""}<button class="btn" type="button" id="bX">Annuleren</button><button class="btn p" type="button" id="bOk">Opslaan</button></div>`);
 khBind(d,b.hondId);d.q("#bX").onclick=()=>d.close();
 d.q("#bOk").onclick=()=>{const k=khKlant(d),h=d.q("#khH").value;if(!k||!h){d.q("#bM").textContent=SJ.object?"Kies een klant en een "+W.hond+".":"Kies een klant.";return}
  const v={klantId:k.id,hondId:h,datum:d.q("#bD").value||ymd(today()),mw:d.q("#bMw").value.trim(),diensten:d.q("#bDi").value.trim(),...veldenLees(SJ.beh,d,"bF_"),notitie:d.q("#bNo").value.trim(),klantNotitie:d.q("#bKn").value.trim()};
  if(id)Object.assign(get("behandelingen",id),v);else D.behandelingen.push({id:uid(),afspraakId:null,factuurId:null,...v});saveC("behandelingen");d.close();draw()};
 if(d.q("#bDel"))d.q("#bDel").onclick=e=>arm(e.target,()=>{D.behandelingen=D.behandelingen.filter(x=>x.id!==id);saveC("behandelingen");d.close();draw()},"Nogmaals: verwijderen");
}
