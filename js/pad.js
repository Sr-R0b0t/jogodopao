/* Celular como controle do Jogo do Pão (modo TV). Página leve: sem 3D. Fala direto com o servidor de salas. */
(function(){
const CH=[['ASTRONAUTA','#efe9df'],['RAPOSA','#f4721f'],['SAPO','#55bd3f'],['PANDA','#8a8a96'],['MACACO','#a8683f'],['DRAGÃO','#14e0a0'],['FABOLA','#19e6ff'],['LUANA','#ff2f3f'],['RAFA','#4a3dff'],['LORENA','#ff8fc8'],['RICARDO','#2e86ff'],['KIKA','#ffd21f']];
const MAX_LINE_X=1.7,BLAST_CD=4000;
const $=id=>document.getElementById(id);
const qs=new URLSearchParams(location.search);
let ws=null,joined=false,closedByTv=false,retrying=false,tries=0;
let me=-1,names=[],vip=-1,ui=null,myName='',code=(qs.get('sala')||'').toUpperCase().slice(0,5);
let sentSh=-1,cdEnd=0,throwSent=false,lastTurnKey='';

try{$('name').value=localStorage.getItem('jogoDoPao.name')||''}catch(e){}
$('code').value=code;
if(code)$('code').readOnly=false;

function show(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('show',v.id===id))}
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2200)}
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};

function serverUrl(){
 const sv=qs.get('server')||'';
 const proto=location.protocol==='https:'?'wss://':'ws://';
 if(sv)return /^wss?:\/\//.test(sv)?sv:proto+sv;
 return proto+location.host;
}
const send=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
const relay=d=>send({t:'relay',d});

function connect(){
 let sock;
 try{sock=new WebSocket(serverUrl())}catch(e){$('err').textContent='Endereço do servidor inválido.';return}
 ws=sock;
 sock.onopen=()=>send({t:'join',code,name:myName,ctrl:true,pref:retrying&&me>=0?me:undefined});
 sock.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}onMsg(m)};
 sock.onerror=()=>{if(!joined)$('err').textContent='Não consegui conectar ao servidor.'};
 sock.onclose=()=>{
  if(ws!==sock||closedByTv)return;
  if(joined){retrying=true;$('infoIcon').textContent='📡';$('infoTxt').textContent='Reconectando…';$('infoSub').textContent='';$('vipBar').classList.remove('show');show('vInfo');setTimeout(connect,1500)}
 };
}
$('go').addEventListener('click',()=>{
 myName=($('name').value||'').trim()||'Jogador';
 code=($('code').value||'').trim().toUpperCase();
 try{localStorage.setItem('jogoDoPao.name',myName)}catch(e){}
 if(code.length<4){$('err').textContent='Digite o código que aparece na TV.';return}
 $('err').textContent='Conectando…';retrying=false;connect();
});
$('again').addEventListener('click',()=>location.reload());

function onMsg(m){
 switch(m.t){
  case 'joined':
   me=m.slot;joined=true;retrying=false;tries=0;ui=null;$('err').textContent='';
   try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
   render();break;
  case 'lobby':names=m.names;vip=m.vip;renderGrid();render();break;
  case 'slot':me=m.slot;renderGrid();break;
  case 'pong':{const ms=Math.round(performance.now()-m.ts);const e=$('ping');e.textContent=ms+' ms';e.style.color=ms<80?'#6dffa3':ms<160?'#ffd36d':'#ff8a8a';break}
  case 'pickfail':toast('Esse personagem acabou de ser escolhido.');break;
  case 'c':if(m.d&&m.d.k==='ui'){ui=m.d;if(ui.cd!==undefined)cdEnd=performance.now()+ui.cd;render()}break;
  case 'closed':closedByTv=true;joined=false;show('vEnd');$('vipBar').classList.remove('show');break;
  case 'err':
   if(retrying&&joined){tries++;if(tries<30)setTimeout(connect,2000);else{closedByTv=true;show('vEnd');$('endTxt').textContent='Não consegui voltar para a sala.'}}
   else $('err').textContent=m.m;
   break;
 }
}

