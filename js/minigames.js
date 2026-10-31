/* Lista de minigames e sorteio das rodadas.
   Para ADICIONAR um jogo novo: acrescente {id,label} em MINIGAMES e trate o `gameMode` com esse id
   (ver applyMode/reset/start em game.js). O sorteio nunca repete um jogo até todos terem sido jogados. */
const MINIGAMES=[
 {id:'bread',label:'Corrida do Pão'},
 {id:'ball',label:'Batalha das Bolas'},
 {id:'bowling',label:'Boliche na Ladeira'}
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
function resetMinigameBag(){minigameBag=[];lastMinigame=null;roundNumber=0;clearTimeout(roundTimer)}

function showRoundBanner(title,sub){
 const el=document.getElementById('roundBanner');if(!el)return;
 el.innerHTML='<small>'+sub+'</small><b>'+title+'</b>';
 el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
 setTimeout(()=>el.classList.remove('show'),2300);
}
/* Sorteia o próximo minigame, mostra o aviso e começa sozinho (só o anfitrião/offline sorteia). */
function startRound(){
 if(net.role==='client')return;
 clearTimeout(roundTimer);
 const id=drawMinigame(),info=MINIGAMES.find(m=>m.id===id);
 roundNumber++;
 document.getElementById('gameMode').value=id;gameMode=id;
 applyMode();reset();
 showFlowScreen('screenMinigames');
 document.getElementById('gameMode').disabled=true;
 const label='🎲 RODADA '+roundNumber+' • '+info.label.toUpperCase();
 document.getElementById('roundLabel').textContent=label;
 document.getElementById('status').textContent='🎲 Minigame sorteado: '+info.label+'!';
 showRoundBanner('🎲 '+info.label,'Rodada '+roundNumber);
 netBroadcast({k:'banner',title:'🎲 '+info.label,sub:'Rodada '+roundNumber,label});
 roundTimer=setTimeout(()=>{if(!running&&!ended&&!document.getElementById('scoreOverlay').classList.contains('show'))start()},5400);
}
