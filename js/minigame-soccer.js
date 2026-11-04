/* Minigame: Pênaltis — um goleiro sorteado contra os batedores (um chute de cada vez).
   Cada chute: batedor e goleiro escolhem ESQUERDA / MEIO / DIREITA ao mesmo tempo. Mesma direção = defesa.
   PONTOS (ajuste aqui): ver SOCCER abaixo. O anfitrião/offline roda a lógica; convidados só escolhem e assistem. */
const SOCCER={
 minShots:5,          // total mínimo de chutes na partida
 pickSec:8,           // tempo para escolher
 kickMs:1100,launch:.45,resultMs:1700,introMs:2000,
 teamWinEach:3,       // batedores venceram (gols >= defesas): cada batedor ganha
 loseEach:1,          // quem perdeu ganha (participação)
 goalieBase:0,goalieEachSave:2  // goleiro ganha 2 pontos por defesa (3 defesas = 6 pontos), vença ou não; no mínimo loseEach
};
const GOAL_Z=-4.5,BALL_Z=1.6,GOALIE_Z=-4.0,KICKER_POS=[-1.5,2.4],KICKER_SCALE=.78,GOALIE_SCALE=.85,DIR_X=[-2.0,0,2.0]; // DIR_X[dir+1]
const DIR_NAME={'-1':'esquerda','0':'meio','1':'direita'};

/* ---------- Cenário ---------- */
const soccerRoot=new THREE.Group();scene.add(soccerRoot);soccerRoot.visible=false;
const grass=new THREE.Mesh(new THREE.CircleGeometry(8.8,64),mat('#3c9a4b'));grass.rotation.x=-Math.PI/2;grass.position.y=.03;grass.receiveShadow=true;soccerRoot.add(grass);
const lineMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85});
function pitchLine(x,z,w,d){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),lineMat);m.rotation.x=-Math.PI/2;m.position.set(x,.045,z);soccerRoot.add(m)}
pitchLine(0,GOAL_Z,10,.08);pitchLine(0,.2,10,.08);pitchLine(-5,(GOAL_Z+.2)/2,.08,Math.abs(GOAL_Z-.2));pitchLine(5,(GOAL_Z+.2)/2,.08,Math.abs(GOAL_Z-.2));
const spot=new THREE.Mesh(new THREE.CircleGeometry(.13,16),lineMat);spot.rotation.x=-Math.PI/2;spot.position.set(0,.05,BALL_Z);soccerRoot.add(spot);
const goalFallback=new THREE.Group();soccerRoot.add(goalFallback);   // gol simples de reserva (some quando gol.glb carrega)
const postMat=mat('#f5f5f5',.35,.2);
for(const x of [-3,3]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,2.4,16),postMat);p.position.set(x,1.2,GOAL_Z);p.castShadow=true;goalFallback.add(p)}
const bar=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,6.18,16),postMat);bar.rotation.z=Math.PI/2;bar.position.set(0,2.4,GOAL_Z);bar.castShadow=true;goalFallback.add(bar);
const net3=new THREE.Mesh(new THREE.BoxGeometry(6,2.4,1.2,18,7,4),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.35}));net3.position.set(0,1.2,GOAL_Z-.6);goalFallback.add(net3);
const soccerBall=new THREE.Group();soccerBall.position.set(0,.3,BALL_Z);soccerRoot.add(soccerBall);
const ballFallback=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.5,flatShading:true}));ballFallback.castShadow=true;soccerBall.add(ballFallback);

