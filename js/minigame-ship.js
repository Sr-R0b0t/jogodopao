/* Minigame: Arena das Naves (2 a 4 jogadores) — cada um pilota uma nave e defende o próprio gol.
   A arena lança bolas metálicas; bola no gol = -1 vida. Quem zera sai e o gol vira barreira. Vence o último.
   Só entra no sorteio com 2, 3 ou 4 jogadores (ver MINIGAMES em minigames.js). */
function isShipMode(){return gameMode==='ship'||gameMode==='turbo'}   // 'turbo' = variante com naves em trilhos, pads de velocidade e bolas saindo dos cantos
function isTurbo(){return gameMode==='turbo'}
const TURBO={arena:7.2,goalMargin:3.3,accel:38,maxV:11.5,goalHalf:3.8,rail:1.4,railLim:3.6,bump:[5.3,1.2],spawn:3.1,blastCd:4000,blastR:3.6,blastPush:8,padR:.95,padBoost:1.5,padMax:18,maxBalls:3,startSpeed:8.2,hit:1.1,addEvery:8,botV:5.4,botAcc:18,lead:.18};
const PAD_POS=[[-2.9,-2.2],[2.9,-2.2],[-2.9,2.2],[2.9,2.2]],PAD_BASE=[[-2.9,-2.2],[2.9,-2.2],[-2.9,2.2],[2.9,2.2]];
const SHIP={
 lives:15,half:6,goalHalf:1.9,shipR:.95,ballR:.45,
 startSpeed:5.2,maxBallSpeed:13,hitBoost:1.07,
 accel:19,botAccel:13.5,maxV:8.2,botMaxV:6.5,drag:3.2,
 maxBalls:4,addBallEverySec:18,spawnDelayMs:900
};
let SHIP_A=SHIP.half;
/* lados da arena: S (embaixo, perto da câmera), N, W, E. n = direção para dentro; a = eixo ao longo da parede */
const SIDES=[
 {gx:0,gz:SHIP_A,nx:0,nz:-1,ax:1,az:0},{gx:0,gz:-SHIP_A,nx:0,nz:1,ax:1,az:0},
 {gx:-SHIP_A,gz:0,nx:1,nz:0,ax:0,az:1},{gx:SHIP_A,gz:0,nx:-1,nz:0,ax:0,az:1}
];
const SIDE_COLORS=['#2bff5a','#2e86ff','#ffd21f','#a24dff'];   // cores padrão por lado: verde, azul, amarelo, roxo
const SIDE_ORDER={2:[0,1],3:[0,2,3],4:[0,1,2,3]};

