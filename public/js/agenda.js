/* Trimmy · agenda.js */
"use strict";
/* ---------- agenda ---------- */
let agD=today(),agMode=S.get("agmode","week"),agMw=S.get("agmw","");
const PXM=1.1;
function agDays(){if(agMode==="dag")return[new Date(agD)];const s=weekStart(agD);return Array.from({length:bed.zondag?7:6},(_,i)=>addDays(s,i))}
function lanes(list){const out=[];let cl=[],ends=[],cmax=0;const flush=()=>{cl.forEach(x=>x.n=ends.length);cl=[];ends=[]};
 list.slice().sort((a,b)=>toMin(a.start)-toMin(b.start)).forEach(a=>{const s=toMin(a.start),e=s+(+a.duur||30);if(cl.length&&s>=cmax)flush();
  let L=ends.findIndex(x=>x<=s);if(L<0){L=ends.length;ends.push(e)}else ends[L]=e;cmax=cl.length?Math.max(cmax,e):e;const it={a,L};cl.push(it);out.push(it)});flush();return out}
function drawAg(){
 const o=(+bed.open||8)*60,c=Math.max(o+60,(+bed.sluit||18)*60),H=(c-o)*PXM,days=agDays(),tdy=ymd(today());
 $("#agMw").innerHTML=`<option value="">Alle medewerkers</option>`+D.medewerkers.map(m=>`<option value="${m.id}" ${m.id===agMw?"selected":""}>${esc(m.naam)}</option>`).join("");
 $$("#agSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===agMode));
 if(agMode==="week"){const a=days[0],b=days[days.length-1];const wk=isoWeek(a);
  $("#agLabel").textContent=`Week ${wk} · ${a.getDate()} ${a.toLocaleDateString("nl-NL",{month:"short"})} – ${b.getDate()} ${b.toLocaleDateString("nl-NL",{month:"short",year:"numeric"})}`}
 else $("#agLabel").textContent=agD.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 let cols;
 if(agMode==="week")cols=days.map(d=>({date:ymd(d),mw:agMw||null,head:`${d.toLocaleDateString("nl-NL",{weekday:"short"})} ${d.getDate()}`,sub:"",today:ymd(d)===tdy}));
 else{const ds=ymd(agD);const ms=D.medewerkers.filter(m=>!agMw||m.id===agMw);cols=ms.map(m=>({date:ds,mw:m.id,head:m.naam,sub:"",today:false,kleur:m.kleur}));
  if(!agMw&&D.afspraken.some(a=>a.datum===ds&&!get("medewerkers",a.mwId)))cols.push({date:ds,mw:"-",head:"Zonder medewerker",today:false});
  if(!cols.length)cols=[{date:ds,mw:null,head:"Afspraken",today:false}]}
 const ag=$("#ag");ag.style.gridTemplateColumns=`52px repeat(${cols.length},minmax(${agMode==="week"?110:160}px,1fr))`;
 let h=`<div class="hd"></div>`+cols.map(x=>`<div class="hd ${x.today?"today":""}">${esc(x.head)}${x.kleur?` <i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${x.kleur}"></i>`:""}</div>`).join("");
 h+=`<div class="tcol" style="height:${H}px">`;for(let m=o+60;m<c;m+=60)h+=`<span style="top:${(m-o)*PXM}px">${toHM(m)}</span>`;h+=`</div>`;
 const nowM=new Date().getHours()*60+new Date().getMinutes();
 for(const x of cols){
  const list=D.afspraken.filter(a=>a.datum===x.date&&(x.mw==null||(x.mw==="-"?!get("medewerkers",a.mwId):a.mwId===x.mw)));
  const dicht=fromYmd(x.date).getDay()===0&&!bed.zondag;
  const wt=x.mw&&x.mw!=="-"?werkTijd(x.mw,fromYmd(x.date)):undefined,vrij=wt===null;
  h+=`<div class="col ${dicht||vrij?"dicht":""}" data-date="${x.date}" data-mw="${x.mw==="-"?"none":(x.mw||"")}" style="height:${H}px;--hh:${60*PXM}px" ${vrij?`title="${esc((get("medewerkers",x.mw)||{}).naam||"")} werkt niet op deze dag"`:""}>`;
  if(wt){if(wt[0]>o)h+=`<div class="off" style="top:0;height:${(Math.min(wt[0],c)-o)*PXM}px"></div>`;if(wt[1]<c)h+=`<div class="off" style="top:${(Math.max(wt[1],o)-o)*PXM}px;height:${(c-Math.max(wt[1],o))*PXM}px"></div>`}
  for(const it of lanes(list)){const a=it.a,s=toMin(a.start),top=Math.max(0,(s-o)*PXM),ht=Math.max(22,(+a.duur||30)*PXM-2);
   const hd=get("honden",a.hondId),kl=get("klanten",a.klantId),w=100/it.n;
   const dn=(a.diensten||[]).map(i=>(get("artikelen",i)||{}).naam).filter(Boolean).join(", ");
   const dbl=conflicts(a).length;
   h+=`<button type="button" class="blk ${["noshow","geannuleerd"].includes(a.status)?"x":""} ${a.status==="afgerekend"?"paid":""} ${dbl?"dbl":""}" data-af="${a.id}" style="--mw:${mwKleur(a.mwId)};top:${top}px;height:${ht}px;left:calc(${it.L*w}% + 2px);width:calc(${w}% - 4px)" title="${esc(a.start+" "+(hd?hd.naam:"")+" · "+dn)}">${dbl?`<span class="flag">Dubbel</span>`:""}<span class="t">${a.start}–${toHM(s+(+a.duur||30))}${a.status!=="gepland"?" · "+esc(statLab(a.status)):""}</span><b>${esc(hd?hd.naam:"Geen hond")}${hd&&hd.ras?` <span class="t">${esc(hd.ras)}</span>`:""}</b>${ht>40?`<span>${esc(kl?kl.naam:"")}</span>`:""}${ht>58&&dn?`<br><span class="t">${esc(dn)}</span>`:""}${a.status!=="afgerekend"?`<span class="rz" aria-hidden="true"></span>`:""}</button>`}
  if(x.date===tdy&&nowM>o&&nowM<c)h+=`<div class="now" style="top:${(nowM-o)*PXM}px"></div>`;
  h+=`</div>`}
 ag.innerHTML=h;
 $("#agLeg").innerHTML=D.medewerkers.map(m=>`<span style="--mw:${m.kleur}"><i></i>${esc(m.naam)}</span>`).join("")+`<span>Klik op een leeg vak om een afspraak te maken.</span>`;
 // dagoverzicht
 const ds=agMode==="dag"?ymd(agD):(days.some(d=>ymd(d)===tdy)?tdy:ymd(days[0]));
 const L=D.afspraken.filter(a=>a.datum===ds&&(!agMw||a.mwId===agMw)).sort((a,b)=>toMin(a.start)-toMin(b.start));
 $("#agList").innerHTML=`<h3>${ds===tdy?"Vandaag":fromYmd(ds).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})} · ${L.length} afspra${L.length===1?"ak":"ken"}</h3><div class="panel scroll"><table><tbody>${L.length?L.map(a=>{const hd=get("honden",a.hondId),kl=get("klanten",a.klantId),m=get("medewerkers",a.mwId);
  return`<tr class="click" data-af="${a.id}"><td style="white-space:nowrap"><b>${a.start}</b> <span class="mute">${a.duur} min</span></td><td><b>${esc(hd?hd.naam:"–")}</b> <span class="mute">${esc(hd?hd.ras:"")}</span><br><small>${esc(kl?kl.naam+(kl.tel?" · "+kl.tel:""):"")}</small></td><td>${esc((a.diensten||[]).map(i=>(get("artikelen",i)||{}).naam).filter(Boolean).join(", "))}${hd&&(hd.medisch||hd.gedrag)?`<br><small style="color:var(--warn)">${esc([hd.medisch,hd.gedrag].filter(Boolean).join(" · "))}</small>`:""}</td><td>${esc(m?m.naam:"")}</td><td><span class="pill ${statCls(a.status)}">${esc(statLab(a.status))}</span>${a.bevestigd&&!a.herinnerd?` <span class="pill acc">Bevestiging verstuurd</span>`:""}${a.herinnerd?` <span class="pill acc">Herinnerd</span>`:planFor(a.id)?` <span class="pill">Herinnering ${fDT(planFor(a.id).sendAt)}</span>`:""}${conflicts(a).length?` <span class="pill warn">Dubbel</span>`:""}</td></tr>`}).join(""):`<tr><td class="empty">Geen afspraken op deze dag.</td></tr>`}</tbody></table></div>`;
}
$("#agPrev").onclick=()=>{agD=addDays(agD,agMode==="week"?-7:-1);drawAg()};
$("#agNext").onclick=()=>{agD=addDays(agD,agMode==="week"?7:1);drawAg()};
$("#agToday").onclick=()=>{agD=today();drawAg()};
$("#agSeg").onclick=e=>{const m=e.target.dataset.m;if(m){agMode=m;S.set("agmode",m);drawAg()}};
$("#agMw").onchange=e=>{agMw=e.target.value;S.set("agmw",agMw);drawAg()};
$("#agNew").onclick=()=>afDlg(null,{datum:ymd(agMode==="dag"?agD:(agDays().some(d=>ymd(d)===ymd(today()))?today():agD)),start:"09:00",mwId:agMw||""});
$("#ag").onclick=e=>{const b=e.target.closest(".blk");if(b){if(e.detail===0)afDlg(b.dataset.af);return}
 const col=e.target.closest(".col");if(!col)return;const r=col.getBoundingClientRect();const o=(+bed.open||8)*60;
 const m=Math.max(o,Math.min((+bed.sluit||18)*60-15,o+Math.floor((e.clientY-r.top)/PXM/15)*15));
 afDlg(null,{datum:col.dataset.date,start:toHM(m),mwId:col.dataset.mw||agMw||""})};
$("#agList").onclick=e=>{const r=e.target.closest("[data-af]");if(r)afDlg(r.dataset.af)};
$("#agRem").onclick=remDlg;
/* slepen en duur aanpassen */
const snap15=m=>Math.round(m/15)*15;let drag=null;
$("#ag").addEventListener("pointerdown",e=>{const b=e.target.closest(".blk");if(!b||e.button>0)return;const a=get("afspraken",b.dataset.af);if(!a)return;
 const touch=e.pointerType!=="mouse"&&e.pointerType!=="pen";
 drag={a,b,id:e.pointerId,rz:e.target.classList.contains("rz"),x0:e.clientX,y0:e.clientY,offY:e.clientY-b.getBoundingClientRect().top,moved:false,ghost:null,t:null,touch,armed:!touch&&bed.slepen!=="uit"};
 /* telefoon/tablet: eerst even ingedrukt houden, anders is het scrollen */
 if(touch&&bed.slepen!=="uit")drag.timer=setTimeout(()=>{if(!drag||drag.b!==b)return;drag.armed=true;b.classList.add("lift");try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}},450);
 try{if(!touch)b.setPointerCapture(e.pointerId)}catch(x){}});
/* zolang er gesleept wordt niet scrollen (iOS) */
document.addEventListener("touchmove",e=>{if(drag&&drag.armed)e.preventDefault()},{passive:false});
$("#ag").addEventListener("pointermove",e=>{const g=drag;if(!g||e.pointerId!==g.id)return;
 if(!g.moved){const far=Math.hypot(e.clientX-g.x0,e.clientY-g.y0)>=(g.touch?10:6);
  if(!g.armed){if(far){clearTimeout(g.timer);if(g.touch){drag=null;return}g.dead=true}return}
  if(!far)return;try{g.b.setPointerCapture(e.pointerId)}catch(x){}
  if(g.a.status==="afgerekend"){drag=null;toast("Deze afspraak is al afgerekend en kan niet meer verschuiven.");return}
  g.moved=true;g.b.classList.add("drag-src");g.ghost=document.createElement("div");g.ghost.className="ghost"}
 e.preventDefault();
 const o=(+bed.open||8)*60,c=Math.max(o+60,(+bed.sluit||18)*60);let col,start,duur=+g.a.duur||30;
 if(g.rz){col=g.b.closest(".col");const r=col.getBoundingClientRect();start=toMin(g.a.start);duur=Math.max(15,Math.min(c,snap15(o+(e.clientY-r.top)/PXM))-start)}
 else{const el=document.elementFromPoint(e.clientX,e.clientY);col=(el&&el.closest&&el.closest("#ag .col"))||(g.t?g.t.col:g.b.closest(".col"));const r=col.getBoundingClientRect();start=Math.max(o,Math.min(c-15,snap15(o+(e.clientY-g.offY-r.top)/PXM)))}
 if(g.ghost.parentNode!==col)col.append(g.ghost);
 const x={id:g.a.id,datum:col.dataset.date,start:toHM(start),duur,mwId:col.dataset.mw==="none"?"":(col.dataset.mw||g.a.mwId||""),status:g.a.status};
 g.t={col,x};const cf=conflicts(x).length;
 g.ghost.style.top=(start-o)*PXM+"px";g.ghost.style.height=Math.max(20,duur*PXM-2)+"px";g.ghost.classList.toggle("bad",!!cf);g.ghost.textContent=`${toHM(start)}–${toHM(start+duur)}${cf?" · dubbel":""}`});
function dragEnd(e){const g=drag;if(!g||e.pointerId!==g.id)return;drag=null;clearTimeout(g.timer);g.b.classList.remove("lift");
 if(!g.moved){if(e.type==="pointerup"&&!g.dead)afDlg(g.a.id);return}
 if(g.ghost)g.ghost.remove();g.b.classList.remove("drag-src");
 if(e.type!=="pointerup"||!g.t){drawAg();return}
 const x=g.t.x,a=g.a;if(x.datum===a.datum&&x.start===a.start&&x.duur===(+a.duur||30)&&x.mwId===(a.mwId||"")){drawAg();return}
 moveAf(a,{datum:x.datum,start:x.start,duur:x.duur,mwId:x.mwId},g.rz)}
$("#ag").addEventListener("pointerup",dragEnd);$("#ag").addEventListener("pointercancel",dragEnd);
function moveAf(a,nv,rz){const x={...a,...nv},c=conflicts(x);
 if(bed.slepen==="direct"&&!c.length)return moveDo(a,nv,rz);
 if(bed.dubbel==="blokkeer"&&c.length){drawAg();toast(confText(x,c)+" Dubbele boekingen zijn uitgezet bij Instellingen.");return}
 const h=get("honden",a.hondId)||{},k=get("klanten",a.klantId)||{},mw=id=>(get("medewerkers",id)||{}).naam||"geen medewerker";
 const dag=(d,t)=>fromYmd(d).toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})+" "+t;
 const wat=rz?`Duur van <b>${a.duur||30}</b> naar <b>${nv.duur}</b> minuten (${a.start}–${toHM(toMin(a.start)+nv.duur)}).`
  :`Van <b>${esc(dag(a.datum,a.start))}</b>${a.mwId!==nv.mwId?" bij "+esc(mw(a.mwId)):""}<br>naar <b>${esc(dag(nv.datum,nv.start))}</b>${a.mwId!==nv.mwId?" bij "+esc(mw(nv.mwId)):""}`;
 const d=modal(`<h2>${rz?"Duur aanpassen?":"Afspraak verplaatsen?"}</h2><p style="margin:0 0 6px"><b>${esc(h.naam||"Afspraak")}</b>${k.naam?` · ${esc(k.naam)}`:""}</p><p style="margin:0">${wat}</p>
  ${c.length?`<div class="note w">Dubbele boeking: ${esc(confText(x,c))}</div>`:""}
  ${!rz&&(k.tel||k.email)?`<label class="chk"><input type="checkbox" id="mvMsg" checked> Klant daarna informeren</label>`:""}
  <div class="acts"><button class="btn" type="button" id="cX">Annuleren</button><button class="btn p" type="button" id="cOk">${rz?"Aanpassen":c.length?"Toch verplaatsen":"Verplaatsen"}</button></div>`);
 setTimeout(()=>d.q("#cX").focus(),30);
 d.q("#cX").onclick=()=>{d.close()};d.addEventListener("close",()=>drawAg());
 d.q("#cOk").onclick=()=>{const tell=d.q("#mvMsg")&&d.q("#mvMsg").checked;d.close();moveDo(a,nv,rz,tell)}}