/* Modelos 3D (.glb) da bola e do gol; se não carregarem, ficam os modelos simples acima. */
function loadSoccerModel(url,onModel){
 if(typeof GLTFLoader==='undefined')return;
 new GLTFLoader().load(url,g=>{try{onModel(g.scene)}catch(e){console.warn('erro no modelo',url,e)}},undefined,e=>console.warn('modelo não carregou:',url,e));
}
function restyle(model,roughness,doubleSide){
 model.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({map:o.material.map,roughness,metalness:0,side:doubleSide?THREE.DoubleSide:THREE.FrontSide});o.castShadow=true}});
}
loadSoccerModel('models/bola.glb',m=>{m.scale.setScalar(.38);restyle(m,.5,false);soccerBall.add(m);ballFallback.visible=false});   // raio do modelo ~0,95
loadSoccerModel('models/gol.glb',m=>{
 // o modelo mede ~1,9 x 1,07 x 1,54 (abertura para +z); esticamos para um gol de ~5,9 x 2,25 x 2,3
 m.scale.set(3.1,2.1,1.5);m.position.set(0,1.125,GOAL_Z-1.157);restyle(m,.8,true);soccerRoot.add(m);goalFallback.visible=false;
});

/* ---------- Estado ---------- */
let soccer=null,soccerSentShot=-1; // convidados guardam aqui uma cópia do estado enviado pelo anfitrião
const rndDir=()=>Math.floor(Math.random()*3)-1;
function setupSoccer(){soccer=null;soccerSentShot=-1;soccerBall.position.set(0,.3,BALL_Z);soccerBall.rotation.set(0,0,0);applySoccerVisibility()}
function applySoccerVisibility(){
 if(gameMode!=='soccer')return;
 players.forEach((p,i)=>{p.root.visible=!!soccer&&(i===soccer.k||i===soccer.g)});
}
function soccerPlace(){
 const s=soccer,g=players[s.g];g.root.position.set(0,0,GOALIE_Z);g.root.rotation.set(0,0,0);g.root.scale.setScalar(GOALIE_SCALE);
 // o batedor fica ao lado da bola (não na frente da câmera), virado para ela
 if(s.k>=0){const k=players[s.k];k.root.position.set(KICKER_POS[0],0,KICKER_POS[1]);k.root.rotation.set(0,Math.atan2(0-KICKER_POS[0],BALL_Z-KICKER_POS[1]),0);k.root.scale.setScalar(KICKER_SCALE)}
 soccerBall.position.set(0,.3,BALL_Z);soccerBall.rotation.set(0,0,0);
}
const setStatus=t=>{document.getElementById('status').textContent=t};
function startSoccer(){
 const act=activeIndices(),goalie=act[Math.floor(Math.random()*act.length)];
 const kickers=act.filter(i=>i!==goalie).sort(()=>Math.random()-.5);
 const per=Math.max(1,Math.ceil(SOCCER.minShots/Math.max(1,kickers.length))),queue=[];
 for(let r=0;r<per;r++)kickers.forEach(k=>queue.push(k));
 soccer={ph:'intro',g:goalie,k:-1,sh:0,tot:queue.length,goals:0,saves:0,need:[],left:0,queue,kickers,choice:{},botAt:{},t0:performance.now(),res:'',kickDir:0,diveDir:0,goalsBy:{}};
 soccerPlace();applySoccerVisibility();
 setStatus('🧤 '+players[goalie].name+' é o GOLEIRO! Os outros vão chutar, um de cada vez.');
}
function soccerNextShot(now){
 const s=soccer;players[s.g].root.rotation.z=0;
 s.sh++;
 if(s.sh>s.tot){finishSoccer();return}
 s.k=s.queue[s.sh-1];s.ph='pick';s.t0=now;s.choice={};s.res='';
 s.botAt={[s.k]:now+800+Math.random()*1400,[s.g]:now+900+Math.random()*1600};
 soccerPlace();
 setStatus('⚽ Chute '+s.sh+'/'+s.tot+': '+players[s.k].name+' vai chutar contra o goleiro '+players[s.g].name+'!');
}
/* Escolha de direção (dir: -1 esquerda, 0 meio, 1 direita) — batedor ou goleiro. */
function soccerSetChoice(slot,dir){
 const s=soccer;if(!s||s.ph!=='pick'||(slot!==s.k&&slot!==s.g)||s.choice[slot]!==undefined)return;
 dir=Math.max(-1,Math.min(1,Math.round(Number(dir)||0)));s.choice[slot]=dir;
}
function soccerResult(now){
 const s=soccer;s.ph='result';s.t0=now;
 const kn=players[s.k].name,gn=players[s.g].name,how=kn+' chutou na '+DIR_NAME[s.kickDir]+' e '+gn+' foi para '+DIR_NAME[s.diveDir]+'.';
 if(s.res==='save'){s.saves++;setStatus('🧤 DEFENDEU! '+how)}
 else{s.goals++;s.goalsBy[s.k]=(s.goalsBy[s.k]||0)+1;setStatus('⚽ GOOOL! '+how)}
}
function finishSoccer(){
 const s=soccer;s.ph='done';ended=true;running=false;clearBots();
 const goalieWins=s.saves>s.goals||s.saves>=3,gains={},detail={},gn=players[s.g].name;
 activeIndices().forEach(i=>{
  if(i===s.g){gains[i]=Math.max(SOCCER.loseEach,SOCCER.goalieBase+SOCCER.goalieEachSave*s.saves);detail[i]='🧤 Goleiro • '+s.saves+' defesa'+(s.saves===1?'':'s')+' x '+s.goals+' gol'+(s.goals===1?'':'s')+' sofrido'+(s.goals===1?'':'s')}
  else{gains[i]=goalieWins?SOCCER.loseEach:SOCCER.teamWinEach;detail[i]='⚽ Batedor • '+(s.goalsBy[i]||0)+' gol'+((s.goalsBy[i]||0)===1?'':'s')+' • time '+(goalieWins?'perdeu':'venceu')}
 });
 setStatus(goalieWins?'🧤 '+gn+' venceu como goleiro!':'⚽ Os batedores venceram o goleiro '+gn+'!');
 showRoundResults(gains,detail,'Pênaltis',goalieWins?'🧤 O goleiro venceu!':'⚽ Os batedores venceram!',
  gn+' fez '+s.saves+' defesa'+(s.saves===1?'':'s')+' e sofreu '+s.goals+' gol'+(s.goals===1?'':'s')+'.',
  'Batedores: '+SOCCER.teamWinEach+' pts cada se vencerem • Goleiro: '+SOCCER.goalieEachSave+' pts por defesa (3 defesas = 6) • Perdedores: '+SOCCER.loseEach+' pt');
}

