/* Cena Three.js: renderer, câmera, luzes e chão da arena. */
const host=document.getElementById('scene');
const ARENA_SCALE=1.25; // tamanho da arena (1 = original)
const ARENA_EDGE=7.5*ARENA_SCALE; // raio da plataforma (borda)
/* Celulares: menos pixels e sombras menores = carrega e roda mais leve. */
const LOW_POWER=matchMedia('(pointer:coarse)').matches||Math.min(innerWidth,innerHeight)<700;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#392753');
scene.fog=new THREE.Fog('#392753',20,70);
const camera=new THREE.PerspectiveCamera(42,1,0.1,100);
camera.position.set(0,10.7,15.5);camera.lookAt(0,0.6,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,LOW_POWER?1.5:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
host.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffe8ff,0x45305e,2.0));
const key=new THREE.DirectionalLight(0xffe5b6,3.3);key.position.set(-5,10,7);key.castShadow=true;key.shadow.mapSize.set(LOW_POWER?512:1024,LOW_POWER?512:1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;key.shadow.camera.updateProjectionMatrix();scene.add(key);
const rim=new THREE.DirectionalLight(0x8fcaff,2.0);rim.position.set(5,5,-6);scene.add(rim);
const mat=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const floorMat=mat('#49336b');
const floor=new THREE.Mesh(new THREE.CylinderGeometry(7.5*ARENA_SCALE,7.5*ARENA_SCALE,.35,96),floorMat);floor.position.y=-.3;floor.receiveShadow=true;scene.add(floor);
const rimMesh=new THREE.Mesh(new THREE.TorusGeometry(7.15*ARENA_SCALE,.13,12,100),mat('#d0a5ff',.35));rimMesh.rotation.x=Math.PI/2;rimMesh.position.y=-.08;scene.add(rimMesh);
const inner=new THREE.Mesh(new THREE.CylinderGeometry(4.8*ARENA_SCALE,4.8*ARENA_SCALE,.06,80),mat('#654487'));inner.position.y=-.08;inner.receiveShadow=true;scene.add(inner);
const arenaDots=[];
for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const dot=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),mat(i%2?'#ffda70':'#a6f5c8'));dot.position.set(Math.cos(a)*6.7*ARENA_SCALE,.02,Math.sin(a)*6.7*ARENA_SCALE);scene.add(dot);arenaDots.push(dot)}

/* Câmera: enquadra a arena inteira (inclusive a parte de baixo). Em telas estreitas (celular em pé)
   afasta mais para caber a largura. O boliche usa a câmera original, focada na pista. */
function applyCameraPose(){
 const aspect=host.clientWidth>0&&host.clientHeight>0?host.clientWidth/host.clientHeight:1.76; // tela escondida = proporção padrão
 if(typeof podiumActive!=='undefined'&&podiumActive){ // pódio: câmera de frente, afasta em telas estreitas
  const d=Math.max(12.4,14.3/aspect);camera.position.set(0,4.3+(d-12.4)*.15,d);camera.lookAt(0,2.7,0);return;
 }
 if(typeof gameMode!=='undefined'&&(isShipMode()||gameMode==='dodge'||gameMode==='lava'||gameMode==='bridge'||gameMode==='glass')){ // visão de cima, de frente para a arena quadrada
  const mob=document.body.classList.contains('touch-ui')?(gameMode==='glass'?(aspect<1?1.5:1.2):1.1):1,z=((typeof isTurbo==='function'&&isTurbo())?1.07:gameMode==='dodge'?1.38:gameMode==='lava'?1.3:gameMode==='bridge'?1.2:gameMode==='glass'?1.08:1)*mob,tgt=[0,0,.8*z],base=[0,15*z,12.8*z],s=Math.max(1,13*z/(15.4*aspect));
  camera.position.set(0,tgt[1]+(base[1]-tgt[1])*s,tgt[2]+(base[2]-tgt[2])*s);camera.lookAt(...tgt);return;
 }
 if(typeof gameMode!=='undefined'&&gameMode==='soccer'){ // atrás do batedor, olhando para o gol
  const tgt=[0,1.0,-3.3],base=[0,3.4,8.4],s=Math.max(1,7/(9.4*aspect));
  camera.position.set(0,tgt[1]+(base[1]-tgt[1])*s,tgt[2]+(base[2]-tgt[2])*s);camera.lookAt(...tgt);return;
 }
 if(typeof gameMode!=='undefined'&&gameMode==='bowling'){camera.position.set(0,10.7,15.5);camera.lookAt(0,.6,0);return}
 const tz=3.1,by=13.5,bz=20,baseDist=Math.hypot(by,bz-tz);
 // distância mínima para a arena caber na largura (hFOV = vFOV*aspect), com 8% de folga
 const need=ARENA_EDGE*1.08/(Math.tan(21*Math.PI/180)*aspect),s=Math.max(1,need/baseDist);
 camera.position.set(0,by*s,tz+(bz-tz)*s);
 camera.lookAt(0,0,tz);
}
