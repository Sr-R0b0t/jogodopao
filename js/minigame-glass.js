/* Minigame: Ponte de Vidro — em cada fileira há 2 vidros (⬆ de cima e ⬇ de baixo): um aguenta, o outro é FRACO.
   Jogo por TURNOS (ordem sorteada): quem está na vez tem GLASS.pickSec segundos para escolher o vidro da próxima fileira.
   • vidro firme: o personagem avança uma fileira;  • vidro fraco: quebra, o personagem cai e volta ao início;
   • o vidro quebrado VOLTA INTEIRO no turno seguinte — é preciso MEMORIZAR onde estavam os fracos!
   Vence quem atravessar primeiro. O anfitrião (ou o offline) roda tudo e NUNCA envia quais vidros são fracos aos convidados. */
const GLASS={rows:10,step:1.6,x0:-8,xStart:-9.9,xEnd:10.1,laneZ:1.05,pickSec:5,introMs:1400,jumpMs:450,fallMs:800,landMs:400,failHoldMs:1300,crossMs:650,endMs:1700,perPlayer:30};
const GLASS_NAME=['DE CIMA','DE BAIXO'],GLASS_ARROW=['⬆','⬇'];
const glassRoot=new THREE.Group();scene.add(glassRoot);glassRoot.visible=false;

/* ---------- cenário ---------- */
const glassPanes=[]; // glassPanes[r-1][l]={m,e,mat}
{
 const lavaMat=new THREE.MeshStandardMaterial({map:lavaFloorTex,emissiveMap:lavaFloorTex,emissive:'#ffffff',emissiveIntensity:.85,color:'#ffb066',roughness:.7});
 const lf=new THREE.Mesh(new THREE.PlaneGeometry(70,46),lavaMat);lf.rotation.x=-Math.PI/2;lf.position.y=-1.1;glassRoot.add(lf);
 const stone=mat('#5a4a44',.85,.05),dark=mat('#3a2e2c',.9,.05),span=6.6;
 [-10.2,10.2].forEach(x=>{const b=new THREE.Mesh(new THREE.BoxGeometry(3.6,.9,span),stone);b.position.set(x,-.45,0);b.receiveShadow=true;glassRoot.add(b)});
 for(let k=0;k<4;k++){const st=new THREE.Mesh(new THREE.BoxGeometry(1.0,.28*(k+1),span*.5),dark);st.position.set(11.1+k*.34,-.9+.14*(k+1)+.45,0);glassRoot.add(st)}
 const flame=new THREE.MeshBasicMaterial({color:'#ffb21a'});
 [[-11.0,-span/2+.4],[-11.0,span/2-.4],[9.4,-span/2+.4],[9.4,span/2-.4]].forEach(([x,z])=>{
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,1.1,10),dark);t.position.set(x,.55,z);glassRoot.add(t);
  const f=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),flame);f.position.set(x,1.3,z);glassRoot.add(f);
 });
 // trilhos laterais para a ponte parecer uma ponte
 const rail=mat('#3a2e2c',.9,.05);
 [-1,1].forEach(sg=>{const r=new THREE.Mesh(new THREE.BoxGeometry(GLASS.rows*GLASS.step+.4,.12,.12),rail);r.position.set(GLASS.x0+GLASS.rows*GLASS.step/2,.05,sg*(GLASS.laneZ+1.15));glassRoot.add(r)});
 const eg=new THREE.EdgesGeometry(new THREE.BoxGeometry(GLASS.step-.2,.1,1.75)),em=new THREE.LineBasicMaterial({color:'#e9fbff',transparent:true,opacity:.85});
 for(let r=0;r<GLASS.rows;r++){
  const row=[];
  for(let l=0;l<2;l++){
   const mt=new THREE.MeshStandardMaterial({color:'#b8ecff',transparent:true,opacity:.62,roughness:.08,metalness:.15,emissive:'#3aa8c8',emissiveIntensity:.4,depthWrite:false});
   const m=new THREE.Mesh(new THREE.BoxGeometry(GLASS.step-.2,.1,1.75),mt);m.receiveShadow=true;
   const e=new THREE.LineSegments(eg,em);m.add(e);
   m.position.set(glassPaneX(r+1),-.05,glassPaneZ(l));glassRoot.add(m);row.push({m,e,mt});
  }
  glassPanes.push(row);
 }
}
function glassPaneX(r){return GLASS.x0+(r-.5)*GLASS.step}
function glassPaneZ(l){return l===0?-GLASS.laneZ:GLASS.laneZ}
const glassMark=(()=>{const c=document.createElement('canvas');c.width=320;c.height=96;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false}));sp.scale.set(3.2,.96,1);sp.renderOrder=11;sp.visible=false;glassRoot.add(sp);return {sp,c,t,txt:''}})();
function glassDrawMark(txt,color){
 const m=glassMark;if(m.txt===txt+color)return;m.txt=txt+color;
 const g=m.c.getContext('2d');g.clearRect(0,0,320,96);
 g.fillStyle='rgba(24,14,40,.88)';g.beginPath();g.roundRect?g.roundRect(8,10,304,76,26):g.rect(8,10,304,76);g.fill();g.lineWidth=5;g.strokeStyle=color;g.stroke();
 g.fillStyle=color;g.font='900 38px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,160,50);m.t.needsUpdate=true;
}

