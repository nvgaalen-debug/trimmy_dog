/* Trimmy · herinneringen.js */
"use strict";
/* ---------- automatische herinneringen (ingepland op Netlify) ---------- */
let planList=S.get("planlist",[]),planInfo={ts:0,err:null},planBusy=false;
function planApi(){const m=mailApi();return m?m.replace(/\/api\/mail(?=\?|$)/,"/api/plan"):null}
const planFor=id=>planList.find(x=>x.id===id&&x.status==="gepland");
function afEpoch(a){const[y,m,d]=String(a.datum).split("-").map(Number),[h,mi]=String(a.start||"0:0").split(":").map(Number);return new Date(y,(m||1)-1,d||1,h||0,mi||0).getTime()}
function sendAtFor(a){let t=afEpoch(a)-(+bed.autoUur||24)*36e5;if(bed.autoStil!==false){const d=new Date(t),h=d.getHours();if(h>=21){d.setHours(20,0,0,0);t=d.getTime()}else if(h<8){d.setDate(d.getDate()-1);d.setHours(20,0,0,0);t=d.getTime()}}return t}
function planWanted(){const out=new Map();if(!bed.autoHer)return out;const now=Date.now(),H=(+bed.autoUur||24)*36e5;
 for(const a of D.afspraken){if(DEAD.includes(a.status)||a.status==="afgerekend")continue;const k=get("klanten",a.klantId);if(!k||!/^\S+@\S+\.\S+$/.test(String(k.email||"").trim()))continue;
  const at=afEpoch(a);if(!(at>now+30*6e4)||at-now>45*864e5)continue;if(a.aangemaakt&&at-a.aangemaakt<H)continue;if(a.herinnerd&&!a.herinnerdAuto)continue;const sa=sendAtFor(a);if(sa<now&&at-now<H/2&&!S.get("plansnap",{})[a.id])continue;
  const text=fillMsg(bed.msgHer||BED0.msgHer,a);let html=mailHtml(a,"herinnering",text);const logo=bed.logo&&html.includes(bed.logo)?bed.logo:null;if(logo)html=html.split(bed.logo).join("cid:trimmy-logo");
  out.set(a.id,{id:a.id,sendAt:sendAtFor(a),afspraakAt:at,to:String(k.email).trim(),subject:"Herinnering: "+fillMsg(bed.msgOnd||BED0.msgOnd,a),html,text,logo})}
 return out}
async function planCall(body){const u=planApi();const r=await fetch(u+(body?"":(u.includes("?")?"&":"?")+"t="+Date.now()),body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===404?"de planner staat nog niet op Netlify (plan.mjs ontbreekt)":(j.error||"status "+r.status));return j}
function planSoon(){clearTimeout(planSoon.t);planSoon.t=setTimeout(()=>planSync(),3000)}
async function planSync(){
 if(planBusy||!planApi()||!bed.mailDirect)return planUi();
 const snap=S.get("plansnap",{}),want=planWanted(),up=[],rm=[];
 for(const[id,it]of want){const h=hsh(stable(it));if(snap[id]!==h)up.push([id,it,h])}for(const id of Object.keys(snap))if(!want.has(id))rm.push(id);
 planBusy=true;try{
  const chunks=[];for(let i=0;i<up.length;i+=10)chunks.push(up.slice(i,i+10));if(!chunks.length&&rm.length)chunks.push([]);
  for(let c=0;c<chunks.length;c++){await planCall({upsert:chunks[c].map(x=>x[1]),remove:c===0?rm:[]});chunks[c].forEach(x=>{snap[x[0]]=x[2]});if(c===0)rm.forEach(id=>{delete snap[id]});S.set("plansnap",snap)}
  const j=await planCall(null);planList=Array.isArray(j.items)?j.items:[];S.set("planlist",planList);
  let ch=false;for(const it of planList){if(it.status!=="verstuurd")continue;const a=get("afspraken",it.id);if(a&&afEpoch(a)===it.afspraakAt&&a.herinnerd!==it.sentAt){a.herinnerd=it.sentAt;a.herinnerdAuto=true;ch=true}}
  planInfo={ts:Date.now(),err:null};if(ch){S.set("afspraken",D.afspraken);dbSoon();draw()}
 }catch(e){planInfo={ts:planInfo.ts,err:STANDALONE?e.message:"inplannen werkt alleen in Trimmy op jullie eigen webadres (Netlify)"}}
 finally{planBusy=false;planUi()}}
function planUi(){const st=$("#autoStat"),li=$("#autoList");if(!st)return;st.classList.remove("w");li.innerHTML="";
 if(!bed.autoHer){st.textContent="Staat uit.";return}
 if(!bed.mailDirect||!planApi()){st.classList.add("w");st.textContent="Zet eerst E-mail direct vanuit Trimmy versturen aan en vul bij Koppelservice en database het adres in.";return}
 if(planInfo.err){st.classList.add("w");st.textContent="Inplannen mislukt: "+planInfo.err+". Trimmy probeert het over 10 minuten opnieuw.";}
 const now=Date.now(),komend=planList.filter(x=>x.status==="gepland").sort((a,b)=>a.sendAt-b.sendAt),recent=planList.filter(x=>x.status!=="gepland").sort((a,b)=>(b.sentAt||b.afspraakAt)-(a.sentAt||a.afspraakAt)).slice(0,6);
 if(!planInfo.err)st.textContent=`Aan. ${komend.length} herinnering${komend.length===1?"":"en"} ingepland, verstuurd ${bed.autoUur||24} uur vooraf${bed.autoStil!==false?" (niet 's nachts)":""}.${planInfo.ts?" Bijgewerkt om "+new Date(planInfo.ts).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})+".":""}`;
 const row=x=>{const a=get("afspraken",x.id),h=a&&get("honden",a.hondId),k=a&&get("klanten",a.klantId);const pill=x.status==="gepland"?`<span class="pill">Gepland</span>`:x.status==="verstuurd"?`<span class="pill ok">Verstuurd</span>`:x.status==="mislukt"?`<span class="pill warn">Mislukt</span>`:`<span class="pill">Vervallen</span>`;
  return`<tr><td style="white-space:nowrap">${fDT(x.status==="verstuurd"&&x.sentAt?x.sentAt:x.sendAt)}</td><td>${esc(h?h.naam:"")}${k?` · ${esc(k.naam)}`:""}<br><small>${esc(x.to)}</small></td><td>${a?`Afspraak ${fDT(x.afspraakAt)}`:""}${x.error?`<br><small style="color:var(--warn)">${esc(x.error)}</small>`:""}</td><td>${pill}</td></tr>`};
 if(komend.length||recent.length)li.innerHTML=`<div class="scroll"><table><thead><tr><th>Moment</th><th>Hond en klant</th><th>Afspraak</th><th>Status</th></tr></thead><tbody>${komend.slice(0,8).map(row).join("")}${recent.map(row).join("")}</tbody></table></div>`;
 void now}
setInterval(()=>{if(bed.autoHer||Object.keys(S.get("plansnap",{})).length)planSync()},600000);
setTimeout(()=>{if(bed.autoHer||Object.keys(S.get("plansnap",{})).length)planSync()},4000);
setInterval(()=>{if(tab==="agenda")drawAg()},120000);
