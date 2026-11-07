/* Pódio final: depois que todos os minigames do ciclo foram jogados, mostra 1º, 2º e 3º lugar em cima de um pódio 3D,
   com o troféu, os personagens comemorando e confetes. O anfitrião manda 'podium' para os convidados verem a mesma cena. */
let podiumActive=false,podiumT0=0,podiumTrophy=null,podiumLabels=[],podiumState={order:[],scores:[],remote:false};
const podiumRoot=new THREE.Group();podiumRoot.visible=false;scene.add(podiumRoot);
const PODIUM_SLOTS=[ // x do bloco, largura, altura, cor, número
 {x:0,w:3.6,h:1.8,color:'#f2c230',txt:'1'},
 {x:-3.2,w:2.6,h:1.2,color:'#cfd6de',txt:'2'},
 {x:3.2,w:2.6,h:.8,color:'#cd8240',txt:'3'}
];
const PODIUM_BASE=-.1;                               // altura em que os blocos começam (topo do chão do palco)
function podiumPlateTexture(txt){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 g.font='900 104px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
 g.lineWidth=9;g.strokeStyle='rgba(60,30,0,.45)';g.strokeText(txt,64,70);g.fillStyle='#fff';g.fillText(txt,64,70);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
PODIUM_SLOTS.forEach(s=>{
 const block=new THREE.Mesh(new THREE.BoxGeometry(s.w,s.h,2.2),mat(s.color,.35,.45));
 block.position.set(s.x,PODIUM_BASE+s.h/2,0);block.castShadow=true;block.receiveShadow=true;podiumRoot.add(block);
 const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:podiumPlateTexture(s.txt),transparent:true,toneMapped:false}));
 plate.position.set(s.x,PODIUM_BASE+s.h*.5,1.11);podiumRoot.add(plate);
 const trim=new THREE.Mesh(new THREE.BoxGeometry(s.w+.12,.08,2.32),mat('#ffffff',.3,.6));trim.position.set(s.x,PODIUM_BASE+s.h+.02,0);podiumRoot.add(trim);
 s.top=PODIUM_BASE+s.h+.06;
});
const podiumSpot=new THREE.SpotLight(0xfff0c0,60,30,.55,.5,1.2);podiumSpot.position.set(0,11,5);podiumSpot.target.position.set(0,2,0);podiumRoot.add(podiumSpot,podiumSpot.target);
/* troféu 3D (models/trofeu.glb) — se não carregar, usa uma taça simples */
(function loadTrophy(){
 const fallback=()=>{
  const g=new THREE.Group(),gold=mat('#f2c230',.3,.8);
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.75,.35,.9,24),gold);cup.position.y=.5;g.add(cup);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.5,12),gold);stem.position.y=-.2;g.add(stem);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.55,.65,.25,24),mat('#222',.5,.3));base.position.y=-.55;g.add(base);
  g.scale.setScalar(.9);podiumTrophy=g;podiumTrophy.visible=false;podiumRoot.add(g);placeTrophy();
 };
 if(typeof GLTFLoader==='undefined'){fallback();return}
 new GLTFLoader().load('models/trofeu.glb',gl=>{
  try{
   gl.scene.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({map:o.material.map,metalness:.5,roughness:.4,emissive:'#3a2a00',emissiveIntensity:.25});o.castShadow=true}});
   const g=new THREE.Group();g.add(gl.scene);podiumTrophy=g;g.visible=false;podiumRoot.add(g);placeTrophy();
  }catch(e){console.warn('erro no troféu',e);fallback()}
 },undefined,e=>{console.warn('trofeu.glb não carregou; usando taça simples',e);fallback()});
})();

