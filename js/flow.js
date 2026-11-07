/* Navegação entre telas: início → personagens → minigames. */
function showFlowScreen(id){
 ['screenHome','screenMaps','screenCharacters','screenOnline','screenMinigames'].forEach(screenId=>{
  document.getElementById(screenId).style.display=screenId===id?'':'none';
 });
 if((id==='screenCharacters'||id==='screenOnline')&&typeof ensurePreviews==='function')ensurePreviews();
 if(id==='screenOnline')netRenderGrid();
 window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('goCharacters').addEventListener('click',()=>{if(typeof mapsRender==='function')mapsRender();showFlowScreen('screenMaps')});
document.getElementById('backHome').addEventListener('click',()=>{if(typeof mapsRender==='function')mapsRender();showFlowScreen('screenMaps')});
document.getElementById('backHomeMaps').addEventListener('click',()=>showFlowScreen('screenHome'));
document.getElementById('goCharactersMaps').addEventListener('click',()=>showFlowScreen('screenCharacters'));
document.getElementById('goMinigames').addEventListener('click',()=>{
 if(!tournamentCharacterLocked){localPadsSync();setActivePlayers(pickActive(Number(document.getElementById('playerCount').value)||MAX_PLAYERS,[humanIndex,...localPadSlots()]))}
 resetMinigameBag();startRound(); // vai direto para um minigame sorteado
});
document.getElementById('goOnline').addEventListener('click',()=>showFlowScreen('screenOnline'));
document.getElementById('backHomeOnline').addEventListener('click',()=>{netLeave();showFlowScreen('screenHome')});
