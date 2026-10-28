/* Minigame: Boliche na Ladeira
   Cena 3D, trajetória da bola, queda dos pinos, turnos e placar.
   Depende de: scene.js (scene, mat), characters.js (players), tournament.js,
   e das variáveis globais running/ended/humanIndex/botTimers/gameMode.
   O HUD (updateBowlingTopScore, showBowlingArrowHint) fica em bowling-ui.js. */

/* ---------- Parâmetros ajustáveis ---------- */
const BOWLING={
 startZ:4.0,        // onde a bola é lançada
 endZ:-5.6,         // até onde ela rola (atravessa o rack de pinos)
 converge:.55,      // quanto a bola "fecha" para o centro (0 = reta)
 ballOffset:.43,    // bola fica na mão, ao lado do corpo
 ballR:.34, pinR:.17,
 maxLineX:1.7,      // limite lateral do jogador
 chainRadius:.56,   // alcance de um pino derrubando o vizinho
 chainBase:.10, chainPower:.45 // chance = base + força*power
};

/* ---------- Pista, pinos e bola ---------- */
const bowlingRoot=new THREE.Group();scene.add(bowlingRoot);bowlingRoot.visible=false;
const laneMat=mat('#b87b43',.62),laneEdgeMat=mat('#6d452f',.75),pinWhite=mat('#fff4e8',.24),pinRed=mat('#df4b52',.35),bowlingBallMat=mat('#44b8e8',.25,.1);
// Pista mais comprida (z de -6.65 a 4.95) para os pinos tombarem sobre madeira.
const laneBase=new THREE.Mesh(new THREE.BoxGeometry(5.4,.22,11.6),laneEdgeMat);laneBase.position.set(0,.05,-.85);laneBase.receiveShadow=true;laneBase.castShadow=true;bowlingRoot.add(laneBase);
const laneSurface=new THREE.Mesh(new THREE.BoxGeometry(5.05,.06,11.35),laneMat);laneSurface.position.set(0,.19,-.85);laneSurface.receiveShadow=true;bowlingRoot.add(laneSurface);
for(const side of [-1,1]){const g=new THREE.Mesh(new THREE.BoxGeometry(.34,.12,11.4),mat('#d5b6ec',.45));g.position.set(side*2.82,.12,-.85);bowlingRoot.add(g)}
const laneArrowMat=mat('#ffe1a0',.45);
for(let i=-2;i<=2;i++){const a=new THREE.Mesh(new THREE.ConeGeometry(.12,.32,3),laneArrowMat);a.rotation.x=Math.PI/2;a.position.set(i*.55,.235,1.3-Math.abs(i)*.12);bowlingRoot.add(a)}

const bowlingPins=[];
for(let row=0;row<4;row++)for(let col=0;col<=row;col++){
 const pin=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.12,.19,.58,16),pinWhite);body.position.y=.36;body.castShadow=true;pin.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),pinWhite);head.position.y=.68;head.castShadow=true;pin.add(head);
 const stripe=new THREE.Mesh(new THREE.TorusGeometry(.125,.035,8,16),pinRed);stripe.position.y=.52;stripe.rotation.x=Math.PI/2;pin.add(stripe);
 pin.position.set((col-row/2)*.48,.23,-3.35-row*.48);bowlingRoot.add(pin);
 bowlingPins.push({mesh:pin,baseX:pin.position.x,baseZ:pin.position.z,down:false,fallStart:0,fallDirX:0,fallDirZ:-1});
}
const bowlingBall=new THREE.Mesh(new THREE.SphereGeometry(BOWLING.ballR,24,18),bowlingBallMat);bowlingBall.castShadow=true;bowlingRoot.add(bowlingBall);
const bowlingSeam=new THREE.Mesh(new THREE.TorusGeometry(.342,.012,6,24),mat('#d8f7ff',.35));bowlingSeam.rotation.x=Math.PI/2;bowlingBall.add(bowlingSeam);