/* ---------- Cenário ---------- */
const shipRoot=new THREE.Group();scene.add(shipRoot);shipRoot.visible=false;
const sFloor=new THREE.Mesh(new THREE.BoxGeometry(SHIP_A*2+1.4,.3,SHIP_A*2+1.4),mat('#2d4660',.5,.35));sFloor.position.y=-.16;sFloor.receiveShadow=true;shipRoot.add(sFloor);
const sInner=new THREE.Mesh(new THREE.PlaneGeometry(SHIP_A*2,SHIP_A*2),mat('#5d86a6',.35,.25));sInner.rotation.x=-Math.PI/2;sInner.position.y=.01;sInner.receiveShadow=true;shipRoot.add(sInner);
const glowMat=new THREE.MeshStandardMaterial({color:'#1b9cff',emissive:'#1b9cff',emissiveIntensity:1.6});
const wallMat=mat('#26384c',.5,.4);
const goalStrips=[],barriers=[],caps=[];
const GOAL_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
/* piso: base escura, bordas neon, setas (chevrons) correndo em direção ao gol e grade de varredura; vermelho no gol sofrido */
const GOAL_FS_FLOOR=`varying vec2 vUv;uniform vec3 uCol;uniform float uFlash,uTime,uW;
void main(){
 float W=uW,D=1.25;
 float x=(vUv.x-.5)*W, d=vUv.y*D;                       // d: 0 = linha do gol, D = lado da arena
 vec3 base=vec3(.01,.02,.05);
 float edge=smoothstep(.10,.0,.5*W-abs(x));
 float goalLine=smoothstep(.07,.0,d);
 float innerLine=smoothstep(.04,.0,abs(d-D+.03))*.6;
 float p=d*2.4+abs(x)*1.1+uTime*1.5;
 float f=fract(p);float chev=smoothstep(.0,.06,f)*(1.-smoothstep(.22,.34,f));
 chev*=smoothstep(D,.2,d)*.9+.1;
 float grid=(smoothstep(.46,.5,abs(fract(x*2.)-.5))+smoothstep(.46,.5,abs(fract(d*3.)-.5)))*.28;
 float pulse=.6+.4*sin(uTime*14.);
 vec3 neon=uCol;
 vec3 col=base+neon*(chev*.75+edge*1.1+goalLine*1.6+innerLine*.8+grid);
 vec3 red=vec3(1.,.05,.04);
 vec3 hit=base+red*(chev*1.4+edge*2.+goalLine*3.+grid*1.5+.12*pulse);
 col=mix(col,hit,uFlash);
 float a=.97;
 gl_FragColor=vec4(col,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
/* cortina de energia vertical: mais forte embaixo, com linhas horizontais subindo */
const GOAL_FS_WALL=`varying vec2 vUv;uniform vec3 uCol;uniform float uFlash,uTime;
void main(){
 vec3 c=mix(uCol,vec3(1.,.08,.05),uFlash);
 float fade=pow(1.-vUv.y,1.7);
 float lines=.55+.45*sin(vUv.y*46.-uTime*4.);
 float side=smoothstep(.0,.08,vUv.x)*smoothstep(1.,.92,vUv.x);
 float a=fade*lines*side*(.28+uFlash*.55)+smoothstep(.04,.0,vUv.y)*.5;
 gl_FragColor=vec4(c*a*1.4,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const sidesRoot=new THREE.Group();shipRoot.add(sidesRoot);
function buildSides(){
SIDES.forEach((s,k)=>{
 const out=(a,b,w,d,h,y,m)=>{const box=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);box.position.set(a,y,b);box.castShadow=true;box.receiveShadow=true;sidesRoot.add(box);return box};
 const horiz=s.ax===1;                                  // parede horizontal (S/N) ou vertical (W/E)
 const wallLen=(SHIP_A*2+1.4-SHIP.goalHalf*2)/2,off=SHIP.goalHalf+wallLen/2;
 for(const sign of [-1,1]){
  const cx=horiz?sign*off:s.gx+(s.gx>0?.35:-.35),cz=horiz?s.gz+(s.gz>0?.35:-.35):sign*off;
  out(cx,cz,horiz?wallLen:.7,horiz?.7:wallLen,.9,.45,wallMat);                                     // parede
  out(cx,cz,horiz?wallLen:.12,horiz?.12:wallLen,.1,.93,glowMat);                                   // faixa luminosa
 }
 const gg=new THREE.Group(),U={uCol:{value:new THREE.Color('#38d6ff')},uFlash:{value:0},uTime:{value:0},uW:{value:SHIP.goalHalf*2}};gg.userData.u=U;
 const GD=1.25,GW=SHIP.goalHalf*2,rotY=Math.atan2(-s.nx,-s.nz);
 const strip=new THREE.Mesh(new THREE.PlaneGeometry(GW,GD),new THREE.ShaderMaterial({uniforms:U,vertexShader:GOAL_VS,fragmentShader:GOAL_FS_FLOOR,transparent:true,depthWrite:false}));
 strip.rotation.set(-Math.PI/2,0,0);const sg=new THREE.Group();sg.add(strip);sg.rotation.y=rotY;sg.position.set(s.gx+s.nx*GD/2,.035,s.gz+s.nz*GD/2);gg.add(sg);       // piso holográfico do gol
 const cur=new THREE.Mesh(new THREE.PlaneGeometry(GW,1.0),new THREE.ShaderMaterial({uniforms:U,vertexShader:GOAL_VS,fragmentShader:GOAL_FS_WALL,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
 const cg=new THREE.Group();cg.add(cur);cur.position.y=.5;cg.rotation.y=rotY;cg.position.set(s.gx+s.nx*.05,0,s.gz+s.nz*.05);gg.add(cg); // cortina de energia na linha do gol
 for(const sign of [-1,1]){                                                                                                      // postes de energia nas pontas
  const px=s.gx+s.ax*sign*SHIP.goalHalf,pz=s.gz+s.az*sign*SHIP.goalHalf;
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,1.15,12),new THREE.MeshStandardMaterial({color:'#101a28',metalness:.8,roughness:.3}));post.position.set(px,.58,pz);gg.add(post);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}));orb.position.set(px,1.22,pz);orb.userData.isOrb=true;gg.add(orb);gg.userData.orbs=(gg.userData.orbs||[]);gg.userData.orbs.push(orb);
 }
 sidesRoot.add(gg);goalStrips.push(gg);                                                         // marca do gol (cor do dono)
 const bar=new THREE.Mesh(new THREE.BoxGeometry(horiz?SHIP.goalHalf*2:.6,1.1,horiz?.6:SHIP.goalHalf*2),new THREE.MeshStandardMaterial({color:'#ff3b3b',emissive:'#ff1a1a',emissiveIntensity:.9}));
 bar.position.set(s.gx,.55,s.gz);bar.visible=false;sidesRoot.add(bar);barriers.push(bar);          // barreira quando o dono sai
 const cap=new THREE.Mesh(new THREE.BoxGeometry(horiz?SHIP.goalHalf*2:.7,.9,horiz?.7:SHIP.goalHalf*2),wallMat);
 cap.position.set(s.gx+(horiz?0:(s.gx>0?.35:-.35)),.45,s.gz+(horiz?(s.gz>0?.35:-.35):0));cap.visible=false;sidesRoot.add(cap);caps.push(cap); // tampa o gol de um lado sem jogador
});
}
buildSides();
let builtArena=SHIP.half;
/* Arena Turbo é maior e tem gols até os tubos: recalcula as medidas e reconstrói paredes/gols quando o modo muda */
function ensureArena(){
 const A=isTurbo()?TURBO.arena:6;if(A===builtArena)return;
 builtArena=A;SHIP.half=A;SHIP_A=A;
 SIDES[0].gz=A;SIDES[1].gz=-A;SIDES[2].gx=-A;SIDES[3].gx=A;
 SHIP.goalHalf=A===6?1.9:A-TURBO.goalMargin;
 const k=(A*2+1.4)/13.4;sFloor.scale.set(k,1,k);sInner.scale.set(A/6,A/6,1);
 TURBO.railLim=A-2.4;TURBO.bump=[A-.7,1.2];TURBO.spawn=A-2.9;
 PAD_BASE.forEach((p,i)=>{PAD_POS[i][0]=p[0]*A/6;PAD_POS[i][1]=p[1]*A/6;const g=turboPads[i].g;g.position.set(PAD_POS[i][0],.03,PAD_POS[i][1]);g.rotation.y=Math.atan2(PAD_POS[i][0],PAD_POS[i][1])});
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz],i)=>turboPods[i].g.position.set(sx*(A-.7),0,sz*(A-.7)));
 sidesRoot.clear();goalStrips.length=0;barriers.length=0;caps.length=0;buildSides();
}

