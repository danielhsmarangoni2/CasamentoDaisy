(function(){'use strict';
const params=new URLSearchParams(location.search);
const token=params.get('convite')||'';
const demo=params.get('demo')==='1';

const status=document.getElementById('load-status');
const btn=document.getElementById('open-envelope');
const wrapper=document.getElementById('envelope-scene');
const details=document.getElementById('invitation-details');
const confirm=document.getElementById('rsvp-link');
const venue=document.getElementById('venue-link');
const gift=document.getElementById('gift-link');
/* Os nomes são mantidos exclusivamente no controle interno de convites; não aparecem na arte. */
// Os três botões levam às seções do site, com o mesmo convite (token ou demonstração).
function linkTo(a,url){a.href=url;a.removeAttribute('aria-disabled');a.classList.remove('disabled');}
function allowConfirm(url){
 linkTo(confirm,url);
 linkTo(venue,url.replace(/#confirmacao$/,'#celebracao'));
 linkTo(gift,url.replace(/#confirmacao$/,'#presentes'));
}
function blockConfirm(){
 [confirm,venue,gift].forEach(a=>{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.classList.add('disabled');});
}
if(demo){
 document.getElementById('demo-ribbon').hidden=false;
 // Prévia: o botão leva ao fluxo real do site (convidados e quantidades), com dados fictícios.
 allowConfirm('convite-demo.html?convite=demonstracao#confirmacao');
}else if(/^[A-Za-z0-9_-]{32}$/.test(token)){
 blockConfirm();status.textContent='Personalizando seu convite…';
 fetch('/.netlify/functions/invite?token='+encodeURIComponent(token),{cache:'no-store'})
  .then(async r=>{const obj=await r.json().catch(()=>({}));if(!r.ok)throw Error(obj.error||'Convite indisponível.');return obj;})
  .then(obj=>{allowConfirm('index.html?convite='+encodeURIComponent(token)+'#confirmacao');status.textContent='';})
  .catch(e=>{status.textContent='Não foi possível validar seu convite. '+(e.message||'Tente novamente.');});
}else{blockConfirm();status.textContent='A confirmação estará disponível pelo link exclusivo enviado pelos noivos.';}
// Transição cinematográfica em fases. O acesso a RSVP usa o token real do convite.
let processing=false,cinemaTimers=[];
const skip=document.getElementById('skip-intro');
const caption=document.getElementById('cinema-caption');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function schedule(fn,ms){cinemaTimers.push(setTimeout(fn,ms));}
function clearCinema(){cinemaTimers.forEach(clearTimeout);cinemaTimers=[];}
function stage(s,txt){wrapper.dataset.stage=s;caption.textContent=txt||'';}
function reveal(){
 clearCinema();processing=false;skip.hidden=true;
 wrapper.hidden=true;details.hidden=false;details.classList.remove('passagem');
 details.classList.add('cinema-visible');
 btn.setAttribute('aria-expanded','true');window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
 const heading=details.querySelector('h1');heading.setAttribute('tabindex','-1');
 heading.focus({preventScroll:true});
}
function openInvite(){
 if(processing||wrapper.hidden)return;
 processing=true;skip.hidden=false;
 stage('seal','');
 if(reduced){reveal();return;}
 schedule(()=>stage('unfold',''),380);
 schedule(()=>{stage('letter','');details.hidden=false;details.classList.remove('cinema-visible');void details.offsetWidth;details.classList.add('passagem','cinema-visible');},980);
 schedule(reveal,1750);
}
btn.addEventListener('click',openInvite);
skip.addEventListener('click',reveal);
document.getElementById('close-envelope').addEventListener('click',()=>{
 clearCinema();processing=false;details.classList.remove('cinema-visible','passagem');
 details.hidden=true;wrapper.hidden=false;skip.hidden=true;
 stage('closed','');btn.setAttribute('aria-expanded','false');
 btn.focus({preventScroll:true});window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
});
if(demo){
}
})();