/* ---------- Estado ---------- */
let bowlingOrder=[],bowlingTurn=0,bowlingScores=[0,0,0,0,0],bowlingBallState=null,bowlingNextTurnTimer=null;
let bowlingAimValue=0,bowlingPowerValue=70; // posição lateral do jogador e força

function setupBowling(){
 if(bowlingNextTurnTimer){clearInterval(bowlingNextTurnTimer);bowlingNextTurnTimer=null}
 bowlingScores=[0,0,0,0,0];bowlingTurn=0;bowlingOrder=[0,1,2,3,4].sort(()=>Math.random()-.5);bowlingBallState=null;
 resetBowlingPins();bowlingBall.position.set(0,.55,3.7);bowlingBall.visible=true;bowlingRoot.visible=true;
 bowlingAimValue=0;bowlingPowerValue=70;document.getElementById('bowlingPower').value='70';
 updateBowlingControlValues();updateBowlingHud();applyBowlingVisibility();updateBowlingMoveControls();
}
function resetBowlingPins(){
 bowlingPins.forEach(pin=>{
  pin.down=false;pin.fallStart=0;pin.fallDirX=0;pin.fallDirZ=-1;
  pin.mesh.position.set(pin.baseX,.23,pin.baseZ);pin.mesh.rotation.set(0,0,0);pin.mesh.visible=true;
 });
}

/* Tomba cada pino na direção calculada, deitando-o SOBRE a pista (y ~ .38). */
function animateFallenPins(now){
 bowlingPins.forEach(pin=>{
  if(!pin.down||!pin.fallStart)return;
  const u=Math.min(1,(now-pin.fallStart)/900);
  if(u<=0)return; // ainda não foi atingido
  const e=1-Math.pow(1-u,3),bounce=Math.sin(u*Math.PI)*.12;
  pin.mesh.rotation.x=pin.fallDirZ*1.5*e;
  pin.mesh.rotation.z=-pin.fallDirX*1.5*e;
  pin.mesh.position.x=pin.baseX+pin.fallDirX*.45*e;
  pin.mesh.position.z=pin.baseZ+pin.fallDirZ*.30*e;
  pin.mesh.position.y=.23+.15*e+bounce;
 });
}

/* ---------- Visibilidade e controles ---------- */
function applyBowlingVisibility(){
 const mc=document.getElementById('bowlingMoveControls');if(mc&&gameMode!=='bowling')mc.classList.remove('show');
 const active=bowlingTurn<bowlingOrder.length?bowlingOrder[bowlingTurn]:-1;
 players.forEach((p,i)=>{p.root.visible=gameMode==='bowling'?(i===active):true});
 document.querySelectorAll('[id^="tag"]').forEach(tag=>tag.style.display=gameMode==='bowling'?'none':'');
 const controls=document.getElementById('bowlingControls');
 if(controls)controls.classList.toggle('show',gameMode==='bowling'&&running&&active===humanIndex&&!bowlingBallState);
}
function updateBowlingControlValues(){
 const p=document.getElementById('bowlingPowerValue');if(p)p.textContent=bowlingPowerValue+'%';
 const tp=document.getElementById('touchPower'),tv=document.getElementById('touchPowerValue');
 if(tp)tp.value=bowlingPowerValue;if(tv)tv.textContent=bowlingPowerValue+'%';
}
document.getElementById('bowlingPower').addEventListener('input',e=>{bowlingPowerValue=Number(e.target.value);updateBowlingControlValues()});