function placeTrophy(){   // também é chamada quando o .glb termina de carregar depois do pódio já aparecer
 if(!podiumTrophy||!podiumActive)return;
 podiumTrophy.visible=true;podiumTrophy.scale.setScalar(.8);podiumTrophy.position.set(PODIUM_SLOTS[0].x+1.0,PODIUM_SLOTS[0].top+.95*.8,.1);
}
/* ---------- interface (título, lista e botão) e confetes ---------- */
const podiumUI=document.createElement('div');podiumUI.id='podiumUI';
podiumUI.innerHTML='<div class="pd-title"></div><div class="pd-sub"></div><div class="pd-bottom"><div class="pd-list"></div><div class="pd-actions"></div></div>';
host.appendChild(podiumUI);
const confettiCanvas=document.createElement('canvas');confettiCanvas.id='confetti';host.appendChild(confettiCanvas);
const confettiCtx=confettiCanvas.getContext('2d');
let confetti=[];
const CONFETTI_COLORS=['#ffdf79','#ff6b8b','#6bd7ff','#8af0b3','#c79bff','#ff9f43','#ffffff'];
function newConfetto(initial){
 const W=confettiCanvas.width,H=confettiCanvas.height;
 return {x:Math.random()*W,y:initial?-Math.random()*H:-12,vy:70+Math.random()*120,sway:Math.random()*Math.PI*2,sw:.8+Math.random()*1.6,
  w:6+Math.random()*7,h:9+Math.random()*9,rot:Math.random()*6.28,vr:(Math.random()-.5)*9,c:CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)]};
}
function confettiResize(){const w=host.clientWidth||600,h=host.clientHeight||340;if(confettiCanvas.width!==w||confettiCanvas.height!==h){confettiCanvas.width=w;confettiCanvas.height=h}}
function confettiFrame(dt){
 confettiResize();const W=confettiCanvas.width,H=confettiCanvas.height,s=Math.max(.7,Math.min(1.4,W/700));
 const target=LOW_POWER?90:160;
 while(confetti.length<target)confetti.push(newConfetto(true));
 confettiCtx.clearRect(0,0,W,H);
 for(let i=0;i<confetti.length;i++){
  const c=confetti[i];c.y+=c.vy*dt*s;c.sway+=c.sw*dt;c.x+=Math.sin(c.sway)*38*dt;c.rot+=c.vr*dt;
  if(c.y>H+16){confetti[i]=newConfetto(false);continue}
  confettiCtx.save();confettiCtx.translate(c.x,c.y);confettiCtx.rotate(c.rot);confettiCtx.scale(1,Math.cos(c.rot*1.7)*.8+.2);
  confettiCtx.fillStyle=c.c;confettiCtx.fillRect(-c.w*s/2,-c.h*s/2,c.w*s,c.h*s);confettiCtx.restore();
 }
}
function sfxFanfare(){
 if(!audioEnabled)return;
 [[523,0],[659,.16],[784,.32],[1046,.5]].forEach(([f,w],k)=>tone(f,k===3?.7:.16,'triangle',.12,w));
 tone(262,.9,'sine',.08,.5);
 try{noisePop(.5,.09,5200)}catch(e){}
}

