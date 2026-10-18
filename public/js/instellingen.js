/* Trimmy · instellingen.js */
"use strict";
/* ---------- instellingen ---------- */
const BF={bNaam:"naam",bStraat:"straat",bPc:"pc",bPlaats:"plaats",bTel:"tel",bMail:"mail",bKvk:"kvk",bBtwnr:"btwnr",bIban:"iban",bTermijn:"termijn",bVoet:"voet",bKassa:"kassa",bOpen:"open",bSluit:"sluit",bDubbel:"dubbel",bMsgBev:"msgBev",bMsgHer:"msgHer",bMsgWij:"msgWij",bMsgOnd:"msgOnd",bMsgBeurt:"msgBeurt",bBeurtWk:"beurtWk",bKleur:"kleur",bAutoUur:"autoUur",bAutoLock:"autoLock"};
function drawInst(){instPane(S.get("instpane","salon"));{const ad=isAdmin();$("#wipeAll").hidden=!ad;$("#bkRestore").hidden=!ad;}for(const[i,k]of Object.entries(BF))$("#"+i).value=bed[k]??"";$("#bZon").checked=!!bed.zondag;drawLogo();$("#bMailDirect").checked=!!bed.mailDirect;$("#bAutoHer").checked=!!bed.autoHer;$("#bAutoStil").checked=bed.autoStil!==false;$("#bAutoUur").value=String(bed.autoUur||24);planUi();
 $("#mwSum").textContent=`(${D.medewerkers.length})`;
 drawTeam();
 $("#dbUrl").value=S.get("dburl","");$("#dbFrame").hidden=STANDALONE;dbUi()}
function saveBed(mEl){for(const[i,k]of Object.entries(BF)){let v=$("#"+i).value.trim();if(["termijn","open","sluit","autoLock","beurtWk"].includes(k))v=+v||BED0[k];if(k==="kassa")v=(v||"K1").toUpperCase().replace(/[^A-Z0-9]/g,"")||"K1";bed[k]=v}
 bed.zondag=$("#bZon").checked;bed.mailDirect=$("#bMailDirect").checked;bed.autoHer=$("#bAutoHer").checked;bed.autoStil=$("#bAutoStil").checked;bed.autoUur=+bed.autoUur||24;if(+bed.sluit<=+bed.open)bed.sluit=+bed.open+1;["msgBev","msgHer","msgWij","msgOnd","msgBeurt"].forEach(k=>{if(!bed[k])bed[k]=BED0[k]});saveC("bedrijf");mEl.textContent="Opgeslagen.";setTimeout(()=>{mEl.textContent=""},2500);drawInst()}
$("#bSave").onclick=()=>saveBed($("#bMsg"));
$("#bAutoHer").onchange=()=>{if($("#bAutoHer").checked&&!$("#bMailDirect").checked){$("#bMailDirect").checked=true}autoPending()};
$("#bAutoUur").onchange=autoPending;$("#bAutoStil").onchange=autoPending;
function autoPending(){const st=$("#autoStat");st.classList.add("w");st.textContent="Nog niet opgeslagen. Klik onderaan dit blok op Opslaan om de wijziging door te voeren."}
function drawLogo(){const el=$("#logoPv");if(!el)return;el.innerHTML=bed.logo?`<img src="${bed.logo}" alt="Logo" style="max-width:240px;max-height:80px;display:block">`:"Nog geen logo";$("#logoDel").hidden=!bed.logo}
$("#logoPick").onclick=()=>$("#logoF").click();
$("#logoDel").onclick=()=>{delete bed.logo;delete bed.logoW;delete bed.logoH;saveC("bedrijf");drawLogo();brandUi();toast("Logo verwijderd.")};
$("#logoF").onchange=e=>{const f=e.target.files[0];e.target.value="";if(!f)return;if(f.size>8e6){toast("Dit bestand is te groot. Kies een logo kleiner dan 8 MB.");return}
 const u=URL.createObjectURL(f),img=new Image();
 img.onload=()=>{let w=img.naturalWidth||img.width||480,h=img.naturalHeight||img.height||160;const sc=Math.min(1,480/w,160/h);w=Math.max(1,Math.round(w*sc));h=Math.max(1,Math.round(h*sc));
  const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(img,0,0,w,h);let d=c.toDataURL("image/png");
  if(d.length>180000){x.globalCompositeOperation="destination-over";x.fillStyle="#ffffff";x.fillRect(0,0,w,h);d=c.toDataURL("image/jpeg",.88)}
  URL.revokeObjectURL(u);bed.logo=d;bed.logoW=w;bed.logoH=h;saveC("bedrijf");drawLogo();brandUi();toast("Logo opgeslagen. Het staat nu in je e-mails en op je facturen.")};
 img.onerror=()=>{URL.revokeObjectURL(u);toast("Dit bestand kan Trimmy niet als afbeelding openen. Probeer een PNG of JPG.")};img.src=u};