function updateBowlingHud(){
 updateBowlingTopScore();
 const el=document.getElementById('bowlingHud');if(!el)return;
 if(gameMode!=='bowling'){el.classList.remove('show');return}
 el.classList.add('show');
 if(bowlingTurn>=bowlingOrder.length){el.innerHTML='🎳 Rodada concluída! '+players.map((p,i)=>p.name+': '+bowlingScores[i]+'/10').join(' • ');return}
 const cur=bowlingOrder[bowlingTurn];
 el.innerHTML='🎳 Jogada '+(bowlingTurn+1)+' de 5 — vez de <strong>'+players[cur].name+'</strong> · Pinos derrubados: '+bowlingScores[cur]+'/10'+(cur===humanIndex?' · Mira: '+(bowlingAimValue<-.1?'ESQUERDA':bowlingAimValue>.1?'DIREITA':'CENTRO'):'');
}
function updateBowlingMoveControls(){
 const el=document.getElementById('bowlingMoveControls');
 if(el)el.classList.toggle('show',gameMode==='bowling'&&running&&bowlingTurn<bowlingOrder.length&&bowlingOrder[bowlingTurn]===humanIndex&&!bowlingBallState);
}
let bowlingAimLabel='';
/* Move o jogador lateralmente por `delta` (usado pelas setas e pelo analógico). */
function nudgeBowlerAim(delta){
 if(!running||gameMode!=='bowling'||bowlingTurn>=bowlingOrder.length||bowlingOrder[bowlingTurn]!==humanIndex||bowlingBallState)return;
 bowlingAimValue=Math.max(-BOWLING.maxLineX,Math.min(BOWLING.maxLineX,bowlingAimValue+delta));
 players[humanIndex].root.position.x=bowlingAimValue;
 bowlingBall.position.x=bowlingAimValue+BOWLING.ballOffset;
 const label=bowlingAimValue<-.1?'E':bowlingAimValue>.1?'D':'C';
 if(label!==bowlingAimLabel){bowlingAimLabel=label;updateBowlingHud()}
 if(net.role==='client')netSendInput({k:'aim',v:r2(bowlingAimValue)});
}
function moveBowlerAim(direction){nudgeBowlerAim(direction*.28)}
document.getElementById('bowlingLeft').addEventListener('click',()=>moveBowlerAim(-1));
document.getElementById('bowlingCenter').addEventListener('click',()=>moveBowlerAim(-bowlingAimValue/.28));
document.getElementById('bowlingRight').addEventListener('click',()=>moveBowlerAim(1));

/* ---------- Turnos ---------- */
function startBowlingTurn(){
 if(!running||gameMode!=='bowling'||bowlingTurn>=bowlingOrder.length)return;
 const idx=bowlingOrder[bowlingTurn];
 resetBowlingPins();
 // CORREÇÃO: o humano sempre começa no centro (antes herdava a posição antiga e a mira
 // ficava dessincronizada). Bots começam em posições variadas para acertar também as laterais.
 bowlingAimValue=0;bowlingPowerValue=70;document.getElementById('bowlingPower').value='70';
 players.forEach((p,i)=>{
  if(i!==idx)return;
  p.root.position.set(isHumanSlot(i)?0:(Math.random()-.5)*1.8,0,BOWLING.startZ+.05);
  p.root.rotation.set(0,Math.PI,0);p.rig.rotation.set(0,0,0);p.rig.position.y=0;
  p.arms.forEach((a,j)=>{a.rotation.x=-.78;a.rotation.z=(j===0?-.24:.24)});
  p.legs.forEach(leg=>{leg.rotation.x=0});
 });
 bowlingBall.position.set(players[idx].root.position.x+BOWLING.ballOffset,1.02,BOWLING.startZ);bowlingBall.rotation.set(0,0,0);bowlingBall.visible=true;
 updateBowlingControlValues();updateBowlingHud();applyBowlingVisibility();
 if(idx===humanIndex)showBowlingArrowHint();else{const h=document.getElementById('bowlingArrowHint');if(h){h.classList.remove('show');h.style.display='none'}}
 document.getElementById('tap').disabled=(idx!==humanIndex)||!!bowlingBallState;
 document.getElementById('tap').textContent=idx===humanIndex?'🎳 LANÇAR BOLA!':'🎳 BOT JOGANDO...';
 if(idx!==humanIndex){
  document.getElementById('bowlingControls').classList.remove('show');
  if(!isHumanSlot(idx))botTimers.push(setTimeout(()=>throwBowlingBall(idx),850+Math.random()*850));
  else document.getElementById('status').textContent='Vez de '+players[idx].name+'…';
 }else{
  document.getElementById('status').textContent='Sua vez! Mova-se com as setas, escolha a força e lance a bola.';
  document.getElementById('bowlingControls').classList.add('show');
 }
}

