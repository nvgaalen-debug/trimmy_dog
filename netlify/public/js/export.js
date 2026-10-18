/* Trimmy · export.js */
"use strict";
function exportDlg(){const T=today(),y=T.getFullYear(),m=T.getMonth(),q=Math.floor(m/3);
 const PR=[["vm","Vorige maand",new Date(y,m-1,1),new Date(y,m,0)],["dm","Deze maand",new Date(y,m,1),new Date(y,m+1,0)],["vk","Vorig kwartaal",new Date(y,q*3-3,1),new Date(y,q*3,0)],["dk","Dit kwartaal",new Date(y,q*3,1),new Date(y,q*3+3,0)],["vj","Vorig jaar",new Date(y-1,0,1),new Date(y-1,11,31)],["dj","Dit jaar",new Date(y,0,1),new Date(y,11,31)]];
 const d=modal(`<h2>Export voor de accountant</h2><div class="chips" id="eP">${PR.map(p=>`<button type="button" class="chip" data-p="${p[0]}">${p[1]}</button>`).join("")}</div>
  <div class="g2"><label>Van<input id="eF" type="date"></label><label>Tot en met<input id="eT" type="date"></label></div>
  <div class="note" id="eS"></div>
  <small>Excel-bestand met de tabbladen Samenvatting (omzet en btw per tarief), Facturen, Factuurregels, Betalingen en Kasboek per dag. Facturen tellen mee op factuurdatum, betalingen op betaaldatum.</small>
  <div class="msg" id="eM"></div>
  <div class="acts"><button class="btn" type="button" id="eX">Sluiten</button><button class="btn p" type="button" id="eOk">Excel downloaden</button></div>`);
 const sum=()=>{const f=d.q("#eF").value,t=d.q("#eT").value;d.querySelectorAll("#eP .chip").forEach(b=>{const p=PR.find(x=>x[0]===b.dataset.p);b.setAttribute("aria-pressed",ymd(p[2])===f&&ymd(p[3])===t)});
  if(!f||!t||f>t){d.q("#eS").textContent="Kies een geldige periode.";return}
  const F=facInP(f,t),ag=aggBtw(F),open=F.filter(x=>x.rest>0);
  d.q("#eS").innerHTML=`<b>${F.length} facturen</b> · omzet incl. btw <b>${eur(F.reduce((s,x)=>s+x.totaal,0))}</b><br>Btw 21%: ${eur(ag[21].b)} · btw 9%: ${eur(ag[9].b)} · omzet 0%: ${eur(ag[0].g)}${open.length?`<br><span style="color:var(--warn)">${open.length} nog open: ${eur(open.reduce((s,x)=>s+x.rest,0))}</span>`:""}`};
 const setP=k=>{const p=PR.find(x=>x[0]===k);d.q("#eF").value=ymd(p[2]);d.q("#eT").value=ymd(p[3]);sum()};
 d.q("#eP").onclick=e=>{if(e.target.dataset.p)setP(e.target.dataset.p)};d.q("#eF").oninput=sum;d.q("#eT").oninput=sum;setP("vm");
 d.q("#eX").onclick=()=>d.close();
 d.q("#eOk").onclick=async()=>{const f=d.q("#eF").value,t=d.q("#eT").value,b=d.q("#eOk"),M=d.q("#eM");M.style.color="";M.textContent="";
  if(!f||!t||f>t){M.textContent="Kies een geldige periode.";return}if(!facInP(f,t).length){M.textContent="Er zijn geen facturen in deze periode.";return}
  b.disabled=true;b.textContent="Bezig…";try{const r=await buildXlsx(f,t);if(r==="saved"){M.style.color="var(--ok)";M.textContent="Excel-bestand opgeslagen."}else M.textContent="Niet opgeslagen."}catch(e){M.textContent=e.message}finally{b.disabled=false;b.textContent="Excel downloaden"}}}
$("#fBody").onclick=e=>{const r=e.target.closest("[data-f]");if(r)invDlg(get("facturen",r.dataset.f))};
