/* Carrega o three.js (módulo ES via importmap do index.html) + carregador de modelos .glb,
   e depois os scripts do jogo, em ordem. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const GAME_SCRIPTS=['audio','settings','tournament','flow','scene','characters','net','minigame-ball','roster','minigame-bread','minigame-bowling','bowling-ui','character-select','touch-controls','self-marker','glb-characters','game'];
const loaderEl=document.getElementById('bootLoader'),loaderMsg=document.getElementById('bootMsg');
const setMsg=t=>{if(loaderMsg)loaderMsg.textContent=t};
function loadScript(src){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>fail(new Error('Falha ao carregar '+src));document.body.appendChild(s)})}
(async()=>{
 try{
  window.THREE=THREE;window.GLTFLoader=GLTFLoader;window.SkeletonUtils=SkeletonUtils;
  for(let i=0;i<GAME_SCRIPTS.length;i++){setMsg('Carregando o jogo… '+Math.round((i+1)/GAME_SCRIPTS.length*100)+'%');await loadScript('js/'+GAME_SCRIPTS[i]+'.js')}
  requestAnimationFrame(()=>{if(loaderEl)loaderEl.classList.add('hide');setTimeout(()=>loaderEl&&loaderEl.remove(),400)});
 }catch(err){
  console.error(err);setMsg('😕 '+err.message+' — abra o jogo por um servidor (npm start ou Live Server).');
  if(loaderEl)loaderEl.classList.add('error');
 }
})();
