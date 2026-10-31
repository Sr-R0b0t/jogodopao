/* Minigame: Corrida do Pão — 100 cliques; o último dá a mordida final. */
const breadRoot=new THREE.Group();scene.add(breadRoot);breadRoot.position.set(0,.45,0);
const loaf=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),mat('#d98737',.72));loaf.scale.set(1.42,.68,.95);loaf.castShadow=true;loaf.receiveShadow=true;breadRoot.add(loaf);
const breadTop=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),mat('#f5bc61',.7));breadTop.scale.set(1.29,.43,.84);breadTop.position.set(0,.23,0);breadTop.castShadow=true;breadRoot.add(breadTop);
for(let i=-1;i<=1;i++){const slash=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.5,4,8),mat('#ffe2a0'));slash.position.set(i*.5,.56,0);slash.rotation.z=-.55;slash.scale.set(1,.85,1);breadRoot.add(slash)}
// IMPORTANTE: reset() remove tudo após os 5 primeiros filhos (pão + topo + 3 cortes).

const creamMat=mat('#fff4f5',.3);
function addCream(){
 const g=new THREE.Group();const n=players.filter(p=>p.finished).length;const a=n*2.2;
 const mound=new THREE.Mesh(new THREE.SphereGeometry(.3,20,16),creamMat);mound.scale.set(1,.55,1);mound.position.set(Math.cos(a)*.8,.55,Math.sin(a)*.55);mound.castShadow=true;g.add(mound);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.17,.34,18),creamMat);tip.position.set(Math.cos(a)*.8,.82,Math.sin(a)*.55);tip.rotation.z=.25;g.add(tip);breadRoot.add(g);
}
const projectiles=[];
function throwCream(p){
 p.throwAt=performance.now();p.finished=true;sfxCream();sfxFinish();
 const start=p.root.position.clone();start.y+=1.45;
 const target=new THREE.Vector3((Math.random()-.5)*1.5,1.35,(Math.random()-.5)*.8);
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(.18,18,14),mat('#fff4f7',.25));mesh.castShadow=true;scene.add(mesh);
 projectiles.push({mesh,start,target,begin:performance.now(),duration:780});
 p.arms.forEach((a,i)=>{a.rotation.x=-1.7;a.rotation.z=(i===0?-.8:.8)});
 document.getElementById('status').textContent=p.name+' terminou e jogou creme no pão! 🍦';
}

/* Cronômetro do último jogador (30 s) */
let lastPlayerTimerId=null,lastPlayerInterval=null,lastPlayerDeadline=0;
function stopLastPlayerTimer(){
 if(lastPlayerTimerId){clearTimeout(lastPlayerTimerId);lastPlayerTimerId=null}
 if(lastPlayerInterval){clearInterval(lastPlayerInterval);lastPlayerInterval=null}
 const el=document.getElementById('lastPlayerTimer');if(el)el.classList.remove('show');
}
/* Overlay de resultado (usado também pela Batalha das Bolas) */
function showScoreScreen(winnerIndex,modeLabel,headline,lead){
 stopLastPlayerTimer();
 const result=document.getElementById('result');
 result.classList.remove('show');result.innerHTML='';
 // O placar só aparece SCORE_DELAY_MS depois do fim da partida.
 scheduleScoreOverlay(()=>{
  document.getElementById('scoreOverlayTitle').textContent=headline;
  document.getElementById('scoreOverlayLead').textContent=lead;
  document.getElementById('scoreOverlayContent').innerHTML=buildScoreboard(winnerIndex,modeLabel);
  document.getElementById('scoreOverlay').classList.add('show');
  wireScoreboardActions();
  netSendOverlay();
 });
}
function finishAll(){
 if(ended||!activePlayers().every(p=>p.count>=100))return;
 ended=true;running=false;clearBots();stopLastPlayerTimer();
 const ap=activePlayers(),loser=ap.reduce((a,p)=>p.throwAt>a.throwAt?p:a,ap[0]);
 document.getElementById('status').textContent='O perdedor vai dar a mordida final! 😬';
 if(audioEnabled){[784,659,523,392].forEach((f,i)=>tone(f,.22,'triangle',.09,i*.12));setTimeout(()=>{if(audioEnabled)sfxBite()},650)}
 const winnerIndex=players.reduce((best,p,i)=>p.throwAt>0&&(best<0||p.throwAt<players[best].throwAt)?i:best,-1);
 loser.biteAt=performance.now();loser.biting=true;celebrateStart=performance.now();
 document.getElementById('start').disabled=true;document.getElementById('tap').disabled=true;
 document.getElementById('characterChoice').disabled=true;document.getElementById('gameMode').disabled=true;
 showScoreScreen(winnerIndex,'Corrida do Pão','🏆 Fim da rodada!',`🏁 ${loser.name} ficou por último e vai comer o pão!`);
}
function beginLastPlayerTimer(){
 if(gameMode!=='bread'||ended||lastPlayerTimerId||!running)return;
 const unfinished=activePlayers().filter(p=>p.count<100);
 if(unfinished.length!==1)return;
 const last=unfinished[0];
 lastPlayerDeadline=Date.now()+30000;
 const el=document.getElementById('lastPlayerTimer');
 if(el){el.innerHTML=`⏳ ${last.name}, termine a prova!<strong>30</strong> segundos restantes`;el.classList.add('show')}
 document.getElementById('status').textContent=`Última chance para ${last.name}: 30 segundos!`;
 lastPlayerInterval=setInterval(()=>{
  const remain=Math.max(0,Math.ceil((lastPlayerDeadline-Date.now())/1000));
  if(el)el.innerHTML=`⏳ ${last.name}, termine a prova!<strong>${remain}</strong> segundos restantes`;
 },200);
 lastPlayerTimerId=setTimeout(()=>{
  stopLastPlayerTimer();
  if(ended||last.count>=100)return;
  ended=true;running=false;clearBots();
  document.getElementById('start').disabled=true;document.getElementById('tap').disabled=true;
  document.getElementById('characterChoice').disabled=true;document.getElementById('gameMode').disabled=true;
  const winnerIndex=players.reduce((best,p,i)=>p.count>=100&&(best<0||p.throwAt<players[best].throwAt)?i:best,-1);
  showScoreScreen(winnerIndex,'Corrida do Pão','⏱️ Tempo esgotado!',`${last.name} não concluiu os 100 cliques em 30 segundos.`);
 },30000);
}
function finish(p){if(p.finished)return;p.count=100;throwCream(p);addCream();updateHud();if(activePlayers().every(x=>x.count>=100))finishAll();else beginLastPlayerTimer()}
function botTick(p){
 if(!running||p.count>=100)return;
 p.count=Math.min(100,p.count+1);if(p.count%10===0)sfxClick();updateHud();
 if(p.count>=100){finish(p);return}
 beginLastPlayerTimer();
 const variation=Math.floor(Math.random()*100)-40;
 botTimers.push(setTimeout(()=>botTick(p),Math.max(100,p.delay+variation)));
}
