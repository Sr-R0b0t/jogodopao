/* Minigame: Batalha das Bolas — empurre os rivais para fora da arena. */
const arenaRing=new THREE.Mesh(new THREE.TorusGeometry(6.25,.16,12,96),mat('#ffcf63',.35));
arenaRing.rotation.x=Math.PI/2;arenaRing.position.y=.02;scene.add(arenaRing);arenaRing.visible=false;
const balls=players.map((p,i)=>{const ball=new THREE.Mesh(new THREE.SphereGeometry(.72,32,24),mat(specs[i].color,.32,.12));ball.castShadow=true;ball.receiveShadow=true;scene.add(ball);ball.visible=false;return {mesh:ball,vx:0,vz:0,alive:true,stun:0,falling:false,fallAt:0,fallVx:0,fallVz:0}});
const keys={};let gameMode='bread',ballStart=0;let humanIndex=0;
window.addEventListener('keydown',e=>{
 if(gameMode==='bowling'&&running){if(e.key==='ArrowLeft'){e.preventDefault();moveBowlerAim(-1)}else if(e.key==='ArrowRight'){e.preventDefault();moveBowlerAim(1)}}
 keys[e.code]=true;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&gameMode==='ball')e.preventDefault();
});
window.addEventListener('keyup',e=>{keys[e.code]=false});

/* Vetor de movimento do jogador local (teclado ou analógico), de -1 a 1. */
function humanMoveVector(){
 if(joystick.active)return {x:joystick.x,y:joystick.y};
 let ix=0,iz=0;
 if(keys.ArrowLeft||keys.KeyA)ix-=1;if(keys.ArrowRight||keys.KeyD)ix+=1;if(keys.ArrowUp||keys.KeyW)iz-=1;if(keys.ArrowDown||keys.KeyS)iz+=1;
 const l=Math.hypot(ix,iz)||1;return {x:ix/l,y:iz/l};
}
function ballPush(slot){
 const b=balls[slot],p=players[slot],dx=-p.root.position.x,dz=-p.root.position.z,len=Math.hypot(dx,dz)||1;
 b.vx+=(dx/len)*.95;b.vz+=(dz/len)*.95;
}

