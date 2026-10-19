/* Trimmy · rooster.js */
"use strict";
/* ---------- werktijden per medewerker ----------
   m.rooster = { <weekdag 0-6>: [beginMin, eindMin] }; een ontbrekende dag = vrij.
   Zonder rooster werkt een medewerker alle openingsuren van de salon. */
const DAGN=["zo","ma","di","wo","do","vr","za"],DAGL=["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
const salonOpen=d=>d.getDay()!==0||!!bed.zondag;
const salonTijd=()=>[(+bed.open||8)*60,Math.max((+bed.open||8)+1,+bed.sluit||18)*60];
function werkTijd(mwId,d){const m=mwId&&get("medewerkers",mwId);
 if(m&&m.rooster&&typeof m.rooster==="object"){const r=m.rooster[d.getDay()];return Array.isArray(r)&&r[1]>r[0]?r:null}
 return salonOpen(d)?salonTijd():null}
const werkMin=(mwId,d)=>{const t=werkTijd(mwId,d);return t?t[1]-t[0]:0};
/* beschikbare minuten op een dag: één medewerker, of alle medewerkers samen */
function capDag(d,mwId){if(mwId)return werkMin(mwId,d);if(!D.medewerkers.length)return salonOpen(d)?salonTijd()[1]-salonTijd()[0]:0;return D.medewerkers.reduce((s,m)=>s+werkMin(m.id,d),0)}
function roosterTekst(m){if(!m||!m.rooster)return"Alle openingsuren";const g=[];
 for(const i of [1,2,3,4,5,6,0]){const r=m.rooster[i];if(!r)continue;const t=`${toHM(r[0])}–${toHM(r[1])}`,l=g[g.length-1];
  if(l&&l.t===t&&l.last===(i===0?6:i-1))(l.last=i,l.n++);else g.push({first:i,last:i,t,n:1})}
 return g.length?g.map(x=>(x.n>1?`${DAGN[x.first]}–${DAGN[x.last]}`:DAGN[x.first])+" "+x.t).join(", "):"Geen werkdagen"}
function roosterDlg(id){const m=get("medewerkers",id);if(!m)return;const [so,ss]=salonTijd();
 const dagen=[1,2,3,4,5,6,0].filter(i=>i!==0||bed.zondag||(m.rooster&&m.rooster[0]));
 const d=modal(`<h2>Werktijden van ${esc(m.naam)}</h2><p class="mute" style="margin:0 0 10px">Op deze tijden kan ${esc(m.naam)} ingepland worden. De agenda toont de andere tijden grijs, en het dashboard rekent de bezetting hiermee.</p>
  <div class="rooster">${dagen.map(i=>{const r=m.rooster?m.rooster[i]:(i===0&&!bed.zondag?null:[so,ss]);return`<div class="rr"><label class="chk"><input type="checkbox" data-d="${i}" ${r?"checked":""}> ${DAGL[i]}</label><input type="time" step="900" data-b="${i}" value="${toHM(r?r[0]:so)}" ${r?"":"disabled"} aria-label="Begin ${DAGL[i]}"><span>–</span><input type="time" step="900" data-e="${i}" value="${toHM(r?r[1]:ss)}" ${r?"":"disabled"} aria-label="Einde ${DAGL[i]}"></div>`}).join("")}</div>
  <div class="msg" id="roM"></div>
  <div class="acts"><button class="btn" type="button" id="roStd">Alle openingsuren</button><span class="sp"></span><button class="btn" type="button" id="roX">Annuleren</button><button class="btn p" type="button" id="roOk">Opslaan</button></div>`);
 d.querySelector(".rooster").onchange=e=>{const i=e.target.dataset.d;if(i!=null){d.q(`[data-b="${i}"]`).disabled=!e.target.checked;d.q(`[data-e="${i}"]`).disabled=!e.target.checked}};
 d.q("#roX").onclick=()=>d.close();
 d.q("#roStd").onclick=()=>{delete m.rooster;saveC("medewerkers");d.close();drawTeam();if(typeof drawAg==="function"&&tab==="agenda")drawAg()};
 d.q("#roOk").onclick=()=>{const r={};for(const i of dagen){if(!d.q(`[data-d="${i}"]`).checked)continue;const b=toMin(d.q(`[data-b="${i}"]`).value),e=toMin(d.q(`[data-e="${i}"]`).value);
   if(!(e>b)){d.q("#roM").textContent=`Op ${DAGL[i]} moet de eindtijd na de begintijd liggen.`;return}r[i]=[b,e]}
  m.rooster=r;saveC("medewerkers");d.close();drawTeam()}}
/* waarschuwing bij inplannen buiten werktijd */
function roosterWaarschuwing(x){if(!x||!x.mwId||!x.datum||!x.start)return"";const m=get("medewerkers",x.mwId);if(!m)return"";const d=fromYmd(x.datum),t=werkTijd(x.mwId,d);
 if(!t)return`${m.naam} werkt niet op ${DAGL[d.getDay()]}.`;const s=toMin(x.start),e=s+(+x.duur||30);
 return s<t[0]||e>t[1]?`Valt buiten de werktijden van ${m.naam} op ${DAGL[d.getDay()]} (${toHM(t[0])}–${toHM(t[1])}).`:""}