/* ---------- Atualização a cada frame (anfitrião/offline) ---------- */
function updateSoccerMode(now,dt){
 if(gameMode!=='soccer'||!running||!soccer)return;
 const s=soccer;
 if(s.ph==='intro'){if(now-s.t0>SOCCER.introMs)soccerNextShot(now)}
 else if(s.ph==='pick'){
  const els=now-s.t0;
  for(const slot of [s.k,s.g]){
   if(s.choice[slot]!==undefined)continue;
   if((!isHumanSlot(slot)&&now>=s.botAt[slot])||els>SOCCER.pickSec*1000)s.choice[slot]=rndDir();
  }
  s.need=[s.k,s.g].filter(x=>isHumanSlot(x)&&s.choice[x]===undefined);
  s.left=Math.max(0,Math.ceil(SOCCER.pickSec-els/1000));
  if(s.choice[s.k]!==undefined&&s.choice[s.g]!==undefined){
   s.ph='kick';s.t0=now;s.need=[];s.kickDir=s.choice[s.k];s.diveDir=s.choice[s.g];s.res=s.kickDir===s.diveDir?'save':'goal';
  }
 }else if(s.ph==='kick'){
  const g=players[s.g],t=Math.min(1,(now-s.t0)/SOCCER.kickMs);
  const d=Math.max(0,Math.min(1,(t-.38)/.45)),e=1-Math.pow(1-d,3);             // mergulho do goleiro
  g.root.position.x=DIR_X[s.diveDir+1]*.95*e;g.root.position.y=Math.sin(d*Math.PI)*(s.diveDir===0?.7:.45);g.root.rotation.z=-s.diveDir*1.15*e;
  if(t>SOCCER.launch){                                                           // bola a caminho do gol
   const u=(t-SOCCER.launch)/(1-SOCCER.launch),tx=DIR_X[s.kickDir+1],ty=s.res==='save'?.9:(s.kickDir===0?.9:1.15),tz=s.res==='save'?GOALIE_Z+.5:GOAL_Z-.35;
   soccerBall.position.set(tx*u,.3+(ty-.3)*u+Math.sin(u*Math.PI)*.3,BALL_Z+(tz-BALL_Z)*u);soccerBall.rotation.x-=dt*14;
  }
  if(t>=1)soccerResult(now);
 }else if(s.ph==='result'){
  const el=now-s.t0;
  if(s.res==='goal')soccerBall.position.y=Math.max(.3,soccerBall.position.y-dt*3);
  else{const u=Math.min(1,el/600);soccerBall.position.z+=dt*2.2*(1-u);soccerBall.position.y=.3+Math.abs(Math.sin(u*Math.PI*2))*.35*(1-u)}
  if(el>SOCCER.resultMs)soccerNextShot(now);
 }
 applySoccerVisibility();
}