function moveDo(a,nv,rz,tell){
 const apply=()=>{const old={datum:a.datum,start:a.start,duur:a.duur,mwId:a.mwId};Object.assign(a,nv);saveC("afspraken");drawAg();const h=(get("honden",a.hondId)||{}).naam||"Afspraak";
  if(tell){msgDlg(a,"wijziging");return}
  toast(rz?`${h}: duur nu ${a.duur} minuten`:`${h} verplaatst naar ${fromYmd(a.datum).toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} ${a.start}`,[["Ongedaan maken",()=>{Object.assign(a,old);saveC("afspraken");drawAg()}],...(rz?[]:[["Klant informeren",()=>msgDlg(a,"wijziging")]])],10000)};
 return apply()}
/* klant + hond kiezer */
function khHtml(kId){const k=get("klanten",kId);return`<label>Klant<input id="khK" list="khL" autocomplete="off" value="${k?esc(klLab(k)):""}" placeholder="Typ een naam"></label><datalist id="khL">${D.klanten.slice().sort(by("naam")).map(k=>`<option value="${esc(klLab(k))}">${esc(k.tel||"")}</option>`).join("")}</datalist><label>Hond<select id="khH"></select></label>`}
const khKlant=d=>{const v=d.q("#khK").value.trim().toLowerCase();if(!v)return null;return D.klanten.find(k=>klLab(k).toLowerCase()===v)||D.klanten.find(k=>k.naam.toLowerCase()===v)||null};
function khBind(d,hId,cb){const fill=()=>{const k=khKlant(d);const hs=k?D.honden.filter(h=>h.klantId===k.id&&(!h.inactief||h.id===hId)):[];
  d.q("#khH").innerHTML=`<option value="">${k?(hs.length?"Kies een hond":"Nog geen hond bij deze klant"):"Kies eerst een klant"}</option>`+hs.map(h=>`<option value="${h.id}" ${h.id===hId?"selected":""}>${esc(h.naam)}${h.ras?" · "+esc(h.ras):""}</option>`).join("");
  if(hs.length===1&&!d.q("#khH").value)d.q("#khH").value=hs[0].id;cb&&cb()};
 d.q("#khK").addEventListener("input",()=>{hId=null;fill()});d.q("#khH").addEventListener("change",()=>cb&&cb());fill();
 return{set(k,h){d.q("#khK").value=k?klLab(k):"";hId=h||null;fill()}}}

