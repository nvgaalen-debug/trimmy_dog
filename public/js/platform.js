/* Trimmy · platform.js */
"use strict";
/* ---------- inloggen bij een salon-account (één omgeving voor meerdere salons) ----------
   Een apparaat wordt gekoppeld met e-mail en wachtwoord (eigenaar of medewerker met eigen login).
   De koppeling is een HttpOnly-cookie; de app bewaart alleen salon en gebruiker (S "platform").
   De oude manier (adres met ?code=) blijft werken en heeft voorrang zolang die is ingesteld. */
const PLAT=()=>S.get("platform",null);
const platOn=()=>!!(PLAT()&&PLAT().salon);
const legacyCode=()=>/[?&]code=/.test(S.get("dburl",""));
const platEig=()=>platOn()&&(PLAT().gebruiker||{}).rol==="eigenaar";
const platSup=()=>platOn()&&(PLAT().gebruiker||{}).rol==="support";
const platLezen=()=>platSup()&&(PLAT().gebruiker||{}).support!=="volledig";
const fDag=v=>v?new Date(String(v).slice(0,10)+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}):"";
function apparaatNaam(){const u=navigator.userAgent;const os=/iPhone/.test(u)?"iPhone":/iPad|Macintosh.*Mobile/.test(u)?"iPad":/Android/.test(u)?"Android":/Windows/.test(u)?"Windows":/Mac OS/.test(u)?"Mac":"Apparaat";
 const br=/Edg\//.test(u)?"Edge":/Chrome\//.test(u)?"Chrome":/Firefox\//.test(u)?"Firefox":/Safari\//.test(u)?"Safari":"";return(os+(br?" · "+br:"")+(IS_APP_P()?" (app)":"")).slice(0,60)}
const IS_APP_P=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
async function authCall(pad,body){const r=await fetch("/api/auth/"+pad,body?{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Trimmy-App":"1"},body:JSON.stringify(body)}:{cache:"no-store",credentials:"same-origin"});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||"Er ging iets mis."),{status:r.status,...j});return j}
function platZet(j){const oud=PLAT()||{};S.set("platform",{salon:j.salon,gebruiker:j.gebruiker,gebruikers:j.gebruikers||oud.gebruikers||[],apparaten:j.apparaten||oud.apparaten||[],support:j.support||oud.support||[],open:j.open!==false,fout:j.fout||null,ts:Date.now()});
 S.set("dburl",location.origin+"/api/db");S.set("dbon",1);S.set("platAan",1)}
/* apparaat afgemeld of ingetrokken: niets van de salon op dit apparaat laten staan */
function platWis(){COLS.forEach(c=>{D[c]=[];S.set(c,[])});["platform","bedrijf","dburl","dbon","sessie","dbsnap","dbpull","dbinfo","sjabloon","bon","demoKeuze"].forEach(k=>S.del(k));S.set("init",1);S.set("demo",0)}

/* ---------- inlogscherm ---------- */
function platLogin(melding){if($("#plat"))return;const el=document.createElement("div");el.id="plat";el.className="plat";
 el.innerHTML=`<div class="box" role="dialog" aria-labelledby="platH"><div class="logo plogo">${self.SITE&&SITE.naam?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>':$("#hdrLogo>svg")?$("#hdrLogo>svg").outerHTML:""}<span>${esc(SJ.app)}</span></div>
  <h2 id="platH">Inloggen</h2>${melding?`<div class="note w">${esc(melding)}</div>`:""}
  <form id="plF"><label>E-mailadres<input id="plE" type="email" autocomplete="username" required></label><label>Wachtwoord<input id="plW" type="password" autocomplete="current-password" required></label>
   <button class="btn p wide" type="submit">Inloggen</button></form>
  <form id="plV" hidden><p class="mute" style="margin:0 0 10px">Vul je e-mailadres in. Je krijgt een link om een nieuw wachtwoord te kiezen.</p><label>E-mailadres<input id="plVE" type="email" autocomplete="username" required></label><button class="btn p wide" type="submit">Link sturen</button></form>
  <p class="msg" id="plM" role="alert"></p>
  <div class="pllinks"><button class="btn link" type="button" id="plVg">Wachtwoord vergeten?</button><button class="btn link" type="button" id="plDemo">Eerst de demo bekijken</button><button class="btn link" type="button" id="plCode">Koppelen met een code (zonder account)</button></div></div>`;
 document.body.append(el);const m=$("#plM");setTimeout(()=>$("#plE").focus(),50);
 $("#plVg").onclick=()=>{const v=$("#plV").hidden;$("#plV").hidden=!v;$("#plF").hidden=v;$("#plVg").textContent=v?"Terug naar inloggen":"Wachtwoord vergeten?";m.textContent=""};
 $("#plDemo").onclick=()=>{S.set("demoKeuze",1);el.remove();if(!S.get("demo",0)&&!D.klanten.length){S.del("init");location.reload();return}platUi()};
 $("#plCode").onclick=()=>{S.set("demoKeuze",1);el.remove();go("inst");instPane("koppel");setTimeout(()=>$("#dbUrl")&&$("#dbUrl").focus(),100)};
 $("#plV").onsubmit=async e=>{e.preventDefault();const b=e.submitter||$("#plV button");b.disabled=true;try{const j=await authCall("vergeten",{email:$("#plVE").value.trim()});m.className="msg ok";m.textContent=j.melding}catch(x){m.className="msg";m.textContent=x.message}b.disabled=false};
 $("#plF").onsubmit=async e=>{e.preventDefault();const b=e.submitter||$("#plF button");b.disabled=true;b.textContent="Bezig…";m.className="msg";m.textContent="";
  try{const j=await authCall("login",{email:$("#plE").value.trim(),wachtwoord:$("#plW").value,apparaat:apparaatNaam()});await platNaLogin(j)}
  catch(x){m.textContent=x.message;b.disabled=false;b.textContent="Inloggen";$("#plW").select()}}}
/* na inloggen: dit apparaat vullen met de gegevens van de salon (de database wint) */
async function platNaLogin(j){platZet(j);S.set("sjabloon",j.salon.sjabloon||"trimsalon");S.del("demoKeuze");S.set("demo",0);S.set("init",1);S.del("sessie");
 if(typeof dbOvernemen==="function")dbOvernemen();try{if(typeof dbSync==="function")await dbSync()}catch(e){}location.reload()}

/* ---------- bij het starten ---------- */
async function platStart(){
 if(!STANDALONE)return;
 /* net ingelogd via de welkomstpagina of gestart als support: dat account gaat voor op een oude code-koppeling */
 if(legacyCode()&&S.get("nieuwLogin",0)){let n;try{n=await authCall("ik")}catch(x){n=null}if(n&&n.salon){S.del("nieuwLogin");await platNaLogin(n);return}S.del("nieuwLogin")}
 if(legacyCode()){/* oude manier: alleen kijken of overstappen naar een account kan */try{await authCall("ik")}catch(x){if(x.platform)S.set("platAan",1)}platUi();return}
 const terug=new URLSearchParams(location.search).get("abonnement")==="terug";if(terug)history.replaceState(null,"",location.pathname);
 let j;try{j=await authCall("ik")}catch(x){j=x}
 if(j&&j.salon){const was=PLAT();
  /* net ingelogd via de welkomstpagina, of een andere salon dan wat hier staat: apparaat vullen vanuit de database */
  if(S.get("nieuwLogin",0)||!was||!was.salon||was.salon.id!==j.salon.id||!S.get("dbon",0)){S.del("nieuwLogin");await platNaLogin(j);return}
  const sj=j.salon.sjabloon||"trimsalon";platZet(j);if(sj!==SJ.id){S.set("sjabloon",sj);location.reload();return}platNieuweSalon();navUi();lockCheck();platUi();if(tab==="start"||tab==="inst")draw();if(terug)platAboTerug();return}
 if(j&&j.status===401){if(platOn())platWis();if(j.platform&&!S.get("demoKeuze",0)){platLogin(j.ingetrokken?"Dit apparaat is afgemeld. Log opnieuw in.":"");}else if(j.platform)S.set("platAan",1);platUi();return}
 platUi()/* offline of even niet bereikbaar: verder met wat er op dit apparaat staat */}

/* nieuwe, lege salon: de eigenaar als eerste medewerker en de standaardbehandelingen van de branche klaarzetten */
function platNieuweSalon(){const p=PLAT();if(!p||!p.gebruiker||p.gebruiker.rol!=="eigenaar"||D.medewerkers.length||D.artikelen.length||D.klanten.length||S.get("platStart_"+p.salon.id,0))return;
 S.set("platStart_"+p.salon.id,1);
 D.medewerkers=[{id:uid(),naam:(p.gebruiker.naam||"Eigenaar").split(" ")[0],kleur:"#8a4a7e",rol:"beheerder"}];D.artikelen=standaardArt(SJ.id).map(a=>({...a}));
 if(!bed.naam||bed.naam===BED0.naam)bed.naam=p.salon.naam;saveC("bedrijf");saveC("medewerkers");saveC("artikelen");draw();
 toast(`Welkom! ${SJ.app} is klaar voor ${p.salon.naam}. De standaardbehandelingen staan bij Artikelen; pas de prijzen aan, en vul bij Instellingen je salongegevens in.`,[],15000)}

/* ---------- melding als de salon niet (meer) open is ---------- */
function platBanner(){let b=$("#platBan");const p=PLAT();
 if(platSup()){const g=p.gebruiker,tot=g.tot?new Date(g.tot).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}):"";
  if(!b){b=document.createElement("div");b.id="platBan";$("#demo").parentNode.after(b)}b.className="banner sup";
  b.innerHTML=`<span><b>Supportmodus</b> · ${esc(p.salon.naam)} · ${g.support==="volledig"?"volledige toegang: wijzigingen worden opgeslagen":"meekijken: wijzigingen worden niet opgeslagen"}${tot?" · tot "+tot:""}</span><span class="sp"></span><button class="btn s" type="button" id="platSupStop">Support stoppen</button>`;
  $("#platSupStop").onclick=async()=>{try{await authCall("uit",{})}catch(x){}platWis();location.href="/beheer"};return}
 const tonen=p&&p.salon&&p.open===false;
 if(!tonen){if(b)b.remove();return}
 if(!b){b=document.createElement("div");b.id="platBan";b.className="banner w";$("#demo").parentNode.after(b)}
 b.innerHTML=`<span>${esc(p.fout||"Dit account is niet actief.")}</span><span class="sp"></span>${platEig()?`<button class="btn s" type="button" id="platBanAbo">Abonnement regelen</button>`:""}`;
 const k=$("#platBanAbo");if(k)k.onclick=()=>{go("inst");instPane("koppel")}}
function platDemoKnop(){const d=$("#demo");if(!d)return;let k=$("#platInDemo");
 if(S.get("platAan",0)&&!platOn()&&S.get("demo",0)){if(!k){k=document.createElement("button");k.id="platInDemo";k.className="btn s p";k.type="button";k.textContent="Inloggen";k.onclick=()=>{S.del("demoKeuze");platLogin()};d.append(k)}}else if(k)k.remove()}

/* ---------- instellingen: account, apparaten en abonnement ---------- */
function platUi(){platBanner();platDemoKnop();const acc=$("#platAcc");if(!acc)return;const on=platOn();
 {let ov=$("#platOver");if(!on&&legacyCode()&&S.get("platAan",0)){if(!ov){ov=document.createElement("div");ov.id="platOver";ov.className="note";ov.innerHTML=`Deze site werkt nu ook met <b>inloggen met een account</b> (eigen login per medewerker, geen code meer nodig). Heb je een uitnodiging ontvangen? Stap dan over. Wacht tot de synchronisatie hierboven groen is: wat nog niet verstuurd is, gaat verloren.<div class="acts l" style="margin-top:8px"><button class="btn p" type="button" id="platOverK">Overstappen naar inloggen</button></div>`;acc.before(ov);
   $("#platOverK").onclick=e=>arm(e.target,()=>{S.del("dburl");S.set("dbon",0);S.del("demoKeuze");platLogin()},"Klik nogmaals om over te stappen")}}else if(ov)ov.remove()}
 $("#dbLegacy").hidden=on;acc.hidden=!on;$("#platAbo").hidden=!(on&&platEig());
 const sj=$("#bSjabloon");if(sj){sj.disabled=on;sj.title=on?"De branche hoort bij je account en wordt door de leverancier ingesteld.":""}
 if(!on)return;const p=PLAT(),g=p.gebruiker||{},s=p.salon;
 acc.innerHTML=`<div class="note"><b>${esc(s.naam)}</b> · ingelogd als ${esc(g.naam||g.email)} (${g.rol==="eigenaar"?"eigenaar":g.rol==="support"?"supportmodus":"medewerker"})<br><small class="mute">${esc(g.email||"")} · klantportaal: ${esc(portaalUrl())}</small></div>
  <h3>Apparaten met toegang</h3><div class="plapp">${(p.apparaten||[]).map(a=>`<div class="plrow"><span><b>${esc(a.naam||"Apparaat")}</b>${a.dit?` <span class="pill acc">dit apparaat</span>`:""}<br><small class="mute">gekoppeld ${fDag(a.sinds)} · laatst ${fDag(a.laatst)}</small></span>${!a.dit&&platEig()?`<button class="btn s" type="button" data-plweg="${esc(a.id)}">Afmelden</button>`:""}</div>`).join("")||`<div class="mute">Geen gegevens; even geen verbinding.</div>`}</div>
  <div class="acts l"><button class="btn" type="button" id="plUit">Dit apparaat afmelden</button></div>
  <small>Afmelden wist de gegevens van de salon van dit apparaat. Verloren of verkochte telefoon? Meld hem hierboven af vanaf een ander apparaat.</small>
  ${platEig()?`<h3>Supporttoegang</h3><label class="chk"><input type="checkbox" id="plSup" ${s.supportToegestaan!==false?"checked":""}> De support van ${esc(SJ.app)} mag tijdelijk meekijken als ik om hulp vraag</label>
   <small class="mute">Elke keer dat support meekijkt, zie je hieronder wanneer, hoe lang en waarom. Zet je dit uit, dan stopt een lopende supportsessie meteen.</small>
   ${(p.support||[]).length?`<div class="plapp" style="margin-top:8px">${p.support.map(x=>`<div class="plrow"><span><b>${x.soort==="volledig"?"Volledige toegang":"Meekijken"}</b>${x.actief?' <span class="pill amber">nu actief</span>':""}<br><small class="mute">${esc(x.reden||"")} · ${fDag(x.begin)} ${new Date(x.begin).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}–${new Date(x.tot).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}</small></span></div>`).join("")}</div>`:`<small class="mute" style="display:block;margin-top:6px">Er is nog geen support bij je salon geweest.</small>`}`:""}`;
 acc.onclick=async e=>{const w=e.target.closest("[data-plweg]");
  if(w)return arm(w,async()=>{try{await authCall("apparaat-weg",{id:w.dataset.plweg});await platVernieuw()}catch(x){toast(x.message)}},"Zeker?");
  if(e.target.id==="plSup"){const aan=e.target.checked;try{await authCall("support-instelling",{aan});toast(aan?"Support mag weer meekijken als je erom vraagt.":"Supporttoegang staat uit.");await platVernieuw()}catch(x){toast(x.message);e.target.checked=!aan}return}
  if(e.target.id==="plUit")arm(e.target,async()=>{try{await authCall("uit",{})}catch(x){}platWis();location.reload()},"Klik nogmaals: afmelden en gegevens van dit apparaat wissen")};
 if(platEig())platAboUi();if(tab==="inst"&&$('.pane[data-p="team"]')&&!$('.pane[data-p="team"]').hidden)drawTeam()}
async function platVernieuw(){try{const j=await authCall("ik");platZet(j);platUi()}catch(e){}}

/* medewerker een eigen login geven (alleen de eigenaar) */
function platLoginKnop(m){if(!platEig())return"";const g=(PLAT().gebruikers||[]).find(x=>x.medewerkerId===m.id&&x.rol==="medewerker");
 return`<button class="btn s" type="button" data-ml="${esc(m.id)}" title="${g?esc(g.email+(g.actief?" · actief":" · uitgenodigd")):"Medewerker zelf laten inloggen op telefoon of computer"}">${g?(g.actief?"Eigen login ✓":"Uitgenodigd"):"Eigen login"}</button>`}
document.addEventListener("click",e=>{const b=e.target.closest("[data-ml]");if(!b||!platEig())return;const m=get("medewerkers",b.dataset.ml);if(!m)return;
 const g=(PLAT().gebruikers||[]).find(x=>x.medewerkerId===m.id&&x.rol==="medewerker");
 const d=modal(`<h2>Eigen login voor ${esc(m.naam)}</h2><p class="mute" style="margin:0 0 10px">${esc(m.naam)} krijgt een mail met een link om een wachtwoord te kiezen, en logt daarna zelf in op telefoon of computer. ${esc(SJ.app)} weet dan meteen wie er werkt; een pincode is op dat apparaat niet nodig.</p>
  <label>E-mailadres<input id="mlE" type="email" value="${esc(g?g.email:"")}" ${g?"readonly":""}></label>${g?`<p class="mute">Status: ${g.actief?"actief"+(g.laatst?", laatst ingelogd "+fDag(g.laatst):""):"uitgenodigd, nog niet geactiveerd"}</p>`:""}
  <div class="msg" id="mlM"></div><div id="mlL"></div>
  <div class="acts">${g?`<button class="btn d" type="button" id="mlWeg">Login intrekken</button><span class="sp"></span>`:""}<button class="btn" type="button" id="mlX">Sluiten</button><button class="btn p" type="button" id="mlOk">${g?"Nieuwe link sturen":"Uitnodiging sturen"}</button></div>`);
 d.q("#mlX").onclick=()=>d.close();
 d.q("#mlOk").onclick=async()=>{const em=d.q("#mlE").value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){d.q("#mlM").textContent="Vul een geldig e-mailadres in.";return}
  try{const j=await authCall("uitnodigen",{email:em,naam:m.naam,medewerkerId:m.id});d.q("#mlM").className="msg ok";d.q("#mlM").textContent=j.gemaild?"Uitnodiging gemaild naar "+em+".":"Mailen lukte niet; geef deze link zelf door:";
   d.q("#mlL").innerHTML=j.gemaild?"":`<input readonly value="${esc(j.link)}" onclick="this.select()">`;platVernieuw()}catch(x){d.q("#mlM").className="msg";d.q("#mlM").textContent=x.message}};
 if(d.q("#mlWeg"))d.q("#mlWeg").onclick=e2=>arm(e2.target,async()=>{try{await authCall("gebruiker-weg",{id:g.id});d.close();platVernieuw();toast("De login van "+m.naam+" is ingetrokken, ook op al diens apparaten.")}catch(x){d.q("#mlM").textContent=x.message}},"Zeker? Klik nogmaals")});

/* ---------- abonnement (eigenaar) ---------- */
async function aboCall(pad,body){const r=await fetch("/api/abonnement"+(pad?"/"+pad:""),body?{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Trimmy-App":"1"},body:JSON.stringify(body)}:{cache:"no-store",credentials:"same-origin"});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Er ging iets mis.");return j}
async function platAboUi(){const el=$("#platAbo");if(!el)return;let j;try{j=await aboCall("")}catch(x){el.innerHTML=`<h3>Abonnement</h3><div class="mute">${esc(x.message)}</div>`;return}
 const s=j.salon,st={proef:"Proefperiode",actief:"Actief",geblokkeerd:"Geblokkeerd"}[s.status]||s.status;
 const regel=s.status==="proef"?(s.proefTot?`Proefperiode tot en met ${fDag(s.proefTot)}.`:"Proefperiode."):s.abonnement?`Automatische incasso van ${eur(s.prijs)} per maand${s.betaaldTot?`, betaald tot ${fDag(s.betaaldTot)}`:""}.`:s.betaaldTot?`Geen automatische incasso meer; toegang tot en met ${fDag(s.betaaldTot)}.`:"Geen abonnement via automatische incasso.";
 el.innerHTML=`<h3>Abonnement</h3><div class="note${s.betaalstatus==="mislukt"?" w":""}"><b>${esc(st)}</b> · ${esc(regel)}${s.betaalstatus==="mislukt"?"<br>De laatste incasso is mislukt. Werk je betaalgegevens bij, anders wordt de toegang na twee weken beperkt.":""}</div>
  ${j.mollie?`<div class="acts l">${!s.abonnement||s.betaalstatus==="mislukt"?`<button class="btn p" type="button" id="aboStart">${s.abonnement?"Betaalgegevens bijwerken":"Abonnement starten"} (${eur(s.prijs)} per maand)</button>`:""}${s.abonnement?`<button class="btn" type="button" id="aboStop">Abonnement opzeggen</button>`:""}</div>
  <small>Je betaalt de eerste maand via iDEAL of creditcard; daarmee geef je ook toestemming voor de maandelijkse incasso. Opzeggen kan altijd; je houdt toegang tot het einde van de betaalde maand.</small>`:`<small class="mute">Online betalen is nog niet ingesteld. Neem contact op met de leverancier.</small>`}
  ${j.betalingen&&j.betalingen.length?`<details style="margin-top:8px"><summary>Betalingen</summary><table><tbody>${j.betalingen.map(b=>`<tr><td>${fDag(b.datum)}</td><td>${esc({eerste:"Eerste betaling",maand:"Maand",los:"Betaling"}[b.soort]||b.soort)}</td><td>${eur(b.bedrag)}</td><td>${esc({paid:"betaald",open:"open",pending:"bezig",failed:"mislukt",expired:"verlopen",canceled:"geannuleerd"}[b.status]||b.status)}</td></tr>`).join("")}</tbody></table></details>`:""}`;
 const st2=$("#aboStart");if(st2)st2.onclick=async()=>{st2.disabled=true;st2.textContent="Even geduld…";try{const r=await aboCall("start",{});if(r.checkoutUrl)location.href=r.checkoutUrl;else throw new Error("Geen betaallink ontvangen.")}catch(x){toast(x.message);st2.disabled=false;platAboUi()}};
 const sp=$("#aboStop");if(sp)sp.onclick=e=>arm(e.target,async()=>{try{const r=await aboCall("opzeggen",{});toast(r.totEnMet?"Opgezegd. Je houdt toegang tot en met "+fDag(r.totEnMet)+".":"Opgezegd.");platVernieuw()}catch(x){toast(x.message)}},"Zeker? Klik nogmaals om op te zeggen")}
async function platAboTerug(){toast("Bedankt! We verwerken je betaling…");for(let i=0;i<6;i++){await new Promise(r=>setTimeout(r,2500));try{const j=await aboCall("");if(j.salon.abonnement&&j.salon.betaalstatus==="ok"){toast("Je abonnement is actief. Bedankt!");platVernieuw();return}}catch(e){}}
 toast("De betaling is nog niet bevestigd. Dat kan een paar minuten duren; kijk later bij Instellingen, Koppelingen.")}

setTimeout(platStart,0);
