/* Núcleo do jogo: estado global, modos, reset/start, entrada e loop de animação.
   Carregado por último. */
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;applyCameraPose();camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);resize();

let running=false,ended=false,botTimers=[],lastTime=performance.now(),celebrateStart=0;
function clearBots(){botTimers.forEach(clearTimeout);botTimers=[]}

function updateHud(){
 players.forEach((p,i)=>{const b=balls[i];document.querySelector(`#tag${i} b`).textContent=gameMode==='ball'?(b.alive?'NA ARENA':(b.falling?'CAINDO!':'FORA!')):`${p.count} / 100`});
 document.getElementById('tap').textContent=gameMode==='ball'?'🎯 EMPURRÃO!':gameMode==='bowling'?'🎳 LANÇAR BOLA!':'👆 CLICAR!';
}
function applyMode(){
 gameMode=document.getElementById('gameMode').value;
 const ballMode=gameMode==='ball',bowlingMode=gameMode==='bowling';
 document.getElementById('tap').disabled=!running;
 document.getElementById('tap').textContent=ballMode?'🎯 EMPURRÃO!':bowlingMode?'🎳 JOGAR BOLA!':'👆 CLICAR!';
 document.querySelector('main > p').textContent=ballMode?'Fique em cima da sua bola e derrube os 5 rivais da arena! Último personagem em pé vence. Use WASD ou as setas para se mover.':bowlingMode?'Cada personagem tem um lançamento pela ladeira. Derrube o máximo de pinos; quem derrubar mais vence!':'Chegue a 100 cliques! Quem terminar primeiro joga creme no pão. Quem terminar por último... vai ter que dar a mordida final! 😂';
 document.getElementById('gameNote').textContent=ballMode?'Controles: WASD ou setas para mover; botão EMPURRÃO para dar uma arrancada. Bots tentam empurrar você para fora da arena.':bowlingMode?'Boliche: use as setas (ou os botões) para se posicionar, escolha a força e lance. Acertar nos cantos também derruba pinos.':'Corrida: chegue a 100 cliques. É necessária conexão à internet para carregar a biblioteca 3D.';
 breadRoot.visible=!ballMode&&!bowlingMode;arenaRing.visible=ballMode;bowlingRoot.visible=bowlingMode;balls.forEach(b=>b.mesh.visible=ballMode);
 if(bowlingMode){updateBowlingHud();applyBowlingVisibility()}
 else{document.getElementById('bowlingTopScore').classList.remove('show');document.getElementById('bowlingHud').classList.remove('show');document.getElementById('bowlingControls').classList.remove('show');players.forEach(p=>{p.root.visible=true});document.querySelectorAll('[id^="tag"]').forEach(tag=>tag.style.display='')}
 document.getElementById('touchControls').dataset.mode=gameMode;
 applyCameraPose();
 updateHud();
}
document.getElementById('gameMode').addEventListener('change',()=>{reset();applyMode()});

