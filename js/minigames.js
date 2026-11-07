/* Lista de minigames e sorteio das rodadas.
   Para ADICIONAR um jogo novo: acrescente {id,label} em MINIGAMES e trate o `gameMode` com esse id
   (ver applyMode/reset/start em game.js). O sorteio nunca repete um jogo até todos terem sido jogados. */
const MINIGAMES=[
 {id:'bread',label:'Corrida do Pão',desc:'Clique o mais rápido que puder para chegar primeiro ao pão. Quem ficar por último come o pão!'},
 {id:'ball',label:'Batalha das Bolas',desc:'Equilibre-se na sua bola e derrube os rivais da arena. Vence o último que ficar em pé!'},
 {id:'bowling',label:'Boliche na Ladeira',desc:'Lance a bola pela ladeira e derrube os pinos. Vence quem derrubar mais pinos!'},
 {id:'soccer',label:'Pênaltis (Futebol)',desc:'Um goleiro contra os batedores: escolha esquerda, meio ou direita. O goleiro ganha 2 pontos por defesa; os batedores vencem se marcarem mais gols.'},
 {id:'ship',label:'Arena das Naves',min:2,max:4,desc:'Pilote sua nave e defenda seu gol das bolas de metal. Cada gol sofrido tira 1 das 15 vidas. Vence o último na arena!'},   // só com 2 a 4 jogadores
 {id:'dodge',label:'Queimada',min:2,max:8,even:true,desc:'Dois times, uma linha no meio da quadra que ninguém pode cruzar. Pegue uma bola do seu lado e arremesse nos rivais: quem for acertado sai! Vence o time que eliminar todos.'},
 {id:'lava',label:'Arena de Lava',min:2,max:8,desc:'Sobreviva na plataforma sobre a lava! Pule o facho de fogo que gira, fuja dos círculos vermelhos onde os punhos de magma vão cair. Vence o último vivo!'},
 {id:'bridge',label:'Ponte de Pedras',min:2,max:4,desc:'Escolha um dos 4 caminhos para construir sua ponte sobre a lava. Se mais alguém escolher o mesmo caminho, ninguém avança! Vence quem atravessar primeiro.'},
 {id:'glass',label:'Ponte de Vidro',min:2,max:8,desc:'Um vidro de cada par é fraco! Cada jogador escolhe o seu na vez (5 segundos). Quem cai volta ao início, mas revela o vidro quebrado — ele volta inteiro no turno seguinte, então memorize! Vence quem atravessar primeiro.'},
 {id:'turbo',label:'Arena Turbo',min:2,max:4,desc:'Sua nave desliza só pelo seu lado. Defenda o gol, aproveite os pads verdes para acelerar a bola e use o ESPECIAL para empurrá-la. Vence o último na arena!'}
];
let minigameBag=[],lastMinigame=null,roundNumber=0,roundTimer=null;
let finalRound=false;   // true na última rodada do ciclo (todos os minigames sorteados): depois dela vem o pódio
// o seletor de minigame fica escondido (só o jogo usa), mas segue a lista acima
(function(){const sel=document.getElementById('gameMode');sel.replaceChildren(...MINIGAMES.map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.label;return o}))})();

/* "Saco" de sorteio: embaralha todos, tira um por rodada; quando esvazia, embaralha de novo
   (evitando abrir o novo ciclo com o mesmo jogo que acabou de ser jogado). */
