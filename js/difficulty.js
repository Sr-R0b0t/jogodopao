/* Dificuldade do modo offline: Fácil / Médio / Difícil. Só muda o comportamento dos bots (online e TV ficam sempre no Médio). */
const DIFFICULTIES={facil:{name:'Fácil',k:.72,medal:'🥉',trophy:'Bronze'},medio:{name:'Médio',k:1,medal:'🥈',trophy:'Prata'},dificil:{name:'Difícil',k:1.28,medal:'🥇',trophy:'Ouro'}};
let gameDifficulty='medio';
try{const v=localStorage.getItem('jdp_diff');if(DIFFICULTIES[v])gameDifficulty=v}catch(e){}
function setDifficulty(d){if(!DIFFICULTIES[d])return;gameDifficulty=d;try{localStorage.setItem('jdp_diff',d)}catch(e){}}
/* Fator de habilidade dos bots (1 = normal). */
function diffK(){return(net.role==='offline'&&!net.tv)?DIFFICULTIES[gameDifficulty].k:1}
/* Troféus: {mapa:{facil:true,medio:true,dificil:true}} salvos no aparelho. */
let trophies={};
try{trophies=JSON.parse(localStorage.getItem('jdp_trophies')||'{}')||{}}catch(e){trophies={}}
function hasTrophy(map,d){return !!(trophies[map]&&trophies[map][d])}
function awardTrophy(map,d){
 const isNew=!hasTrophy(map,d);
 if(isNew){(trophies[map]=trophies[map]||{})[d]=true;try{localStorage.setItem('jdp_trophies',JSON.stringify(trophies))}catch(e){}}
 return isNew;
}
