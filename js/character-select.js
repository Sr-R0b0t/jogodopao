/* Seleção de personagem: miniaturas 3D, painel de detalhes e escolha do jogador. */
/* Miniaturas: renderizadas UMA vez num único contexto WebGL e convertidas em imagens.
   (Antes eram 6 contextos WebGL desenhando a cada frame — pesado e instável no celular.) */
const characterPreviewRenderers=[]; // mantido vazio por compatibilidade
const previewCache={};
let previewsReady=false;
function renderPreviewImages(){
 const renderer3=new THREE.WebGLRenderer({alpha:true,antialias:true});
 renderer3.setPixelRatio(1);renderer3.outputColorSpace=THREE.SRGBColorSpace;
 renderer3.toneMapping=THREE.ACESFilmicToneMapping;renderer3.toneMappingExposure=1.15;
 const sc=new THREE.Scene();
 sc.add(new THREE.HemisphereLight(0xffefff,0x514064,2.3));
 const light=new THREE.DirectionalLight(0xffffff,2.7);light.position.set(-3,5,5);sc.add(light);
 players.forEach((pl,i)=>{
  const model=pl.root.clone(true);model.position.set(0,-0.9,0);model.rotation.set(0,0,0);sc.add(model);
  [[false,112,112,.34],[true,224,236,.78]].forEach(([featured,W,H,scale])=>{
   model.scale.setScalar(scale);
   const cam=new THREE.PerspectiveCamera(35,W/H,.1,30);cam.position.set(0,1.05,5.2);cam.lookAt(0,.35,0);
   renderer3.setSize(W,H,false);renderer3.render(sc,cam);
   previewCache[i+(featured?'f':'s')]=renderer3.domElement.toDataURL('image/png');
  });
  sc.remove(model);
 });
 renderer3.dispose();try{renderer3.forceContextLoss()}catch(e){}
}
function ensurePreviews(){
 if(previewsReady)return;previewsReady=true;
 renderPreviewImages();initializeCharacterPreviews();updateFeaturedCharacterPreview(humanIndex);
}
function setPreviewImage(container,i,featured){
 const img=new Image();img.alt='';img.decoding='async';img.src=previewCache[i+(featured?'f':'s')]||'';
 container.replaceChildren(img);
}
function initializeCharacterPreviews(){
 document.querySelectorAll('.character-preview-slot').forEach(el=>setPreviewImage(el,Number(el.dataset.preview),false));
}
const characterProfiles=[
 {name:'Astronauta',emoji:'🧑‍🚀',description:'Pronto para explorar a arena e disputar o pão.'},
 {name:'Raposa',emoji:'🦊',description:'Esperta e veloz, sempre pronta para surpreender os rivais.'},
 {name:'Sapo',emoji:'🐸',description:'Saltitante e imprevisível na batalha pela vitória.'},
 {name:'Panda',emoji:'🐼',description:'Calmo por fora, competitivo quando a partida começa.'},
 {name:'Macaco',emoji:'🐵',description:'Cheio de energia e pronto para bagunçar a arena.'}
];
function updateFeaturedCharacterPreview(index){
 const featured=document.getElementById('previewAvatar');
 if(!featured||!previewsReady)return;
 setPreviewImage(featured,index,true);
}
function renderCharacterSelection(index){
 const profile=characterProfiles[index]||characterProfiles[0];
 document.querySelectorAll('.character-card').forEach(card=>{
  const selected=Number(card.dataset.character)===index;
  card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));
 });
 updateFeaturedCharacterPreview(index);
 document.getElementById('previewName').textContent=profile.name;
 document.getElementById('previewDescription').textContent=profile.description;
 document.querySelector('.character-count').textContent=String(index+1).padStart(2,'0')+' / 05 disponíveis';
}
document.getElementById('characterGrid').addEventListener('click',e=>{
 const card=e.target.closest('[data-character]');if(!card||running)return;
 const index=Number(card.dataset.character);
 document.getElementById('characterChoice').value=String(index);
 document.getElementById('characterChoice').dispatchEvent(new Event('change',{bubbles:true}));
 renderCharacterSelection(index);
});
document.getElementById('characterChoice').addEventListener('change',e=>{
 if(running||tournamentCharacterLocked){e.target.value=String(humanIndex);renderCharacterSelection(humanIndex);return}
 humanIndex=Number(e.target.value)||0;
 renderCharacterSelection(humanIndex);
 reset();
 document.getElementById('status').textContent='Você escolheu '+players[humanIndex].name+'. Prepare-se!';
});
renderCharacterSelection(0);
setTimeout(ensurePreviews,1500); // prepara as miniaturas em segundo plano, depois do 1º desenho da tela