/* Minigames que podem ser sorteados com a quantidade atual de jogadores (min/max opcionais). */
function eligibleMinigames(){const n=activeIndices().length;return MINIGAMES.filter(m=>(!m.min||n>=m.min)&&(!m.max||n<=m.max)&&(!m.even||n%2===0))}
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
/* A voz gravada (5…1) começa no "5" nas contagens de 5 s e no "3" nas de 3 s; o resto da contagem usa a mesma gravação. */
let cdVoiceT=0;
function cdVoiceOn(){return performance.now()-cdVoiceT<5200}
function cdBeep(n){ // bip a cada segundo; som mais alto no "VAI!"
 if(n>0){
  if(n===COUNTDOWN_SECONDS&&playCountdownVoice(0)){cdVoiceT=performance.now();return}
  if(n===3&&!cdVoiceOn()&&playCountdownVoice(2)){cdVoiceT=performance.now()-2000;return}   // contagem de 3 s: começa no "3" da gravação
  if(sampleBuffers.countdown&&audioEnabled&&cdVoiceOn())return;   // números seguintes já estão na gravação
  tone(n<=2?700:520,.12,'square',.07);
 }
 else{tone(784,.2,'triangle',.12);tone(1046,.35,'triangle',.11,.14)}
}
function cancelCountdown(){stopCountdownVoice();if(typeof tvBriefStop==='function')tvBriefStop();clearInterval(cdTimer);cdTimer=null;clearTimeout(roundTimer);hideRoundBanner()}
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
 cancelCountdown();soccerDuel=null;tieState=null;podiumNote='';
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
 if(((net.tv&&net.role==='host')||net.role==='offline')&&typeof tvBriefStart==='function'){tvBriefStart(id,info,label);return}   // TV: antes de valer, mostra "como jogar" e espera todos darem OK
 runCountdown(COUNTDOWN_SECONDS,'🎲 '+info.label,'Rodada '+roundNumber,label,info.desc);
}
/* Instruções mostradas na TV antes de cada minigame */
const MODE_HELP={
 bread:{demo:['🍞','👆'],how:'Aperte o botão o mais rápido que conseguir: são 100 cliques. O último a terminar come o pão! Quando só um faltar, ele tem 30 segundos.',phone:'Toque no botão grande CLICAR!',pad:'Aperte A (X no PlayStation) várias vezes'},
 ball:{demo:['🔵','💥'],how:'Equilibre-se na sua bola e empurre os rivais para fora da arena. Vence o último que ficar em pé!',phone:'Arraste o joystick para rolar a bola',pad:'Analógico ou direcional movem a bola'},
 bowling:{demo:['⚫','🎳'],how:'Na sua vez, escolha a direção e a força e lance a bola pela ladeira. Vence quem derrubar mais pinos!',phone:'Ajuste direção e força nas barras e toque em LANÇAR',pad:'◀▶ mira, ▲▼ força, A lança'},
 soccer:{demo:['⚽','🧤'],how:'Um goleiro contra os batedores. Cada um escolhe ESQUERDA, MEIO ou DIREITA ao mesmo tempo. Se o goleiro escolher o mesmo lado do chute, defende! 3 defesas ou mais defesas que gols e o goleiro vence.',phone:'Toque em ESQUERDA, MEIO ou DIREITA',pad:'◀ esquerda, ▲ meio, ▶ direita'},
 ship:{demo:['🚀','⚪'],how:'Pilote sua nave na frente do seu gol e rebata as bolas de metal. Cada gol sofrido tira 1 das 15 vidas. Às vezes o jogo sorteia duplas 2 contra 2!',phone:'Arraste o joystick para mover a nave',pad:'Analógico ou direcional movem a nave'},
 dodge:{demo:['🏐','🎯'],how:'Dois times de lados opostos da quadra — ninguém cruza a linha do meio! Chegue perto de uma bola do SEU lado para pegar e arremesse nos rivais: quem for acertado DIRETO sai (bola que bate na parede não queima). Desvie das bolas deles! Vence o time que eliminar todos.',phone:'Joystick move • botão ARREMESSAR joga a bola',pad:'Analógico move • A arremessa'},
 lava:{demo:['🔥','🦘'],how:'Sobreviva na plataforma sobre a lava! O facho de fogo gira e acelera: PULE por cima dele. Punhos de magma caem nos círculos vermelhos: saia de lá antes! Vence o último vivo (45 segundos).',phone:'Joystick move • botão PULAR salta o facho',pad:'Analógico move • A pula'},
 bridge:{demo:['🌉','👣'],how:'Todos escolhem ao mesmo tempo um dos 4 caminhos (⬅ ⬆ ⬇ ➡), cada um com um tamanho de ponte. Se você for o único a escolher o seu caminho, a ponte cresce e você avança; se outro jogador escolher o mesmo, NINGUÉM avança. Vence quem atravessar a lava primeiro!',phone:'Toque num dos 4 caminhos',pad:'◀ ▲ ▼ ▶ escolhe o caminho'},
 glass:{demo:['🔷','🧠'],how:'Em cada fileira há 2 vidros e um deles é FRACO. A ordem é sorteada e cada um joga na sua vez, com 5 segundos para escolher (⬆ cima / ⬇ baixo). Se o vidro quebrar, você cai e volta ao início — mas todos viram qual era o fraco. O vidro volta inteiro no próximo turno: MEMORIZE! Vence quem atravessar primeiro.',phone:'Na sua vez, toque no vidro de cima ou de baixo',pad:'▲ ▼ escolhe o vidro'},
 turbo:{demo:['⚡','🚀'],how:'Sua nave desliza só pelo seu lado. Defenda o gol, use os pads verdes para acelerar a bola e o ESPECIAL para empurrá-la. Às vezes o jogo sorteia duplas 2 contra 2!',phone:'Joystick move • botão ESPECIAL empurra a bola',pad:'Analógico move • A usa o ESPECIAL'}
};

/* Home: número de minigames sempre igual ao da lista */
{const el=document.getElementById('homeMgCount');if(el)el.textContent='🎮 '+MINIGAMES.length+' minigames'}

/* ---- Animação de sorteio (goleiro / duplas): nomes girando, desacelerando e revelando o resultado ---- */
const DRAW_MS=4200;                      // sorteio do goleiro (giro + resultado)
const TEAMS_SPIN=2700,TEAMS_HOLD=4000,PRE_COUNT=5,PRE_MS=TEAMS_SPIN+TEAMS_HOLD+PRE_COUNT*1000;   // duplas: giro, 4 s mostrando, contagem de 5 s
let drawTimers=[];
function stopDrawAnim(){drawTimers.forEach(clearTimeout);drawTimers=[];const el=document.getElementById('drawBox');if(el)el.classList.remove('show');hideRoundBanner()}
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
  drawTimers.push(setTimeout(()=>el.classList.remove('show'),o.hold||Math.max(900,DRAW_MS-SPIN-100)));
 };
 step();
}

/* Depois do sorteio de duplas/times: mostra o resultado por 4 s e então faz a contagem 5…1 até o jogo valer.
   Chamado no início do minigame (anfitrião/offline); os convidados recebem o sorteio e a contagem por mensagem. */
function runPreGame(o,title,sub){
 o.hold=TEAMS_HOLD;runDrawAnim(o);netBroadcast({k:'draw',o,teams:o.teams,dodgeTeams:o.dodgeTeams});
 for(let n=PRE_COUNT;n>=1;n--){
  drawTimers.push(setTimeout(()=>{showRoundBanner(title,sub,String(n));cdBeep(n);netBroadcast({k:'cd',title,sub,n})},TEAMS_SPIN+TEAMS_HOLD+(PRE_COUNT-n)*1000));
 }
 drawTimers.push(setTimeout(()=>{showRoundBanner(title,sub,'VAI!');cdBeep(0);netBroadcast({k:'cd',title,sub,n:0});setTimeout(hideRoundBanner,700)},PRE_MS));
}