/* ---------- Trajetória e colisão ---------- */
function bowlingPathAt(lineX,u){
 return {
  x:lineX*(1-BOWLING.converge*u)+BOWLING.ballOffset*Math.max(0,1-u*4),
  z:BOWLING.startZ+(BOWLING.endZ-BOWLING.startZ)*u
 };
}
/* Calcula TODOS os pinos derrubados no momento do lançamento e agenda a queda de cada um
   (fallStart) para coincidir com a chegada da bola. Retorna a quantidade de pinos. */
function calculateBowlingShot(lineX,power,start,duration){
 const contact=BOWLING.ballR+BOWLING.pinR+.04,chance=BOWLING.chainBase+power*BOWLING.chainPower;
 const hits=new Map(),queue=[];
 // 1) pinos tocados diretamente pela bola (qualquer ponto da pista, inclusive cantos)
 bowlingPins.forEach(pin=>{
  let best=Infinity,hitU=1;
  for(let i=0;i<=240;i++){const u=i/240,p=bowlingPathAt(lineX,u),d=Math.hypot(pin.baseX-p.x,pin.baseZ-p.z);if(d<best){best=d;hitU=u}}
  if(best>contact)return;
  const p=bowlingPathAt(lineX,hitU),dx=(pin.baseX-p.x)*1.8,len=Math.hypot(dx,1);
  hits.set(pin,{time:start+hitU*duration,dirX:dx/len,dirZ:-1/len});queue.push(pin);
 });
 // 2) reação em cadeia: pino que cai pode derrubar vizinhos (probabilidade depende da força)
 while(queue.length){
  const from=queue.shift(),info=hits.get(from);
  bowlingPins.forEach(other=>{
   if(hits.has(other))return;
   const dx=other.baseX-from.baseX,dz=other.baseZ-from.baseZ;
   if(Math.hypot(dx,dz)>BOWLING.chainRadius||Math.random()>chance)return;
   const len=Math.hypot(dx,dz-.5);
   hits.set(other,{time:info.time+80+Math.random()*70,dirX:dx/len,dirZ:(dz-.5)/len});queue.push(other);
  });
 }
 hits.forEach((info,pin)=>{pin.down=true;pin.fallStart=info.time;pin.fallDirX=info.dirX;pin.fallDirZ=info.dirZ});
 return hits.size;
}
function throwBowlingBall(playerIndex,opts){
 if(!running||gameMode!=='bowling'||bowlingBallState||bowlingTurn>=bowlingOrder.length||bowlingOrder[bowlingTurn]!==playerIndex)return;
 const lineX=players[playerIndex].root.position.x;
 const power=playerIndex===humanIndex?bowlingPowerValue/100:(opts&&opts.power!=null?opts.power:(.5+Math.random()*.5));
 const duration=1550+(1-power)*450,start=performance.now();
 const knocked=calculateBowlingShot(lineX,power,start,duration);
 bowlingBall.position.set(lineX+BOWLING.ballOffset,1.02,BOWLING.startZ);bowlingBall.rotation.set(0,0,0);
 bowlingBallState={playerIndex,start,duration,lineX,power,knocked};
 document.getElementById('tap').disabled=true;document.getElementById('bowlingControls').classList.remove('show');updateBowlingMoveControls();
 document.getElementById('status').textContent=players[playerIndex].name+' lançou a bola!';
 if(audioEnabled)sfxClick();
}
function resolveBowlingThrow(now){
 if(!bowlingBallState)return;
 const st=bowlingBallState,u=Math.min(1,(now-st.start)/st.duration),pt=bowlingPathAt(st.lineX,u);
 bowlingBall.position.set(pt.x,.56+(1-Math.min(1,u*6))*.46,pt.z);
 bowlingBall.rotation.x-=.22+st.power*.08;
 if(u<1)return;

 const knocked=st.knocked,who=players[st.playerIndex].name;
 bowlingScores[st.playerIndex]=knocked;bowlingBallState=null;bowlingTurn++;updateBowlingHud();
 document.getElementById('tap').disabled=true;document.getElementById('bowlingControls').classList.remove('show');
 const msg=(knocked===10?'🎳 STRIKE! ':'🎳 ')+who+' derrubou '+knocked+' pinos!';
 if(bowlingTurn>=bowlingOrder.length){
  running=false;ended=true;clearBots();updateBowlingMoveControls();
  document.getElementById('status').textContent=msg;
  const max=Math.max(...bowlingScores);
  const winners=max>0?bowlingScores.map((v,i)=>v===max?i:-1).filter(i=>i>=0):[]; // ninguém derrubou = ninguém pontua
  // placar e pontos só entram depois do atraso (cancelado se a partida for reiniciada)
  scheduleScoreOverlay(()=>{
   winners.forEach(i=>tournamentScores[i]+=3);roundsPlayed++;
   players.forEach(p=>p.root.visible=false);showBowlingScoreScreen(winners,max);netSendOverlay();
  });
 }else{
  updateBowlingMoveControls();
  let countdown=3;
  const tick=()=>{
   document.getElementById('status').textContent=msg+' Próximo jogador em '+countdown+'s…';
   if(countdown<=0){clearInterval(bowlingNextTurnTimer);bowlingNextTurnTimer=null;startBowlingTurn();return}
   countdown--;
  };
  tick();bowlingNextTurnTimer=setInterval(tick,1000);
 }
}

