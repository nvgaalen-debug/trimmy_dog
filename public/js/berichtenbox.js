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
 const ids=new Set(on.map(x=>x.id));if(berGezien){const nw=on.filter(x=>!berGezien.has(x.id));if(nw.length&&tab!=="berichten"){const k=get("klanten",nw[nw.length-1].klantId);toast(`Nieuw bericht van ${k?k.naam:"een klant"}`,[["Bekijken",()=>{selBer=nw[nw.length-1].klantId;go("berichten")}]],10000)}}berGezien=ids}
function drawBer(){const q=$("#berq").value.trim().toLowerCase(),L=berPerKlant().filter(x=>{if(!q)return true;const k=get("klanten",x.klantId)||{};return[k.naam,...x.l.map(b=>b.tekst)].join(" ").toLowerCase().includes(q)});
 if(!selBer||!L.some(x=>x.klantId===selBer)&&!get("klanten",selBer))selBer=L[0]?L[0].klantId:null;
 /* openen = gelezen (vóór het tekenen van de lijst, zodat de teller meteen klopt) */
 if(selBer&&tab==="berichten"){let ch=false;D.berichten.forEach(b=>{if(b.klantId===selBer&&b.van==="klant"&&!b.gelezen){b.gelezen=true;ch=true}});if(ch){saveC("berichten");L.forEach(x=>{if(x.klantId===selBer)x.nieuw=0});setTimeout(berBadge,0)}}
 $("#berList").innerHTML=L.length?L.map(x=>{const k=get("klanten",x.klantId)||{naam:"Onbekende klant"};return`<button type="button" class="ki" data-k="${esc(x.klantId)}" aria-current="${x.klantId===selBer}"><b>${esc(k.naam)}${x.nieuw?` <span class="nb">${x.nieuw}</span>`:""}</b><small>${esc((x.last.van==="salon"?"Jij: ":"")+String(x.last.tekst||"").split("\n")[0].slice(0,70))}</small><small>${esc(new Date(x.last.ts||0).toLocaleString("nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}</small></button>`}).join(""):`<div class="empty">${bed.portaal?"Nog geen berichten. Klanten sturen je hier berichten vanuit het klantportaal.":"Zet het klantportaal aan bij Instellingen, Berichten aan klanten. Klanten kunnen je dan hier berichten sturen."}</div>`;
 const k=get("klanten",selBer),el=$("#berDet");
 if(!selBer){el.innerHTML=`<div class="empty">Kies links een gesprek.</div>`;return}
 const l=D.berichten.filter(b=>b.klantId===selBer).sort((a,b)=>(a.ts||0)-(b.ts||0));
 const kan=!!(k&&k.email&&bed.mailDirect);
 el.innerHTML=`<div class="det"><div class="hdr"><div><h2>${esc(k?k.naam:"Onbekende klant")}</h2><div class="mute">${esc([k&&k.tel,k&&k.email].filter(Boolean).join(" · "))}</div></div><div class="acts">${k?`<button class="btn" type="button" data-act="kaart">Klantkaart</button><button class="btn" type="button" data-act="af">Afspraak maken</button>`:""}</div></div>
  <div class="chat" id="berChat">${l.length?l.map(b=>`<div class="bub ${b.van==="salon"?"me":"them"}">${esc(b.tekst)}<small>${b.van==="salon"?"Jij · ":""}${esc(new Date(b.ts||0).toLocaleString("nl-NL",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}</small></div>`).join(""):`<div class="mute">Nog geen berichten met deze klant.</div>`}</div>
  <div class="sec"><label>Antwoord<textarea id="berT" rows="3" maxlength="2000" placeholder="Typ je antwoord. De klant ziet het in het klantportaal."></textarea></label>
  <label class="chk"><input type="checkbox" id="berMail" ${kan?"checked":"disabled"}> Klant een mailtje sturen dat er een antwoord klaarstaat${kan?"":k&&!k.email?" (geen e-mailadres)":" (zet direct e-mail versturen aan)"}</label>
  <div class="acts l"><button class="btn p" type="button" id="berSend">Versturen</button><span class="mute" id="berMsg" role="status"></span></div></div></div>`;
 const c=$("#berChat");c.scrollTop=c.scrollHeight}
$("#berq").oninput=drawBer;
$("#berList").onclick=e=>{const b=e.target.closest("[data-k]");if(b){selBer=b.dataset.k;drawBer();if(innerWidth<900)$("#berDet").scrollIntoView({behavior:"smooth"})}};
$("#berDet").addEventListener("click",async e=>{const a=e.target.closest("[data-act]");if(a){if(a.dataset.act==="kaart"){selKl=selBer;klMode="alle";go("klanten")}else afDlg(null,{klantId:selBer,datum:ymd(today()),start:"09:00"});return}
 if(e.target.id!=="berSend")return;const t=$("#berT").value.trim(),m=$("#berMsg");if(!t){m.textContent="Typ eerst een antwoord.";return}
 const k=get("klanten",selBer),mail=$("#berMail").checked&&k&&k.email;
 D.berichten.push({id:uid(),klantId:selBer,van:"salon",tekst:t,ts:Date.now(),gelezen:true});saveC("berichten");drawBer();
 if(mail){$("#berMsg").textContent="Mailtje versturen…";const tekst=`Hoi ${k.naam||""},\n\nJe hebt een nieuw bericht van ${bed.naam||"de trimsalon"} in het klantportaal:\n\n"${t}"\n\nBekijk het en reageer via ${location.origin}/portaal\n\nGroet, ${bed.naam||""}`;
  try{await sendMailApi(k.email,"Nieuw bericht van "+(bed.naam||"de trimsalon"),mailHtml({klantId:k.id},"vrij",tekst),tekst);$("#berMsg").textContent="Verstuurd. De klant krijgt een mailtje."}
  catch(x){$("#berMsg").textContent="Antwoord staat in het portaal, maar het mailtje lukte niet: "+x.message}}
 else $("#berMsg").textContent="Verstuurd. De klant ziet het in het klantportaal."});
function portaalUi(){const st=$("#portaalStat");if(!st)return;const u=location.origin+"/portaal",mist=[];
 if(!dbOn())mist.push("de database staat uit");if(!bed.mailDirect&&!$("#bMailDirect").checked)mist.push("direct e-mail versturen staat uit (nodig voor de inlogcodes)");
 st.classList.toggle("w",!!mist.length&&$("#bPortaal").checked);
 st.innerHTML=$("#bPortaal").checked?(mist.length?"Let op: "+esc(mist.join(" en "))+".":`Adres voor klanten: <b>${esc(u)}</b>`)+(STANDALONE?` <button class="btn s" type="button" id="portaalCopy">Adres kopiëren</button>`:""):"Staat uit. Klanten kunnen niet inloggen.";
 const b=$("#portaalCopy");if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(u);b.textContent="Gekopieerd"}catch(e){b.textContent=u}}}
$("#bPortaal").addEventListener("change",portaalUi);$("#bMailDirect").addEventListener("change",portaalUi);