// bolas metálicas
const shipBallMeshes=[];
for(let k=0;k<SHIP.maxBalls;k++){const g=new THREE.Group(),fb=new THREE.Mesh(new THREE.SphereGeometry(SHIP.ballR,24,18),new THREE.MeshStandardMaterial({color:'#e8edf3',metalness:.55,roughness:.3,emissive:'#2a3544',emissiveIntensity:.6}));fb.castShadow=true;g.userData.fallback=fb;g.add(fb);g.visible=false;shipRoot.add(g);shipBallMeshes.push(g)}
if(typeof GLTFLoader!=='undefined')new GLTFLoader().load('models/bola-metal.glb',gl=>{
 try{
  gl.scene.traverse(o=>{if(o.isMesh){const om=o.material;o.material=new THREE.MeshStandardMaterial({map:om.map,normalMap:om.normalMap,metalnessMap:om.metalnessMap,roughnessMap:om.roughnessMap,metalness:.55,roughness:1,emissive:'#3a4658',emissiveIntensity:.5});o.castShadow=true}});
  shipBallMeshes.forEach(g=>{const m=gl.scene.clone(true);m.scale.setScalar(SHIP.ballR/0.95);g.add(m);g.userData.fallback.visible=false});
 }catch(e){console.warn('erro no modelo da bola de metal',e)}
},undefined,e=>console.warn('bola-metal.glb não carregou; usando esfera simples',e));
// naves (uma por personagem): modelo reserva simples até o .glb carregar
const shipGroups=players.map((p,i)=>{
 const g=new THREE.Group();shipRoot.add(g);g.visible=false;
 const fb=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.0,.5,28),mat('#2a8c7a',.5,.3));fb.position.y=.45;g.userData.fallback=fb;g.add(fb);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.07,8,32),new THREE.MeshStandardMaterial({color:specs[i].team||specs[i].color,emissive:specs[i].team||specs[i].color,emissiveIntensity:1.1}));
 ring.rotation.x=Math.PI/2;ring.position.y=.07;g.add(ring);g.userData.ring=ring;
 return g;
});
if(typeof GLTFLoader!=='undefined')new GLTFLoader().load('models/nave.glb',gl=>{
 try{
  gl.scene.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({map:o.material.map,roughness:.55,metalness:.25,side:THREE.DoubleSide});o.castShadow=true}});
  shipGroups.forEach(g=>{const m=gl.scene.clone(true);m.scale.setScalar(1.15);m.rotation.y=Math.PI/2;m.position.y=.64*1.15+.08;g.add(m);g.userData.fallback.visible=false}); // frente do modelo = -x → gira para +z
 }catch(e){console.warn('erro no modelo da nave',e)}
},undefined,e=>console.warn('nave.glb não carregou; usando a nave simples',e));

