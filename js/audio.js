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
function sfxBite(){noisePop(.12,.12,950);tone(170,.16,'triangle',.08,0,115);setTimeout(()=>{if(audioEnabled){noisePop(.08,.08,1300);tone(230,.11,'sine',.06)}},180)}
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
 document.removeEventListener('pointerdown',unlockAudioOnce);document.removeEventListener('keydown',unlockAudioOnce);
 ensureAudio();if(musicEnabled)startMusic();
}
document.addEventListener('pointerdown',unlockAudioOnce);
document.addEventListener('keydown',unlockAudioOnce);
// Pausa a música quando a aba/app vai para segundo plano.
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(musicEnabled&&audioCtx)startMusic()});
