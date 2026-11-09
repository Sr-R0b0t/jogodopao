/* Minigame: Arena de Lava — todos sobre uma plataforma redonda no meio da lava.
   Um FACHO DE FOGO gira a partir do pilar central (acelera e muda de sentido) e PUNHOS DE MAGMA caem em círculos marcados no chão.
   • Facho: PULE por cima dele (botão PULAR / Espaço / A). No ar você não queima.
   • Punhos: saia do círculo vermelho antes de o punho cair — não dá para pular por cima.
   Vence quem ficar vivo; se acabar o tempo, quem sobrou divide o 1º lugar (os demais pela ordem em que queimaram).
   O anfitrião (ou o modo offline) roda tudo; os convidados só recebem posições + facho/punhos (S.lv no snapshot). */
const LAVA={
 R:8.6,pillarR:.85,speed:6.6,accel:80,playerR:.34,
 time:45,startDelay:900,grace:1300,                       // duração da rodada (s) e pausa antes do facho começar
 w0:1.0,w1:1.9,wAcc:2.2,flipMin:4200,flipMax:7600,   // velocidade do facho (rad/s) no começo/fim, aceleração, intervalo entre inversões
 beamHalf:.36,beamLen:9.3,
 jumpMs:650,jumpH:1.1,safeY:.42,jumpCool:140,airControl:1,
 slamR:1.55,warnMs:1300,holdMs:750,riseMs:500,
 firstFist:4500,fistEvery0:3300,fistEvery1:1500
};
const lavaRoot=new THREE.Group();scene.add(lavaRoot);lavaRoot.visible=false;

