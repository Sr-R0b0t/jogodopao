/* Lista de minigames e sorteio das rodadas.
   Para ADICIONAR um jogo novo: acrescente {id,label} em MINIGAMES e trate o `gameMode` com esse id
   (ver applyMode/reset/start em game.js). O sorteio nunca repete um jogo até todos terem sido jogados. */
const MINIGAMES=[
 {id:'bread',label:'Corrida do Pão'},
 {id:'ball',label:'Batalha das Bolas'},
 {id:'bowling',label:'Boliche na Ladeira'},
 {id:'soccer',label:'Pênaltis (Futebol)'}
];
let minigameBag=[],lastMinigame=null,roundNumber=0,roundTimer=null;
// o seletor de minigame fica escondido (só o jogo usa), mas segue a lista acima
(function(){const sel=document.getElementById('gameMode');sel.replaceChildren(...MINIGAMES.map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.label;return o}))})();

/* "Saco" de sorteio: embaralha todos, tira um por rodada; quando esvazia, embaralha de novo
   (evitando abrir o novo ciclo com o mesmo jogo que acabou de ser jogado). */
function drawMinigame(){
 if(!minigameBag.length){
  minigameBag=MINIGAMES.map(m=>m.id).sort(()=>Math.random()-.5);
  if(minigameBag.length>1&&minigameBag[0]===lastMinigame)minigameBag.push(minigameBag.shift());
 }
 lastMinigame=minigameBag.shift();return lastMinigame;
}
function resetMinigameBag(){minigameBag=[];lastMinigame=null;roundNumber=0;cancelCountdown()}

/* Aviso grande no meio da tela (nome do minigame + contagem). Fica até hideRoundBanner(). */
const COUNTDOWN_SECONDS=5;
let cdTimer=null;
function showRoundBanner(title,sub,count){
 const el=document.getElementById('roundBanner');if(!el)return;
 el.innerHTML='<small>'+sub+'</small><b>'+title+'</b>'+(count!==undefined?'<span class="cd">'+count+'</span>':'');
 el.classList.add('show');
}
function hideRoundBanner(){const el=document.getElementById('roundBanner');if(el)el.classList.remove('show')}
function cdBeep(n){ // bip a cada segundo; som mais alto no "VAI!"
 if(n>0)tone(n<=2?700:520,.12,'square',.07);
 else{tone(784,.2,'triangle',.12);tone(1046,.35,'triangle',.11,.14)}
}
function cancelCountdown(){clearInterval(cdTimer);cdTimer=null;clearTimeout(roundTimer);hideRoundBanner()}
/* 5…4…3…2…1…VAI! e então começa a partida (o anfitrião manda a contagem para todos). */
function runCountdown(sec,title,sub,label){
 cancelCountdown();
 let n=sec;
 const tick=()=>{
  showRoundBanner(title,sub,n>0?String(n):'VAI!');cdBeep(n);
  netBroadcast({k:'cd',title,sub,n,label});
  if(n<=0){
   clearInterval(cdTimer);cdTimer=null;setTimeout(hideRoundBanner,700);
   if(!running&&!ended&&!document.getElementById('scoreOverlay').classList.contains('show'))start();
   return;
  }
  n--;
 };
 tick();cdTimer=setInterval(tick,1000);
}
/* Sorteia o próximo minigame, mostra o aviso e a contagem e começa sozinho (só o anfitrião/offline sorteia). */
function startRound(){
 if(net.role==='client')return;
 cancelCountdown();
 const id=drawMinigame(),info=MINIGAMES.find(m=>m.id===id);
 roundNumber++;
 document.getElementById('gameMode').value=id;gameMode=id;
 applyMode();reset();
 showFlowScreen('screenMinigames');
 document.getElementById('gameMode').disabled=true;
 const label='🎲 RODADA '+roundNumber+' • '+info.label.toUpperCase();
 document.getElementById('roundLabel').textContent=label;
 document.getElementById('status').textContent='🎲 Minigame sorteado: '+info.label+'! A partida começa em instantes…';
 runCountdown(COUNTDOWN_SECONDS,'🎲 '+info.label,'Rodada '+roundNumber,label);
}
