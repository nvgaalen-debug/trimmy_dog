/* Trimmy · sjabloon.js */
"use strict";
/* ---------- sjablonen per branche ----------
   Eén app, meerdere branches. Een sjabloon bepaalt de woorden, de velden in het dossier en bij een behandeling,
   de standaardbehandelingen en -teksten, en of er een apart "onderwerp" is (een hond) of dat de klant zelf het onderwerp is.
   Zonder onderwerp maakt Trimmy per klant één onzichtbaar onderwerp aan (id "s_<klant-id>"), zodat agenda, kassa en historie
   hetzelfde blijven werken. Nieuw sjabloon toevoegen = een blok aan SJABLONEN toevoegen. */
const SJABLONEN={
 trimsalon:{id:"trimsalon",label:"Trimsalon",app:"Trimmy",object:true,
  w:{hond:"hond",honden:"honden",Hond:"Hond",Honden:"Honden",beurt:"trimbeurt",Beurt:"Trimbeurt",historie:"Trimhistorie",aanDeBeurt:"weer aan de beurt",AanDeBeurt:"Weer aan de beurt",
   binnen:"Hond is binnen",klaar:"Klaar, kan opgehaald",zaak:"trimsalon",Zaak:"Trimsalon",interval:"Trim-interval",geenObj:"Geen hond"},
  dossier:[],
  beh:[{k:"mesje",l:"Mesje, kam of techniek",t:"text",breed:1},{k:"vacht",l:"Vacht",t:"select",o:["Goed","Klitten","Sterk vervilt","Huidproblemen","Vlooien gezien"]},{k:"gedrag",l:"Gedrag",t:"select",o:["Rustig","Wat onrustig","Lastig","Bijt of hapt"]}],
  behVb:"Bijvoorbeeld: volledige trimbeurt",knVb:"Bijvoorbeeld: elke dag even borstelen achter de oren",
  beurtWk:8,voet:"Bedankt voor uw bezoek en tot de volgende trimbeurt!",
  msg:{msgBev:"Hoi {klant}! Hierbij de bevestiging van de afspraak voor {hond}: {dag} {datum} om {tijd} bij {salon}, {adres}. Behandeling: {behandeling}. Verhinderd? Laat het ons graag 24 uur van tevoren weten via {salontel}. Tot dan!",
   msgHer:"Hoi {klant}! Even een herinnering: {hond} is {dag} {datum} om {tijd} welkom bij {salon} voor {behandeling}. Lukt het niet? Laat het ons dan even weten via {salontel}. Tot dan!",
   msgWij:"Hoi {klant}, de afspraak van {hond} is verplaatst naar {dag} {datum} om {tijd}. Komt dit niet uit? Laat het ons weten via {salontel}. Groet, {salon}",
   msgOnd:"Afspraak {hond} op {dag} {datum} om {tijd}",
   msgPortaal:"Hoi {klant}! In ons klantportaal zie je voortaan je komende afspraken, de historie van {hond} en je facturen, en kun je ons makkelijk een bericht sturen. Inloggen gaat met je e-mailadres; je krijgt dan een code per mail. {portaal}",
   msgBeurt:"Hoi {klant}! Het is alweer {weken} weken geleden dat {hond} bij ons op de trimtafel lag. Tijd voor een nieuwe beurt? Laat even weten welke dag je het beste uitkomt, of bel ons op {salontel}. Groetjes, {salon}",
   beurtOnderwerp:"{hond} is weer aan de beurt · {salon}",beurtStandaard:"een trimbeurt",beurtTitel:"Tijd voor een trimbeurt?"}},
 nagelstudio:{id:"nagelstudio",label:"Nagelstudio",app:"Nailly",object:false,icoon:'<path d="M9 3h6v4H9z"/><path d="M8 7h8l1 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9z"/><path d="M10 13h4"/>',
  w:{hond:"klant",honden:"klanten",Hond:"Klant",Honden:"Klanten",beurt:"behandeling",Beurt:"Behandeling",historie:"Behandelhistorie",aanDeBeurt:"tijd om op te vullen",AanDeBeurt:"Tijd om op te vullen",
   binnen:"Klant is binnen",klaar:"Klaar",zaak:"nagelstudio",Zaak:"Nagelstudio",interval:"Opvulritme",geenObj:""},
  dossier:[{k:"nagels",l:"Natuurlijke nagels",t:"select",o:["","Gezond","Dun","Zacht","Splijtend","Bijtnagels"]},
   {k:"vorm",l:"Voorkeursvorm",t:"select",o:["","Amandel","Coffin","Square","Squoval","Ovaal","Stiletto"]},
   {k:"lengte",l:"Lengte",t:"select",o:["","Kort","Middel","Lang"]},
   {k:"interval",l:"Opvullen elke",t:"select",o:[["","standaard"],["2","2 weken"],["3","3 weken"],["4","4 weken"],["5","5 weken"],["6","6 weken"],["0","geen herinnering"]]},
   {k:"kleuren",l:"Vaste kleuren of merk",t:"text",breed:1,vb:"Bijvoorbeeld: OPI Bubble Bath, nude tinten"},
   {k:"allergie",l:"Allergie of gevoeligheid",t:"text",breed:1,let:1,vb:"Alleen invullen met toestemming van de klant",hint:"Gezondheidsgegeven: alleen zichtbaar voor de studio, niet in het klantportaal."}],
  beh:[{k:"techniek",l:"Techniek",t:"select",o:["Gellak","BIAB","Gel","Acryl","Manicure","Pedicure","Verwijderen"]},{k:"vorm",l:"Vorm",t:"select",o:["","Amandel","Coffin","Square","Squoval","Ovaal","Stiletto"]},
   {k:"kleur",l:"Kleur(en) en merk",t:"text",breed:1},{k:"extra",l:"Nail art, reparaties of bijzonderheden",t:"text",breed:1}],
  behVb:"Bijvoorbeeld: BIAB opvullen",knVb:"Bijvoorbeeld: elke avond nagelolie, niet aan de randjes pulken",
  beurtWk:3,voet:"Bedankt voor je bezoek en tot de volgende keer!",
  msg:{msgBev:"Hoi {klant}! Hierbij de bevestiging van je afspraak: {dag} {datum} om {tijd} bij {salon}, {adres}. Behandeling: {behandeling}. Verhinderd? Laat het ons graag 24 uur van tevoren weten via {salontel}. Tot dan!",
   msgHer:"Hoi {klant}! Even een herinnering: je bent {dag} {datum} om {tijd} welkom bij {salon} voor {behandeling}. Lukt het niet? Laat het ons dan even weten via {salontel}. Tot dan!",
   msgWij:"Hoi {klant}, je afspraak is verplaatst naar {dag} {datum} om {tijd}. Komt dit niet uit? Laat het ons weten via {salontel}. Groet, {salon}",
   msgOnd:"Afspraak {klant} op {dag} {datum} om {tijd}",
   msgPortaal:"Hoi {klant}! In ons klantportaal zie je voortaan je komende afspraken, je behandelhistorie en je facturen, en kun je ons makkelijk een bericht sturen. Inloggen gaat met je e-mailadres; je krijgt dan een code per mail. {portaal}",
   msgBeurt:"Hoi {klant}! Het is alweer {weken} weken geleden dat je nagels gedaan zijn. Tijd om op te vullen? Laat even weten welke dag je het beste uitkomt, of bel ons op {salontel}. Liefs, {salon}",
   beurtOnderwerp:"Tijd om op te vullen · {salon}",beurtStandaard:"een opvulbeurt",beurtTitel:"Tijd om op te vullen?"}},
 pedicure:{id:"pedicure",label:"Pedicure",app:"Pedly",object:false,icoon:'<path d="M9.6 8.2c2.9 0 4.8 2.3 4.6 5.4-.2 2.5-1.7 3.7-2 5.7-.3 2-1.7 3.2-3.5 3.2-2.1 0-3.3-1.7-3.1-3.8.2-1.8 1.1-2.8 1-4.8C6.5 11.1 7 8.2 9.6 8.2z" fill="currentColor" stroke="none"/><g fill="currentColor" stroke="none"><circle cx="7.9" cy="4.7" r="2.1"/><circle cx="11.6" cy="3.6" r="1.5"/><circle cx="14.5" cy="4.3" r="1.3"/><circle cx="16.7" cy="6" r="1.1"/><circle cx="17.9" cy="8.4" r=".95"/></g>',
  w:{hond:"klant",honden:"klanten",Hond:"Klant",Honden:"Klanten",beurt:"behandeling",Beurt:"Behandeling",historie:"Behandelhistorie",aanDeBeurt:"tijd voor een pedicure",AanDeBeurt:"Tijd voor een pedicure",
   binnen:"Klant is binnen",klaar:"Klaar",zaak:"pedicurepraktijk",Zaak:"Pedicurepraktijk",interval:"Ritme",geenObj:""},
  dossier:[{k:"huid",l:"Huid van de voeten",t:"select",o:["","Normaal","Droog","Eelt","Kloven","Vochtig of zweterig"]},
   {k:"nagels",l:"Teennagels",t:"select",o:["","Gezond","Verdikt","Ingroeiend","Kalknagel","Brokkelig"]},
   {k:"interval",l:"Pedicure elke",t:"select",o:[["","standaard"],["4","4 weken"],["5","5 weken"],["6","6 weken"],["8","8 weken"],["10","10 weken"],["0","geen herinnering"]]},
   {k:"voorkeur",l:"Lakkleur of voorkeuren",t:"text",breed:1,vb:"Bijvoorbeeld: rode gellak, geen voetmassage"},
   {k:"risico",l:"Medische aandachtspunten",t:"text",breed:1,let:1,vb:"Bijvoorbeeld: diabetes, bloedverdunners, reuma. Alleen met toestemming van de klant",hint:"Gezondheidsgegeven: alleen zichtbaar voor de praktijk, niet in het klantportaal. Verschijnt als waarschuwing bij de afspraak."}],
  beh:[{k:"techniek",l:"Behandeling",t:"select",o:["Basispedicure","Medische pedicure","Cosmetische pedicure","Gellak voeten","Eeltbehandeling","Likdoorn","Ingegroeide nagel","Nagels knippen"]},
   {k:"bevindingen",l:"Bevindingen voeten en nagels (intern)",t:"text",breed:1,vb:"Bijvoorbeeld: eelt hiel links, beginnende kalknagel grote teen"},
   {k:"kleur",l:"Lak of gellak",t:"text",breed:1}],
  behVb:"Bijvoorbeeld: medische pedicure",knVb:"Bijvoorbeeld: voeten dagelijks insmeren, katoenen sokken dragen",
  beurtWk:6,voet:"Bedankt voor je bezoek en tot de volgende keer!",
  msg:{msgBev:"Hoi {klant}! Hierbij de bevestiging van je afspraak: {dag} {datum} om {tijd} bij {salon}, {adres}. Behandeling: {behandeling}. Verhinderd? Laat het ons graag 24 uur van tevoren weten via {salontel}. Tot dan!",
   msgHer:"Hoi {klant}! Even een herinnering: je bent {dag} {datum} om {tijd} welkom bij {salon} voor {behandeling}. Lukt het niet? Laat het ons dan even weten via {salontel}. Tot dan!",
   msgWij:"Hoi {klant}, je afspraak is verplaatst naar {dag} {datum} om {tijd}. Komt dit niet uit? Laat het ons weten via {salontel}. Groet, {salon}",
   msgOnd:"Afspraak {klant} op {dag} {datum} om {tijd}",
   msgPortaal:"Hoi {klant}! In ons klantportaal zie je voortaan je komende afspraken, je behandelhistorie en je facturen, en kun je ons makkelijk een bericht sturen. Inloggen gaat met je e-mailadres; je krijgt dan een code per mail. {portaal}",
   msgBeurt:"Hoi {klant}! Het is alweer {weken} weken geleden dat je voeten bij ons verzorgd zijn. Tijd voor een nieuwe pedicure? Laat even weten welke dag je het beste uitkomt, of bel ons op {salontel}. Groet, {salon}",
   beurtOnderwerp:"Tijd voor je pedicure · {salon}",beurtStandaard:"een pedicurebehandeling",beurtTitel:"Tijd voor een pedicure?"}},
};
/* icoon van het platform (salonstoel) als PLATFORM_NAAM is ingesteld */
const PLATFORM_ICOON='<path d="M9.5 3h5a3 3 0 0 1 3 3v5h-11V6a3 3 0 0 1 3-3z"/><rect x="5" y="11" width="14" height="4" rx="2"/><path d="M12 15v5M8.5 21h7"/>';
/* actief sjabloon: ?sjabloon=… (demo), anders wat bij de salon is ingesteld */
const SJ=(()=>{let id;try{const u=new URLSearchParams(location.search).get("sjabloon");if(u&&SJABLONEN[u]){
   const was=(S.get("bedrijf",{})||{}).sjabloon||S.get("sjabloon","")||(self.SITE&&SITE.sjabloon)||"trimsalon";
   if(u!==was&&(S.get("demo",0)||!S.get("init",0))){/* demo van een ander sjabloon: opnieuw vullen met voorbeeldgegevens */
    ["klanten","honden","artikelen","afspraken","facturen","behandelingen","medewerkers","berichten","bedrijf","init"].forEach(k=>S.del(k))}
   S.set("sjabloon",u);history.replaceState(null,"",location.pathname+location.hash)}}catch(e){}
 /* volgorde: keuze van de salon > eerder gekozen op dit apparaat (demo) > instelling van deze site (TRIMMY_SJABLOON) > trimsalon */
 /* met de oude code-koppeling telt een (achtergebleven) account-salon niet mee */
 const plSj=/[?&]code=/.test(S.get("dburl",""))?"":((S.get("platform",null)||{}).salon||{}).sjabloon;
 id=plSj||(S.get("bedrijf",{})||{}).sjabloon||S.get("sjabloon","")||(self.SITE&&SITE.sjabloon)||"trimsalon";const b=SJABLONEN[id]||SJABLONEN.trimsalon;return self.SITE&&SITE.naam?{...b,app:SITE.naam,icoon:PLATFORM_ICOON}:b})();
