/* Trimmy · kassa.js */
"use strict";
/* ---------- kassa ---------- */
const newBon=()=>({lines:[],klantId:null,hondId:null,afspraakId:null,korting:0});
let bon=S.get("bon",newBon()),kCat="Alles",kTerm="";
const saveBon=()=>S.set("bon",bon);
function bonFromAf(a){bon=newBon();bon.klantId=a.klantId;bon.hondId=a.hondId;bon.afspraakId=a.id;
 (a.diensten||[]).forEach(i=>{const x=get("artikelen",i);if(x)bon.lines.push(lineOf(x))});saveBon();go("kassa")}
const lineOf=x=>({artId:x.id,naam:x.naam,type:x.type,prijs:x.prijs,btw:x.btw,aantal:1});
const lineTot=l=>rnd(l.aantal*l.prijs);
const bonSub=()=>rnd(bon.lines.reduce((s,l)=>s+lineTot(l),0));
const bonDisc=()=>Math.min(100,Math.max(0,num(bon.korting)));
const bonTot=()=>rnd(bonSub()*(1-bonDisc()/100));
function btwSpec(lines,k){const m={};lines.forEach(l=>{const t=l.aantal*l.prijs*(1-k/100);m[l.btw]=(m[l.btw]||0)+t});return Object.keys(m).sort((a,b)=>b-a).map(r=>{const t=rnd(m[r]),g=rnd(m[r]/(1+r/100));return{pct:+r,grondslag:g,btw:rnd(t-g)}})}
function drawKassa(){
 const arts=D.artikelen.filter(x=>x.actief);
 const cats=["Alles","Behandelingen","Producten",...new Set(arts.map(x=>x.cat).filter(Boolean))];
 if(!cats.includes(kCat))kCat="Alles";
 $("#kChips").innerHTML=cats.map(c=>`<button type="button" class="chip" aria-pressed="${c===kCat}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
 const r=arts.filter(x=>(kCat==="Alles"||(kCat==="Behandelingen"?x.type==="dienst":kCat==="Producten"?x.type==="product":x.cat===kCat))&&x.naam.toLowerCase().includes(kTerm)).sort((a,b)=>(a.type===b.type?0:a.type==="dienst"?-1:1));
 $("#kGrid").innerHTML=r.length?r.map(x=>`<button type="button" class="prod ${x.type}" data-id="${x.id}"><b>${esc(x.naam)}</b><small>${x.type==="dienst"?(x.duur||0)+" min":(x.voorraad==null||x.voorraad===""?"":`<span style="color:${+x.voorraad<=3?"var(--warn)":"inherit"}">${x.voorraad} op voorraad</span>`)}</small><span class="pr">${eur(x.prijs)}</span></button>`).join(""):`<div class="empty">Geen artikelen gevonden.</div>`;
 drawBon();
}
function drawBon(){const pb=can("prijsBon");$("#bonDisc").disabled=!pb;$("#kVrij").hidden=!pb;
 const af=get("afspraken",bon.afspraakId),k=get("klanten",bon.klantId),h=get("honden",bon.hondId);
 $("#bonAf").hidden=!af;if(af)$("#bonAf").innerHTML=`<span>Afspraak ${fDate(af.datum)} om ${af.start}</span><button class="btn s" type="button" id="bAfX">Loskoppelen</button>`;
 $("#bonKl").innerHTML=k?`<span><b>${esc(k.naam)}</b>${h?` · ${esc(h.naam)}`:""}<br><small>${esc([k.plaats,k.tel].filter(Boolean).join(" · "))}</small></span><span style="display:flex;gap:6px"><button class="btn s" type="button" id="bKl">Wijzig</button><button class="btn s" type="button" id="bKx">Wis</button></span>`:`<span class="mute">Losse verkoop, geen klant</span><button class="btn s" type="button" id="bKl">Klant en hond kiezen</button>`;
 $("#bonLines").innerHTML=bon.lines.length?bon.lines.map((l,i)=>`<div class="line"><b>${esc(l.naam)}</b><b>${eur(lineTot(l))}</b><div class="q"><button type="button" data-m="${i}" aria-label="Minder">−</button><span style="min-width:22px;text-align:center">${nm(l.aantal)}</span><button type="button" data-p="${i}" aria-label="Meer">+</button><span class="mute">à</span><input data-pr="${i}" inputmode="decimal" ${pb?"":"readonly"} value="${nm(l.prijs)}" aria-label="Prijs per stuk"><button type="button" class="rm" data-r="${i}">Verwijder</button></div></div>`).join(""):`<div class="empty">De bon is leeg. Kies een behandeling of product.</div>`;
 if(document.activeElement!==$("#bonDisc"))$("#bonDisc").value=bon.korting||0;
 const s=bonSub(),t=bonTot();
 $("#bSub").textContent=eur(s);$("#bDiscRow").hidden=!bonDisc();$("#bDisc").textContent="− "+eur(s-t);
 $("#bBtw").innerHTML=btwSpec(bon.lines,bonDisc()).map(b=>`<div class="row mute"><span>Waarvan ${b.pct}% btw</span><span>${eur(b.btw)}</span></div>`).join("");
 $("#bTot").textContent=eur(t);$("#bPay").disabled=!bon.lines.length||t<0;
}
$("#kChips").onclick=e=>{const c=e.target.dataset.c;if(c){kCat=c;drawKassa()}};
$("#kq").oninput=e=>{kTerm=e.target.value.toLowerCase();drawKassa()};
$("#kGrid").onclick=e=>{const b=e.target.closest(".prod");if(!b)return;const x=get("artikelen",b.dataset.id);const l=bon.lines.find(z=>z.artId===x.id&&z.prijs===x.prijs);if(l)l.aantal++;else bon.lines.push(lineOf(x));saveBon();drawBon()};
$("#bonLines").onclick=e=>{const t=e.target.dataset;if(t.p!=null)bon.lines[t.p].aantal++;else if(t.m!=null){const l=bon.lines[t.m];l.aantal--;if(l.aantal<=0)bon.lines.splice(t.m,1)}else if(t.r!=null)bon.lines.splice(t.r,1);else return;saveBon();drawBon()};
$("#bonLines").onchange=e=>{const i=e.target.dataset.pr;if(i!=null){const l=bon.lines[i],v=rnd(num(e.target.value));l.prijs=l.vrij?v:Math.max(0,v);saveBon();drawBon()}};
$("#bonDisc").oninput=e=>{bon.korting=num(e.target.value);saveBon();drawBon()};
$("#bClr").onclick=()=>{bon=newBon();saveBon();drawBon()};
$("#kVrij").onclick=()=>{const d=modal(`<h2>Vrij bedrag</h2>
  <label>Omschrijving<input id="vO" placeholder="Bijvoorbeeld: extra ontklitten, toeslag vlooien"></label>
  <div class="g2"><label>Bedrag incl. btw per stuk (€)<input id="vB" inputmode="decimal" placeholder="0,00"></label><label>Aantal<input id="vA" type="number" min="1" step="1" value="1"></label></div>
  <div class="g2"><label>Btw-tarief<select id="vT"><option value="21">21%</option><option value="9">9%</option><option value="0">0% of vrijgesteld</option></select></label><label>Soort<select id="vS"><option value="dienst">Behandeling</option><option value="product">Product</option></select></label></div>
  <small>Een negatief bedrag (bijvoorbeeld −5,00) werkt als korting op de bon.</small>
  <div class="msg" id="vM"></div>
  <div class="acts"><button class="btn" type="button" id="vX">Annuleren</button><button class="btn p" type="button" id="vOk">Toevoegen aan bon</button></div>`);
 d.q("#vX").onclick=()=>d.close();setTimeout(()=>d.q("#vO").focus(),30);
 d.q("#vOk").onclick=()=>{const naam=d.q("#vO").value.trim(),pr=rnd(num(d.q("#vB").value)),q=Math.max(1,Math.round(num(d.q("#vA").value)||1));
  if(!naam){d.q("#vM").textContent="Vul een omschrijving in.";return}if(!pr){d.q("#vM").textContent="Vul een bedrag in, bijvoorbeeld 12,50.";return}
  bon.lines.push({artId:null,naam,type:d.q("#vS").value,prijs:pr,btw:+d.q("#vT").value,aantal:q,vrij:true});saveBon();d.close();drawBon()}};
document.addEventListener("click",e=>{const id=e.target.id;
 if(id==="bAfX"){bon.afspraakId=null;saveBon();drawBon()}
 else if(id==="bKx"){bon.klantId=null;bon.hondId=null;saveBon();drawBon()}
 else if(id==="bKl")pickKH()});
function pickKH(){const d=modal(`<h2>Klant en hond</h2>${khHtml(bon.klantId)}<div class="acts l"><button class="btn s" type="button" id="pNk">Nieuwe klant</button></div><div class="acts"><button class="btn" type="button" id="pX">Annuleren</button><button class="btn p" type="button" id="pOk">Kiezen</button></div>`);
 const kh=khBind(d,bon.hondId);d.q("#pX").onclick=()=>d.close();
 d.q("#pNk").onclick=()=>klantDlg(null,k=>{kh.set(k,null);hondDlg(null,k.id,h=>kh.set(k,h.id))});
 d.q("#pOk").onclick=()=>{const k=khKlant(d);bon.klantId=k?k.id:null;bon.hondId=k?(d.q("#khH").value||null):null;saveBon();d.close();drawBon()}}
let lastMethode="PIN",lastDoor=S.get("door","");
$("#bPay").onclick=()=>payDlg();
function payDlg(){
 const t=bonTot(),k=get("klanten",bon.klantId),h=get("honden",bon.hondId),af=get("afspraken",bon.afspraakId);
 const heeftDienst=bon.lines.some(l=>l.type==="dienst");let pm=lastMethode;
 if(accessOn()&&cur())lastDoor=cur().id;else if(!lastDoor&&af)lastDoor=af.mwId;
 const d=modal(`<h2>Afrekenen ${eur(t)}</h2>
  ${k?`<div class="note">${esc(k.naam)}${h?" · "+esc(h.naam):""}</div>`:""}
  <div class="methods">${["PIN","Contant","Op rekening"].map(m=>`<button type="button" data-pm="${m}">${m}</button>`).join("")}</div>
  <div id="pCash"><label>Ontvangen bedrag (€)<input id="pGiven" inputmode="decimal"></label><div class="note" id="pChg" style="margin-top:8px"></div></div>
  <div class="note" id="pRek" hidden></div>
  <label>Afgerekend door<select id="pDoor"><option value="">Kies</option>${D.medewerkers.map(m=>`<option value="${m.id}" ${m.id===lastDoor?"selected":""}>${esc(m.naam)}</option>`).join("")}</select></label>
  ${h&&heeftDienst?`<details open><summary style="cursor:pointer;font-weight:600">Behandeling vastleggen voor ${esc(h.naam)}</summary><div style="display:grid;gap:10px;margin-top:10px">
   <div class="g2"><label>Mesje, kam of techniek<input id="pMes" placeholder="Bijvoorbeeld: lijf 5F, kop schaar"></label><label>Vacht<select id="pVa">${["Goed","Klitten","Sterk vervilt","Huidproblemen","Vlooien gezien"].map(x=>`<option>${x}</option>`).join("")}</select></label></div>
   <label>Gedrag<select id="pGe">${["Rustig","Wat onrustig","Lastig","Bijt of hapt"].map(x=>`<option>${x}</option>`).join("")}</select></label>
   <label>Notitie voor volgende keer<textarea id="pNo" rows="2"></textarea></label></div></details>`:""}
  <div class="msg" id="pMsg"></div>
  <div class="acts"><button class="btn" type="button" id="pX">Terug</button><button class="btn p" type="button" id="pOk">Betaling afronden</button></div>`);
 const set=()=>{d.querySelectorAll("[data-pm]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.pm===pm));d.q("#pCash").hidden=pm!=="Contant";d.q("#pRek").hidden=pm!=="Op rekening";
  d.q("#pRek").textContent=k?`Er komt een factuur op naam van ${k.naam} met een betaaltermijn van ${bed.termijn||14} dagen.`:"Kies eerst een klant op de bon. Een factuur op rekening moet op naam staan.";chg()};
 const chg=()=>{const g=num(d.q("#pGiven").value);d.q("#pChg").innerHTML=g>=t-1e-9?`Wisselgeld: <b>${eur(g-t)}</b>`:`Nog te ontvangen: <b>${eur(t-g)}</b>`};
 d.q("#pGiven").value=nm(Math.ceil(t));d.q("#pGiven").oninput=chg;
 d.querySelector(".methods").onclick=e=>{if(e.target.dataset.pm){pm=e.target.dataset.pm;set()}};set();
 d.q("#pX").onclick=()=>d.close();
 d.q("#pOk").onclick=()=>{const msg=x=>d.q("#pMsg").textContent=x;
  if(pm==="Op rekening"&&!k)return msg("Kies eerst een klant op de bon. Sluit dit scherm met Terug.");
  if(pm==="Contant"&&num(d.q("#pGiven").value)<t-1e-9)return msg("Het ontvangen bedrag is lager dan het totaal.");
  lastMethode=pm;lastDoor=d.q("#pDoor").value;S.set("door",lastDoor);
  const beh=d.q("#pMes")?{mesje:d.q("#pMes").value.trim(),vacht:d.q("#pVa").value,gedrag:d.q("#pGe").value,notitie:d.q("#pNo").value.trim()}:null;
  const f=finish(pm,beh);d.close();receipt(f)};
}
function nextNr(){const y=new Date().getFullYear(),k=(bed.kassa||"K1").toUpperCase(),p=`${y}-${k}-`;const n=D.facturen.filter(f=>String(f.nr).startsWith(p)).map(f=>+String(f.nr).slice(p.length)||0);return p+String((n.length?Math.max(...n):0)+1).padStart(4,"0")}
function finish(pm,beh){
 const now=Date.now(),t=bonTot(),door=(get("medewerkers",lastDoor)||{}).naam||"";
 const f={id:uid(),nr:nextNr(),ts:now,klantId:bon.klantId,hondId:bon.hondId,afspraakId:bon.afspraakId,
  regels:bon.lines.map(l=>({artId:l.artId,naam:l.naam,type:l.type,aantal:l.aantal,prijs:l.prijs,btw:l.btw,totaal:lineTot(l),...(l.vrij?{vrij:true}:{})})),
  korting:bonDisc(),sub:bonSub(),totaal:t,betalingen:pm==="Op rekening"?[]:[{ts:now,methode:pm,bedrag:t}],betaald:pm==="Op rekening"?0:t,rest:pm==="Op rekening"?t:0,kassa:bed.kassa||"K1",door,vervalt:pm==="Op rekening"?ymd(addDays(today(),+bed.termijn||14)):null};
 D.facturen.push(f);saveC("facturen");
 let vc=false;bon.lines.forEach(l=>{const x=get("artikelen",l.artId);if(x&&x.type==="product"&&x.voorraad!==""&&x.voorraad!=null){x.voorraad=+x.voorraad-l.aantal;vc=true}});if(vc)saveC("artikelen");
 const af=get("afspraken",bon.afspraakId);if(af){af.status="afgerekend";af.factuurId=f.id;saveC("afspraken")}
 if(bon.hondId&&beh){D.behandelingen.push({id:uid(),datum:af?af.datum:ymd(today()),hondId:bon.hondId,klantId:bon.klantId,afspraakId:bon.afspraakId,factuurId:f.id,diensten:bon.lines.filter(l=>l.type==="dienst").map(l=>l.naam).join(", "),mw:af?((get("medewerkers",af.mwId)||{}).naam||door):door,...beh});saveC("behandelingen")}
 bon=newBon();saveBon();draw();return f}
function bonHtml(f){const k=get("klanten",f.klantId),h=get("honden",f.hondId);
 return`<h3>${esc(bed.naam)}</h3><div class="mute">${esc([bed.straat,[bed.pc,bed.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</div><div class="mute">Bon ${esc(f.nr)} · ${new Date(f.ts).toLocaleString("nl-NL")}</div>${k?`<div><b>${esc(k.naam)}</b>${h?" · "+esc(h.naam):""}</div>`:""}<hr>`+
 f.regels.map(r=>`<div class="row"><span>${r.aantal!==1?nm(r.aantal)+" × ":""}${esc(r.naam)}</span><span>${eur(r.totaal)}</span></div>`).join("")+`<hr>`+
 (f.korting?`<div class="row"><span>Korting ${nm(f.korting)}%</span><span>− ${eur(f.sub-f.totaal)}</span></div>`:"")+
 btwSpec(f.regels,f.korting).map(b=>`<div class="row mute"><span>Waarvan ${b.pct}% btw</span><span>${eur(b.btw)}</span></div>`).join("")+
 `<div class="row big"><span>Totaal</span><span>${eur(f.totaal)}</span></div><hr>`+
 f.betalingen.map(p=>`<div class="row"><span>Betaald (${esc(p.methode)}) ${new Date(p.ts).toLocaleDateString("nl-NL")}</span><span>${eur(p.bedrag)}</span></div>`).join("")+
 (f.rest>0?`<div class="row" style="color:var(--warn);font-weight:700"><span>Nog te betalen${f.vervalt?" vóór "+fDate(f.vervalt):""}</span><span>${eur(f.rest)}</span></div>`:"")}
function receipt(f){const d=modal(`<div class="receipt">${bonHtml(f)}</div><div class="acts">${STANDALONE?`<button class="btn" type="button" id="rP">Kassabon printen</button>`:""}<button class="btn" type="button" id="rI">Factuur bekijken (A4)</button><button class="btn p" type="button" id="rX">Klaar</button></div>`);
 d.q("#rX").onclick=()=>d.close();d.q("#rI").onclick=()=>{d.close();invDlg(f)};
 if(d.q("#rP"))d.q("#rP").onclick=()=>{const p=$("#printArea");p.className="bon";p.innerHTML=`<div class="receipt">${bonHtml(f)}</div>`;window.print()}}
