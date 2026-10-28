/* Controles de toque estilo Among Us: analógico (esquerda) + botão de ação (direita).
   Ativa automaticamente em telas de toque; para testar no PC, abra index.html?touch=1 */
const joystick={x:0,y:0,active:false}; // x,y de -1 a 1 (lido pelo modo Bolas e pelo Boliche)

(function setupTouchControls(){
 const touchUI=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window||/[?&]touch/.test(location.search);
 if(touchUI)document.body.classList.add('touch-ui');

 /* --- Analógico --- */
 const base=document.getElementById('joyBase'),stick=document.getElementById('joyStick');
 let pid=null;
 function moveStick(e){
  const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width/2-10;
  let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);
  if(d>max){dx=dx/d*max;dy=dy/d*max}
  stick.style.transform=`translate(${dx}px,${dy}px)`;
  const mag=Math.hypot(dx,dy)/max;
  if(mag<.12){joystick.x=0;joystick.y=0}else{joystick.x=dx/max;joystick.y=dy/max}
  joystick.active=true;
 }
 function endStick(e){
  if(e.pointerId!==pid)return;
  pid=null;stick.style.transform='';joystick.x=0;joystick.y=0;joystick.active=false;
 }
 base.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;base.setPointerCapture(pid);moveStick(e)});
 base.addEventListener('pointermove',e=>{if(e.pointerId===pid)moveStick(e)});
 base.addEventListener('pointerup',endStick);
 base.addEventListener('pointercancel',endStick);

 /* --- Botão de ação: dispara o mesmo botão principal (CLICAR / EMPURRÃO / LANÇAR) --- */
 const action=document.getElementById('touchAction'),tap=document.getElementById('tap');
 action.addEventListener('pointerdown',e=>{e.preventDefault();if(!action.disabled)tap.click()});

 /* --- Força do lançamento (boliche) --- */
 const power=document.getElementById('touchPower');
 power.addEventListener('input',()=>{
  bowlingPowerValue=Number(power.value);
  document.getElementById('bowlingPower').value=power.value;
  updateBowlingControlValues();
 });
})();

/* Chamado a cada frame pelo game.js */
let touchActionLabel='';
function updateTouchControls(dt){
 if(!document.body.classList.contains('touch-ui'))return;
 const action=document.getElementById('touchAction');
 action.disabled=document.getElementById('tap').disabled;
 const label=gameMode==='ball'?'💨 EMPURRÃO':gameMode==='bowling'?'🎳 LANÇAR':'👆 CLICAR';
 if(label!==touchActionLabel){touchActionLabel=label;action.textContent=label}
 // Boliche: analógico move o jogador para os lados.
 if(gameMode==='bowling'&&joystick.active&&Math.abs(joystick.x)>.15)nudgeBowlerAim(joystick.x*dt*2.4);
}