const W=SJ.w;
document.documentElement.classList.add("sj-"+SJ.id);if(!SJ.object)document.documentElement.classList.add("geen-obj");

/* opgeslagen tekst van de salon, maar zonder resten van een ander sjabloon: een standaardtekst van een andere branche,
   of {hond} bij een branche zonder hond, wordt de standaardtekst van deze branche */
function sjTekst(k){const v=(typeof bed!=="undefined"&&bed)?bed[k]:null,eigen=k==="voet"?SJ.voet:SJ.msg[k],std=eigen??(typeof BED0!=="undefined"?BED0[k]:"");
 if(v==null||v==="")return std;
 if(!SJ.object&&/\{hond\}/.test(v))return std;
 if(Object.values(SJABLONEN).some(t=>t.id!==SJ.id&&(k==="voet"?t.voet:t.msg[k])===v))return std;
 return v}
/* onzichtbaar onderwerp per klant (alleen zonder object); vaste id, zodat twee apparaten hetzelfde record maken */
function subj(klantId,bewaar=true){if(SJ.object||!klantId)return null;const id="s_"+klantId;let h=D.honden.find(x=>x.id===id);const k=get("klanten",klantId);
 if(!h){h={id,klantId,naam:k?k.naam:"",auto:true,inactief:false};D.honden.push(h);if(bewaar)saveC("honden")}
 else if(k&&(h.naam!==k.naam||String(h.interval??"")!==String(k.interval??""))){h.naam=k.naam;if(k.interval==null||k.interval==="")delete h.interval;else h.interval=k.interval;if(bewaar)saveC("honden")}
 return h}
