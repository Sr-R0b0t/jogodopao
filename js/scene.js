/* Cena Three.js: renderer, câmera, luzes e chão da arena. */
const host=document.getElementById('scene');
const ARENA_SCALE=1.25; // tamanho da arena (1 = original)
/* Celulares: menos pixels e sombras menores = carrega e roda mais leve. */
const LOW_POWER=matchMedia('(pointer:coarse)').matches||Math.min(innerWidth,innerHeight)<700;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#392753');
scene.fog=new THREE.Fog('#392753',18,40);
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
for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const dot=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),mat(i%2?'#ffda70':'#a6f5c8'));dot.position.set(Math.cos(a)*6.7*ARENA_SCALE,.02,Math.sin(a)*6.7*ARENA_SCALE);scene.add(dot)}
