/* Menu de configurações (⚙️): liga/desliga música e efeitos. As escolhas ficam salvas no aparelho. */
(function(){
 const modal=document.getElementById('settingsModal'),music=document.getElementById('optMusic'),sfx=document.getElementById('optSfx');
 const leave=document.getElementById('leaveRoom'),restart=document.getElementById('restartRound');
 music.checked=musicEnabled;sfx.checked=audioEnabled;
 document.getElementById('settingsBtn').addEventListener('click',()=>{
  music.checked=musicEnabled;sfx.checked=audioEnabled;
  const inGame=document.getElementById('screenMinigames').style.display!=='none';
  leave.style.display=inGame?'':'none';
  restart.style.display=inGame&&net.role!=='client'&&!podiumActive?'':'none';
  modal.classList.add('show');
 });
 const close=()=>modal.classList.remove('show');
 document.getElementById('closeSettings').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 music.addEventListener('change',()=>{
  musicEnabled=music.checked;
  if(musicEnabled){ensureAudio();startMusic()}else stopMusic();
  saveSettings();
 });
 sfx.addEventListener('change',()=>{
  audioEnabled=sfx.checked;saveSettings();
  if(audioEnabled){ensureAudio();tone(660,.08,'triangle',.08);Object.keys(SAMPLE_URLS).forEach(loadSample)}
 });
 restart.addEventListener('click',()=>{close();document.getElementById('reset').click()});
 leave.addEventListener('click',()=>{
  close();netLeave();tournamentScores.fill(0);roundsPlayed=0;tournamentCharacterLocked=false;resetMinigameBag();
  document.getElementById('scoreOverlay').classList.remove('show');reset();showFlowScreen('screenHome');
 });
})();
