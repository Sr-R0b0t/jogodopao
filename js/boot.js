/* Carrega o three.js (módulo ES, sem o aviso de depreciação) e depois os scripts do jogo, em ordem. */
const THREE_URLS=[
 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
 'https://unpkg.com/three@0.160.0/build/three.module.js'
];
const GAME_SCRIPTS=['audio','settings','tournament','flow','scene','characters','net','minigame-ball','minigame-bread','minigame-bowling','bowling-ui','character-select','touch-controls','game'];
const loaderEl=document.getElementById('bootLoader'),loaderMsg=document.getElementById('bootMsg');
const setMsg=t=>{if(loaderMsg)loaderMsg.textContent=t};
function loadScript(src){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>fail(new Error('Falha ao carregar '+src));document.body.appendChild(s)})}
(async()=>{
 try{
  setMsg('Carregando o motor 3D…');
  let mod=null;
  for(const u of THREE_URLS){try{mod=await import(u);break}catch(e){}}
  if(!mod)throw new Error('Não foi possível baixar o three.js. Verifique a internet.');
  window.THREE=mod;
  for(let i=0;i<GAME_SCRIPTS.length;i++){setMsg('Carregando o jogo… '+Math.round((i+1)/GAME_SCRIPTS.length*100)+'%');await loadScript('js/'+GAME_SCRIPTS[i]+'.js')}
  requestAnimationFrame(()=>{if(loaderEl)loaderEl.classList.add('hide');setTimeout(()=>loaderEl&&loaderEl.remove(),400)});
 }catch(err){
  console.error(err);setMsg('😕 '+err.message+' — abra o jogo por um servidor (npm start ou Live Server).');
  if(loaderEl)loaderEl.classList.add('error');
 }
})();
