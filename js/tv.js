/* Modo TV: a TV (ou o computador ligado nela) é a anfitriã SEM personagem. Mostra um QR code; quem escaneia
   abre controle.html no celular e vira jogador. Controles (gamepad) ligados na TV também entram como jogadores. */
const tvForced=/[?&]tv(=1|=true|&|$)/.test(location.search);
const tvPads={};            // índice do gamepad -> vaga (slot)
const tvPadBowl={};         // vaga -> {aim,pow,turn} (boliche com controle)
let tvUiSent={},tvLastPush=0;
/* Cada jogador ganha uma cor própria (marca no boneco, lista da sala e painel do celular). */
const TV_COLORS=['#ff3b3b','#3b8bff','#35d45a','#ffd21f','#b04dff','#ff8a1f','#19e6ff','#ff6fc8'];
let tvColorMap={};
function tvColor(slot){
 if(tvColorMap[slot]===undefined){const used=new Set(Object.values(tvColorMap));tvColorMap[slot]=TV_COLORS.find(c=>!used.has(c))||TV_COLORS[slot%TV_COLORS.length]}
 return tvColorMap[slot];
}
function tvSetCount(n){
 if(tournamentCharacterLocked||!Number.isFinite(n))return;
 const sel=document.getElementById('netPlayerCount');
 sel.value=String(Math.max(2,Math.min(8,Math.round(n))));tvUiSent={};
}
function tvCtl(d){if(d.a==='cnt')tvSetCount(Number(d.n));else tvPrimaryAction(true)}
/* ---- Conexão direta celular <-> TV (WebRTC). O servidor só faz a "apresentação"; os comandos passam direto pela rede local
   (bem menos atraso). Se não conectar, tudo segue pelo servidor como antes. ---- */
const TV_ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
const tvPeers={};
function tvClosePeer(slot){const P=tvPeers[slot];if(P){try{P.pc.close()}catch(e){}delete tvPeers[slot]}}
function tvRtc(slot,d){
 if(!window.RTCPeerConnection)return;
 if(d.t==='offer'){
  tvClosePeer(slot);
  let pc;try{pc=new RTCPeerConnection(TV_ICE)}catch(e){return}
  const P={pc,q:[],rd:false};tvPeers[slot]=P;
  pc.onicecandidate=e=>{if(e.candidate)netSendRaw({t:'cc',slot,d:{k:'rtc',t:'ice',c:e.candidate.toJSON()}})};
  pc.ondatachannel=e=>{
   const ch=e.channel;
   ch.onmessage=ev=>{
    let m;try{m=JSON.parse(ev.data)}catch(_){return}
    if(m.k==='png'){try{ch.send(JSON.stringify({k:'pong',ts:m.ts}))}catch(_){}return}
    const s=(Number.isInteger(m._s)&&net.names[m._s]&&!tvLocalSlots().has(m._s))?m._s:slot;delete m._s;
    netHostInput(s,m);
   };
  };
  pc.setRemoteDescription({type:'offer',sdp:d.sdp}).then(()=>pc.createAnswer()).then(a=>pc.setLocalDescription(a)).then(()=>{
   P.rd=true;netSendRaw({t:'cc',slot,d:{k:'rtc',t:'answer',sdp:pc.localDescription.sdp}});
   P.q.forEach(c=>pc.addIceCandidate(c).catch(()=>{}));P.q=[];
  }).catch(()=>{});
 }else if(d.t==='ice'){
  const P=tvPeers[slot];if(!P||!d.c)return;
  if(P.rd)P.pc.addIceCandidate(d.c).catch(()=>{});else P.q.push(d.c);
 }
}
const tvLocalSlots=()=>new Set(Object.values(tvPads));