/* ---------- cenário ---------- */
function lavaCanvasTexture(draw,repeat){
 const c=document.createElement('canvas');c.width=c.height=256;draw(c.getContext('2d'),256);
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const lavaFloorTex=lavaCanvasTexture((g,S)=>{
 g.fillStyle='#d94a00';g.fillRect(0,0,S,S);
 for(let i=0;i<140;i++){
  const x=Math.random()*S,y=Math.random()*S,r=10+Math.random()*34,hot=Math.random()<.55;
  for(const ox of [-S,0,S])for(const oy of [-S,0,S]){   // repete nas bordas (textura sem emenda)
   const gr=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,r);gr.addColorStop(0,hot?'rgba(255,200,60,.9)':'rgba(110,20,0,.7)');gr.addColorStop(1,'rgba(255,90,0,0)');
   g.fillStyle=gr;g.beginPath();g.arc(x+ox,y+oy,r,0,7);g.fill();
  }
 }
},9);
const lavaFloor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({map:lavaFloorTex,emissiveMap:lavaFloorTex,emissive:'#ffffff',emissiveIntensity:.85,color:'#ffb066',roughness:.7}));
lavaFloor.rotation.x=-Math.PI/2;lavaFloor.position.y=-.9;lavaRoot.add(lavaFloor);
{
 const rockM=mat('#3a2a26',.9,.05);
 for(let k=0;k<11;k++){
  const a=k/11*Math.PI*2+Math.random()*.4,r=R_ROCK(k),s=.5+Math.random()*.8;
  const m=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockM);m.position.set(Math.cos(a)*r,-.5+s*.15,Math.sin(a)*r);m.scale.y=.8;m.rotation.set(Math.random(),Math.random()*6,0);lavaRoot.add(m);
 }
}
function R_ROCK(k){return 10.5+(k%3)*2.6+Math.random()*1.5}
const lavaGrateTex=lavaCanvasTexture((g,S)=>{
 g.fillStyle='#2b2220';g.fillRect(0,0,S,S);
 const step=24;
 for(let y=0,row=0;y<S+step;y+=step*.866,row++)for(let x=(row%2)*step/2;x<S+step;x+=step){
  g.fillStyle='#ff8a1f';g.beginPath();g.arc(x,y,6.2,0,7);g.fill();
 }
},6);
{
 const plat=new THREE.Mesh(new THREE.CylinderGeometry(LAVA.R,LAVA.R-.15,.5,64),[mat('#2a2a30',.5,.5),new THREE.MeshStandardMaterial({map:lavaGrateTex,emissiveMap:lavaGrateTex,emissive:'#ffffff',emissiveIntensity:.75,roughness:.6,metalness:.2}),mat('#2a2a30',.6,.4)]);
 plat.position.y=-.25;plat.receiveShadow=true;lavaRoot.add(plat);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(LAVA.R+.05,.2,10,72),mat('#2f4a2c',.5,.35));rim.rotation.x=Math.PI/2;rim.position.y=.02;rim.castShadow=true;lavaRoot.add(rim);
 // raios (divisões) e anéis no chão, como grade de metal
 const barM=mat('#1d1a1a',.5,.5);
 for(let k=0;k<8;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(LAVA.R-.9,.05,.16),barM);const a=k/8*Math.PI*2;b.position.set(Math.cos(a)*(LAVA.R/2+.45),.03,Math.sin(a)*(LAVA.R/2+.45));b.rotation.y=-a;lavaRoot.add(b)}
 [2.9,5.8].forEach(r=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r,.07,6,64),barM);t.rotation.x=Math.PI/2;t.position.y=.04;lavaRoot.add(t)});
 // pilar central
 const pil=new THREE.Mesh(new THREE.CylinderGeometry(.72,.88,1.15,24),mat('#b9772c',.35,.7));pil.position.y=.55;pil.castShadow=true;lavaRoot.add(pil);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(.7,24,12,0,Math.PI*2,0,Math.PI/2),mat('#e0a040',.3,.8));dome.position.y=1.12;lavaRoot.add(dome);
}
/* facho de fogo: barra brilhante + bolas de fogo, girando em volta do pilar */
const lavaBeam=new THREE.Group();lavaBeam.position.y=.55;lavaRoot.add(lavaBeam);
const lavaBeamBalls=[];
{
 const L=LAVA.beamLen,core=new THREE.Mesh(new THREE.BoxGeometry(L-.8,.22,.2),new THREE.MeshBasicMaterial({color:'#ffe08a',transparent:true,opacity:.85}));core.position.x=.8+(L-.8)/2;lavaBeam.add(core);
 const halo=new THREE.Mesh(new THREE.BoxGeometry(L-.8,.1,LAVA.beamHalf*2.2),new THREE.MeshBasicMaterial({color:'#ff7a00',transparent:true,opacity:.38,depthWrite:false}));halo.position.set(.8+(L-.8)/2,-.1,0);lavaBeam.add(halo);
 for(let k=0;k<9;k++){
  const s=new THREE.Mesh(new THREE.SphereGeometry(.33,12,10),new THREE.MeshBasicMaterial({color:k%2?'#ffb21a':'#ff7a1a'}));s.position.x=1.1+k*(L-1.4)/8;lavaBeam.add(s);lavaBeamBalls.push(s);
 }
}
/* punhos de magma (marcador vermelho + punho que cai) */
const lavaFistPool=[];
{
 const magma=new THREE.MeshStandardMaterial({color:'#e8500c',emissive:'#ff3a00',emissiveIntensity:.55,roughness:.55}),dark=new THREE.MeshStandardMaterial({color:'#8a2a00',emissive:'#701a00',emissiveIntensity:.6,roughness:.8});
 for(let k=0;k<8;k++){
  const fist=new THREE.Group(),palm=new THREE.Mesh(new THREE.SphereGeometry(1.0,18,14),magma);palm.scale.set(1.15,1.0,1.0);palm.castShadow=true;fist.add(palm);
  for(let f=0;f<4;f++){const fg=new THREE.Mesh(new THREE.SphereGeometry(.42,12,10),f%2?magma:dark);fg.position.set(-.82+f*.55,-.12,.88);fist.add(fg)}
  const th=new THREE.Mesh(new THREE.SphereGeometry(.4,12,10),magma);th.position.set(1.15,-.05,.35);fist.add(th);
  fist.scale.setScalar(1.15);fist.visible=false;lavaRoot.add(fist);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(LAVA.slamR,40),new THREE.MeshBasicMaterial({color:'#ff2a1a',transparent:true,opacity:.4,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.06;disc.visible=false;lavaRoot.add(disc);
  const ring=new THREE.Mesh(new THREE.RingGeometry(LAVA.slamR-.12,LAVA.slamR,40),new THREE.MeshBasicMaterial({color:'#ffd0a0',transparent:true,opacity:.9,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.065;ring.visible=false;lavaRoot.add(ring);
  lavaFistPool.push({fist,disc,ring});
 }
}

/* ---------- estado ---------- */
let lava=null,lavaClient=null;
const lavaSeen={hit:0,sl:0,jm:0};
function lavaSetup(){
 lava=null;lavaClient=null;lavaSeen.hit=lavaSeen.sl=lavaSeen.jm=0;
 const act=activeIndices();
 act.forEach((i,k)=>{const p=players[i],a=k/act.length*Math.PI*2+.4;p.count=1;p.root.position.set(Math.cos(a)*5.8,0,Math.sin(a)*5.8);p.root.rotation.set(0,Math.atan2(-Math.cos(a),-Math.sin(a)),0);p.root.scale.setScalar(1);p.root.visible=true});
}
function startLava(){
 const now=performance.now(),act=activeIndices();
 lava={t0:now+LAVA.startDelay,a:.4+Math.PI/Math.max(2,act.length)*(1+2*Math.floor(Math.random()*Math.max(2,act.length)))*(Math.random()<.5?1:1),w:0,dir:Math.random()<.5?-1:1,nextFlip:now+LAVA.startDelay+5500,fists:[],nextFist:now+LAVA.startDelay+LAVA.firstFist,
  out:{},outAt:{},knock:{},vel:{},jump:{},cool:{},bot:{},end:0,hits:0,slams:0,jumps:0};
 act.forEach((i,k)=>{
  const p=players[i],a=k/act.length*Math.PI*2+.4;
  p.count=1;p.root.visible=true;p.root.scale.setScalar(1);p.root.position.set(Math.cos(a)*5.8,0,Math.sin(a)*5.8);p.root.rotation.set(0,Math.atan2(-Math.cos(a),-Math.sin(a)),0);lava.vel[i]={x:0,z:0};
 });
 document.getElementById('status').textContent='🔥 Pule o facho de fogo e fuja dos círculos vermelhos! Último vivo vence.';
}
const lavaAngDiff=d=>Math.atan2(Math.sin(d),Math.cos(d));
function lavaAlive(){return activeIndices().filter(i=>!lava.out[i])}
function lavaBurn(i,now,sx,sz,kind){
 const L=lava;if(L.out[i])return;
 const p=players[i].root.position;let dx=p.x-sx,dz=p.z-sz;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
 L.out[i]=true;L.outAt[i]=now;L.knock[i]={vx:dx*(kind==='beam'?5:3.2),vz:dz*(kind==='beam'?5:3.2),y0:p.y};
 players[i].count=0;L.hits++;delete L.jump[i];if(typeof updateHud==='function')updateHud();
 if(audioEnabled)lavaSfxBurn();
 document.getElementById('status').textContent='🔥 '+players[i].name+' foi queimado'+(kind==='beam'?' pelo facho!':' por um punho de magma!');
 const alive=lavaAlive().length;
 if(!L.end&&activeIndices().length>1&&alive<=1)L.end=now+1100;
}
/* ---------- ações ---------- */
function lavaJump(i,fromBot){
 const L=lava;if(!L||!running||L.out[i]||L.jump[i])return false;
 const now=performance.now();if(now<L.t0||now<(L.cool[i]||0))return false;
 L.jump[i]={t0:now};L.jumps++;
 if(audioEnabled)lavaSfxJump();
 return true;
}
function lavaPress(){
 if(!running)return;
 if(net.role==='client'){netSendInput({k:'tap'});return}
 lavaJump(humanIndex);
}
function lavaSfxJump(){try{tone(430,.12,'triangle',.07,0,860)}catch(e){}}
function lavaSfxBurn(){try{sfxCream()}catch(e){}}
function lavaSfxSlam(){try{noisePop(.35,.22,520);tone(70,.32,'sine',.2,0,40)}catch(e){}}
function lavaSfxWarn(){try{tone(540,.07,'square',.045);tone(540,.07,'square',.045,.14)}catch(e){}}
/* ---------- IA dos bots ---------- */
function lavaBotVector(i,now){
 const L=lava,p=players[i].root.position,k=diffK(),B=L.bot[i]||(L.bot[i]={react:0,pass:0,skip:false,jumpAt:0,wander:0,wx:0,wz:0});
 const r=Math.hypot(p.x,p.z),ang=Math.atan2(p.z,p.x);
 // facho: prevê quando ele chega até mim (simulando a aceleração/inversão) e pula na hora certa
 let hold=false;
 if(now>=L.t0){
  const half=Math.asin(Math.min(.95,(LAVA.beamHalf+LAVA.playerR)/Math.max(1.2,r))),el=Math.max(0,(now-L.t0)/1000),target=L.dir*(LAVA.w0+(LAVA.w1-LAVA.w0)*Math.min(1,el/LAVA.time));
  let aa=L.a,ww=L.w,tHit=9;
  for(let t=.02;t<=1.2;t+=.02){const dw=target-ww,st=LAVA.wAcc*.02;ww+=Math.abs(dw)<=st?dw:Math.sign(dw)*st;aa+=ww*.02;if(Math.abs(lavaAngDiff(ang-aa))<=half){tHit=t;break}}
  if(tHit<9){
   hold=true;                                                              // fica parado esperando o facho (andar muda o tempo de chegada)
   if(!B.pass){B.pass=1;B.skip=Math.random()<Math.max(0,.06+(1-k)*.55);B.lead=Math.max(.12,Math.min(.36,.325-half/Math.max(.5,Math.abs(L.w))+(Math.random()-.5)*.1*(2-k)))}
   if(!B.skip&&tHit<=B.lead&&!L.jump[i])lavaJump(i,true);
  }else B.pass=0;
 }
 // punhos: sai do círculo (com um pequeno atraso de reação)
 let inRange=false;
 for(const f of L.fists){
  const d=Math.hypot(p.x-f.x,p.z-f.z),el=now-f.t0;
  if(el>LAVA.warnMs+60||d>LAVA.slamR+1.1)continue;
  inRange=true;
  if(!B.react)B.react=now+(260+Math.random()*320)/(k*k);
  if(now<B.react)continue;
  let fx=p.x-f.x,fz=p.z-f.z;const l=Math.hypot(fx,fz);
  if(l<.15){fx=Math.cos(ang);fz=Math.sin(ang)}else{fx/=l;fz/=l}
  if(r>LAVA.R-1.1){const tx=-fz,tz=fx,s=(p.x*tx+p.z*tz)>=0?1:-1;fx=fx*.4+tx*s*.9;fz=fz*.4+tz*s*.9}      // na borda: foge de lado
  const m=Math.hypot(fx,fz)||1;return {x:fx/m,y:fz/m};
 }
 if(!inRange)B.react=0;
 if(hold)return {x:0,y:0};
 // sem perigo: passeia devagar pela plataforma, longe do pilar e da borda
 if(now>B.wander){B.wander=now+1500+Math.random()*2000;const a=Math.random()*Math.PI*2,rr=2.4+Math.random()*(LAVA.R-4.4);B.wx=Math.cos(a)*rr;B.wz=Math.sin(a)*rr}
 const gx=B.wx-p.x,gz=B.wz-p.z,l=Math.hypot(gx,gz);return l>.5?{x:gx/l*.55,y:gz/l*.55}:{x:0,y:0};
}
/* ---------- atualização (anfitrião / offline) ---------- */
function updateLavaMode(now,dt){
 if(gameMode!=='lava'||!running||!lava)return;
 const L=lava,act=activeIndices(),started=now>=L.t0,el=Math.max(0,(now-L.t0)/1000);
 // facho: velocidade cresce com o tempo e o sentido inverte de vez em quando (passando por uma desacelerada)
 if(started){
  const mag=LAVA.w0+(LAVA.w1-LAVA.w0)*Math.min(1,el/LAVA.time);
  if(now>=L.nextFlip){L.dir*=-1;L.nextFlip=now+LAVA.flipMin+Math.random()*(LAVA.flipMax-LAVA.flipMin)}
  const target=L.dir*mag,dw=target-L.w,step=LAVA.wAcc*dt;
  L.w+=Math.abs(dw)<=step?dw:Math.sign(dw)*step;
  L.a+=L.w*dt;
 }
 // novos punhos
 if(started&&now>=L.nextFist&&!L.end){
  const prog=Math.min(1,el/LAVA.time),n=el>32?3:el>18?2:1,alive=lavaAlive();
  for(let k=0;k<n&&alive.length;k++){
   const tg=alive[Math.floor(Math.random()*alive.length)],q=players[tg].root.position,v=L.vel[tg]||{x:0,z:0},lead=.55;
   let x=q.x+v.x*lead+(Math.random()-.5)*1.2,z=q.z+v.z*lead+(Math.random()-.5)*1.2;const rr=Math.hypot(x,z),mx=LAVA.R-.6;if(rr>mx){x*=mx/rr;z*=mx/rr}
   if(L.fists.length<8)L.fists.push({x,z,t0:now+k*220,hit:false});
  }
  if(audioEnabled)lavaSfxWarn();
  L.nextFist=now+LAVA.fistEvery0+(LAVA.fistEvery1-LAVA.fistEvery0)*prog+Math.random()*500;
 }
 // punhos: impacto (uma vez) e remoção
 L.fists=L.fists.filter(f=>{
  const e=now-f.t0;
  if(!f.hit&&e>=LAVA.warnMs){
   f.hit=true;L.slams++;if(audioEnabled)lavaSfxSlam();
   act.forEach(i=>{if(L.out[i])return;const q=players[i].root.position;if(Math.hypot(q.x-f.x,q.z-f.z)<LAVA.slamR)lavaBurn(i,now,f.x,f.z,'fist')});
  }
  return e<LAVA.warnMs+LAVA.holdMs+LAVA.riseMs;
 });
 // jogadores
 act.forEach(i=>{
  const p=players[i].root,v=L.vel[i]||(L.vel[i]={x:0,z:0});
  if(L.out[i]){                                                   // queimado: é arremessado para a lava
   const e=(now-L.outAt[i])/1000,kn=L.knock[i];
   p.position.x+=kn.vx*dt;p.position.z+=kn.vz*dt;p.position.y=kn.y0+1.6*e-7*e*e;p.rotation.x+=dt*9;p.rotation.z+=dt*5;p.visible=p.position.y>-2.2&&e<1.6;return;
  }
  let inp={x:0,y:0};
  if(started){
   if(isHumanSlot(i))inp=i===humanIndex?humanMoveVector():(net.mv[i]||{x:0,y:0});
   else inp=lavaBotVector(i,now);
  }
  const l=Math.hypot(inp.x,inp.y);if(l>1)inp={x:inp.x/l,y:inp.y/l};
  const jmp=L.jump[i],spd=LAVA.speed*(isHumanSlot(i)?1:Math.min(1.1,diffK()))*(jmp?LAVA.airControl:1),k=Math.min(1,dt*LAVA.accel/spd);
  v.x+=(inp.x*spd-v.x)*k;v.z+=(inp.y*spd-v.z)*k;
  p.position.x+=v.x*dt;p.position.z+=v.z*dt;
  let r=Math.hypot(p.position.x,p.position.z);const rmax=LAVA.R-.4,rmin=LAVA.pillarR+LAVA.playerR;
  if(r>rmax){p.position.x*=rmax/r;p.position.z*=rmax/r}else if(r<rmin){const a=Math.atan2(p.position.z,p.position.x);p.position.x=Math.cos(a)*rmin;p.position.z=Math.sin(a)*rmin}
  // pulo
  if(jmp){const u=(now-jmp.t0)/LAVA.jumpMs;if(u>=1){delete L.jump[i];L.cool[i]=now+LAVA.jumpCool;p.position.y=0}else p.position.y=LAVA.jumpH*4*u*(1-u)}
  else p.position.y=0;
  if(Math.hypot(v.x,v.z)>.8){const want=Math.atan2(v.x,v.z);let d=want-p.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));p.rotation.y+=d*Math.min(1,dt*12)}
 });
 // facho acerta quem está no chão
 if(started&&now>=L.t0+LAVA.grace)act.forEach(i=>{
  if(L.out[i])return;const q=players[i].root.position;if(q.y>LAVA.safeY)return;
  const ca=Math.cos(L.a),sa=Math.sin(L.a),along=q.x*ca+q.z*sa,perp=-q.x*sa+q.z*ca;
  if(along>LAVA.pillarR-.1&&along<LAVA.beamLen&&Math.abs(perp)<LAVA.beamHalf+LAVA.playerR)lavaBurn(i,now,q.x-(perp>=0?-sa:sa)*1,q.z-(perp>=0?ca:-ca)*1,'beam');
 });
 // fim
 const left=Math.max(0,L.t0+LAVA.time*1000-now),lt=document.getElementById('lastPlayerTimer');
 if(started&&!L.end){lt.innerHTML='<strong>'+Math.ceil(left/1000)+'</strong><small>Sobreviva!</small>';lt.classList.add('show');lt.classList.toggle('urgent',left<=10000)}
 if(L.end&&now>=L.end||started&&left<=0){lt.classList.remove('show','urgent');finishLava()}
}
function finishLava(){
 if(ended)return;
 ended=true;running=false;clearBots();
 const L=lava,act=activeIndices(),alive=act.filter(i=>!L.out[i]),dead=act.filter(i=>L.out[i]).sort((a,b)=>L.outAt[b]-L.outAt[a]);
 const ranking=[],detail={};
 if(alive.length){ranking.push(alive);alive.forEach(i=>detail[i]='🏆 sobreviveu até o fim')}
 let grp=[];
 dead.forEach((i,k)=>{
  grp.push(i);
  const nxt=dead[k+1];
  if(nxt===undefined||L.outAt[i]-L.outAt[nxt]>350){ranking.push(grp);grp.forEach(j=>detail[j]='🔥 queimou aos '+Math.max(0,Math.round((L.outAt[j]-L.t0)/1000))+'s');grp=[]}
 });
 let headline,lead;
 if(alive.length===1){headline='🏆 Fim da rodada!';lead='Vencedor: '+players[alive[0]].name+' — o último vivo!'}
 else if(alive.length>1){headline='⏱ Tempo esgotado!';lead=alive.length+' sobreviventes dividem o 1º lugar: '+alive.map(i=>players[i].name).join(', ')+'.'}
 else{headline='🔥 Todos queimaram!';lead='Venceu quem durou mais: '+players[dead[0]].name+'.'}
 document.getElementById('status').textContent=lead;
 showScoreScreen(ranking,'Arena de Lava',headline,lead,detail);
}
/* ---------- visual (todos) ---------- */
function lavaVisualUpdate(dt){
 if(gameMode!=='lava')return;
 const client=net.role==='client'&&lavaClient,nowT=performance.now(),t=nowT*.001;
 lavaFloorTex.offset.x=(t*.012)%1;lavaFloorTex.offset.y=(t*.007)%1;
 let a=0,fists=[];
 if(client){const age=Math.min(.25,(nowT-lavaClient.rt)/1000);a=lavaClient.a+lavaClient.w*age;fists=lavaClient.f||[]}
 else if(lava){a=lava.a;fists=lava.fists.map(f=>{const e=nowT-f.t0;
  if(e<0)return null;
  if(e<LAVA.warnMs)return [f.x,f.z,0,e/LAVA.warnMs];
  if(e<LAVA.warnMs+LAVA.holdMs)return [f.x,f.z,1,(e-LAVA.warnMs)/LAVA.holdMs];
  return [f.x,f.z,2,(e-LAVA.warnMs-LAVA.holdMs)/LAVA.riseMs]}).filter(Boolean)}
 lavaBeam.rotation.y=-a;
 lavaBeamBalls.forEach((s,k)=>{const q=1+Math.sin(t*14+k*.9)*.14;s.scale.setScalar(q)});
 lavaFistPool.forEach((o,k)=>{
  const f=fists[k];
  if(!f){o.fist.visible=o.disc.visible=o.ring.visible=false;return}
  const [x,z,ph,p]=f;
  o.disc.position.x=o.ring.position.x=x;o.disc.position.z=o.ring.position.z=z;o.fist.position.x=x;o.fist.position.z=z;
  if(ph===0){
   o.disc.visible=o.ring.visible=true;o.disc.material.opacity=.22+.3*(.5+.5*Math.sin(t*16))*(.4+p*.6);o.ring.scale.setScalar(1.35-.35*p);o.ring.material.opacity=.35+.5*p;
   if(p>.76){const u=Math.min(1,(p-.76)/.24);o.fist.visible=true;o.fist.position.y=9-(9-1.0)*u*u}else o.fist.visible=false;
  }else{
   o.disc.visible=false;o.ring.visible=false;o.fist.visible=true;
   if(ph===1){o.fist.position.y=1.0+Math.max(0,.18-p*.5)*Math.sin(p*40)}
   else o.fist.position.y=1.0+8*p*p;
  }
 });
 if(client){
  const c=lavaClient;
  if(c.hit!==undefined&&c.hit!==lavaSeen.hit){if(c.hit>lavaSeen.hit&&audioEnabled)lavaSfxBurn();lavaSeen.hit=c.hit}
  if(c.sl!==undefined&&c.sl!==lavaSeen.sl){if(c.sl>lavaSeen.sl&&audioEnabled)lavaSfxSlam();lavaSeen.sl=c.sl}
  if(c.jm!==undefined&&c.jm!==lavaSeen.jm){if(c.jm>lavaSeen.jm&&audioEnabled)lavaSfxJump();lavaSeen.jm=c.jm}
 }
}
function lavaSnapshot(){
 if(!lava)return null;const now=performance.now();
 return {a:Math.round(lava.a*1000)/1000,w:Math.round(lava.w*1000)/1000,
  f:lava.fists.map(f=>{const e=now-f.t0;if(e<0)return null;return e<LAVA.warnMs?[r2(f.x),r2(f.z),0,r2(e/LAVA.warnMs)]:e<LAVA.warnMs+LAVA.holdMs?[r2(f.x),r2(f.z),1,r2((e-LAVA.warnMs)/LAVA.holdMs)]:[r2(f.x),r2(f.z),2,r2((e-LAVA.warnMs-LAVA.holdMs)/LAVA.riseMs)]}).filter(Boolean),
  hit:lava.hits,sl:lava.slams,jm:lava.jumps};
}
