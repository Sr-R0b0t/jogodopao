/* Núcleo do jogo: estado global, modos, reset/start, entrada e loop de animação.
   Carregado por último. */
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;applyCameraPose();camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);resize();

let running=false,ended=false,botTimers=[],lastTime=performance.now(),celebrateStart=0;
function clearBots(){botTimers.forEach(clearTimeout);botTimers=[]}

function updateHud(){
 players.forEach((p,i)=>{const b=balls[i];document.getElementById('tag'+i).classList.toggle('me',i===humanIndex);document.querySelector(`#tag${i} b`).textContent=gameMode==='ball'?(b.alive?'NA ARENA':(b.falling?'CAINDO!':'FORA!')):isShipMode()?'❤ '+p.count:gameMode==='bowling'?'🎳 '+(bowlingScores[i]||0):gameMode==='dodge'?(p.count>0?'EM JOGO':'QUEIMADO'):gameMode==='lava'?(p.count>0?'VIVO':'QUEIMADO'):gameMode==='bridge'?'👣 '+Math.min(BRIDGE.goal,bridgeDistOf(i))+' / '+BRIDGE.goal:`${p.count} / 100`});
 document.getElementById('tap').textContent=gameMode==='ball'?'🎯 EMPURRÃO!':gameMode==='bowling'?'🎳 LANÇAR BOLA!':'👆 CLICAR!';
}
function applyMode(){
 gameMode=document.getElementById('gameMode').value;
 const dodgeMode=gameMode==='dodge',ballMode=gameMode==='ball',bowlingMode=gameMode==='bowling',soccerMode=gameMode==='soccer',lavaMode=gameMode==='lava',bridgeMode=gameMode==='bridge',shipMode=isShipMode();
 document.getElementById('tap').disabled=!running;
 document.getElementById('tap').style.display=ballMode||soccerMode||bridgeMode||(shipMode&&!isTurbo())?'none':'';
 document.getElementById('tap').textContent=dodgeMode?'🏐 ARREMESSAR!':document.getElementById('tap').textContent;
 document.getElementById('tap').textContent=ballMode?'🎯 EMPURRÃO!':bowlingMode?'🎳 JOGAR BOLA!':lavaMode?'🦘 PULAR!':'👆 CLICAR!';
 document.querySelector('main > p').textContent=ballMode?'Fique em cima da sua bola e derrube todos os rivais da arena! Último personagem em pé vence. Pegue velocidade e bata nos rivais!':bowlingMode?'Cada personagem tem um lançamento pela ladeira. Derrube o máximo de pinos; quem derrubar mais vence!':'Chegue a 100 cliques! Quem terminar primeiro joga creme no pão. Quem terminar por último... vai ter que dar a mordida final! 😂';
 document.getElementById('gameNote').textContent=ballMode?'Controles: WASD, setas ou o analógico. Quanto mais distância você pega, mais rápido fica — e mais forte é a batida!':bowlingMode?'Boliche: use as setas (ou os botões) para se posicionar, escolha a força e lance. Acertar nos cantos também derruba pinos.':'Corrida: chegue a 100 cliques. É necessária conexão à internet para carregar a biblioteca 3D.';
 dodgeRoot.visible=dodgeMode;lavaRoot.visible=lavaMode;bridgeRoot.visible=bridgeMode;breadRoot.visible=!ballMode&&!bowlingMode&&!soccerMode&&!shipMode&&!dodgeMode&&!lavaMode&&!bridgeMode;soccerRoot.visible=soccerMode;shipRoot.visible=shipMode;
 floor.visible=rimMesh.visible=inner.visible=!shipMode&&!dodgeMode&&!lavaMode&&!bridgeMode;arenaDots.forEach(d=>d.visible=!shipMode&&!dodgeMode&&!lavaMode&&!bridgeMode);arenaRing.visible=ballMode;bowlingRoot.visible=bowlingMode;balls.forEach((b,i)=>b.mesh.visible=ballMode&&isActive(i));
 if(bowlingMode){updateBowlingHud();applyBowlingVisibility()}
 else{document.querySelectorAll('.tag.turn').forEach(x=>x.classList.remove('turn'));document.getElementById('bowlingTopScore').classList.remove('show');document.getElementById('bowlingHud').classList.remove('show');document.getElementById('bowlingControls').classList.remove('show');players.forEach(p=>{p.root.visible=p.active!==false});refreshTags()}
 if(shipMode){
  document.querySelector('main > p').textContent='Pilote a nave e defenda o seu gol das bolas metálicas! Cada gol sofrido tira 1 vida; quem zera sai e o gol vira barreira.';
  document.getElementById('gameNote').textContent='Controles: WASD, setas ou o analógico. Bata nas bolas para mandá-las no gol dos rivais. Vence o último na arena.';
  if(isTurbo()){document.querySelector('main > p').textContent='Arena Turbo: sua nave desliza só pelo seu lado. Defenda o gol das bolas que saem das cápsulas dos cantos!';document.getElementById('gameNote').textContent='Controles: setas/WASD ou o analógico (esquerda-direita nas naves de baixo e de cima; cima-baixo nas dos lados). Os pads verdes aceleram a bola. Vence o último na arena.'}
 }
 if(bridgeMode){
  document.querySelector('main > p').textContent='Ponte de Pedras: escolha um caminho (⬅ ⬆ ⬇ ➡). Quem escolher sozinho avança; escolha repetida = ninguém avança!';
  document.getElementById('gameNote').textContent='Controles: setas/WASD (ou botões) escolhem o caminho. Chegue primeiro ao outro lado da lava.';
 }
 if(lavaMode){
  document.querySelector('main > p').textContent='Arena de Lava: pule o facho de fogo e fuja dos punhos de magma. O último vivo vence!';
  document.getElementById('gameNote').textContent='Controles: WASD/setas ou analógico para andar; Espaço/Enter (ou botão) para pular. O facho acelera com o tempo; os círculos vermelhos mostram onde o punho vai cair.';
 }
 if(dodgeMode){
  document.querySelector('main > p').textContent='Queimada: dois times, uma linha no meio. Pegue uma bola do seu lado e acerte os rivais — quem é acertado sai!';
  document.getElementById('gameNote').textContent='Controles: WASD/setas ou analógico para andar; Espaço/Enter (ou botão) arremessa. Não dá para cruzar a linha: acerte de longe e desvie das bolas deles!';
 }
 if(soccerMode){
  applySoccerVisibility();
  document.querySelector('main > p').textContent='Um jogador é sorteado goleiro e os outros batem pênaltis, um de cada vez. Escolha esquerda, meio ou direita!';
  document.getElementById('gameNote').textContent='O goleiro vence com mais defesas do que gols sofridos (ou com 3 defesas) e leva os pontos sozinho (mais pontos a cada defesa). Se os batedores vencerem, o time todo pontua.';
 }
 document.getElementById('touchControls').dataset.mode=gameMode;
 applyCameraPose();
 updateHud();
}
document.getElementById('gameMode').addEventListener('change',()=>{reset();applyMode()});

