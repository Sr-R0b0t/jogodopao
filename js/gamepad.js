/* Suporte a controles (gamepad: Xbox, PlayStation, 8BitDo…).
   • Jogo normal: analógico/direcional move, A = ação (clicar/lançar/especial), no boliche ◀▶ mira e ▲▼ força,
     no pênalti ◀ ▲ ▶ escolhe o canto. Nos menus: direcional navega, A confirma, B volta.
   • Modo TV: cada controle ligado na TV entra como um jogador (A para entrar, ◀▶ troca de personagem, START inicia). */
const gpMove={x:0,y:0,active:false};
const gpState={prev:{},navAt:0,used:false,sc:{}};
const GP_DZ=.3;

function gpRead(g){
 const b=i=>!!(g.buttons[i]&&g.buttons[i].pressed);
 let x=g.axes[0]||0,y=g.axes[1]||0;
 if(Math.hypot(x,y)<GP_DZ){x=0;y=0}
 if(b(14))x=-1;else if(b(15))x=1;
 if(b(12))y=-1;else if(b(13))y=1;
 return {x,y,a:b(0),b:b(1),start:b(9),sel:b(8),lb:b(4),rb:b(5)};
}
const gpVisible=el=>!!el&&el.getClientRects().length>0;
function gpInGame(){
 return document.getElementById('screenMinigames').style.display!=='none'&&!document.getElementById('scoreOverlay').classList.contains('show')&&!podiumActive&&!document.getElementById('settingsModal').classList.contains('show');
}
/* Direção do pênalti a partir do controle: ◀ = -1, ▲/▼ = 0, ▶ = 1 (ou undefined se solto). */
function gpSoccerDir(s){return s.x<-.5?-1:s.x>.5?1:Math.abs(s.y)>.5?0:undefined}

function updateGamepads(now,dt){
 gpMove.active=false;gpMove.x=gpMove.y=0;
 const list=navigator.getGamepads?navigator.getGamepads():[];
 for(const g of list){
  if(!g||!g.connected)continue;
  const s=gpRead(g),pv=gpState.prev[g.index]||{};
  if(!gpState.used&&(s.a||s.b||s.start||s.x||s.y)){gpState.used=true;document.body.classList.add('gp-nav');try{unlockAudioOnce()}catch(e){}}
  gpHandle(g.index,s,k=>s[k]&&!pv[k],now,dt,pv);
  gpState.prev[g.index]=s;
 }
 Object.keys(tvPads).forEach(pi=>{ // controle desconectado: libera a vaga
  const g=list[pi];if(!g||!g.connected)tvPadLeave(Number(pi));
 });
}

function gpHandle(pi,s,E,now,dt,pv){
 if(gpInGame()){
  if(net.tv){const slot=tvPads[pi];if(slot!==undefined)gpTvGame(pi,slot,s,E,dt,pv)}
  else gpLocalGame(s,E,dt,pv);
  return;
 }
 if(net.tv){
  const ov=document.getElementById('scoreOverlay').classList.contains('show');
  const lobbyOn=document.getElementById('screenOnline').style.display!=='none'&&!document.getElementById('netLobby').hidden;
  if(lobbyOn&&!podiumActive&&!ov){
   if(tvPads[pi]===undefined){if(E('a'))tvPadJoin(pi)}
   else{
    if(E('b'))tvPadLeave(pi);
    const dx=s.x<-.5?-1:s.x>.5?1:0,pdx=pv.x<-.5?-1:pv.x>.5?1:0;
    if(dx&&dx!==pdx)tvPadCycle(pi,dx);
    const dy=s.y<-.5?-1:s.y>.5?1:0,pdy=pv.y<-.5?-1:pv.y>.5?1:0;
    if(dy&&dy!==pdy)tvSetCount(Number(document.getElementById('netPlayerCount').value)-dy);
   }
   if(E('start'))tvPrimaryAction(true);
   return;
  }
  if(ov||podiumActive){if(E('a')||E('start'))tvPrimaryAction(true);return}
 }
 gpMenu(s,E,now);
}

/* ---- Jogo: controle do jogador deste aparelho (offline ou convidado) ---- */
function gpLocalGame(s,E,dt,pv){
 if(gameMode==='ball'||isShipMode()){gpMove.x=s.x;gpMove.y=s.y;gpMove.active=!!(s.x||s.y)}
 if(gameMode==='bowling'){
  if(s.x)nudgeBowlerAim(s.x*dt*2.4);
  if(s.y&&bowlingOrder[bowlingTurn]===humanIndex&&!bowlingBallState){
   bowlingPowerValue=Math.max(35,Math.min(100,bowlingPowerValue-s.y*dt*45));
   const v=String(Math.round(bowlingPowerValue));
   document.getElementById('bowlingPower').value=v;document.getElementById('touchPower').value=v;updateBowlingControlValues();
  }
 }
 if(gameMode==='soccer'){const d=gpSoccerDir(s),p=gpSoccerDir(pv.x===undefined?{x:0,y:0}:pv);if(d!==undefined&&p===undefined)soccerChoose(d)}
 if(E('a')&&!document.getElementById('tap').disabled)pressTap();
}

