/* Trimmy · navigatie.js */
"use strict";
/* ---------- navigatie ---------- */
const TABS=[["agenda","Agenda"],["kassa","Kassa"],["klanten","Klanten"],["historie","Historie"],["facturen","Facturen"],["artikelen","Artikelen",1],["inst","Instellingen",1]];
let tab=S.get("tab","agenda");if(!TABS.some(t=>t[0]===tab))tab="agenda";
$("#nav").innerHTML=TABS.map(([k,l,adm],i)=>(adm&&!TABS[i-1][2]?`<span class="navsep adm" aria-hidden="true"></span><span class="navlab adm">Beheer</span>`:"")+`<button role="tab" type="button" data-t="${k}" ${adm?'class="adm"':""}>${l}</button>`).join("");
$("#nav").onclick=e=>{const b=e.target.closest("button");if(b)go(b.dataset.t)};
function go(t){if(!canTab(t))t="agenda";tab=t;S.set("tab",t);$$(".view").forEach(v=>v.hidden=v.id!=="v-"+t);$$("#nav button").forEach(b=>b.setAttribute("aria-selected",b.dataset.t===t));draw();window.scrollTo(0,0)}
function draw(){navUi();beurtBadge();({agenda:drawAg,kassa:drawKassa,klanten:drawKl,facturen:drawFac,artikelen:drawArt,historie:drawHis,inst:drawInst})[tab]();$("#demo").hidden=!S.get("demo",0);$("#logoName").textContent="Trimmy";brandUi()}
$("#demoWipe").onclick=e=>arm(e.target,()=>{wipeLocal();S.set("demo",0);draw()},"Klik nogmaals: alles wissen");
function wipeLocal(){COLS.forEach(c=>{D[c]=[];S.set(c,[])});D.medewerkers=[{id:uid(),naam:"Medewerker 1",kleur:"#8a4a7e"}];saveC("medewerkers");bed={...BED0,kassa:S.get("kassa","K1")};saveC("bedrijf");bon=newBon();saveBon()}
