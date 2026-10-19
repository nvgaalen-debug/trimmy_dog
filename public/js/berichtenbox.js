/* Trimmy · berichtenbox.js */
"use strict";
/* ---------- berichten uit het klantportaal ---------- */
let selBer=null,berGezien=null;
const berOngelezen=()=>D.berichten.filter(b=>b.van==="klant"&&!b.gelezen);
function berPerKlant(){const m=new Map();D.berichten.forEach(b=>{if(!m.has(b.klantId))m.set(b.klantId,[]);m.get(b.klantId).push(b)});
 return[...m].map(([klantId,l])=>{l.sort((a,b)=>(a.ts||0)-(b.ts||0));return{klantId,l,last:l[l.length-1],nieuw:l.filter(b=>b.van==="klant"&&!b.gelezen).length}}).sort((a,b)=>(b.last.ts||0)-(a.last.ts||0))}
/* teller op het menu en een seintje bij een nieuw bericht */
function berBadge(){const b=$('#nav button[data-t="berichten"]');if(!b)return;const on=berOngelezen(),n=on.length;
 b.hidden=b.hidden||(!D.berichten.length&&!bed.portaal);
 let s=b.querySelector(".nb");if(!n){if(s)s.remove()}else{if(!s){s=document.createElement("span");s.className="nb";b.append(s)}s.textContent=n;s.title=n+(n===1?" nieuw bericht":" nieuwe berichten")}
 const ids=new Set(on.map(x=>x.id));if(berGezien){const nw=on.filter(x=>!berGezien.has(x.id));
  if(nw.length&&tab==="berichten")drawBer();
  else if(nw.length){const k=get("klanten",nw[nw.length-1].klantId);toast(`Nieuw bericht van ${k?k.naam:"een klant"}`,[["Bekijken",()=>berOpen(nw[nw.length-1].klantId)]],10000)}}
 berGezien=ids}
/* ---------- overzicht ----------
   Een gesprek telt pas als gelezen als je het zelf aanklikt. Berichten die nieuw waren
   toen je het opende, blijven gemarkeerd tot je een ander gesprek kiest. */
const berDoor=b=>b.door||"Salon";
let berFil="alle",berOpen_=null,berNieuwIds=new Set();
function berTijd(ts,lang){const d=new Date(ts||0),t=d.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}),dd=Math.round((today()-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);
 if(dd===0)return(lang?"vandaag ":"")+t;if(dd===1)return"gisteren "+t;
 if(dd<7&&dd>0)return d.toLocaleDateString("nl-NL",{weekday:lang?"long":"short"})+" "+t;
 return d.toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:d.getFullYear()!==new Date().getFullYear()?"numeric":undefined})+(lang?" "+t:"")}
function berMarkeer(id){let ch=false;D.berichten.forEach(b=>{if(b.klantId===id&&b.van==="klant"&&!b.gelezen){b.gelezen=true;berNieuwIds.add(b.id);ch=true}});if(ch){saveC("berichten");setTimeout(berBadge,0)}}
function berOpen(id){if(id!==berOpen_)berNieuwIds=new Set();selBer=id;berOpen_=id;berMarkeer(id);if(tab!=="berichten")go("berichten");else drawBer()}
function berItem(x){const k=get("klanten",x.klantId)||{naam:"Onbekende klant"},open=x.last.van==="klant";
 const tag=x.nieuw?`<span class="btag new">${x.nieuw===1?"Nieuw":x.nieuw+" nieuw"}</span>`:open?`<span class="btag open">Te beantwoorden</span>`:"";
 return`<button type="button" class="ki ber${x.nieuw?" isnew":""}" data-k="${esc(x.klantId)}" aria-current="${x.klantId===selBer}"><span class="bt"><b>${esc(k.naam)}</b><span class="bw">${esc(berTijd(x.last.ts))}</span></span><small class="bp">${esc((x.last.van==="salon"?berDoor(x.last)+": ":"")+String(x.last.tekst||"").split("\n")[0].slice(0,80))}</small>${tag}</button>`}
