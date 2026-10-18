/* Trimmy · toegang.js */
"use strict";
/* ---------- toegang: rollen, inloggen, vergrendelen ---------- */
async function pinHash(code,salt){const txt=salt+"|"+code;try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(txt));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return"h:"+hsh(txt)}}
function accessOn(){return D.medewerkers.some(m=>m.pin&&m.rol==="beheerder")}
function cur(){if(!accessOn())return null;const s=S.get("sessie",null);return s?get("medewerkers",s.id)||null:null}
function isAdmin(){if(!accessOn())return true;const m=cur();return!!(m&&m.rol==="beheerder")}
const PERMS=[["historie","Historie bekijken"],["facturen","Facturen bekijken en restant afrekenen"],["prijsBon","Prijs en korting op de bon aanpassen, vrij bedrag invoeren"],["omzet","Dashboard, omzetcijfers en export voor de accountant"],["klantDel","Klanten verwijderen"],["artikelen","Artikelen en prijzen beheren"],["inst","Instellingen (zonder medewerkers en toegang)"]];
function can(k){if(isAdmin())return true;const p={...BED0.perms,...(bed.perms||{})};return!!p[k]}
const TABPERM={historie:"historie",facturen:"facturen",artikelen:"artikelen",inst:"inst",dashboard:"omzet"};
const canTab=t=>!TABPERM[t]||can(TABPERM[t]);
function drawRights(){const p={...BED0.perms,...(bed.perms||{})};
 $("#rights").innerHTML=`<thead><tr><th>Onderdeel</th><th>Medewerker</th><th>Beheerder</th></tr></thead><tbody><tr><td>Agenda, kassa en klanten</td><td>Altijd</td><td>Ja</td></tr>`+PERMS.map(([k,l])=>`<tr><td><label for="perm-${k}" style="font-weight:400;display:inline">${esc(l)}</label></td><td><input type="checkbox" id="perm-${k}" data-perm="${k}" ${p[k]?"checked":""} style="width:auto"></td><td>Ja</td></tr>`).join("")+`<tr><td>Medewerkers, rollen en rechten</td><td>Nooit</td><td>Ja</td></tr></tbody>`}
function navUi(){$$("#nav button").forEach(b=>b.hidden=!canTab(b.dataset.t));const anyAdm=TABS.some(x=>x[2]&&canTab(x[0]));$$("#nav .navsep,#nav .navlab").forEach(x=>x.hidden=!anyAdm);const tp=isAdmin();$$('#snav [data-p="team"]').forEach(x=>x.hidden=!tp);
 const w=$("#who"),m=cur();w.hidden=!m;if(m)w.innerHTML=`<span class="dot" style="background:${esc(m.kleur||"#888")}">${esc((m.naam||"?")[0].toUpperCase())}</span><span><b>${esc(m.naam)}</b><br><small>${m.rol==="beheerder"?"Beheerder":"Medewerker"}</small></span><button class="btn s" type="button" id="lockNow">Vergrendelen</button>`}
document.addEventListener("click",e=>{if(e.target.id==="lockNow"){S.del("sessie");lockCheck()}});
let lockSel=null;
function brandUi(){const L=bed.logo||"";const hi=$("#hdrImg"),li=$("#lockImg");
 hi.hidden=!L;li.hidden=!L;if(L){hi.src=L;hi.alt=bed.naam||"Logo";li.src=L;li.alt=bed.naam||"Logo"}
 $$("#hdrLogo>svg,#logoName").forEach(x=>x.toggleAttribute("hidden",!!L));$("#lockTrimmy").hidden=!!L;$("#hdrLogo").title=L?(bed.naam||"")+" · Trimmy":"Trimmy"}
function lockCheck(){brandUi();const need=accessOn()&&!cur();$("#lock").hidden=!need;if(!need){navUi();return}
 if(document.querySelector("dialog[open]"))$$("dialog[open]").forEach(d=>d.close());
 const ppl=D.medewerkers.filter(m=>m.pin);if(!ppl.some(m=>m.id===lockSel))lockSel=ppl.length===1?ppl[0].id:null;
 $("#lockPpl").innerHTML=ppl.map(m=>`<button type="button" data-u="${m.id}" aria-pressed="${m.id===lockSel}"><span class="dot" style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;background:${esc(m.kleur||"#888")}">${esc(m.naam[0].toUpperCase())}</span>${esc(m.naam)}</button>`).join("");
 const u=get("medewerkers",lockSel);if(u){const c=$("#lockCode");if(u.pinNum)c.setAttribute("inputmode","numeric");else c.removeAttribute("inputmode")}$("#lockL").hidden=!u;$("#lockGo").disabled=!u;$("#lockMsg").textContent="";$("#lockCode").value="";if(u)setTimeout(()=>$("#lockCode").focus(),30)}
$("#lockPpl").onclick=e=>{const b=e.target.closest("[data-u]");if(b){lockSel=b.dataset.u;lockCheck()}};
async function lockTry(){const u=get("medewerkers",lockSel);if(!u)return;const ok=(await pinHash($("#lockCode").value,u.salt||""))===u.pin;
 if(!ok){$("#lockMsg").textContent="Deze code klopt niet. Probeer het opnieuw.";$("#lockCode").value="";$("#lockCode").focus();return}
 S.set("sessie",{id:u.id,ts:Date.now()});lastDoor=u.id;S.set("door",u.id);$("#lock").hidden=true;go(canTab(tab)?tab:"agenda")}
$("#lockGo").onclick=lockTry;$("#lockCode").onkeydown=e=>{if(e.key==="Enter")lockTry()};
let lastAct=Date.now();
/* activiteit gedeeld tussen tabbladen: een stil tabblad mag een actief tabblad niet uitloggen */
const actNow=()=>{const n=Date.now();if(n-lastAct>5000||!S.get("act",0)){S.set("act",n)}lastAct=n};
["pointerdown","keydown"].forEach(ev=>document.addEventListener(ev,actNow,true));
/* inloggen/uitloggen in een ander tabblad direct overnemen */
window.addEventListener("storage",e=>{if(e.key==="tr_sessie"||e.key==="tr_medewerkers"){if(e.key==="tr_medewerkers")D.medewerkers=S.get("medewerkers",D.medewerkers);lockCheck();if(tab==="inst")drawInst()}});
setInterval(()=>{const mins=+bed.autoLock||0,last=Math.max(lastAct,+S.get("act",0)||0);if(mins&&cur()&&Date.now()-last>mins*6e4){S.del("sessie");lockCheck()}},20000);