/* ---- Lobby ---- */
function renderGrid(){
 const g=$('grid');g.replaceChildren();
 CH.forEach(([nm,col],i)=>{
  const b=document.createElement('button');b.type='button';
  const owner=names[i],mine=i===me,taken=owner&&!mine;
  b.className='ch'+(mine?' me':'')+(taken?' taken':'');b.disabled=!!taken||(ui&&ui.go);
  b.innerHTML='<i style="background:'+col+'"></i>'+nm+'<small>'+(mine?'Você':taken?owner:'Livre')+'</small>';
  b.addEventListener('click',()=>{if(!owner)send({t:'pick',slot:i})});
  g.append(b);
 });
}

/* ---- Painéis ---- */
const panels=['padStick','padBread','padBowl','padSoccer','padWait'];
function showPanel(id){panels.forEach(p=>$(p).style.display=p===id?'flex':'none')}
function render(){
 if(!joined)return;
 const scr=ui?ui.scr:'lobby';
 const col=ui&&ui.col?ui.col:'';
 document.body.style.boxShadow=col?'inset 0 0 0 7px '+col:'';
 $('who').style.color=col||'';
 const cnt=$('cntRow');cnt.style.display=(ui&&ui.vip&&scr==='lobby'&&!ui.go)?'flex':'none';if(ui&&ui.cnt)$('cntVal').textContent=ui.cnt;
 const vipOn=ui&&ui.prim;
 $('vipBtn').textContent=vipOn?ui.prim:'';
 $('vipBar').classList.toggle('show',!!vipOn&&scr!=='game');
 if(scr==='lobby'){
  if(ui&&ui.go){$('infoIcon').textContent='⏳';$('infoTxt').textContent='Partida em andamento…';$('infoSub').textContent='Você volta ao jogo na próxima rodada.';show('vInfo');return}
  const v=names[vip];
  $('lobbySub').textContent=vip===me?'👑 Você é o anfitrião: inicie quando todos entrarem':'Aguardando '+(v||'o anfitrião')+' iniciar a partida… (vagas sem jogador viram bots 🤖)';
  show('vLobby');renderGrid();return;
 }
 if(scr==='score'){$('infoIcon').textContent='🏆';$('infoTxt').textContent='Resultado da rodada na TV!';$('infoSub').textContent=vipOn?'':'Aguardando o anfitrião avançar…';show('vInfo');return}
 if(scr==='podium'){$('infoIcon').textContent='🥇';$('infoTxt').textContent='Pódio na TV!';$('infoSub').textContent=vipOn?'':'Parabéns a todos!';show('vInfo');return}
 // jogo
 show('vGame');
 const who=CH[me]?CH[me][0]:'';$('who').textContent='Você é '+who+(col?' ●':'');
 const mode=ui.mode;
 if(!ui.run){showPanel('padWait');$('waitTxt').textContent='Prepare-se…';stopStick();return}
 if(mode==='bread'){showPanel('padBread');stopStick()}
 else if(mode==='ball'||mode==='ship'){showPanel('padStick');$('special').style.display='none';$('joy').style.margin='0 auto'}
 else if(mode==='turbo'){showPanel('padStick');$('special').style.display='';$('joy').style.margin=''}
 else if(mode==='bowling'){
  stopStick();
  const key=ui.cur+'|'+ui.turn;
  if(ui.turn){showPanel('padBowl');if(key!==lastTurnKey){lastTurnKey=key;throwSent=false;$('aim').value=0;$('pow').value=70;$('powTxt').textContent='70%';$('throwBtn').disabled=false;send0aim()}}
  else{lastTurnKey=key;showPanel('padWait');$('waitTxt').textContent=ui.cur?'Vez de '+ui.cur+'…':'Aguarde…'}
 }else if(mode==='soccer'){
  stopStick();
  if(ui.sc&&sentSh!==ui.sh){showPanel('padSoccer');$('scTitle').textContent=ui.sc===1?'⚽ Onde você vai CHUTAR?':'🧤 Onde você vai DEFENDER?'}
  else{showPanel('padWait');$('waitTxt').textContent=ui.sc?'Escolha enviada! ✅':'Olhe para a TV…'}
 }else{showPanel('padWait');$('waitTxt').textContent='Olhe para a TV…'}
 if(mode!=='turbo'&&mode!=='ball'&&mode!=='ship')stopStick();
}
function setCnt(d){const n=Math.max(2,Math.min(8,Number($('cntVal').textContent)+d));$('cntVal').textContent=n;buzz(10);relay({k:'ctl',a:'cnt',n})}
$('cntMinus').addEventListener('click',()=>setCnt(-1));
$('cntPlus').addEventListener('click',()=>setCnt(1));
$('vipBtn').addEventListener('click',()=>{buzz(20);relay({k:'ctl',a:'ok'})});

