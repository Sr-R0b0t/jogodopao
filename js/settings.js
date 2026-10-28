/* Menu de configurações (⚙️): liga/desliga música e efeitos. As escolhas ficam salvas no aparelho. */
(function(){
 const modal=document.getElementById('settingsModal'),music=document.getElementById('optMusic'),sfx=document.getElementById('optSfx');
 const leave=document.getElementById('leaveRoom');
 music.checked=musicEnabled;sfx.checked=audioEnabled;
 document.getElementById('settingsBtn').addEventListener('click',()=>{
  music.checked=musicEnabled;sfx.checked=audioEnabled;
  leave.style.display=(typeof net!=='undefined'&&net.role!=='offline')?'':'none';
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
  if(audioEnabled){ensureAudio();tone(660,.08,'triangle',.08)}
 });
 leave.addEventListener('click',()=>{close();netLeave();reset();showFlowScreen('screenHome')});
})();
