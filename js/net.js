/* Multijogador online. O ANFITRIÃO (quem cria a sala) roda o jogo inteiro e envia "fotos" do estado
   ~20x por segundo; os convidados só mostram essas fotos e enviam seus comandos (toque, analógico, mira).
   Vagas sem jogador humano continuam sendo bots (rodam no anfitrião). */
const net={role:'offline',ws:null,slot:0,code:'',names:[null,null,null,null,null],humans:new Set(),mv:{},
 target:null,sm:null,smb:null,lastSnap:0,lastMv:0,lastMvKey:'',bwKey:'',prevTurn:-1};
const NET_TICK_MS=50;
/* Se o jogo estiver hospedado num site estático (Netlify, GitHub Pages...), coloque aqui o endereço
   do servidor online (ex.: 'jogo-do-pao.onrender.com'). Deixe vazio se o servidor serve o próprio jogo. */
const DEFAULT_SERVER='';
const r2=v=>Math.round(v*100)/100,clamp1=v=>Math.max(-1,Math.min(1,Number(v)||0));
function isHumanSlot(i){return i===humanIndex||net.humans.has(i)}

/* ---------- Conexão ---------- */
function netSendRaw(o){if(net.ws&&net.ws.readyState===1)net.ws.send(JSON.stringify(o))}
function netBroadcast(d){if(net.role==='host')netSendRaw({t:'bc',d})}
function netSendInput(d){if(net.role==='client')netSendRaw({t:'relay',d})}
function netSetStatus(msg,bad){const el=document.getElementById('netStatus');el.textContent=msg||'';el.className=bad?'bad':''}
function netServerUrl(){
 const v=(document.getElementById('netServer').value||'').trim();
 const proto=location.protocol==='https:'?'wss://':'ws://';
 if(v)return /^wss?:\/\//.test(v)?v:proto+v;
 if(DEFAULT_SERVER)return /^wss?:\/\//.test(DEFAULT_SERVER)?DEFAULT_SERVER:'wss://'+DEFAULT_SERVER;
 if(location.protocol==='file:')return null;
 return proto+location.host;
}
function netConnect(onOpen){
 const url=netServerUrl();
 if(!url){netSetStatus('Abra o jogo pelo servidor (npm start) ou informe o endereço do servidor.',true);return}
 netLeave(true);netSetStatus('Conectando…');
 let ws;try{ws=new WebSocket(url)}catch(e){netSetStatus('Endereço de servidor inválido.',true);return}
 net.ws=ws;
 ws.onopen=onOpen;
 ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}netOnMessage(m)};
 ws.onerror=()=>netSetStatus('Não foi possível conectar. O servidor está rodando?',true);
 ws.onclose=()=>{
  if(net.ws!==ws)return;
  const was=net.role!=='offline';
  netLeave(true);
  if(was){reset();showFlowScreen('screenOnline');netSetStatus('Conexão perdida.',true)}
 };
}
function netLeave(silent){
 const ws=net.ws;net.ws=null;if(ws){try{ws.close()}catch(e){}}
 net.role='offline';net.humans.clear();net.mv={};net.target=null;net.sm=null;net.smb=null;net.prevTurn=-1;net.bwKey='';
 tournamentCharacterLocked=false;
 document.body.classList.remove('net-client');
 document.getElementById('netLobby').hidden=true;
 document.getElementById('netJoinBox').hidden=false;
 if(!silent)netSetStatus('');
}
const netName=()=>(document.getElementById('netName').value||'').trim()||'Jogador';
const netPref=()=>Number(document.getElementById('netChar').value)||0;
document.getElementById('netCreate').addEventListener('click',()=>netConnect(()=>netSendRaw({t:'create',name:netName(),pref:netPref()})));
document.getElementById('netJoin').addEventListener('click',()=>{
 const code=document.getElementById('netCode').value.trim().toUpperCase();
 if(code.length<4){netSetStatus('Digite o código da sala.',true);return}
 netConnect(()=>netSendRaw({t:'join',code,name:netName(),pref:netPref()}));
});
document.getElementById('netStart').addEventListener('click',()=>{
 if(net.role!=='host')return;
 net.humans=new Set(net.names.map((n,i)=>n&&i!==net.slot?i:-1).filter(i=>i>=0));
 humanIndex=net.slot;tournamentCharacterLocked=true;
 netSendRaw({t:'lock'});netBroadcast({k:'begin'});
 reset();showFlowScreen('screenMinigames');
});
// Nome salvo no aparelho
try{document.getElementById('netName').value=localStorage.getItem('jogoDoPao.name')||''}catch(e){}
document.getElementById('netName').addEventListener('input',e=>{try{localStorage.setItem('jogoDoPao.name',e.target.value)}catch(_){}});
// Endereço do servidor pode vir na URL: ?server=meu-servidor.com
const _qs=new URLSearchParams(location.search);if(_qs.get('server'))document.getElementById('netServer').value=_qs.get('server');

