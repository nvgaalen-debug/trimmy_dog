/* Trimmy · berichten.js */
"use strict";
/* ---------- meldingen, bestanden, berichten ---------- */
function toast(msg,acts=[],ms=7000){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.setAttribute("role","status");document.body.append(t)}
 t.innerHTML=`<span>${esc(msg)}</span>`+acts.map((a,i)=>`<button type="button" data-i="${i}">${esc(a[0])}</button>`).join("");t.hidden=false;
 t.onclick=e=>{const i=e.target.dataset.i;if(i!=null){t.hidden=true;acts[i][1]()}};clearTimeout(toast.h);toast.h=setTimeout(()=>{t.hidden=true},ms)}
async function saveFile(name,blob){
 let dl=null;try{dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null}catch(e){dl=null}
 if(dl){try{await dl.save({filename:name,data:blob});return"saved"}catch(e){if(e&&e.code==="declined")return"declined";if(e&&e.code==="rate_limited")throw new Error("Er staat al een opslagvraag open. Probeer het zo opnieuw.");if(!e||!["unavailable","not_granted","capability_disabled","capability_removed"].includes(e.code))throw new Error("Opslaan mislukt: "+((e&&e.message)||"onbekende fout"))}}
 if(STANDALONE){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000);return"saved"}
 throw new Error("Bestanden opslaan kan in deze weergave niet. Gebruik Trimmy op jullie eigen webadres.")}
const DEAD=["noshow","geannuleerd"];
function conflicts(x){if(!x||!x.mwId||!x.datum||DEAD.includes(x.status))return[];const s=toMin(x.start),e=s+(+x.duur||30);
 return D.afspraken.filter(y=>y.id!==x.id&&y.datum===x.datum&&y.mwId===x.mwId&&!DEAD.includes(y.status)&&toMin(y.start)<e&&toMin(y.start)+(+y.duur||30)>s)}
function confText(x,c){const m=(get("medewerkers",x.mwId)||{}).naam||"Deze medewerker";
 return`${m} heeft op ${fromYmd(x.datum).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})} al ${c.map(y=>`${y.start}–${toHM(toMin(y.start)+(+y.duur||30))} (${(get("honden",y.hondId)||{}).naam||"afspraak"})`).join(", ")}.`}
const waNr=t=>{let n=String(t||"").replace(/[^\d+]/g,"");if(n.startsWith("+"))n=n.slice(1);else if(n.startsWith("00"))n=n.slice(2);else if(n.startsWith("0"))n="31"+n.slice(1);n=n.replace(/\D/g,"");return n.length>=10?n:""};
const waUrl=(tel,txt)=>`https://wa.me/${waNr(tel)}?text=${encodeURIComponent(txt)}`;
const mailUrl=(to,sub,body)=>`mailto:${String(to||"").trim()}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
function fillMsg(t,a){const k=get("klanten",a.klantId)||{},h=get("honden",a.hondId)||{},d=a.datum?fromYmd(a.datum):null;
 const dn=(a.diensten||[]).map(i=>(get("artikelen",i)||{}).naam).filter(Boolean).map(x=>x.toLowerCase()).join(" en ");
 const bi=a.hondId&&typeof beurtInfo==="function"?beurtInfo(h):null;
 const map={portaal:location.origin+"/portaal",weken:bi?String(bi.sinds):"",laatst:bi?fromYmd(bi.last).toLocaleDateString("nl-NL",{day:"numeric",month:"long"}):"",klant:k.naam||"",hond:h.naam||"uw hond",dag:d?d.toLocaleDateString("nl-NL",{weekday:"long"}):"",datum:d?d.toLocaleDateString("nl-NL",{day:"numeric",month:"long"}):"",tijd:a.start||"",behandeling:dn||"een trimbeurt",salon:bed.naam||"",salontel:bed.tel||"",adres:[bed.straat,bed.plaats].filter(Boolean).join(", ")};
 return String(t||"").replace(/\{(\w+)\}/g,(m,x)=>x in map?map[x]:m)}
const MSGK=[["bevestiging","Bevestiging"],["herinnering","Herinnering"],["wijziging","Afspraak verplaatst"],["vrij","Eigen bericht"]];
const msgTpl=k=>k==="portaal"?(bed.msgPortaal||BED0.msgPortaal):k==="beurt"?(bed.msgBeurt||BED0.msgBeurt):k==="bevestiging"?(bed.msgBev||BED0.msgBev):k==="herinnering"?(bed.msgHer||BED0.msgHer):k==="wijziging"?(bed.msgWij||BED0.msgWij):"Hoi {klant},\n\n\nGroet, {salon}";
function mailHtml(a,kind,text){const c=/^#[0-9a-f]{6}$/i.test(bed.kleur||"")?bed.kleur:"#6a3560",h=get("honden",a.hondId)||{},hasAf=!!a.datum&&kind!=="vrij";
 const dn=(a.diensten||[]).map(i=>(get("artikelen",i)||{}).naam).filter(Boolean).join(", "),adres=[bed.straat,[bed.pc,bed.plaats].filter(Boolean).join(" ")].filter(Boolean).join(", ");
 const title={bevestiging:"Je afspraak is bevestigd",herinnering:"Tot binnenkort!",wijziging:"Je afspraak is verplaatst",beurt:"Tijd voor een trimbeurt?",portaal:"Welkom in ons klantportaal"}[kind]||"";
 const para=esc(text).split(/\n{2,}/).map(x=>`<p style="margin:0 0 14px">${x.replace(/\n/g,"<br>")}</p>`).join("");
 const row=(l,v)=>`<tr><td style="padding:5px 12px 5px 0;color:#6b706d;font-size:14px;width:110px;vertical-align:top">${l}</td><td style="padding:5px 0;font-size:15px;font-weight:bold;color:#1c2220">${v}</td></tr>`;
 const day=hasAf?fromYmd(a.datum).toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
 return`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title||bed.naam)}</title></head><body style="margin:0;padding:0;background:#f1f3f1"><div class="mailbody" style="background:#f1f3f1;padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;font-family:Arial,Helvetica,sans-serif;color:#1c2220;border-collapse:separate;overflow:hidden">