/* ---- Analógico ---- */
let pid=null,lastSend=0,lastKey='',joyOn=false;
const joy=$('joy'),knob=$('knob');
let trailT=null,trailV=null;
function sendMove(x,y,force){
 const now=performance.now(),key=Math.round(x*40)+','+Math.round(y*40);
 if(!force&&key===lastKey)return;
 if(!force&&now-lastSend<25){ // não perde a última posição: envia assim que passar o intervalo
  trailV=[x,y];if(!trailT)trailT=setTimeout(()=>{trailT=null;if(trailV){const v=trailV;trailV=null;sendMove(v[0],v[1])}},26);return;
 }
 trailV=null;lastKey=key;lastSend=now;relay({k:'mv',x:Math.round(x*100)/100,y:Math.round(y*100)/100});
}
function moveStick(e){
 const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width/2-8;
 let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}
 knob.style.transform='translate('+dx+'px,'+dy+'px)';
 const mag=Math.hypot(dx,dy)/max;
 if(mag<.12)sendMove(0,0);else sendMove(dx/max,dy/max);
}
function stopStick(){
 if(pid!==null||joyOn){pid=null;joyOn=false;knob.style.transform='';sendMove(0,0,true)}
}
joy.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;joyOn=true;joy.setPointerCapture(pid);moveStick(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===pid)moveStick(e)});
['pointerup','pointercancel'].forEach(ev=>joy.addEventListener(ev,e=>{if(e.pointerId===pid)stopStick()}));

/* ---- Botões ---- */
$('bigBtn').addEventListener('pointerdown',e=>{e.preventDefault();buzz(8);relay({k:'tap'})});
const sp=$('special');
sp.addEventListener('pointerdown',e=>{
 e.preventDefault();if(performance.now()<cdEnd)return;
 buzz(25);relay({k:'tap'});cdEnd=performance.now()+BLAST_CD;
});
(function loop(){
 const left=cdEnd-performance.now();
 sp.disabled=false;sp.style.opacity=left>0?.5:1;
 sp.innerHTML=left>0?'⏳<br>'+(left/1000).toFixed(1)+'s':'💨<br>ESPECIAL';
 requestAnimationFrame(loop);
})();

/* ---- Boliche ---- */
let aimT=0;
function send0aim(){relay({k:'aim',v:0})}
$('aim').addEventListener('input',()=>{
 const now=performance.now();if(now-aimT<60)return;aimT=now;
 relay({k:'aim',v:Math.round($('aim').value/100*MAX_LINE_X*100)/100});
});
$('pow').addEventListener('input',()=>{$('powTxt').textContent=$('pow').value+'%'});
$('throwBtn').addEventListener('click',()=>{
 if(throwSent)return;throwSent=true;$('throwBtn').disabled=true;buzz(30);
 relay({k:'tap',aim:Math.round($('aim').value/100*MAX_LINE_X*100)/100,pow:Number($('pow').value)});
});

/* ---- Pênalti ---- */
document.querySelectorAll('.sc button').forEach(b=>b.addEventListener('click',()=>{
 if(!ui||!ui.sc)return;buzz(20);sentSh=ui.sh;relay({k:'sc',dir:Number(b.dataset.d)});render();
}));

/* Evita rolagem/zoom acidentais */
document.addEventListener('touchmove',e=>{if(!e.target.closest('.grid,input[type=range]'))e.preventDefault()},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());
setInterval(()=>send({t:'ping',ts:performance.now()}),2000);
window.padDebug=()=>({ui,me,vip,names,joined});
if(code&&$('name').value)$('go').focus();
})();