/* ---------- Mensagens do servidor ---------- */
function netOnMessage(m){
 switch(m.t){
  case 'joined':
   net.slot=m.slot;net.code=m.code;net.role=m.host?'host':'client';humanIndex=m.slot;
   document.getElementById('netJoinBox').hidden=true;document.getElementById('netLobby').hidden=false;
   document.getElementById('netCodeShow').textContent=m.code;
   document.getElementById('netStart').style.display=m.host?'':'none';
   document.getElementById('netWait').style.display=m.host?'none':'';
   netSetStatus('');break;
  case 'lobby':net.names=m.names;netRenderLobby();break;
  case 'err':netSetStatus(m.m,true);break;
  case 'in':if(net.role==='host')netHostInput(m.slot,m.d);break;
  case 's':if(net.role==='client')netClientMsg(m.d);break;
  case 'left':if(net.role==='host')netHostLeft(m.slot);break;
  case 'closed':netLeave(true);reset();showFlowScreen('screenOnline');netSetStatus('O anfitrião encerrou a sala.',true);break;
 }
}
function netRenderLobby(){
 const box=document.getElementById('netPlayers');box.replaceChildren();
 net.names.forEach((n,i)=>{
  const row=document.createElement('div');row.className='net-row'+(n?' human':'')+(i===net.slot?' me':'');
  const a=document.createElement('b');a.textContent=specs[i].name;
  const b=document.createElement('span');b.textContent=n?(n+(i===net.slot?' (você)':'')):'🤖 Bot';
  row.append(a,b);box.append(row);
 });
}