/* Chamado a cada frame pelo game.js (animate). Só o anfitrião/offline roda a física. */
function updateBallMode(now,dt,t){
 if(net.role==='client')return;
 if(gameMode==='ball'&&running){
  // Jogadores humanos (local + online)
  for(let i=0;i<players.length;i++){
   if(!isHumanSlot(i)||!balls[i].alive)continue;
   const v=i===humanIndex?humanMoveVector():(net.mv[i]||{x:0,y:0});
   if(v.x||v.y){balls[i].vx+=v.x*9.5*dt;balls[i].vz+=v.y*9.5*dt;players[i].root.rotation.y=Math.atan2(v.x,v.y)}
  }
  // IA dos bots: miram nos rivais, empurrando-os para a borda.
  for(let i=0;i<players.length;i++){
   if(isHumanSlot(i))continue;
   const p=players[i],b=balls[i];if(!b.alive)continue;
   let target=null,best=Infinity;
   players.forEach((q,j)=>{if(j===i||!balls[j].alive)return;const dd=Math.hypot(q.root.position.x-p.root.position.x,q.root.position.z-p.root.position.z);if(dd<best){best=dd;target=q}});
   if(target){
    let dx,dz,d;
    const edgeLen=Math.hypot(target.root.position.x,target.root.position.z)||1;
    const aimX=target.root.position.x+target.root.position.x/edgeLen*.9,aimZ=target.root.position.z+target.root.position.z/edgeLen*.9;
    dx=aimX-p.root.position.x;dz=aimZ-p.root.position.z;d=Math.hypot(dx,dz)||1;
    const aggression=[0,0.82,0.88,0.78,0.85][i];
    const ownR=Math.hypot(p.root.position.x,p.root.position.z);
    let steerX=dx/d,steerZ=dz/d;
    if(ownR>4.7){const inwardX=-p.root.position.x/(ownR||1),inwardZ=-p.root.position.z/(ownR||1),blend=Math.min(0.9,(ownR-4.7)/1.5);steerX=steerX*(1-blend)+inwardX*blend;steerZ=steerZ*(1-blend)+inwardZ*blend;const sl=Math.hypot(steerX,steerZ)||1;steerX/=sl;steerZ/=sl}
    b.vx+=steerX*3.0*aggression*dt;b.vz+=steerZ*3.0*aggression*dt;p.root.rotation.y=Math.atan2(steerX,steerZ);
    if(best<1.9){b.vx+=steerX*0.8*dt;b.vz+=steerZ*0.8*dt}
   }
  }
  // Movimento e queda dos eliminados.
  for(let i=0;i<players.length;i++){
   const p=players[i],b=balls[i];
   if(b.falling){const elapsed=(now-b.fallAt)/1000;b.mesh.position.x+=b.fallVx*dt;b.mesh.position.z+=b.fallVz*dt;b.mesh.position.y-=7.5*dt;b.mesh.rotation.x+=7*dt;b.mesh.rotation.z+=5*dt;p.root.position.x=b.mesh.position.x;p.root.position.z=b.mesh.position.z;p.root.position.y-=7.5*dt;p.root.rotation.x+=5*dt;p.rig.rotation.z+=5*dt;if(elapsed>.85){b.falling=false;b.mesh.visible=false;p.root.visible=false;updateHud()}continue}
   if(!b.alive)continue;
   b.vx*=Math.pow(.975,dt*60);b.vz*=Math.pow(.975,dt*60);const speed=Math.hypot(b.vx,b.vz),maxSpeed=4.0;if(speed>maxSpeed){b.vx=b.vx/speed*maxSpeed;b.vz=b.vz/speed*maxSpeed}
   b.mesh.position.x+=b.vx*dt;b.mesh.position.z+=b.vz*dt;p.root.position.x=b.mesh.position.x;p.root.position.z=b.mesh.position.z;p.root.position.y=1.15+Math.min(.08,speed*.008);b.mesh.position.y=.72-Math.min(.08,speed*.02);
   p.rig.rotation.z=Math.max(-.10,Math.min(.10,-b.vx*.018));p.rig.rotation.x=Math.max(-.10,Math.min(.10,b.vz*.018));p.rig.position.y=Math.abs(Math.sin(t*8+i))*Math.min(.06,speed*.01);
   const radius=Math.hypot(p.root.position.x,p.root.position.z);
   if(radius>6.55){b.alive=false;b.falling=true;b.fallAt=now;b.fallVx=b.vx*.45+p.root.position.x*.35;b.fallVz=b.vz*.45+p.root.position.z*.35;b.vx=0;b.vz=0;sfxCream();document.getElementById('status').textContent=p.name+' foi derrubado da arena!';updateHud()}
  }
  // Colisões entre bolas.
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
   if(!balls[i].alive||!balls[j].alive)continue;
   const a=players[i].root.position,b=players[j].root.position,dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
   if(d>0&&d<1.55){
    const nx=dx/d,nz=dz/d,relative=(balls[i].vx-balls[j].vx)*nx+(balls[i].vz-balls[j].vz)*nz;
    const imp=1.35+Math.min(1.0,Math.abs(relative)*.16);
    balls[i].vx-=nx*imp;balls[i].vz-=nz*imp;balls[j].vx+=nx*imp;balls[j].vz+=nz*imp;
    const overlap=(1.55-d)*.35;a.x-=nx*overlap;a.z-=nz*overlap;b.x+=nx*overlap;b.z+=nz*overlap;
    if(i===humanIndex||j===humanIndex)sfxClick();
   }
  }
  // Fim da batalha.
  const alive=balls.filter(b=>b.alive).length,stillFalling=balls.some(b=>b.falling);
  if(alive<=1&&!stillFalling&&!ended){
   ended=true;running=false;clearBots();
   const winner=players[balls.findIndex(b=>b.alive)];
   document.getElementById('status').textContent='FIM DA BATALHA!';
   const winnerIndex=winner?players.indexOf(winner):-1;
   showScoreScreen(winnerIndex,'Batalha das Bolas','🏆 Fim da rodada!','Vencedor: '+(winner?winner.name:'Ninguém')+'!');
   document.getElementById('start').disabled=true;document.getElementById('tap').disabled=true;document.getElementById('characterChoice').disabled=true;document.getElementById('gameMode').disabled=true;
   if(winner){winner.arms.forEach(a=>a.rotation.x=-1.5);sfxFinish()}
  }
 }
}
