/* Trimmy · gegevens.js */
"use strict";
/* ---------- gegevens ---------- */
const COLS=["klanten","honden","artikelen","afspraken","facturen","behandelingen","medewerkers","berichten","blokkades"];
const D={};COLS.forEach(c=>D[c]=S.get(c,[]));
const BED0={sjabloon:SJ.id,privacyJaren:2,naam:SJ.w.Zaak,straat:"",pc:"",plaats:"",tel:"",mail:"",kvk:"",btwnr:"",iban:"",termijn:14,voet:SJ.voet,kassa:"K1",open:8,sluit:18,zondag:false,dubbel:"waarschuw",kleur:"#6a3560",mailDirect:false,autoLock:0,perms:{historie:true,facturen:true,prijsBon:true,omzet:false,klantDel:false,artikelen:false,inst:false},autoHer:false,autoUur:24,autoStil:true,beurtWk:SJ.beurtWk,slepen:"vraag",
 msgBev:SJ.msg.msgBev,msgHer:SJ.msg.msgHer,msgWij:SJ.msg.msgWij,msgOnd:SJ.msg.msgOnd,msgPortaal:SJ.msg.msgPortaal,msgBeurt:SJ.msg.msgBeurt};
let bed={...BED0,...S.get("bedrijf",{})};
/* Kassa-ID hoort bij dit apparaat, niet bij de salon: apart bewaard en niet gesynchroniseerd */
if(S.get("kassa",null)==null)S.set("kassa",bed.kassa||"K1");bed.kassa=S.get("kassa","K1");
const saveC=c=>{if(c==="bedrijf")S.set("bedrijf",bed);else S.set(c,D[c]);dbSoon();if(c==="afspraken"||c==="klanten"||c==="bedrijf"||c==="honden")planSoon()};
const get=(c,id)=>id?D[c].find(x=>x.id===id):null;
const klLab=k=>k.naam+(k.plaats?" · "+k.plaats:"");
const hondLab=h=>{const k=get("klanten",h.klantId);if(!SJ.object)return k?k.naam:h.naam;return h.naam+(h.ras?" ("+h.ras+")":"")+(k?" · "+k.naam:"")};
const mwKleur=id=>(get("medewerkers",id)||{}).kleur||"#8a8f8c";
const STAT=[["aanvraag","Aanvraag (online)","amber"],["gepland","Gepland",""],["bevestigd","Bevestigd","acc"],["binnen",W.binnen,"amber"],["klaar",W.klaar,"ok"],["afgerekend","Afgerekend","ok"],["noshow","Niet gekomen","warn"],["geannuleerd","Geannuleerd","warn"]];
const statLab=s=>(STAT.find(x=>x[0]===s)||STAT[0])[1];
const statCls=s=>(STAT.find(x=>x[0]===s)||STAT[0])[2];
function leeftijd(geb){if(!geb)return"";const g=fromYmd(geb),n=new Date();let m=(n.getFullYear()-g.getFullYear())*12+n.getMonth()-g.getMonth();if(n.getDate()<g.getDate())m--;if(m<0)return"";return m<24?m+" mnd":Math.floor(m/12)+" jaar"}

