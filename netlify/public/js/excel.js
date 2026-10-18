/* Trimmy · excel.js */
"use strict";
/* eigen Excel-generator (xlsx = zip met XML), geen externe bibliotheek nodig */
const xe=v=>String(v??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const colL=j=>{let s="";j++;while(j){const m=(j-1)%26;s=String.fromCharCode(65+m)+s;j=Math.floor((j-1)/26)}return s};
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRCT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function zipBlob(files,type){const enc=new TextEncoder(),parts=[],cd=[];let off=0;
 for(const f of files){const nm=enc.encode(f.name),d=typeof f.data==="string"?enc.encode(f.data):f.data,crc=crc32(d);
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);
  parts.push(new Uint8Array(h.buffer),nm,d);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,d.length,true);c.setUint32(24,d.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
  cd.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+d.length}
 const size=cd.reduce((t,x)=>t+x.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,off,true);
 return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type})}
/* stijlen: 1 bedrag, 2 datum, 3 kop, 4 vet bedrag, 5 vet, 6 geheel getal */
const XSTYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\-mm\\-yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0E4ED"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function sheetXml(sh){const rows=sh.rows.map((r,i)=>`<row r="${i+1}">${(r||[]).map((c,j)=>{if(c==null||c.v==null||c.v==="")return"";const ref=colL(j)+(i+1),st=c.s?` s="${c.s}"`:"";
  if(typeof c.v==="number")return`<c r="${ref}"${st}>${c.f?`<f>${c.f}</f>`:""}<v>${isFinite(c.v)?c.v:0}</v></c>`;
  return`<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`}).join("")}</row>`).join("");
 return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${sh.freeze?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':""}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${sh.cols?`<cols>${sh.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w+2}" customWidth="1"/>`).join("")}</cols>`:""}<sheetData>${rows}</sheetData>${sh.filter?`<autoFilter ref="${sh.filter}"/>`:""}</worksheet>`}
