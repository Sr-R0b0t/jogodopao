/* Modelos 3D dos 5 personagens e lista `players`. */
function sphere(parent,color,pos,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),mat(color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function capsule(parent,color,pos,scale){return sphere(parent,color,pos,scale)}
function limb(parent,color,from,to,r1=.12,r2=.12){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,d.length(),12),mat(color));m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m}
function makeCharacter(type,color,accent){
 const root=new THREE.Group(),rig=new THREE.Group();root.add(rig);
 const darkLimb=type==='panda'?color:type==='fox'?'#5a301c':null; // mãos e pés escuros
 const body=sphere(rig,color,[0,.83,0],[.48,.59,.34]);
 if(type==='panda'||type==='fox'||type==='dragon')sphere(rig,accent,[0,.82,.28],type==='panda'?[.37,.46,.14]:[.32,.4,.12]).userData.noOutline=true; // barriga grande
 else sphere(rig,accent,[0,.85,.305],[.3,.36,.09]);
 sphere(rig,(type==='monkey'||type==='dragon'||type==='fox')?color:type==='panda'?'#fbf8f2':'#ffe9cf',[0,1.48,0],[.52,.49,.45]);
 if(!['monkey','panda','fox','dragon'].includes(type))for(const x of [-.19,.19]){sphere(rig,'#ffffff',[x,1.53,.388],[.115,.14,.055]);sphere(rig,'#20162b',[x+.025,1.52,.438],[.055,.075,.025]);sphere(rig,'#ffffff',[x+.04,1.56,.458],[.022,.027,.012])}
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,20,Math.PI),mat('#573049'));smile.position.set(0,['monkey','panda','fox','dragon'].includes(type)?1.3:1.32,['monkey','fox','dragon'].includes(type)?.5:.421);smile.rotation.z=Math.PI;rig.add(smile);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.05,0);rig.add(arm);
  limb(arm,color,[0,0,0],[side*.18,-.3,.12],.13,.11);
  sphere(arm,darkLimb||accent,[side*.18,-.31,.12],[.14,.13,.14]);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.22,.38,0);rig.add(leg);
  limb(leg,color,[0,0,0],[side*.04,-.25,.06],.15,.12);
  sphere(leg,darkLimb||accent,[side*.04,-.28,.12],[.17,.11,.21]);
  if(type==='panda')for(const dx of [-.06,0,.06])sphere(leg,'#ece8df',[side*.04+dx,-.3,.325],[.026,.026,.032]); // garrinhas
  if(type==='monkey'||type==='dragon')for(const dx of [-.075,0,.075])sphere(leg,accent,[side*.04+dx,-.29,.315],[.055,.05,.055]); // dedinhos
  legs.push(leg);
 }
if(type==='fox'){
  sphere(rig,'#ffe6bf',[0,1.38,.18],[.45,.30,.30]).userData.noOutline=true;            // máscara creme
  for(const s of [-1,1]){
   sphere(rig,'#ffe6bf',[s*.40,1.36,.05],[.15,.11,.14]).userData.noOutline=true;      // bochechas
   sphere(rig,color,[s*.3,2.02,0],[.17,.34,.1]).rotation.z=-s*.35;                    // orelha
   const tip=sphere(rig,'#5a301c',[s*.4,2.27,0],[.11,.12,.08]);tip.rotation.z=-s*.35;tip.userData.noOutline=true; // ponta escura
   const inn=sphere(rig,'#ffe6bf',[s*.31,2.0,.06],[.1,.24,.05]);inn.rotation.z=-s*.35;inn.userData.noOutline=true; // miolo
   sphere(rig,'#1a1018',[s*.19,1.50,.455],[.095,.125,.07]).userData.noOutline=true;   // olhos
   sphere(rig,'#ffffff',[s*.19+.03,1.54,.51],[.032,.04,.02]).userData.noOutline=true;
   sphere(rig,'#ffffff',[s*.19-.03,1.46,.508],[.016,.02,.012]).userData.noOutline=true;
  }
  sphere(rig,'#6b3a23',[0,1.40,.485],[.06,.04,.04]).userData.noOutline=true;          // nariz
  sphere(rig,color,[0,.72,-.42],[.24,.24,.4]).rotation.x=.5;                          // rabo fofo
  sphere(rig,color,[0,.98,-.6],[.22,.22,.32]).rotation.x=.9;
  sphere(rig,'#ffe6bf',[0,1.22,-.72],[.17,.17,.22]).userData.noOutline=true;          // ponta creme
 }
 if(type==='dragon'){
  const dark='#2f8a3a',tan='#f0c56a';
  sphere(rig,accent,[0,1.40,.17],[.43,.36,.32]).userData.noOutline=true;              // máscara creme
  for(const s of [-1,1]){
   sphere(rig,'#1a1018',[s*.19,1.50,.455],[.095,.125,.07]).userData.noOutline=true;   // olhos
   sphere(rig,'#ffffff',[s*.19+.03,1.54,.51],[.032,.04,.02]).userData.noOutline=true;
   sphere(rig,'#ffffff',[s*.19-.03,1.46,.508],[.016,.02,.012]).userData.noOutline=true;
   const horn=sphere(rig,accent,[s*.3,2.04,.02],[.09,.2,.09]);horn.rotation.z=-s*.4;horn.userData.noOutline=true; // chifres
   const fin=sphere(rig,color,[s*.56,1.55,-.03],[.14,.2,.08]);fin.rotation.y=s*.5;fin.userData.noOutline=true;     // barbatanas
   const mem=sphere(rig,tan,[s*.6,1.55,.02],[.1,.15,.05]);mem.rotation.y=s*.5;mem.userData.noOutline=true;
   const wing=sphere(rig,tan,[s*.5,1.02,-.4],[.32,.26,.04]);wing.rotation.z=-s*.45;wing.rotation.y=-s*.35;wing.userData.noOutline=true; // asas
   const bone=sphere(rig,color,[s*.38,1.25,-.36],[.3,.06,.06]);bone.rotation.z=-s*.45;bone.userData.noOutline=true;
   sphere(rig,dark,[s*.13,2.0,-.16],[.09,.12,.09]).userData.noOutline=true;           // espinhos na cabeça
  }
  for(let k=0;k<9;k++){                                                               // rabo com espinhos
   const t=k/8,r=.14-.08*t,y=.5+.5*t*t+.1*t,x=.3*Math.sin(t*2.4),z=-.32-.38*t;
   sphere(rig,color,[x,y,z],[r,r,r]);
   if(k===2||k===4||k===6)sphere(rig,dark,[x,y+r*.9,z],[.05,.06,.05]).userData.noOutline=true;
  }
 }
 if(type==='frog'){sphere(rig,color,[-.22,1.86,.1],[.2,.2,.18]);sphere(rig,color,[.22,1.86,.1],[.2,.2,.18]);for(const x of [-.22,.22])sphere(rig,'#ffffff',[x,1.88,.24],[.11,.12,.05])}