/* standaardbehandelingen en -producten per branche (voorbeeldgegevens én de start van een nieuwe salon) */
function standaardArt(id=SJ.id){
 const A=(id,naam,cat,type,prijs,duur,voorraad,btw=21)=>({id,naam,cat,type,prijs,btw,duur:type==="dienst"?duur:null,voorraad:type==="product"?voorraad:null,nr:"",actief:true});
 const trim=[A("a1","Wassen en föhnen, klein","Wassen","dienst",35,45),A("a2","Wassen en föhnen, middel","Wassen","dienst",45,60),A("a3","Wassen en föhnen, groot","Wassen","dienst",60,75),
  A("a4","Volledige trimbeurt, klein","Trimmen","dienst",55,90),A("a5","Volledige trimbeurt, middel","Trimmen","dienst",70,120),A("a6","Volledige trimbeurt, groot","Trimmen","dienst",90,150),
  A("a7","Plukken ruwhaar, per uur","Trimmen","dienst",50,60),A("a8","Ontklitten, per kwartier","Extra","dienst",12.5,15),A("a9","Nagels knippen","Extra","dienst",10,10),A("a10","Oren reinigen","Extra","dienst",8,10),A("a11","Puppy-kennismaking","Extra","dienst",25,30),
  A("p1","Shampoo gevoelige huid 250 ml","Verzorging","product",14.95,0,12),A("p2","Ontklitspray 200 ml","Verzorging","product",12.95,0,8),A("p3","Slicker borstel","Borstels en kammen","product",18.5,0,6),A("p4","Metalen kam 19 cm","Borstels en kammen","product",11.95,0,2),A("p5","Kauwstaaf natuurlijk","Snacks","product",3.5,0,40)];
 const nagel=[A("n1","Gellak handen","Gellak","dienst",35,45),A("n2","BIAB nieuwe set","BIAB","dienst",50,75),A("n3","BIAB opvullen","BIAB","dienst",42,60),
  A("n4","Gel nieuwe set","Gel en acryl","dienst",60,90),A("n5","Gel opvullen","Gel en acryl","dienst",45,75),A("n6","Acryl nieuwe set","Gel en acryl","dienst",62,90),A("n7","Acryl opvullen","Gel en acryl","dienst",47,75),
  A("n8","Verwijderen","Extra","dienst",15,20),A("n9","Manicure","Manicure en pedicure","dienst",25,30),A("n10","Gellak voeten","Gellak","dienst",35,45),A("n11","Nail art per nagel","Extra","dienst",2,5),A("n12","Reparatie per nagel","Extra","dienst",5,10),
  A("q1","Nagelolie 15 ml","Thuisverzorging","product",9.95,0,14),A("q2","Handcrème 75 ml","Thuisverzorging","product",12.5,0,9),A("q3","Vijl 180/240","Thuisverzorging","product",3.5,0,30)];
 const pedi=[A("e1","Basispedicure","Pedicure","dienst",42,45),A("e2","Medische pedicure","Pedicure","dienst",48,50),A("e3","Pedicure met gellak","Pedicure","dienst",65,75),
  A("e4","Gellak voeten","Gellak","dienst",35,45),A("e5","Eeltbehandeling","Behandelingen","dienst",28,30),A("e6","Likdoorn verwijderen","Behandelingen","dienst",12,15),A("e7","Ingegroeide nagel behandelen","Behandelingen","dienst",30,30),
  A("e8","Nagels knippen en vijlen","Behandelingen","dienst",18,20),A("e9","Voetmassage","Extra","dienst",15,15),A("e10","Toeslag huisbezoek","Extra","dienst",12.5,0),
  A("v1","Voetcrème 75 ml","Thuisverzorging","product",12.95,0,15),A("v2","Eeltcrème 50 ml","Thuisverzorging","product",14.5,0,10),A("v3","Nagelolie 15 ml","Thuisverzorging","product",9.95,0,12),A("v4","Teenspreiders","Thuisverzorging","product",4.5,0,20)];
 return id==="nagelstudio"?nagel:id==="pedicure"?pedi:trim}
