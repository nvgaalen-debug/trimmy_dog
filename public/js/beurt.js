/* Trimmy · beurt.js */
"use strict";
/* ---------- weer aan de beurt ----------
   Per hond: laatste bezoek + trim-interval => wanneer de hond weer moet komen.
   Interval: vast per hond (h.interval, weken; 0 = geen herinnering),
   anders het eigen ritme van de hond (mediaan van eerdere bezoeken), anders de salonstandaard (bed.beurtWk). */
const WK=6048e5;
function bezoeken(hId){const tdy=ymd(today()),s=new Set();
 D.behandelingen.forEach(b=>{if(b.hondId===hId&&b.datum&&b.datum<=tdy)s.add(b.datum)});
 D.afspraken.forEach(a=>{if(a.hondId===hId&&a.datum<=tdy&&!["geannuleerd","noshow"].includes(a.status))s.add(a.datum)});
 return[...s].sort()}
function ritme(dates){if(dates.length<3)return 0;const g=[];for(let i=1;i<dates.length;i++){const w=(fromYmd(dates[i])-fromYmd(dates[i-1]))/WK;if(w>=2&&w<=26)g.push(w)}
 if(g.length<2)return 0;g.sort((a,b)=>a-b);const m=g[Math.floor(g.length/2)];return Math.max(2,Math.round(m))}
function beurtInfo(h){if(!h||h.inactief)return null;const vast=h.interval===0||h.interval==="0"?0:+h.interval||null;if(vast===0)return null;
 const dates=bezoeken(h.id);if(!dates.length)return null;const last=dates[dates.length-1],r=ritme(dates);
 const wk=vast||r||+bed.beurtWk||8,bron=vast?"vast":r?"ritme":"standaard";
 const due=addDays(fromYmd(last),wk*7),tdy=today(),tdyS=ymd(tdy);
 const komt=D.afspraken.some(a=>a.hondId===h.id&&a.datum>=tdyS&&!["geannuleerd","noshow","afgerekend"].includes(a.status));
 const msg=h.beurtMsg&&h.beurtMsg>=fromYmd(last).getTime()+864e5?h.beurtMsg:0;
 const dagen=Math.round((due-tdy)/864e5),sinds=Math.max(0,Math.round((tdy-fromYmd(last))/WK));
 return{h,last,wk,bron,due:ymd(due),dagen,sinds,komt,msg}}
function beurtLijst(vooruit=7){const tdy=ymd(today());return D.honden.map(beurtInfo).filter(x=>x&&!x.komt&&x.dagen<=vooruit&&!(x.h.beurtLater&&x.h.beurtLater>tdy)&&get("klanten",x.h.klantId))
 .sort((a,b)=>(a.msg?1:0)-(b.msg?1:0)||a.dagen-b.dagen)}
/* teller op het menu */
function beurtBadge(){const b=$('#nav button[data-t="klanten"]');if(!b)return;const n=beurtLijst(0).filter(x=>!x.msg||Date.now()-x.msg>14*864e5).length;
 let s=b.querySelector(".nb");if(!n){if(s)s.remove();return}if(!s){s=document.createElement("span");s.className="nb";b.append(s)}s.textContent=n;s.title=n+(n===1?" hond is":" honden zijn")+" weer aan de beurt"}
let klMode=S.get("klmode","alle"),beurtVooruit=S.get("beurtvooruit",7);
function klModeUi(){const n=beurtLijst(beurtVooruit).length;$("#klBn").textContent=n||"";$("#klBn").hidden=!n;
 $$("#klMode button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===klMode));$("#klWrap").hidden=klMode!=="alle";$("#beurt").hidden=klMode!=="beurt"}
function wanneer(x){const d=x.dagen;return d<-1?`${-d} dagen te laat`:d===-1?"sinds gisteren":d===0?"vandaag":d===1?"morgen":`over ${d} dagen`}
function drawBeurt(){klModeUi();if(klMode!=="beurt")return;
 const L=beurtLijst(beurtVooruit),el=$("#beurtList");
 $("#beurtVw").value=String(beurtVooruit);
 if(!L.length){el.innerHTML=`<div class="empty">Er is ${beurtVooruit?"de komende "+(beurtVooruit===7?"week":beurtVooruit+" dagen"):"nu"} geen hond aan de beurt zonder afspraak. Mooi zo!</div>`;return}
 const bronL={vast:"vast interval",ritme:"eigen ritme",standaard:"standaard"};
 el.innerHTML=`<div class="scroll"><table class="beurt"><thead><tr><th>Hond</th><th>Klant</th><th>Laatst geweest</th><th>Aan de beurt</th><th></th></tr></thead><tbody>${L.map(x=>{const h=x.h,k=get("klanten",h.klantId)||{},tel=waNr(k.tel);
  return`<tr data-h="${h.id}"><td><b>${esc(h.naam)}</b><br><small class="mute">${esc(h.ras||"")}</small></td>
  <td>${esc(k.naam||"")}<br><small class="mute">${esc(k.tel||k.email||"geen telefoon of e-mail")}</small></td>
  <td>${fDate(x.last)}<br><small class="mute">${x.sinds} weken geleden</small></td>
  <td><span class="pill ${x.dagen<0?"warn":x.dagen===0?"amber":""}">${wanneer(x)}</span><br><small class="mute">elke ${x.wk} weken · ${bronL[x.bron]}</small>${x.msg?`<br><small style="color:var(--ok)">Bericht gestuurd ${fDate(ymd(new Date(x.msg)))}</small>`:""}</td>
  <td><div class="acts l" style="flex-wrap:wrap">${tel||k.email?`<button class="btn s ${x.msg?"":"p"}" type="button" data-b="msg">${x.msg?"Nog een bericht":"Bericht sturen"}</button>`:""}<button class="btn s" type="button" data-b="af">Inplannen</button><button class="btn s" type="button" data-b="later">2 weken later</button><button class="btn s" type="button" data-b="kaart">Klantkaart</button></div></td></tr>`}).join("")}</tbody></table></div>`}
$("#klMode").onclick=e=>{const b=e.target.closest("[data-m]");if(!b)return;klMode=b.dataset.m;S.set("klmode",klMode);drawKl()};
$("#beurtVw").onchange=e=>{beurtVooruit=+e.target.value;S.set("beurtvooruit",beurtVooruit);drawBeurt()};
$("#beurtList").onclick=e=>{const b=e.target.closest("[data-b]");if(!b)return;const h=get("honden",b.closest("[data-h]").dataset.h);if(!h)return;const act=b.dataset.b;
 if(act==="msg")msgDlg({klantId:h.klantId,hondId:h.id},"beurt");
 else if(act==="af")afDlg(null,{klantId:h.klantId,hondId:h.id,datum:ymd(today()),start:"09:00"});
 else if(act==="later"){h.beurtLater=ymd(addDays(today(),14));saveC("honden");drawKl();toast(`${h.naam} komt over 2 weken weer op de lijst.`,[["Ongedaan maken",()=>{delete h.beurtLater;saveC("honden");drawKl()}]])}
 else if(act==="kaart"){klMode="alle";S.set("klmode",klMode);selKl=h.klantId;drawKl()}};
