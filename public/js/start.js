/* Trimmy · start.js */
"use strict";
go(tab);lockCheck();dbUi();if(dbOn())dbSync();
/* app op het apparaat bewaren (alleen op het eigen webadres) */
const IS_APP=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
let instEvt=null;
function appUi(){const st=$("#appStat"),b=$("#appInst");if(!st)return;
 if(!STANDALONE||!(location.protocol==="https:"||location.hostname==="localhost")){st.textContent="Installeren kan in "+SJ.app+" op jullie eigen webadres (Netlify), niet in deze voorbeeldversie.";b.hidden=true;return}
 if(IS_APP){st.textContent=""+SJ.app+" draait als app op dit apparaat en start ook zonder internet.";st.classList.remove("w");b.hidden=true;$("#appHow").hidden=true;return}
 b.hidden=!instEvt;st.textContent=navigator.serviceWorker&&navigator.serviceWorker.controller?""+SJ.app+" is bewaard op dit apparaat en start ook zonder internet. Installeer hem voor een eigen icoon en venster.":"Installeer "+SJ.app+" op dit apparaat. Je krijgt dan een eigen icoon en "+SJ.app+" start ook zonder internet."}
if(STANDALONE&&(location.protocol==="https:"||location.hostname==="localhost")&&"serviceWorker" in navigator){
 navigator.serviceWorker.register("/sw.js").then(()=>navigator.serviceWorker.ready).then(appUi).catch(e=>console.warn("sw",e));
 window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();instEvt=e;appUi()});
 window.addEventListener("appinstalled",()=>{instEvt=null;toast(""+SJ.app+" is geïnstalleerd. Je vindt hem voortaan als app op dit apparaat.");appUi()});
}
$("#appInst").onclick=async()=>{if(!instEvt)return;instEvt.prompt();try{await instEvt.userChoice}catch(e){}instEvt=null;appUi()};
appUi();
