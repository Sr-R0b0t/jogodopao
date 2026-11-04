/* Áudio sintetizado (Web Audio): sem arquivos de som. */
const SETTINGS_KEY='jogoDoPao.settings';
function loadSettings(){try{return Object.assign({music:true,sfx:true},JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'))}catch(e){return {music:true,sfx:true}}}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({music:musicEnabled,sfx:audioEnabled}))}catch(e){}}
const _settings=loadSettings();
/* A música começa LIGADA; só desliga se o jogador desligar nas Configurações. */
let audioCtx=null,masterGain=null,musicTimer=null,musicStep=0;
let audioEnabled=_settings.sfx;   // efeitos sonoros
let musicEnabled=_settings.music; // música de fundo
function ensureAudio(){
 if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=.55;masterGain.connect(audioCtx.destination)}
 if(audioCtx.state==='suspended')audioCtx.resume();
}
function tone(freq,duration=.12,wave='sine',volume=.12,when=0,slideTo=null,isMusic=false){
 if(!(isMusic?musicEnabled:audioEnabled))return;
 ensureAudio();const now=audioCtx.currentTime+when;
 const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
 osc.type=wave;osc.frequency.setValueAtTime(freq,now);
 if(slideTo!==null)osc.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo),now+duration);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+duration+.03);
}
function noisePop(duration=.22,volume=.11,lowpass=1800){
 if(!audioEnabled)return;ensureAudio();
 const length=Math.max(1,Math.floor(audioCtx.sampleRate*duration));
 const buffer=audioCtx.createBuffer(1,length,audioCtx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
 const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
 source.buffer=buffer;filter.type='lowpass';filter.frequency.value=lowpass;
 gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
 source.connect(filter);filter.connect(gain);gain.connect(masterGain);source.start();source.stop(audioCtx.currentTime+duration);
}
function sfxClick(){tone(620,.045,'square',.035,0,390)}
function sfxCream(){noisePop(.25,.18,1500);tone(220,.28,'sawtooth',.08,0,90);tone(520,.12,'sine',.06,.04,250)}
function sfxFinish(){[523,659,784].forEach((f,i)=>tone(f,.18,'triangle',.11,i*.09))}
/* ---- Sons gravados (pasta audio/). Carregam depois do 1º toque; se faltarem, usa os sons sintetizados. ---- */
const SAMPLE_URLS={whistle:'audio/apito.mp3',kick:'audio/chute.mp3',bite:'audio/mordida.mp3',metalHit:'audio/metal-impacto.mp3',metalRoll:'audio/metal-rolando.wav',metalGoal:'audio/metal-gol.mp3',pins:'audio/pino-boliche.mp3',victory:'audio/som-vitoria.mp3',winner:'audio/som-vencedor.mp3'};
const sampleBuffers={},sampleLoading={};
function loadSample(name){
 if(sampleBuffers[name]||sampleLoading[name])return;
 ensureAudio();
 sampleLoading[name]=fetch(SAMPLE_URLS[name]).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer()})
  .then(b=>new Promise((ok,err)=>audioCtx.decodeAudioData(b,ok,err)))
  .then(buf=>{sampleBuffers[name]=buf}).catch(e=>console.warn('som não carregou:',name,e));
}
function playSample(name,volume=1){
 if(!audioEnabled)return true;               // efeitos desligados: não toca nada
 ensureAudio();const buf=sampleBuffers[name];
 if(!buf){loadSample(name);return false}      // ainda não carregou: quem chamou usa o som sintetizado
 const src=audioCtx.createBufferSource(),gain=audioCtx.createGain();
 src.buffer=buf;gain.gain.value=volume;src.connect(gain);gain.connect(masterGain);src.start();return true;
}
let rollSrc=null,rollGain=null;
function setRollLoop(level){            // som contínuo da bola de metal rolando; level 0..1 (0 = silêncio)
 if(!audioEnabled||level<=0){if(rollGain)rollGain.gain.value=0;return}
 ensureAudio();const buf=sampleBuffers.metalRoll;if(!buf){loadSample('metalRoll');return}
 if(!rollSrc){rollSrc=audioCtx.createBufferSource();rollGain=audioCtx.createGain();rollGain.gain.value=0;rollSrc.buffer=buf;rollSrc.loop=true;rollSrc.connect(rollGain);rollGain.connect(masterGain);rollSrc.start()}
 rollGain.gain.value=Math.min(1,level)*.55;
}
let lastMetalHit=0;
function sfxMetalHit(vol=1){const t=performance.now();if(t-lastMetalHit<70)return;lastMetalHit=t;if(!playSample('metalHit',Math.max(.1,Math.min(1,vol))*.45))tone(900,.06,'square',.04,0,500)}
function sfxMetalGoal(){if(!playSample('metalGoal',.5))sfxCream()}
function sfxPins(count){const v=Math.min(1,.45+.055*count);if(!playSample('pins',v))noisePop(.5,.18,2200)}
/* Pódio: toca o som de vitória e, logo em seguida, o som de vencedor (sem intervalo). */
let podiumSnd=[];
function stopPodiumSound(){podiumSnd.forEach(s=>{try{s.stop()}catch(e){}});podiumSnd=[]}
function sfxPodiumSequence(){
 if(!audioEnabled)return false;
 ensureAudio();const v=sampleBuffers.victory,w=sampleBuffers.winner;
 if(!v||!w){loadSample('victory');loadSample('winner');return false}
 stopPodiumSound();
 const t0=audioCtx.currentTime+.05;
 [[v,t0,.95],[w,t0+v.duration,.8]].forEach(([buf,when,vol])=>{const s=audioCtx.createBufferSource(),g=audioCtx.createGain();s.buffer=buf;g.gain.value=vol;s.connect(g);g.connect(masterGain);s.start(when);podiumSnd.push(s)});
 return true;
}
function sfxBite(){if(playSample('bite',1))return;sfxChew()}   // mordida final (som gravado)
function sfxWhistle(){if(!playSample('whistle',1)){tone(1800,.25,'sine',.12);tone(2000,.25,'sine',.1,.28)}}
function sfxKick(){if(!playSample('kick',1)){noisePop(.12,.2,900);tone(120,.15,'sine',.15,0,60)}}
function sfxChew(){if(sampleBuffers.bite)return;noisePop(.12,.12,950);tone(170,.16,'triangle',.08,0,115);setTimeout(()=>{if(audioEnabled){noisePop(.08,.08,1300);tone(230,.11,'sine',.06)}},180)}
const melody=[392,494,587,494,440,523,659,523,349,440,523,440,392,494,587,494];
function startMusic(){
 if(!musicEnabled||musicTimer)return;
 musicTimer=setInterval(()=>{
  if(!musicEnabled)return;
  const note=melody[musicStep%melody.length];
  tone(note,.19,'triangle',.027,0,null,true);
  if(musicStep%4===0)tone(note/2,.24,'sine',.022,0,null,true);
  musicStep++;
 },230);
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}

/* Navegadores só liberam som após o 1º toque/tecla: ligamos a música nesse momento. */
function unlockAudioOnce(){
 Object.keys(SAMPLE_URLS).forEach(n=>setTimeout(()=>loadSample(n),0));
 document.removeEventListener('pointerdown',unlockAudioOnce);document.removeEventListener('keydown',unlockAudioOnce);
 ensureAudio();if(musicEnabled)startMusic();
}
document.addEventListener('pointerdown',unlockAudioOnce);
document.addEventListener('keydown',unlockAudioOnce);
// Pausa a música quando a aba/app vai para segundo plano.
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(musicEnabled&&audioCtx)startMusic()});
