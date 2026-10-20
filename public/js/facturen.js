/* Trimmy · facturen.js */
"use strict";
/* ---------- facturen ---------- */
let fFil="alle";
function drawFac(){const adm=can("omzet");$("#fStats").hidden=!adm;$("#fExp").hidden=!adm;
 const day=new Date().toDateString(),pays=D.facturen.flatMap(f=>f.betalingen).filter(p=>new Date(p.ts).toDateString()===day),sum=a=>a.reduce((s,p)=>s+p.bedrag,0);
 const mth=new Date();const mf=D.facturen.filter(f=>{const d=new Date(f.ts);return d.getMonth()===mth.getMonth()&&d.getFullYear()===mth.getFullYear()});
 $("#fStats").innerHTML=`<div class="stat"><b>${eur(sum(pays))}</b><span>Ontvangen vandaag</span></div>`+["PIN","Contant"].map(m=>`<div class="stat"><b>${eur(sum(pays.filter(p=>p.methode===m)))}</b><span>${m} vandaag</span></div>`).join("")+
  `<div class="stat"><b>${eur(mf.reduce((s,f)=>s+f.totaal,0))}</b><span>Omzet deze maand</span></div><div class="stat"><b style="color:${D.facturen.some(f=>f.rest>0)?"var(--warn)":"inherit"}">${eur(D.facturen.reduce((s,f)=>s+Math.max(0,+f.rest||0),0))}</b><span>Openstaand</span></div>`;
 $$("#fSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.f===fFil));
 const q=$("#fq").value.trim().toLowerCase();
 const L=D.facturen.slice().sort((a,b)=>b.ts-a.ts).filter(f=>fFil==="alle"||(fFil==="open"?(f.rest>0||f.rest<-0.004):(f.rest<=0&&f.rest>=-0.004))).filter(f=>{if(!q)return true;const k=get("klanten",f.klantId),h=get("honden",f.hondId);return[f.nr,k&&k.naam,h&&h.naam,...f.regels.map(r=>r.naam)].join(" ").toLowerCase().includes(q)});
 const tdy=ymd(today());
 $("#fBody").innerHTML=L.length?L.map(f=>{const k=get("klanten",f.klantId),h=get("honden",f.hondId),te=f.rest>0&&f.vervalt&&f.vervalt<tdy;
  return`<tr class="click" data-f="${f.id}"><td><b>${esc(f.nr)}</b>${isCred(f)?`<br><small>Credit op ${esc(f.creditNr||"")}</small>`:""}${f.door?`<br><small>${esc(f.door)}</small>`:""}</td><td style="white-space:nowrap">${fDT(f.ts)}</td><td>${k?`<b>${esc(k.naam)}</b>`:`<span class="mute">Losse verkoop</span>`}${h?`<br><small>${esc(h.naam)}</small>`:""}</td><td>${esc(f.regels.map(r=>r.naam).join(", "))}</td><td>${esc([...new Set(f.betalingen.map(p=>p.methode))].join(", ")||(isCred(f)?"Nog terug te betalen":"Op rekening"))}</td><td class="r" style="white-space:nowrap"><b>${eur(f.totaal)}</b></td><td>${f.rest>0?`<span class="pill ${te?"warn":"amber"}">${te?"Te laat":"Open"} ${eur(f.rest)}</span>`:f.rest<-0.004?`<span class="pill warn">Terugbetalen ${eur(-f.rest)}</span>`:isCred(f)?`<span class="pill">Credit</span>`:creditsVan(f).length&&creditRuimte(f)<=0.004?`<span class="pill">Gecrediteerd</span>`:`<span class="pill ok">Betaald</span>`}</td></tr>`}).join(""):`<tr><td colspan="7" class="empty">${D.facturen.length?"Geen facturen gevonden met dit filter.":"Nog geen facturen. Reken een bon af op het tabblad Kassa."}</td></tr>`;
}
$("#fq").oninput=drawFac;$("#fSeg").onclick=e=>{if(e.target.dataset.f){fFil=e.target.dataset.f;drawFac()}};
$("#fExp").onclick=()=>exportDlg();