function reset(){
 if(typeof hudClearTeams==='function')hudClearTeams();stopDrawAnim();if(typeof podiumActive!=='undefined'&&podiumActive&&gameMode!=='podium')hidePodium();running=false;ended=false;cancelScoreOverlay();stopLastPlayerTimer();clearBots();
 projectiles.forEach(o=>scene.remove(o.mesh));projectiles.length=0;
 balls.forEach((b,i)=>{b.vx=0;b.vz=0;b.alive=isActive(i);b.stun=0;b.falling=false;b.fallAt=0;b.fallVx=0;b.fallVz=0;b.mesh.rotation.set(0,0,0);b.mesh.position.set(Math.cos(players[i].angle)*4.2*ARENA_SCALE,.72,Math.sin(players[i].angle)*3.6*ARENA_SCALE);b.mesh.visible=gameMode==='ball'&&isActive(i)});
 players.forEach(p=>{p.count=0;p.finished=false;p.biting=false;p.throwAt=0;p.root.position.set(Math.cos(p.angle)*(gameMode==='ball'?4.2*ARENA_SCALE:5.2),gameMode==='ball'?.72:0,Math.sin(p.angle)*(gameMode==='ball'?3.6*ARENA_SCALE:4.5));p.root.rotation.set(0,Math.atan2(-p.root.position.x,-p.root.position.z),0);p.root.visible=p.active!==false;p.root.scale.set(1,1,1);p.rig.position.set(0,0,0);p.rig.rotation.set(0,0,0);p.rig.scale.set(1,1,1);p.legs.forEach(l=>l.rotation.set(0,0,0));p.arms.forEach(a=>a.rotation.set(0,0,0))});
 [...breadRoot.children].slice(5).forEach(c=>breadRoot.remove(c)); // remove cremes
 breadRoot.scale.set(1,1,1);breadRoot.rotation.set(0,0,0);
 document.getElementById('status').textContent=gameMode==='ball'?'Prepare-se! Derrube os rivais da arena!':'Prepare-se para a batalha pelo pão!';
 if(gameMode==='bowling')setupBowling();
 if(gameMode==='soccer')setupSoccer();
 if(isShipMode())setupShip();
 if(gameMode==='dodge')setupDodge();
 if(gameMode==='lava')lavaSetup();
 if(gameMode==='bridge')setupBridge();
 document.getElementById('result').className='';document.getElementById('result').textContent='';
 document.getElementById('start').disabled=false;document.getElementById('tap').disabled=true;
 document.getElementById('characterChoice').disabled=tournamentCharacterLocked;document.getElementById('gameMode').disabled=false;
 applyMode();updateHud();
}
function start(){
 reset();tournamentCharacterLocked=true;running=true;
 startMusic();if(audioEnabled){tone(440,.1,'triangle',.08);tone(554,.1,'triangle',.08,.12);tone(659,.2,'triangle',.1,.24)}
 document.getElementById('start').disabled=true;document.getElementById('tap').disabled=false;
 netBroadcast({k:'start',mode:gameMode});
 document.getElementById('characterChoice').disabled=true;document.getElementById('gameMode').disabled=true;
 document.getElementById('status').textContent='VALENDO! Clique sem parar!';
 if(gameMode==='bowling'){setupBowling();startBowlingTurn()}
 else if(gameMode==='soccer')startSoccer();
 else if(isShipMode())startShip();
 else if(gameMode==='dodge')startDodge();
 else if(gameMode==='lava')startLava();
 else if(gameMode==='bridge')startBridge();
 else players.filter((p,i)=>!isHumanSlot(i)&&isActive(i)).forEach((p,i)=>botTimers.push(setTimeout(()=>botTick(p),p.delay+i*45)));
}

