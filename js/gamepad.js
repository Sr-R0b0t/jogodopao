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
 // PS4 lido fora do padrão (ex.: Firefox no Windows): X=botão 1, O=botão 2, direcional = eixo "hat" 9
 if(g.mapping!=='standard'&&/054c|playstation|dualshock|wireless controller/i.test(g.id||'')){
  const h=g.axes[9];
  if(h!==undefined&&h<1.1){
   const k=Math.round((h+1)*3.5); // 0=cima,1=cima-dir,2=dir,3=baixo-dir,4=baixo,5=baixo-esq,6=esq,7=cima-esq
   if([7,0,1].includes(k))y=-1;if([3,4,5].includes(k))y=1;if([1,2,3].includes(k))x=1;if([5,6,7].includes(k))x=-1;
  }
  return {x,y,a:b(1),b:b(2),xb:b(0),yb:b(3),start:b(9),sel:b(8),lb:b(4),rb:b(5)};
 }
 if(b(14))x=-1;else if(b(15))x=1;
 if(b(12))y=-1;else if(b(13))y=1;
 return {x,y,a:b(0),b:b(1),xb:b(2),yb:b(3),start:b(9),sel:b(8),lb:b(4),rb:b(5)};
}
const gpVisible=el=>!!el&&el.getClientRects().length>0;
function gpOpenSettings(){document.getElementById('settingsBtn').click()}
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
 const oskEl=document.getElementById('osk');
 if(oskEl&&oskEl.classList.contains('show')){if(!gpOskInput(s,E))gpMenu(s,E,now);return}
 const modal=document.getElementById('settingsModal');
 if(modal.classList.contains('show')){gpMenu(s,E,now);return}   // menu de configurações aberto: controle navega nele
 if(E('sel')){document.getElementById('settingsBtn').click();return} // SELECT/SHARE abre as configurações em qualquer tela
 if(gpInGame()){
  if(E('start')){gpOpenSettings();return} // START durante o jogo = menu (reiniciar, som, sair)
  if(net.tv&&tvBrief&&tvBrief.on){const sl=tvPads[pi];if(sl!==undefined&&E('a'))tvBriefReady(sl);return}   // tela "como jogar": A = entendi
  if(net.tv){const slot=tvPads[pi];if(slot!==undefined)gpTvGame(pi,slot,s,E,dt,pv)}
  else gpLocalGame(s,E,dt,pv);
  return;
 }
 if(net.tv){
  const ov=document.getElementById('scoreOverlay').classList.contains('show');
  const lobbyOn=document.getElementById('screenOnline').style.display!=='none'&&!document.getElementById('netLobby').hidden;
  if(lobbyOn&&!podiumActive&&!ov){
   if(E('start')){tvPrimaryAction(true);return}
   const root=gpMenuRoot(),cur=document.activeElement,foc=!!cur&&cur!==root&&root.contains(cur);
   if(foc&&E('a')&&cur.classList.contains('character-card')){ // A em cima de um personagem: este controle escolhe ele
    tvPadPick(pi,[...cur.parentElement.children].indexOf(cur));return;
   }
   if(!foc&&E('a')&&tvPads[pi]===undefined){tvPadJoin(pi);return}
   if(!foc&&E('b')&&tvPads[pi]!==undefined){tvPadLeave(pi);return}
   if(foc&&E('b')){cur.blur();return}     // B só tira a seleção (não sai da sala sem querer)
   gpMenu(s,E,now);                         // direcional: seleção amarela, igual aos outros modos
   return;
  }
  if(ov||podiumActive){
   if(E('start')){tvPrimaryAction(true);return}
   const root=gpMenuRoot(),foc=document.activeElement&&root.contains(document.activeElement)&&document.activeElement!==root;
   if(foc||s.x||s.y||E('b'))gpMenu(s,E,now);      // mexeu no direcional: navega pelos botões
   else if(E('a'))tvPrimaryAction(true);           // A sem seleção: ação principal
   return;
  }
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
 const osk=document.getElementById('osk');if(osk&&osk.classList.contains('show'))return osk;
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
 if(E('b')&&root.id!=='osk'){const back=[...root.querySelectorAll('.back-flow-button,#closeSettings')].find(gpVisible);if(back){back.click();return}}
 let cur=document.activeElement;
 if(!items.includes(cur)){
  if(s.x||s.y||E('a')||E('b')){const pref=root.id==='settingsModal'?items[0]:(items.find(e=>e.classList.contains('primary-flow-button'))||items[0]);pref.focus();pref.scrollIntoView({block:'nearest'})}
  return;
 }
 if(E('a')){if(cur.tagName==='BUTTON'||cur.type==='checkbox')cur.click();else if(cur.tagName==='INPUT'&&(cur.type==='text'||!cur.type))gpOskOpen(cur);return}
 if(E('b')&&root.id!=='osk'){const back=[...root.querySelectorAll('.back-flow-button,#closeSettings')].find(gpVisible);if(back)back.click();return}
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

/* Aviso na tela: mostra se o navegador reconheceu o controle (ajuda a descobrir por que não funciona). */
(function gpBadge(){
 const el=document.createElement('div');
 el.style.cssText='position:fixed;left:10px;bottom:10px;z-index:9999;max-width:min(360px,80vw);padding:7px 11px;border-radius:12px;background:#000b;color:#fff;font:800 12px system-ui,sans-serif;display:none;pointer-events:none';
 document.body.appendChild(el);
 let hideT=null;
 const flash=(t,ms)=>{el.textContent=t;el.style.display='block';clearTimeout(hideT);if(ms)hideT=setTimeout(()=>el.style.display='none',ms)};
 window.addEventListener('gamepadconnected',e=>flash('🎮 Controle conectado: '+(e.gamepad.id||'').slice(0,38)+(e.gamepad.mapping==='standard'?'':' (mapeamento não padrão)'),6000));
 window.addEventListener('gamepaddisconnected',()=>flash('🎮 Controle desconectado',3500));
 if(!window.isSecureContext)flash('⚠️ Controles só funcionam em páginas https ou localhost (esta página é http comum).',0);
 else if(!navigator.getGamepads)flash('⚠️ Este navegador não suporta controles.',0);
 // dica se existir controle mas ainda não foi reconhecido (precisa apertar um botão com a janela em foco)
 setTimeout(()=>{if(window.isSecureContext&&!gpState.used&&![...(navigator.getGamepads?navigator.getGamepads():[])].some(g=>g&&g.connected))flash('🎮 Se o controle está ligado: clique na página e aperte um botão dele.',7000)},12000);
})();

/* ---- Teclado na tela para o controle (abre ao apertar X/A em um campo de texto) ---- */
let oskTarget=null,oskLower=false;
function gpOskBuild(){
 let el=document.getElementById('osk');if(el)return el;
 el=document.createElement('div');el.id='osk';
 el.innerHTML='<div class="osk-card"><div class="osk-title" id="oskTitle"></div><div class="osk-value" id="oskValue"></div><div class="osk-grid" id="oskGrid"></div>'
  +'<div class="osk-row"><button type="button" data-k="back">⌫ APAGAR</button><button type="button" data-k="space">ESPAÇO</button><button type="button" data-k="case">Aa</button><button type="button" data-k="ok" class="primary-flow-button">✔ OK</button></div>'
  +'<small>🎮 ▲▼◀▶ escolhe • X confirma letra • □ apaga • △ espaço • START ok • O cancela</small></div>';
 document.body.appendChild(el);
 const grid=el.querySelector('#oskGrid');
 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'.split('').forEach(c=>{const b=document.createElement('button');b.type='button';b.dataset.c=c;b.textContent=c;grid.appendChild(b)});
 el.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.c)gpOskType(b.dataset.c);
  else if(b.dataset.k==='back')gpOskBack();
  else if(b.dataset.k==='space')gpOskType(' ');
  else if(b.dataset.k==='case'){oskLower=!oskLower;gpOskLabels()}
  else if(b.dataset.k==='ok')gpOskClose(true);
 });
 return el;
}
const gpOskIsCode=()=>oskTarget&&oskTarget.id==='netCode';
function gpOskLabels(){
 const lower=oskLower&&!gpOskIsCode();
 document.querySelectorAll('#oskGrid button').forEach(b=>{const c=b.dataset.c;b.textContent=/[A-Z]/.test(c)&&lower?c.toLowerCase():c});
}
function gpOskRefresh(){document.getElementById('oskValue').textContent=(oskTarget?oskTarget.value:'')+'▏'}
function gpOskType(c){
 if(!oskTarget)return;
 const max=oskTarget.maxLength>0?oskTarget.maxLength:40;if(oskTarget.value.length>=max)return;
 if(/[A-Z]/.test(c)){
  if(gpOskIsCode())c=c.toUpperCase();
  else if(oskLower||oskTarget.value.length>0&&/[a-z]$/.test(oskTarget.value))c=c.toLowerCase();
 }
 oskTarget.value+=c;oskTarget.dispatchEvent(new Event('input',{bubbles:true}));gpOskRefresh();
}
function gpOskBack(){if(!oskTarget)return;oskTarget.value=oskTarget.value.slice(0,-1);oskTarget.dispatchEvent(new Event('input',{bubbles:true}));gpOskRefresh()}
function gpOskOpen(input){
 oskTarget=input;oskLower=false;
 const el=gpOskBuild();
 document.getElementById('oskTitle').textContent=input.id==='netCode'?'Código da sala':input.id==='netName'?'Seu nome':'Digite';
 gpOskLabels();gpOskRefresh();el.classList.add('show');
 const first=el.querySelector('#oskGrid button');if(first)first.focus();
}
function gpOskClose(ok){
 const el=document.getElementById('osk');if(el)el.classList.remove('show');
 if(oskTarget){oskTarget.dispatchEvent(new Event('change',{bubbles:true}));try{oskTarget.focus({preventScroll:true})}catch(e){}}
 oskTarget=null;
}
function gpOskInput(s,E){
 if(E('b')){gpOskClose(false);return true}
 if(E('start')){gpOskClose(true);return true}
 if(E('xb'))gpOskBack();
 if(E('yb'))gpOskType(' ');
 return false;
}