if(type==='panda'){
  for(const s of [-1,1]){
   sphere(rig,'#1d1822',[s*.37,1.8,0],[.17,.17,.1]);                               // orelha
   sphere(rig,'#3a3440',[s*.37,1.8,.07],[.105,.105,.05]).userData.noOutline=true;  // miolo da orelha
   const patch=sphere(rig,'#1d1822',[s*.21,1.52,.38],[.15,.19,.08]);patch.rotation.z=-s*.4;patch.userData.noOutline=true; // mancha do olho
   sphere(rig,'#ffffff',[s*.19,1.53,.455],[.075,.09,.045]).userData.noOutline=true;
   sphere(rig,'#14101a',[s*.19,1.52,.49],[.045,.06,.03]).userData.noOutline=true;
   sphere(rig,'#ffffff',[s*.19+.016,1.545,.515],[.016,.02,.01]).userData.noOutline=true;
  }
  sphere(rig,'#1a161d',[0,1.4,.445],[.075,.05,.05]).userData.noOutline=true;       // nariz
 }
if(type==='monkey'){
  // máscara creme do rosto (não recebe silhueta)
  sphere(rig,'#ffe3b3',[0,1.40,.16],[.40,.34,.33]).userData.noOutline=true;
  // olhos grandes, pretos e brilhantes
  for(const x of [-.19,.19]){
   sphere(rig,'#1a1018',[x,1.50,.455],[.095,.125,.07]).userData.noOutline=true;
   sphere(rig,'#ffffff',[x+.03,1.54,.51],[.032,.04,.02]).userData.noOutline=true;
   sphere(rig,'#ffffff',[x-.03,1.46,.508],[.016,.02,.012]).userData.noOutline=true;
  }
  // orelhas redondas: aro marrom + miolo creme
  for(const s of [-1,1]){
   sphere(rig,color,[s*.56,1.56,-.03],[.19,.21,.1]).rotation.y=s*.5;
   const inner=sphere(rig,'#ffd9a0',[s*.585,1.56,.04],[.145,.165,.07]);inner.rotation.y=s*.5;
  }
  // rabo enrolado
  for(let k=0;k<9;k++){const t=k/8,r=.085-.02*t;sphere(rig,color,[.34*Math.sin(t*2.9),.55+.8*t-.12*t*t,-.3-.12*Math.sin(t*3)],[r,r,r])}
 }
 if(type==='astronaut'){sphere(rig,'#9fe5ff',[0,1.53,.39],[.33,.29,.06]);sphere(rig,'#ffffff',[0,1.53,.45],[.2,.17,.025]);sphere(rig,'#4f8da8',[0,1.53,.472],[.12,.12,.015])}
 return {root,rig,arms,legs,body,phase:Math.random()*6,finished:false,throwAt:0,type};
}
const specs=[
 {name:'ASTRONAUTA',type:'astronaut',color:'#f1f4ff',accent:'#54b9ec',angle:-Math.PI/2},
 {name:'RAPOSA',type:'fox',color:'#f4721f',accent:'#ffe6bf',angle:-Math.PI/2+Math.PI*2/6},
 {name:'SAPO',type:'frog',color:'#5fd68c',accent:'#ffdd5e',angle:-Math.PI/2+Math.PI*4/6},
 {name:'PANDA',type:'panda',color:'#26222c',accent:'#fbf8f2',angle:-Math.PI/2+Math.PI*6/6},
 {name:'MACACO',type:'monkey',color:'#a8683f',accent:'#ffe0ad',angle:-Math.PI/2+Math.PI*8/6},
 {name:'DRAGÃO',type:'dragon',color:'#58b043',accent:'#f6e2b0',angle:-Math.PI/2+Math.PI*10/6}
];
const players=specs.map((s,i)=>{const c=makeCharacter(s.type,s.color,s.accent);c.name=s.name;c.count=0;c.delay=[0,195,235,270,220,250][i];c.angle=s.angle;c.root.position.set(Math.cos(s.angle)*5.2,0,Math.sin(s.angle)*4.5);c.root.rotation.y=Math.atan2(-c.root.position.x,-c.root.position.z);scene.add(c.root);return c});
