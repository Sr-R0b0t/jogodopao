/* Mapas e dificuldade (modo offline). O Mapa 1 reúne os minigames atuais; os próximos aparecem como "Em breve". */
const MAPS=[
 {id:1,name:'Arena do Pão',emoji:'🍞',desc:'Os minigames clássicos do campeonato.',open:true},
 {id:2,name:'Mapa 2',emoji:'🌋',desc:'Novos minigames',open:false},
 {id:3,name:'Mapa 3',emoji:'🏝️',desc:'Novos minigames',open:false},
];
let currentMap=1;
const DIFF_DESC={facil:'Bots mais lentos e errando mais. Vença o campeonato para ganhar o troféu de BRONZE 🥉.',medio:'Bots no ritmo normal. Vença o campeonato para ganhar o troféu de PRATA 🥈.',dificil:'Bots mais rápidos, precisos e atentos. Vença o campeonato para ganhar o troféu de OURO 🥇.'};
function mapsRender(){
 const grid=document.getElementById('mapsGrid'),row=document.getElementById('diffRow');if(!grid||!row)return;
 grid.innerHTML='';
 MAPS.forEach(m=>{
  const el=document.createElement(m.open?'button':'div');el.className='map-card'+(m.open?'':' locked')+(m.id===currentMap&&m.open?' active':'');
  if(m.open){el.type='button';el.addEventListener('click',()=>{currentMap=m.id;mapsRender()})}
  const tro=m.open?Object.keys(DIFFICULTIES).map(d=>'<span class="'+(hasTrophy(m.id,d)?'got':'no')+'" title="'+DIFFICULTIES[d].trophy+'">'+DIFFICULTIES[d].medal+'</span>').join(''):'';
  el.innerHTML='<span class="map-emoji">'+(m.open?m.emoji:'🔒')+'</span><span class="map-name">'+m.name+'</span><span class="map-sub">'+(m.open?m.desc:'Em breve')+'</span>'+(m.open?'<span class="map-trophies">'+tro+'</span>':'');
  grid.appendChild(el);
 });
 row.innerHTML='';
 Object.keys(DIFFICULTIES).forEach(d=>{
  const b=document.createElement('button');b.type='button';b.className='diff-btn'+(d===gameDifficulty?' active':'');
  b.innerHTML='<span>'+DIFFICULTIES[d].medal+'</span>'+DIFFICULTIES[d].name;
  b.addEventListener('click',()=>{setDifficulty(d);mapsRender()});row.appendChild(b);
 });
 document.getElementById('diffDesc').textContent=DIFF_DESC[gameDifficulty];
}
mapsRender();