function drawBer(){const q=$("#berq").value.trim().toLowerCase(),alle=berPerKlant();
 /* nieuwe berichten in het open gesprek direct als gelezen zien, maar wel markeren */
 if(berOpen_&&selBer===berOpen_&&tab==="berichten"&&!document.hidden)berMarkeer(berOpen_);
 const nN=alle.filter(x=>x.nieuw).length,nO=alle.filter(x=>x.nieuw||x.last.van==="klant").length;
 $("#berFil").querySelectorAll("button").forEach(b=>{const f=b.dataset.f;b.setAttribute("aria-pressed",f===berFil);b.innerHTML=f==="alle"?"Alle":f==="nieuw"?`Nieuw${nN?` <span class="nb">${nN}</span>`:""}`:`Te beantwoorden${nO?` (${nO})`:""}`});
 $("#berAllRead").hidden=!nN;
 const L=alle.filter(x=>{if(berFil==="nieuw"&&!x.nieuw)return false;if(berFil==="open"&&!(x.nieuw||x.last.van==="klant"))return false;if(!q)return true;const k=get("klanten",x.klantId)||{};return[k.naam,...x.l.map(b=>b.tekst)].join(" ").toLowerCase().includes(q)});
 if(selBer&&!alle.some(x=>x.klantId===selBer)&&!get("klanten",selBer))selBer=null;
 if(!selBer&&innerWidth>=900){const eerste=L.find(x=>!x.nieuw)||L[0];selBer=eerste?eerste.klantId:null}
 const nieuw=L.filter(x=>x.nieuw),rest=L.filter(x=>!x.nieuw);
 $("#berList").innerHTML=L.length?(nieuw.length&&berFil!=="nieuw"?`<div class="bgrp">Nieuw</div>${nieuw.map(berItem).join("")}${rest.length?`<div class="bgrp">Eerder</div>`:""}${rest.map(berItem).join("")}`:L.map(berItem).join(""))
  :`<div class="empty">${!alle.length?(bed.portaal?"Nog geen berichten. Klanten sturen je hier berichten vanuit het klantportaal.":"Zet het klantportaal aan bij Instellingen, Berichten aan klanten. Klanten kunnen je dan hier berichten sturen."):q?"Geen gesprekken gevonden.":berFil==="nieuw"?"Geen nieuwe berichten. Alles is gelezen.":"Alles is beantwoord."}</div>`;
 const k=get("klanten",selBer),el=$("#berDet");
 if(!selBer){el.innerHTML=`<div class="empty">${nN?`Je hebt ${nN===1?"een nieuw gesprek":nN+" gesprekken met nieuwe berichten"}. Kies links een gesprek.`:"Kies links een gesprek."}</div>`;return}
 const l=D.berichten.filter(b=>b.klantId===selBer).sort((a,b)=>(a.ts||0)-(b.ts||0));
 const kan=!!(k&&k.email&&bed.mailDirect),ong=l.filter(b=>b.van==="klant"&&!b.gelezen).length,heeftKlant=l.some(b=>b.van==="klant");
 let dag="",streep=false;const bubs=l.map(b=>{const d=new Date(b.ts||0),dk=d.toDateString();let h="";
  if(dk!==dag){dag=dk;h+=`<div class="bday">${esc((t=>t[0].toUpperCase()+t.slice(1))(d.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})))}</div>`}
  const nw=b.van==="klant"&&(!b.gelezen||berNieuwIds.has(b.id));if(nw&&!streep){streep=true;h+=`<div class="bnew">Nieuw</div>`}
  return h+`<div class="bub ${b.van==="salon"?"me":"them"}${nw?" nw":""}">${esc(b.tekst)}<small>${b.van==="salon"?esc(berDoor(b))+" · ":""}${esc(d.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}))}</small></div>`}).join("");
 el.innerHTML=`<div class="det"><div class="hdr"><div><h2>${esc(k?k.naam:"Onbekende klant")}</h2><div class="mute">${esc([k&&k.tel,k&&k.email].filter(Boolean).join(" · "))}</div></div><div class="acts">${k?`<button class="btn" type="button" data-act="kaart">Klantkaart</button><button class="btn" type="button" data-act="af">Afspraak maken</button>`:""}${ong?`<button class="btn p" type="button" data-act="lees">Markeer als gelezen</button>`:heeftKlant?`<button class="btn" type="button" data-act="ongelezen">Markeer als ongelezen</button>`:""}</div></div>
  ${ong?`<div class="note bnote">${ong===1?"1 nieuw bericht":ong+" nieuwe berichten"} in dit gesprek.</div>`:""}
  <div class="chat" id="berChat">${l.length?bubs:`<div class="mute">Nog geen berichten met deze klant.</div>`}</div>
  <div class="sec"><label>Antwoord<textarea id="berT" rows="3" maxlength="2000" placeholder="Typ je antwoord. De klant ziet het in het klantportaal."></textarea></label>
  <label class="chk"><input type="checkbox" id="berMail" ${kan?"checked":"disabled"}> Klant een mailtje sturen dat er een antwoord klaarstaat${kan?"":k&&!k.email?" (geen e-mailadres)":" (zet direct e-mail versturen aan)"}</label>
  ${!cur()&&D.medewerkers.length>1?`<label class="bwie">Beantwoord door<select id="berWie">${D.medewerkers.map(m=>`<option value="${esc(m.id)}" ${m.id===lastDoor?"selected":""}>${esc(m.naam)}</option>`).join("")}</select></label>`:""}
  <div class="acts l"><button class="btn p" type="button" id="berSend">Versturen</button><span class="mute" id="berMsg" role="status"></span></div></div></div>`;
 const c=$("#berChat"),eerste=c.querySelector(".bnew");if(eerste)c.scrollTop=Math.max(0,eerste.offsetTop-c.offsetTop-8);else c.scrollTop=c.scrollHeight}