/* ---------- mostrar / esconder ---------- */
function podiumSprite(name,pts,color){
 const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
 g.fillStyle='rgba(30,18,50,.82)';const r=26;g.beginPath();g.roundRect?g.roundRect(6,10,500,108,r):g.rect(6,10,500,108);g.fill();
 g.lineWidth=5;g.strokeStyle=color;g.stroke();
 g.textAlign='center';g.fillStyle='#fff';g.font='900 50px system-ui,sans-serif';g.fillText(name,256,62);
 g.fillStyle=color;g.font='800 34px system-ui,sans-serif';g.fillText(pts+' pts',256,102);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false}));sp.scale.set(2.8,.7,1);sp.renderOrder=10;return sp;
}
/* order = índices dos personagens do 1º ao último; scores = pontos de cada personagem (por índice). */
let podiumRemoteNote='';
function showPodium(order,scores,remote){
 podiumState={order:order.slice(),scores:scores.slice(),remote:!!remote};
 podiumActive=true;podiumT0=performance.now();gameMode='podium';running=false;ended=true;
 cancelCountdown();cancelScoreOverlay();hideRoundBanner();
 document.getElementById('scoreOverlay').classList.remove('show');
 showFlowScreen('screenMinigames');
 // esconde os cenários dos minigames e mostra só o palco
 breadRoot.visible=soccerRoot.visible=shipRoot.visible=bowlingRoot.visible=dodgeRoot.visible=lavaRoot.visible=bridgeRoot.visible=false;
 balls.forEach(b=>b.mesh.visible=false);arenaRing.visible=false;
 floor.visible=rimMesh.visible=inner.visible=true;arenaDots.forEach(d=>d.visible=true);
 const hud=host.querySelector('.hud');if(hud)hud.style.display='none';
 ['touchControls','tap','soccerPick','bowlingTopScore'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'});
 // personagens
 players.forEach(p=>{p.root.visible=false;p.podiumState=null;p.finished=false;p.biting=false});
 podiumLabels.forEach(s=>{podiumRoot.remove(s);s.material.map.dispose();s.material.dispose()});podiumLabels=[];
 const medal=['#ffdf79','#e3e9ef','#e6a56b'];
 order.slice(0,3).forEach((idx,place)=>{
  const p=players[idx],s=PODIUM_SLOTS[place],sc=place===0?1.2:1.05;
  const x=place===0?s.x-.65:s.x;
  p.root.visible=true;p.root.scale.setScalar(sc);p.root.position.set(x,s.top,.1);p.root.rotation.set(0,place===0?.12:(place===1?.35:-.35),0);
  p.podiumState=place===0?'dance':'hop';
  const lab=podiumSprite(p.name,scores[idx]||0,medal[place]);lab.position.set(x,s.top+2.3*sc+.5,.2);podiumRoot.add(lab);podiumLabels.push(lab);
 });
 placeTrophy();
 podiumRoot.visible=true;
 // interface
 const champ=players[order[0]];
 podiumUI.querySelector('.pd-title').textContent='🏆 CAMPEÃO: '+champ.name.toUpperCase()+'!';
 let podSub=(remote?podiumRemoteNote:podiumNote)||'Todos os minigames foram jogados';
 if(!remote&&net.role==='offline'&&!net.tv&&typeof DIFFICULTIES!=='undefined'){       // troféu do mapa/dificuldade (só offline)
  const d=DIFFICULTIES[gameDifficulty],humans=[humanIndex,...(typeof localPadSlots==='function'?localPadSlots():[])];
  if(humans.includes(order[0])){const isNew=awardTrophy(currentMap,gameDifficulty);podSub=(podiumNote?podiumNote+' ':'')+d.medal+' Troféu de '+d.trophy+' — Mapa '+currentMap+' · '+d.name+(isNew?' (NOVO!)':' (já conquistado)')}
  else podSub=(podiumNote?podiumNote+' ':'')+'Sem troféu desta vez ('+d.name+'). Tente de novo!';
 }
 podiumUI.querySelector('.pd-sub').textContent=podSub;
 podiumUI.querySelector('.pd-list').innerHTML=order.map((idx,k)=>k<3?'':'<span class="pd-chip'+(idx===humanIndex?' me':'')+'">'+(k+1)+'º '+players[idx].name+' <b>'+(scores[idx]||0)+'</b></span>').join('');
 const act=podiumUI.querySelector('.pd-actions');
 if(net.role==='client')act.innerHTML='<span class="pd-wait">⏳ Aguardando o anfitrião iniciar um novo campeonato…</span>';
 else{act.innerHTML='<button id="podiumAgain">🔁 NOVO CAMPEONATO</button>';document.getElementById('podiumAgain').addEventListener('click',podiumPlayAgain)}
 if(matchHistory.length){const hb=document.createElement('button');hb.id='podiumHist';hb.className='pd-hist-btn';hb.textContent='📜 HISTÓRICO';hb.addEventListener('click',openHistory);act.appendChild(hb)}
 podiumUI.classList.add('show');confettiCanvas.classList.add('show');confetti=[];
 applyCameraPose();if(!sfxPodiumSequence())sfxFanfare();
}
function hidePodium(){
 if(!podiumActive)return;
 podiumActive=false;if(typeof closeHistory==='function')closeHistory();stopPodiumSound();podiumRoot.visible=false;if(podiumTrophy)podiumTrophy.visible=false;
 podiumLabels.forEach(s=>{podiumRoot.remove(s);s.material.map.dispose();s.material.dispose()});podiumLabels=[];
 players.forEach(p=>{p.podiumState=null;p.root.scale.setScalar(1);p.rig.position.y=0});
 podiumUI.classList.remove('show');confettiCanvas.classList.remove('show');confetti=[];
 const hud=host.querySelector('.hud');if(hud)hud.style.display='';
 ['touchControls','tap','soccerPick','bowlingTopScore'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=''});
}
/* Anfitrião/offline: calcula a classificação final do campeonato e mostra o pódio (convidados recebem o mesmo). */
function startPodium(forced){
 const order=forced||players.map((p,i)=>i).filter(isActive).sort((a,b)=>tournamentScores[b]-tournamentScores[a]||Number(b===humanIndex)-Number(a===humanIndex)||a-b);
 const scores=players.map((p,i)=>tournamentScores[i]||0);
 netBroadcast({k:'podium',order,scores,note:podiumNote,hist:matchHistory});
 showPodium(order,scores,false);
}
function podiumPlayAgain(){
 if(net.role==='client')return;
 hidePodium();netBroadcast({k:'podiumhide'});
 tournamentScores.fill(0);roundsPlayed=0;matchHistory.length=0;resetMinigameBag();startRound();
}
/* chamado a cada frame pelo game.js */
function podiumUpdate(t,dt){
 if(!podiumActive)return;
 const el=(performance.now()-podiumT0)/1000;
 if(podiumTrophy){podiumTrophy.rotation.y=Math.sin(el*.9)*.5;podiumTrophy.position.y=PODIUM_SLOTS[0].top+.95*.8+Math.sin(el*2)*.05}
 players.forEach((p,i)=>{
  if(!p.podiumState)return;
  if(!p.glb){                                   // modelos simples (sem .glb): pulinhos e braços para cima
   const k=podiumState.order.indexOf(i),amp=k===0?.3:.18;
   p.rig.position.y=Math.abs(Math.sin(el*(k===0?6:4.5)+k))*amp;
   p.arms.forEach((a,j)=>{a.rotation.x=-2.4+Math.sin(el*9+j*Math.PI)*.35;a.rotation.z=j===0?-.35:.35});
  }
 });
 podiumLabels.forEach((s,k)=>{s.position.y+=Math.sin(el*3+k)*.0015});
 confettiFrame(dt);
}