/* ---- Jogo na TV: cada controle comanda o próprio personagem ---- */
function gpTvGame(pi,slot,s,E,dt,pv){
 if(gameMode==='ball'||isShipMode())net.mv[slot]={x:s.x,y:s.y};
 if(gameMode==='bowling'){
  const myTurn=running&&bowlingOrder[bowlingTurn]===slot&&!bowlingBallState;
  const st=tvPadBowl[slot]||(tvPadBowl[slot]={aim:0,pow:70,turn:-1});
  if(st.turn!==bowlingTurn){st.turn=bowlingTurn;st.aim=0;st.pow=70}
  if(myTurn){
   if(s.x){st.aim=Math.max(-BOWLING.maxLineX,Math.min(BOWLING.maxLineX,st.aim+s.x*dt*2.4));remoteBowlAim(slot,st.aim)}
   if(s.y)st.pow=Math.max(35,Math.min(100,st.pow-s.y*dt*45));
   if(s.x||s.y)document.getElementById('status').textContent='🎳 '+players[slot].name+' — força '+Math.round(st.pow)+'%  (◀▶ mira • ▲▼ força • A lança)';
   if(E('a'))remoteBowlThrow(slot,st.aim,st.pow);
  }
  return;
 }
 if(gameMode==='soccer'){const d=gpSoccerDir(s),p=gpSoccerDir({x:pv.x||0,y:pv.y||0});if(d!==undefined&&p===undefined)soccerSetChoice(slot,d);return}
 if(E('a'))netHostInput(slot,{k:'tap'});
}

/* ---- Menus: navegação por foco com o direcional ---- */
function gpMenuRoot(){
 const modal=document.getElementById('settingsModal');
 if(modal.classList.contains('show'))return modal;
 if(document.getElementById('scoreOverlay').classList.contains('show'))return document.getElementById('scoreOverlay');
 if(podiumActive)return document.getElementById('podiumUI');
 return [...document.querySelectorAll('.flow-screen')].find(e=>e.style.display!=='none')||document.body;
}
function gpFocusables(root){
 return [...root.querySelectorAll('button,select,input,[tabindex="0"]')].filter(e=>!e.disabled&&gpVisible(e)&&e.type!=='hidden'&&e.getBoundingClientRect().width>0);
}
function gpMenu(s,E,now){
 const root=gpMenuRoot(),items=gpFocusables(root);
 if(!items.length)return;
 let cur=document.activeElement;
 if(!items.includes(cur)){
  if(s.x||s.y||E('a')||E('b')){const pref=items.find(e=>e.classList.contains('primary-flow-button'))||items[0];pref.focus();pref.scrollIntoView({block:'nearest'})}
  return;
 }
 if(E('a')){if(cur.tagName==='BUTTON'||cur.type==='checkbox')cur.click();return}
 if(E('b')){const back=[...root.querySelectorAll('.back-flow-button,#closeSettings')].find(gpVisible);if(back)back.click();return}
 const dx=s.x<-.5?-1:s.x>.5?1:0,dy=s.y<-.5?-1:s.y>.5?1:0;
 if(!dx&&!dy){gpState.navAt=0;return}
 if(now<gpState.navAt)return;
 gpState.navAt=now+(gpState.navAt===0?330:140);
 // valores: ◀▶ ajusta listas e barras
 if(dx&&(cur.tagName==='SELECT'||cur.type==='range')){
  if(cur.tagName==='SELECT')cur.selectedIndex=Math.max(0,Math.min(cur.options.length-1,cur.selectedIndex+dx));
  else cur.value=String(Number(cur.value)+dx*(Number(cur.step)||5));
  cur.dispatchEvent(new Event('input',{bubbles:true}));cur.dispatchEvent(new Event('change',{bubbles:true}));return;
 }
 const r0=cur.getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2;
 let best=null,bs=Infinity;
 items.forEach(e=>{
  if(e===cur)return;
  const r=e.getBoundingClientRect(),ex=r.left+r.width/2-cx,ey=r.top+r.height/2-cy;
  const along=dx?ex*dx:ey*dy,perp=dx?Math.abs(ey):Math.abs(ex);
  if(along<=4)return;
  const sc=along+perp*2.2;if(sc<bs){bs=sc;best=e}
 });
 if(best){best.focus();best.scrollIntoView({block:'nearest'})}
}
