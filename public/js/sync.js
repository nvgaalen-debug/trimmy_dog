/* Trimmy · sync.js */
"use strict";
/* ---------- synchronisatie met Aiven (via koppelservice) ---------- */
const DBC=[...COLS,"bedrijf"];
let dbSnap=S.get("dbsnap",{}),dbPull=S.get("dbpull",{}),dbInfo=S.get("dbinfo",{}),dbBusy=false;
const dbPersist=()=>{S.set("dbsnap",dbSnap);S.set("dbpull",dbPull);S.set("dbinfo",dbInfo)};
const dbOn=()=>S.get("dbon",0)===1&&!!S.get("dburl","");
function stable(o){return JSON.stringify(o,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,x)=>(a[x]=v[x],a),{}):v)}
const hsh=s=>{let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0,c;i<s.length;i++){c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36)};
function dbLocal(c){const m=new Map();if(c==="bedrijf"){const{kassa,...b}=bed;m.set("bedrijf",b)}else D[c].forEach(x=>m.set(String(x.id),x));return m}
function dbApply(c,id,data,del){if(c==="bedrijf"){if(!del){const{kassa,...rest}=data||{};bed={...BED0,...rest,kassa:S.get("kassa",bed.kassa||"K1")}}return}const a=D[c],i=a.findIndex(x=>String(x.id)===id);if(del){if(i>=0)a.splice(i,1)}else if(i<0)a.push(data);else a[i]=data}
function dbUrl(c){let u;try{u=new URL(S.get("dburl",""))}catch(e){throw new Error("het adres van de koppelservice is geen geldig webadres")}u.pathname=u.pathname.replace(/\/+$/,"")+"/"+c;return u.toString()}
async function dbCall(c,body,since,extra=""){const u=dbUrl(c);const r=body?await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}):await fetch(u+(u.includes("?")?"&":"?")+"since="+since+extra,{cache:"no-store"});
 const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||"status "+r.status);e.status=r.status;throw e}return j}
function dbSoon(){if(!dbOn())return;clearTimeout(dbSoon.t);dbSoon.t=setTimeout(dbSync,2000)}
/* één binnengekomen record verwerken; lokale wijzigingen die nog niet verstuurd zijn gaan voor */
function dbTake(c,r,loc,snap){const id=String(r.id),l=loc.get(id),lh=l?hsh(stable(l)):null,sh=snap[id];
 if(r.deleted){let t=false;if(l&&lh===sh){dbApply(c,id,null,true);loc.delete(id);t=true}if(!l||lh===sh)delete snap[id];return t}
 const rh=hsh(stable(r.data));if(!l&&sh!=null)return false;
 if(!l||lh===sh){snap[id]=rh;if(lh!==rh){dbApply(c,id,r.data,false);loc.set(id,r.data);return true}return false}
 if(lh===rh)snap[id]=rh;return false}
let dbLast=0;
async function dbSync(){
 if(dbBusy||!dbOn())return;dbBusy=true;dbInfo={...dbInfo,busy:true};dbUi();let pulled=0,pushed=0;const touched=new Set(),eerste=dbNooit();
 /* allereerste synchronisatie van dit apparaat: bestaat een record al in de database, dan wint de database */
 const take=(c,r,loc,snap)=>{const id=String(r.id);if(eerste&&loc.has(id)&&snap[id]==null)snap[id]=hsh(stable(loc.get(id)));return dbTake(c,r,loc,snap)};
 try{
  /* ophalen: alle tabellen in één aanroep; oudere koppelservice valt terug op per tabel */
  let comb=S.get("dbcomb",1)!==0;
  if(comb){try{const locs={};let since=dbPull._alle!=null?dbPull._alle:Math.min(...DBC.map(c=>dbPull[c]||0));
    for(let page=0;page<200;page++){const j=await dbCall("_alle",null,since,page===0?"&recent=1":"");
     for(const r of j.records){const c=r.t;if(!DBC.includes(c))continue;const loc=locs[c]||(locs[c]=dbLocal(c)),snap=dbSnap[c]||(dbSnap[c]={});if(take(c,r,loc,snap)){touched.add(c);pulled++}}
     const next=j.max||since;if(!j.more||!j.records.length||next===since){since=Math.max(since,next);break}since=next}
    dbPull._alle=since}
   catch(e){if(e.status===404){comb=false;S.set("dbcomb",0)}else throw e}}
  if(!comb)for(const c of DBC){const snap=dbSnap[c]||(dbSnap[c]={});let since=dbPull[c]||0;
   for(let page=0;page<200;page++){const j=await dbCall(c,null,since),loc=dbLocal(c);
    for(const r of j.records)if(take(c,r,loc,snap)){touched.add(c);pulled++}
    const next=j.max||since;if(!j.more||!j.records.length||next===since){dbPull[c]=Math.max(dbPull[c]||0,next);break}since=next;dbPull[c]=next}}
  for(const c of touched){if(c==="bedrijf")S.set("bedrijf",bed);else S.set(c,D[c])}
  /* versturen: alleen tabellen met wijzigingen kosten een aanroep */
  for(const c of DBC){const snap=dbSnap[c]||(dbSnap[c]={}),loc=dbLocal(c),batch=[];
   for(const[id,dt]of loc){const h=hsh(stable(dt));if(snap[id]!==h)batch.push({id,data:dt,deleted:false,h})}
   if(c!=="facturen")for(const id of Object.keys(snap))if(!loc.has(id))batch.push({id,data:{},deleted:true,h:null});
   const size=c==="honden"?20:100;
   for(let i=0;i<batch.length;i+=size){const part=batch.slice(i,i+size);await dbCall(c,{kassa:bed.kassa||"K1",records:part.map(({id,data,deleted})=>({id,data,deleted}))});part.forEach(x=>{if(x.deleted)delete snap[x.id];else snap[x.id]=x.h});pushed+=part.length}}
  dbInfo={ts:Date.now(),pulled,pushed,err:null};if(touched.size){S.set("demo",0);draw()}
 }catch(e){dbInfo={...dbInfo,busy:false,err:e.message,offline:!navigator.onLine||e instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(e.message)}}
 finally{dbBusy=false;dbInfo.busy=false;dbLast=Date.now();dbPersist();dbUi()}}