$("#bMailTest").onclick=async()=>{const m=$("#mailStat");m.classList.remove("w");
 if(!bed.mail){m.classList.add("w");m.textContent="Vul eerst bij Bedrijfsgegevens het e-mailadres van de salon in.";return}
 m.textContent="Testmail wordt verstuurd…";
 const demo={klantId:null,hondId:null,datum:ymd(addDays(today(),1)),start:"10:00",duur:60,diensten:[]};
 try{await sendMailApi(bed.mail,"Testmail van Trimmy",mailHtml(demo,"bevestiging","Dit is een testmail. Zo zien bevestigingen en herinneringen er voor je klanten uit."),"Dit is een testmail van Trimmy.");m.textContent="Testmail verstuurd naar "+bed.mail+". Kijk ook in de map Spam."}
 catch(e){m.classList.add("w");m.textContent="Versturen mislukt: "+e.message}};$("#bSave2").onclick=()=>saveBed($("#bMsg2"));[["#bSave3","#bMsg3"],["#bSave4","#bMsg4"],["#bSave5","#bMsg5"]].forEach(([b,m])=>{$(b).onclick=()=>saveBed($(m))});
$("#snav").onclick=e=>{const b=e.target.closest("[data-p]");if(b)instPane(b.dataset.p)};
function instPane(p){if(p==="team"&&!isAdmin()){lockCheck();if(accessOn()&&!cur()){S.set("instpane","team");return}toast("Medewerkers en toegang is alleen voor een beheerder.")}if(!$(`.pane[data-p="${p}"]`)||(p==="team"&&!isAdmin()))p="salon";S.set("instpane",p);$$(".pane").forEach(x=>x.hidden=x.dataset.p!==p);$$("#snav button").forEach(x=>x.setAttribute("aria-current",x.dataset.p===p))}
$("#mwAdd").onclick=()=>{const k=["#8a4a7e","#2f7d6d","#b0662a","#3d5fa8","#8d7a1c","#a8434f"];D.medewerkers.push({id:uid(),naam:"Nieuwe medewerker",kleur:k[D.medewerkers.length%k.length],rol:"medewerker"});saveC("medewerkers");drawTeam()};
function drawTeam(){$("#mwSum").textContent=`(${D.medewerkers.length})`;
 const on=accessOn(),me=cur();
 $("#accStat").className="note"+(on?"":" w");
 $("#accStat").textContent=on?`Inloggen staat aan. Je bent ingelogd als ${me?me.naam:"onbekend"}. Medewerkers zonder code kunnen niet inloggen.`:"Iedereen ziet nu alles. Geef een beheerder een inlogcode om Artikelen, Instellingen en de omzetcijfers af te schermen.";
 $("#mwList").innerHTML=D.medewerkers.map(m=>`<div class="mwrow"><input type="color" value="${esc(m.kleur||"#8a8f8c")}" data-mc="${m.id}" aria-label="Kleur van ${esc(m.naam)}" style="width:46px;padding:2px;height:38px"><input value="${esc(m.naam)}" data-mn="${m.id}" aria-label="Naam"><select data-mr="${m.id}" aria-label="Rol"><option value="medewerker" ${m.rol!=="beheerder"?"selected":""}>Medewerker</option><option value="beheerder" ${m.rol==="beheerder"?"selected":""}>Beheerder</option></select><div class="acts l"><span class="code">${m.pin?"Code ingesteld":"Geen code"}</span><button class="btn s" type="button" data-mp="${m.id}">${m.pin?"Code wijzigen":"Code instellen"}</button>${m.pin?`<button class="btn s" type="button" data-mx="${m.id}">Code wissen</button>`:""}<button class="btn s d" type="button" data-md="${m.id}" ${me&&me.id===m.id?"disabled title=\"Je kunt jezelf niet verwijderen\"":""}>Verwijderen</button></div></div>`).join("")||`<div class="mute">Nog geen medewerkers.</div>`;
 $("#bAutoLock").value=String(bed.autoLock||0);drawRights()}
const adminsWithCode=(ex)=>D.medewerkers.filter(m=>m.id!==ex&&m.rol==="beheerder"&&m.pin);
$("#rights").onchange=e=>{const k=e.target.dataset.perm;if(!k)return;bed.perms={...BED0.perms,...(bed.perms||{}),[k]:e.target.checked};saveC("bedrijf");navUi();toast("Rechten bijgewerkt.")};
$("#mwList").onchange=e=>{const t=e.target.dataset;const m=get("medewerkers",t.mc||t.mn||t.mr);if(!m)return;
 if(t.mc)m.kleur=e.target.value;else if(t.mn)m.naam=e.target.value.trim()||m.naam;
 else if(t.mr){if(e.target.value!=="beheerder"&&m.pin&&accessOn()&&!adminsWithCode(m.id).length){e.target.value="beheerder";toast("Er moet minstens één beheerder met een inlogcode zijn.");return}m.rol=e.target.value}
 saveC("medewerkers");drawTeam();navUi()};
