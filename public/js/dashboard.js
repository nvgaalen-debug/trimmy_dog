/* Trimmy · dashboard.js */
"use strict";
/* ---------- KPI-dashboard (Beheer) ----------
   Alles wordt berekend uit de gegevens die al op dit apparaat staan; er gaat niets extra's over internet.
   Grafieken zijn eigen SVG (geen externe bibliotheek, past binnen de beveiligingsregels). */
const DB={per:"12m",mw:"",beh:"",maand:null,metric:"omzet",tabel:{}};
const MND=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const DEAD_AF=["geannuleerd","noshow"];
const mKey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
/* een "vak" is een maand (JJJJ-MM) of, bij week/maand, een dag (JJJJ-MM-DD) */
const isDag=()=>["week","vweek","maand","vmaand"].includes(DB.per);
const bKey=d=>isDag()?ymd(d):mKey(d);
const mLab=k=>{if(k.length===10){const d=fromYmd(k);return DB.per==="week"||DB.per==="vweek"?d.toLocaleDateString("nl-NL",{weekday:"short"})+" "+d.getDate():String(d.getDate())}const[y,m]=k.split("-");return MND[+m-1]+" "+String(y).slice(2)};
const mLang=k=>{if(k.length===10)return fromYmd(k).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});const[y,m]=k.split("-");return new Date(+y,+m-1,1).toLocaleDateString("nl-NL",{month:"long",year:"numeric"})};
const maandag=d=>addDays(d,-((d.getDay()+6)%7));
const eur0=n=>(+n||0).toLocaleString("nl-NL",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const pct=n=>isFinite(n)?Math.round(n*100)+"%":"–";
const nl=n=>(+n||0).toLocaleString("nl-NL");

/* een dag tonen als het een werkdag is, of als er toch iets gebeurde (bv. een zondag met een afspraak) */
function dagTelt(d){if(werkdag(d))return true;const k=ymd(d);return D.afspraken.some(a=>a.datum===k)||D.facturen.some(f=>f.ts&&ymd(new Date(f.ts))===k)}
function dbMaanden(){const T=today(),out=[];
 if(DB.per==="week"||DB.per==="vweek"){const ma=addDays(maandag(T),DB.per==="vweek"?-7:0);for(let i=0;i<7;i++){const d=addDays(ma,i);if(dagTelt(d))out.push(ymd(d))}return out}
 if(DB.per==="maand"||DB.per==="vmaand"){const f=new Date(T.getFullYear(),T.getMonth()-(DB.per==="vmaand"?1:0),1),n=new Date(f.getFullYear(),f.getMonth()+1,0).getDate();for(let i=1;i<=n;i++){const d=new Date(f.getFullYear(),f.getMonth(),i);if(dagTelt(d))out.push(ymd(d))}return out}
 if(DB.per==="12m"){for(let i=11;i>=0;i--)out.push(mKey(new Date(T.getFullYear(),T.getMonth()-i,1)))}
 else{const y=T.getFullYear()-(DB.per==="vorig"?1:0);for(let m=0;m<12;m++)out.push(y+"-"+String(m+1).padStart(2,"0"))}return out}
const shiftKey=(k,dm)=>{const[y,m]=k.split("-").map(Number);return mKey(new Date(y,m-1+dm,1))};
/* vergelijkingsvak: maand → zelfde maand jaar ervoor; dag → zelfde dag vorige week/maand */
function prevKey(k){if(k.length!==10)return shiftKey(k,-12);const d=fromYmd(k);if(DB.per==="week"||DB.per==="vweek")return ymd(addDays(d,-7));const p=new Date(d.getFullYear(),d.getMonth()-1,1),n=new Date(p.getFullYear(),p.getMonth()+1,0).getDate();return ymd(new Date(p.getFullYear(),p.getMonth(),Math.min(d.getDate(),n)))}
const vglNaam=()=>isDag()?(DB.per==="week"||DB.per==="vweek"?"Week ervoor":"Maand ervoor"):"Jaar ervoor";
const werkdag=d=>d.getDay()!==0||bed.zondag;
function capMin(k,nMw){if(k.length===10)return werkdag(fromYmd(k))?Math.max(1,(+bed.sluit||18)-(+bed.open||8))*60*nMw:0;const[y,m]=k.split("-").map(Number),n=new Date(y,m,0).getDate();let dagen=0;for(let i=1;i<=n;i++)if(werkdag(new Date(y,m-1,i)))dagen++;
 return dagen*Math.max(1,(+bed.sluit||18)-(+bed.open||8))*60*nMw}
/* factuurregels die bij het filter horen (behandeling) */
const fRegels=f=>(f.regels||[]).filter(r=>!DB.beh||r.artId===DB.beh||(!r.artId&&r.naam===DB.beh)).map(r=>({...r,netto:(+r.totaal||0)*(1-(+f.korting||0)/100)}));
function fMw(f){if(f.afspraakId){const a=get("afspraken",f.afspraakId);if(a&&a.mwId)return a.mwId}const m=D.medewerkers.find(x=>x.naam&&x.naam===f.door);return m?m.id:""}
const afOk=a=>(!DB.mw||a.mwId===DB.mw)&&(!DB.beh||(a.diensten||[]).includes(DB.beh));

function dbData(){
 const maanden=dbMaanden(),set=new Set(maanden),prev=maanden.map(prevKey),pset=new Set(prev),nMw=DB.mw?1:Math.max(1,D.medewerkers.length);
 const z=()=>Object.fromEntries(maanden.map(k=>[k,0]));
 const omzet=z(),omzetV=Object.fromEntries(prev.map(k=>[k,0])),aantF=z(),afs=z(),noshow=z(),geann=z(),bezet=z(),nieuw=z(),terug=z();
 const perBeh=new Map(),perMw=new Map(),wd=[0,0,0,0,0,0,0];
 /* omzet */
 for(const f of D.facturen){if(!f.ts)continue;const k=bKey(new Date(f.ts)),inP=set.has(k),inV=pset.has(k);if(!inP&&!inV)continue;if(DB.mw&&fMw(f)!==DB.mw)continue;
  if(inP){for(const r of (f.regels||[])){const net=(+r.totaal||0)*(1-(+f.korting||0)/100),key=r.naam||"Onbekend";const o=perBeh.get(key)||{naam:key,artId:r.artId,omzet:0,aantal:0};o.omzet+=net;o.aantal+=+r.aantal||0;perBeh.set(key,o)}}
  const rg=fRegels(f);if(DB.beh&&!rg.length)continue;const sum=DB.beh?rg.reduce((s,r)=>s+r.netto,0):(+f.totaal||0);
  if(inV)omzetV[k]=(omzetV[k]||0)+sum;
  if(inP){omzet[k]+=sum;aantF[k]++;const mid=fMw(f);perMw.set(mid,(perMw.get(mid)||0)+sum);
  }}
 /* afspraken, bezetting, weekdagen */
 const wdCap=[0,0,0,0,0,0,0];
 const uren=Math.max(1,(+bed.sluit||18)-(+bed.open||8))*60*nMw;
 for(const k of maanden){if(k.length===10){const d=fromYmd(k);if(werkdag(d))wdCap[d.getDay()]+=uren;continue}const[y,m]=k.split("-").map(Number),n=new Date(y,m,0).getDate();for(let i=1;i<=n;i++){const d=new Date(y,m-1,i);if(werkdag(d))wdCap[d.getDay()]+=uren}}
 for(const a of D.afspraken){if(!a.datum)continue;const d=fromYmd(a.datum),k=bKey(d);if(!set.has(k)||!afOk(a))continue;
  if(a.status==="noshow"){noshow[k]++;continue}if(a.status==="geannuleerd"){geann[k]++;continue}
  afs[k]++;bezet[k]+=+a.duur||30;wd[d.getDay()]+=+a.duur||30}
 /* nieuwe en terugkerende klanten: eerste bezoek ooit */
 const eerste=new Map(),bezoek=new Map();
 for(const a of D.afspraken){if(!a.datum||DEAD_AF.includes(a.status)||!a.klantId)continue;const e=eerste.get(a.klantId);if(!e||a.datum<e)eerste.set(a.klantId,a.datum)}
 for(const a of D.afspraken){if(!a.datum||DEAD_AF.includes(a.status)||!a.klantId||!afOk(a))continue;const k=bKey(fromYmd(a.datum));if(!set.has(k))continue;const s=bezoek.get(k)||new Set();s.add(a.klantId);bezoek.set(k,s)}
 for(const k of maanden)for(const kid of (bezoek.get(k)||[])){if(bKey(fromYmd(eerste.get(kid)))===k)nieuw[k]++;else terug[k]++}
 const bez=Object.fromEntries(maanden.map(k=>{const c=capMin(k,nMw);return[k,c?bezet[k]/c:0]}));
 return{maanden,prev,omzet,omzetV,aantF,afs,noshow,geann,bez,nieuw,terug,
  beh:[...perBeh.values()].sort((a,b)=>b[DB.metric]-a[DB.metric]),
  mw:D.medewerkers.map(m=>({id:m.id,naam:m.naam,omzet:perMw.get(m.id)||0})).sort((a,b)=>b.omzet-a.omzet),
  wd:[1,2,3,4,5,6,0].filter(i=>i!==0||bed.zondag).map(i=>({lab:["zo","ma","di","wo","do","vr","za"][i],v:wdCap[i]?wd[i]/wdCap[i]:0,min:wd[i]}))}}

/* KPI-tegels: de lopende periode t/m vandaag vs. dezelfde dagen van de periode ervoor */
function tegelPeriode(){const T=today();
 if(DB.per==="week"){const ma=maandag(T),n=Math.round((T-ma)/864e5);return{naam:"deze week",van:ma,tot:T,pvan:addDays(ma,-7),ptot:addDays(ma,n-7),hvan:ma,htot:addDays(ma,6),sub:`ma t/m ${T.toLocaleDateString("nl-NL",{weekday:"short"})}`,hsub:"ingepland, hele week",vs:"vorige week"}}
 if(DB.per==="vweek"){const ma=addDays(maandag(T),-7);return{naam:"vorige week",van:ma,tot:addDays(ma,6),pvan:addDays(ma,-7),ptot:addDays(ma,-1),hvan:ma,htot:addDays(ma,6),sub:"hele week",hsub:"hele week",vs:"week ervoor"}}
 if(DB.per==="vmaand"){const f=new Date(T.getFullYear(),T.getMonth()-1,1),l=new Date(T.getFullYear(),T.getMonth(),0),pf=new Date(T.getFullYear(),T.getMonth()-2,1),pl=new Date(T.getFullYear(),T.getMonth()-1,0);return{naam:"vorige maand",van:f,tot:l,pvan:pf,ptot:pl,hvan:f,htot:l,sub:"hele maand",hsub:"hele maand",vs:"maand ervoor"}}
 const f=new Date(T.getFullYear(),T.getMonth(),1),pf=new Date(T.getFullYear(),T.getMonth()-1,1),pl=new Date(T.getFullYear(),T.getMonth(),0);
 return{naam:"deze maand",van:f,tot:T,pvan:pf,ptot:new Date(pf.getFullYear(),pf.getMonth(),Math.min(T.getDate(),pl.getDate())),hvan:f,htot:new Date(T.getFullYear(),T.getMonth()+1,0),sub:`t/m ${T.getDate()} ${MND[T.getMonth()]}`,hsub:"ingepland, hele maand",vs:"vorige maand"}}
function dbTegels(){const T=today(),P=tegelPeriode(),nMw=DB.mw?1:Math.max(1,D.medewerkers.length);
 const tussen=(dstr,a,b)=>dstr>=ymd(a)&&dstr<=ymd(b);
 const om=(a,b)=>D.facturen.filter(f=>f.ts&&tussen(ymd(new Date(f.ts)),a,b)&&(!DB.mw||fMw(f)===DB.mw)).reduce((s,f)=>s+(DB.beh?fRegels(f).reduce((x,r)=>x+r.netto,0):(+f.totaal||0)),0);
 const af=(a,b)=>D.afspraken.filter(x=>x.datum&&!DEAD_AF.includes(x.status)&&afOk(x)&&tussen(x.datum,a,b)).length;
 const eerste=new Map();for(const x of D.afspraken){if(!x.datum||DEAD_AF.includes(x.status))continue;const e=eerste.get(x.klantId);if(!e||x.datum<e)eerste.set(x.klantId,x.datum)}
 const nw=(a,b)=>[...eerste.values()].filter(dd=>tussen(dd,a,b)).length;
 const cap=(a,b)=>{let c=0;for(let d=new Date(a);d<=b;d=addDays(d,1))if(werkdag(d))c+=Math.max(1,(+bed.sluit||18)-(+bed.open||8))*60*nMw;return c};
 const bz=(a,b)=>{const c=cap(a,b);return c?D.afspraken.filter(x=>x.datum&&!DEAD_AF.includes(x.status)&&afOk(x)&&tussen(x.datum,a,b)).reduce((s,x)=>s+(+x.duur||30),0)/c:0};
 const hn=Math.round((P.htot-P.hvan)/864e5)+1,hpv=P.naam.includes("maand")?new Date(P.hvan.getFullYear(),P.hvan.getMonth()-1,1):addDays(P.hvan,-hn),hpt=addDays(P.hvan,-1);
 /* herhaling: hoeveel bezoeken kwamen binnen het eigen ritme (+1 week) na het vorige */
 const per=new Map();D.afspraken.filter(a=>a.hondId&&a.datum&&!DEAD_AF.includes(a.status)&&a.datum<=ymd(T)).forEach(a=>{if(!per.has(a.hondId))per.set(a.hondId,[]);per.get(a.hondId).push(a.datum)});
 let ok=0,tot=0;const grens=ymd(addDays(T,-365));for(const[hid,l]of per){l.sort();const h=get("honden",hid),wk=(h&&+h.interval)||+bed.beurtWk||8;for(let i=1;i<l.length;i++){if(l[i]<grens)continue;tot++;if((fromYmd(l[i])-fromYmd(l[i-1]))/864e5<=wk*7+7)ok++}}
 const opv=typeof beurtLijst==="function"?beurtLijst(0).length:0,Nm=P.naam;
 return[{id:"omzet",lab:"Omzet "+Nm,v:om(P.van,P.tot),vv:om(P.pvan,P.ptot),fmt:eur0,sub:P.sub,vs:P.vs},
  {id:"afspraken",lab:"Afspraken "+Nm,v:af(P.van,P.tot),vv:af(P.pvan,P.ptot),fmt:nl,sub:P.sub,vs:P.vs},
  {id:"klanten",lab:"Nieuwe klanten",v:nw(P.van,P.tot),vv:nw(P.pvan,P.ptot),fmt:nl,sub:Nm,abs:true,vs:P.vs},
  {id:"bezet",lab:"Bezetting "+Nm,v:bz(P.hvan,P.htot),vv:bz(hpv,hpt),fmt:pct,sub:P.hsub,pp:true,vs:P.vs},
  {id:"herhaal",lab:"Komt op tijd terug",v:tot?ok/tot:NaN,fmt:pct,sub:tot?`${ok} van ${tot} bezoeken binnen het eigen ritme`:"nog te weinig bezoeken"},
  {id:"opvolgen",lab:"Opvolgen",v:opv,fmt:nl,sub:opv===1?"hond is weer aan de beurt":"honden zijn weer aan de beurt",act:true}]}

/* ---------- grafiek-bouwstenen (SVG) ---------- */
function niceStep(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),m=v/p;return(m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p}
function niceMax(v,int){let st=niceStep(v/4);if(int)st=Math.max(1,Math.ceil(st));return st*4}
let dbTip=null;function tip(html,x,y){if(!dbTip){dbTip=document.createElement("div");dbTip.className="vtip";document.body.append(dbTip)}if(!html){dbTip.hidden=true;return}
 dbTip.innerHTML=html;dbTip.hidden=false;const w=dbTip.offsetWidth,h=dbTip.offsetHeight;dbTip.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+"px";dbTip.style.top=Math.max(8,y-h-12)+"px"}
/* staafgrafiek over maanden; series = [{naam,cls,waarden}] (gestapeld als stack), optioneel vergelijkingslijn */
function barSvg(el,{labels,series,stack=false,line=null,fmt=nl,sel=null,onClick=null,tipFn,int=false}){
 const W=Math.max(300,el.clientWidth||600),H=230,L=52,R=10,Tp=12,B=26,pw=W-L-R,ph=H-Tp-B,n=labels.length;
 const tot=i=>stack?series.reduce((s,x)=>s+x.waarden[i],0):Math.max(...series.map(x=>x.waarden[i]));
 const mx=niceMax(Math.max(1e-9,...labels.map((_,i)=>tot(i)),...(line?line.waarden:[0])),int),y=v=>Tp+ph-(v/mx)*ph,bw=Math.min(36,(pw/n)*.62),gx=i=>L+(i+.5)*(pw/n);
 let g="";for(let t=0;t<=4;t++){const v=mx*t/4,yy=y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="vgrid"/><text x="${L-6}" y="${yy+4}" class="vax" text-anchor="end">${esc(fmt(v))}</text>`}
 let bars="";labels.forEach((lab,i)=>{let base=0;const dim=sel!=null&&sel!==i?" dim":"";
  (stack?series:series.slice(0,1)).forEach((s,si)=>{const v=s.waarden[i];if(v<=0)return;const y0=y(base),y1=y(base+v),top=si===(stack?series.length-1:0)||!stack;
   const h=Math.max(0,y0-y1-(stack&&base>0?2:0)),r=top?Math.min(4,h/2,bw/2):0;const x=gx(i)-bw/2,yt=y1;
   bars+=`<path class="vbar ${s.cls}${dim}" d="M${x},${yt+h} V${yt+r} Q${x},${yt} ${x+r},${yt} H${x+bw-r} Q${x+bw},${yt} ${x+bw},${yt+r} V${yt+h} Z"/>`;base+=v});
  if(pw/n>=46||i%Math.ceil(46/(pw/n))===0)bars+=`<text x="${gx(i)}" y="${H-8}" class="vax" text-anchor="middle">${esc(lab)}</text>`});
 let ln="";if(line){const pts=line.waarden.map((v,i)=>`${gx(i)},${y(v)}`).join(" ");ln=`<polyline points="${pts}" class="vcmp"/>`+line.waarden.map((v,i)=>`<circle cx="${gx(i)}" cy="${y(v)}" r="3" class="vcmpdot"/>`).join("")}
 const hits=labels.map((_,i)=>`<rect class="vhit" data-i="${i}" x="${L+i*(pw/n)}" y="${Tp}" width="${pw/n}" height="${ph+B}"/>`).join("");
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="grafiek">${g}<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" class="vbase"/>${bars}${ln}<g class="vhov"></g>${hits}</svg>`;
 const svg=el.querySelector("svg"),hov=el.querySelector(".vhov");
 svg.onpointermove=e=>{const h=e.target.closest(".vhit");if(!h){tip(null);hov.innerHTML="";return}const i=+h.dataset.i;hov.innerHTML=`<rect x="${L+i*(pw/n)}" y="${Tp}" width="${pw/n}" height="${ph}" class="vhovbg"/>`;tip(tipFn(i),e.clientX,e.clientY)};
 svg.onpointerleave=()=>{tip(null);hov.innerHTML=""};
 if(onClick){svg.style.cursor="pointer";svg.onclick=e=>{const h=e.target.closest(".vhit");if(h){tip(null);onClick(+h.dataset.i)}}}}
/* horizontale staven (rangorde) in HTML */
function hbars(el,items,{fmt,sel,onClick,sub,max}){const mx=max||Math.max(1e-9,...items.map(x=>x.v));
 el.innerHTML=items.length?`<div class="hb">${items.map((x,i)=>`<button type="button" class="hbr${sel&&sel===x.key?" on":""}${sel&&sel!==x.key?" dim":""}" data-k="${esc(x.key)}" ${onClick?"":"disabled"} title="${esc(x.lab+": "+fmt(x.v)+(sub?" · "+sub(x):""))}"><span class="hbl">${esc(x.lab)}</span><span class="hbt"><span class="hbf" style="width:${Math.max(1.5,x.v/mx*100)}%"></span></span><span class="hbv">${esc(fmt(x.v))}</span></button>`).join("")}</div>`:`<div class="mute">Geen gegevens in deze periode.</div>`;
 if(onClick)el.onclick=e=>{const b=e.target.closest("[data-k]");if(b)onClick(b.dataset.k)}}
function tabel(el,head,rows){el.innerHTML=`<div class="scroll"><table><thead><tr>${head.map((h,i)=>`<th${i?' class="num"':""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i?' class="num"':""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}

/* ---------- scherm ---------- */
function drawDash(){
 if(!can("omzet")){$("#dashBody").innerHTML=`<div class="empty">Het dashboard is alleen voor de beheerder.</div>`;return}
 $("#dbPer").value=DB.per;$("#dbMw").innerHTML=`<option value="">Alle medewerkers</option>`+D.medewerkers.map(m=>`<option value="${esc(m.id)}" ${m.id===DB.mw?"selected":""}>${esc(m.naam)}</option>`).join("");
 const bNaam=DB.beh?((get("artikelen",DB.beh)||{}).naam||DB.beh):"";
 $("#dbChips").innerHTML=(DB.beh?`<button class="chip" type="button" data-x="beh">${esc(bNaam)} ×</button>`:"")+(DB.maand?`<button class="chip" type="button" data-x="maand">${esc(mLang(DB.maand))} ×</button>`:"");
 const d=dbData(),T=dbTegels(),ix=DB.maand?d.maanden.indexOf(DB.maand):null;
 $("#dbTiles").innerHTML=T.map(t=>{let tr="";if(t.vv!=null&&isFinite(t.v)){const dlt=t.pp?(t.v-t.vv):t.abs?(t.v-t.vv):(t.vv?(t.v-t.vv)/t.vv:null);
   if(dlt!=null&&isFinite(dlt)){const up=dlt>0.0001,dn=dlt<-0.0001,txt=t.pp?`${dlt>0?"+":""}${Math.round(dlt*100)} procentpunt`:t.abs?`${dlt>0?"+":""}${dlt}`:`${dlt>0?"+":""}${Math.round(dlt*100)}%`;
    tr=`<span class="trend ${up?"up":dn?"dn":""}">${up?"▲":dn?"▼":"="} ${esc(txt)}</span> <span class="mute">vs. ${esc(t.vs||"vorige maand")}</span>`}}
  return`<button type="button" class="tile" data-tile="${t.id}"><span class="tl">${esc(t.lab)}</span><span class="tv">${esc(t.fmt(t.v))}</span><span class="ts">${tr||esc(t.sub)}</span>${tr?`<span class="ts mute">${esc(t.sub)}</span>`:""}</button>`}).join("");
 const labels=d.maanden.map(mLab),vals=k=>d.maanden.map(x=>d[k][x]);
 const card=(id)=>{const c=$("#"+id);return{plot:c.querySelector(".plot"),tbl:!!DB.tabel[id]}};
 /* omzet */
 {const c=card("dOmzet"),cur=vals("omzet"),pv=d.prev.map(k=>d.omzetV[k]||0),heeftV=pv.filter(v=>v>0).length>=(isDag()?2:3);
  $("#dOmzet .lg").innerHTML=`<span class="key s1"></span>${esc($("#dbPer").selectedOptions[0].textContent)}${heeftV?` <span class="key cmp"></span>${vglNaam()}`:""}`;
  const pern=isDag()?"dag":"maand";$("#dOmzet h3").textContent="Omzet per "+pern;$("#dAf h3").textContent="Afspraken per "+pern;
  const tot=cur.reduce((a,b)=>a+b,0),totV=pv.reduce((a,b)=>a+b,0);$("#dOmzet .hd small").textContent=`${eur0(tot)} totaal${heeftV&&totV?` · ${tot>=totV?"+":""}${Math.round((tot-totV)/totV*100)}% t.o.v. ${vglNaam().toLowerCase()}`:""}`;
  if(c.tbl)tabel(c.plot,[isDag()?"Dag":"Maand","Omzet",vglNaam(),"Facturen"],d.maanden.map((k,i)=>[mLang(k),eur0(cur[i]),eur0(pv[i]),nl(d.aantF[k])]));
  else barSvg(c.plot,{labels,series:[{naam:"Omzet",cls:"s1",waarden:cur}],line:heeftV?{waarden:pv}:null,fmt:eur0,sel:ix,onClick:i=>{DB.maand=DB.maand===d.maanden[i]?null:d.maanden[i];drawDash()},
   tipFn:i=>`<b>${esc(mLang(d.maanden[i]))}</b><br>Omzet: ${esc(eur0(cur[i]))}${heeftV?`<br><span class="mute">${vglNaam()}: ${esc(eur0(pv[i]))}${pv[i]?` (${cur[i]>=pv[i]?"+":""}${Math.round((cur[i]-pv[i])/pv[i]*100)}%)`:""}</span>`:""}<br>${nl(d.aantF[d.maanden[i]])} facturen${d.aantF[d.maanden[i]]?` · gem. ${esc(eur0(cur[i]/d.aantF[d.maanden[i]]))}`:""}<br><small class="mute">Klik voor details</small>`})}
 /* afspraken */
 {const c=card("dAf"),a=vals("afs"),ns=vals("noshow"),ga=vals("geann");$("#dAf .hd small").textContent=`${nl(a.reduce((x,y)=>x+y,0))} afspraken · ${nl(ns.reduce((x,y)=>x+y,0))} niet gekomen · ${nl(ga.reduce((x,y)=>x+y,0))} geannuleerd`;
  if(c.tbl)tabel(c.plot,[isDag()?"Dag":"Maand","Afspraken","Niet gekomen","Geannuleerd","Bezetting"],d.maanden.map((k,i)=>[mLang(k),nl(a[i]),nl(ns[i]),nl(ga[i]),pct(d.bez[k])]));
  else barSvg(c.plot,{labels,series:[{naam:"Afspraken",cls:"s1",waarden:a}],int:true,sel:ix,onClick:i=>{DB.maand=DB.maand===d.maanden[i]?null:d.maanden[i];drawDash()},
   tipFn:i=>`<b>${esc(mLang(d.maanden[i]))}</b><br>${nl(a[i])} afspraken<br>Bezetting: ${pct(d.bez[d.maanden[i]])}<br><span class="mute">${nl(ns[i])} niet gekomen · ${nl(ga[i])} geannuleerd</span>`})}
 /* nieuw vs terugkerend */
 {const c=card("dKl"),nw=vals("nieuw"),tr=vals("terug");$("#dKl .hd small").textContent=`${nl(nw.reduce((x,y)=>x+y,0))} nieuwe klanten in deze periode`;
  if(c.tbl)tabel(c.plot,[isDag()?"Dag":"Maand","Terugkerend","Nieuw"],d.maanden.map((k,i)=>[mLang(k),nl(tr[i]),nl(nw[i])]));
  else barSvg(c.plot,{labels,stack:true,int:true,series:[{naam:"Terugkerend",cls:"s1",waarden:tr},{naam:"Nieuw",cls:"s2",waarden:nw}],sel:ix,onClick:i=>{DB.maand=DB.maand===d.maanden[i]?null:d.maanden[i];drawDash()},
   tipFn:i=>`<b>${esc(mLang(d.maanden[i]))}</b><br><span class="key s1"></span>Terugkerend: ${nl(tr[i])}<br><span class="key s2"></span>Nieuw: ${nl(nw[i])}`})}
 /* behandelingen */
 {const c=card("dBeh"),m=DB.metric,it=d.beh.slice(0,8).map(x=>({key:x.artId||x.naam,lab:x.naam,v:x[m],x}));$$("#dBeh .seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===m));
  if(c.tbl)tabel(c.plot,["Behandeling of product","Omzet","Aantal"],d.beh.map(x=>[x.naam,eur0(x.omzet),nl(x.aantal)]));
  else hbars(c.plot,it,{fmt:m==="omzet"?eur0:nl,sel:DB.beh,sub:i=>m==="omzet"?nl(i.x.aantal)+"×":eur0(i.x.omzet),onClick:k=>{DB.beh=DB.beh===k?"":k;DB.maand=null;drawDash()}})}
 /* weekdagen */
 {const c=card("dWd");if(c.tbl)tabel(c.plot,["Dag","Bezetting","Ingepland (uur)"],d.wd.map(x=>[x.lab,pct(x.v),nl(Math.round(x.min/60))]));
  else hbars(c.plot,d.wd.map(x=>({key:x.lab,lab:x.lab,v:x.v,x})),{fmt:pct,max:Math.max(1,...d.wd.map(x=>x.v)),sub:i=>Math.round(i.x.min/60)+" uur ingepland"})}
 /* medewerkers */
 {const c=card("dMw");$("#dMw").hidden=D.medewerkers.length<2;if(c.tbl)tabel(c.plot,["Medewerker","Omzet"],d.mw.map(x=>[x.naam,eur0(x.omzet)]));
  else hbars(c.plot,d.mw.map(x=>({key:x.id,lab:x.naam,v:x.omzet})),{fmt:eur0,sel:DB.mw,onClick:k=>{DB.mw=DB.mw===k?"":k;drawDash()}})}
 /* maanddetail */
 const det=$("#dbDet");if(DB.maand&&ix>=0){const k=DB.maand,om=d.omzet[k],nf=d.aantF[k];const top=D.facturen.filter(f=>f.ts&&bKey(new Date(f.ts))===k&&(!DB.mw||fMw(f)===DB.mw)).flatMap(fRegels).reduce((m,r)=>(m[r.naam]=(m[r.naam]||0)+r.netto,m),{});
  const t3=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,3);
  det.hidden=false;det.innerHTML=`<div class="hd"><h3>${esc(mLang(k))}${DB.beh?` · ${esc(bNaam)}`:""}</h3><button class="btn s" type="button" data-x="maand">Sluiten</button></div>
   <div class="dgrid"><div><span>Omzet</span><b>${eur0(om)}</b></div><div><span>Afspraken</span><b>${nl(d.afs[k])}</b></div><div><span>Gem. per factuur</span><b>${nf?eur0(om/nf):"–"}</b></div><div><span>Nieuwe klanten</span><b>${nl(d.nieuw[k])}</b></div><div><span>Bezetting</span><b>${pct(d.bez[k])}</b></div><div><span>Niet gekomen</span><b>${nl(d.noshow[k])}</b></div></div>
   ${t3.length?`<p class="mute" style="margin:8px 0 0">Meeste omzet: ${t3.map(([n,v])=>esc(n)+" ("+eur0(v)+")").join(", ")}</p>`:""}
   <div class="acts l"><button class="btn" type="button" id="dbNaarAg">Naar de agenda van ${esc(mLang(k))}</button><button class="btn" type="button" id="dbNaarFac">Facturen</button></div>`;
  $("#dbNaarAg").onclick=()=>{if(k.length===10)agD=fromYmd(k);else{const[y,m]=k.split("-").map(Number);agD=new Date(y,m-1,1)}go("agenda")};
  $("#dbNaarFac").onclick=()=>{go("facturen");const q=$("#fq");if(q){q.value="";q.dispatchEvent(new Event("input"))}}}else det.hidden=true;
 /* opvolgen */
 {const L=typeof beurtLijst==="function"?beurtLijst(0).slice(0,8):[];$("#dOpv .hd small").textContent=L.length?"langer weg dan hun normale ritme, zonder nieuwe afspraak":"";
  $("#dOpv .plot").innerHTML=L.length?`<div class="opv">${L.map(x=>{const k=get("klanten",x.h.klantId)||{};return`<div class="opvr"><div><b>${esc(x.h.naam)}</b> <span class="mute">· ${esc(k.naam||"")}</span><br><small class="mute">${x.sinds} weken geleden · normaal elke ${x.wk} weken</small></div><button class="btn s" type="button" data-opk="${esc(k.id||"")}">Klant openen</button></div>`}).join("")}</div><div class="acts l"><button class="btn s" type="button" id="dbAlleOpv">Alle honden die aan de beurt zijn</button></div>`:`<div class="mute">Geen honden die over hun ritme heen zijn. Mooi zo!</div>`;
  const a=$("#dbAlleOpv");if(a)a.onclick=()=>{klMode="beurt";S.set("klmode","beurt");go("klanten")}}}
$("#dbPer").onchange=e=>{DB.per=e.target.value;DB.maand=null;drawDash()};
$("#dbMw").onchange=e=>{DB.mw=e.target.value;drawDash()};
$("#v-dashboard").addEventListener("click",e=>{const x=e.target.closest("[data-x]");if(x){if(x.dataset.x==="beh")DB.beh="";else DB.maand=null;drawDash();return}
 const t=e.target.closest("[data-tbl]");if(t){const id=t.dataset.tbl;DB.tabel[id]=!DB.tabel[id];t.textContent=DB.tabel[id]?"Grafiek":"Tabel";t.setAttribute("aria-pressed",!!DB.tabel[id]);drawDash();return}
 const m=e.target.closest("#dBeh .seg [data-m]");if(m){DB.metric=m.dataset.m;drawDash();return}
 const o=e.target.closest("[data-opk]");if(o){selKl=o.dataset.opk;klMode="alle";S.set("klmode","alle");go("klanten");return}
 const tl=e.target.closest("[data-tile]");if(tl){const id=tl.dataset.tile;if(id==="opvolgen"){klMode="beurt";S.set("klmode","beurt");go("klanten");return}
  const tgt={omzet:"dOmzet",afspraken:"dAf",bezet:"dWd",klanten:"dKl",herhaal:"dOpv"}[id];if(tgt){if(id==="omzet"||id==="afspraken"||id==="klanten"){if(DB.per==="vweek")DB.per="week";else if(DB.per==="vmaand")DB.per="maand";else if(DB.per==="vorig")DB.per="12m";DB.maand=bKey(today())}drawDash();$("#"+tgt).scrollIntoView({behavior:"smooth",block:"center"})}}});
let dbRz;addEventListener("resize",()=>{clearTimeout(dbRz);dbRz=setTimeout(()=>{if(tab==="dashboard")drawDash()},200)});
