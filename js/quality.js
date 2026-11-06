/* Qualidade gráfica: Automática (padrão), Alta, Média ou Baixa — em Configurações.
   Automática começa na qualidade normal e, se o FPS ficar baixo por alguns segundos, desce um degrau
   (resolução e sombras). Não sobe sozinha na mesma sessão para não oscilar. No modo TV vale o regulador próprio da TV. */
const QUALITY_LEVELS=['alta','media','baixa'];
const QUALITY_NAMES={alta:'Alta',media:'Média',baixa:'Baixa'};
let qualityPref='auto',qualityAuto='alta';
try{const v=localStorage.getItem('jdp_quality');if(v==='alta'||v==='media'||v==='baixa'||v==='auto')qualityPref=v}catch(e){}
const qualityCur=()=>qualityPref==='auto'?qualityAuto:qualityPref;
function qualityRatio(l){const d=devicePixelRatio||1;return l==='alta'?Math.min(d,LOW_POWER?1.5:2):l==='media'?Math.min(d,1.25):Math.min(d,1)}
function applyQuality(){
 if(net.tv)return;                                   // TV: regulador próprio (tv.js)
 const l=qualityCur();
 renderer.setPixelRatio(qualityRatio(l));
 const sh=l!=='baixa',map=l==='alta'?(LOW_POWER?512:1024):512;
 if(key.castShadow!==sh)key.castShadow=sh;
 if(key.shadow.mapSize.x!==map){key.shadow.mapSize.set(map,map);if(key.shadow.map){key.shadow.map.dispose();key.shadow.map=null}}
 if(typeof resize==='function')resize();qualityLabel();
}
function qualityLabel(){
 const sel=document.getElementById('optQuality');if(!sel)return;
 const o=sel.querySelector('option[value="auto"]');if(o)o.textContent='Automática ('+QUALITY_NAMES[qualityAuto]+')';
 if(sel.value!==qualityPref)sel.value=qualityPref;
}
const qualityPerf={t0:0,frames:0,low:0};
function qualityTick(now){
 if(qualityPref!=='auto'||qualityAuto==='baixa')return;
 if(!qualityPerf.t0){qualityPerf.t0=now;qualityPerf.frames=0;return}
 qualityPerf.frames++;
 const el=now-qualityPerf.t0;if(el<2500)return;
 const fps=qualityPerf.frames*1000/el;qualityPerf.t0=now;qualityPerf.frames=0;
 const bf=document.getElementById('briefBox');
 if(document.hidden||el>4500||(bf&&bf.classList.contains('show'))){qualityPerf.low=0;return}   // aba escondida/travada de propósito: não conta
 if(fps<38){if(++qualityPerf.low>=2){qualityPerf.low=0;qualityAuto=QUALITY_LEVELS[QUALITY_LEVELS.indexOf(qualityAuto)+1];applyQuality()}}
 else qualityPerf.low=0;
}
(function(){
 const sel=document.getElementById('optQuality');if(!sel)return;
 sel.value=qualityPref;
 sel.addEventListener('change',()=>{
  qualityPref=sel.value;qualityAuto='alta';qualityPerf.low=0;qualityPerf.t0=0;
  try{localStorage.setItem('jdp_quality',qualityPref)}catch(e){}
  applyQuality();
 });
 applyQuality();
})();