/* ---------- estado ---------- */
let glass=null,glassClient=null,glassSentTurn=-1,glassCueKey='',glassHudSig='',glassBrkSeen='',glassBrkAt=0;
function glassStartPos(i){const act=activeIndices(),k=Math.max(0,act.indexOf(i)),n=act.length;return {x:GLASS.xStart,z:(k-(n-1)/2)*.8}}
function glassStandPos(i,r,l){const act=activeIndices(),k=Math.max(0,act.indexOf(i));return {x:glassPaneX(r)+((k%4)-1.5)*.3,z:glassPaneZ(l)+(Math.floor(k/4)-.5)*.5}}
function glassView(){return net.role==='client'?glassClient:glass}
function glassPosOf(i){const B=glassView();return B?((B.pos?B.pos[i]:0)||0):0}
function setupGlass(){
 glass=null;glassClient=null;glassSentTurn=-1;glassBrkSeen='';
 activeIndices().forEach(i=>{const p=players[i],s=glassStartPos(i);p.count=0;p.root.position.set(s.x,0,s.z);p.root.rotation.set(0,Math.PI/2,0);p.root.scale.setScalar(.95);p.root.visible=true});
 glassMark.sp.visible=false;
}
function startGlass(){
 const now=performance.now(),act=activeIndices();
 glass={ph:'intro',n:0,t0:now,order:act.slice().sort(()=>Math.random()-.5),cur:-1,weak:[],pos:{},best:{},falls:{},turns:0,choice:undefined,auto:false,left:GLASS.pickSec,need:[],jump:null,brk:null,brkAt:0,win:-1,seen:{},botAt:0,lastFall:-1};
 for(let r=0;r<GLASS.rows;r++)glass.weak.push(Math.random()<.5?0:1);
 act.forEach(i=>{glass.pos[i]=0;glass.best[i]=0;glass.falls[i]=0;players[i].count=0});
 document.getElementById('status').textContent='🔷 Ponte de Vidro: um vidro de cada par é FRACO! Vez de cada jogador — memorize os que quebrarem. Ordem: '+glass.order.map(i=>players[i].name).join(' → ');
}
function glassNextTurn(now){
 const B=glass,act=activeIndices();
 B.brk=null;                                               // o vidro quebrado volta inteiro
 if(B.turns>=Math.min(GLASS.perPlayer*act.length,150)){glassFinish();return}
 B.cur=B.order[B.turns%B.order.length];B.turns++;B.n=B.turns;B.choice=undefined;B.auto=false;B.ph='turn';B.t0=now;B.left=GLASS.pickSec;
 B.botAt=now+600+Math.random()*1300;
 B.need=isHumanSlot(B.cur)?[B.cur]:[];
 document.getElementById('status').textContent='🔷 Vez de '+players[B.cur].name+' — escolha o vidro da fileira '+(B.pos[B.cur]+1)+'!';
}
function glassSetChoice(slot,c){
 const B=glass;if(!B||B.ph!=='turn'||slot!==B.cur||B.choice!==undefined)return;
 c=Math.round(Number(c));if(!(c===0||c===1))return;B.choice=c;B.need=[];
}
function glassBotPick(i){
 const B=glass,r=B.pos[i]+1,k=diffK(),mem=Math.min(.97,.62+Math.max(0,(k-.72))/.56*.33);   // memória do robô: fácil ~62% • difícil ~95%
 if(B.seen[r]!==undefined&&Math.random()<mem)return 1-B.seen[r];
 return Math.random()<.5?0:1;
}
function glassResolve(now){
 const B=glass,i=B.cur,r=B.pos[i]+1,l=B.choice,ok=B.weak[r-1]!==l,from=players[i].root.position,to=glassStandPos(i,r,l);
 B.jump={i,r,l,ok,fx:from.x,fz:from.z,tx:to.x,tz:to.z};B.ph='jump';B.t0=now;
}
/* ---------- atualização (anfitrião / offline) ---------- */
function updateGlassMode(now,dt){
 if(gameMode!=='glass'||!running||!glass)return;
 const B=glass,act=activeIndices();
 if(B.ph==='intro'){if(now-B.t0>GLASS.introMs)glassNextTurn(now)}
 else if(B.ph==='turn'){
  const els=now-B.t0;B.left=Math.max(0,Math.ceil(GLASS.pickSec-els/1000));
  if(B.choice===undefined&&!isHumanSlot(B.cur)&&now>=B.botAt)B.choice=glassBotPick(B.cur);
  if(B.choice===undefined&&els>GLASS.pickSec*1000){B.choice=Math.random()<.5?0:1;B.auto=true;B.need=[]}
  if(B.choice!==undefined){B.need=[];glassResolve(now)}
 }else if(B.ph==='jump'){
  const J=B.jump,u=Math.min(1,(now-B.t0)/GLASS.jumpMs),r=players[J.i].root;
  r.position.x=J.fx+(J.tx-J.fx)*u;r.position.z=J.fz+(J.tz-J.fz)*u;r.position.y=Math.sin(u*Math.PI)*1.0;r.rotation.y=Math.atan2(J.tx-J.fx,J.tz-J.fz);
  if(u>=1){
   r.position.y=0;
   if(J.ok){
    B.pos[J.i]=J.r;B.best[J.i]=Math.max(B.best[J.i],J.r);players[J.i].count=J.r;
    if(J.r>=GLASS.rows){B.ph='cross';B.t0=now;document.getElementById('status').textContent='🔷 '+players[J.i].name+' chegou à última fileira!'}
    else{B.ph='land';B.t0=now;document.getElementById('status').textContent='✅ '+players[J.i].name+' acertou! Fileira '+J.r+' de '+GLASS.rows+'.'}
    if(audioEnabled)sfxClick();
   }else{
    B.brk=[J.r,J.l];B.brkAt=now;B.seen[J.r]=J.l;B.falls[J.i]++;B.ph='fall';B.t0=now;
    document.getElementById('status').textContent='💥 O vidro '+GLASS_NAME[J.l]+' da fileira '+J.r+' quebrou! '+players[J.i].name+' caiu — memorize!';
    if(audioEnabled){noisePop(.35,.22,2600);tone(1500,.22,'triangle',.08,0,500)}
   }
  }
 }else if(B.ph==='fall'){
  const J=B.jump,el=now-B.t0,r=players[J.i].root,u=Math.min(1,el/GLASS.fallMs);
  r.position.y=-u*u*4.2;
  if(el>=GLASS.fallMs){const s=glassStartPos(J.i);r.position.set(s.x,0,s.z);r.rotation.y=Math.PI/2;B.pos[J.i]=0;players[J.i].count=0;B.ph='failhold';B.t0=now}
 }else if(B.ph==='failhold'){if(now-B.t0>GLASS.failHoldMs)glassNextTurn(now)}
 else if(B.ph==='land'){if(now-B.t0>GLASS.landMs)glassNextTurn(now)}
 else if(B.ph==='cross'){
  const J=B.jump,u=Math.min(1,(now-B.t0)/GLASS.crossMs),r=players[J.i].root,e=glassStartPosEnd(J.i);
  r.position.x=J.tx+(e.x-J.tx)*u;r.position.z=J.tz+(e.z-J.tz)*u;r.position.y=Math.abs(Math.sin(u*Math.PI*2))*.25;r.rotation.y=Math.PI/2;
  if(u>=1){r.position.y=0;B.win=J.i;B.pos[J.i]=GLASS.rows+1;players[J.i].count=GLASS.rows+1;B.ph='done';B.t0=now;document.getElementById('status').textContent='🏆 '+players[J.i].name+' atravessou a Ponte de Vidro!';if(audioEnabled)sfxFinish()}
 }else if(B.ph==='done'){if(now-B.t0>GLASS.endMs)glassFinish()}
}
function glassStartPosEnd(i){const act=activeIndices(),k=Math.max(0,act.indexOf(i)),n=act.length;return {x:GLASS.xEnd,z:(k-(n-1)/2)*.8}}
function glassFinish(){
 if(ended)return;
 ended=true;running=false;clearBots();
 const B=glass,act=activeIndices(),sc=i=>i===B.win?1000:B.best[i],ord=act.slice().sort((a,b)=>sc(b)-sc(a)||B.falls[a]-B.falls[b]),ranking=[],detail={};
 ord.forEach(i=>{
  const last=ranking[ranking.length-1];if(last&&sc(last[0])===sc(i)&&B.falls[last[0]]===B.falls[i])last.push(i);else ranking.push([i]);
  detail[i]=(i===B.win?'🏆 atravessou a ponte':'chegou à fileira '+B.best[i]+' de '+GLASS.rows)+' • '+B.falls[i]+(B.falls[i]===1?' queda':' quedas');
 });
 const lead=B.win>=0?players[B.win].name+' atravessou primeiro!':'Ninguém atravessou: venceu quem foi mais longe — '+ranking[0].map(i=>players[i].name).join(', ')+'.';
 document.getElementById('status').textContent=lead;
 showScoreScreen(ranking,'Ponte de Vidro',B.win>=0?'🔷 Travessia concluída!':'⏱ Fim do tempo!',lead,detail);
}
/* ---------- interface ---------- */
function glassChoose(c){
 const B=glassView();if(!B||B.ph!=='turn'||!B.need||!B.need.includes(humanIndex)||glassSentTurn===B.n)return;
 if(net.role==='client')netSendInput({k:'gc',c});else glassSetChoice(humanIndex,c);
 glassSentTurn=B.n;if(audioEnabled)sfxClick();
}
function glassUiUpdate(){
 const panel=document.getElementById('glassPick'),hud=document.getElementById('glassHud');if(!panel||!hud)return;
 const B=glassView(),on=gameMode==='glass'&&!!B;
 hud.classList.toggle('show',on);
 if(!on){panel.classList.remove('show');return}
 const act=activeIndices(),sig=act.map(i=>glassPosOf(i)).join(',');if(sig!==glassHudSig){glassHudSig=sig;if(typeof updateHud==='function')updateHud()}
 const cur=B.cur>=0&&players[B.cur]?players[B.cur].name:'';
 hud.textContent='🔷 '+(B.ph==='turn'?'Vez de '+cur+' • ⏱ '+B.left+'s':B.ph==='intro'||B.cur<0?'Preparando…':'Vez de '+cur)+'  |  Ordem: '+(B.ord||B.order||[]).map(i=>players[i]?players[i].name:'').join(' → ');
 const mine=B.ph==='turn'&&!!B.need&&B.need.includes(humanIndex)&&glassSentTurn!==B.n;
 panel.classList.toggle('show',mine);
 if(mine)document.getElementById('glassPickTitle').textContent='🔷 Sua vez! Escolha o vidro da fileira '+(glassPosOf(humanIndex)+1)+'  ('+B.left+'s)';
}
document.querySelectorAll('#glassPick button').forEach(b=>b.addEventListener('click',()=>glassChoose(Number(b.dataset.c))));
window.addEventListener('keydown',e=>{
 if(gameMode!=='glass')return;
 const m={ArrowUp:0,KeyW:0,Digit1:0,ArrowDown:1,KeyS:1,Digit2:1}[e.code];
 if(m===undefined)return;e.preventDefault();glassChoose(m);
});
function glassAudioCue(){
 const B=glassView();
 if(gameMode!=='glass'||!B){glassCueKey='';return}
 const key=B.n+':'+(B.ph==='turn'?'t':'x');if(key===glassCueKey)return;glassCueKey=key;
 if(B.ph==='turn'&&B.cur===humanIndex)sfxWhistle();
}
/* ---------- visual (todos): vidros, quebra e marcador ---------- */
function glassVisualUpdate(dt){
 if(gameMode!=='glass')return;
 const B=glassView(),now=performance.now(),client=net.role==='client';
 let brk=B&&B.brk?B.brk:null;
 if(brk){const key=brk[0]+':'+brk[1]+':'+(client?'':B.brkAt);if(client&&key!==glassBrkSeen){glassBrkSeen=key;glassBrkAt=now}else if(!client){glassBrkSeen=key;glassBrkAt=B.brkAt}}
 else glassBrkSeen='';
 const el=brk?now-glassBrkAt:0;
 glassPanes.forEach((row,ri)=>row.forEach((p,l)=>{
  const broken=!!brk&&brk[0]===ri+1&&brk[1]===l;
  if(!broken){p.m.visible=true;p.m.position.set(glassPaneX(ri+1),-.05,glassPaneZ(l));p.m.rotation.set(0,0,0);p.mt.opacity=.62;return}
  const u=Math.min(1,el/700);p.m.visible=u<1;p.m.position.y=-.05-u*u*3;p.m.rotation.z=u*.8;p.m.rotation.x=u*.5;p.mt.opacity=.62*(1-u);
 }));
 const m=glassMark;
 if(B&&B.cur>=0&&players[B.cur]&&(B.ph==='turn'||B.ph==='jump')){
  const p=players[B.cur].root;m.sp.visible=true;m.sp.position.set(p.position.x,2.55,p.position.z);
  glassDrawMark(B.ph==='turn'?'⏱ '+B.left+'s • SUA VEZ?':'🔷 pulou!',B.ph==='turn'?'#ffdf79':'#9fe8ff');
  if(B.ph==='turn')glassDrawMark(B.left+'s • vez de '+players[B.cur].name.slice(0,9),'#ffdf79');
 }else if(B&&brk&&(B.ph==='fall'||B.ph==='failhold')){
  m.sp.visible=true;m.sp.position.set(glassPaneX(brk[0]),1.4,glassPaneZ(brk[1]));glassDrawMark('💥 QUEBROU!','#ff6a5a');
 }else if(B&&B.ph==='done'&&B.win>=0&&players[B.win]){
  const p=players[B.win].root;m.sp.visible=true;m.sp.position.set(p.position.x,2.55,p.position.z);glassDrawMark('🏆 CHEGOU!','#ffdf79');
 }else m.sp.visible=false;
}
function glassSnapshot(){
 const B=glass;if(!B)return null;const n=players.length,pos=new Array(n).fill(0);
 activeIndices().forEach(i=>{pos[i]=B.pos[i]||0});
 return {ph:B.ph,n:B.n,cur:B.cur,left:B.left,need:B.need,pos,ord:B.order,brk:B.brk,win:B.win};
}