function seed(){if(SJ.id==="nagelstudio")return seedNagel();if(SJ.id==="pedicure")return seedPedicure();
 const T=today(),d=n=>ymd(addDays(T,n)),wd=(()=>{const k=T.getDay();return k===0?1:0})();
 const mw=[{id:"mw1",naam:"Sanne",kleur:"#8a4a7e"},{id:"mw2",naam:"Joris",kleur:"#2f7d6d"}];
 const art=standaardArt("trimsalon");
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
 /* voorbeeldhistorie: een jaar aan bezoeken, zodat het dashboard iets laat zien */
 {let r=7;const rnd01=()=>((r=Math.imul(r^(r>>>15),2246822507)+0x9e3779b9>>>0)%10000)/10000;
  const vn=["Van Dijk","Smit","Visser","Mulder","De Boer","Bos","Vos","Peters","Hendriks","Dekker","Brouwer","De Graaf","Kok","Meijer"],hn=["Max","Luna","Sam","Bella","Teddy","Noor","Dex","Fien","Joep","Saar","Bram","Lot","Rex","Puk"],
   rassen=[["Labradoodle","a5",120],["Shih Tzu","a4",90],["Maltezer","a4",90],["Golden Retriever","a3",75],["Cocker Spaniël","a5",120],["Westie","a7",60],["Schnauzer","a7",60],["Toypoedel","a4",90],["Bichon Frisé","a4",90],["Border Terriër","a7",60]];
  let nr=2;const fNr=t=>{const yy=new Date(t).getFullYear();nr++;return`${yy}-K1-${String(nr).padStart(4,"0")}`};
  const sl=["09:00","10:30","11:00","13:00","14:30","15:00"];
  for(let i=0;i<14;i++){const kid="kd"+i,hid="hd"+i,ras=rassen[i%rassen.length],iv=[42,49,56,63,70][i%5],st=-365+Math.floor(rnd01()*(i<9?40:250));
   kl.push({id:kid,naam:"Fam. "+vn[i],straat:"",pc:"",plaats:"Amsterdam",tel:"06 "+(40000000+i*1234567),email:"",notitie:""});
   ho.push({id:hid,klantId:kid,naam:hn[i],ras:ras[0],geb:ymd(addDays(T,-900-i*97)),geslacht:i%2?"Teef":"Reu",gecast:true,gewicht:"",vacht:"",kleur:"",chip:"",gedrag:"",medisch:"",notitie:"",foto:"",inactief:false});
   for(let n=st;n<-1;n+=iv+Math.floor(rnd01()*15)-5){const dd=addDays(T,n);if(dd.getDay()===0)continue;const mwI=rnd01()<.55?"mw1":"mw2",x=rnd01(),aid="ad"+i+"_"+(n+400),dat=ymd(dd);
    if(x<.05){af.push({id:aid,datum:dat,start:sl[Math.floor(rnd01()*6)],duur:ras[2],klantId:kid,hondId:hid,mwId:mwI,diensten:[ras[1]],status:"noshow",notitie:"",factuurId:null});continue}
    if(x<.09){af.push({id:aid,datum:dat,start:sl[Math.floor(rnd01()*6)],duur:ras[2],klantId:kid,hondId:hid,mwId:mwI,diensten:[ras[1]],status:"geannuleerd",notitie:"",factuurId:null});continue}
    const extra=rnd01()<.35?["a9"]:rnd01()<.2?["a8"]:[],t=dd.getTime()+12*3600e3,fid="fd"+i+"_"+(n+400),rg=[reg(ras[1]),...extra.map(e=>reg(e))];if(rnd01()<.15)rg.push(reg(["p1","p2","p5"][Math.floor(rnd01()*3)]));
    af.push({id:aid,datum:dat,start:sl[Math.floor(rnd01()*6)],duur:ras[2]+extra.length*10,klantId:kid,hondId:hid,mwId:mwI,diensten:[ras[1],...extra],status:"afgerekend",notitie:"",factuurId:fid});
    const f=mkF(fid,fNr(t),t,kid,hid,aid,rg,[]);f.betalingen=[{ts:t,methode:rnd01()<.7?"PIN":"Contant",bedrag:f.totaal}];f.betaald=f.totaal;f.rest=0;f.door=mwI==="mw1"?"Sanne":"Joris";fa.push(f)}
   if(i%4!==3){const fd=addDays(T,3+Math.floor(rnd01()*30));if(fd.getDay()!==0)af.push({id:"adf"+i,datum:ymd(fd),start:sl[Math.floor(rnd01()*6)],duur:ras[2],klantId:kid,hondId:hid,mwId:rnd01()<.5?"mw1":"mw2",diensten:[ras[1]],status:"gepland",notitie:"",factuurId:null})}}}
 Object.assign(D,{medewerkers:mw,artikelen:art,klanten:kl,honden:ho,afspraken:af,facturen:fa,behandelingen:be});
 bed={...BED0,kassa:S.get("kassa","K1"),naam:"Trimsalon Vachtwerk",straat:"Kinkerstraat 120",pc:"1053 ED",plaats:"Amsterdam",tel:"020 1234567",mail:"info@voorbeeld.nl",kvk:"12345678",btwnr:"NL001234567B01",iban:"NL00 BANK 0123 4567 89"};
 COLS.forEach(c=>S.set(c,D[c]));S.set("bedrijf",bed);S.set("demo",1);
}
/* voorbeeldgegevens voor een nagelstudio */
function seedNagel(){
 const T=today(),d=n=>ymd(addDays(T,n)),wd=(()=>{const k=T.getDay();return k===0?1:0})();
 const mw=[{id:"mw1",naam:"Esmée",kleur:"#b0477f"},{id:"mw2",naam:"Lina",kleur:"#3f7f8c"}];
 const art=standaardArt("nagelstudio");
 const kl=[{id:"k1",naam:"Sophie de Wit",straat:"Overtoom 210",pc:"1054 HW",plaats:"Amsterdam",tel:"06 12345678",email:"sophie@voorbeeld.nl",notitie:"Liefst na 17:00",nagels:"Dun",vorm:"Amandel",lengte:"Middel",kleuren:"Nude, milky white",allergie:"",interval:"3"},
  {id:"k2",naam:"Yara Benali",straat:"Javastraat 12",pc:"1094 HC",plaats:"Amsterdam",tel:"06 23456789",email:"yara@voorbeeld.nl",notitie:"",nagels:"Gezond",vorm:"Coffin",lengte:"Lang",kleuren:"Rood, chrome effect",allergie:"",interval:""},
  {id:"k3",naam:"Emma Visser",straat:"Dorpsstraat 5",pc:"1183 AA",plaats:"Amstelveen",tel:"06 34567890",email:"emma.visser@voorbeeld.nl",notitie:"Betaalt meestal contant",nagels:"Bijtnagels",vorm:"Squoval",lengte:"Kort",kleuren:"Lichtroze",allergie:"Gevoelig voor HEMA, alleen hypoallergene gel",interval:"4"}];
 const af=[{id:"af1",datum:d(wd),start:"09:30",duur:60,klantId:"k1",mwId:"mw1",diensten:["n3"],status:"bevestigd",notitie:"",factuurId:null},
  {id:"af2",datum:d(wd),start:"10:00",duur:90,klantId:"k2",mwId:"mw2",diensten:["n4","n11"],status:"gepland",notitie:"Neemt inspiratiefoto mee",factuurId:null},
  {id:"af3",datum:d(wd),start:"13:00",duur:45,klantId:"k3",mwId:"mw1",diensten:["n1"],status:"gepland",notitie:"",factuurId:null},
  {id:"af4",datum:d(wd+2),start:"16:00",duur:60,klantId:"k2",mwId:"mw2",diensten:["n5"],status:"gepland",notitie:"",factuurId:null},
  {id:"af5",datum:d(-21),start:"17:00",duur:75,klantId:"k1",mwId:"mw1",diensten:["n2"],status:"afgerekend",notitie:"",factuurId:"f1"},
  {id:"af6",datum:d(-10),start:"11:00",duur:45,klantId:"k3",mwId:"mw1",diensten:["n1"],status:"noshow",notitie:"Niet gekomen, niet afgemeld",factuurId:null}];
 const be=[{id:"b1",datum:d(-21),klantId:"k1",afspraakId:"af5",factuurId:"f1",diensten:"BIAB nieuwe set",mw:"Esmée",techniek:"BIAB",vorm:"Amandel",kleur:"Milky white, The GelBottle",extra:"",notitie:"Nagels dun, rustig gevijld",klantNotitie:"Elke avond nagelolie, dan blijft het mooi"},
  {id:"b2",datum:d(-30),klantId:"k2",afspraakId:null,factuurId:null,diensten:"Gel nieuwe set, Nail art per nagel",mw:"Lina",techniek:"Gel",vorm:"Coffin",kleur:"Rood met chrome",extra:"Nail art op ringvingers",notitie:"",klantNotitie:""}];
 /* een jaar aan bezoeken voor het dashboard */
 const y=T.getFullYear(),ts=n=>addDays(T,n).getTime()+11*3600e3;
 const reg=(a,q=1,p)=>{const x=art.find(z=>z.id===a);const pr=p??x.prijs;return{artId:a,naam:x.naam,type:x.type,aantal:q,prijs:pr,btw:x.btw,totaal:rnd(q*pr)}};
 const mkF=(id,nr,t,k,afId,regels,bet)=>{const tot=rnd(regels.reduce((s,r)=>s+r.totaal,0));const paid=rnd(bet.reduce((s,b)=>s+b.bedrag,0));return{id,nr,ts:t,klantId:k,hondId:"s_"+k,afspraakId:afId,regels,korting:0,sub:tot,totaal:tot,betalingen:bet,betaald:paid,rest:rnd(tot-paid),kassa:"K1",door:"Esmée"}};
 const fa=[mkF("f1",`${y}-K1-0001`,ts(-21),"k1","af5",[reg("n2"),reg("q1")],[{ts:ts(-21),methode:"PIN",bedrag:59.95}])];
 {let r=11;const r01=()=>((r=Math.imul(r^(r>>>15),2246822507)+0x9e3779b9>>>0)%10000)/10000;
  const vn=["Lisa","Fleur","Noa","Julia","Sara","Anna","Mila","Zoë","Eva","Lotte","Nina","Iris","Romy","Femke"],an=["Jansen","Bakker","Smit","Meijer","Mulder","Bos","Vos","Peters","Hendriks","Dekker","Kok","Brouwer","De Graaf","Van Dam"];
  const pak=[["n3",60,3],["n5",75,3],["n1",45,4],["n3",60,4],["n7",75,3],["n1",45,5],["n9",30,6]],sl=["09:30","11:00","13:00","14:30","16:00","17:30"];let nr=1;
  for(let i=0;i<14;i++){const kid="kd"+i,p=pak[i%pak.length],iv=p[2]*7,st=-365+Math.floor(r01()*(i<9?40:250));
   kl.push({id:kid,naam:vn[i]+" "+an[i],straat:"",pc:"",plaats:"Amsterdam",tel:"06 "+(40000000+i*1234567),email:"",notitie:"",vorm:["Amandel","Coffin","Square","Ovaal"][i%4],lengte:["Kort","Middel","Lang"][i%3]});
   for(let n=st;n<-1;n+=iv+Math.floor(r01()*7)-3){const dd=addDays(T,n);if(dd.getDay()===0)continue;const mwI=r01()<.55?"mw1":"mw2",x=r01(),aid="ad"+i+"_"+(n+400),dat=ymd(dd);
    if(x<.07){af.push({id:aid,datum:dat,start:sl[Math.floor(r01()*6)],duur:p[1],klantId:kid,mwId:mwI,diensten:[p[0]],status:x<.04?"noshow":"geannuleerd",notitie:"",factuurId:null});continue}
    const extra=r01()<.3?["n11"]:[],t=dd.getTime()+12*3600e3,fid="fd"+i+"_"+(n+400),rg=[reg(p[0]),...extra.map(e=>reg(e,4))];if(r01()<.12)rg.push(reg(["q1","q2","q3"][Math.floor(r01()*3)]));
    af.push({id:aid,datum:dat,start:sl[Math.floor(r01()*6)],duur:p[1]+extra.length*20,klantId:kid,mwId:mwI,diensten:[p[0],...extra],status:"afgerekend",notitie:"",factuurId:fid});
    {const x=art.find(z=>z.id===p[0]),tk={n1:"Gellak",n3:"BIAB",n5:"Gel",n7:"Acryl",n9:"Manicure"}[p[0]]||"Gellak";be.push({id:"bd"+i+"_"+(n+400),datum:dat,klantId:kid,afspraakId:aid,factuurId:fid,diensten:[x.naam,...extra.map(()=>"Nail art per nagel")].join(", "),mw:mwI==="mw1"?"Esmée":"Lina",techniek:tk,vorm:["Amandel","Coffin","Square","Ovaal"][i%4],kleur:["Nude","Milky white","Rood","Lichtroze","French","Mauve"][Math.floor(r01()*6)],extra:extra.length?"Nail art op ringvingers":"",notitie:"",klantNotitie:""})}
    nr++;const f=mkF(fid,`${new Date(t).getFullYear()}-K1-${String(nr).padStart(4,"0")}`,t,kid,aid,rg,[]);f.betalingen=[{ts:t,methode:r01()<.75?"PIN":"Contant",bedrag:f.totaal}];f.betaald=f.totaal;f.rest=0;f.door=mwI==="mw1"?"Esmée":"Lina";fa.push(f)}
   if(i%3!==2){const fd=addDays(T,2+Math.floor(r01()*20));if(fd.getDay()!==0)af.push({id:"adf"+i,datum:ymd(fd),start:sl[Math.floor(r01()*6)],duur:p[1],klantId:kid,mwId:r01()<.5?"mw1":"mw2",diensten:[p[0]],status:"gepland",notitie:"",factuurId:null})}}}
 af.forEach(a=>a.hondId="s_"+a.klantId);be.forEach(b=>b.hondId="s_"+b.klantId);
 const ho=kl.map(k=>({id:"s_"+k.id,klantId:k.id,naam:k.naam,auto:true,inactief:false,...(k.interval?{interval:k.interval}:{})}));
 Object.assign(D,{medewerkers:mw,artikelen:art,klanten:kl,honden:ho,afspraken:af,facturen:fa,behandelingen:be});
 bed={...BED0,kassa:S.get("kassa","K1"),naam:"Nagelstudio Glans",straat:"Ferdinand Bolstraat 44",pc:"1072 LK",plaats:"Amsterdam",tel:"020 7654321",mail:"info@voorbeeld.nl",kvk:"87654321",btwnr:"NL009876543B01",iban:"NL00 BANK 0987 6543 21",kleur:"#b0477f",open:9,sluit:19};
 COLS.forEach(c=>S.set(c,D[c]));S.set("bedrijf",bed);S.set("demo",1);
}
/* voorbeeldgegevens voor een pedicurepraktijk */
function seedPedicure(){
 const T=today(),d=n=>ymd(addDays(T,n)),wd=(()=>{const k=T.getDay();return k===0?1:0})(),y=T.getFullYear(),ts=n=>addDays(T,n).getTime()+11*3600e3;
 const mw=[{id:"mw1",naam:"Marieke",kleur:"#2f7f6f"},{id:"mw2",naam:"Daan",kleur:"#6a5aa8"}];
 const art=standaardArt("pedicure");
 const kl=[{id:"k1",naam:"Annie de Groot",straat:"Linnaeusstraat 40",pc:"1093 EK",plaats:"Amsterdam",tel:"06 11223344",email:"annie@voorbeeld.nl",notitie:"Komt met de rollator, begane grond",huid:"Droog",nagels:"Verdikt",interval:"6",voorkeur:"Geen lak",risico:"Diabetes type 2, voorzichtig met snijden"},
  {id:"k2",naam:"Tessa Kramer",straat:"Bilderdijkstraat 88",pc:"1053 KX",plaats:"Amsterdam",tel:"06 22334455",email:"tessa@voorbeeld.nl",notitie:"",huid:"Eelt",nagels:"Gezond",interval:"",voorkeur:"Rode gellak",risico:""},
  {id:"k3",naam:"Henk Bos",straat:"Amstelveenseweg 300",pc:"1076 CS",plaats:"Amsterdam",tel:"06 33445566",email:"henk.bos@voorbeeld.nl",notitie:"Huisbezoek op dinsdag",huid:"Kloven",nagels:"Ingroeiend",interval:"8",voorkeur:"",risico:"Bloedverdunners"}];
 const af=[{id:"af1",datum:d(wd),start:"09:30",duur:50,klantId:"k1",mwId:"mw1",diensten:["e2"],status:"bevestigd",notitie:"",factuurId:null},
  {id:"af2",datum:d(wd),start:"11:00",duur:75,klantId:"k2",mwId:"mw2",diensten:["e3"],status:"gepland",notitie:"",factuurId:null},
  {id:"af3",datum:d(wd+1),start:"14:00",duur:30,klantId:"k3",mwId:"mw1",diensten:["e7","e10"],status:"gepland",notitie:"Huisbezoek",factuurId:null},
  {id:"af4",datum:d(-42),start:"10:00",duur:50,klantId:"k1",mwId:"mw1",diensten:["e2"],status:"afgerekend",notitie:"",factuurId:"f1"}];
 const be=[{id:"b1",datum:d(-42),klantId:"k1",afspraakId:"af4",factuurId:"f1",diensten:"Medische pedicure",mw:"Marieke",techniek:"Medische pedicure",bevindingen:"Verdikte nagel grote teen rechts, droge hielen",kleur:"",notitie:"Voorzichtig gefreesd",klantNotitie:"Elke avond voetcrème, vooral op de hielen"}];
 const reg=(a,q=1)=>{const x=art.find(z=>z.id===a);return{artId:a,naam:x.naam,type:x.type,aantal:q,prijs:x.prijs,btw:x.btw,totaal:rnd(q*x.prijs)}};
 const mkF=(id,nr,t,k,afId,regels,door)=>{const tot=rnd(regels.reduce((s,r)=>s+r.totaal,0));return{id,nr,ts:t,klantId:k,hondId:"s_"+k,afspraakId:afId,regels,korting:0,sub:tot,totaal:tot,betalingen:[{ts:t,methode:"PIN",bedrag:tot}],betaald:tot,rest:0,kassa:"K1",door}};
 const fa=[mkF("f1",`${y}-K1-0001`,ts(-42),"k1","af4",[reg("e2"),reg("v1")],"Marieke")];
 {let r=7;const r01=()=>((r=Math.imul(r^(r>>>15),2246822507)+0x9e3779b9>>>0)%10000)/10000;
  const vn=["Joke","Peter","Ria","Gerard","Ingrid","Wim","Marja","Kees","Els","Ton","Lia","Bert"],an=["Visser","De Boer","Mulder","Smit","Vos","Peters","Dekker","Kok","Jacobs","Van Leeuwen","Willems","Hoekstra"];
  const pak=[["e1",45,6],["e2",50,6],["e3",75,5],["e1",45,8],["e2",50,8],["e4",45,4]],sl=["09:00","10:30","12:00","13:30","15:00","16:30"],tk={e1:"Basispedicure",e2:"Medische pedicure",e3:"Cosmetische pedicure",e4:"Gellak voeten"};let nr=1;
  for(let i=0;i<12;i++){const kid="kd"+i,p=pak[i%pak.length],iv=p[2]*7,st=-365+Math.floor(r01()*(i<8?40:250));
   kl.push({id:kid,naam:vn[i]+" "+an[i],straat:"",pc:"",plaats:"Amsterdam",tel:"06 "+(50000000+i*1234567),email:"",notitie:"",huid:["Droog","Eelt","Normaal","Kloven"][i%4],nagels:["Gezond","Verdikt","Gezond","Kalknagel"][i%4]});
   for(let n=st;n<-1;n+=iv+Math.floor(r01()*7)-3){const dd=addDays(T,n);if(dd.getDay()===0)continue;const mwI=r01()<.6?"mw1":"mw2",x=r01(),aid="ad"+i+"_"+(n+400),dat=ymd(dd);
    if(x<.06){af.push({id:aid,datum:dat,start:sl[Math.floor(r01()*6)],duur:p[1],klantId:kid,mwId:mwI,diensten:[p[0]],status:x<.03?"noshow":"geannuleerd",notitie:"",factuurId:null});continue}
    const extra=r01()<.25?["e9"]:[],t=dd.getTime()+12*3600e3,fid="fd"+i+"_"+(n+400),rg=[reg(p[0]),...extra.map(e=>reg(e))];if(r01()<.15)rg.push(reg(["v1","v2","v3"][Math.floor(r01()*3)]));
    af.push({id:aid,datum:dat,start:sl[Math.floor(r01()*6)],duur:p[1]+extra.length*15,klantId:kid,mwId:mwI,diensten:[p[0],...extra],status:"afgerekend",notitie:"",factuurId:fid});
    be.push({id:"bd"+i+"_"+(n+400),datum:dat,klantId:kid,afspraakId:aid,factuurId:fid,diensten:[art.find(z=>z.id===p[0]).naam,...extra.map(()=>"Voetmassage")].join(", "),mw:mwI==="mw1"?"Marieke":"Daan",techniek:tk[p[0]]||"Basispedicure",bevindingen:"",kleur:p[0]==="e3"||p[0]==="e4"?["Rood","Nude","Bordeaux","Koraal"][Math.floor(r01()*4)]:"",notitie:"",klantNotitie:""});
    nr++;const f=mkF(fid,`${new Date(t).getFullYear()}-K1-${String(nr).padStart(4,"0")}`,t,kid,aid,rg,mwI==="mw1"?"Marieke":"Daan");if(r01()<.3){f.betalingen[0].methode="Contant"}fa.push(f)}
   if(i%3!==2){const fd=addDays(T,2+Math.floor(r01()*25));if(fd.getDay()!==0)af.push({id:"adf"+i,datum:ymd(fd),start:sl[Math.floor(r01()*6)],duur:p[1],klantId:kid,mwId:r01()<.5?"mw1":"mw2",diensten:[p[0]],status:"gepland",notitie:"",factuurId:null})}}}
 af.forEach(a=>a.hondId="s_"+a.klantId);be.forEach(b=>b.hondId="s_"+b.klantId);
 const ho=kl.map(k=>({id:"s_"+k.id,klantId:k.id,naam:k.naam,auto:true,inactief:false,...(k.interval?{interval:k.interval}:{})}));
 Object.assign(D,{medewerkers:mw,artikelen:art,klanten:kl,honden:ho,afspraken:af,facturen:fa,behandelingen:be});
 bed={...BED0,kassa:S.get("kassa","K1"),naam:"Pedicurepraktijk Voetenwerk",straat:"Van Woustraat 61",pc:"1074 AD",plaats:"Amsterdam",tel:"020 1122334",mail:"info@voorbeeld.nl",kvk:"11223344",btwnr:"NL001122334B01",iban:"NL00 BANK 0112 2334 45",kleur:"#2f7f6f",open:9,sluit:17};
 COLS.forEach(c=>S.set(c,D[c]));S.set("bedrijf",bed);S.set("demo",1);
}
if(!S.get("init",0)){seed();S.set("init",1)}