/* Botão principal (CLICAR / EMPURRÃO / LANÇAR) */
/* Cada clique/toque conta UMA vez. Segurar Enter/Espaço não vale: ignoramos o auto-repeat do teclado
   (e.repeat) e os "cliques" que o próprio navegador gera no botão focado (detail===0). */
let tapAllowed=false;
function pressTap(){tapAllowed=true;try{document.getElementById('tap').click()}finally{tapAllowed=false}}
document.getElementById('tap').addEventListener('click',e=>{
 if(e&&e.detail===0&&!tapAllowed)return;
 if(!running||humanIndex<0)return; // na TV ninguém clica na tela
 if(isTurbo()){shipBlastPress();return}
 if(gameMode==='dodge'){dodgePress();return}
 if(gameMode==='lava'){lavaPress();return}
 if(gameMode==='bridge')return;
 if(gameMode==='ball')return; // Batalha das Bolas: só direção (sem botão de empurrão)
 if(net.role==='client'){sfxClick();netSendInput({k:'tap',aim:r2(bowlingAimValue),pow:bowlingPowerValue});return}
 if(gameMode==='bowling'){throwBowlingBall(humanIndex);return}
 if(players[humanIndex].count>=100)return;
 players[humanIndex].count++;sfxClick();updateHud();
 if(players[humanIndex].count>=100)finish(players[humanIndex]);
});
document.getElementById('start').addEventListener('click',start);
document.getElementById('reset').addEventListener('click',()=>{ // reinicia o mesmo minigame, com contagem curta
 if(podiumActive){podiumPlayAgain();return}        // reiniciar no pódio = novo campeonato (some o pódio)
 cancelCountdown();reset();
 const info=MINIGAMES.find(m=>m.id===gameMode);runCountdown(3,'↻ '+(info?info.label:''),document.getElementById('roundLabel').textContent,undefined,info&&info.desc);
});
document.addEventListener('keydown',e=>{
 if(!net.tv&&tvBrief&&tvBrief.on){if(/^(Enter|NumpadEnter|Space)$/.test(e.code)&&!/SELECT|INPUT/.test((e.target||{}).tagName||'')){e.preventDefault();if(!e.repeat)tvBriefReady(humanIndex)}return}   // offline: tela "como jogar"
 if(net.tv){if((e.code==='Enter'||e.code==='NumpadEnter')&&!/BUTTON|SELECT|INPUT/.test((e.target||{}).tagName||'')){const p=tvPrimaryAction(true);if(p)e.preventDefault()}return}
 if((e.code==='Space'||e.code==='Enter')&&running&&gameMode==='dodge'){e.preventDefault();if(!e.repeat)dodgePress();return}
 if((e.code==='Space'||e.code==='Enter')&&running&&gameMode==='lava'){e.preventDefault();if(!e.repeat)lavaPress();return}
 if((e.code==='Space'||e.code==='Enter')&&running&&isTurbo()){e.preventDefault();if(!e.repeat)shipBlastPress();return}
 if((e.code==='Space'||e.code==='Enter')&&running&&gameMode!=='ball'&&gameMode!=='soccer'&&gameMode!=='dodge'&&gameMode!=='lava'&&gameMode!=='bridge'&&!isShipMode()){
  e.preventDefault();
  if(e.repeat)return;            // tecla segurada = não conta de novo
  pressTap();
 }
});