/* naam die je ziet bij een afspraak/behandeling: de hond, of bij een studio de klant */
const onderwerp=(hondId,klantId)=>{const h=get("honden",hondId);if(SJ.object)return h?h.naam:"";const k=get("klanten",klantId||(h&&h.klantId));return k?k.naam:(h?h.naam:"")};
/* waarschuwing (medisch/gedrag of allergie) bij een afspraak */
function letOp(hondId,klantId){if(SJ.object){const h=get("honden",hondId);return h?[h.medisch&&"Medisch: "+h.medisch,h.gedrag&&"Gedrag: "+h.gedrag].filter(Boolean):[]}
 const k=get("klanten",klantId||(get("honden",hondId)||{}).klantId);return k?SJ.dossier.filter(f=>f.let&&k[f.k]).map(f=>f.l+": "+k[f.k]):[]}

/* eenvoudige velden uit het sjabloon tekenen en uitlezen */
function veldHtml(f,val,pre){const id=pre+f.k,v=val??"";
 if(f.t==="select")return`<label${f.breed?' class="breed"':""}>${esc(f.l)}<select id="${id}">${f.o.map(o=>{const[w,l]=Array.isArray(o)?o:[o,o||"–"];return`<option value="${esc(w)}" ${String(w)===String(v)?"selected":""}>${esc(l)}</option>`}).join("")}</select></label>`;
 return`<label${f.breed?' class="breed"':""}>${esc(f.l)}<input id="${id}" value="${esc(v)}" ${f.vb?`placeholder="${esc(f.vb)}"`:""}>${f.hint?`<small class="mute">${esc(f.hint)}</small>`:""}</label>`}
