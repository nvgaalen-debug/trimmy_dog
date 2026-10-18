/* Trimmy · gegevens.js */
"use strict";
/* ---------- gegevens ---------- */
const COLS=["klanten","honden","artikelen","afspraken","facturen","behandelingen","medewerkers"];
const D={};COLS.forEach(c=>D[c]=S.get(c,[]));
const BED0={naam:"Trimsalon",straat:"",pc:"",plaats:"",tel:"",mail:"",kvk:"",btwnr:"",iban:"",termijn:14,voet:"Bedankt voor uw bezoek en tot de volgende trimbeurt!",kassa:"K1",open:8,sluit:18,zondag:false,dubbel:"waarschuw",kleur:"#6a3560",mailDirect:false,autoLock:0,perms:{historie:true,facturen:true,prijsBon:true,omzet:false,klantDel:false,artikelen:false,inst:false},autoHer:false,autoUur:24,autoStil:true,msgBev:"Hoi {klant}! Hierbij de bevestiging van de afspraak voor {hond}: {dag} {datum} om {tijd} bij {salon}, {adres}. Behandeling: {behandeling}. Verhinderd? Laat het ons graag 24 uur van tevoren weten via {salontel}. Tot dan!",msgHer:"Hoi {klant}! Even een herinnering: {hond} is {dag} {datum} om {tijd} welkom bij {salon} voor {behandeling}. Lukt het niet? Laat het ons dan even weten via {salontel}. Tot dan!",msgWij:"Hoi {klant}, de afspraak van {hond} is verplaatst naar {dag} {datum} om {tijd}. Komt dit niet uit? Laat het ons weten via {salontel}. Groet, {salon}",msgOnd:"Afspraak {hond} op {dag} {datum} om {tijd}",beurtWk:8,msgBeurt:"Hoi {klant}! Het is alweer {weken} weken geleden dat {hond} bij ons op de trimtafel lag. Tijd voor een nieuwe beurt? Laat even weten welke dag je het beste uitkomt, of bel ons op {salontel}. Groetjes, {salon}"};
let bed={...BED0,...S.get("bedrijf",{})};
/* Kassa-ID hoort bij dit apparaat, niet bij de salon: apart bewaard en niet gesynchroniseerd */
if(S.get("kassa",null)==null)S.set("kassa",bed.kassa||"K1");bed.kassa=S.get("kassa","K1");
const saveC=c=>{if(c==="bedrijf")S.set("bedrijf",bed);else S.set(c,D[c]);dbSoon();if(c==="afspraken"||c==="klanten"||c==="bedrijf"||c==="honden")planSoon()};
const get=(c,id)=>id?D[c].find(x=>x.id===id):null;
const klLab=k=>k.naam+(k.plaats?" · "+k.plaats:"");
const hondLab=h=>{const k=get("klanten",h.klantId);return h.naam+(h.ras?" ("+h.ras+")":"")+(k?" · "+k.naam:"")};
const mwKleur=id=>(get("medewerkers",id)||{}).kleur||"#8a8f8c";
const STAT=[["gepland","Gepland",""],["bevestigd","Bevestigd","acc"],["binnen","Hond is binnen","amber"],["klaar","Klaar, kan opgehaald","ok"],["afgerekend","Afgerekend","ok"],["noshow","Niet gekomen","warn"],["geannuleerd","Geannuleerd","warn"]];
const statLab=s=>(STAT.find(x=>x[0]===s)||STAT[0])[1];
const statCls=s=>(STAT.find(x=>x[0]===s)||STAT[0])[2];
function leeftijd(geb){if(!geb)return"";const g=fromYmd(geb),n=new Date();let m=(n.getFullYear()-g.getFullYear())*12+n.getMonth()-g.getMonth();if(n.getDate()<g.getDate())m--;if(m<0)return"";return m<24?m+" mnd":Math.floor(m/12)+" jaar"}

