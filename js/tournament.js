/* Placar do campeonato (vitória = 3 pontos) e botões do overlay de resultado. */
const tournamentScores=[0,0,0,0,0];
let roundsPlayed=0;
let tournamentCharacterLocked=false;
/* Atraso entre o fim da partida e a exibição do placar (ms). */
const SCORE_DELAY_MS=5000;
let scoreOverlayTimer=null;
function cancelScoreOverlay(){if(scoreOverlayTimer){clearTimeout(scoreOverlayTimer);scoreOverlayTimer=null}}
function scheduleScoreOverlay(fn){cancelScoreOverlay();scoreOverlayTimer=setTimeout(()=>{scoreOverlayTimer=null;fn()},SCORE_DELAY_MS)}
function buildScoreboard(winnerIndex,modeLabel){
 roundsPlayed++;
 if(winnerIndex>=0&&winnerIndex<tournamentScores.length)tournamentScores[winnerIndex]+=3;
 const order=players.map((p,i)=>({name:p.name,index:i,score:tournamentScores[i],isUser:i===humanIndex})).sort((a,b)=>b.score-a.score||Number(b.isUser)-Number(a.isUser)||a.index-b.index);
 return `<div class="points-panel"><h3>🏆 Placar do campeonato</h3><div class="points-subtitle">${modeLabel} • Rodada ${roundsPlayed} • Vitória vale 3 pontos</div><table class="points-table"><thead><tr><th>#</th><th>Personagem</th><th>Pontos</th></tr></thead><tbody>${order.map((p,pos)=>`<tr data-slot="${p.index}" class="${pos===0?'current-leader':''}"><td>${pos===0?'🥇':pos===1?'🥈':pos===2?'🥉':pos+1}</td><td>${p.name}${p.isUser?' <strong class="you" style="color:#8af0b3"> (VOCÊ)</strong>':''}${p.index===winnerIndex?' 🏆 +3':''}</td><td>${p.score}</td></tr>`).join('')}</tbody></table><div class="points-actions"><button id="playNextRound">🎲 SORTEAR E INICIAR PRÓXIMO MINIGAME →</button><button id="resetTournament" class="secondary">↻ Zerar campeonato</button></div></div>`;
}
function wireScoreboardActions(){
 const next=document.getElementById('playNextRound');
 if(next)next.addEventListener('click',()=>{
  document.getElementById('scoreOverlay').classList.remove('show');
  document.getElementById('result').classList.remove('show');
  document.getElementById('result').innerHTML='';
  netBroadcast({k:'ovhide'});
  const modes=['bread','ball','bowling'];const nextMode=modes[Math.floor(Math.random()*modes.length)];
  document.getElementById('gameMode').value=nextMode;
  gameMode=nextMode;
  applyMode();
  reset();
  showFlowScreen('screenMinigames');
  document.getElementById('gameMode').disabled=true;
  document.getElementById('characterChoice').disabled=tournamentCharacterLocked;
  document.getElementById('status').textContent='🎲 Próximo minigame sorteado: '+(nextMode==='bread'?'Corrida do Pão':nextMode==='ball'?'Batalha das Bolas':'Boliche na Ladeira')+'!';
  document.getElementById('start').disabled=false;
  setTimeout(()=>{if(!running&&!ended&&!document.getElementById('scoreOverlay').classList.contains('show'))start()},900);
 });
 const clear=document.getElementById('resetTournament');
 if(clear)clear.addEventListener('click',()=>{
  netBroadcast({k:'ovhide'});
  tournamentScores.fill(0);roundsPlayed=0;tournamentCharacterLocked=false;document.getElementById('scoreOverlay').classList.remove('show');document.getElementById('characterChoice').disabled=false;reset();applyMode();
  document.getElementById('result').classList.remove('show');document.getElementById('result').innerHTML='';
  document.getElementById('gameMode').disabled=false;document.getElementById('characterChoice').disabled=false;document.getElementById('start').disabled=false;
  showFlowScreen('screenMinigames');
  document.getElementById('status').textContent='Campeonato zerado. Escolha o minigame para começar!';
 });
}