/* ---------- Visual da Arena Turbo: pads de velocidade e cápsulas lançadoras nos cantos ---------- */
const turboRoot=new THREE.Group();turboRoot.visible=false;shipRoot.add(turboRoot);
function chevronTexture(active){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 g.lineJoin='round';g.lineCap='round';g.lineWidth=15;
 if(active){g.strokeStyle='#4dff7a';g.shadowColor='#4dff7a';g.shadowBlur=18}else g.strokeStyle='#05080c';
 for(let k=0;k<3;k++){const y=38+k*26;g.beginPath();g.moveTo(26,y+22);g.lineTo(64,y-8);g.lineTo(102,y+22);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const padDarkTex=chevronTexture(false),padGlowTex=chevronTexture(true);
const turboPads=PAD_POS.map(([px,pz])=>{
 const g=new THREE.Group();g.position.set(px,.03,pz);g.rotation.y=Math.atan2(px,pz);                       // setas apontam para o centro
 const mk=(tex,add)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false}));m.rotation.x=-Math.PI/2;return m};
 const dark=mk(padDarkTex,false),glow=mk(padGlowTex,true);glow.position.y=.01;glow.material.opacity=0;g.add(dark,glow);turboRoot.add(g);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.0,32),new THREE.MeshBasicMaterial({color:'#4dff7a',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
 ring.rotation.x=-Math.PI/2;ring.position.y=.012;g.add(ring);
 return {g,glow,ring};
});
const turboPods=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz])=>{
 const g=new THREE.Group();g.position.set(sx*5.3,0,sz*5.3);
 const body=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.2,1.5,16),mat('#3b3f48',.45,.5));body.position.y=.75;body.castShadow=true;g.add(body);
 const hole=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.05,24),new THREE.MeshBasicMaterial({color:'#02070b'}));hole.position.y=1.52;g.add(hole);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.08,8,28),new THREE.MeshStandardMaterial({color:'#1b9cff',emissive:'#1b9cff',emissiveIntensity:1.6}));ring.rotation.x=Math.PI/2;ring.position.y=1.52;g.add(ring);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),new THREE.MeshBasicMaterial({color:'#9fe6ff',transparent:true,opacity:0,toneMapped:false}));core.position.y=1.5;g.add(core);
 turboRoot.add(g);return {g,ring,core};
});
/* Rajada de ar (botão ESPECIAL): arco que se expande à frente da nave */
const blastFx=players.map((p,i)=>{
 const g=new THREE.Group(),span=Math.PI*1.15;
 const mk=(r0,r1)=>{const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,40,1,-span/2,span),new THREE.MeshBasicMaterial({color:'#bff3ff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));m.rotation.x=-Math.PI/2;g.add(m);return m};
 g.userData.rings=[mk(.94,1.0),mk(.62,.67)];g.visible=false;turboRoot.add(g);return g;
});
const blastT=players.map(()=>0);
function startBlastFx(i){blastT[i]=performance.now();const s=SIDES[shipSideOf[i]];if(!s)return;blastFx[i].rotation.y=Math.atan2(-s.nz,s.nx)}
function sfxWhoosh(vol=1){if(!audioEnabled)return;try{noisePop(.38,.2*vol,2600);tone(340,.3,'sine',.05*vol,0,110)}catch(e){}}
let turboBtnLabel='💨 ESPECIAL';
const padMaskNow=()=>{if(!ship)return 0;const t=performance.now();let m=0;ship.padT.forEach((v,k)=>{if(v&&t-v<700)m|=1<<k});return m};

/* ---------- Estado ---------- */
let ship=null,shipSideOf={},shipClient=null,shipSeenGoals=0;
let shipTeams=null;   // null = todos contra todos; senão [[a,b],[c,d]] (2 contra 2)
const TEAM_COLORS=['#2bff5a','#ff8a1f'],TEAM_EMOJI=['🟢','🟠'];
const shipTeamOf=i=>shipTeams?shipTeams.findIndex(g=>g.includes(i)):-1;
const shipSameTeam=(a,b)=>shipTeams&&shipTeamOf(a)===shipTeamOf(b)&&shipTeamOf(a)>=0;
/* Placar do topo: nas duplas, cada dupla fica junta, com a cor do seu gol, e um espaço separa as duas. */
function hudApplyTeams(teams){
 hudClearTeams();if(!teams)return;
 teams.forEach((g,k)=>g.forEach((i,j)=>{
  const el=document.getElementById('tag'+i);if(!el)return;
  el.style.order=String(k*10+j);el.style.borderColor=TEAM_COLORS[k];el.style.borderWidth='2px';
  el.style.boxShadow='0 4px 0 #140c20,0 0 0 2px '+TEAM_COLORS[k]+'55';
  if(k===1&&j===0)el.style.marginLeft='clamp(14px,4vw,40px)';
 }));
}
function hudClearTeams(){players.forEach((p,i)=>{const el=document.getElementById('tag'+i);if(el){el.style.order='';el.style.borderColor='';el.style.borderWidth='';el.style.boxShadow='';el.style.marginLeft=''}})}
function applyShipTeams(teams){
 shipTeams=teams;hudApplyTeams(teams);if(!teams)return;
 teams.forEach((g,k)=>g.forEach(i=>{const sd=shipSideOf[i];if(sd===undefined)return;const c=new THREE.Color(TEAM_COLORS[k]);const r=shipGroups[i].userData.ring.material;r.color.copy(c);r.emissive.copy(c);goalStrips[sd].userData.u.uCol.value.copy(c);goalBase[sd]=c.clone()}));
}
function shipTeamsAlive(){return shipTeams?shipTeams.filter(g=>g.some(i=>players[i].count>0)).length:aliveShips().length}
let shipSeenImp=0,shipSeenSpawns=0,shipSeenPads=0;const blastSeen=[];const turboPodT=[0,0,0,0];
const goalFlash=[0,0,0,0],goalBase=[null,null,null,null];
function flashGoal(side){goalFlash[side]=performance.now()}
const shipVel={};
function setupShip(){
 ensureArena();
 ship=null;shipTeams=null;shipClient=null;shipSeenGoals=0;shipSeenImp=0;shipSeenSpawns=0;shipSeenPads=0;turboPodT.fill(0);blastSeen.length=0;blastT.fill(0);
 const act=activeIndices().sort((a,b)=>a-b),order=SIDE_ORDER[Math.min(4,Math.max(2,act.length))];
 shipSideOf={};act.forEach((i,k)=>{shipSideOf[i]=order[k]});
 players.forEach((p,i)=>{
  shipVel[i]={x:0,z:0};
  if(shipSideOf[i]===undefined)return;
  const s=SIDES[shipSideOf[i]];
  p.count=SHIP.lives;p.root.position.set(s.gx+s.nx*(isTurbo()?TURBO.rail:2.6),.55,s.gz+s.nz*(isTurbo()?TURBO.rail:2.6));p.root.rotation.set(0,Math.atan2(s.nx,s.nz),0);p.root.scale.setScalar(.5);p.root.visible=true;
  const c=new THREE.Color(SIDE_COLORS[shipSideOf[i]]);shipGroups[i].userData.ring.material.color.copy(c);shipGroups[i].userData.ring.material.emissive.copy(c);goalStrips[shipSideOf[i]].userData.u.uCol.value.copy(c);goalBase[shipSideOf[i]]=c.clone();
 });
 SIDES.forEach((s,k)=>{const used=Object.values(shipSideOf).includes(k);barriers[k].visible=false;goalStrips[k].visible=used;caps[k].visible=!used});
 shipBallMeshes.forEach(m=>m.visible=false);goalFlash.fill(0);
 if(typeof updateHud==='function')updateHud();
}
function startShip(){
 const now=performance.now();
 ship={balls:[],elim:[],t0:now,nextSpawn:now+SHIP.spawnDelayMs,goals:0,imp:0,padT:[0,0,0,0],podT:[0,0,0,0],spawns:0,lastPod:0,cd:players.map(()=>0),bl:players.map(()=>0),botT:{}};
 document.getElementById('status').textContent='🚀 Defenda o seu gol! Cada gol sofrido tira 1 vida ('+SHIP.lives+'). O último na arena vence.';
 // às vezes (50%) com 4 jogadores: sorteia duplas 2 contra 2, com gols da mesma cor
 const act=activeIndices();
 if(act.length===4&&Math.random()<.5){
  const sh=act.slice().sort(()=>Math.random()-.5),teams=[[sh[0],sh[1]],[sh[2],sh[3]]];
  applyShipTeams(teams);
  ship.pre=now+PRE_MS;ship.nextSpawn=ship.pre+SHIP.spawnDelayMs;
  const nm=g=>g.map(i=>players[i].name);
  const o={sub:'Sorteio de duplas',title:'2 contra 2!',pool:act.map(i=>players[i].name),pairs:true,
   final:teams.map((g,k)=>({label:TEAM_EMOJI[k]+' Dupla '+(k+1),names:nm(g),color:TEAM_COLORS[k]}))};
  o.teams=teams;runPreGame(o,'🤝 Duplas',teams.map(g=>nm(g).join(' + ')).join('  x  '));
  document.getElementById('status').textContent='🤝 Duplas! '+nm(teams[0]).join(' + ')+'  x  '+nm(teams[1]).join(' + ')+'. A dupla que ficar viva vence!';
 }
}
const aliveShips=()=>activeIndices().filter(i=>players[i].count>0);

/* ESPECIAL: rajada que empurra as bolas próximas para longe da nave. Recarga de 4 s. Retorna true se disparou. */
function shipBlast(i,now){
 if(!ship||!running||!isTurbo()||players[i].count<=0||now<ship.cd[i])return false;
 ship.cd[i]=now+TURBO.blastCd;ship.bl[i]++;
 const p=players[i].root.position;
 for(const b of ship.balls){
  const dx=b.x-p.x,dz=b.z-p.z,d=Math.hypot(dx,dz);
  if(d>0&&d<TURBO.blastR){
   const k=1-d/TURBO.blastR,cur=Math.hypot(b.vx,b.vz),sp=Math.min(TURBO.padMax,Math.max(cur,TURBO.startSpeed)+TURBO.blastPush*(.55+.45*k));
   b.vx=dx/d*sp;b.vz=dz/d*sp;
  }
 }
 startBlastFx(i);sfxWhoosh(i===humanIndex?1:.55);
 return true;
}
function shipBlastPress(){                      // chamado pelo botão/tecla do jogador local
 if(!running||!isTurbo())return;
 if(net.role==='client'){netSendInput({k:'tap'});return}
 shipBlast(humanIndex,performance.now());
}
function shipSpawnBall(now){
 if(isTurbo()){                                                  // sai de uma cápsula num canto, rumo ao meio
  const c=Math.floor(Math.random()*4),sx=c&1?1:-1,sz=c&2?1:-1,a=Math.atan2(-sz,-sx)+(Math.random()-.5)*1.1;
  ship.balls.push({x:sx*TURBO.spawn,z:sz*TURBO.spawn,vx:Math.cos(a)*TURBO.startSpeed,vz:Math.sin(a)*TURBO.startSpeed,born:now});
  ship.podT[c]=now;ship.spawns++;ship.lastPod=c;return;
 }
 const a=Math.random()*Math.PI*2;
 ship.balls.push({x:(Math.random()-.5)*.8,z:(Math.random()-.5)*.8,vx:Math.cos(a)*SHIP.startSpeed,vz:Math.sin(a)*SHIP.startSpeed,born:now});
}
function shipGoal(owner,b,now){
 const p=players[owner];p.count=Math.max(0,p.count-1);ship.goals++;ship.lastSide=shipSideOf[owner];flashGoal(ship.lastSide);if(typeof updateHud==='function')updateHud();
 ship.balls.splice(ship.balls.indexOf(b),1);ship.nextSpawn=now+SHIP.spawnDelayMs;
 if(audioEnabled)sfxMetalGoal();
 document.getElementById('status').textContent='🥅 Gol em '+p.name+'! Restam '+p.count+' vida'+(p.count===1?'':'s')+'.';
 if(p.count<=0){
  ship.elim.push(owner);p.root.visible=false;
  document.getElementById('status').textContent='💥 '+p.name+' foi eliminado! O gol dele virou barreira.';
  if(shipTeamsAlive()<=1)finishShip();
 }
}
function finishShip(){const byTime=false;
 ended=true;running=false;clearBots();
 const alive=aliveShips(),act=activeIndices();let ranking=[],detail={};
 if(shipTeams&&shipTeamsAlive()===1){
  const wt=shipTeams.findIndex(g=>g.some(i=>players[i].count>0));
  ranking=[shipTeams[wt],shipTeams[1-wt]];
  shipTeams[wt].forEach(i=>detail[i]='🏆 dupla vencedora • '+players[i].count+' vida'+(players[i].count===1?'':'s'));
  shipTeams[1-wt].forEach(i=>detail[i]='dupla eliminada');
 }else if(!byTime&&alive.length===1){
  ranking=[[alive[0]]].concat(ship.elim.slice().reverse().map(i=>[i]));
  ranking.forEach((g,k)=>detail[g[0]]=k===0?'último na arena • '+players[g[0]].count+' vida'+(players[g[0]].count===1?'':'s'):(k+1)+'º • eliminado');
 }else{                                                         // tempo esgotado: vence quem tem mais vidas
  const order=act.slice().sort((a,b)=>players[b].count-players[a].count);
  order.forEach(i=>{const g=ranking[ranking.length-1];if(g&&players[g[0]].count===players[i].count)g.push(i);else ranking.push([i])});
  act.forEach(i=>detail[i]='❤ '+players[i].count+' vida'+(players[i].count===1?'':'s'));
 }
 const w=ranking[0].map(i=>players[i].name).join(', ');
 document.getElementById('status').textContent=byTime?'⏱️ Tempo esgotado!':'🏆 '+w+' é o último na arena!';
 let gainsOv=null,sub;
 if(shipTeams&&ranking.length===2&&ranking[0]===shipTeams.find(g=>g===ranking[0])){   // duplas: vencedora 5 pts cada, perdedora 0
  gainsOv={};ranking[0].forEach(i=>gainsOv[i]=RANK_POINTS[0]);ranking[1].forEach(i=>gainsOv[i]=0);
  sub='Dupla vencedora: '+RANK_POINTS[0]+' pts cada • dupla perdedora: 0 pt';
 }
 showScoreScreen(ranking,isTurbo()?'Arena Turbo':'Arena das Naves','🚀 Fim da arena!',(byTime?'Tempo esgotado. Mais vidas: ':(shipTeams?'Dupla vencedora: ':'Último na arena: '))+w+'.',detail,gainsOv,sub);
}

/* ---------- IA dos bots ---------- */
function shipBotVector(i,now){
 const s=SIDES[shipSideOf[i]],p=players[i],px=p.root.position.x,pz=p.root.position.z,live=ship.balls;
 let tx=s.gx+s.nx*2.4,tz=s.gz+s.nz*2.4;
 if(live.length){
  let best=live[0],bd=1e9;for(const b of live){const d=Math.hypot(b.x-s.gx,b.z-s.gz);if(d<bd){bd=d;best=b}}   // bola mais perto do meu gol
  const bx=best.x+best.vx*.18,bz=best.z+best.vz*.18,dBot=Math.hypot(bx-px,bz-pz);
  const inward=((bx-s.gx)*s.nx+(bz-s.gz)*s.nz)>1.2;
  if(dBot<4&&inward){                                            // ataque: acerta a bola em direção a um gol inimigo
   if(!ship.botT[i]||now>ship.botT[i].until){const foes=aliveShips().filter(o=>o!==i&&!shipSameTeam(i,o));const f=foes[Math.floor(Math.random()*foes.length)];ship.botT[i]={f,until:now+2500}}
   const f=ship.botT[i].f,fs=SIDES[shipSideOf[f]],dx=fs.gx-bx,dz=fs.gz-bz,l=Math.hypot(dx,dz)||1,off=SHIP.shipR+SHIP.ballR-.2;
   tx=bx-dx/l*off;tz=bz-dz/l*off;
  }else{                                                         // defesa: fica entre o gol e a bola
   const ux=bx-s.gx,uz=bz-s.gz,l=Math.hypot(ux,uz)||1,off=Math.min(Math.max(l*.5,1.8),3.6);
   tx=s.gx+ux/l*off;tz=s.gz+uz/l*off;
  }
 }
 const dx=tx-px,dz=tz-pz,dd=Math.hypot(dx,dz)||1,m=Math.min(1,dd/1.1)*.92;
 return {x:dx/dd*m,y:dz/dd*m};
}

/* IA no trilho: prevê onde a bola cruza a linha da nave (com rebatida nas paredes) e vai para lá, com um erro de "pontaria". */
function shipBotTurbo(i,now){
 const s=SIDES[shipSideOf[i]],p=players[i].root.position,lat=(p.x-s.gx)*s.ax+(p.z-s.gz)*s.az,L=SHIP_A-SHIP.ballR;
 let target=0,bestT=1e9,near=null,nd=1e9;
 for(const b of ship.balls){
  const dist=(b.x-s.gx)*s.nx+(b.z-s.gz)*s.nz,vi=b.vx*s.nx+b.vz*s.nz,bl=(b.x-s.gx)*s.ax+(b.z-s.gz)*s.az,vl=b.vx*s.ax+b.vz*s.az;
  if(dist<nd){nd=dist;near=bl}
  if(vi<-.3){const t=Math.max(0,(dist-TURBO.rail)/-vi);if(t<bestT){bestT=t;target=bl+vl*Math.min(t,TURBO.lead*3)}}
 }
 if(bestT===1e9)target=near===null?0:near*.5;
 target+=Math.sin(now*.0021+i*2.7)*.45;
 target=Math.max(-TURBO.railLim,Math.min(TURBO.railLim,target));
 const m=Math.max(-1,Math.min(1,(target-lat)/.7))*.95;
 return {x:s.ax*m,y:s.az*m};
}

/* ---------- Atualização a cada frame (anfitrião/offline) ---------- */
function updateShipMode(now,dt){
 if(!isShipMode()||!running||!ship)return;
 if(ship.pre&&now<ship.pre)return;      // sorteio de duplas e contagem: ninguém se mexe ainda
 const act=activeIndices().filter(i=>players[i].count>0),A=SHIP_A;
 // 1) naves
 for(const i of act){
  const p=players[i],v=shipVel[i],human=isHumanSlot(i);
  const inp=human?(i===humanIndex?humanMoveVector():(net.mv[i]||{x:0,y:0})):(isTurbo()?shipBotTurbo(i,now):shipBotVector(i,now));
  const T=isTurbo(),acc=human?(T?TURBO.accel:SHIP.accel):(T?TURBO.botAcc:SHIP.botAccel)*diffK(),maxV=human?(T?TURBO.maxV:SHIP.maxV):(T?TURBO.botV:SHIP.botMaxV)*diffK();
  if(isTurbo()){                                                  // nave presa ao trilho do próprio lado
   const sd=SIDES[shipSideOf[i]],lat=(p.root.position.x-sd.gx)*sd.ax+(p.root.position.z-sd.gz)*sd.az;
   v.l=(v.l||0)+(inp.x*sd.ax+inp.y*sd.az)*acc*dt;v.l*=Math.exp(-SHIP.drag*dt);v.l=Math.max(-maxV,Math.min(maxV,v.l));
   let nl=lat+v.l*dt;if(Math.abs(nl)>TURBO.railLim){nl=Math.sign(nl)*TURBO.railLim;v.l=0}
   p.root.position.x=sd.gx+sd.nx*TURBO.rail+sd.ax*nl;p.root.position.z=sd.gz+sd.nz*TURBO.rail+sd.az*nl;
   v.x=sd.ax*v.l;v.z=sd.az*v.l;p.root.rotation.y=Math.atan2(sd.nx,sd.nz);
   if(!human&&now>=ship.cd[i]&&Math.random()<dt*2.2*diffK()){            // bot dá a rajada quando a bola está perto e indo para o gol
    for(const b of ship.balls){const dx=b.x-p.root.position.x,dz=b.z-p.root.position.z;if(Math.hypot(dx,dz)<TURBO.blastR*.85&&(b.vx*sd.nx+b.vz*sd.nz)<0){shipBlast(i,now);break}}
   }
   continue;
  }
  v.x+=inp.x*acc*dt;v.z+=inp.y*acc*dt;
  const k=Math.exp(-SHIP.drag*dt);v.x*=k;v.z*=k;
  const sp=Math.hypot(v.x,v.z);if(sp>maxV){v.x*=maxV/sp;v.z*=maxV/sp}
  let x=p.root.position.x+v.x*dt,z=p.root.position.z+v.z*dt;
  const lim=A-SHIP.shipR;x=Math.max(-lim,Math.min(lim,x));z=Math.max(-lim,Math.min(lim,z));
  p.root.position.x=x;p.root.position.z=z;
  if(sp>.6)p.root.rotation.y=Math.atan2(v.x,v.z);
 }
 if(!isTurbo())for(let a=0;a<act.length;a++)for(let b=a+1;b<act.length;b++){      // naves se empurram
  const pa=players[act[a]].root.position,pb=players[act[b]].root.position,dx=pb.x-pa.x,dz=pb.z-pa.z,d=Math.hypot(dx,dz),min=SHIP.shipR*1.8;
  if(d>0&&d<min){const nx=dx/d,nz=dz/d,push=(min-d)/2;pa.x-=nx*push;pa.z-=nz*push;pb.x+=nx*push;pb.z+=nz*push;
   const va=shipVel[act[a]],vb=shipVel[act[b]],rel=(va.x-vb.x)*nx+(va.z-vb.z)*nz;if(rel>0){va.x-=nx*rel;va.z-=nz*rel;vb.x+=nx*rel;vb.z+=nz*rel}}
 }
 // 2) bolas lançadas pela arena
 const want=Math.min(isTurbo()?TURBO.maxBalls:SHIP.maxBalls,1+Math.floor((now-ship.t0)/((isTurbo()?TURBO.addEvery:SHIP.addBallEverySec)*1000)));
 if(ship.balls.length<want&&now>=ship.nextSpawn){shipSpawnBall(now);ship.nextSpawn=now+SHIP.spawnDelayMs}
 for(const b of ship.balls.slice()){
  b.x+=b.vx*dt;b.z+=b.vz*dt;
  // batida nas naves
  for(const i of act){
   const p=players[i].root.position,dx=b.x-p.x,dz=b.z-p.z,d=Math.hypot(dx,dz),min=SHIP.shipR+SHIP.ballR;
   if(d<min&&d>0){
    const nx=dx/d,nz=dz/d,v=shipVel[i],rx=b.vx-v.x,rz=b.vz-v.z,dot=rx*nx+rz*nz;
    if(dot<0){b.vx-=2*dot*nx;b.vz-=2*dot*nz}
    let sp=Math.hypot(b.vx,b.vz)*(isTurbo()?TURBO.hit:SHIP.hitBoost);sp=Math.max(isTurbo()?TURBO.startSpeed:SHIP.startSpeed,Math.min(isTurbo()?TURBO.padMax:SHIP.maxBallSpeed,sp));const cur=Math.hypot(b.vx,b.vz)||1;b.vx*=sp/cur;b.vz*=sp/cur;
    if(isTurbo()&&shipSideOf[i]!==undefined){                      // desvio conforme o ponto da batida (evita rebatida reta eterna)
     const sd=SIDES[shipSideOf[i]];
     if(dx*sd.nx+dz*sd.nz>0){const off=Math.max(-1,Math.min(1,(dx*sd.ax+dz*sd.az)/min)),th=off*1.05+(Math.random()-.5)*.25,cs=Math.cos(th),sn=Math.sin(th),sp2=Math.hypot(b.vx,b.vz);
      b.vx=(sd.nx*cs+sd.ax*sn)*sp2;b.vz=(sd.nz*cs+sd.az*sn)*sp2}
    }
    b.x=p.x+nx*min;b.z=p.z+nz*min;
    ship.imp++;if(audioEnabled)sfxMetalHit(.55+Math.hypot(b.vx,b.vz)/SHIP.maxBallSpeed*.45);
   }
  }
  // pads de velocidade (Arena Turbo)
  if(isTurbo()&&now>=(b.padCool||0)){
   for(let k=0;k<PAD_POS.length;k++){
    if(Math.hypot(b.x-PAD_POS[k][0],b.z-PAD_POS[k][1])<TURBO.padR+SHIP.ballR*.4){
     const cur=Math.hypot(b.vx,b.vz)||1,sp=Math.min(TURBO.padMax,cur*TURBO.padBoost);b.vx*=sp/cur;b.vz*=sp/cur;
     ship.padT[k]=now;b.padCool=now+600;if(audioEnabled)tone(480,.14,'sawtooth',.045,0,1100);break;
    }
   }
  }
  // colisão entre bolas (massas iguais, choque elástico)
  for(const o of ship.balls){
   if(o===b)continue;
   const dx=o.x-b.x,dz=o.z-b.z,d=Math.hypot(dx,dz),min=SHIP.ballR*2;
   if(d>0&&d<min){
    const nx=dx/d,nz=dz/d,rel=(b.vx-o.vx)*nx+(b.vz-o.vz)*nz,push=(min-d)/2;
    b.x-=nx*push;b.z-=nz*push;o.x+=nx*push;o.z+=nz*push;
    if(rel>0){b.vx-=rel*nx;b.vz-=rel*nz;o.vx+=rel*nx;o.vz+=rel*nz;
     for(const q of [b,o]){const s=Math.hypot(q.vx,q.vz);if(s<SHIP.startSpeed*.8){q.vx*=SHIP.startSpeed*.8/(s||1);q.vz*=SHIP.startSpeed*.8/(s||1)}else if(s>SHIP.maxBallSpeed){q.vx*=SHIP.maxBallSpeed/s;q.vz*=SHIP.maxBallSpeed/s}}
     if(rel>1.2){ship.imp++;if(audioEnabled)sfxMetalHit(Math.min(1,rel/9))}}
   }
  }
  // cápsulas nos cantos (Arena Turbo): a bola quica nelas, então não existem "bolsões" nos cantos
  if(isTurbo())for(const cx of [-1,1])for(const cz of [-1,1]){
   const px=cx*TURBO.bump[0],pz=cz*TURBO.bump[0],dx=b.x-px,dz=b.z-pz,d=Math.hypot(dx,dz),min=TURBO.bump[1]+SHIP.ballR;
   if(d>0&&d<min){const nx=dx/d,nz=dz/d,vn=b.vx*nx+b.vz*nz;if(vn<0){b.vx-=2*vn*nx;b.vz-=2*vn*nz}b.x=px+nx*min;b.z=pz+nz*min}
  }
  // paredes e gols
  let scored=false;
  const sideOwner={};Object.entries(shipSideOf).forEach(([pl,s])=>{sideOwner[s]=Number(pl)});
  for(let k=0;k<4&&!scored;k++){
   const s=SIDES[k],depth=(b.x-s.gx)*(-s.nx)+(b.z-s.gz)*(-s.nz),lat=(b.x-s.gx)*s.ax+(b.z-s.gz)*s.az;
   const owner=sideOwner[k],open=owner!==undefined&&players[owner].count>0&&Math.abs(lat)<SHIP.goalHalf;
   if(open&&depth>0){shipGoal(owner,b,now);scored=true;break}
   if(!open&&depth>-SHIP.ballR){
    const ox=-s.nx,oz=-s.nz,vo=b.vx*ox+b.vz*oz;if(vo>0){b.vx-=2*vo*ox;b.vz-=2*vo*oz}
    b.x-=ox*(depth+SHIP.ballR);b.z-=oz*(depth+SHIP.ballR);
   }
  }
 }
}

/* ---------- Visual (todos) ---------- */
function shipVisualUpdate(dt){
 const on=isShipMode();shipRoot.visible=on;if(!on){setRollLoop(0);return}
 turboRoot.visible=isTurbo();
 if(isTurbo()){
  const nowT=performance.now(),client=net.role==='client'&&shipClient;
  const mask=client?(shipClient.pm||0):padMaskNow();
  if(client&&shipClient.sp!==undefined&&shipClient.sp!==shipSeenSpawns){shipSeenSpawns=shipClient.sp;turboPodT[shipClient.pc|0]=nowT}
  if(!client&&ship)ship.podT.forEach((v,k)=>{turboPodT[k]=v});
  if(client&&(mask&~shipSeenPads)&&audioEnabled)tone(480,.14,'sawtooth',.045,0,1100);
  if(client)shipSeenPads=mask;
  if(client&&shipClient.bc){shipClient.bc.forEach((n,i)=>{if(n!==(blastSeen[i]||0)){if((blastSeen[i]||0)!==undefined&&n>(blastSeen[i]||0)){startBlastFx(i);sfxWhoosh(i===humanIndex?1:.55)}blastSeen[i]=n}})}
  blastFx.forEach((g,i)=>{const f=(nowT-blastT[i])/450;const on3=blastT[i]>0&&f>=0&&f<1&&shipSideOf[i]!==undefined;g.visible=on3;if(!on3)return;
   const p=players[i].root.position;g.position.set(p.x,.55,p.z);
   g.userData.rings.forEach((r,k)=>{const ff=Math.max(0,f-k*.12);r.material.opacity=Math.max(0,1-ff)*.9;r.scale.setScalar(1+ff*(TURBO.blastR-.6)/1.0)})});
  {const left=client?(shipClient.cd?(shipClient.cd[humanIndex]||0)/1000:0):(ship?Math.max(0,(ship.cd[humanIndex]-nowT)/1000):0),tapEl=document.getElementById('tap');
   turboBtnLabel=left>0.05?'⏳ '+left.toFixed(1)+'s':'💨 ESPECIAL';
   if(tapEl){tapEl.textContent=left>0.05?turboBtnLabel:'💨 ESPECIAL (ESPAÇO)';tapEl.style.opacity=left>0.05?.55:1}}
  turboPads.forEach((p,k)=>{const on2=(mask>>k)&1,tgt=on2?1:0;p.glow.material.opacity+=(tgt-p.glow.material.opacity)*Math.min(1,dt*14);p.ring.material.opacity=p.glow.material.opacity*.9;p.ring.scale.setScalar(1+(1-p.glow.material.opacity)*.25)});
  turboPods.forEach((p,k)=>{const f=turboPodT[k]?Math.max(0,1-(nowT-turboPodT[k])/700):0;p.core.material.opacity=f;p.core.scale.setScalar(.6+f*.8);p.ring.material.emissiveIntensity=1.6+f*3});
 }
 const t=performance.now()*.001;
 players.forEach((p,i)=>{
  const g=shipGroups[i],show=isActive(i)&&shipSideOf[i]!==undefined&&p.count>0;
  g.visible=show;if(!show)return;
  g.position.set(p.root.position.x,.1+Math.sin(t*3+i)*.04,p.root.position.z);g.rotation.y=p.root.rotation.y;
 });
 Object.entries(shipSideOf).forEach(([pl,s])=>{barriers[s].visible=players[pl].count<=0&&isActive(Number(pl));goalStrips[s].visible=players[pl].count>0});
 const list=net.role==='client'?(shipClient?(net.ibShip||shipClient.b||[]):[]):(ship?ship.balls.map(b=>[b.x,b.z,Math.min(1,(performance.now()-b.born)/400)]):[]);
 shipBallMeshes.forEach((m,k)=>{const b=list[k];m.visible=!!b;if(b){m.position.set(b[0],SHIP.ballR+.12,b[1]);m.scale.setScalar(b[2]===undefined?1:b[2]);m.rotation.x+=dt*6;m.rotation.z+=dt*4}});
 if(net.role==='client'&&shipClient&&shipClient.goals!==shipSeenGoals){if(shipClient.goals>shipSeenGoals){if(audioEnabled)sfxMetalGoal();if(shipClient.ls!==undefined)flashGoal(shipClient.ls)}shipSeenGoals=shipClient.goals}
 {let sp=0,n=0;for(const b of (net.role==='client'?[]:(ship&&running?ship.balls:[]))){sp=Math.max(sp,Math.hypot(b.vx,b.vz));n++}
  if(net.role==='client'&&shipClient&&running){sp=SHIP.startSpeed*1.4;n=(shipClient.b||[]).length}
  setRollLoop(n?Math.min(1,.35+sp/SHIP.maxBallSpeed*.65):0);
  if(net.role==='client'&&shipClient&&shipClient.imp!==undefined){if(shipClient.imp>(shipSeenImp||0)&&audioEnabled)sfxMetalHit(.8);shipSeenImp=shipClient.imp}}
 // faixa do gol: vermelha ao levar gol, volta à cor do dono em ~1,6s
 const nowMs=performance.now();
 goalStrips.forEach((st,k)=>{const u=st.userData.u;u.uTime.value=t;
  const f=goalFlash[k]?Math.max(0,1-(nowMs-goalFlash[k])/1600):0;
  u.uFlash.value=Math.min(1,f*1.25);
  const red=u.uFlash.value>0;st.userData.orbs.forEach(o=>o.material.color.set(red?'#ff2a1a':'#'+(goalBase[k]?goalBase[k].getHexString():'38d6ff')));});
}