/* ---------- Histórico da partida: como cada um se saiu em cada minigame ---------- */
const historyModal=document.createElement('div');historyModal.id='historyModal';historyModal.className='modal';historyModal.setAttribute('role','dialog');historyModal.setAttribute('aria-modal','true');
historyModal.innerHTML='<div class="modal-card hist-card"><h2>📜 Histórico da partida</h2><div class="hist-scroll"></div><button id="closeHistory" class="primary-flow-button">FECHAR</button><small class="pad-hint">🎮 Controle: O/B fecha</small></div>';
document.body.appendChild(historyModal);
document.getElementById('closeHistory').addEventListener('click',closeHistory);
historyModal.addEventListener('pointerdown',e=>{if(e.target===historyModal)closeHistory()});
function closeHistory(){historyModal.classList.remove('show')}
function histPtsClass(g){return g>=5?'p5':g>=3?'p3':g>=2?'p2':g>=1?'p1':'p0'}
function openHistory(){
 const order=podiumState.order.length?podiumState.order:players.map((p,i)=>i).filter(isActive),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const total=i=>podiumState.scores[i]||0,rounds=matchHistory;
 let h='<table class="hist-table"><thead><tr><th>Jogador</th>'+rounds.map((r,k)=>'<th title="'+esc(r.label)+'"><span>'+(r.duel?'⚔️':(k+1))+'</span><small>'+esc(r.label.replace(/\s*\(.*\)/,''))+'</small></th>').join('')+'<th>Total</th></tr></thead><tbody>';
 order.forEach((i,pos)=>{
  h+='<tr'+(pos===0?' class="champ"':'')+'><td class="hist-name">'+(pos===0?'🏆 ':(pos+1)+'º ')+esc(players[i].name)+(i===humanIndex?' <em>(você)</em>':'')+'</td>';
  rounds.forEach(r=>{
   if(r.duel){h+='<td class="hist-cell">'+(r.duel.w===i?'🏆':r.duel.l===i?'✖':'–')+'</td>';return}
   const g=r.gains[i];h+='<td class="hist-cell '+histPtsClass(g||0)+'">'+(g===undefined?'–':'+'+g)+'</td>';
  });
  h+='<td class="hist-total">'+total(i)+'</td></tr>';
 });
 h+='</tbody></table><div class="hist-rounds">';
 rounds.forEach((r,k)=>{
  const ids=order.filter(i=>r.gains[i]!==undefined||r.detail[i]!==undefined).sort((a,b)=>(r.gains[b]||0)-(r.gains[a]||0));
  h+='<details'+(k===rounds.length-1?'':'')+'><summary><b>'+(r.duel?'⚔️':'Rodada '+(k+1))+' • '+esc(r.label.replace(/^⚔️\s*/,''))+'</b>'+(r.lead?'<small>'+esc(r.lead)+'</small>':'')+'</summary><ul>'+ids.map(i=>'<li><span class="hn">'+esc(players[i].name)+'</span>'+(r.gains[i]!==undefined?'<span class="hp '+histPtsClass(r.gains[i])+'">+'+r.gains[i]+'</span>':'')+'<small>'+esc(r.detail[i]||'')+'</small></li>').join('')+'</ul></details>';
 });
 h+='</div>';
 historyModal.querySelector('.hist-scroll').innerHTML=rounds.length?h:'<p style="text-align:center">Nenhuma rodada registrada.</p>';
 historyModal.classList.add('show');
 try{document.getElementById('closeHistory').focus()}catch(e){}
}