function seed(){
 const T=today(),d=n=>ymd(addDays(T,n)),wd=(()=>{const k=T.getDay();return k===0?1:0})();
 const mw=[{id:"mw1",naam:"Sanne",kleur:"#8a4a7e"},{id:"mw2",naam:"Joris",kleur:"#2f7d6d"}];
 const A=(id,naam,cat,type,prijs,duur,voorraad,btw=21)=>({id,naam,cat,type,prijs,btw,duur:type==="dienst"?duur:null,voorraad:type==="product"?voorraad:null,nr:"",actief:true});
 const art=[A("a1","Wassen en föhnen, klein","Wassen","dienst",35,45),A("a2","Wassen en föhnen, middel","Wassen","dienst",45,60),A("a3","Wassen en föhnen, groot","Wassen","dienst",60,75),
  A("a4","Volledige trimbeurt, klein","Trimmen","dienst",55,90),A("a5","Volledige trimbeurt, middel","Trimmen","dienst",70,120),A("a6","Volledige trimbeurt, groot","Trimmen","dienst",90,150),
  A("a7","Plukken ruwhaar, per uur","Trimmen","dienst",50,60),A("a8","Ontklitten, per kwartier","Extra","dienst",12.5,15),A("a9","Nagels knippen","Extra","dienst",10,10),A("a10","Oren reinigen","Extra","dienst",8,10),A("a11","Puppy-kennismaking","Extra","dienst",25,30),
  A("p1","Shampoo gevoelige huid 250 ml","Verzorging","product",14.95,0,12),A("p2","Ontklitspray 200 ml","Verzorging","product",12.95,0,8),A("p3","Slicker borstel","Borstels en kammen","product",18.5,0,6),A("p4","Metalen kam 19 cm","Borstels en kammen","product",11.95,0,2),A("p5","Kauwstaaf natuurlijk","Snacks","product",3.5,0,40)];
 const kl=[{id:"k1",naam:"Familie de Vries",straat:"Prinsengracht 412",pc:"1016 JC",plaats:"Amsterdam",tel:"06 12345678",email:"devries@voorbeeld.nl",notitie:"Liefst ochtendafspraken"},
  {id:"k2",naam:"Ahmed Bakker",straat:"Javastraat 88",pc:"1094 HK",plaats:"Amsterdam",tel:"06 23456789",email:"a.bakker@voorbeeld.nl",notitie:""},
  {id:"k3",naam:"Lotte Jansen",straat:"Dorpsstraat 5",pc:"1183 AA",plaats:"Amstelveen",tel:"06 34567890",email:"lotte.jansen@voorbeeld.nl",notitie:"Betaalt meestal op rekening"}];
 const ho=[{id:"h1",klantId:"k1",naam:"Bobbie",ras:"Labradoodle",geb:ymd(addDays(T,-1150)),geslacht:"Reu",gecast:true,gewicht:24,vacht:"Krullend",kleur:"Abrikoos",chip:"528140000123456",gedrag:"Vrolijk, springt graag op de tafel",medisch:"",notitie:"Klitgevoelig achter de oren. Voeten kort, kop rond.",foto:"",inactief:false},
  {id:"h2",klantId:"k1",naam:"Mila",ras:"Shih Tzu",geb:ymd(addDays(T,-2600)),geslacht:"Teef",gecast:true,gewicht:6.5,vacht:"Lang",kleur:"Wit-goud",chip:"",gedrag:"Rustig",medisch:"Allergisch voor parfum in shampoo",notitie:"Puppycoupe, staartje lang laten",foto:"",inactief:false},
  {id:"h3",klantId:"k2",naam:"Rocky",ras:"Border Terriër",geb:ymd(addDays(T,-1700)),geslacht:"Reu",gecast:false,gewicht:7,vacht:"Ruwhaar",kleur:"Grizzle en tan",chip:"528140000654321",gedrag:"Wil niet aan de achterpoten gezeten worden",medisch:"",notitie:"Alleen plukken, nooit scheren",foto:"",inactief:false},
  {id:"h4",klantId:"k3",naam:"Pip",ras:"Toypoedel",geb:ymd(addDays(T,-400)),geslacht:"Teef",gecast:false,gewicht:3.2,vacht:"Krullend",kleur:"Zwart",chip:"",gedrag:"Angstig bij de föhn, rustig opbouwen",medisch:"",notitie:"",foto:"",inactief:false},
  {id:"h5",klantId:"k2",naam:"Luna",ras:"Maltezer",geb:ymd(addDays(T,-1900)),geslacht:"Teef",gecast:true,gewicht:4.1,vacht:"Lang",kleur:"Wit",chip:"",gedrag:"Rustig",medisch:"",notitie:"Teddy-coupe, oren lang laten",foto:"",inactief:false}];
 const af=[{id:"af1",datum:d(wd),start:"09:00",duur:120,klantId:"k1",hondId:"h1",mwId:"mw1",diensten:["a5"],status:"bevestigd",notitie:"",factuurId:null},
  {id:"af2",datum:d(wd),start:"09:30",duur:60,klantId:"k2",hondId:"h3",mwId:"mw2",diensten:["a7"],status:"gepland",notitie:"",factuurId:null},
  {id:"af3",datum:d(wd),start:"11:30",duur:55,klantId:"k3",hondId:"h4",mwId:"mw2",diensten:["a1","a9"],status:"gepland",notitie:"Föhn op laagste stand",factuurId:null},
  {id:"af4",datum:d(wd),start:"13:30",duur:90,klantId:"k1",hondId:"h2",mwId:"mw1",diensten:["a4"],status:"gepland",notitie:"",factuurId:null},
  {id:"af5",datum:d(wd+2),start:"10:00",duur:120,klantId:"k3",hondId:"h4",mwId:"mw1",diensten:["a5"],status:"gepland",notitie:"",factuurId:null},
  {id:"af6",datum:d(wd+3),start:"14:00",duur:60,klantId:"k2",hondId:"h3",mwId:"mw2",diensten:["a7"],status:"gepland",notitie:"",factuurId:null},
  {id:"af7",datum:d(-35),start:"10:00",duur:120,klantId:"k1",hondId:"h1",mwId:"mw1",diensten:["a5"],status:"afgerekend",notitie:"",factuurId:"f1"},
  {id:"af8",datum:d(-21),start:"15:00",duur:60,klantId:"k2",hondId:"h3",mwId:"mw2",diensten:["a7"],status:"noshow",notitie:"Niet gekomen, niet afgemeld",factuurId:null},
  {id:"af9",datum:d(-14),start:"11:00",duur:60,klantId:"k3",hondId:"h4",mwId:"mw2",diensten:["a11","a9"],status:"afgerekend",notitie:"",factuurId:"f2"}];
 const y=T.getFullYear(),ts=n=>addDays(T,n).getTime()+11*3600e3;
 const reg=(a,q=1,p)=>{const x=art.find(z=>z.id===a);const pr=p??x.prijs;return{artId:a,naam:x.naam,type:x.type,aantal:q,prijs:pr,btw:x.btw,totaal:rnd(q*pr)}};
 const mkF=(id,nr,t,k,h,afId,regels,bet)=>{const tot=rnd(regels.reduce((s,r)=>s+r.totaal,0));const paid=rnd(bet.reduce((s,b)=>s+b.bedrag,0));return{id,nr,ts:t,klantId:k,hondId:h,afspraakId:afId,regels,korting:0,sub:tot,totaal:tot,betalingen:bet,betaald:paid,rest:rnd(tot-paid),kassa:"K1",door:"Sanne"}};
 const fa=[mkF("f1",`${y}-K1-0001`,ts(-35),"k1","h1","af7",[reg("a5"),reg("p2")],[{ts:ts(-35),methode:"PIN",bedrag:82.95}]),
  mkF("f2",`${y}-K1-0002`,ts(-14),"k3","h4","af9",[reg("a11"),reg("a9")],[])];
 fa[1].door="Joris";
 const be=[{id:"b1",datum:d(-35),hondId:"h1",klantId:"k1",afspraakId:"af7",factuurId:"f1",diensten:"Volledige trimbeurt, middel",mw:"Sanne",mesje:"Lijf mes 5F, kop met schaar",vacht:"Klitten",gedrag:"Rustig",notitie:"Veel klitten achter de oren, eigenaar borstel-tip gegeven"},
  {id:"b2",datum:d(-14),hondId:"h4",klantId:"k3",afspraakId:"af9",factuurId:"f2",diensten:"Puppy-kennismaking, Nagels knippen",mw:"Joris",mesje:"",vacht:"Goed",gedrag:"Wat onrustig",notitie:"Eerste keer föhn, ging na 10 minuten beter"},
  {id:"b3",datum:d(-70),hondId:"h3",klantId:"k2",afspraakId:null,factuurId:null,diensten:"Plukken ruwhaar",mw:"Joris",mesje:"Plukmes fijn",vacht:"Goed",gedrag:"Lastig",notitie:"Achterpoten in twee rondes gedaan"},
  {id:"b5",datum:d(-110),hondId:"h5",klantId:"k2",afspraakId:null,factuurId:null,diensten:"Volledige trimbeurt, klein",mw:"Sanne",mesje:"Lijf mes 4F, kop met schaar",vacht:"Goed",gedrag:"Rustig",notitie:""},
  {id:"b4",datum:d(-58),hondId:"h5",klantId:"k2",afspraakId:null,factuurId:null,diensten:"Wassen en föhnen, Nagels knippen",mw:"Sanne",mesje:"Snoet met schaar",vacht:"Goed",gedrag:"Rustig",notitie:"Graag niet te kort rond de ogen"}];
 Object.assign(D,{medewerkers:mw,artikelen:art,klanten:kl,honden:ho,afspraken:af,facturen:fa,behandelingen:be});
 bed={...BED0,kassa:S.get("kassa","K1"),naam:"Trimsalon Vachtwerk",straat:"Kinkerstraat 120",pc:"1053 ED",plaats:"Amsterdam",tel:"020 1234567",mail:"info@voorbeeld.nl",kvk:"12345678",btwnr:"NL001234567B01",iban:"NL00 BANK 0123 4567 89"};
 COLS.forEach(c=>S.set(c,D[c]));S.set("bedrijf",bed);S.set("demo",1);
}
if(!S.get("init",0)){seed();S.set("init",1)}
