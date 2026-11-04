/* Lista de minigames e sorteio das rodadas.
   Para ADICIONAR um jogo novo: acrescente {id,label} em MINIGAMES e trate o `gameMode` com esse id
   (ver applyMode/reset/start em game.js). O sorteio nunca repete um jogo até todos terem sido jogados. */
const MINIGAMES=[
 {id:'bread',label:'Corrida do Pão',desc:'Clique o mais rápido que puder para chegar primeiro ao pão. Quem ficar por último come o pão!'},
 {id:'ball',label:'Batalha das Bolas',desc:'Equilibre-se na sua bola e derrube os rivais da arena. Vence o último que ficar em pé!'},
 {id:'bowling',label:'Boliche na Ladeira',desc:'Lance a bola pela ladeira e derrube os pinos. Vence quem derrubar mais pinos!'},
 {id:'soccer',label:'Pênaltis (Futebol)',desc:'Um goleiro contra os batedores: escolha esquerda, meio ou direita. O goleiro ganha 2 pontos por defesa; os batedores vencem se marcarem mais gols.'},
 {id:'ship',label:'Arena das Naves',min:2,max:4,desc:'Pilote sua nave e defenda seu gol das bolas de metal. Cada gol sofrido tira 1 das 15 vidas. Vence o último na arena!'},   // só com 2 a 4 jogadores
 {id:'turbo',label:'Arena Turbo',min:2,max:4,desc:'Sua nave desliza só pelo seu lado. Defenda o gol, aproveite os pads verdes para acelerar a bola e use o ESPECIAL para empurrá-la. Vence o último na arena!'}
];
let minigameBag=[],lastMinigame=null,roundNumber=0,roundTimer=null;
let finalRound=false;   // true na última rodada do ciclo (todos os minigames sorteados): depois dela vem o pódio
// o seletor de minigame fica escondido (só o jogo usa), mas segue a lista acima
(function(){const sel=document.getElementById('gameMode');sel.replaceChildren(...MINIGAMES.map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.label;return o}))})();

/* "Saco" de sorteio: embaralha todos, tira um por rodada; quando esvazia, embaralha de novo
   (evitando abrir o novo ciclo com o mesmo jogo que acabou de ser jogado). */
/* Minigames que podem ser sorteados com a quantidade atual de jogadores (min/max opcionais). */
function eligibleMinigames(){const n=activeIndices().length;return MINIGAMES.filter(m=>(!m.min||n>=m.min)&&(!m.max||n<=m.max))}
function drawMinigame(){
 const ok=new Set(eligibleMinigames().map(m=>m.id));
 minigameBag=minigameBag.filter(id=>ok.has(id));
 if(!minigameBag.length){
  minigameBag=[...ok].sort(()=>Math.random()-.5);
  if(minigameBag.length>1&&minigameBag[0]===lastMinigame)minigameBag.push(minigameBag.shift());
 }
 lastMinigame=minigameBag.shift();return lastMinigame;
}
function resetMinigameBag(){minigameBag=[];lastMinigame=null;roundNumber=0;finalRound=false;cancelCountdown()}

