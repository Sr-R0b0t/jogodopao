/* Modelos 3D dos 5 personagens e lista `players`. */
function sphere(parent,color,pos,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),mat(color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function capsule(parent,color,pos,scale){return sphere(parent,color,pos,scale)}
function limb(parent,color,from,to,r1=.12,r2=.12){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,d.length(),12),mat(color));m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m}
function makeCharacter(type,color,accent){
 const root=new THREE.Group(),rig=new THREE.Group();root.add(rig);
 const body=sphere(rig,color,[0,.83,0],[.48,.59,.34]);
 sphere(rig,accent,[0,.85,.305],[.3,.36,.09]);
 sphere(rig,'#ffe9cf',[0,1.48,0],[.52,.49,.45]);
 for(const x of [-.19,.19]){sphere(rig,'#ffffff',[x,1.53,.388],[.115,.14,.055]);sphere(rig,'#20162b',[x+.025,1.52,.438],[.055,.075,.025]);sphere(rig,'#ffffff',[x+.04,1.56,.458],[.022,.027,.012])}
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,20,Math.PI),mat('#573049'));smile.position.set(0,1.32,.421);smile.rotation.z=Math.PI;rig.add(smile);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.05,0);rig.add(arm);
  limb(arm,color,[0,0,0],[side*.18,-.3,.12],.13,.11);
  sphere(arm,accent,[side*.18,-.31,.12],[.14,.13,.14]);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.22,.38,0);rig.add(leg);
  limb(leg,color,[0,0,0],[side*.04,-.25,.06],.15,.12);
  sphere(leg,accent,[side*.04,-.28,.12],[.17,.11,.21]);legs.push(leg);
 }
 if(type==='fox'){sphere(rig,accent,[-.28,1.83,.02],[.18,.35,.16]).rotation.z=-.35;sphere(rig,accent,[.28,1.83,.02],[.18,.35,.16]).rotation.z=.35;sphere(rig,'#fff0d0',[0,1.39,.48],[.21,.13,.09])}
 if(type==='frog'){sphere(rig,color,[-.22,1.86,.1],[.2,.2,.18]);sphere(rig,color,[.22,1.86,.1],[.2,.2,.18]);for(const x of [-.22,.22])sphere(rig,'#ffffff',[x,1.88,.24],[.11,.12,.05])}
 if(type==='panda'){sphere(rig,'#30263c',[-.34,1.78,.12],[.17,.19,.09]);sphere(rig,'#30263c',[.34,1.78,.12],[.17,.19,.09]);for(const x of [-.19,.19])sphere(rig,'#30263c',[x,1.53,.43],[.13,.16,.035])}
 if(type==='monkey'){sphere(rig,accent,[-.51,1.5,0],[.15,.2,.15]);sphere(rig,accent,[.51,1.5,0],[.15,.2,.15]);sphere(rig,accent,[0,1.36,.38],[.31,.22,.12])}
 if(type==='astronaut'){sphere(rig,'#9fe5ff',[0,1.53,.39],[.33,.29,.06]);sphere(rig,'#ffffff',[0,1.53,.45],[.2,.17,.025]);sphere(rig,'#4f8da8',[0,1.53,.472],[.12,.12,.015])}
 return {root,rig,arms,legs,body,phase:Math.random()*6,finished:false,throwAt:0,type};
}
const specs=[
 {name:'ASTRONAUTA',type:'astronaut',color:'#f1f4ff',accent:'#54b9ec',angle:-Math.PI/2},
 {name:'RAPOSA',type:'fox',color:'#f28a43',accent:'#fff0d0',angle:-Math.PI/2+Math.PI*2/5},
 {name:'SAPO',type:'frog',color:'#5fd68c',accent:'#ffdd5e',angle:-Math.PI/2+Math.PI*4/5},
 {name:'PANDA',type:'panda',color:'#f6f0e9',accent:'#ff89ac',angle:-Math.PI/2+Math.PI*6/5},
 {name:'MACACO',type:'monkey',color:'#a76a45',accent:'#ffcc86',angle:-Math.PI/2+Math.PI*8/5}
];
const players=specs.map((s,i)=>{const c=makeCharacter(s.type,s.color,s.accent);c.name=s.name;c.count=0;c.delay=[0,195,235,270,220][i];c.angle=s.angle;c.root.position.set(Math.cos(s.angle)*5.2,0,Math.sin(s.angle)*4.5);c.root.rotation.y=Math.atan2(-c.root.position.x,-c.root.position.z);scene.add(c.root);return c});