/* afspraak dialoog */
function afDlg(id,init={}){
 const a=id?get("afspraken",id):{id:null,datum:init.datum||ymd(today()),start:init.start||"09:00",duur:60,klantId:init.klantId||null,hondId:init.hondId||null,mwId:init.mwId||"",diensten:[],status:"gepland",notitie:"",factuurId:null};
 if(!a)return;
 const dien=D.artikelen.filter(x=>x.type==="dienst"&&(x.actief||(a.diensten||[]).includes(x.id)));
 const d=modal(`<h2>${id?"Afspraak":"Nieuwe afspraak"}</h2>
  ${khHtml(a.klantId)}
  <div class="acts l" style="margin-top:-4px"><button class="btn s" type="button" id="afNk">Nieuwe klant</button><button class="btn s" type="button" id="afNh">Hond toevoegen</button><button class="btn s" type="button" id="afKk" ${a.klantId?"":"hidden"}>Klantkaart openen</button></div>
  <div class="note w" id="afHw" hidden></div>
  <div><div style="font-weight:500;font-size:14px;margin-bottom:4px">Behandelingen</div><div class="chk-list">${dien.map(x=>`<label class="chk"><input type="checkbox" value="${x.id}" ${(a.diensten||[]).includes(x.id)?"checked":""}> ${esc(x.naam)} <small>${x.duur||0} min</small></label>`).join("")||`<span class="mute">Nog geen behandelingen. Voeg ze toe onder Artikelen.</span>`}</div></div>
  <div class="g2"><label>Datum<input id="afD" type="date" value="${a.datum}"></label><label>Begintijd<input id="afS" type="time" step="900" value="${a.start}"></label></div>
  <div class="g2"><label>Duur (minuten)<input id="afDu" type="number" min="5" step="5" value="${a.duur}"></label><label>Medewerker<select id="afM"><option value="">Geen</option>${D.medewerkers.map(m=>`<option value="${m.id}" ${m.id===a.mwId?"selected":""}>${esc(m.naam)}</option>`).join("")}</select></label></div>
  <label>Status<select id="afSt">${STAT.map(s=>`<option value="${s[0]}" ${s[0]===a.status?"selected":""} ${s[0]==="afgerekend"&&!a.factuurId?"disabled":""}>${s[1]}</option>`).join("")}</select></label>
  <label>Notitie<textarea id="afN" rows="2">${esc(a.notitie)}</textarea></label>
  <label class="chk"><input type="checkbox" id="afBev" ${!id&&S.get("bevauto",1)?"checked":""}> <span id="afBevL">${id?"Wijziging na opslaan aan de klant doorgeven (WhatsApp of e-mail)":"Na opslaan bevestiging sturen (WhatsApp of e-mail)"}</span></label>
  ${a.bevestigd?`<small>Bevestiging verstuurd op ${fDT(a.bevestigd)}${a.herinnerd?` · herinnering op ${fDT(a.herinnerd)}`:""}</small>`:a.herinnerd?`<small>Herinnering verstuurd op ${fDT(a.herinnerd)}</small>`:""}
  <div class="note" id="afC" hidden></div><div class="msg" id="afMsg"></div>
  <div class="acts">${id?`<button class="btn d" type="button" id="afDel">Verwijderen</button><span class="sp"></span>`:""}
   ${id&&a.klantId?`<button class="btn" type="button" id="afMsgB">Klant berichten</button>`:""}
   <button class="btn" type="button" id="afX">Annuleren</button>
   ${id&&a.status!=="afgerekend"?`<button class="btn" type="button" id="afPay">Opslaan en afrekenen</button>`:""}
   ${a.factuurId?`<button class="btn" type="button" id="afInv">Factuur bekijken</button>`:""}
   <button class="btn p" type="button" id="afOk">Opslaan</button></div>`);
 const upd=()=>{const k=khKlant(d),h=get("honden",d.q("#khH").value);d.q("#afKk").hidden=!k;
  const w=h?[h.medisch&&"Medisch: "+h.medisch,h.gedrag&&"Gedrag: "+h.gedrag].filter(Boolean):[];d.q("#afHw").hidden=!w.length;d.q("#afHw").textContent=w.join(" · ");conf()};
 const kh=khBind(d,a.hondId,upd);
 function conf(){const x={id:a.id,datum:d.q("#afD").value,start:d.q("#afS").value,duur:num(d.q("#afDu").value),mwId:d.q("#afM").value,status:d.q("#afSt").value},c=conflicts(x);
  const rw=roosterWaarschuwing(x),tx=[c.length?"Dubbele boeking: "+confText(x,c)+(bed.dubbel==="blokkeer"?" Dubbele boekingen zijn niet toegestaan.":""):"",rw].filter(Boolean).join(" ");
  d.q("#afC").hidden=!tx;d.q("#afC").className="note w";d.q("#afC").textContent=tx;
  if(d.ok2){d.ok2=0;d.q("#afOk").textContent="Opslaan";d.q("#afMsg").textContent=""}}
 d.querySelectorAll(".chk-list input").forEach(cb=>cb.onchange=()=>{const sel=[...d.querySelectorAll(".chk-list input:checked")].map(x=>get("artikelen",x.value));const t=sel.reduce((s,x)=>s+(+x.duur||0),0);if(t)d.q("#afDu").value=t;conf()});
 ["#afD","#afS","#afDu","#afM","#afSt"].forEach(s=>{d.q(s).addEventListener("input",conf);d.q(s).addEventListener("change",conf)});conf();
 d.q("#afX").onclick=()=>d.close();
 if(d.q("#afMsgB"))d.q("#afMsgB").onclick=()=>msgDlg(get("afspraken",id),a.bevestigd?"herinnering":"bevestiging");
 d.q("#afNk").onclick=()=>klantDlg(null,k=>{kh.set(k,null);hondDlg(null,k.id,h=>kh.set(k,h.id))});
 d.q("#afNh").onclick=()=>{const k=khKlant(d);if(!k){d.q("#afMsg").textContent="Kies eerst een klant.";return}hondDlg(null,k.id,h=>kh.set(k,h.id))};
 d.q("#afKk").onclick=()=>{const k=khKlant(d);if(k){d.close();selKl=k.id;go("klanten")}};
 const collect=()=>{const k=khKlant(d),msg=t=>{d.q("#afMsg").textContent=t;return null};
  if(!k)return msg("Kies een bestaande klant of maak een nieuwe aan.");
  if(!d.q("#afD").value||!d.q("#afS").value)return msg("Vul datum en begintijd in.");
  const du=Math.round(num(d.q("#afDu").value));if(!(du>0))return msg("Vul een duur in minuten in.");
  return{datum:d.q("#afD").value,start:d.q("#afS").value,duur:du,klantId:k.id,hondId:d.q("#khH").value||null,mwId:d.q("#afM").value,diensten:[...d.querySelectorAll(".chk-list input:checked")].map(x=>x.value),status:d.q("#afSt").value,notitie:d.q("#afN").value.trim()}};
 const store=()=>{const v=collect();if(!v)return null;const cf=conflicts({...v,id:a.id});
  const net=d.newIds&&cf.some(x=>d.newIds.has(x.id))?"Je collega heeft dit tijdstip zojuist geboekt. ":"";
  if(cf.length){if(bed.dubbel==="blokkeer"){d.q("#afMsg").textContent=net+"Kies een andere tijd of medewerker: "+confText(v,cf);return null}
   if(!d.ok2){d.ok2=1;d.q("#afMsg").textContent=net+"Dit is een dubbele boeking. Klik nogmaals om hem toch in te plannen.";d.q("#afOk").textContent="Toch opslaan";if(d.q("#afPay"))d.q("#afPay").textContent="Toch opslaan en afrekenen";return null}}
  let r;if(id){r=get("afspraken",id);Object.assign(r,v)}else{r={id:uid(),factuurId:null,aangemaakt:Date.now(),...v};D.afspraken.push(r)}saveC("afspraken");if(!id){agD=fromYmd(r.datum)}draw();return r};
 const was=id?{datum:a.datum,start:a.start}:null;
 /* vlak voor opslaan de nieuwste agenda ophalen, zodat een afspraak van een collega meetelt */
 const fresh=async btn=>{if(!dbOn()||d.fresh==="ok")return;const before=new Set(D.afspraken.map(x=>x.id)),txt=btn.textContent;
  btn.disabled=true;btn.textContent="Agenda controleren…";d.fresh=await dbFresh(4000);btn.disabled=false;btn.textContent=txt;
  d.newIds=new Set(D.afspraken.filter(x=>!before.has(x.id)).map(x=>x.id));conf()};
 const offTip=r=>{if(!dbOn()||d.fresh==="ok"||d.fresh==="uit")return"";const moved=!was||was.datum!==r.datum||was.start!==r.start;return moved?"Je bent offline: controleer straks of dit tijdstip nog vrij is. De afspraak gaat vanzelf mee zodra er weer internet is.":""};
 d.q("#afOk").onclick=async()=>{const bev=d.q("#afBev").checked;if(!id)S.set("bevauto",bev?1:0);if(!collect())return;await fresh(d.q("#afOk"));const r=store();if(!r)return;d.close();const tip=offTip(r);
  if(bev){if(!get("klanten",r.klantId))return;const moved=was&&(was.datum!==r.datum||was.start!==r.start);msgDlg(r,!id?"bevestiging":moved?"wijziging":"bevestiging")}
  if(tip)toast(tip,!id&&!bev?[["Bevestiging sturen",()=>msgDlg(r,"bevestiging")]]:[],12000);else if(!id&&!bev)toast("Afspraak ingepland.",[["Bevestiging sturen",()=>msgDlg(r,"bevestiging")]])};
 if(d.q("#afPay"))d.q("#afPay").onclick=async()=>{if(!collect())return;await fresh(d.q("#afPay"));const r=store();if(r){d.close();bonFromAf(r)}};
 if(d.q("#afInv"))d.q("#afInv").onclick=()=>{const f=get("facturen",a.factuurId);if(f)invDlg(f)};
 if(d.q("#afDel"))d.q("#afDel").onclick=e=>arm(e.target,()=>{D.afspraken=D.afspraken.filter(x=>x.id!==id);saveC("afspraken");d.close();draw()},"Nogmaals: verwijderen");
 upd();
}