/* ---------- Interface (botões de escolha + placar) ---------- */
function soccerChoose(dir){
 const s=soccer;if(!s||s.ph!=='pick'||!s.need||!s.need.includes(humanIndex))return;
 if(net.role==='client'){netSendInput({k:'sc',dir});soccerSentShot=s.sh}else soccerSetChoice(humanIndex,dir);
 if(audioEnabled)sfxClick();
}
function soccerUiUpdate(){
 const panel=document.getElementById('soccerPick'),hud=document.getElementById('soccerHud');if(!panel||!hud)return;
 const on=gameMode==='soccer'&&!!soccer;
 hud.classList.toggle('show',on);
 if(on)hud.textContent='⚽ Chute '+Math.min(soccer.sh,soccer.tot)+'/'+soccer.tot+' • Gols '+soccer.goals+' • 🧤 Defesas '+soccer.saves+' • Goleiro: '+players[soccer.g].name;
 const mine=on&&soccer.ph==='pick'&&!!soccer.need&&soccer.need.includes(humanIndex)&&soccerSentShot!==soccer.sh;
 panel.classList.toggle('show',mine);
 if(mine)document.getElementById('soccerPickTitle').textContent=(humanIndex===soccer.k?'⚽ Onde você vai CHUTAR?':'🧤 Onde você vai DEFENDER?')+'  ('+soccer.left+'s)';
}
document.querySelectorAll('#soccerPick button').forEach(b=>b.addEventListener('click',()=>soccerChoose(Number(b.dataset.dir))));
window.addEventListener('keydown',e=>{
 if(gameMode!=='soccer')return;
 const m={ArrowLeft:-1,KeyA:-1,ArrowUp:0,KeyW:0,ArrowDown:0,KeyS:0,ArrowRight:1,KeyD:1}[e.code];
 if(m===undefined)return;e.preventDefault();soccerChoose(m);
});

/* ---- Sons do jogo (tocam para todos: anfitrião e convidados) ----
   apito = hora de escolher/chutar • chute = no instante em que a bola sai • gol/defesa = no resultado */
let soccerCueKey='';
function soccerAudioCue(){
 if(gameMode!=='soccer'||!soccer){soccerCueKey='';return}
 const key=soccer.sh+':'+soccer.ph;if(key===soccerCueKey)return;soccerCueKey=key;
 if(soccer.ph==='pick')sfxWhistle();
 else if(soccer.ph==='kick')setTimeout(sfxKick,SOCCER.kickMs*SOCCER.launch);
 else if(soccer.ph==='result'){if(soccer.res==='save')sfxCream();else sfxFinish()}
}
