/* Minigame: Batata Quente — cada um por si. Uma única batata-bomba passa de mão em mão: quem está com ela escolhe para quem jogar.
   O tempo da bomba é secreto; quando explode, quem está segurando é eliminado. O último na arena vence.
   O anfitrião/offline roda tudo; os convidados recebem o estado (potatoSnapshot) e só enviam "selecionar" e "jogar". */
const POTATO={introMs:2200,holdMs:5000,fuseMin:9000,fuseMax:19000,flightMs:430,boomMs:1700,radius:3.7};
const potatoRoot=new THREE.Group();scene.add(potatoRoot);potatoRoot.visible=false;
const ptPads=[],ptSpud=new THREE.Group(),ptBoom=new THREE.Group(),ptMark=new THREE.Group();
let ptSpudBody,ptSpark,ptEyes=[];
{
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(60,40),mat('#2c2236',.95,.05));fl.rotation.x=-Math.PI/2;fl.position.y=-.9;potatoRoot.add(fl);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(5.6,5.8,.7,56),mat('#7a3d2b',.6,.15));base.position.y=-.55;potatoRoot.add(base);
 const top=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.3,56),mat('#f0cf9e',.6,.05));top.position.y=-.16;top.receiveShadow=true;potatoRoot.add(top);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(5.2,.16,10,64),mat('#e8602c',.45,.2));rim.rotation.x=Math.PI/2;potatoRoot.add(rim);
 const core=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.06,32),mat('#d9a066',.7,0));core.position.y=.02;potatoRoot.add(core);
 // batata: corpo marrom/vermelho com olhos
 ptSpudBody=new THREE.Mesh(new THREE.SphereGeometry(.55,24,18),mat('#b9783d',.55,.05));ptSpudBody.scale.set(1.15,.85,.9);ptSpud.add(ptSpudBody);
 for(const sx of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.12,12,10),new THREE.MeshBasicMaterial({color:'#fff'}));e.position.set(.2*sx,.12,.44);const pu=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),new THREE.MeshBasicMaterial({color:'#111'}));pu.position.set(0,0,.09);e.add(pu);ptSpud.add(e);ptEyes.push(e)}
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,14,Math.PI),new THREE.MeshBasicMaterial({color:'#3a160e'}));mouth.position.set(0,-.1,.49);mouth.rotation.z=Math.PI;ptSpud.add(mouth);
 const fuse=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.3,6),mat('#3a2a1a',.8,0));fuse.position.set(0,.55,0);ptSpud.add(fuse);
 ptSpark=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshBasicMaterial({color:'#ffd54a'}));ptSpark.position.set(0,.74,0);ptSpud.add(ptSpark);
 ptSpud.visible=false;potatoRoot.add(ptSpud);
 // explosão
 const eb=new THREE.Mesh(new THREE.SphereGeometry(1,20,16),new THREE.MeshBasicMaterial({color:'#ffb12a',transparent:true,opacity:.9}));ptBoom.add(eb);
 const er=new THREE.Mesh(new THREE.TorusGeometry(1,.12,8,32),new THREE.MeshBasicMaterial({color:'#ff5a2a',transparent:true,opacity:.9}));er.rotation.x=Math.PI/2;ptBoom.add(er);
 ptBoom.visible=false;potatoRoot.add(ptBoom);
 // marcador do alvo selecionado
 const cone=new THREE.Mesh(new THREE.ConeGeometry(.35,.7,4),new THREE.MeshBasicMaterial({color:'#ffe14a'}));cone.rotation.x=Math.PI;cone.position.y=.4;ptMark.add(cone);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.09,8,28),new THREE.MeshBasicMaterial({color:'#ffe14a'}));ring.rotation.x=Math.PI/2;ring.position.y=-1.05;ptMark.add(ring);
 ptMark.visible=false;potatoRoot.add(ptMark);
}
/* ---------- estado ---------- */
let potato=null,potatoClient=null,ptSeats=[],ptSentKey=-1,ptHudSig='',ptCue={k:'',t:0,beat:0},ptFly={key:-1,t0:0,from:-1,to:-1},ptBoomT0=0,ptBoomKey=-1;
const potatoView=()=>net.role==='client'?potatoClient:potato;
function ptSeatPos(i){const k=ptSeats.indexOf(i),n=Math.max(1,ptSeats.length),a=-Math.PI/2+k/n*Math.PI*2;return {x:Math.cos(a)*POTATO.radius,z:Math.sin(a)*POTATO.radius*.92,a}}
function ptCircle(B){return ptSeats.filter(i=>B.al.includes(i))}
function potatoValid(B){   // alvos possíveis de quem segura (na ordem do círculo)
 if(!B||B.h===undefined||B.h<0)return [];
 let l=ptCircle(B).filter(i=>i!==B.h);if(l.length>1&&B.pv!==undefined&&B.pv>=0)l=l.filter(i=>i!==B.pv);return l;
}
function ptNextOf(B,from,d){   // próximo alvo válido no sentido d (+1/-1) a partir de "from"
 const v=potatoValid(B);if(!v.length)return -1;
 const c=ptCircle(B),n=c.length;let k=c.indexOf(from);if(k<0)k=c.indexOf(B.h);
 for(let s=1;s<=n;s++){const x=c[((k+d*s)%n+n)%n];if(v.includes(x))return x}
 return v[0];
}
function setupPotato(){
 potato=null;potatoClient=null;ptSentKey=-1;
 ptSeats=activeIndices().slice();
 ptPads.forEach(m=>potatoRoot.remove(m));ptPads.length=0;
 ptSeats.forEach(i=>{const s=ptSeatPos(i),p=players[i];
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.1,28),mat(specs[i].team||'#ddd',.45,.1));pad.position.set(s.x,.02,s.z);potatoRoot.add(pad);ptPads.push(pad);
  p.count=1;p.root.position.set(s.x,0,s.z);p.root.rotation.set(0,Math.atan2(-s.x,-s.z),0);p.root.scale.setScalar(.95);p.root.visible=true});
 ptSpud.visible=false;ptBoom.visible=false;ptMark.visible=false;
}
function startPotato(){
 const al=ptSeats.slice(),now=performance.now();
 potato={ph:'intro',t0:now,al,h:-1,pv:-1,sel:undefined,key:Math.floor(Math.random()*1e6),ht:0,hold:5,th:0,vic:-1,ord:[],fuse:0,fuse0:1,holdAt:0,botAt:0,flightEnd:0};
 document.getElementById('status').textContent='🥔 BATATA QUENTE! Passe a batata antes que ela exploda. Quem estiver com ela quando explodir está fora!';
 al.forEach(i=>players[i].count=1);
}
function ptGive(to,now,from){   // entrega a batata
 const B=potato;B.pv=from===undefined?-1:from;B.h=to;B.holdAt=now+(from===undefined?0:POTATO.flightMs);B.key++;
 B.th=from===undefined?0:[from,to];B.flightEnd=now+(from===undefined?300:POTATO.flightMs);
 B.sel=isHumanSlot(to)?ptNextOf(B,to,1):undefined;if(B.sel<0)B.sel=undefined;
 B.botAt=B.holdAt+700+Math.random()*1400;
 document.getElementById('status').textContent='🥔 '+players[to].name+' está com a batata! Passe logo!';
}
function potatoSelect(slot,d){
 const B=potato;if(!B||B.ph!=='play'||slot!==B.h)return;
 const n=ptNextOf(B,B.sel===undefined?B.h:B.sel,d<0?-1:1);if(n>=0)B.sel=n;
}
function potatoThrow(slot,c){
 const B=potato,now=performance.now();if(!B||B.ph!=='play'||slot!==B.h||now<B.flightEnd)return;
 const v=potatoValid(B);if(!v.length)return;
 c=c===undefined||c===null?B.sel:Math.round(Number(c));if(!v.includes(c))c=B.sel!==undefined&&v.includes(B.sel)?B.sel:v[0];
 fx('whoosh');ptGive(c,now,slot);
}
function ptExplode(now){
 const B=potato,v=B.h;B.ph='boom';B.t0=now;B.vic=v;B.al=B.al.filter(i=>i!==v);B.ord.push(v);B.key++;B.th=0;B.sel=undefined;
 players[v].count=0;fx('boom');
 document.getElementById('status').textContent='💥 BOOM! '+players[v].name+' explodiu e está eliminado!'+(B.al.length>1?' Restam '+B.al.length+'.':'');
}
function updatePotatoMode(now,dt){
 if(gameMode!=='potato'||!running||!potato)return;
 const B=potato;
 if(B.ph==='intro'){
  if(now-B.t0>POTATO.introMs){B.ph='play';B.fuse0=B.fuse=POTATO.fuseMin+Math.random()*(POTATO.fuseMax-POTATO.fuseMin);ptGive(B.al[Math.floor(Math.random()*B.al.length)],now)}
 }else if(B.ph==='play'){
  B.fuse-=dt*1000;B.ht=Math.max(0,Math.min(1,1-B.fuse/B.fuse0));
  B.hold=Math.max(0,Math.ceil((POTATO.holdMs-(now-B.holdAt))/1000));
  if(B.fuse<=0){ptExplode(now);return}
  if(now>=B.flightEnd){
   if(!isHumanSlot(B.h)){if(now>=B.botAt){const v=potatoValid(B);if(v.length)potatoThrow(B.h,v[Math.floor(Math.random()*v.length)])}}
   else if(now-B.holdAt>=POTATO.holdMs){const v=potatoValid(B);if(v.length)potatoThrow(B.h,v[Math.floor(Math.random()*v.length)])}
  }
 }else if(B.ph==='boom'){
  const el=now-B.t0,r=players[B.vic].root,u=el/1000,s=ptSeatPos(B.vic);
  if(el<POTATO.boomMs){r.position.set(s.x*(1+u*.9),Math.min(9,u*8),s.z*(1+u*.9));r.rotation.y+=dt*12}
  else{r.position.set(0,-40,0)}
  if(el>POTATO.boomMs+250){
   if(B.al.length<=1){potatoFinish();return}
   B.ph='play';B.fuse0=B.fuse=POTATO.fuseMin+Math.random()*(POTATO.fuseMax-POTATO.fuseMin);B.ht=0;B.pv=-1;
   ptGive(B.al[Math.floor(Math.random()*B.al.length)],now);
  }
 }
}
function potatoFinish(){
 if(ended)return;
 const B=potato;ended=true;running=false;clearBots();B.ph='done';B.key++;
 const w=B.al[0],ranking=[[w]],detail={};
 for(let k=B.ord.length-1;k>=0;k--)ranking.push([B.ord[k]]);
 detail[w]='🏆 Última pessoa na arena';B.ord.forEach((i,k)=>{detail[i]='💥 Explodiu na '+(k+1)+'ª explosão'});
 ptSeats.forEach(i=>{if(!ranking.some(r=>r.includes(i)))ranking.push([i])});
 const lead=players[w].name+' sobreviveu à batata quente!';
 document.getElementById('status').textContent='🏆 '+lead;
 showScoreScreen(ranking,'Batata Quente','🥔 Fim da batata quente!',lead,detail);
}
/* ---------- entrada local (humano deste aparelho) ---------- */
function potatoChoose(c){   // c = alvo direto (botão) ou undefined = alvo selecionado
 const B=potatoView();if(!B||B.ph!=='play'||B.h!==humanIndex)return;
 if(net.role==='client')netSendInput({k:'pt',c});else potatoThrow(humanIndex,c);
 if(audioEnabled)sfxClick();
}
function potatoCycle(d){
 const B=potatoView();if(!B||B.ph!=='play'||B.h!==humanIndex)return;
 if(net.role==='client')netSendInput({k:'pn',d});else potatoSelect(humanIndex,d);
}
window.addEventListener('keydown',e=>{
 if(gameMode!=='potato'||!running)return;
 if(e.code==='ArrowLeft'||e.code==='KeyA'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();potatoCycle(-1)}
 else if(e.code==='ArrowRight'||e.code==='KeyD'||e.code==='ArrowDown'||e.code==='KeyS'){e.preventDefault();potatoCycle(1)}
 else if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)potatoChoose()}
});
function potatoChip(i){
 const B=potatoView();if(!B)return 'VIVO';
 if(!(B.al||[]).includes(i))return 'FORA';
 return B.h===i&&B.ph==='play'?'🥔 BATATA!':'VIVO';
}
function potatoUiUpdate(){
 const panel=document.getElementById('potatoPick');if(!panel)return;
 const B=potatoView(),on=gameMode==='potato'&&!!B;
 if(net.role==='client'&&B&&B.seats)ptSeats=B.seats;
 if(!on){panel.classList.remove('show');return}
 const sig=(B.al||[]).join(',')+'|'+B.h+'|'+B.ph;if(sig!==ptHudSig){ptHudSig=sig;if(typeof updateHud==='function')updateHud()}
 const mine=B.ph==='play'&&B.h===humanIndex,v=mine?potatoValid(B):[],key=v.join(',')+'|'+B.key+'|'+B.sel;
 panel.classList.toggle('show',mine&&v.length>0);
 if(panel.dataset.k!==key){panel.dataset.k=key;
  const box=document.getElementById('potatoBtns');box.innerHTML='';
  v.forEach(i=>{const b=document.createElement('button');b.type='button';b.textContent=players[i].name;b.style.background=specs[i].team||'#ddd';if(i===B.sel)b.classList.add('sel');b.addEventListener('click',()=>potatoChoose(i));box.append(b)});
 }
}
function potatoAudioCue(){
 const B=potatoView();if(gameMode!=='potato'||!B||B.ph!=='play'||!running){return}
 const now=performance.now(),gap=Math.max(120,720-B.ht*600);
 if(now-ptCue.t>gap){ptCue.t=now;fxPlayLocal('tick',B.ht)}
}
/* ---------- visual (todos) ---------- */
function potatoVisualUpdate(dt){
 if(gameMode!=='potato'){return}
 const B=potatoView(),now=performance.now();
 if(net.role==='client'&&B&&B.seats)ptSeats=B.seats;
 if(!B){ptSpud.visible=false;ptBoom.visible=false;ptMark.visible=false;return}
 if(B.key!==ptFly.key){ptFly.key=B.key;ptFly.t0=now;ptFly.th=B.th||0}
 const t=now/1000;
 // bom: coloca as bases no lugar certo / esconde as dos eliminados
 ptSeats.forEach((i,k)=>{if(ptPads[k])ptPads[k].visible=(B.al||[]).includes(i)||B.vic===i});
 if(B.ph==='play'||B.ph==='intro'){
  ptBoom.visible=false;
  const holder=B.ph==='play'?B.h:-1;
  if(holder>=0&&players[holder]){
   const hp=ptSeatPos(holder);let x=hp.x,z=hp.z,y=2.95+Math.sin(t*5)*.12;
   if(ptFly.th&&now-ptFly.t0<POTATO.flightMs){const f=(now-ptFly.t0)/POTATO.flightMs,a=ptSeatPos(ptFly.th[0]);x=a.x+(hp.x-a.x)*f;z=a.z+(hp.z-a.z)*f;y=2.95+Math.sin(f*Math.PI)*2.2}
   ptSpud.position.set(x,y,z);ptSpud.visible=true;
  }else{ptSpud.position.set(0,1.6+Math.sin(t*3)*.2,0);ptSpud.visible=B.ph==='intro'}
  const h=B.ht||0,pulse=1+Math.sin(t*(7+h*38))*(.05+h*.12);ptSpud.scale.setScalar(pulse*(1+h*.18));
  ptSpudBody.material.color.setRGB(.72+h*.28,.47*(1-h*.7),.24*(1-h));
  ptSpark.visible=Math.sin(t*(20+h*40))>-.2;ptSpud.rotation.y=Math.sin(t*3)*.4;
 }else if(B.ph==='boom'){
  ptSpud.visible=false;if(ptBoomKey!==B.key){ptBoomKey=B.key;ptBoomT0=now}
  const el=(now-ptBoomT0)/1000,s=ptSeatPos(B.vic),k=Math.min(1,el/.7);
  ptBoom.visible=k<1;ptBoom.position.set(s.x,2.2,s.z);ptBoom.scale.setScalar(.4+k*3.2);
  ptBoom.children.forEach(c=>{c.material.opacity=.9*(1-k)});
 }else{ptSpud.visible=false;ptBoom.visible=false}
 // alvo selecionado (cursor)
 const show=B.ph==='play'&&B.sel!==undefined&&B.sel>=0&&(B.al||[]).includes(B.sel)&&B.h>=0;
 ptMark.visible=!!show;if(show){const s=ptSeatPos(B.sel);ptMark.position.set(s.x,3.3+Math.sin(t*8)*.15,s.z)}
}
function potatoSnapshot(){
 const B=potato;if(!B)return null;
 return {ph:B.ph,key:B.key,al:B.al,h:B.h,pv:B.pv,sel:B.sel,ht:Math.round(B.ht*100)/100,hold:B.hold,th:B.th,vic:B.vic,seats:ptSeats};
}
