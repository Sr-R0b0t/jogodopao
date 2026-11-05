/* Navegação entre telas: início → personagens → minigames. */
function showFlowScreen(id){
 ['screenHome','screenCharacters','screenOnline','screenMinigames'].forEach(screenId=>{
  document.getElementById(screenId).style.display=screenId===id?'':'none';
 });
 if((id==='screenCharacters'||id==='screenOnline')&&typeof ensurePreviews==='function')ensurePreviews();
 if(id==='screenOnline')netRenderGrid();
 window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('goCharacters').addEventListener('click',()=>showFlowScreen('screenCharacters'));
document.getElementById('backHome').addEventListener('click',()=>showFlowScreen('screenHome'));
document.getElementById('goMinigames').addEventListener('click',()=>{
 if(!tournamentCharacterLocked){localPadsSync();setActivePlayers(pickActive(Number(document.getElementById('playerCount').value)||MAX_PLAYERS,[humanIndex,...localPadSlots()]))}
 resetMinigameBag();startRound(); // vai direto para um minigame sorteado
});
document.getElementById('goOnline').addEventListener('click',()=>showFlowScreen('screenOnline'));
document.getElementById('backHomeOnline').addEventListener('click',()=>{netLeave();showFlowScreen('screenHome')});