/* Aviso grande no meio da tela (nome do minigame + contagem). Fica até hideRoundBanner(). */
const COUNTDOWN_SECONDS=5;
let cdTimer=null;
function showRoundBanner(title,sub,count,desc){
 const el=document.getElementById('roundBanner');if(!el)return;
 el.innerHTML='<small>'+sub+'</small><b>'+title+'</b>'+(desc?'<p class="rb-desc"></p>':'')+(count!==undefined?'<span class="cd">'+count+'</span>':'');
 const dp=el.querySelector('.rb-desc');if(dp)dp.textContent=desc;
 el.classList.add('show');
}
function hideRoundBanner(){const el=document.getElementById('roundBanner');if(el)el.classList.remove('show')}
function cdBeep(n){ // bip a cada segundo; som mais alto no "VAI!"
 if(n>0)tone(n<=2?700:520,.12,'square',.07);
 else{tone(784,.2,'triangle',.12);tone(1046,.35,'triangle',.11,.14)}
}
function cancelCountdown(){clearInterval(cdTimer);cdTimer=null;clearTimeout(roundTimer);hideRoundBanner()}
/* 5…4…3…2…1…VAI! e então começa a partida (o anfitrião manda a contagem para todos). */
function runCountdown(sec,title,sub,label,desc){
 cancelCountdown();
 let n=sec;
 const tick=()=>{
  showRoundBanner(title,sub,n>0?String(n):'VAI!',desc);cdBeep(n);
  netBroadcast({k:'cd',title,sub,n,label,desc});
  if(n<=0){
   clearInterval(cdTimer);cdTimer=null;setTimeout(hideRoundBanner,700);
   if(!running&&!ended&&!document.getElementById('scoreOverlay').classList.contains('show'))start();
   return;
  }
  n--;
 };
 tick();cdTimer=setInterval(tick,1000);
}
/* Sorteia o próximo minigame, mostra o aviso e a contagem e começa sozinho (só o anfitrião/offline sorteia). */
function startRound(){
 if(net.role==='client')return;
 cancelCountdown();
 const id=drawMinigame(),info=MINIGAMES.find(m=>m.id===id);
 finalRound=minigameBag.length===0&&eligibleMinigames().length>1;
 roundNumber++;
 document.getElementById('gameMode').value=id;gameMode=id;
 applyMode();reset();
 showFlowScreen('screenMinigames');
 document.getElementById('gameMode').disabled=true;
 const label='🎲 RODADA '+roundNumber+' • '+info.label.toUpperCase();
 document.getElementById('roundLabel').textContent=label;
 document.getElementById('status').textContent='🎲 Minigame sorteado: '+info.label+'! A partida começa em instantes…';
 runCountdown(COUNTDOWN_SECONDS,'🎲 '+info.label,'Rodada '+roundNumber,label,info.desc);
}

/* Home: número de minigames sempre igual ao da lista */
{const el=document.getElementById('homeMgCount');if(el)el.textContent='🎮 '+MINIGAMES.length+' minigames'}

/* ---- Animação de sorteio (goleiro / duplas): nomes girando, desacelerando e revelando o resultado ---- */
const DRAW_MS=4200;
let drawTimers=[];
function stopDrawAnim(){drawTimers.forEach(clearTimeout);drawTimers=[];const el=document.getElementById('drawBox');if(el)el.classList.remove('show')}
function runDrawAnim(o){
 stopDrawAnim();
 let el=document.getElementById('drawBox');
 if(!el){el=document.createElement('div');el.id='drawBox';const ref=document.getElementById('roundBanner');(ref&&ref.parentElement||document.body).appendChild(el)}
 el.replaceChildren();
 const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;el.appendChild(e);return e};
 mk('small','',o.sub);mk('b','',o.title);
 const spin=mk('div','dr-spin','…'),fin=mk('div','dr-final');
 el.classList.add('show');
 const pool=o.pool.slice(),pick=()=>{
  if(o.pairs){const s=pool.slice().sort(()=>Math.random()-.5);return s[0]+'  +  '+s[1]}
  return pool[Math.floor(Math.random()*pool.length)];
 };
 let t=0,k=0;const SPIN=2700;
 const step=()=>{
  spin.textContent=pick();spin.classList.toggle('alt',(k++)%2===0);
  try{if(audioEnabled)tone(520+(k%5)*60,.05,'square',.035)}catch(e){}
  const dt=70+Math.pow(t/SPIN,2.2)*330;t+=dt;
  if(t<SPIN)drawTimers.push(setTimeout(step,dt));else reveal();
 };
 const reveal=()=>{
  spin.style.display='none';
  o.final.forEach(g=>{
   const c=document.createElement('div');c.className='dr-card';c.style.borderColor=g.color;
   const l=document.createElement('span');l.textContent=g.label;l.style.color=g.color;
   const n=document.createElement('strong');n.textContent=g.names.join('  +  ');
   c.append(l,n);fin.append(c);
  });
  try{if(audioEnabled){tone(784,.18,'triangle',.1);tone(1046,.3,'triangle',.1,.16)}}catch(e){}
  drawTimers.push(setTimeout(()=>el.classList.remove('show'),Math.max(900,DRAW_MS-SPIN-100)));
 };
 step();
}
