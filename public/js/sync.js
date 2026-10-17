/* Trimmy · sync.js */
"use strict";
/* ---------- synchronisatie met Aiven (via koppelservice) ---------- */
const DBC=[...COLS,"bedrijf"];
let dbSnap=S.get("dbsnap",{}),dbPull=S.get("dbpull",{}),dbInfo=S.get("dbinfo",{}),dbBusy=false;
const dbPersist=()=>{S.set("dbsnap",dbSnap);S.set("dbpull",dbPull);S.set("dbinfo",dbInfo)};
const dbOn=()=>S.get("dbon",0)===1&&!!S.get("dburl","");
function stable(o){return JSON.stringify(o,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,x)=>(a[x]=v[x],a),{}):v)}
const hsh=s=>{let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0,c;i<s.length;i++){c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36)};
function dbLocal(c){const m=new Map();if(c==="bedrijf")m.set("bedrijf",bed);else D[c].forEach(x=>m.set(String(x.id),x));return m}
function dbApply(c,id,data,del){if(c==="bedrijf"){if(!del)bed={...BED0,...data};return}const a=D[c],i=a.findIndex(x=>String(x.id)===id);if(del){if(i>=0)a.splice(i,1)}else if(i<0)a.push(data);else a[i]=data}
function dbUrl(c){let u;try{u=new URL(S.get("dburl",""))}catch(e){throw new Error("het adres van de koppelservice is geen geldig webadres")}u.pathname=u.pathname.replace(/\/+$/,"")+"/"+c;return u.toString()}
async function dbCall(c,body,since){const u=dbUrl(c);const r=body?await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}):await fetch(u+(u.includes("?")?"&":"?")+"since="+since,{cache:"no-store"});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"status "+r.status);return j}
function dbSoon(){if(!dbOn())return;clearTimeout(dbSoon.t);dbSoon.t=setTimeout(dbSync,2000)}
async function dbSync(){
 if(dbBusy||!dbOn())return;dbBusy=true;dbInfo={...dbInfo,busy:true};dbUi();let pulled=0,pushed=0,changed=false;
 try{for(const c of DBC){const snap=dbSnap[c]||(dbSnap[c]={});let since=dbPull[c]||0,touched=false;
   for(let page=0;page<200;page++){const j=await dbCall(c,null,since),loc=dbLocal(c);
    for(const r of j.records){const id=String(r.id),l=loc.get(id),lh=l?hsh(stable(l)):null,sh=snap[id];
     if(r.deleted){if(l&&lh===sh){dbApply(c,id,null,true);touched=true;pulled++}if(!l||lh===sh)delete snap[id]}
     else{const rh=hsh(stable(r.data));if(!l&&sh!=null)continue;
      if(!l||lh===sh){if(lh!==rh){dbApply(c,id,r.data,false);touched=true;pulled++}snap[id]=rh}else if(lh===rh)snap[id]=rh}}
    const next=j.max||since;if(!j.more||!j.records.length||next===since){dbPull[c]=Math.max(dbPull[c]||0,next);break}since=next;dbPull[c]=next}
   if(touched){if(c==="bedrijf")S.set("bedrijf",bed);else S.set(c,D[c]);changed=true}
   const loc=dbLocal(c),batch=[];
   for(const[id,dt]of loc){const h=hsh(stable(dt));if(snap[id]!==h)batch.push({id,data:dt,deleted:false,h})}
   if(c!=="facturen")for(const id of Object.keys(snap))if(!loc.has(id))batch.push({id,data:{},deleted:true,h:null});
   const size=c==="honden"?20:100;
   for(let i=0;i<batch.length;i+=size){const part=batch.slice(i,i+size);await dbCall(c,{kassa:bed.kassa||"K1",records:part.map(({id,data,deleted})=>({id,data,deleted}))});part.forEach(x=>{if(x.deleted)delete snap[x.id];else snap[x.id]=x.h});pushed+=part.length}}
  dbInfo={ts:Date.now(),pulled,pushed,err:null};if(changed){S.set("demo",0);draw()}
 }catch(e){dbInfo={...dbInfo,busy:false,err:e.message}}
 finally{dbBusy=false;dbInfo.busy=false;dbPersist();dbUi()}}
function dbUi(){const on=S.get("dbon",0)===1,url=S.get("dburl",""),t=ts=>new Date(ts).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});
 let sum="uit",stat="Staat uit. Gegevens blijven alleen in de browser van dit apparaat.",cls="",dot="Alleen dit apparaat";
 if(on&&!url){sum="adres ontbreekt";stat="Vul hieronder het adres van de koppelservice in.";cls="err";dot="Database: adres ontbreekt"}
 else if(on){if(dbInfo.busy){sum="bezig";stat="Bezig met synchroniseren…";cls="on";dot="Synchroniseren…"}
  else if(dbInfo.err){sum="fout";stat="Synchroniseren mislukt: "+dbInfo.err+". Trimmy probeert het opnieuw; er gaat niets verloren.";cls="err";dot="Database: fout"}
  else if(dbInfo.ts){sum="laatst "+t(dbInfo.ts);stat=`Laatste synchronisatie om ${t(dbInfo.ts)}. Opgehaald: ${dbInfo.pulled||0}, verstuurd: ${dbInfo.pushed||0}.`;cls="on";dot="Aiven · "+t(dbInfo.ts)}
  else{sum="aan";stat="Aan. De eerste synchronisatie volgt zo.";cls="on";dot="Aiven"}}
 const s=$("#syncDot");s.className="sync "+cls;s.querySelector("span").textContent=dot;
 if($("#dbSum")){$("#dbSum").textContent="("+sum+")";$("#dbStat").textContent=stat;$("#dbStat").classList.toggle("w",cls==="err");$("#dbOn").checked=on}}
$("#dbUrl").onchange=e=>{S.set("dburl",e.target.value.trim());dbUi();dbSoon()};
$("#dbOn").onchange=e=>{S.set("dbon",e.target.checked?1:0);dbInfo={};dbUi();if(e.target.checked)dbSync()};
$("#dbTest").onclick=async()=>{const m=$("#dbTestMsg");S.set("dburl",$("#dbUrl").value.trim());m.textContent="Bezig…";m.style.color="";
 try{const j=await dbCall("status",null,0);m.textContent=`Verbonden met database ${j.database}, schema ${j.schema} (gebruiker ${j.gebruiker}). ${j.tabellen.length} tabellen klaar.`;m.style.color="var(--ok)"}
 catch(e){m.textContent="Mislukt: "+e.message;m.style.color="var(--warn)"}};
$("#dbNow").onclick=()=>{S.set("dburl",$("#dbUrl").value.trim());if(!dbOn()){dbUi();return}dbSync()};
setInterval(()=>{if(dbOn()&&document.visibilityState==="visible")dbSync()},60000);