/* vlak voor het opslaan van een afspraak: snel de nieuwste stand ophalen (max. ms) */
async function dbFresh(ms=4000){if(!dbOn())return"uit";if(!navigator.onLine)return"offline";
 const end=Date.now()+ms;while(dbBusy&&Date.now()<end)await new Promise(r=>setTimeout(r,100));
 if(dbBusy)return"traag";
 const done=await Promise.race([dbSync().then(()=>true),new Promise(r=>setTimeout(()=>r(false),Math.max(500,end-Date.now())))]);
 if(!done)return"traag";return dbInfo.err?(dbInfo.offline?"offline":"fout"):"ok"}
function dbUi(){const on=S.get("dbon",0)===1,url=S.get("dburl",""),t=ts=>new Date(ts).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});
 let sum="uit",stat="Staat uit. Gegevens blijven alleen in de browser van dit apparaat.",cls="",dot="Alleen dit apparaat";
 if(on&&!url){sum="adres ontbreekt";stat="Vul hieronder het adres van de koppelservice in.";cls="err";dot="Database: adres ontbreekt"}
 else if(on){if(dbInfo.busy){sum="bezig";stat="Bezig met synchroniseren…";cls="on";dot="Synchroniseren…"}
  else if(dbInfo.err&&dbInfo.offline){sum="offline";stat="Geen verbinding met de database. Je werkt gewoon door op dit apparaat; zodra er weer internet is, gaan alle wijzigingen vanzelf mee."+(dbInfo.ts?` Laatste synchronisatie om ${t(dbInfo.ts)}.`:"");cls="off";dot="Offline"+(dbInfo.ts?" · laatst "+t(dbInfo.ts):"")}
  else if(dbInfo.err){sum="fout";stat="Synchroniseren mislukt: "+dbInfo.err+". Trimmy probeert het opnieuw; er gaat niets verloren.";cls="err";dot="Database: fout"}
  else if(dbInfo.ts){sum="laatst "+t(dbInfo.ts);stat=`Laatste synchronisatie om ${t(dbInfo.ts)}. Opgehaald: ${dbInfo.pulled||0}, verstuurd: ${dbInfo.pushed||0}.`;cls="on";dot="Aiven · "+t(dbInfo.ts)}
  else{sum="aan";stat="Aan. De eerste synchronisatie volgt zo.";cls="on";dot="Aiven"}}
 const s=$("#syncDot");s.className="sync "+cls;s.querySelector("span").textContent=dot;
 if($("#dbSum")){$("#dbSum").textContent="("+sum+")";$("#dbStat").textContent=stat;$("#dbStat").classList.toggle("w",cls==="err");$("#dbOn").checked=on}}
