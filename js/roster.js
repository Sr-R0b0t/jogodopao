/* Quantidade de jogadores: o usuário escolhe de 2 a MAX_PLAYERS (8), mesmo que existam mais personagens.
   Os personagens "ativos" participam; os outros ficam escondidos e fora de todas as regras. */
const MAX_PLAYERS=8;
const isActive=i=>players[i].active!==false;
const activeIndices=()=>players.map((p,i)=>i).filter(isActive);
const activePlayers=()=>players.filter((p,i)=>isActive(i));
/* Escolhe `count` participantes: os obrigatórios (humanos) + sorteio entre os demais personagens. */
function pickActive(count,mustInclude){
 const chosen=[...new Set(mustInclude)];
 count=Math.max(2,chosen.length,Math.min(count,MAX_PLAYERS,players.length));
 const others=players.map((p,i)=>i).filter(i=>!chosen.includes(i)).sort(()=>Math.random()-.5);
 while(chosen.length<count&&others.length)chosen.push(others.shift());
 return chosen.sort((a,b)=>a-b);
}
/* Aplica o grupo de participantes: redistribui em círculo e atualiza os painéis de pontos. */
function setActivePlayers(indices){
 const set=new Set(indices);
 players.forEach((p,i)=>{p.active=set.has(i);p.root.visible=p.active});
 const list=activeIndices();
 list.forEach((i,k)=>{players[i].angle=-Math.PI/2+Math.PI*2*k/list.length});
 refreshTags();
}
/* Painéis de pontos: só dos ativos e espalhados em volta da arena (8 posições). */
function refreshTags(){
 const list=activeIndices();
 players.forEach((p,i)=>{
  const tag=document.getElementById('tag'+i);if(!tag)return;
  const k=list.indexOf(i);
  tag.dataset.pos=k<0?0:Math.round(k*8/list.length)%8;
  tag.style.display=(k<0||gameMode==='bowling')?'none':'';
 });
}
// Seletor da tela de personagens (modo offline); lembra a última escolha.
(function(){
 const sel=document.getElementById('playerCount');
 try{const v=localStorage.getItem('jogoDoPao.count');if(v&&sel.querySelector('option[value="'+v+'"]'))sel.value=v}catch(e){}
 sel.addEventListener('change',()=>{try{localStorage.setItem('jogoDoPao.count',sel.value)}catch(e){}});
})();
setActivePlayers(players.map((p,i)=>i));