/* Trava o scroll da página enquanto o minigame está na tela (evita rolar sem querer ao controlar no celular) */
let pageLocked=false;
function updatePageLock(){
 const scr=document.getElementById('screenMinigames'),ov=document.getElementById('scoreOverlay');
 const lock=!!scr&&scr.style.display!=='none'&&!(ov&&ov.classList.contains('show'));
 if(lock!==pageLocked){pageLocked=lock;document.documentElement.classList.toggle('game-lock',lock);document.body.classList.toggle('game-lock',lock);if(lock)window.scrollTo(0,0)}
}
document.addEventListener('touchmove',e=>{if(pageLocked&&!e.target.closest('#scoreOverlay'))e.preventDefault()},{passive:false});
document.addEventListener('wheel',e=>{if(pageLocked&&!e.target.closest('#scoreOverlay'))e.preventDefault()},{passive:false});
document.addEventListener('keydown',e=>{if(pageLocked&&['ArrowUp','ArrowDown','Space','PageUp','PageDown','Home','End'].includes(e.code)&&!/INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||''))e.preventDefault()});

/* Loop de animação */
function animate(now){
 requestAnimationFrame(animate);updatePageLock();
 const t=now*.001,dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;
 if(gameMode==='bowling'&&running&&net.role!=='client')resolveBowlingThrow(now);
 if(gameMode==='bowling')animateFallenPins(now);

 players.forEach((p,i)=>{
  const moving=running&&!p.finished&&gameMode!=='bowling'&&gameMode!=='soccer'&&gameMode!=='dodge'&&gameMode!=='bridge'&&!isShipMode()&&!(gameMode==='lava'&&p.count<=0);
  const idleBob=Math.sin(t*2.1+p.phase)*.035;
  const gait=t*11.5+p.phase;
  p.rig.position.y=moving?Math.abs(Math.sin(gait))*.12+Math.sin(gait*2)*.018:idleBob;
  p.rig.rotation.z=moving?Math.sin(gait)*.055:Math.sin(t*1.4+p.phase)*.018;
  p.rig.rotation.x=moving?-.045+Math.abs(Math.sin(gait))*.035:Math.sin(t*1.1+p.phase)*.012;
  p.rig.scale.y=moving?1-Math.max(0,Math.sin(gait*2))*.035:1+Math.sin(t*2+p.phase)*.008;
  if(moving){
   p.arms.forEach((a,j)=>{const swing=Math.sin(gait+j*Math.PI);a.rotation.x=-.12+swing*.72;a.rotation.z=(j===0?-.22:.22)+swing*.08});
   p.legs.forEach((leg,j)=>{leg.rotation.x=Math.sin(gait+j*Math.PI)*.65});
   if(gameMode!=='lava')p.root.position.x=Math.cos(p.angle)*5.2+Math.sin(gait*.5+p.phase)*.035;   // (a Arena de Lava tem movimento livre)
  }else if(!p.biting&&!p.finished){
   p.arms.forEach((a,j)=>{if(gameMode==='bowling'&&running&&bowlingOrder[bowlingTurn]===i){a.rotation.x=-.78;a.rotation.z=(j===0?-.24:.24)}else{a.rotation.x=Math.sin(t*1.6+p.phase+j)*.035;a.rotation.z=(j===0?-.05:.05)+Math.sin(t*1.2+p.phase+j)*.02}});
   p.legs.forEach((leg,j)=>{leg.rotation.x=Math.sin(t*1.5+p.phase+j*Math.PI)*.025});
  }
  if(p.finished&&!p.biting){
   const since=(now-p.throwAt)/1000;
   if(since<1.3){p.rig.position.y+=Math.max(0,Math.sin(since*9))*.16;p.arms.forEach((a,j)=>{a.rotation.x=-1.15+Math.sin(t*12+j*Math.PI)*.18;a.rotation.z=(j===0?-.55:.55)})}
  }
  if(p.biting){
   const elapsed=(now-p.biteAt)/1000;
   p.root.position.x+=(0-p.root.position.x)*Math.min(1,dt*2.3);
   p.root.position.z+=(1.55-p.root.position.z)*Math.min(1,dt*2.3);
   const targetYaw=Math.atan2(-p.root.position.x,-p.root.position.z);
   p.root.rotation.y+=(targetYaw-p.root.rotation.y)*Math.min(1,dt*3);
   p.rig.rotation.x=elapsed<.65?-.25*Math.sin(Math.min(1,elapsed/.65)*Math.PI/2):Math.sin(t*8)*.035;
   p.rig.scale.set(1+Math.sin(t*3)*.015,1-Math.max(0,Math.sin(t*3))*.018,1);
   p.arms.forEach((a,j)=>{a.rotation.x=-.55+Math.sin(t*5+j)*.07;a.rotation.z=j===0?-.45:.45});
   if(elapsed>.45&&elapsed<2.3){
    if(audioEnabled&&Math.floor(elapsed*4)!==Math.floor((elapsed-dt)*4))sfxChew();
    const chew=Math.sin(t*13)*.035;
    breadRoot.scale.set(1-Math.max(0,elapsed-.5)*.09,1+chew,1-Math.max(0,elapsed-.5)*.07);
    breadRoot.rotation.z=Math.sin(t*12)*.025;
   }
  }
 });

 for(let i=projectiles.length-1;i>=0;i--){
  const o=projectiles[i],u=Math.min(1,(now-o.begin)/o.duration),eased=u*u*(3-2*u);
  o.mesh.position.copy(o.start).lerp(o.target,eased);
  o.mesh.position.y+=Math.sin(u*Math.PI)*2.15;
  o.mesh.rotation.set(u*5,u*7,u*4);
  o.mesh.scale.setScalar(.7+Math.sin(u*Math.PI)*.6);
  if(u>=1){scene.remove(o.mesh);projectiles.splice(i,1)}
 }

 updateBallMode(now,dt,t);
 updateTouchControls(dt);updateGamepads(now,dt);if(net.tv)tvFrame(now);else if(tvBrief&&tvBrief.on)tvBriefTick(now);
 if(net.role!=='client'){updateSoccerMode(now,dt);updateShipMode(now,dt);updateDodgeMode(now,dt);updateLavaMode(now,dt);updateBridgeMode(now,dt)}
 shipVisualUpdate(dt);dodgeVisualUpdate(dt);lavaVisualUpdate(dt);bridgeVisualUpdate(dt);
 soccerUiUpdate();soccerAudioCue();bridgeUiUpdate();bridgeAudioCue();
 players.forEach((p,i)=>{if(p.glb&&p.root.visible&&isActive(i))animateGlbPlayer(p,i,dt)});   // não anima quem não está em cena (poupa CPU no celular)
 podiumUpdate(t,dt);
 updateSelfMarker(t);updateNameTags();
 if(net.role==='client')netClientFrame(dt,now);else netHostFrame(now);
 breadRoot.rotation.y=Math.sin(t*.9)*.08;
 if(net.tv)tvPerfTick(now);else qualityTick(now);
 if(tvBrief&&tvBrief.on)return   // tela "como jogar" cobre o 3D: não gasta GPU desenhando por baixo
 renderer.render(scene,camera);
}

reset();applyMode();requestAnimationFrame(animate);
