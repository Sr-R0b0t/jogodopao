/* Minigame: Esconde e Marreta — a cada rodada UM jogador se esconde sob uma das 4 plataformas coloridas (⬅ verde, ⬆ rosa, ⬇ azul, ➡ amarela)
   e os OUTROS escolhem, em segredo, onde dar a marretada. Depois as marretas caem: se alguém marretou a plataforma do escondido, ele é pego.
   Pontos: escondido que escapa +3 • marretador que acerta +2. Cada jogador se esconde uma vez (no máx. 6 rodadas).
   O anfitrião/offline roda tudo; a escolha do escondido NÃO é enviada aos convidados antes da revelação. */
const HAMMER={hideSec:6,strikeSec:8,introMs:1600,revealGap:520,resultMs:2100,maxRounds:1,rounds:3,hp:3,win:5};
const HM_PADS=[{x:-2.7,z:.1,c:'#a7e23a',n:'VERDE',a:'⬅'},{x:0,z:-2.3,c:'#f270d8',n:'ROSA',a:'⬆'},{x:0,z:2.5,c:'#32d8cf',n:'AZUL',a:'⬇'},{x:2.7,z:.1,c:'#f6dc3d',n:'AMARELA',a:'➡'}];
const hammerRoot=new THREE.Group();scene.add(hammerRoot);hammerRoot.visible=false;
const hmPads=[],hmHoles=[],hmHammers=[],hmLabels=[];
{
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(60,40),mat('#3b3552',.9,.05));fl.rotation.x=-Math.PI/2;fl.position.y=-.9;hammerRoot.add(fl);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(5.1,5.3,.7,48),mat('#4e6a8f',.6,.25));base.position.y=-.55;hammerRoot.add(base);
 const top=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,.34,48),mat('#eadbe9',.55,.05));top.position.y=-.17;top.receiveShadow=true;hammerRoot.add(top);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(4.5,.17,10,56),mat('#7389ad',.5,.3));rim.rotation.x=Math.PI/2;rim.position.y=0;hammerRoot.add(rim);
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2,b=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.05,8),mat('#9aa8c0',.4,.5));b.position.set(Math.cos(a)*4.2,.01,Math.sin(a)*4.2);hammerRoot.add(b)}
 const arrow=(dir,col)=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='rgba(255,255,255,.92)';g.save();g.translate(64,64);g.rotate({0:Math.PI,1:-Math.PI/2,2:Math.PI/2,3:0}[dir]);g.beginPath();g.moveTo(26,0);g.lineTo(-20,-30);g.lineTo(-20,30);g.closePath();g.fill();g.restore();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t};
 HM_PADS.forEach((p,i)=>{
  const hole=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.08,.12,32),new THREE.MeshBasicMaterial({color:'#100c18'}));hole.position.set(p.x,.0,p.z);hammerRoot.add(hole);hmHoles.push(hole);
  const g=new THREE.Group();g.position.set(p.x,0,p.z);
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(1.18,1.18,.2,32),mat('#6f7d96',.45,.4));ring.position.y=.04;g.add(ring);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.02,1.02,.24,32),mat(p.c,.35,.1));pad.position.y=.1;g.add(pad);
  const ar=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.05),new THREE.MeshBasicMaterial({map:arrow(i),transparent:true}));ar.rotation.x=-Math.PI/2;ar.position.y=.235;g.add(ar);
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.04,.02,1.9),mat('#00000033',1,0));seam.position.y=.232;seam.rotation.y=(i===0||i===3)?0:Math.PI/2;g.add(seam);
  hammerRoot.add(g);hmPads.push(g);
  // marreta
  const h=new THREE.Group();h.position.set(p.x,6.5,p.z);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,9,10),mat('#b9c2d3',.4,.6));pole.position.y=5;h.add(pole);
  const head=new THREE.Mesh(new THREE.CylinderGeometry(.66,.66,1.0,24),mat('#e9494b',.45,.05));head.position.y=.5;h.add(head);
  const gold=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,.24,24),mat('#e7b640',.35,.5));gold.position.y=.55;h.add(gold);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.5,.66,.2,24),mat('#c63a3d',.5,.05));cap.position.y=1.05;h.add(cap);
  h.visible=false;hammerRoot.add(h);hmHammers.push(h);
  // rótulo (quem marretou aqui / onde o escondido estava)
  const c=document.createElement('canvas');c.width=300;c.height=130;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false}));sp.scale.set(2.6,1.13,1);sp.position.set(p.x,1.5,p.z);sp.renderOrder=12;sp.visible=false;hammerRoot.add(sp);
  hmLabels.push({sp,c,t,txt:''});
 });
}
function hmDrawLabel(i,lines,col){
 const L=hmLabels[i],key=lines.join('|')+col;if(L.txt===key)return;L.txt=key;
 const g=L.c.getContext('2d');g.clearRect(0,0,300,130);g.fillStyle='rgba(20,12,34,.9)';g.beginPath();g.roundRect?g.roundRect(6,6,288,118,22):g.rect(6,6,288,118);g.fill();g.lineWidth=5;g.strokeStyle=col;g.stroke();
 g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';const n=lines.length,fs=n>2?30:36;g.font='900 '+fs+'px system-ui,sans-serif';
 lines.slice(0,3).forEach((s,k)=>g.fillText(s,150,65+(k-(Math.min(n,3)-1)/2)*(fs+4)));L.t.needsUpdate=true;
}
/* ---------- estado ---------- */
let hammer=null,hammerClient=null,hammerSentKey=-1,hmMine=undefined,hmMineKey=-1,hmRevKey='',hmRevStart=0,hmCueKey='',hmHudSig='';
const hmHid=B=>B.hider!==undefined?B.hider:B.h;
function hammerView(){return net.role==='client'?hammerClient:hammer}
function hmStrikers(){const B=hammer;return activeIndices().filter(i=>i!==B.hider)}
function hmLine(i,n){const act=activeIndices(),k=Math.max(0,act.indexOf(i)),m=n;return {x:(k-(m-1)/2)*Math.min(1.15,7.4/Math.max(1,m-1)),z:5.7}}
function hmPlaceStrikers(){
 const B=hammer,act=activeIndices(),st=act.filter(i=>i!==B.hider);
 act.forEach(i=>{const p=players[i];
  if(i===B.hider){p.root.position.set(0,-40,0)}
  else{const k=st.indexOf(i),n=st.length;p.root.position.set((k-(n-1)/2)*Math.min(1.25,7.6/Math.max(1,n-1)),0,5.7);p.root.rotation.y=Math.PI}
  p.root.visible=true});
}
function setupHammer(){
 hammer=null;hammerClient=null;hammerSentKey=-1;hmMine=undefined;hmRevKey='';
 const act=activeIndices();act.forEach((i,k)=>{const p=players[i];p.count=0;p.root.position.set((k-(act.length-1)/2)*1.2,0,5.7);p.root.rotation.set(0,Math.PI,0);p.root.scale.setScalar(.95);p.root.visible=true});
 hmLabels.forEach(l=>l.sp.visible=false);hmHammers.forEach(h=>h.visible=false);
}
function startHammer(){
 const now=performance.now(),act=activeIndices(),order=act.slice().sort(()=>Math.random()-.5).slice(0,Math.min(act.length,HAMMER.maxRounds));
 hammer={ph:'intro',t0:now,order,R:order.length,r:-1,rd:0,hits:0,hider:-1,hideChoice:undefined,picks:{},left:0,need:[],pts:{},botAt:{},rv:null,key:Math.floor(Math.random()*1e6),hist:{},lastPad:{}};
 act.forEach(i=>{hammer.pts[i]=0;hammer.hist[i]={win:0,lose:0,gave:0};players[i].count=0});
 document.getElementById('status').textContent='🔨 Esconde e Marreta: um jogador se esconde, os outros tentam acertar a plataforma! Escondidos: '+order.map(i=>players[i].name).join(' → ');
}
function hmNextRound(now){
 const B=hammer;B.r++;
 if(B.r>=B.R){hammerFinish();return}
 B.hider=B.order[B.r];B.rd=0;B.hits=0;B.hideChoice=undefined;B.picks={};B.rv=null;B.ph='draw';B.t0=now;B.left=0;B.key++;B.need=[];B.drawShown=-1;
 const act=activeIndices(),n=act.length;
 act.forEach((i,k)=>{const p=players[i];p.root.position.set((k-(n-1)/2)*Math.min(1.25,7.6/Math.max(1,n-1)),0,5.7);p.root.rotation.y=Math.PI;p.root.visible=true});
 document.getElementById('status').textContent='🎲 Sorteando quem vai se ESCONDER…';
}
function hmEndDraw(now){
 const B=hammer;B.ph='hide';B.t0=now;B.left=HAMMER.hideSec;B.key++;
 hmPlaceStrikers();
 B.need=isHumanSlot(B.hider)?[B.hider]:[];B.botAt={};B.botAt[B.hider]=now+900+Math.random()*2200;
 document.getElementById('status').textContent=B.rd>0?'🙈 Rodada '+(B.rd+1)+'/'+HAMMER.rounds+' — '+players[B.hider].name+' se esconde de novo! ❤ '+(HAMMER.hp-B.hits):'🙈 '+players[B.hider].name+' é o ESCONDEDOR! Os '+hmStrikers().length+' outros vão marretar ('+HAMMER.rounds+' rodadas, ❤ '+HAMMER.hp+').';
}
function hammerSetChoice(slot,c){
 const B=hammer;if(!B)return;c=Math.round(Number(c));if(!(c>=0&&c<=3))return;
 if(B.ph==='hide'&&slot===B.hider&&B.hideChoice===undefined){B.hideChoice=c;B.need=[]}
 else if(B.ph==='strike'&&slot!==B.hider&&B.picks[slot]===undefined&&activeIndices().includes(slot)){B.picks[slot]=c;B.need=B.need.filter(s=>s!==slot)}
}
function hmBotHide(i){const B=hammer;let c=Math.floor(Math.random()*4);if(B.lastPad[i]===c&&Math.random()<.6)c=(c+1+Math.floor(Math.random()*3))%4;return c}
function hmBotStrike(i){
 const B=hammer,cnt=[0,0,0,0];Object.values(B.picks).forEach(c=>cnt[c]++);
 const m=Math.min(...cnt),opts=[0,1,2,3].filter(c=>cnt[c]===m);
 return Math.random()<.75?opts[Math.floor(Math.random()*opts.length)]:Math.floor(Math.random()*4);
}
function hmReveal(now){
 const B=hammer,order=[],picks=B.picks;
 hmStrikers().forEach(i=>{if(!order.includes(picks[i]))order.push(picks[i])});
 const hp=B.hideChoice,hitters=hmStrikers().filter(i=>picks[i]===hp),caught=hitters.length>0,gains={};
 if(caught)B.hits++;
 B.lastPad[B.hider]=hp;
 B.lost=false;B.rv={pads:order,hp,caught,hitters,picks:Object.assign({},picks),fired:0,lives:HAMMER.hp-B.hits};B.ph='reveal';B.t0=now;B.key++;B.need=[];
 const hr=players[B.hider].root;hr.position.set(HM_PADS[hp].x,-1.1,HM_PADS[hp].z);hr.rotation.set(0,Math.PI,0);hr.scale.setScalar(.95);
 document.getElementById('status').textContent='🔨 As marretas vão cair! '+players[B.hider].name+' estava na plataforma '+HM_PADS[hp].n+'…';
}
function updateHammerMode(now,dt){
 if(gameMode!=='hammer'||!running||!hammer)return;
 const B=hammer;
 if(B.ph==='intro'){if(now-B.t0>HAMMER.introMs)hmNextRound(now)}
 else if(B.ph==='draw'){
  const el=now-B.t0,act=activeIndices(),pick=Math.floor(el/140),fin=el>=1900;
  const shown=fin?B.hider:act[pick%act.length];
  if(shown!==B.drawShown){B.drawShown=shown;fx('beep',fin?880:520)}
  act.forEach(i=>{const p=players[i];p.root.position.z=(i===shown)?4.5:5.7;p.root.scale.setScalar(i===shown?1.2:.95)});
  if(fin){document.getElementById('status').textContent='🎲 '+players[B.hider].name+' foi sorteado para se ESCONDER!'}
  if(el>2700){act.forEach(i=>players[i].root.scale.setScalar(.95));hmEndDraw(now)}
 }
 else if(B.ph==='hide'){
  const els=now-B.t0;B.left=Math.max(0,Math.ceil(HAMMER.hideSec-els/1000));
  if(B.hideChoice===undefined&&!isHumanSlot(B.hider)&&now>=B.botAt[B.hider])B.hideChoice=hmBotHide(B.hider);
  if(B.hideChoice===undefined&&els>HAMMER.hideSec*1000)B.hideChoice=Math.floor(Math.random()*4);
  if(B.hideChoice!==undefined){
   B.need=[];B.ph='strike';B.t0=now;B.left=HAMMER.strikeSec;B.picks={};B.key++;
   hmStrikers().forEach(i=>{B.botAt[i]=now+900+Math.random()*3600});
   B.need=hmStrikers().filter(i=>isHumanSlot(i));
   document.getElementById('status').textContent='🔨 '+players[B.hider].name+' se escondeu! Marretadores: escolham onde bater!';
  }
 }else if(B.ph==='strike'){
  const els=now-B.t0,st=hmStrikers();B.left=Math.max(0,Math.ceil(HAMMER.strikeSec-els/1000));
  st.forEach(i=>{if(B.picks[i]===undefined&&!isHumanSlot(i)&&now>=B.botAt[i]){B.picks[i]=hmBotStrike(i);B.need=B.need.filter(s=>s!==i)}});
  if(els>HAMMER.strikeSec*1000)st.forEach(i=>{if(B.picks[i]===undefined)B.picks[i]=Math.floor(Math.random()*4)});
  if(st.every(i=>B.picks[i]!==undefined))hmReveal(now);
 }else if(B.ph==='reveal'){
  const el=now-B.t0,rv=B.rv,hr=players[B.hider].root,n=rv.pads.length,hk=rv.pads.indexOf(rv.hp);
  // som de cada marretada
  while(rv.fired<n&&el>=rv.fired*HAMMER.revealGap+170){fx('hammer');rv.fired++}
  if(el<260)hr.position.y=-1.1+Math.min(1,el/260)*1.1;
  const tHit=hk*HAMMER.revealGap+170;
  if(rv.caught&&el>tHit){const u=(el-tHit)/1000;hr.position.y=Math.min(9,u*10);hr.rotation.y=Math.PI+u*9;hr.position.z=HM_PADS[rv.hp].z-u*2}
  else if(!rv.caught&&el>n*HAMMER.revealGap+300){hr.position.y=Math.abs(Math.sin((el-n*HAMMER.revealGap)/170))*.5}
  if(el>n*HAMMER.revealGap+800){
   B.ph='result';B.t0=now;B.key++;hr.rotation.y=Math.PI;
   const nm=i=>players[i].name;
   document.getElementById('status').textContent=rv.caught?'💥 '+nm(B.hider)+' levou marretada de '+rv.hitters.map(nm).join(', ')+'! Vidas: '+'❤'.repeat(rv.lives)+(rv.lives?'':' 💔'):'🙈 '+nm(B.hider)+' escapou desta rodada! Vidas: '+'❤'.repeat(rv.lives);
   fx(rv.caught?'jingleLose':'jingle')
  }
 }else if(B.ph==='result'){
  if(now-B.t0>HAMMER.resultMs){
   if(B.rd<HAMMER.rounds-1){B.rd++;B.rv=null;B.picks={};B.hideChoice=undefined;hmEndDraw(now)}
   else hmSetEnd(now);
  }
 }else if(B.ph==='setend'){
  if(now-B.t0>HAMMER.resultMs+400){players[B.hider].root.position.set(0,-40,0);hmNextRound(now)}
 }
}
function hmSetEnd(now){
 const B=hammer,h=B.hider,lost=B.hits>=HAMMER.hp,st=hmStrikers();
 if(lost){st.forEach(i=>{B.pts[i]+=HAMMER.win;players[i].count=B.pts[i];B.hist[i].gave++});B.hist[h].lose++}
 else{B.pts[h]+=HAMMER.win;players[h].count=B.pts[h];B.hist[h].win++}
 B.ph='setend';B.t0=now;B.key++;B.need=[];B.rv=B.rv?Object.assign({},B.rv):null;B.lost=lost;
 const hr=players[h].root;hr.position.set(0,0,0);hr.rotation.set(0,Math.PI,0);hr.scale.setScalar(1.1);
 document.getElementById('status').textContent=lost?'💔 '+players[h].name+' perdeu as '+HAMMER.hp+' vidas! +'+HAMMER.win+' para cada um dos outros.':'🏆 '+players[h].name+' sobreviveu! +'+HAMMER.win+' pontos!';
 if(!lost){fx('finish')}else fx('jingleLose');
}
function hammerFinish(){
 if(ended)return;
 ended=true;running=false;clearBots();
 const B=hammer,act=activeIndices(),ord=act.slice().sort((a,b)=>B.pts[b]-B.pts[a]),ranking=[],detail={};
 act.forEach(i=>players[i].root.position.set(players[i].root.position.x,0,players[i].root.position.z));
 ord.forEach(i=>{const last=ranking[ranking.length-1];if(last&&B.pts[last[0]]===B.pts[i])last.push(i);else ranking.push([i]);
  const h=B.hist[i];detail[i]=B.pts[i]+' pts • '+(B.order.includes(i)?(h.win?'sobreviveu ao se esconder':'perdeu as vidas ao se esconder'):'não se escondeu')+(h.gave?' • ajudou a derrubar '+h.gave+(h.gave===1?' escondido':' escondidos'):'')});
 const lead=ranking[0].map(i=>players[i].name).join(', ')+' '+(ranking[0].length>1?'lideram':'lidera')+' com '+B.pts[ranking[0][0]]+' pontos!';
 document.getElementById('status').textContent=lead;
 showScoreScreen(ranking,'Esconde e Marreta','🔨 Fim das marretadas!',lead,detail);
}
/* ---------- interface ---------- */
function hammerChoose(c){
 const B=hammerView();if(!B||!(B.ph==='hide'||B.ph==='strike')||!B.need||!B.need.includes(humanIndex)||hammerSentKey===B.key)return;
 if(B.ph==='hide'){hmMine=c;hmMineKey=B.key}
 if(net.role==='client')netSendInput({k:'hc',c});else hammerSetChoice(humanIndex,c);
 hammerSentKey=B.key;if(audioEnabled)sfxClick();
}
function hammerUiUpdate(){
 const panel=document.getElementById('hammerPick'),hud=document.getElementById('hammerHud');if(!panel||!hud)return;
 const B=hammerView(),on=gameMode==='hammer'&&!!B;
 hud.classList.toggle('show',on);
 if(!on){panel.classList.remove('show');return}
 const act=activeIndices(),sig=act.map(i=>(B.pts?B.pts[i]:0)||0).join(',');if(sig!==hmHudSig){hmHudSig=sig;act.forEach(i=>{players[i].count=(B.pts&&B.pts[i])||0});if(typeof updateHud==='function')updateHud()}
 const hn=hmHid(B)>=0&&players[hmHid(B)]?players[hmHid(B)].name:'';
 const ph=B.ph==='draw'?'🎲 Sorteando o escondedor…':B.ph==='hide'?'🙈 '+hn+' (escondedor) • ⏱ '+B.left+'s':B.ph==='strike'?'🔨 Marretadores escolhendo • ⏱ '+B.left+'s':B.ph==='reveal'?'💥 Marretadas!':B.ph==='result'?'Resultado':B.ph==='setend'?(B.lost?'💔 Escondido perdeu!':'🏆 Escondido venceu!'):'Preparando…';
 hud.textContent='🔨 '+Math.min(Math.max(1,(B.r||0)+1),B.R||1)+'/'+(B.R||1)+' • Rodada '+((B.rd||0)+1)+'/'+HAMMER.rounds+' • '+(hmHid(B)>=0&&players[hmHid(B)]?players[hmHid(B)].name+' '+'❤'.repeat(Math.max(0,B.hp===undefined?HAMMER.hp:B.hp))+(B.hp===0?'💔':'')+' • ':'')+ph+'  |  '+act.map(i=>players[i].name+' '+((B.pts&&B.pts[i])||0)).join(' • ');
 const mine=(B.ph==='hide'||B.ph==='strike')&&!!B.need&&B.need.includes(humanIndex)&&hammerSentKey!==B.key;
 panel.classList.toggle('show',mine);
 if(mine)document.getElementById('hammerPickTitle').textContent=(B.ph==='hide'?'🙈 Esconda-se! Escolha a plataforma':'🔨 Onde dar a marretada?')+'  ('+B.left+'s)';
}
document.querySelectorAll('#hammerPick button').forEach(b=>b.addEventListener('click',()=>hammerChoose(Number(b.dataset.c))));
window.addEventListener('keydown',e=>{
 if(gameMode!=='hammer')return;
 const m={ArrowLeft:0,KeyA:0,Digit1:0,ArrowUp:1,KeyW:1,Digit2:1,ArrowDown:2,KeyS:2,Digit3:2,ArrowRight:3,KeyD:3,Digit4:3}[e.code];
 if(m===undefined)return;e.preventDefault();hammerChoose(m);
});
function hammerAudioCue(){
 const B=hammerView();if(gameMode!=='hammer'||!B){hmCueKey='';return}
 const key=B.key+':'+B.ph;if(key===hmCueKey)return;hmCueKey=key;
 if((B.ph==='hide'||B.ph==='strike')&&B.need&&B.need.includes(humanIndex))sfxWhistle();
}
/* ---------- visual (todos) ---------- */
function hammerVisualUpdate(dt){
 if(gameMode!=='hammer')return;
 const B=hammerView(),now=performance.now();
 if(!B){hmHammers.forEach(h=>h.visible=false);hmLabels.forEach(l=>l.sp.visible=false);hmPads.forEach(p=>p.visible=true);hmHoles.forEach(h=>h.visible=false);return}
 const rvOn=(B.ph==='reveal'||B.ph==='result')&&B.rv;
 if(rvOn&&hmRevKey!==B.r+'r'){hmRevKey=B.r+'r';hmRevStart=now}
 if(!rvOn)hmRevKey='';
 const e=rvOn?now-hmRevStart:0,open=false;
 // plataformas: abrem (mostram o buraco) enquanto os marretadores escolhem
 hmPads.forEach((g,i)=>{g.visible=!(rvOn&&i===B.rv.hp);g.scale.y=1;hmHoles[i].visible=rvOn&&i===B.rv.hp});
 hmHammers.forEach(h=>h.visible=false);
 hmLabels.forEach(l=>l.sp.visible=false);
 if(rvOn){
  const rv=B.rv;
  rv.pads.forEach((pi,k)=>{
   const tk=k*HAMMER.revealGap,h=hmHammers[pi];let y=6.5;
   if(e>=tk&&e<tk+170)y=6.5-(6.5-.55)*((e-tk)/170);else if(e>=tk+170&&e<tk+330)y=.55;else if(e>=tk+330&&e<tk+620)y=.55+(6.5-.55)*((e-tk-330)/290);
   if(e>=tk&&e<tk+620){h.visible=true;h.position.y=y}
   if(pi!==rv.hp&&e>=tk+170&&e<tk+420)hmPads[pi].scale.y=.4;
   // rótulo: quem marretou aqui
   const names=Object.keys(rv.picks).filter(s=>rv.picks[s]===pi).map(s=>players[s].name.slice(0,9));
   const lab=hmLabels[pi];lab.sp.visible=true;
   if(pi===rv.hp)hmDrawLabel(pi,['🙈 '+players[hmHid(B)].name.slice(0,9)].concat(names.length?names.slice(0,2):['ninguém bateu']),rv.caught?'#ff6a5a':'#8af0b3');
   else hmDrawLabel(pi,names.length?names.slice(0,3):['—'],'#c5a1ec');
  });
  if(!rv.pads.includes(rv.hp)){const lab=hmLabels[rv.hp];lab.sp.visible=true;hmDrawLabel(rv.hp,['🙈 '+players[hmHid(B)].name.slice(0,9),'ninguém bateu'],'#8af0b3')}
 }
 // indicador privado para o escondido: onde ele está
 const hid=hmHid(B);
 if((B.ph==='hide'||B.ph==='strike')&&hid===humanIndex&&hmMine!==undefined&&hmMineKey>=B.key-1){const lab=hmLabels[hmMine];lab.sp.visible=true;hmDrawLabel(hmMine,['🙈 VOCÊ','está aqui'],'#ffdf79')}
}
function hammerSnapshot(){
 const B=hammer;if(!B)return null;const n=players.length,pts=new Array(n).fill(0),pk=new Array(n).fill(0);
 activeIndices().forEach(i=>{pts[i]=B.pts[i]||0;pk[i]=B.picks[i]!==undefined?1:0});
 const S={ph:B.ph,key:B.key,r:B.r,R:B.R,rd:B.rd,hp:HAMMER.hp-B.hits,lost:!!B.lost,h:B.hider,left:B.left,need:B.need,pts,pk};
 if((B.ph==='reveal'||B.ph==='result'||B.ph==='setend')&&B.rv)S.rv={pads:B.rv.pads,hp:B.rv.hp,caught:B.rv.caught,picks:B.rv.picks,lives:B.rv.lives};
 return S;
}