/* ---------- Placar do boliche ---------- */
function showBowlingScoreScreen(winners,max){
 const order=players.map((p,i)=>({name:p.name,index:i,score:tournamentScores[i],pins:bowlingScores[i]})).sort((a,b)=>b.pins-a.pins||b.score-a.score);
 document.getElementById('scoreOverlayTitle').textContent='🎳 Fim do boliche!';
 document.getElementById('scoreOverlayLead').textContent=winners.length?('Mais pinos: '+winners.map(i=>players[i].name).join(', ')+' ('+max+'/10). Cada vencedor ganha 3 pontos.'):'Ninguém derrubou pinos desta vez. Ninguém pontua!';
 document.getElementById('scoreOverlayContent').innerHTML=`<div class="points-panel"><h3>🏆 Placar do campeonato</h3><div class="points-subtitle">Boliche na Ladeira • Rodada ${roundsPlayed} • Vitória vale 3 pontos</div><table class="points-table"><thead><tr><th>#</th><th>Personagem</th><th>Pinos</th><th>Pontos</th></tr></thead><tbody>${order.map((p,pos)=>`<tr data-slot="${p.index}" class="${pos===0?'current-leader':''}"><td>${pos===0?'🥇':pos===1?'🥈':pos===2?'🥉':pos+1}</td><td>${p.name}${p.index===humanIndex?' <strong class="you" style="color:#8af0b3">(VOCÊ)</strong>':''}${winners.includes(p.index)?' 🏆 +3':''}</td><td>${p.pins}/10</td><td>${p.score}</td></tr>`).join('')}</tbody></table><div class="points-actions"><button id="playNextRound">🎲 SORTEAR E INICIAR PRÓXIMO MINIGAME →</button><button id="resetTournament" class="secondary">↻ Zerar campeonato</button></div></div>`;
 document.getElementById('scoreOverlay').classList.add('show');
 wireScoreboardActions();
}
console.info('[boliche] módulo v2 carregado (trajetória reta + colisão por pino)');

/* ---- Jogadores online (o anfitrião aplica os comandos dos convidados) ---- */
function remoteBowlAim(slot,v){
 if(!running||gameMode!=='bowling'||bowlingBallState||bowlingOrder[bowlingTurn]!==slot)return;
 const x=Math.max(-BOWLING.maxLineX,Math.min(BOWLING.maxLineX,Number(v)||0));
 players[slot].root.position.x=x;bowlingBall.position.x=x+BOWLING.ballOffset;
}
function remoteBowlThrow(slot,aim,pow){
 remoteBowlAim(slot,aim);
 throwBowlingBall(slot,{power:Math.max(.35,Math.min(1,(Number(pow)||70)/100))});
}