function xlsxBlob(sheets){const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships",H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const abs=r=>r.split(":").map(x=>x.replace(/([A-Z]+)(\d+)/,"$$$1$$$2")).join(":");
 const dn=sheets.map((x,i)=>x.filter?`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xe(x.name)}'!${abs(x.filter)}</definedName>`:"").join("");
 const files=[
  {name:"[Content_Types].xml",data:H+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((x,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`},
  {name:"_rels/.rels",data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
  {name:"xl/workbook.xml",data:H+`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><bookViews><workbookView/></bookViews><sheets>${sheets.map((x,i)=>`<sheet name="${xe(x.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets>${dn?`<definedNames>${dn}</definedNames>`:""}</workbook>`},
  {name:"xl/_rels/workbook.xml.rels",data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((x,i)=>`<Relationship Id="rId${i+1}" Type="${R}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`},
  {name:"xl/styles.xml",data:XSTYLES},
  ...sheets.map((x,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:sheetXml(x)}))];
 return zipBlob(files,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
function xTable(name,head,rows,fmt,widths,tot){
 const out=[head.map(h=>({v:h,s:3})),...rows.map(r=>r.map((v,j)=>typeof v==="number"?{v,s:fmt[j]==="m"?1:fmt[j]==="d"?2:0}:{v}))];
 if(tot&&rows.length){const n=rows.length,t=head.map(()=>null);t[0]={v:"Totaal",s:5};tot.forEach(j=>{const cl=colL(j);t[j]={v:rnd(rows.reduce((x,r)=>x+(+r[j]||0),0)),f:`SUM(${cl}2:${cl}${n+1})`,s:4}});out.push(t)}
 return{name,rows:out,cols:widths,freeze:true,filter:rows.length?`A1:${colL(head.length-1)}${rows.length+1}`:null}}
const xd=s=>{const[y,m,d]=String(s).split("-").map(Number);return(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/864e5};
const facInP=(from,to)=>D.facturen.filter(f=>{const s=ymd(new Date(f.ts));return s>=from&&s<=to}).sort((a,b)=>a.ts-b.ts);
function aggBtw(F){const m={21:{g:0,b:0},9:{g:0,b:0},0:{g:0,b:0}};F.forEach(f=>btwSpec(f.regels,f.korting).forEach(x=>{const k=m[x.pct]||(m[x.pct]={g:0,b:0});k.g=rnd(k.g+x.grondslag);k.b=rnd(k.b+x.btw)}));return m}
function workbookFor(from,to){
 const F=facInP(from,to),pays=D.facturen.flatMap(f=>f.betalingen.map(p=>({...p,f}))).filter(p=>{const s=ymd(new Date(p.ts));return s>=from&&s<=to}).sort((a,b)=>a.ts-b.ts);
 const ag=aggBtw(F),pct=[21,9,0].concat(Object.keys(ag).map(Number).filter(p=>![21,9,0].includes(p)));
 const soort={Behandelingen:0,Producten:0,"Vrije bedragen":0};F.forEach(f=>f.regels.forEach(r=>{const inc=rnd(r.totaal*(1-(f.korting||0)/100)),k=r.vrij||!r.artId?"Vrije bedragen":r.type==="product"?"Producten":"Behandelingen";soort[k]=rnd(soort[k]+inc)}));
 const meth={};pays.forEach(p=>{meth[p.methode]=rnd((meth[p.methode]||0)+p.bedrag)});const open=F.filter(f=>f.rest>0);
 const T=v=>({v}),B=v=>({v,s:5}),Hd=v=>({v,s:3}),Mo=v=>({v:rnd(v),s:1}),MB=v=>({v:rnd(v),s:4}),I=v=>({v,s:6});
 const S={name:"Samenvatting",cols:[28,18,14,18],rows:[[B("Omzetoverzicht "+(bed.naam||"Trimmy"))],[T("Periode"),T(`${fDate(from)} t/m ${fDate(to)}`)],[T("KvK"),T(bed.kvk||"")],[T("Btw-nummer"),T(bed.btwnr||"")],[T("Aangemaakt"),T(new Date().toLocaleString("nl-NL"))],[],
  [Hd("Btw-tarief"),Hd("Omzet excl. btw"),Hd("Btw"),Hd("Omzet incl. btw")],...pct.map(p=>[T(p+"%"),Mo(ag[p].g),Mo(ag[p].b),Mo(ag[p].g+ag[p].b)]),
  [B("Totaal"),MB(pct.reduce((x,p)=>x+ag[p].g,0)),MB(pct.reduce((x,p)=>x+ag[p].b,0)),MB(pct.reduce((x,p)=>x+ag[p].g+ag[p].b,0))],[],
  [Hd("Omzet naar soort"),Hd("Incl. btw")],...Object.entries(soort).map(([k,v])=>[T(k),Mo(v)]),[],
  [Hd("Ontvangen in de periode"),Hd("Bedrag")],...(Object.keys(meth).length?Object.entries(meth).map(([k,v])=>[T(k),Mo(v)]):[[T("Geen betalingen"),Mo(0)]]),[B("Totaal ontvangen"),MB(Object.values(meth).reduce((x,v)=>x+v,0))],[],
  [Hd("Facturen in de periode"),Hd("Aantal"),Hd("Bedrag")],[T("Alle facturen"),I(F.length),Mo(F.reduce((x,f)=>x+f.totaal,0))],[T("Waarvan nog open"),I(open.length),Mo(open.reduce((x,f)=>x+f.rest,0))]]};
 const fac=xTable("Facturen",["Factuurnummer","Datum","Klant","Plaats","Hond","Medewerker","Kassa","Omzet 21% excl.","Btw 21%","Omzet 9% excl.","Btw 9%","Omzet 0%","Totaal excl. btw","Totaal btw","Totaal incl. btw","Korting %","Betaald","Openstaand","Betaalwijze","Vervaldatum"],
  F.map(f=>{const k=get("klanten",f.klantId)||{},h=get("honden",f.hondId)||{},sp=btwSpec(f.regels,f.korting),g=p=>sp.find(x=>x.pct===p)||{grondslag:0,btw:0};
   return[f.nr,xd(ymd(new Date(f.ts))),k.naam||"Losse verkoop",k.plaats||"",h.naam||"",f.door||"",f.kassa||"",g(21).grondslag,g(21).btw,g(9).grondslag,g(9).btw,g(0).grondslag,rnd(sp.reduce((x,y)=>x+y.grondslag,0)),rnd(sp.reduce((x,y)=>x+y.btw,0)),f.totaal,f.korting||0,f.betaald,f.rest,[...new Set(f.betalingen.map(p=>p.methode))].join(", ")||"Op rekening",f.vervalt?xd(f.vervalt):""]}),
  ["t","d","t","t","t","t","t","m","m","m","m","m","m","m","m","n","m","m","t","d"],[16,11,24,14,12,12,6,14,11,14,11,11,14,12,14,9,12,12,16,12],[7,8,9,10,11,12,13,14,16,17]);
 const reg=xTable("Factuurregels",["Factuurnummer","Datum","Omschrijving","Soort","Aantal","Prijs incl. btw","Btw %","Korting %","Bedrag incl. btw","Bedrag excl. btw","Btw"],
  F.flatMap(f=>f.regels.map(r=>{const inc=rnd(r.totaal*(1-(f.korting||0)/100)),gr=rnd(inc/(1+(+r.btw||0)/100));return[f.nr,xd(ymd(new Date(f.ts))),r.naam,r.vrij||!r.artId?"Vrij bedrag":r.type==="product"?"Product":"Behandeling",r.aantal,r.prijs,r.btw,f.korting||0,inc,gr,rnd(inc-gr)]})),
  ["t","d","t","t","n","m","n","n","m","m","m"],[16,11,32,13,8,14,7,10,15,15,11],[8,9,10]);
 const bet=xTable("Betalingen",["Datum","Tijd","Factuurnummer","Klant","Betaalwijze","Bedrag"],
  pays.map(p=>[xd(ymd(new Date(p.ts))),new Date(p.ts).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}),p.f.nr,(get("klanten",p.f.klantId)||{}).naam||"Losse verkoop",p.methode,p.bedrag]),
  ["d","t","t","t","t","m"],[11,7,16,24,13,12],[5]);
 const days={};pays.forEach(p=>{const k=ymd(new Date(p.ts)),o=days[k]||(days[k]={PIN:0,Contant:0,Overboeking:0});o[p.methode]=rnd((o[p.methode]||0)+p.bedrag)});
 const kas=xTable("Kasboek per dag",["Datum","PIN","Contant","Overboeking","Totaal ontvangen"],Object.keys(days).sort().map(k=>{const o=days[k];return[xd(k),o.PIN||0,o.Contant||0,o.Overboeking||0,rnd(Object.values(o).reduce((x,v)=>x+v,0))]}),
  ["d","m","m","m","m"],[11,12,12,13,16],[1,2,3,4]);
 return[S,fac,reg,bet,kas]}
async function buildXlsx(from,to){return saveFile(`trimmy-facturen-${from}-tm-${to}.xlsx`,xlsxBlob(workbookFor(from,to)))}
