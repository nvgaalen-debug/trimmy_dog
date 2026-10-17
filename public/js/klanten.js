/* Trimmy · klanten.js */
"use strict";
/* ---------- klanten ---------- */
let selKl=null;
function drawKl(){
 const q=$("#klq").value.trim().toLowerCase();
 const L=D.klanten.slice().sort(by("naam")).filter(k=>{if(!q)return true;const hs=D.honden.filter(h=>h.klantId===k.id).map(h=>h.naam+" "+h.ras);return[k.naam,k.plaats,k.tel,k.email,...hs].join(" ").toLowerCase().includes(q)});
 if(!selKl||!get("klanten",selKl))selKl=L[0]?L[0].id:null;
 $("#klList").innerHTML=L.length?L.map(k=>{const hs=D.honden.filter(h=>h.klantId===k.id&&!h.inactief);return`<button type="button" class="ki" data-k="${k.id}" aria-current="${k.id===selKl}"><b>${esc(k.naam)}</b><small>${esc(hs.map(h=>h.naam).join(", ")||"Geen honden")}${k.plaats?" · "+esc(k.plaats):""}</small></button>`}).join(""):`<div class="empty">${D.klanten.length?"Geen klant gevonden.":"Nog geen klanten. Maak de eerste aan met Nieuwe klant."}</div>`;
 const k=get("klanten",selKl),el=$("#klDet");
 if(!k){el.innerHTML=`<div class="empty">Kies links een klant.</div>`;return}
 const hs=D.honden.filter(h=>h.klantId===k.id).sort((a,b)=>(a.inactief?1:0)-(b.inactief?1:0));
 const tdy=ymd(today());
 const kom=D.afspraken.filter(a=>a.klantId===k.id&&a.datum>=tdy&&!["geannuleerd","afgerekend"].includes(a.status)).sort((a,b)=>(a.datum+a.start).localeCompare(b.datum+b.start));
 const fs=D.facturen.filter(f=>f.klantId===k.id),open=fs.reduce((s,f)=>s+f.rest,0),omzet=fs.reduce((s,f)=>s+f.totaal,0);
 const mis=D.afspraken.filter(a=>a.klantId===k.id&&a.status==="noshow").length;
 el.innerHTML=`<div class="det"><div class="hdr"><div><h2>${esc(k.naam)}</h2><div class="mute">${fs.length} facturen · ${eur(omzet)} totaal${open>0?` · <b style="color:var(--warn)">${eur(open)} open</b>`:""}${mis?` · <span style="color:var(--warn)">${mis}× niet gekomen</span>`:""}</div></div><div class="acts"><button class="btn" type="button" data-act="kMsg">Bericht sturen</button><button class="btn" type="button" data-act="kEdit">Gegevens wijzigen</button><button class="btn p" type="button" data-act="kAf">Afspraak maken</button></div></div>
 <div class="kv"><div><span>Adres</span>${esc(k.straat||"–")}<br>${esc([k.pc,k.plaats].filter(Boolean).join(" "))}</div><div><span>Telefoon</span>${esc(k.tel||"–")}</div><div><span>E-mail</span>${esc(k.email||"–")}</div>${k.notitie?`<div><span>Notitie</span>${esc(k.notitie)}</div>`:""}</div>
 <div class="sec"><div class="hdr"><h3>Honden</h3><button class="btn s" type="button" data-act="hNew">Hond toevoegen</button></div>
 ${hs.length?`<div class="dogs">${hs.map(h=>{const last=D.behandelingen.filter(b=>b.hondId===h.id).sort((a,b)=>b.datum.localeCompare(a.datum))[0];
  return`<div class="dog ${h.inactief?"inact":""}"><div class="av" style="${h.foto?`background-image:url(${h.foto})`:""}">${h.foto?"":esc(h.naam[0]||"?")}</div><div><b style="font:700 17px var(--f-d)">${esc(h.naam)}</b>${h.inactief?` <span class="pill">Niet actief</span>`:""}<div class="meta">${esc([h.ras,leeftijd(h.geb),h.geslacht&&(h.geslacht+(h.gecast?", gecastreerd":""))].filter(Boolean).join(" · "))}</div></div>
  <div class="meta">${esc([h.gewicht!==""&&h.gewicht!=null?nm(h.gewicht)+" kg":"",h.vacht,h.kleur].filter(Boolean).join(" · "))}${h.chip?`<br>Chip ${esc(h.chip)}`:""}</div>
  <div class="meta">${last?`Laatst: ${fDate(last.datum)}${last.mesje?" · "+esc(last.mesje):""}`:"Nog geen behandelingen"}</div>
  ${h.medisch?`<div class="note w">Medisch: ${esc(h.medisch)}</div>`:""}${h.gedrag?`<div class="note${/angst|bijt|hap|lastig|niet/i.test(h.gedrag)?" w":""}">Gedrag: ${esc(h.gedrag)}</div>`:""}${h.notitie?`<div class="note">${esc(h.notitie)}</div>`:""}
  <div class="acts"><button class="btn s" type="button" data-act="hEdit" data-h="${h.id}">Wijzigen</button><button class="btn s" type="button" data-act="hAf" data-h="${h.id}">Afspraak</button><button class="btn s" type="button" data-act="hHis" data-h="${h.id}">Historie</button></div></div>`}).join("")}</div>`:`<div class="empty" style="padding:12px">Nog geen honden. Voeg de eerste hond toe.</div>`}</div>
 <div class="sec"><h3>Komende afspraken</h3>${kom.length?`<div class="scroll"><table><tbody>${kom.map(a=>`<tr class="click" data-af="${a.id}"><td style="white-space:nowrap">${fDate(a.datum)} ${a.start}</td><td>${esc((get("honden",a.hondId)||{}).naam||"")}</td><td>${esc((a.diensten||[]).map(i=>(get("artikelen",i)||{}).naam).filter(Boolean).join(", "))}</td><td><span class="pill ${statCls(a.status)}">${statLab(a.status)}</span></td></tr>`).join("")}</tbody></table></div>`:`<div class="mute">Geen komende afspraken.</div>`}</div>
 <div class="sec"><h3>Historie</h3>${hisRows(evts().filter(e=>e.klantId===k.id).slice(0,30))||`<div class="mute">Nog geen historie.</div>`}</div></div>`;
}
$("#klq").oninput=drawKl;$("#klNew").onclick=()=>klantDlg(null,k=>{selKl=k.id;drawKl();hondDlg(null,k.id)});
$("#klList").onclick=e=>{const b=e.target.closest("[data-k]");if(b){selKl=b.dataset.k;drawKl();if(innerWidth<900)$("#klDet").scrollIntoView({behavior:"smooth"})}};
$("#klDet").onclick=e=>{const b=e.target.closest("[data-act],[data-af],[data-ev]");if(!b)return;
 if(b.dataset.af)return afDlg(b.dataset.af);if(b.dataset.ev)return openEv(b.dataset.ev);
 const a=b.dataset.act,h=b.dataset.h;
 if(a==="kMsg")msgDlg({klantId:selKl},"vrij");else if(a==="kEdit")klantDlg(selKl);else if(a==="kAf")afDlg(null,{klantId:selKl,datum:ymd(today()),start:"09:00"});
 else if(a==="hNew")hondDlg(null,selKl);else if(a==="hEdit")hondDlg(h,selKl);
 else if(a==="hAf")afDlg(null,{klantId:selKl,hondId:h,datum:ymd(today()),start:"09:00"});
 else if(a==="hHis"){$("#hq").value=get("honden",h).naam;$("#hf").value="";go("historie")}};