function reset(){
 running=false;ended=false;cancelScoreOverlay();stopLastPlayerTimer();clearBots();
 projectiles.forEach(o=>scene.remove(o.mesh));projectiles.length=0;
 balls.forEach((b,i)=>{b.vx=0;b.vz=0;b.alive=true;b.stun=0;b.falling=false;b.fallAt=0;b.fallVx=0;b.fallVz=0;b.mesh.rotation.set(0,0,0);b.mesh.position.set(Math.cos(players[i].angle)*4.2*ARENA_SCALE,.72,Math.sin(players[i].angle)*3.6*ARENA_SCALE);b.mesh.visible=gameMode==='ball'});
 players.forEach(p=>{p.count=0;p.finished=false;p.biting=false;p.throwAt=0;p.root.position.set(Math.cos(p.angle)*(gameMode==='ball'?4.2*ARENA_SCALE:5.2),gameMode==='ball'?.72:0,Math.sin(p.angle)*(gameMode==='ball'?3.6*ARENA_SCALE:4.5));p.root.rotation.set(0,Math.atan2(-p.root.position.x,-p.root.position.z),0);p.root.visible=true;p.rig.position.set(0,0,0);p.rig.rotation.set(0,0,0);p.rig.scale.set(1,1,1);p.legs.forEach(l=>l.rotation.set(0,0,0));p.arms.forEach(a=>a.rotation.set(0,0,0))});
 [...breadRoot.children].slice(5).forEach(c=>breadRoot.remove(c)); // remove cremes
 breadRoot.scale.set(1,1,1);breadRoot.rotation.set(0,0,0);
 document.getElementById('status').textContent=gameMode==='ball'?'Prepare-se! Derrube os rivais da arena!':'Prepare-se para a batalha pelo pão!';
 if(gameMode==='bowling')setupBowling();
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
 else players.filter((p,i)=>!isHumanSlot(i)).forEach((p,i)=>botTimers.push(setTimeout(()=>botTick(p),p.delay+i*45)));
}

/* Botão principal (CLICAR / EMPURRÃO / LANÇAR) */
document.getElementById('tap').addEventListener('click',()=>{
 if(!running)return;
 if(net.role==='client'){sfxClick();netSendInput({k:'tap',aim:r2(bowlingAimValue),pow:bowlingPowerValue});return}
 if(gameMode==='bowling'){throwBowlingBall(humanIndex);return}
 if(gameMode==='ball'){ballPush(humanIndex);sfxClick();return}
 if(players[humanIndex].count>=100)return;
 players[humanIndex].count++;sfxClick();updateHud();
 if(players[humanIndex].count>=100)finish(players[humanIndex]);
});
document.getElementById('start').addEventListener('click',start);
document.getElementById('reset').addEventListener('click',reset);
document.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&running){e.preventDefault();document.getElementById('tap').click()}});

/* Loop de animação */
function animate(now){
 requestAnimationFrame(animate);
 const t=now*.001,dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;
 if(gameMode==='bowling'&&running&&net.role!=='client')resolveBowlingThrow(now);
 if(gameMode==='bowling')animateFallenPins(now);

 players.forEach((p,i)=>{
  const moving=running&&!p.finished&&gameMode!=='bowling';
  const idleBob=Math.sin(t*2.1+p.phase)*.035;
  const gait=t*11.5+p.phase;
  p.rig.position.y=moving?Math.abs(Math.sin(gait))*.12+Math.sin(gait*2)*.018:idleBob;
  p.rig.rotation.z=moving?Math.sin(gait)*.055:Math.sin(t*1.4+p.phase)*.018;
  p.rig.rotation.x=moving?-.045+Math.abs(Math.sin(gait))*.035:Math.sin(t*1.1+p.phase)*.012;
  p.rig.scale.y=moving?1-Math.max(0,Math.sin(gait*2))*.035:1+Math.sin(t*2+p.phase)*.008;
  if(moving){
   p.arms.forEach((a,j)=>{const swing=Math.sin(gait+j*Math.PI);a.rotation.x=-.12+swing*.72;a.rotation.z=(j===0?-.22:.22)+swing*.08});
   p.legs.forEach((leg,j)=>{leg.rotation.x=Math.sin(gait+j*Math.PI)*.65});
   p.root.position.x=Math.cos(p.angle)*5.2+Math.sin(gait*.5+p.phase)*.035;
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
    if(audioEnabled&&Math.floor(elapsed*4)!==Math.floor((elapsed-dt)*4))sfxBite();
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
 updateTouchControls(dt);
 updateSelfMarker(t);
 if(net.role==='client')netClientFrame(dt,now);else netHostFrame(now);
 breadRoot.rotation.y=Math.sin(t*.9)*.08;
 renderer.render(scene,camera);
}

reset();applyMode();requestAnimationFrame(animate);