const veldenHtml=(F,obj,pre)=>`<div class="g2 velden">${F.map(f=>veldHtml(f,obj[f.k],pre)).join("")}</div>`;
const veldenLees=(F,d,pre)=>Object.fromEntries(F.map(f=>[f.k,(d.q("#"+pre+f.k)||{value:""}).value.trim()]));
/* korte samenvatting van een behandeling voor lijsten */
function behSamen(b){const[eerste,...rest]=SJ.beh;return{kort:eerste&&b[eerste.k]?b[eerste.k]:"",meer:rest.filter(f=>b[f.k]).map(f=>(f.t==="select"&&SJ.object?f.l+": ":"")+b[f.k])}}

/* vaste teksten in de pagina aanpassen aan het sjabloon (eenmalig bij het laden) */
const SJ_VERVANG={nagelstudio:[["Weer aan de beurt (hond heeft nog geen nieuwe afspraak)","Tijd om op te vullen (klant heeft nog geen nieuwe afspraak)"],["Honden die volgens hun ritme weer moeten komen","Klanten die volgens hun ritme weer moeten opvullen"],
 ["Weer aan de beurt","Tijd om op te vullen"],["klant, hond, plaats of telefoon","klant, plaats of telefoon"],["factuurnummer, klant of hond","factuurnummer of klant"],["Klant en hond","Klant"],["hond, klant, behandeling of notitie","klant, behandeling of notitie"],
 ["verzonnen klanten, honden en afspraken","verzonnen klanten en afspraken"],["Standaard trim-interval","Standaard opvulritme"],["{klant} {hond}","{klant}"],["eigen gegevens, honden, komende afspraken","eigen gegevens, komende afspraken"],
 ["foto's van je hond","foto's van je nagels"],["Wist klanten, honden, afspraken","Wist klanten, afspraken"],["het eigen ritme van de hond","het eigen ritme van de klant"],["per hond stel je in bij Hond wijzigen","per klant stel je in bij het dossier (Opvullen elke)"],["Geldt voor honden","Geldt voor klanten"]]};
/* pedicure: dezelfde vervangingen als de nagelstudio, met pedicurewoorden */
SJ_VERVANG.pedicure=SJ_VERVANG.nagelstudio.map(([a,b])=>[a,b.split("Tijd om op te vullen").join("Tijd voor een pedicure").split("weer moeten opvullen").join("weer moeten komen").split("Standaard opvulritme").join("Standaard ritme").split("foto's van je nagels").join("foto's van je voeten").split("(Opvullen elke)").join("(Pedicure elke)")]);
function sjToepassen(){const L=SJ_VERVANG[SJ.id]||[];const app=SJ.app;
 const doe=t=>{let x=t;for(const[a,b]of L)if(x.includes(a))x=x.split(a).join(b);if(app!=="Trimmy"&&x.includes("Trimmy"))x=x.split("Trimmy").join(app);return x};
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const v=doe(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
 document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(e=>["placeholder","title","aria-label"].forEach(a=>{if(e.hasAttribute(a)){const v=doe(e.getAttribute(a));if(v!==e.getAttribute(a))e.setAttribute(a,v)}}));
 document.title=doe(document.title);
 if(SJ.icoon){const i=document.querySelector("#hdrLogo>svg");if(i)i.innerHTML=SJ.icoon}}
sjToepassen();
