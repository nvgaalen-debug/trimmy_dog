/* Trimmy · dialogen.js */
"use strict";
/* ---------- klant & hond dialogen ---------- */
function klantDlg(id,cb){
 const k=id?get("klanten",id):{naam:"",straat:"",pc:"",plaats:"",tel:"",email:"",notitie:""};
 const heeftF=id&&D.facturen.some(f=>f.klantId===id);
 const d=modal(`<h2>${id?"Klant wijzigen":"Nieuwe klant"}</h2>
  <label>Naam<input id="kN" value="${esc(k.naam)}" autocomplete="off"></label>
  <label>Straat en huisnummer<input id="kS" value="${esc(k.straat)}"></label>
  <div class="g3"><label>Postcode<input id="kP" maxlength="8" value="${esc(k.pc)}"></label><label>Plaats<input id="kPl" value="${esc(k.plaats)}"></label></div>
  <div class="g2"><label>Telefoon<input id="kT" type="tel" value="${esc(k.tel)}"></label><label>E-mail<input id="kE" type="email" value="${esc(k.email)}"></label></div>
  <label>Notitie<textarea id="kNo" rows="2">${esc(k.notitie)}</textarea></label>
  <div class="msg" id="kMsg"></div>
  <div class="acts">${id&&can("klantDel")?`<button class="btn d" type="button" id="kDel" ${heeftF?"disabled title=\"Klant heeft facturen en blijft bewaard\"":""}>Verwijderen</button><span class="sp"></span>`:""}<button class="btn" type="button" id="kX">Annuleren</button><button class="btn p" type="button" id="kOk">Opslaan</button></div>`);
 d.q("#kX").onclick=()=>d.close();
 d.q("#kOk").onclick=()=>{const v={naam:d.q("#kN").value.trim(),straat:d.q("#kS").value.trim(),pc:d.q("#kP").value.trim().toUpperCase(),plaats:d.q("#kPl").value.trim(),tel:d.q("#kT").value.trim(),email:d.q("#kE").value.trim(),notitie:d.q("#kNo").value.trim()};
  if(!v.naam){d.q("#kMsg").textContent="Vul de naam in.";return}
  if(v.email&&!/^\S+@\S+\.\S+$/.test(v.email)){d.q("#kMsg").textContent="Dit e-mailadres lijkt niet te kloppen.";return}
  let r;if(id){r=get("klanten",id);Object.assign(r,v)}else{r={id:uid(),...v};D.klanten.push(r)}saveC("klanten");d.close();draw();cb&&cb(r)};
 if(d.q("#kDel"))d.q("#kDel").onclick=e=>arm(e.target,()=>{D.klanten=D.klanten.filter(x=>x.id!==id);D.honden=D.honden.filter(h=>h.klantId!==id);D.afspraken=D.afspraken.filter(a=>a.klantId!==id||a.datum<ymd(today()));["klanten","honden","afspraken"].forEach(saveC);if(selKl===id)selKl=null;d.close();draw()},"Nogmaals: klant en honden verwijderen");
 setTimeout(()=>d.q("#kN").focus(),30);
}
const VACHT=["Kort","Lang","Krullend","Ruwhaar","Draadhaar","Dubbele vacht","Zijdeachtig"];
function hondDlg(id,klantId,cb){
 const h=id?get("honden",id):{naam:"",ras:"",geb:"",geslacht:"",gecast:false,gewicht:"",vacht:"",kleur:"",chip:"",gedrag:"",medisch:"",notitie:"",foto:"",inactief:false,klantId};
 let foto=h.foto||"";
 const d=modal(`<h2>${id?"Hond wijzigen":"Hond toevoegen"}</h2>
  <div style="display:flex;gap:14px;align-items:center"><div class="av" id="hAv" style="grid-row:auto;${foto?`background-image:url(${foto})`:""}">${foto?"":esc((h.naam||"?")[0])}</div><div class="acts l"><button class="btn s" type="button" id="hFp">Foto kiezen</button><button class="btn s" type="button" id="hFx">Foto weghalen</button><input type="file" id="hF" accept="image/*" hidden></div></div>
  <div class="g2"><label>Naam<input id="hN" value="${esc(h.naam)}"></label><label>Ras<input id="hR" value="${esc(h.ras)}" list="rasL"></label></div>
  <datalist id="rasL">${[...new Set(D.honden.map(x=>x.ras).filter(Boolean).concat(["Labradoodle","Shih Tzu","Toypoedel","Maltezer","Border Terriër","Cocker Spaniël","Golden Retriever","Westie","Yorkshire Terriër","Schnauzer","Bichon Frisé","Australian Labradoodle","Cavalier King Charles","Teckel ruwhaar"]))].map(r=>`<option value="${esc(r)}">`).join("")}</datalist>
  <div class="g2"><label>Geboortedatum<input id="hG" type="date" value="${esc(h.geb)}"></label><label>Geslacht<select id="hS"><option value="">Onbekend</option>${["Reu","Teef"].map(x=>`<option ${x===h.geslacht?"selected":""}>${x}</option>`).join("")}</select></label></div>
  <label class="chk"><input type="checkbox" id="hC" ${h.gecast?"checked":""}> Gecastreerd of gesteriliseerd</label>
  <div class="g2"><label>Gewicht (kg)<input id="hW" inputmode="decimal" value="${h.gewicht===""||h.gewicht==null?"":nm(h.gewicht)}"></label><label>Vachttype<select id="hV"><option value="">Kies</option>${VACHT.map(x=>`<option ${x===h.vacht?"selected":""}>${x}</option>`).join("")}</select></label></div>
  <div class="g2"><label>Kleur<input id="hK" value="${esc(h.kleur)}"></label><label>Chipnummer<input id="hCh" inputmode="numeric" maxlength="15" value="${esc(h.chip)}"></label></div>
  <label>Gedrag tijdens het trimmen<input id="hGd" value="${esc(h.gedrag)}" placeholder="Bijvoorbeeld: angstig bij de föhn"></label>
  <label>Medisch en allergieën<input id="hM" value="${esc(h.medisch)}"></label>
  <label>Vaste wensen en coupe<textarea id="hNo" rows="2">${esc(h.notitie)}</textarea></label>
  ${id?`<label class="chk"><input type="checkbox" id="hI" ${h.inactief?"checked":""}> Niet meer actief (verhuisd of overleden)</label>`:""}
  <div class="msg" id="hMsg"></div>
  <div class="acts"><button class="btn" type="button" id="hX">Annuleren</button><button class="btn p" type="button" id="hOk">Opslaan</button></div>`);
 const av=()=>{d.q("#hAv").style.backgroundImage=foto?`url(${foto})`:"";d.q("#hAv").textContent=foto?"":(d.q("#hN").value||"?")[0].toUpperCase()};
 d.q("#hFp").onclick=()=>d.q("#hF").click();d.q("#hFx").onclick=()=>{foto="";av()};
 d.q("#hF").onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();const u=URL.createObjectURL(f);img.onload=()=>{const s=240,c=document.createElement("canvas"),r=Math.min(1,s/Math.min(img.width,img.height));c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);c.getContext("2d").drawImage(img,0,0,c.width,c.height);foto=c.toDataURL("image/jpeg",.8);URL.revokeObjectURL(u);av()};img.src=u};
 d.q("#hN").oninput=av;d.q("#hX").onclick=()=>d.close();
 d.q("#hOk").onclick=()=>{const v={naam:d.q("#hN").value.trim(),ras:d.q("#hR").value.trim(),geb:d.q("#hG").value,geslacht:d.q("#hS").value,gecast:d.q("#hC").checked,gewicht:d.q("#hW").value.trim()?num(d.q("#hW").value):"",vacht:d.q("#hV").value,kleur:d.q("#hK").value.trim(),chip:d.q("#hCh").value.replace(/\s/g,""),gedrag:d.q("#hGd").value.trim(),medisch:d.q("#hM").value.trim(),notitie:d.q("#hNo").value.trim(),foto,inactief:id?d.q("#hI").checked:false};
  if(!v.naam){d.q("#hMsg").textContent="Vul de naam van de hond in.";return}
  if(v.chip&&!/^\d{15}$/.test(v.chip)){d.q("#hMsg").textContent="Een chipnummer bestaat uit 15 cijfers.";return}
  let r;if(id){r=get("honden",id);Object.assign(r,v)}else{r={id:uid(),klantId,...v};D.honden.push(r)}saveC("honden");d.close();draw();cb&&cb(r)};
 setTimeout(()=>d.q("#hN").focus(),30);
}