function tvReset(){
 Object.keys(tvPads).forEach(k=>delete tvPads[k]);tvUiSent={};tvColorMap={};Object.keys(tvPeers).forEach(s=>tvClosePeer(s));
 const box=document.getElementById('tvBox');if(box)box.hidden=true;
 if(!tvForced)document.body.classList.remove('tv-mode');
 tvPixelRatio(false);
}
function tvFullscreen(){
 try{const d=document.documentElement;if(!document.fullscreenElement&&d.requestFullscreen)d.requestFullscreen().catch(()=>{})}catch(e){}
}
function tvStartRoom(){
 document.body.classList.add('tv-mode');tvFullscreen();
 showFlowScreen('screenOnline');
 netConnect(()=>netSendRaw({t:'create',tv:true,name:'TV'}));
}
document.getElementById('goTV').addEventListener('click',tvStartRoom);
document.getElementById('tvFull').addEventListener('click',tvFullscreen);
document.getElementById('backHomeOnline').addEventListener('click',()=>{if(!tvForced)document.body.classList.remove('tv-mode')});
if(tvForced){document.body.classList.add('tv-mode');setTimeout(()=>{const b=document.getElementById('goTV');if(b)b.focus()},300)}

/* Endereço que o celular abre (controle.html na mesma pasta/servidor). */
function tvJoinUrl(){
 const base=location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/,'')+'controle.html';
 const q=new URLSearchParams({sala:net.code});
 const sv=(document.getElementById('netServer').value||'').trim()||DEFAULT_SERVER;
 if(sv)q.set('server',sv);
 return base+'?'+q.toString();
}
function tvRenderQR(){
 const url=tvJoinUrl(),cv=document.getElementById('tvQR');
 document.getElementById('tvUrl').textContent=url.replace(/^https?:\/\//,'').replace(/\?.*$/,'');
 document.getElementById('tvCode').textContent=net.code;
 const local=/^(localhost|127\.|\[::1\])/.test(location.hostname)||location.protocol==='file:';
 document.getElementById('tvWarn').hidden=!local;
 try{
  const qr=qrcode(0,'M');qr.addData(url);qr.make();
  const n=qr.getModuleCount(),quiet=4,cell=Math.max(4,Math.floor(560/(n+quiet*2))),size=(n+quiet*2)*cell;
  cv.width=cv.height=size;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,size,size);c.fillStyle='#1b1030';
  for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(qr.isDark(r,k))c.fillRect((k+quiet)*cell,(r+quiet)*cell,cell,cell);
 }catch(e){console.error(e)}
}
function tvPixelRatio(on){ // TVs costumam ter tela 4K: limitar a resolução mantém o jogo fluido (menos atraso no controle)
 renderer.setPixelRatio(on?Math.min(devicePixelRatio,1.25):Math.min(devicePixelRatio,LOW_POWER?1.5:2));resize();
}
function tvOnJoined(){
 tvPixelRatio(true);
 document.body.classList.add('tv-mode');
 document.getElementById('tvBox').hidden=false;
 tvRenderQR();tvUiSent={};
}
function tvOnLobby(){
 if(!net.tv)return;
  if(!tournamentCharacterLocked)Object.keys(tvColorMap).forEach(s=>{if(!net.names[s])delete tvColorMap[s]}); // libera a cor de quem saiu
 net.names.forEach((nm,i)=>{if(nm)tvColor(i)});
 tvUiSent={}; // reenvia o painel para todos (inclusive quem reconectou)
 const n=net.names.filter(Boolean).length;
 document.getElementById('tvHint').textContent=n?'👆 Quem entrou primeiro (👑) inicia a partida pelo celular — ou aperte START no controle. 🎮 No controle: ▲▼ muda a quantidade de jogadores.':'📱 Escaneie o QR code com a câmera do celular. 🎮 Tem controle? Aperte A para entrar.';
}

