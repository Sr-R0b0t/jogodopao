/* Minigame: Queimada — 2 times (2, 4, 6 ou 8 jogadores), uma linha no meio da quadra que ninguém pode cruzar.
   Bolas aparecem na quadra; pegue uma (chegue perto, do SEU lado), arremesse nos adversários: quem for acertado sai.
   O anfitrião (ou o modo offline) roda tudo; os convidados só recebem posições (S.dq no snapshot). */
const DODGE={W:7.4,D:8.4,r:.55,speed:6.4,accel:30,ballR:.38,throwV:13,drag:.22,spawnEvery:3200,time:90,hitR:.88,botReact:.32,maxBalls:n=>n<=2?3:n<=4?4:n<=6?5:6};
const DODGE_COLORS=['#3aa0ff','#ff4a4a'],DODGE_EMOJI=['🔵','🔴'];   // time 0 = lado de lá (z<0), time 1 = lado de cá (z>0)
const dodgeRoot=new THREE.Group();scene.add(dodgeRoot);dodgeRoot.visible=false;
/* quadra */
const dodgeHalves=[0,1].map(k=>{
 const m=new THREE.Mesh(new THREE.PlaneGeometry(DODGE.W*2,DODGE.D),new THREE.MeshStandardMaterial({color:k?'#6a3a4c':'#33527a',roughness:.8}));
 m.rotation.x=-Math.PI/2;m.position.set(0,.02,(k?1:-1)*DODGE.D/2);m.receiveShadow=true;dodgeRoot.add(m);return m;
});
{
 const base=new THREE.Mesh(new THREE.BoxGeometry(DODGE.W*2+1.4,.3,DODGE.D*2+1.4),mat('#2d3550',.6,.2));base.position.y=-.16;base.receiveShadow=true;dodgeRoot.add(base);
 const line=new THREE.Mesh(new THREE.BoxGeometry(DODGE.W*2,.05,.22),new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#ffffff',emissiveIntensity:.6}));line.position.set(0,.06,0);dodgeRoot.add(line);
 const wm=mat('#26384c',.5,.4),gm=new THREE.MeshStandardMaterial({color:'#9fe6ff',emissive:'#9fe6ff',emissiveIntensity:1.2});
 [[0,-DODGE.D-.35,DODGE.W*2+1.4,.7],[0,DODGE.D+.35,DODGE.W*2+1.4,.7]].forEach(([x,z,w,d])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,.7,d),wm);b.position.set(x,.35,z);b.castShadow=true;dodgeRoot.add(b)});
 [-1,1].forEach(s=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,DODGE.D*2),wm);b.position.set(s*(DODGE.W+.35),.35,0);b.castShadow=true;dodgeRoot.add(b)});
 // faixas luminosas dos lados
 [-1,1].forEach(s=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.1,.08,DODGE.D*2),gm);b.position.set(s*DODGE.W,.05,0);dodgeRoot.add(b)});
}
const dodgeBallMeshes=[];
for(let k=0;k<6;k++){
 const g=new THREE.Group(),m=new THREE.Mesh(new THREE.SphereGeometry(DODGE.ballR,24,18),new THREE.MeshStandardMaterial({color:'#ff6a2a',roughness:.45,metalness:.05,emissive:'#6a1d00',emissiveIntensity:.35}));
 m.castShadow=true;g.add(m);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(DODGE.ballR*.98,.035,8,28),new THREE.MeshBasicMaterial({color:'#fff3df'}));g.add(ring);
 const ring2=ring.clone();ring2.rotation.y=Math.PI/2;g.add(ring2);
 g.visible=false;dodgeRoot.add(g);dodgeBallMeshes.push(g);
}
const dodgeRings=players.map((p,i)=>{
 const r=new THREE.Mesh(new THREE.TorusGeometry(.8,.09,8,32),new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#ffffff',emissiveIntensity:1}));
 r.rotation.x=Math.PI/2;r.position.y=.07;r.visible=false;dodgeRoot.add(r);return r;
});
let dodge=null,dodgeClient=null,dodgeTeams=null;   // dodgeTeams: [[slots time0],[slots time1]]
const dodgeTeamOf=i=>dodgeTeams?(dodgeTeams[0].includes(i)?0:dodgeTeams[1].includes(i)?1:-1):-1;
const dodgeSideZ=t=>t===0?-1:1;
function applyDodgeTeams(teams){
 dodgeTeams=teams;if(!teams)return;
 dodgeHalves.forEach((h,k)=>h.material.color.set(DODGE_COLORS[k]).multiplyScalar(.55));
 teams.forEach((g,k)=>g.forEach(i=>{const m=dodgeRings[i].material;m.color.set(DODGE_COLORS[k]);m.emissive.set(DODGE_COLORS[k])}));
}
function setupDodge(){
 dodge=null;dodgeClient=null;dodgeTeams=null;
 dodgeHalves.forEach((h,k)=>h.material.color.set(k?'#6a3a4c':'#33527a'));
 dodgeRings.forEach(r=>{r.material.color.set('#ffffff');r.material.emissive.set('#ffffff')});
 const act=activeIndices();
 act.forEach((i,k)=>{const p=players[i];p.count=1;p.root.position.set(-DODGE.W+1+(k/(Math.max(1,act.length-1)))*(DODGE.W*2-2),0,k%2?2.5:-2.5);p.root.rotation.set(0,k%2?Math.PI:0,0);p.root.scale.setScalar(.9);p.root.visible=true});
 dodgeBallMeshes.forEach(m=>m.visible=false);
}
function dodgeAlive(t){return dodgeTeams[t].filter(i=>!dodge.out[i]).length}
function startDodge(){
 const now=performance.now(),act=activeIndices();
 const sh=act.slice().sort(()=>Math.random()-.5),h=sh.length/2;
 const teams=[sh.slice(0,h),sh.slice(h)];
 applyDodgeTeams(teams);
 dodge={balls:[],out:{},outAt:{},hold:{},vel:{},bot:{},t0:now+PRE_MS,nextSpawn:now+PRE_MS+900,spawned:0,end:0,throws:0,hits:0,lastThrow:{}};
 teams.forEach((g,k)=>g.forEach((i,j)=>{
  const p=players[i];p.count=1;p.root.visible=true;p.root.scale.setScalar(.9);p.root.rotation.set(0,k===0?0:Math.PI,0);
  p.root.position.set(-DODGE.W+1.4+(j+.5)/g.length*(DODGE.W*2-2.8),0,dodgeSideZ(k)*(DODGE.D*.55));dodge.vel[i]={x:0,z:0};
 }));
 // uma bola de cada lado logo no começo
 dodgeSpawnBall(0);dodgeSpawnBall(1);dodge.balls.forEach(b=>b.born=now+PRE_MS);
 const nm=g=>g.map(i=>players[i].name);
 const o={sub:'Sorteio dos times',title:'Queimada!',pool:act.map(i=>players[i].name),
  final:teams.map((g,k)=>({label:DODGE_EMOJI[k]+' Time '+(k+1),names:nm(g),color:DODGE_COLORS[k]}))};
 o.dodgeTeams=teams;runPreGame(o,'🏐 Queimada',nm(teams[0]).join(' + ')+'  x  '+nm(teams[1]).join(' + '));
 document.getElementById('status').textContent='🏐 '+nm(teams[0]).join(' + ')+'  x  '+nm(teams[1]).join(' + ')+'. Pegue uma bola e acerte os rivais — sem cruzar a linha!';
}
function dodgeSpawnBall(side){
 if(dodge.balls.length>=DODGE.maxBalls(activeIndices().length)+2)return;
 const x=(Math.random()*2-1)*(DODGE.W-1.2);
 dodge.balls.push({x,y:3.2,z:(side===0?-1:1)*(.5+Math.random()*1.4),vx:0,vz:0,st:0,team:-1,hold:-1,born:performance.now(),drop:true});
 dodge.spawned++;
}
/* ---- ações ---- */
function dodgeNearestEnemy(i){
 const t=dodgeTeamOf(i),p=players[i].root.position;let best=-1,bd=1e9;
 dodgeTeams[1-t].forEach(e=>{if(dodge.out[e])return;const q=players[e].root.position,d=Math.hypot(q.x-p.x,q.z-p.z);if(d<bd){bd=d;best=e}});
 return best;
}
function dodgeThrow(i,fromBot){
 if(!dodge||!running||dodge.out[i]||performance.now()<dodge.t0)return false;
 const bi=dodge.hold[i];if(bi===undefined)return false;
 const b=dodge.balls[bi],tgt=dodgeNearestEnemy(i);if(!b||tgt<0)return false;
 const p=players[i].root.position,q=players[tgt].root.position,v=dodge.vel[tgt]||{x:0,z:0};
 const dist=Math.hypot(q.x-p.x,q.z-p.z),tt=dist/DODGE.throwV;
 const dk=diffK();let tx=q.x+v.x*tt*(fromBot?.3+(dk-1)*.5:.8),tz=q.z+v.z*tt*(fromBot?.3+(dk-1)*.5:.8);
 let ang=Math.atan2(tz-p.z,tx-p.x)+(Math.random()-.5)*(fromBot?.5/(dk*dk):.1);
 b.st=2;b.team=dodgeTeamOf(i);b.hold=-1;b.vx=Math.cos(ang)*DODGE.throwV;b.vz=Math.sin(ang)*DODGE.throwV;b.x=p.x;b.z=p.z;b.y=1.15;b.owner=i;
 delete dodge.hold[i];dodge.throws++;dodge.lastThrow[i]=performance.now();
 players[i].root.rotation.y=Math.atan2(Math.cos(ang),Math.sin(ang));
 if(audioEnabled)dodgeSfxThrow();
 return true;
}
function dodgePress(){
 if(!running)return;
 if(net.role==='client'){netSendInput({k:'tap'});return}
 dodgeThrow(humanIndex);
}
function dodgeSfxThrow(){try{sfxWhoosh(.7)}catch(e){}}
function dodgeSfxHit(){try{sfxCream()}catch(e){}}
/* ---- IA dos bots ---- */
function dodgeBotVector(i,now){
 const t=dodgeTeamOf(i),pos=players[i].root.position,sz=dodgeSideZ(t),B=dodge.bot[i]||(dodge.bot[i]={react:0,home:(Math.random()*2-1)*(DODGE.W-1.5),throwAt:0});
 // desvio de bolas vindo na minha direção
 let dx=0,dz=0,danger=false;
 for(const b of dodge.balls){
  if(b.st!==2||b.team===t)continue;
  const rx=pos.x-b.x,rz=pos.z-b.z,d=Math.hypot(rx,rz),sp=Math.hypot(b.vx,b.vz)||1,along=(rx*b.vx+rz*b.vz)/sp;
  if(along<0||d>7.5)continue;
  const perp=Math.abs(rx*b.vz-rz*b.vx)/sp;
  if(perp<1.35){
   if(!B.react)B.react=now+DODGE.botReact*1000*(.6+Math.random()*.9)/(diffK()*diffK());
   if(now<B.react)continue;
   danger=true;const side=(rx*b.vz-rz*b.vx)>=0?1:-1;dx+=-b.vz/sp*side;dz+=b.vx/sp*side;
  }
 }
 if(!danger)B.react=0;
 if(danger){const l=Math.hypot(dx,dz)||1;return {x:dx/l,y:dz/l}}
 if(dodge.hold[i]!==undefined){                 // com bola: vai para perto da linha e arremessa
  if(!B.throwAt)B.throwAt=now+(500+Math.random()*1200)/diffK();
  if(now>B.throwAt){B.throwAt=0;dodgeThrow(i,true)}
  const gx=B.home-pos.x,gz=sz*2.2-pos.z,l=Math.hypot(gx,gz);
  return l>.3?{x:gx/l,y:gz/l}:{x:0,y:0};
 }
 B.throwAt=0;
 let best=null,bd=1e9;                          // procura bola solta do meu lado
 for(const b of dodge.balls){
  if(b.st!==0||b.drop||Math.sign(b.z)!==sz||Math.abs(b.z)<.2)continue;
  const d=Math.hypot(b.x-pos.x,b.z-pos.z);if(d<bd){bd=d;best=b}
 }
 if(best){const gx=best.x-pos.x,gz=best.z-pos.z,l=Math.hypot(gx,gz)||1;return {x:gx/l,y:gz/l}}
 const gx=B.home-pos.x,gz=sz*(DODGE.D*.6)-pos.z,l=Math.hypot(gx,gz);return l>.5?{x:gx/l*.5,y:gz/l*.5}:{x:0,y:0};
}
/* ---- atualização (anfitrião / offline) ---- */
function updateDodgeMode(now,dt){
 if(gameMode!=='dodge'||!running||!dodge||!dodgeTeams)return;
 const D=dodge,act=activeIndices(),started=now>=D.t0;
 // jogadores
 act.forEach(i=>{
  const p=players[i].root,t=dodgeTeamOf(i),v=D.vel[i]||(D.vel[i]={x:0,z:0});
  if(D.out[i]){                                                  // eliminado: cai e some
   const e=(now-D.outAt[i])/1000;p.rotation.z=Math.min(1.5,e*4);p.position.y=Math.max(0,.5-e*1.5);p.visible=e<.8;return;
  }
  let inp={x:0,y:0};
  if(started){
   if(isHumanSlot(i))inp=i===humanIndex?humanMoveVector():(net.mv[i]||{x:0,y:0});
   else inp=dodgeBotVector(i,now);
  }
  const l=Math.hypot(inp.x,inp.y);if(l>1){inp={x:inp.x/l,y:inp.y/l}}
  const spd=DODGE.speed*(isHumanSlot(i)?1:diffK()),k=Math.min(1,dt*DODGE.accel/spd);
  v.x+=(inp.x*spd-v.x)*k;v.z+=(inp.y*spd-v.z)*k;
  p.position.x+=v.x*dt;p.position.z+=v.z*dt;
  const sz=dodgeSideZ(t),zmin=sz<0?-DODGE.D+DODGE.r:.3+DODGE.r*.8,zmax=sz<0?-.3-DODGE.r*.8:DODGE.D-DODGE.r;
  p.position.x=Math.max(-DODGE.W+DODGE.r,Math.min(DODGE.W-DODGE.r,p.position.x));
  p.position.z=Math.max(zmin,Math.min(zmax,p.position.z));
  p.position.y=0;
  const e=dodgeNearestEnemy(i);
  if(e>=0){const q=players[e].root.position,want=Math.atan2(q.x-p.position.x,q.z-p.position.z);let d=want-p.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));p.rotation.y+=d*Math.min(1,dt*10)}
 });
 // bolas
 // bolas disponíveis por lado (soltas, no chão, sem estar na mão de alguém)
 const av=[0,0];D.balls.forEach(b=>{if(b.st===0)av[b.z<0?0:1]++});
 if(started&&now>=D.nextSpawn){
  const need=av[0]===0?0:av[1]===0?1:-1;                 // lado sem nenhuma bola: sempre ganha uma
  if(need>=0){dodgeSpawnBall(need);D.nextSpawn=now+1500}
  else if(D.balls.length<DODGE.maxBalls(act.length)){dodgeSpawnBall(av[0]<=av[1]?0:1);D.nextSpawn=now+DODGE.spawnEvery}
  else D.nextSpawn=now+800;
 }
 D.balls.forEach((b,bi)=>{
  if(b.st===1){                                                  // carregada: segue o jogador
   const o=players[b.hold].root.position,ry=players[b.hold].root.rotation.y;
   b.x=o.x+Math.sin(ry)*.55;b.z=o.z+Math.cos(ry)*.55;b.y=1.15;return;
  }
  if(b.drop){b.y-=dt*7;if(b.y<=DODGE.ballR){b.y=DODGE.ballR;b.drop=false}return}
  b.x+=b.vx*dt;b.z+=b.vz*dt;
  const sp=Math.hypot(b.vx,b.vz);
  if(b.st===2){
   b.vx*=1-DODGE.drag*dt;b.vz*=1-DODGE.drag*dt;
   if(sp<4.2){b.st=0;b.team=-1;b.y=DODGE.ballR}                  // perdeu força: vira bola solta
   else for(const e of dodgeTeams[1-b.team]){                     // acertou alguém do outro time?
    if(D.out[e])continue;const q=players[e].root.position;
    if(Math.hypot(q.x-b.x,q.z-b.z)<DODGE.hitR){
     D.out[e]=true;D.outAt[e]=now;D.hits++;players[e].count=0;delete D.hold[e];
     if(audioEnabled)dodgeSfxHit();
     b.vx*=-.35;b.vz*=-.35;b.st=0;b.team=-1;b.y=DODGE.ballR;
     document.getElementById('status').textContent='💥 '+players[e].name+' foi queimado por '+players[b.owner].name+'!';
     // bola que estava na mão do eliminado cai
     D.balls.forEach(o=>{if(o.st===1&&o.hold===e){o.st=0;o.hold=-1;o.y=DODGE.ballR;o.vx=0;o.vz=0}});
     if(!D.end&&(dodgeAlive(0)===0||dodgeAlive(1)===0))D.end=now+900;
     break;
    }
   }
  }else{b.vx*=Math.max(0,1-2.2*dt);b.vz*=Math.max(0,1-2.2*dt)}   // rolando devagar
  if(b.st===0&&Math.abs(b.z)<.5&&Math.hypot(b.vx,b.vz)<1.5){const to=av[0]<=av[1]?-1:1;b.vz=to*2.6}   // parada no meio: rola para o lado que precisa
  // paredes
  const W=DODGE.W-DODGE.ballR,Z=DODGE.D-DODGE.ballR;
  let wall=false;
  if(b.x>W){b.x=W;b.vx=-Math.abs(b.vx)*.7;wall=true}else if(b.x<-W){b.x=-W;b.vx=Math.abs(b.vx)*.7;wall=true}
  if(b.z>Z){b.z=Z;b.vz=-Math.abs(b.vz)*.7;wall=true}else if(b.z<-Z){b.z=-Z;b.vz=Math.abs(b.vz)*.7;wall=true}
  if(wall&&b.st===2){b.st=0;b.team=-1;b.y=DODGE.ballR}      // bateu na parede: não queima mais (só vale a bola direta)
 });
 // pegar bolas
 act.forEach(i=>{
  if(D.out[i]||D.hold[i]!==undefined||!started)return;
  const p=players[i].root.position,sz=dodgeSideZ(dodgeTeamOf(i));
  if(D.lastThrow[i]&&now-D.lastThrow[i]<500)return;
  for(let bi=0;bi<D.balls.length;bi++){
   const b=D.balls[bi];
   if(b.st!==0||b.drop||Math.sign(b.z)!==sz)continue;
   if(Math.hypot(b.x-p.x,b.z-p.z)<DODGE.r+DODGE.ballR+.25){b.st=1;b.hold=i;D.hold[i]=bi;b.vx=b.vz=0;break}
  }
 });
 // fim
 const left=Math.max(0,D.t0+DODGE.time*1000-now);
 const lt=document.getElementById('lastPlayerTimer');
 if(started&&left<=20000&&!D.end){lt.innerHTML='<strong>'+Math.ceil(left/1000)+'</strong><small>Tempo da queimada</small>';lt.classList.add('show');lt.classList.toggle('urgent',left<=10000)}
 else if(!D.end){lt.classList.remove('show','urgent')}
 if(D.end&&now>=D.end||started&&left<=0){lt.classList.remove('show','urgent');finishDodge()}
}
function finishDodge(){
 if(ended)return;
 ended=true;running=false;clearBots();
 const a0=dodgeAlive(0),a1=dodgeAlive(1),act=activeIndices(),gainsOv={},detail={};let ranking,headline,lead,sub;
 if(a0===a1){
  ranking=[act];act.forEach(i=>{gainsOv[i]=2;detail[i]='empate • '+a0+' vivo'+(a0===1?'':'s')+' de cada lado'});
  headline='🤝 Empate na queimada!';lead='Tempo esgotado com o mesmo número de jogadores vivos.';sub='Empate: 2 pts para cada jogador';
 }else{
  const w=a0>a1?0:1,W=dodgeTeams[w],L=dodgeTeams[1-w];
  ranking=[W,L];W.forEach(i=>{gainsOv[i]=RANK_POINTS[0];detail[i]='🏆 time vencedor • '+(w===0?a0:a1)+' vivo'+((w===0?a0:a1)===1?'':'s')});L.forEach(i=>{gainsOv[i]=0;detail[i]='time eliminado'});
  headline='🏐 Fim da queimada!';lead=DODGE_EMOJI[w]+' Time vencedor: '+W.map(i=>players[i].name).join(', ')+'.';
  sub='Time vencedor: '+RANK_POINTS[0]+' pts cada • time perdedor: 0 pt';
 }
 document.getElementById('status').textContent=lead;
 showScoreScreen(ranking,'Queimada',headline,lead,detail,gainsOv,sub);
}
/* ---- visual (todos) ---- */
let dodgeSeen={th:0,hit:0};
function dodgeVisualUpdate(dt){
 const on=gameMode==='dodge';
 if(!on)return;
 const client=net.role==='client'&&dodgeClient;
 // times no cliente vêm no snapshot
 if(client&&dodgeClient.tm&&(!dodgeTeams||JSON.stringify(dodgeTeams)!==JSON.stringify(dodgeClient.tm)))applyDodgeTeams(dodgeClient.tm);
 const nowT=performance.now(),t=nowT*.001;
 players.forEach((p,i)=>{
  const r=dodgeRings[i],team=dodgeTeamOf(i);
  const show=isActive(i)&&team>=0&&p.root.visible;
  r.visible=show;if(show){r.position.x=p.root.position.x;r.position.z=p.root.position.z;r.rotation.z=t*1.5}
 });
 const list=client?(net.ibDodge||dodgeClient.b):(dodge?dodge.balls.map(b=>[b.x,b.y,b.z,b.st,b.team]):[]);
 dodgeBallMeshes.forEach((m,k)=>{
  const b=list[k];m.visible=!!b;
  if(b){
   m.position.set(b[0],b[1],b[2]);
   m.rotation.x+=dt*(b[3]===2?14:b[3]===0?2:0);m.rotation.z+=dt*(b[3]===2?6:0);
  }
 });
 if(client){
  if(dodgeClient.th!==undefined&&dodgeClient.th!==dodgeSeen.th){if(dodgeClient.th>dodgeSeen.th&&audioEnabled)dodgeSfxThrow();dodgeSeen.th=dodgeClient.th}
  if(dodgeClient.hit!==undefined&&dodgeClient.hit!==dodgeSeen.hit){if(dodgeClient.hit>dodgeSeen.hit&&audioEnabled)dodgeSfxHit();dodgeSeen.hit=dodgeClient.hit}
 }
}
function dodgeSnapshot(){
 if(!dodge)return null;
 return {b:dodge.balls.map(b=>[r2(b.x),r2(b.y),r2(b.z),b.st,b.team]),tm:dodgeTeams,th:dodge.throws,hit:dodge.hits};
}
