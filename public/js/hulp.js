/* Trimmy · hulp.js */
"use strict";
/* ---------- hulpjes ---------- */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rnd=n=>Math.round((+n||0)*100)/100;
const eur=n=>"€ "+rnd(n).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const num=v=>{let s=String(v??"").trim();if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
const nm=n=>String(rnd(n)).replace(".",",");
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromYmd=s=>{const[a,b,c]=String(s).split("-").map(Number);return new Date(a,(b||1)-1,c||1)};
const toMin=t=>{const[h,m]=String(t||"0:0").split(":").map(Number);return(h||0)*60+(m||0)};
const toHM=m=>pad(Math.floor(m/60))+":"+pad(m%60);
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const isoWeek=d=>{const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const k=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-k);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y)/864e5+1)/7)};
const weekStart=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const fDate=s=>fromYmd(s).toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"});
const fDT=ts=>new Date(ts).toLocaleString("nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const by=k=>(a,b)=>String(a[k]||"").localeCompare(String(b[k]||""),"nl");
const S={get(k,d){try{const v=JSON.parse(localStorage.getItem("tr_"+k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem("tr_"+k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem("tr_"+k)}catch(e){}}};
const STANDALONE=(()=>{try{return window.self===window.top}catch(e){return false}})();
function arm(btn,fn,txt="Klik nogmaals om te bevestigen"){if(btn.dataset.armed){delete btn.dataset.armed;btn.textContent=btn.dataset.orig;fn();return}btn.dataset.orig=btn.textContent;btn.dataset.armed=1;btn.textContent=txt;setTimeout(()=>{if(btn.dataset.armed){delete btn.dataset.armed;btn.textContent=btn.dataset.orig}},4000)}
function modal(html,cls=""){const d=document.createElement("dialog");if(cls)d.className=cls;d.innerHTML=`<div class="dlg">${html}</div>`;document.body.append(d);d.q=s=>d.querySelector(s);d.addEventListener("close",()=>d.remove());d.showModal();return d}

/* code uit het adres halen en als header meesturen, zodat hij niet in logs of browsergeschiedenis belandt */
/* adres van het klantportaal; bij een salon-account met ?s=<salon> */
function portaalUrl(){let p=null;try{p=JSON.parse(localStorage.getItem("tr_platform")||"null")}catch(e){}return location.origin+"/portaal"+(p&&p.salon&&p.salon.slug?"?s="+encodeURIComponent(p.salon.slug):"")}
function apiFetch(u,opt={}){let url=u,code="";try{const x=new URL(u,location.href);code=x.searchParams.get("code")||"";x.searchParams.delete("code");url=x.toString()}catch(e){}
 return fetch(url,{credentials:"same-origin",...opt,headers:{"X-Trimmy-App":"1",...(opt.headers||{}),...(code?{"X-Trimmy-Code":code}:{})}})}