/* ---------- ANFITRIÃO: recebe comandos dos convidados ---------- */
function netHostInput(slot,d){
 if(!net.humans.has(slot)||!d)return;
 if(d.k==='tap'){
  if(!running)return;
  if(gameMode==='bread'){const p=players[slot];if(p.count<100){p.count++;updateHud();if(p.count>=100)finish(p)}}
  else if(gameMode==='ball'){if(balls[slot].alive)ballPush(slot)}
  else if(gameMode==='bowling'&&bowlingOrder[bowlingTurn]===slot)remoteBowlThrow(slot,d.aim,d.pow);
 }else if(d.k==='mv')net.mv[slot]={x:clamp1(d.x),y:clamp1(d.y)};
 else if(d.k==='aim')remoteBowlAim(slot,d.v);
}
function netHostLeft(slot){
 net.humans.delete(slot);delete net.mv[slot];
 if(!running)return;
 if(gameMode==='bread'&&players[slot].count<100)botTick(players[slot]); // bot assume
 if(gameMode==='bowling'&&bowlingOrder[bowlingTurn]===slot&&!bowlingBallState)botTimers.push(setTimeout(()=>throwBowlingBall(slot),900));
}
function netSnapshot(){
 const S={k:'snap',m:gameMode,r:running?1:0,st:document.getElementById('status').textContent,
  p:players.map(p=>[r2(p.root.position.x),r2(p.root.position.y),r2(p.root.position.z),r2(p.root.rotation.y),r2(p.root.rotation.x),p.root.visible?1:0,p.count,p.finished?1:0]),
  bi:players.findIndex(p=>p.biting)};
 const lt=document.getElementById('lastPlayerTimer');S.lt=lt.classList.contains('show')?lt.innerHTML:'';
 if(gameMode==='ball')S.b=balls.map(b=>[r2(b.mesh.position.x),r2(b.mesh.position.y),r2(b.mesh.position.z),b.alive?1:0,b.falling?1:0,b.mesh.visible?1:0]);
 if(gameMode==='bowling')S.bw={o:bowlingOrder,t:bowlingTurn,s:bowlingScores,f:bowlingBallState?1:0,
  ball:[r2(bowlingBall.position.x),r2(bowlingBall.position.y),r2(bowlingBall.position.z)],
  pins:bowlingPins.map(q=>[r2(q.mesh.position.x),r2(q.mesh.position.y),r2(q.mesh.position.z),r2(q.mesh.rotation.x),r2(q.mesh.rotation.z)])};
 return S;
}
function netHostFrame(now){
 if(net.role!=='host'||now-net.lastSnap<NET_TICK_MS)return;
 net.lastSnap=now;netBroadcast(netSnapshot());
}
/* Envia o placar atual (já montado na tela do anfitrião) para os convidados. */
function netSendOverlay(){
 if(net.role!=='host')return;
 netBroadcast({k:'overlay',title:document.getElementById('scoreOverlayTitle').textContent,lead:document.getElementById('scoreOverlayLead').textContent,html:document.getElementById('scoreOverlayContent').innerHTML});
}