${bed.logo?`<tr><td style="padding:22px 28px 16px;border-bottom:4px solid ${c};border-radius:10px 10px 0 0;background:#ffffff"><img src="${bed.logo}" alt="${esc(bed.naam||"")}" width="${logoSize().w}" height="${logoSize().h}" style="display:block;width:${logoSize().w}px;height:${logoSize().h}px;max-width:100%;border:0;outline:none"></td></tr>`:`<tr><td style="background:${c};padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;border-radius:10px 10px 0 0">${esc(bed.naam||"")}</td></tr>`}
<tr><td style="padding:26px 28px 6px">${title?`<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1c2220;font-family:Arial,Helvetica,sans-serif">${esc(title)}</h1>`:""}<div style="font-size:15px;line-height:1.55;color:#1c2220">${para}</div></td></tr>
${hasAf?`<tr><td style="padding:2px 28px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e3e6e4;border-left:4px solid ${c};border-radius:8px"><tr><td style="padding:12px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${h.naam?row("Hond",esc(h.naam)+(h.ras?` <span style="font-weight:normal;color:#6b706d">(${esc(h.ras)})</span>`:"")):""}${row("Datum",esc(day))}${row("Tijd",`${esc(a.start)} – ${toHM(toMin(a.start)+(+a.duur||30))}`)}${dn?row("Behandeling",esc(dn)):""}${adres?row("Adres",esc(adres)):""}</table></td></tr></table></td></tr>`:""}
<tr><td style="padding:16px 28px 24px;font-size:13px;line-height:1.5;color:#6b706d;border-top:1px solid #eef0ee">${esc(bed.naam||"")}${adres?" · "+esc(adres):""}${bed.tel||bed.mail?"<br>":""}${bed.tel?"Tel. "+esc(bed.tel):""}${bed.tel&&bed.mail?" · ":""}${bed.mail?esc(bed.mail):""}</td></tr>
</table></div></body></html>`}
function logoSize(maxH=64,maxW=240){const w=+bed.logoW||maxW,h=+bed.logoH||maxH;let sc=Math.min(maxH/h,maxW/w,1);if(!isFinite(sc)||sc<=0)sc=1;return{w:Math.round(w*sc),h:Math.round(h*sc)}}
function mailApi(){const u=S.get("dburl","");if(!u)return null;try{const x=new URL(u);x.pathname=x.pathname.replace(/\/api\/db\/?$/,"/api/mail");return/\/api\/mail$/.test(x.pathname)?x.toString():null}catch(e){return null}}
async function sendMailApi(to,subject,html,text){const u=mailApi();if(!u)throw new Error("vul bij Instellingen, Koppelservice en database het adres van de koppelservice in (eindigend op /api/db?code=…). Aiven is daarvoor niet nodig");
 let r;try{r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(bed.logo&&html.includes(bed.logo)?{to,subject,html:html.split(bed.logo).join("cid:trimmy-logo"),text,logo:bed.logo}:{to,subject,html,text})})}catch(e){throw new Error(STANDALONE?"de koppelservice is niet bereikbaar":"versturen werkt alleen in Trimmy op jullie eigen webadres (Netlify)")}
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"status "+r.status);return j}
async function copyRich(html,text,el){
 try{if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([text],{type:"text/plain"})})]);return true}}catch(e){}
 try{const sel=getSelection(),r=document.createRange();r.selectNodeContents(el);sel.removeAllRanges();sel.addRange(r);const ok=document.execCommand("copy");sel.removeAllRanges();return ok}catch(e){return false}}
function msgDlg(a,kind){const k=get("klanten",a&&a.klantId);if(!k){toast("Er hoort geen klant bij.");return}
 const tel=waNr(k.tel),isAf=!!(a.id&&get("afspraken",a.id)),direct=!!bed.mailDirect;if(!isAf&&kind!=="beurt"&&kind!=="portaal")kind="vrij";
 const d=modal(`<h2>Bericht aan ${esc(k.naam)}</h2>
  ${isAf?`<label>Soort bericht<select id="mK">${MSGK.map(([v,l])=>`<option value="${v}" ${v===kind?"selected":""}>${l}</option>`).join("")}</select></label>`:""}
  <label>Bericht<textarea id="mT" rows="6"></textarea></label>
  <div class="sec" style="border-top:1px solid var(--line);padding-top:10px"><h3>WhatsApp</h3>
   ${tel?`<div class="acts l"><a class="btn p" id="mWa" target="_blank" rel="noopener">Openen in WhatsApp</a><span class="mute" style="align-self:center">${esc(k.tel)}</span></div>`:`<div class="mute">Geen bruikbaar telefoonnummer bij deze klant.</div>`}</div>
  <div class="sec" style="border-top:1px solid var(--line);padding-top:10px"><h3>E-mail</h3>
   ${k.email?`<div class="g2"><label>Aan<input id="mTo" value="${esc(k.email)}"></label><label>Onderwerp<input id="mS"></label></div>
   <div class="acts l">${direct?`<button class="btn p" type="button" id="mSend">Opgemaakte e-mail versturen</button>`:""}<button class="btn ${direct?"":"p"}" type="button" id="mCpH">Opgemaakte e-mail kopiëren</button><a class="btn" id="mMa" target="_blank" rel="noopener">Platte e-mail openen</a></div>
   ${direct?"":`<small>Direct versturen vanuit Trimmy staat uit. Zet het aan bij Instellingen, Berichten aan klanten.</small>`}
   <details id="mPv"><summary style="cursor:pointer;font-weight:600;font-size:14px">Voorbeeld van de opgemaakte e-mail</summary><div class="invwrap" style="margin-top:8px;padding:0"><div id="mHtml"></div></div></details>`:`<div class="mute">Geen e-mailadres bij deze klant.</div>`}</div>
  <small id="mH"></small>
  <div class="msg" id="mM"></div><div class="acts"><button class="btn" type="button" id="mCp">Alleen tekst kopiëren</button><button class="btn" type="button" id="mX">Sluiten</button></div>`,"wide");
 const q=x=>d.q(x),say=(t,ok)=>{q("#mM").style.color=ok?"var(--ok)":"";q("#mM").textContent=t};
 let html="";
 const upd=()=>{const t=q("#mT").value;if(q("#mWa"))q("#mWa").href=waUrl(k.tel,t);
  if(k.email){html=mailHtml(a,kind,t);q("#mMa").href=mailUrl(q("#mTo").value,q("#mS").value,t);const m=html.match(/<body[^>]*>([\s\S]*)<\/body>/i);q("#mHtml").innerHTML=m?m[1]:html}};
 const setKind=k2=>{kind=k2;q("#mT").value=fillMsg(msgTpl(kind),a);if(q("#mS"))q("#mS").value=kind==="vrij"?(bed.naam||"Bericht"):kind==="beurt"?fillMsg("{hond} is weer aan de beurt · {salon}",a):kind==="portaal"?fillMsg("Jouw klantportaal bij {salon}",a):(kind==="bevestiging"?"Bevestiging: ":"")+fillMsg(bed.msgOnd||BED0.msgOnd,a);
  q("#mH").textContent=(kind==="beurt"?"Na versturen onthoudt Trimmy dat deze klant een bericht heeft gekregen. ":kind==="bevestiging"?"Na versturen zet Trimmy de afspraak op Bevestigd. ":kind==="herinnering"?"Na versturen zet Trimmy de afspraak op herinnerd. ":"")+"WhatsApp en de platte e-mail openen in een nieuw venster; je verstuurt het bericht daar zelf.";upd()};
 q("#mT").oninput=upd;if(q("#mS"))q("#mS").oninput=upd;if(q("#mTo"))q("#mTo").oninput=upd;if(q("#mK"))q("#mK").onchange=e=>setKind(e.target.value);setKind(kind);
 const mark=()=>{if(kind==="beurt"){const hh=get("honden",a.hondId);if(hh){hh.beurtMsg=Date.now();delete hh.beurtLater;saveC("honden");setTimeout(draw,300)}return}if(!isAf)return;const r=get("afspraken",a.id);if(!r)return;
  if(kind==="herinnering")r.herinnerd=Date.now();else if(kind==="bevestiging"){r.bevestigd=Date.now();if(r.status==="gepland")r.status="bevestigd"}else return;saveC("afspraken");setTimeout(draw,300)};
 if(q("#mWa"))q("#mWa").addEventListener("click",mark);if(q("#mMa"))q("#mMa").addEventListener("click",mark);
 if(q("#mCpH"))q("#mCpH").onclick=async()=>{q("#mPv").open=true;const ok=await copyRich(html,q("#mT").value,q("#mHtml"));
  if(ok){say(`Opgemaakte e-mail gekopieerd. Open een nieuwe e-mail aan ${q("#mTo").value} in Outlook of Gmail, plak met Ctrl+V en neem het onderwerp over.`,1);mark()}else say("Kopiëren lukte niet. Selecteer het voorbeeld hieronder en kopieer met Ctrl+C.")};
 if(q("#mSend"))q("#mSend").onclick=async()=>{const to=q("#mTo").value.trim(),b=q("#mSend");if(!/^\S+@\S+\.\S+$/.test(to)){say("Dit e-mailadres lijkt niet te kloppen.");return}
  b.disabled=true;b.textContent="Bezig met versturen…";say("");
  try{await sendMailApi(to,q("#mS").value.trim()||bed.naam||"Bericht",html,q("#mT").value);mark();say("E-mail verstuurd naar "+to+".",1);b.textContent="Verstuurd"}
  catch(e){say("Versturen mislukt: "+e.message+". Gebruik zolang Opgemaakte e-mail kopiëren.");b.disabled=false;b.textContent="Opgemaakte e-mail versturen"}};
 q("#mCp").onclick=()=>{const t=q("#mT");navigator.clipboard.writeText(t.value).then(()=>{say("Tekst gekopieerd. Plak hem in WhatsApp, sms of e-mail.",1);mark()},()=>{t.select();say("Tekst geselecteerd. Kopieer met Ctrl+C.")})};
 q("#mX").onclick=()=>d.close();return d}
function remDlg(){
 const d=modal(`<h2>Herinneringen</h2><label>Afspraken op<input id="rD" type="date" value="${ymd(addDays(today(),1))}"></label><div id="rL"></div>
  <small>Met WhatsApp of E-mail staat het bericht klaar met de gegevens van de afspraak. De tekst pas je aan bij Instellingen, Berichten aan klanten.</small>
  <div class="acts"><button class="btn" type="button" id="rX">Sluiten</button></div>`,"wide");
 const render=()=>{const ds=d.q("#rD").value,L=D.afspraken.filter(a=>a.datum===ds&&!DEAD.includes(a.status)&&a.status!=="afgerekend").sort((a,b)=>toMin(a.start)-toMin(b.start));
  d.q("#rL").innerHTML=L.length?`<div class="scroll"><table><tbody>${L.map(a=>{const k=get("klanten",a.klantId)||{},h=get("honden",a.hondId)||{},t=fillMsg(bed.msgHer||BED0.msgHer,a);
   return`<tr><td style="white-space:nowrap"><b>${a.start}</b></td><td><b>${esc(h.naam||"")}</b> · ${esc(k.naam||"")}<br><small>${esc(k.tel||"geen telefoon")}</small></td><td>${a.herinnerd?`<span class="pill ok">Herinnerd ${fDT(a.herinnerd)}</span>`:`<span class="pill">Nog niet</span>`}</td><td><div class="contact">${waNr(k.tel)?`<a class="btn s p" target="_blank" rel="noopener" data-m="${a.id}" href="${esc(waUrl(k.tel,t))}">WhatsApp</a>`:""}<button class="btn s" type="button" data-e="${a.id}">${k.email?"E-mail of aanpassen":"Tekst aanpassen"}</button></div></td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty">Geen open afspraken op deze dag.</div>`};
 d.q("#rD").oninput=render;render();
 d.q("#rL").addEventListener("click",e=>{const m=e.target.closest("[data-m]");if(m){const a=get("afspraken",m.dataset.m);if(a){a.herinnerd=Date.now();saveC("afspraken");setTimeout(()=>{render();draw()},400)}return}
  const x=e.target.closest("[data-e]");if(x){msgDlg(get("afspraken",x.dataset.e),"herinnering");const d2=[...document.querySelectorAll("dialog[open]")].pop();if(d2&&d2!==d)d2.addEventListener("close",()=>setTimeout(render,350))}});
 /* bijwerken als je terugkomt uit WhatsApp of je mailprogramma (niet bij elke klik: dan verdwijnt de knop onder je muis) */
 const terug=()=>{if(d.open)render()};window.addEventListener("focus",terug);d.addEventListener("close",()=>window.removeEventListener("focus",terug));
 d.q("#rX").onclick=()=>d.close()}