$("#berq").oninput=drawBer;
$("#berFil").onclick=e=>{const b=e.target.closest("[data-f]");if(b){berFil=b.dataset.f;drawBer()}};
$("#berAllRead").onclick=()=>{D.berichten.forEach(b=>{if(b.van==="klant"&&!b.gelezen)b.gelezen=true});saveC("berichten");berBadge();drawBer()};
$("#berList").onclick=e=>{const b=e.target.closest("[data-k]");if(b){berOpen(b.dataset.k);if(innerWidth<900)$("#berDet").scrollIntoView({behavior:"smooth"})}};
$("#berDet").addEventListener("click",async e=>{const a=e.target.closest("[data-act]");if(a){const x=a.dataset.act;
  if(x==="kaart"){selKl=selBer;klMode="alle";go("klanten")}
  else if(x==="lees")berOpen(selBer);
  else if(x==="ongelezen"){const l=D.berichten.filter(b=>b.klantId===selBer&&b.van==="klant").sort((a,b)=>(a.ts||0)-(b.ts||0));if(l.length){l[l.length-1].gelezen=false;berNieuwIds.delete(l[l.length-1].id);saveC("berichten")}berOpen_=null;berGezien=new Set(berOngelezen().map(b=>b.id));berBadge();drawBer()}
  else afDlg(null,{klantId:selBer,datum:ymd(today()),start:"09:00"});return}
 if(e.target.id!=="berSend")return;const t=$("#berT").value.trim(),m=$("#berMsg");if(!t){m.textContent="Typ eerst een antwoord.";return}
 const k=get("klanten",selBer),mail=$("#berMail").checked&&k&&k.email;
 berOpen_=selBer;berMarkeer(selBer);
 const wie=cur()||get("medewerkers",$("#berWie")?$("#berWie").value:"")||(D.medewerkers.length===1?D.medewerkers[0]:null);if(wie&&!cur()){lastDoor=wie.id;S.set("door",wie.id)}
 D.berichten.push({id:uid(),klantId:selBer,van:"salon",tekst:t,ts:Date.now(),gelezen:true,...(wie?{door:wie.naam,doorId:wie.id}:{})});saveC("berichten");drawBer();
 if(mail){$("#berMsg").textContent="Mailtje versturen…";const tekst=`Hoi ${k.naam||""},\n\nJe hebt een nieuw bericht van ${wie?wie.naam+" van ":""}${bed.naam||"de trimsalon"} in het klantportaal:\n\n"${t}"\n\nBekijk het en reageer via ${portaalUrl()}\n\nGroet,\n${wie?wie.naam+"\n":""}${bed.naam||""}`;
  try{await sendMailApi(k.email,"Nieuw bericht van "+(bed.naam||"de trimsalon"),mailHtml({klantId:k.id},"vrij",tekst),tekst);$("#berMsg").textContent="Verstuurd. De klant krijgt een mailtje."}
  catch(x){$("#berMsg").textContent="Antwoord staat in het portaal, maar het mailtje lukte niet: "+x.message}}
 else $("#berMsg").textContent="Verstuurd. De klant ziet het in het klantportaal."});
function portaalUi(){const st=$("#portaalStat");if(!st)return;const u=portaalUrl(),mist=[];
 if(!dbOn())mist.push("de database staat uit");if(!bed.mailDirect&&!$("#bMailDirect").checked)mist.push("direct e-mail versturen staat uit (nodig voor de inlogcodes)");
 st.classList.toggle("w",!!mist.length&&$("#bPortaal").checked);
 st.innerHTML=$("#bPortaal").checked?(mist.length?"Let op: "+esc(mist.join(" en "))+".":`Adres voor klanten: <b>${esc(u)}</b>`)+(STANDALONE?` <button class="btn s" type="button" id="portaalCopy">Adres kopiëren</button>`:""):"Staat uit. Klanten kunnen niet inloggen.";
 const b=$("#portaalCopy");if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(u);b.textContent="Gekopieerd"}catch(e){b.textContent=u}}}
$("#bPortaal").addEventListener("change",portaalUi);$("#bMailDirect").addEventListener("change",portaalUi);