/* ---------- CONVIDADO: recebe e exibe ---------- */
function netClientMsg(d){
 if(!d)return;
 switch(d.k){
  case 'begin':
   humanIndex=net.slot;tournamentCharacterLocked=true;document.body.classList.add('net-client');
   reset();showFlowScreen('screenMinigames');
   document.getElementById('status').textContent='Aguardando o anfitrião iniciar a partida…';break;
  case 'start':
   document.getElementById('scoreOverlay').classList.remove('show');
   document.getElementById('gameMode').value=d.mode;reset();running=true;ended=false;net.bwKey='';net.prevTurn=-1;netClientUI();break;
  case 'ovhide':document.getElementById('scoreOverlay').classList.remove('show');break;
  case 'overlay':netShowOverlay(d);break;
  case 'snap':netApplySnap(d);break;
 }
}
function netShowOverlay(d){
 const c=document.getElementById('scoreOverlayContent');
 document.getElementById('scoreOverlayTitle').textContent=d.title;
 document.getElementById('scoreOverlayLead').textContent=d.lead;
 c.innerHTML=d.html;
 c.querySelectorAll('.you').forEach(e=>e.remove());
 const cell=c.querySelector('tr[data-slot="'+humanIndex+'"] td:nth-child(2)');
 if(cell)cell.insertAdjacentHTML('beforeend',' <strong class="you" style="color:#8af0b3">(VOCÊ)</strong>');
 const act=c.querySelector('.points-actions');if(act)act.innerHTML='<span class="net-wait">⏳ Aguardando o anfitrião iniciar a próxima rodada…</span>';
 document.getElementById('scoreOverlay').classList.add('show');
}
function netClientUI(){
 let ok=running;
 if(gameMode==='bowling')ok=running&&bowlingOrder[bowlingTurn]===humanIndex&&!bowlingBallState;
 document.getElementById('tap').disabled=!ok;
}
function netApplySnap(S){
 if(!net.sm){net.sm=S.p.map(a=>[a[0],a[1],a[2]]);net.smb=S.b?S.b.map(a=>[a[0],a[1],a[2]]):null}
 if(S.b&&!net.smb)net.smb=S.b.map(a=>[a[0],a[1],a[2]]);
 net.target=S;
 if(S.m!==gameMode){document.getElementById('gameMode').value=S.m;applyMode()}
 running=!!S.r;
 players.forEach((p,i)=>{
  const a=S.p[i];p.count=a[6];p.root.visible=!!a[5];
  if(a[7]&&!p.finished){throwCream(p);addCream()}
 });
 if(S.bi>=0&&!players[S.bi].biting){const p=players[S.bi];p.biting=true;p.biteAt=performance.now()}
 if(S.b)balls.forEach((b,i)=>{b.alive=!!S.b[i][3];b.falling=!!S.b[i][4];b.mesh.visible=!!S.b[i][5]});
 if(S.bw){
  bowlingOrder=S.bw.o;bowlingScores=S.bw.s;bowlingTurn=S.bw.t;bowlingBallState=S.bw.f?{}:null;
  const key=S.bw.t+'|'+S.bw.s.join()+'|'+S.bw.f;
  if(key!==net.bwKey){
   net.bwKey=key;
   if(S.bw.t!==net.prevTurn){
    net.prevTurn=S.bw.t;
    if(bowlingOrder[S.bw.t]===humanIndex){bowlingAimValue=0;bowlingPowerValue=70;document.getElementById('bowlingPower').value='70';updateBowlingControlValues();showBowlingArrowHint()}
   }
   applyBowlingVisibility();updateBowlingMoveControls();updateBowlingHud();
  }
 }
 const st=document.getElementById('status');if(st.textContent!==S.st)st.textContent=S.st;
 const lt=document.getElementById('lastPlayerTimer');
 if(S.lt){if(lt.innerHTML!==S.lt)lt.innerHTML=S.lt;lt.classList.add('show')}else lt.classList.remove('show');
 updateHud();netClientUI();
}
/* Chamado a cada frame no convidado: suaviza posições e envia o analógico. */
function netClientFrame(dt,now){
 const S=net.target;if(!S||!net.sm)return;
 const k=Math.min(1,dt*14);
 const myTurn=!!(S.bw&&S.bw.o[S.bw.t]===humanIndex&&!S.bw.f);
 players.forEach((p,i)=>{
  if(p.biting)return;
  const a=S.p[i],sm=net.sm[i];
  sm[0]+=(a[0]-sm[0])*k;sm[1]+=(a[1]-sm[1])*k;sm[2]+=(a[2]-sm[2])*k;
  if(gameMode==='bowling'&&i===humanIndex&&myTurn)return; // sua posição é local
  p.root.position.set(sm[0],sm[1],sm[2]);p.root.rotation.y=a[3];p.root.rotation.x=a[4];
 });
 if(S.b&&net.smb)balls.forEach((b,i)=>{const t=S.b[i],sm=net.smb[i];sm[0]+=(t[0]-sm[0])*k;sm[1]+=(t[1]-sm[1])*k;sm[2]+=(t[2]-sm[2])*k;b.mesh.position.set(sm[0],sm[1],sm[2])});
 if(S.bw){
  S.bw.pins.forEach((a,i)=>{const m=bowlingPins[i].mesh;m.position.set(a[0],a[1],a[2]);m.rotation.set(a[3],0,a[4])});
  if(!(myTurn)){bowlingBall.position.x+=(S.bw.ball[0]-bowlingBall.position.x)*k;bowlingBall.position.y=S.bw.ball[1];bowlingBall.position.z=S.bw.ball[2]}
  if(S.bw.f)bowlingBall.rotation.x-=.3;
 }
 if(gameMode==='ball'&&running&&now-net.lastMv>=66){
  const v=humanMoveVector(),key=r2(v.x)+','+r2(v.y);
  if(key!==net.lastMvKey||now-net.lastMv>400){net.lastMvKey=key;net.lastMv=now;netSendInput({k:'mv',x:r2(v.x),y:r2(v.y)})}
 }
}
