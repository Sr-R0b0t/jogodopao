/* Minigame: Ponte de Pedras — cada jogador tem a sua pista sobre a lava e quer chegar primeiro ao outro lado.
   A cada rodada aparecem 4 caminhos (◀ ▲ ▼ ▶), cada um com um tamanho (1 a 4 pedras). Todos escolhem AO MESMO TEMPO:
   • quem escolheu um caminho que MAIS NINGUÉM escolheu: a ponte cresce e o personagem avança aquele tanto;
   • se 2 ou mais escolherem o MESMO caminho, ninguém desse caminho avança (choque!).
   Vence quem atravessar primeiro (BRIDGE.goal pedras). O anfitrião (ou o offline) roda tudo; os convidados só escolhem e assistem. */
const BRIDGE={goal:12,step:1.2,x0:-7.2,xStart:-8.7,xEnd:8.9,laneGap:2.6,pickSec:8,introMs:900,revealMs:2300,walkMs:480,endMs:1400,maxRounds:12,lens:[1,2,3,4]};
const BRIDGE_ARROW=['⬅','⬆','⬇','➡'],BRIDGE_NAME=['ESQUERDA','CIMA','BAIXO','DIREITA'];
const bridgeRoot=new THREE.Group();scene.add(bridgeRoot);bridgeRoot.visible=false;

/* ---------- cenário ---------- */
{
 const lavaMat=new THREE.MeshStandardMaterial({map:lavaFloorTex,emissiveMap:lavaFloorTex,emissive:'#ffffff',emissiveIntensity:.85,color:'#ffb066',roughness:.7});
 const lf=new THREE.Mesh(new THREE.PlaneGeometry(70,46),lavaMat);lf.rotation.x=-Math.PI/2;lf.position.y=-.7;bridgeRoot.add(lf);
 const stone=mat('#5a4a44',.85,.05),dark=mat('#3a2e2c',.9,.05);
 const span=BRIDGE.laneGap*8;
 const bridgeBanks=[],bridgeTorches=[],bridgeStairs=[];
 const bankL=new THREE.Mesh(new THREE.BoxGeometry(3.6,.9,span+2),stone);bankL.position.set(-9.0,-.45,0);bankL.receiveShadow=true;bridgeRoot.add(bankL);bridgeBanks.push(bankL);
 const bankR=new THREE.Mesh(new THREE.BoxGeometry(3.6,.9,span+2),stone);bankR.position.set(9.0,-.45,0);bankR.receiveShadow=true;bridgeRoot.add(bankR);bridgeBanks.push(bankR);
 for(let k=0;k<4;k++){const st=new THREE.Mesh(new THREE.BoxGeometry(1.0,.28*(k+1),span*.55),dark);st.position.set(9.9+k*.34,-.9+.14*(k+1)+.45,0);bridgeStairs.push(st);bridgeRoot.add(st)}   // escadaria (chegada)
 const flame=new THREE.MeshBasicMaterial({color:'#ffb21a'});
 [[-9.8,-span/2+.4],[-9.8,span/2-.4],[8.2,-span/2+.4],[8.2,span/2-.4]].forEach(([x,z])=>{
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,1.1,10),dark);t.position.set(x,.55,z);bridgeRoot.add(t);
  const f=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),flame);f.position.set(x,1.3,z);bridgeRoot.add(f);bridgeTorches.push([t,f,z<0?-1:1]);
 });
 window.__bridgeScenery={bridgeBanks,bridgeTorches,bridgeStairs,span};
}
const bridgeTiles=[],bridgeGuides=[],bridgeMarks=[];
function bridgeFitScenery(n){const S=window.__bridgeScenery,len=n*BRIDGE.laneGap+2;S.bridgeBanks.forEach(b=>b.scale.z=len/(S.span+2));S.bridgeStairs.forEach(s=>s.scale.z=len/(S.span*.55)*.8);S.bridgeTorches.forEach(([t,f,sg])=>{const z=sg*(len/2-.5);t.position.z=z;f.position.z=z})}
{
 const tileM=new THREE.MeshStandardMaterial({color:'#4a3d46',roughness:.8,emissive:'#2a1008',emissiveIntensity:.3}),guideM=new THREE.MeshBasicMaterial({color:'#ffe9a8',transparent:true,opacity:.28,depthWrite:false});
 for(let l=0;l<8;l++){
  const row=[];
  for(let s=0;s<BRIDGE.goal;s++){const m=new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.step-.12,.34,1.9),tileM);m.castShadow=true;m.receiveShadow=true;m.visible=false;m.position.set(BRIDGE.x0+(s+.5)*BRIDGE.step,-.12,0);bridgeRoot.add(m);row.push(m)}
  bridgeTiles.push(row);
  const g=new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE.goal*BRIDGE.step,2.0),guideM);g.rotation.x=-Math.PI/2;g.position.set(BRIDGE.x0+BRIDGE.goal*BRIDGE.step/2,-.55,0);g.visible=false;bridgeRoot.add(g);bridgeGuides.push(g);
  const c=document.createElement('canvas');c.width=256;c.height=96;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false}));sp.scale.set(2.5,.94,1);sp.renderOrder=11;sp.visible=false;bridgeRoot.add(sp);
  bridgeMarks.push({sp,c,t,txt:''});
 }
}
function bridgeDrawMark(m,txt,color){
 if(m.txt===txt+color)return;m.txt=txt+color;
 const g=m.c.getContext('2d');g.clearRect(0,0,256,96);
 g.fillStyle='rgba(24,14,40,.86)';g.beginPath();g.roundRect?g.roundRect(8,10,240,76,26):g.rect(8,10,240,76);g.fill();g.lineWidth=5;g.strokeStyle=color;g.stroke();
 g.fillStyle=color;g.font='900 44px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,128,50);m.t.needsUpdate=true;
}