/* Ação principal da vez (iniciar / próxima rodada / pódio…). Quem tem permissão: celular VIP, START do controle, Enter. */
function tvPrimary(){
 const click=b=>({label:b.textContent.trim(),run:()=>b.click()});
 if(podiumActive){const b=document.getElementById('podiumAgain');return b?click(b):null}
 const ov=document.getElementById('scoreOverlay');
 if(ov.classList.contains('show')){
  for(const id of ['playNextRound','showPodiumBtn','resetTournament']){const b=document.getElementById(id);if(b&&b.getClientRects().length)return click(b)}
  return null;
 }
 const lobbyOn=document.getElementById('screenOnline').style.display!=='none'&&!document.getElementById('netLobby').hidden;
 if(lobbyOn&&!tournamentCharacterLocked&&net.names.some(Boolean))return {label:'▶ INICIAR PARTIDA',run:()=>document.getElementById('netStart').click()};
 return null;
}
function tvPrimaryAction(exec){const p=tvPrimary();if(p&&exec)p.run();return p}

/* Painel dos celulares: só reenvia quando algo muda. */
function tvFrame(now){
 if(!net.tv||net.role!=='host'||now-tvLastPush<100)return;tvLastPush=now;
 const prim=tvPrimary(),local=tvLocalSlots();
 const scr=podiumActive?'podium':document.getElementById('scoreOverlay').classList.contains('show')?'score':document.getElementById('screenMinigames').style.display!=='none'?'game':'lobby';
 net.names.forEach((nm,slot)=>{
  if(!nm||local.has(slot))return;
  const st={col:tvColor(slot),cnt:Number(document.getElementById('netPlayerCount').value),scr,mode:gameMode,run:running&&!ended?1:0,vip:slot===net.vip?1:0,prim:slot===net.vip&&prim?prim.label:'',go:tournamentCharacterLocked?1:0};
  if(scr==='game'){
   if(gameMode==='bowling'&&bowlingOrder){
    const cur=bowlingOrder[bowlingTurn];
    st.turn=(running&&cur===slot&&!bowlingBallState)?1:0;st.cur=cur!==undefined&&players[cur]?players[cur].name:'';
   }
   if(gameMode==='soccer'&&soccer&&soccer.ph==='pick'&&soccer.need&&soccer.need.includes(slot)){st.sc=slot===soccer.k?1:2;st.sh=soccer.sh}
   if(isTurbo()&&ship&&ship.cd)st.cdT=ship.cd[slot];
  }
  const key=JSON.stringify(st);
  if(tvUiSent[slot]===key)return;
  tvUiSent[slot]=key;
  if(st.cdT!==undefined){st.cd=Math.max(0,Math.round(st.cdT-performance.now()));delete st.cdT}
  st.k='ui';st.me=slot;
  netSendRaw({t:'cc',slot,d:st});
 });
}

/* ---- Controles (gamepad) ligados na TV viram jogadores ---- */
function tvPadFreeSlot(from,dir){
 const N=specs.length;
 for(let k=1;k<=N;k++){const s=((from+dir*k)%N+N)%N;if(!net.names[s])return s}
 return -1;
}
function tvPadJoin(pi){
 if(tournamentCharacterLocked||tvPads[pi]!==undefined)return;
 const free=tvPadFreeSlot(-1,1);if(free<0)return;
 if(net.names.filter(Boolean).length>=8){netSetStatus('Sala cheia (8 jogadores).',true);return}
 tvPads[pi]=free;netSendRaw({t:'local',slot:free,name:'Controle '+(Object.keys(tvPads).length)});
}
function tvPadCycle(pi,dir){
 const cur=tvPads[pi];if(cur===undefined||tournamentCharacterLocked)return;
 const s=tvPadFreeSlot(cur,dir);if(s<0)return;
 tvPads[pi]=s;netSendRaw({t:'local',slot:s,from:cur,name:net.names[cur]||'Controle'});
}
function tvPadLeave(pi){
 const cur=tvPads[pi];if(cur===undefined||tournamentCharacterLocked)return;
 delete tvPads[pi];netSendRaw({t:'unlocal',slot:cur});
}