$("#mwList").onclick=e=>{const d=e.target.dataset;
 if(d.md){const m=get("medewerkers",d.md);if(m&&m.pin&&m.rol==="beheerder"&&accessOn()&&!adminsWithCode(m.id).length&&D.medewerkers.some(x=>x.pin&&x.id!==m.id)){toast("Dit is de laatste beheerder met een code. Geef eerst iemand anders beheerdersrechten.");return}
  arm(e.target,()=>{D.medewerkers=D.medewerkers.filter(x=>x.id!==d.md);saveC("medewerkers");drawTeam();navUi()},"Zeker?")}
 else if(d.mx){const m=get("medewerkers",d.mx);if(m.rol==="beheerder"&&!adminsWithCode(m.id).length&&D.medewerkers.some(x=>x.pin&&x.id!==m.id)){toast("Wis eerst de codes van de medewerkers, of geef iemand anders beheerdersrechten.");return}
  arm(e.target,()=>{delete m.pin;delete m.salt;saveC("medewerkers");drawTeam();navUi();lockCheck()},"Zeker?")}
 else if(d.mp)codeDlg(d.mp)};
function codeDlg(id){const m=get("medewerkers",id);if(!m)return;
 if(m.rol!=="beheerder"&&!adminsWithCode().length){toast("Stel eerst een inlogcode in voor een beheerder.");return}
 const d=modal(`<h2>Inlogcode voor ${esc(m.naam)}</h2><label>Nieuwe code (minimaal 4 tekens)<input id="cA" type="password" inputmode="numeric" autocomplete="new-password"></label><label>Herhaal de code<input id="cB" type="password" inputmode="numeric" autocomplete="new-password"></label><div class="msg" id="cM"></div><div class="acts"><button class="btn" type="button" id="cX">Annuleren</button><button class="btn p" type="button" id="cOk">Opslaan</button></div>`);
 d.q("#cX").onclick=()=>d.close();setTimeout(()=>d.q("#cA").focus(),30);
 d.q("#cOk").onclick=async()=>{const a=d.q("#cA").value,b=d.q("#cB").value;if(a.length<4){d.q("#cM").textContent="Kies een code van minimaal 4 tekens.";return}if(a!==b){d.q("#cM").textContent="De twee codes zijn niet gelijk.";return}
  const was=accessOn();m.salt=uid();m.pin=await pinHash(a,m.salt);saveC("medewerkers");d.close();
  if(!was&&accessOn()){S.set("sessie",{id:m.id,ts:Date.now()});toast(`Inloggen staat nu aan. Je bent ingelogd als ${m.naam}.`)}else toast("Code opgeslagen.");drawTeam();navUi()}}

$("#bkMake").onclick=()=>{const j=JSON.stringify({app:"Trimmy",versie:1,ts:Date.now(),bedrijf:bed,...Object.fromEntries(COLS.map(c=>[c,D[c]]))});$("#bkTxt").value=j;$("#bkCopy").hidden=false;
 $("#bkDl").hidden=false;$("#bkMsg").textContent="Back-up staat in het tekstvak."};
$("#bkDl").onclick=async()=>{try{const r=await saveFile(`trimmy-backup-${ymd(new Date())}.json`,new Blob([$("#bkTxt").value],{type:"application/json"}));$("#bkMsg").textContent=r==="saved"?"Back-up opgeslagen.":"Niet opgeslagen."}catch(e){$("#bkMsg").textContent=e.message}};
$("#bkCopy").onclick=()=>{const t=$("#bkTxt");navigator.clipboard.writeText(t.value).then(()=>$("#bkMsg").textContent="Gekopieerd.",()=>{t.select();$("#bkMsg").textContent="Geselecteerd. Kopieer met Ctrl+C."})};
$("#bkRestore").onclick=e=>{let j;try{j=JSON.parse($("#bkTxt").value)}catch(x){$("#bkMsg").textContent="Dit is geen geldige back-up.";return}if(!j||j.app!=="Trimmy"){$("#bkMsg").textContent="Dit is geen Trimmy-back-up.";return}
 arm(e.target,()=>{COLS.forEach(c=>{D[c]=Array.isArray(j[c])?j[c]:[];S.set(c,D[c])});bed={...BED0,...(j.bedrijf||{})};S.set("bedrijf",bed);S.set("demo",0);dbSnap={};dbPersist();dbSoon();$("#bkMsg").textContent="Hersteld.";draw()},"Nogmaals: alles vervangen")};
$("#wipeAll").onclick=e=>arm(e.target,()=>{wipeLocal();S.set("demo",0);dbSnap={};dbPull={};dbPersist();draw()},"Nogmaals: alles wissen");