/* ---------- estado ---------- */
let bridge=null,bridgeClient=null,bridgeSentRound=-1,bridgeLane={},bridgeCueKey='',bridgePopAt={};
const bridgePx=j=>j<=0?BRIDGE.xStart:j>=BRIDGE.goal?BRIDGE.xEnd:BRIDGE.x0+(j-.5)*BRIDGE.step;
function bridgeXAt(k){const a=Math.floor(k),f=k-a;return bridgePx(a)+(bridgePx(a+1)-bridgePx(a))*f}
function bridgeAssignLanes(){
 const act=activeIndices();bridgeLane={};
 act.forEach((i,k)=>{bridgeLane[i]=k});
 const n=act.length;
 return act.map((i,k)=>({i,z:(k-(n-1)/2)*BRIDGE.laneGap}));
}
function bridgeLaneZ(i){const n=activeIndices().length;return ((bridgeLane[i]||0)-(n-1)/2)*BRIDGE.laneGap}
function setupBridge(){
 bridge=null;bridgeClient=null;bridgeSentRound=-1;bridgePopAt={};
 const lanes=bridgeAssignLanes();bridgeFitScenery(lanes.length);
 bridgeGuides.forEach((g,l)=>{g.visible=l<lanes.length;if(l<lanes.length)g.position.z=lanes[l].z});
 bridgeTiles.forEach(r=>r.forEach(m=>m.visible=false));
 bridgeMarks.forEach(m=>m.sp.visible=false);
 lanes.forEach(({i,z})=>{const p=players[i];p.count=0;p.root.position.set(BRIDGE.xStart,0,z);p.root.rotation.set(0,Math.PI/2,0);p.root.scale.setScalar(.95);p.root.visible=true});
}
function startBridge(){
 const now=performance.now(),act=activeIndices();
 bridge={ph:'intro',n:0,t0:now,dist:{},choice:{},res:{},opts:[],need:[],left:0,botAt:{},from:{},to:{},walkT0:0,walkDur:0};
 act.forEach(i=>{bridge.dist[i]=0;players[i].count=0});
 document.getElementById('status').textContent='🌉 Escolha um caminho: ⬅ ⬆ ⬇ ➡. Se alguém escolher o mesmo, ninguém avança! Chegue primeiro ao outro lado.';
}
function bridgeNextRound(now){
 const B=bridge;B.n++;
 if(B.n>BRIDGE.maxRounds){bridgeFinish();return}
 B.opts=BRIDGE.lens.slice().sort(()=>Math.random()-.5);B.choice={};B.res={};B.ph='pick';B.t0=now;B.botAt={};
 activeIndices().forEach(i=>{if(!isHumanSlot(i))B.botAt[i]=now+900+Math.random()*3600});
 document.getElementById('status').textContent='🌉 Rodada '+B.n+'/'+BRIDGE.maxRounds+': escolha seu caminho! Mesma escolha de alguém = ninguém avança.';
}
function bridgeSetChoice(slot,opt){
 const B=bridge;if(!B||B.ph!=='pick'||!isActive(slot)||B.choice[slot]!==undefined)return;
 opt=Math.round(Number(opt));if(!(opt>=0&&opt<=3))return;B.choice[slot]=opt;
}
function bridgeBotPick(i){
 const k=diffK(),p=Math.max(0,(k-.72)/.56)*1.1;        // fácil: escolhe ao acaso • difícil: prefere caminhos longos
 const w=bridge.opts.map(l=>Math.pow(l,p)*(.6+Math.random()*.8)),tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot,o=0;
 for(;o<3&&r>w[o];o++)r-=w[o];return o;
}
function bridgeResolve(now){
 const B=bridge,act=activeIndices(),cnt=[0,0,0,0];
 act.forEach(i=>{if(B.choice[i]!==undefined)cnt[B.choice[i]]++});
 act.forEach(i=>{
  const o=B.choice[i];B.from[i]=B.dist[i];
  if(o===undefined){B.res[i]={o:-1,l:0,c:0,a:0}}
  else{const clash=cnt[o]>1,a=clash?0:B.opts[o];B.res[i]={o,l:B.opts[o],c:clash?1:0,a};B.dist[i]+=a;for(let s=B.from[i];s<Math.min(BRIDGE.goal,B.dist[i]);s++)bridgePopAt[i+':'+s]=now}
  B.to[i]=B.dist[i];players[i].count=B.dist[i];
 });
 B.ph='reveal';B.t0=now;
 const anyAdv=act.some(i=>B.res[i].a>0);
 document.getElementById('status').textContent=anyAdv?'🌉 '+act.filter(i=>B.res[i].a>0).map(i=>players[i].name+' +'+B.res[i].a).join(' • ')+(act.some(i=>B.res[i].c)?' — e teve choque!':''):'💥 Choque geral! Ninguém avançou.';
}
/* ---------- atualização (anfitrião / offline) ---------- */
function updateBridgeMode(now,dt){
 if(gameMode!=='bridge'||!running||!bridge)return;
 const B=bridge,act=activeIndices();
 if(B.ph==='intro'){if(now-B.t0>BRIDGE.introMs)bridgeNextRound(now)}
 else if(B.ph==='pick'){
  const els=now-B.t0;
  act.forEach(i=>{if(B.choice[i]===undefined&&!isHumanSlot(i)&&now>=B.botAt[i])B.choice[i]=bridgeBotPick(i)});
  B.need=act.filter(i=>isHumanSlot(i)&&B.choice[i]===undefined);
  B.left=Math.max(0,Math.ceil(BRIDGE.pickSec-els/1000));
  if(act.every(i=>B.choice[i]!==undefined)||els>BRIDGE.pickSec*1000){B.need=[];bridgeResolve(now)}
 }else if(B.ph==='reveal'){
  if(now-B.t0>BRIDGE.revealMs){
   const maxA=Math.max(0,...act.map(i=>B.res[i].a));
   if(maxA>0){B.ph='walk';B.walkT0=now;B.walkDur=maxA*BRIDGE.walkMs}
   else bridgeNextRound(now);
  }
 }else if(B.ph==='walk'){
  const el=now-B.walkT0;
  act.forEach(i=>{
   const a=B.res[i].a;if(!a)return;
   const u=Math.min(1,el/(a*BRIDGE.walkMs)),kf=B.from[i]+(B.to[i]-B.from[i])*u,r=players[i].root;
   r.position.x=bridgeXAt(Math.min(kf,BRIDGE.goal));r.position.y=u<1?Math.abs(Math.sin(kf*Math.PI))*.28:0;
  });
  if(el>=B.walkDur+250){
   act.forEach(i=>{players[i].root.position.y=0});
   if(act.some(i=>B.dist[i]>=BRIDGE.goal)){B.ph='done';B.t0=now}else bridgeNextRound(now);
  }
 }else if(B.ph==='done'){if(now-B.t0>BRIDGE.endMs)bridgeFinish()}
}
function bridgeFinish(){
 if(ended)return;
 ended=true;running=false;clearBots();
 const B=bridge,act=activeIndices().sort((a,b)=>B.dist[b]-B.dist[a]),ranking=[],detail={};
 act.forEach(i=>{const last=ranking[ranking.length-1];if(last&&B.dist[last[0]]===B.dist[i])last.push(i);else ranking.push([i]);detail[i]=B.dist[i]>=BRIDGE.goal?'🌉 atravessou (passo '+B.dist[i]+')':'parou em '+B.dist[i]+' de '+BRIDGE.goal+' pedras'});
 const top=ranking[0],won=B.dist[top[0]]>=BRIDGE.goal;
 const lead=won?(top.length>1?'Empate na chegada: '+top.map(i=>players[i].name).join(', ')+'!':players[top[0]].name+' atravessou primeiro!'):'Ninguém chegou ao outro lado: venceu quem foi mais longe — '+top.map(i=>players[i].name).join(', ')+'.';
 document.getElementById('status').textContent=lead;
 showScoreScreen(ranking,'Ponte de Pedras',won?'🌉 Travessia concluída!':'⏱ Fim das rodadas!',lead,detail);
}
/* ---------- interface ---------- */
function bridgeChoose(opt){
 const B=bridgeView();if(!B||B.ph!=='pick'||!B.need||!B.need.includes(humanIndex)||bridgeSentRound===B.n)return;
 if(net.role==='client')netSendInput({k:'bc',c:opt});else bridgeSetChoice(humanIndex,opt);
 bridgeSentRound=B.n;if(audioEnabled)sfxClick();
}
function bridgeDistOf(i){const B=bridgeView();return B?((B.d?B.d[i]:B.dist&&B.dist[i])||0):0}
function bridgeView(){return net.role==='client'?bridgeClient:bridge}
function bridgeUiUpdate(){
 const panel=document.getElementById('bridgePick'),hud=document.getElementById('bridgeHud');if(!panel||!hud)return;
 const B=bridgeView(),on=gameMode==='bridge'&&!!B;
 hud.classList.toggle('show',on);
 if(!on){panel.classList.remove('show');return}
 const act=activeIndices();
 hud.textContent='🌉 '+(B.n?'Rodada '+Math.min(B.n,BRIDGE.maxRounds)+'/'+BRIDGE.maxRounds:'Preparando…')+' • Meta: '+BRIDGE.goal+' pedras'+(B.ph==='pick'?' • ⏱ '+B.left+'s':'')+'  |  '+act.map(i=>players[i].name+' '+Math.min(BRIDGE.goal,(B.d?B.d[i]:B.dist[i])||0)).join(' • ');
 const mine=B.ph==='pick'&&!!B.need&&B.need.includes(humanIndex)&&bridgeSentRound!==B.n;
 panel.classList.toggle('show',mine);
 if(mine){
  document.getElementById('bridgePickTitle').textContent='🌉 Escolha seu caminho!  ('+B.left+'s)';
  panel.querySelectorAll('button').forEach((b,k)=>{const i=b.querySelector('i');if(i)i.textContent='🟨'.repeat((B.opts||[])[k]||1)});
 }
}
document.querySelectorAll('#bridgePick button').forEach(b=>b.addEventListener('click',()=>bridgeChoose(Number(b.dataset.c))));
window.addEventListener('keydown',e=>{
 if(gameMode!=='bridge')return;
 const m={ArrowLeft:0,KeyA:0,ArrowUp:1,KeyW:1,ArrowDown:2,KeyS:2,ArrowRight:3,KeyD:3,Digit1:0,Digit2:1,Digit3:2,Digit4:3}[e.code];
 if(m===undefined)return;e.preventDefault();bridgeChoose(m);
});
function bridgeAudioCue(){
 const B=bridgeView();
 if(gameMode!=='bridge'||!B){bridgeCueKey='';return}
 const key=B.n+':'+B.ph;if(key===bridgeCueKey)return;bridgeCueKey=key;
 if(B.ph==='pick')sfxWhistle();
 else if(B.ph==='reveal'){
  const adv=B.res?Object.values(B.res).some(r=>r&&(r.a||0)>0):B.ra&&B.ra.some(r=>r&&r[3]>0);
  if(adv)sfxFinish();else tone(150,.3,'sawtooth',.1,0,90);
 }
}
/* ---------- visual (todos): pedras, marcadores e posições ---------- */
function bridgeVisualUpdate(dt){
 if(gameMode!=='bridge')return;
 const client=net.role==='client'&&bridgeClient,B=bridgeView();
 const act=activeIndices(),now=performance.now();
 bridgeAssignLanes();bridgeFitScenery(act.length);
 bridgeGuides.forEach((g,l)=>{g.visible=l<act.length;if(l<act.length)g.position.z=(l-(act.length-1)/2)*BRIDGE.laneGap});
 act.forEach((i,k)=>{
  const dist=B?(client?(B.d?B.d[i]:0):B.dist[i])||0:0,z=bridgeLaneZ(i);
  const row=bridgeTiles[k];
  for(let s=0;s<BRIDGE.goal;s++){
   const m=row[s],show=s<dist;m.visible=show;m.position.z=z;
   if(show){const key=i+':'+s;if(bridgePopAt[key]===undefined)bridgePopAt[key]=now-1000;const u=Math.min(1,(now-bridgePopAt[key])/320);m.scale.set(1,.4+.6*u,1);m.position.y=-.12+(1-u)*.6}
  }
  // marcador acima do personagem
  const mk=bridgeMarks[k],p=players[i].root;mk.sp.visible=!!B&&p.visible;mk.sp.position.set(p.position.x,2.55,p.position.z);
  if(B){
   if(B.ph==='pick'){const chosen=client?(B.ch&&B.ch[i]):B.choice[i]!==undefined;bridgeDrawMark(mk,chosen?'✔ pronto':'… pensando',chosen?'#8af0b3':'#cdb6ea')}
   else if(B.ph==='reveal'||B.ph==='walk'||B.ph==='done'){
    const r=client?(B.ra&&B.ra[i]?{o:B.ra[i][0],l:B.ra[i][1],c:B.ra[i][2],a:B.ra[i][3]}:null):B.res[i];
    if(!r)bridgeDrawMark(mk,'—','#bba9d6');
    else if(r.o<0)bridgeDrawMark(mk,'sem escolha','#bba9d6');
    else if(r.c)bridgeDrawMark(mk,BRIDGE_ARROW[r.o]+' ✖ CHOQUE','#ff6a5a');
    else bridgeDrawMark(mk,BRIDGE_ARROW[r.o]+' +'+r.a,'#ffdf79');
    if(B.ph==='done'&&dist>=BRIDGE.goal)bridgeDrawMark(mk,'🏆 CHEGOU!','#ffdf79');
   }else mk.sp.visible=false;
  }
 });
 for(let k=act.length;k<8;k++){bridgeMarks[k].sp.visible=false;bridgeTiles[k].forEach(m=>m.visible=false)}
}
function bridgeSnapshot(){
 const B=bridge;if(!B)return null;const n=players.length,d=new Array(n).fill(0),ch=new Array(n).fill(0),ra=new Array(n).fill(0);
 activeIndices().forEach(i=>{d[i]=B.dist[i]||0;ch[i]=B.choice[i]!==undefined?1:0;const r=B.res[i];if(r)ra[i]=[r.o,r.l,r.c,r.a]});
 return {ph:B.ph,n:B.n,opts:B.opts,left:B.left,need:B.need,d,ch,ra};
}
