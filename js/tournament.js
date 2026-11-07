/* Placar do campeonato (vitória = 3 pontos) e botões do overlay de resultado. */
const tournamentScores=new Array(16).fill(0); // sobra espaço para novos personagens
let roundsPlayed=0;
let tournamentCharacterLocked=false;
/* Atraso entre o fim da partida e a exibição do placar (ms). */
const SCORE_DELAY_MS=5000;
let scoreOverlayTimer=null;
function cancelScoreOverlay(){if(scoreOverlayTimer){clearTimeout(scoreOverlayTimer);scoreOverlayTimer=null}}
function scheduleScoreOverlay(fn,ms){cancelScoreOverlay();scoreOverlayTimer=setTimeout(()=>{scoreOverlayTimer=null;fn()},ms||SCORE_DELAY_MS)}
/* PONTUAÇÃO POR RODADA: 1º lugar 5 pts, 2º 3 pts, 3º 2 pts, todos os demais 1 pt. */
const RANK_POINTS=[5,3,2],REST_POINTS=1;
/* `ranking` = lista de grupos em ordem de colocação; empatados ficam no mesmo grupo, ex.: [[3],[1,2],[0]]. */
function pointsForRanking(ranking){
 const gains={};let place=0;
 for(const group of ranking){const pts=place<RANK_POINTS.length?RANK_POINTS[place]:REST_POINTS;group.forEach(i=>gains[i]=pts);place+=group.length}
 return gains;
}
/* Soma os pontos no campeonato e monta a tabela. gains={índice:pontosGanhosNaRodada}, detail={índice:texto}. */
function buildScoreboard(gains,detail,modeLabel,subtitle){
 roundsPlayed++;
 Object.keys(gains).forEach(i=>{tournamentScores[i]+=gains[i]});
 const order=players.map((p,i)=>({name:p.name,index:i,score:tournamentScores[i],isUser:i===humanIndex})).filter(o=>isActive(o.index)).sort((a,b)=>b.score-a.score||Number(b.isUser)-Number(a.isUser)||a.index-b.index);
 const sub=subtitle||'1º 5 pts • 2º 3 pts • 3º 2 pts • demais 1 pt';
 return `<div class="points-panel"><h3>🏆 Placar do campeonato</h3><div class="points-subtitle">${modeLabel} • Rodada ${roundsPlayed} • ${sub}</div><table class="points-table"><thead><tr><th>#</th><th>Personagem</th><th>Total</th></tr></thead><tbody>${order.map((p,pos)=>`<tr data-slot="${p.index}" class="${pos===0?'current-leader':''}"><td>${pos===0?'🥇':pos===1?'🥈':pos===2?'🥉':pos+1}</td><td>${p.name}${p.isUser?' <strong class="you" style="color:#8af0b3"> (VOCÊ)</strong>':''}${gains[p.index]?' <span class="gain">+'+gains[p.index]+'</span>':''}${detail&&detail[p.index]?'<small class="pt-detail">'+detail[p.index]+'</small>':''}</td><td>${p.score}</td></tr>`).join('')}</tbody></table><div class="points-actions">${finalRound?'<button id="showPodiumBtn">🏆 VER O PÓDIO FINAL →</button>':'<button id="playNextRound">🎲 SORTEAR E INICIAR PRÓXIMO MINIGAME →</button>'}<button id="resetTournament" class="secondary">↻ Zerar campeonato</button></div></div>`;
}
/* Mostra o resultado da rodada (depois do atraso) e envia o placar aos convidados. */
function showRoundResults(gains,detail,modeLabel,headline,lead,subtitle){
 scheduleScoreOverlay(()=>{
  document.getElementById('scoreOverlayTitle').textContent=headline;
  document.getElementById('scoreOverlayLead').textContent=lead;
  document.getElementById('scoreOverlayContent').innerHTML=buildScoreboard(gains,detail,modeLabel,subtitle);
  document.getElementById('scoreOverlay').classList.add('show');
  wireScoreboardActions();
  netSendOverlay();
 });
}
function wireScoreboardActions(){
 const next=document.getElementById('playNextRound');
 if(next)next.addEventListener('click',()=>{
  document.getElementById('scoreOverlay').classList.remove('show');
  document.getElementById('result').classList.remove('show');
  document.getElementById('result').innerHTML='';
  netBroadcast({k:'ovhide'});
  startRound(); // sorteia o próximo minigame (sem repetir até todos terem sido jogados)
 });
 const pod=document.getElementById('showPodiumBtn');
 if(pod)pod.addEventListener('click',()=>{
  document.getElementById('scoreOverlay').classList.remove('show');
  document.getElementById('result').classList.remove('show');document.getElementById('result').innerHTML='';
  netBroadcast({k:'ovhide'});
  startPodiumOrTieBreak();
 });
 const clear=document.getElementById('resetTournament');
 if(clear)clear.addEventListener('click',()=>{
  netBroadcast({k:'ovhide'});
  tournamentScores.fill(0);roundsPlayed=0;document.getElementById('scoreOverlay').classList.remove('show');
  document.getElementById('result').classList.remove('show');document.getElementById('result').innerHTML='';
  resetMinigameBag();startRound();
 });
}

/* ---- DESEMPATE: se mais de um personagem terminar empatado no topo, eles se enfrentam nos pênaltis
   (3 chutes cada, alternando batedor/goleiro; empate = morte súbita). Com 3+ empatados vira mata-mata: o vencedor enfrenta o próximo. ---- */
let tieState=null,podiumNote='';
function podiumBaseOrder(){return players.map((p,i)=>i).filter(isActive).sort((a,b)=>tournamentScores[b]-tournamentScores[a]||Number(b===humanIndex)-Number(a===humanIndex)||a-b)}
function startPodiumOrTieBreak(){
 const base=podiumBaseOrder(),top=tournamentScores[base[0]]||0,tied=base.filter(i=>(tournamentScores[i]||0)===top);
 podiumNote='';
 if(tied.length<2||net.role==='client'){startPodium();return}
 tieState={champ:null,rest:tied.sort(()=>Math.random()-.5),losers:[]};
 tieNextDuel();
}
function tieNextDuel(){
 const ts=tieState,a=ts.champ===null?ts.rest.shift():ts.champ,b=ts.rest.shift();
 soccerDuel={a,b};
 cancelCountdown();
 document.getElementById('gameMode').value='soccer';gameMode='soccer';
 applyMode();reset();showFlowScreen('screenMinigames');
 document.getElementById('gameMode').disabled=true;
 const label='⚔️ DESEMPATE • PÊNALTIS';
 document.getElementById('roundLabel').textContent=label;
 document.getElementById('status').textContent='⚔️ Empate no topo! '+players[a].name+' x '+players[b].name+' decidem nos pênaltis.';
 runCountdown(COUNTDOWN_SECONDS,'⚔️ DESEMPATE: '+players[a].name+' x '+players[b].name,'Pênaltis • 3 chutes cada',label,'Um chuta enquanto o outro defende, depois trocam. Quem fizer mais gols vence o campeonato! Se empatar, morte súbita.');
}
function tieDuelDone(w,l){
 const ts=tieState;if(!ts)return;
 ts.champ=w;ts.losers.push(l);
 if(ts.rest.length){tieNextDuel();return}
 const base=podiumBaseOrder(),order=[w,...ts.losers.slice().reverse(),...base.filter(i=>i!==w&&!ts.losers.includes(i))];
 podiumNote='⚔️ Vitória no desempate por pênaltis!';tieState=null;
 startPodium(order);
}