$("#dbUrl").onchange=e=>{S.set("dburl",e.target.value.trim());dbUi();dbSoon()};
/* nieuw apparaat: staan er al gegevens in de database, dan eerst vragen of dit apparaat die overneemt */
function dbNooit(){return!dbInfo.ts&&!Object.keys(dbPull).length&&!Object.keys(dbSnap).some(c=>Object.keys(dbSnap[c]||{}).length)}
function dbOvernemen(){COLS.forEach(c=>{D[c]=[];S.set(c,[])});
 /* salongegevens: de database wint, alleen de Kassa-ID van dit apparaat blijft */
 dbSnap={bedrijf:{bedrijf:hsh(stable(dbLocal("bedrijf").get("bedrijf")))}};dbPull={};S.set("demo",0);bon=newBon();saveBon();dbPersist()}
async function dbAanzetten(){S.set("dburl",$("#dbUrl").value.trim());
 if(dbNooit()){let n=0;try{const j=await dbCall("_alle",null,0);n=(j.records||[]).filter(r=>!r.deleted&&r.t!=="bedrijf").length}catch(e){}
  if(n){const d=modal(`<h2>Gegevens uit de database overnemen?</h2><p>In de database staan al ${n} records (klanten, honden, afspraken…), bijvoorbeeld van je andere apparaat.</p>
   <p><b>Overnemen</b> (aanbevolen voor een extra apparaat): dit apparaat wordt gevuld met de gegevens uit de database. Wat nu op dit apparaat staat${S.get("demo",0)?" (de voorbeeldgegevens)":""} verdwijnt.</p>
   <p><b>Samenvoegen</b>: wat op dit apparaat staat, komt erbij in de database.</p>
   <div class="acts"><button class="btn" type="button" id="oX">Annuleren</button><button class="btn" type="button" id="oS">Samenvoegen</button><button class="btn p" type="button" id="oO">Overnemen</button></div>`);
   const keuze=await new Promise(r=>{d.q("#oO").onclick=()=>r("o");d.q("#oS").onclick=()=>r("s");d.q("#oX").onclick=()=>r(null);d.addEventListener("close",()=>r(null))});d.close();
   if(!keuze){$("#dbOn").checked=false;return}
   if(keuze==="o")dbOvernemen()}}
 S.set("dbon",1);dbInfo={};dbUi();await dbSync();
 if(typeof lockCheck==="function")lockCheck();draw()}
$("#dbOn").onchange=e=>{if(e.target.checked)dbAanzetten();else{S.set("dbon",0);dbInfo={};dbUi()}};
if($("#dbTest"))$("#dbTest").onclick=async()=>{const m=$("#dbTestMsg");S.set("dburl",$("#dbUrl").value.trim());m.textContent="Bezig…";m.style.color="";
 try{const j=await dbCall("status",null,0);m.textContent=`Verbonden met database ${j.database}, schema ${j.schema} (gebruiker ${j.gebruiker}). ${j.tabellen.length} tabellen klaar.`;m.style.color="var(--ok)"}
 catch(e){m.textContent="Mislukt: "+e.message;m.style.color="var(--warn)"}};
$("#dbNow").onclick=()=>{S.set("dburl",$("#dbUrl").value.trim());if(!dbOn()){dbUi();return}dbSync()};
/* verversen: elke 30 s met de agenda (of een venster) open, anders elke 2 min, na 10 min niets doen elke 5 min */
let dbUse=Date.now();["pointerdown","keydown"].forEach(ev=>document.addEventListener(ev,()=>{dbUse=Date.now()},true));
setInterval(()=>{if(!dbOn()||dbBusy||document.visibilityState!=="visible")return;const idle=Date.now()-dbUse>6e5;
 const iv=idle?3e5:(tab==="agenda"||document.querySelector("dialog[open]"))?3e4:12e4;if(Date.now()-dbLast>=iv)dbSync()},5000);
const dbWake=()=>{if(dbOn()&&document.visibilityState==="visible"&&Date.now()-dbLast>1e4)dbSync()};
document.addEventListener("visibilitychange",dbWake);window.addEventListener("focus",dbWake);
window.addEventListener("online",()=>{if(dbOn())setTimeout(dbSync,1500)});
window.addEventListener("offline",()=>{if(dbOn()&&!dbInfo.err){dbInfo={...dbInfo,err:"geen internet",offline:true};dbUi()}});
$("#dbRefill").onclick=e=>{if(!dbOn()){toast("Zet eerst de database aan.");return}arm(e.target,async()=>{dbOvernemen();draw();await dbSync();lockCheck();draw();toast(dbInfo.err?"Ophalen mislukt: "+dbInfo.err:"Dit apparaat is opnieuw gevuld vanuit de database.")},"Zeker? Klik nogmaals")};
