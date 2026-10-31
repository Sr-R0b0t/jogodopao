/* Modelos 3D dos personagens e a lista `players`.
   Cada personagem é montado com esferas/cilindros (sphere/limb). userData.noOutline evita que a
   silhueta "VOCÊ" apareça em detalhes do rosto. */
function sphere(parent,color,pos,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),mat(color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function capsule(parent,color,pos,scale){return sphere(parent,color,pos,scale)}
function limb(parent,color,from,to,r1=.12,r2=.12){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,d.length(),12),mat(color));m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m}

/* ---------- Fabola (modelo 3D baseado na folha de personagem) ---------- */
function buildFabola(rig,arms,legs,mark,root){
 root.userData.markY=2.9;
 const skin='#f5bc94',skinD='#e2a37c',hair='#3a2216',hairL='#4a2b1b',blk='#262020';
 const E=(c,p,sc,r)=>{const m=sphere(rig,c,p,sc);if(r)m.rotation.set(r[0]||0,r[1]||0,r[2]||0);return m};
 E(skin,[0,1.7,0],[.68,.6,.58]);                                                            // cabeça grande e larga
 for(const s of [-1,1]){
  mark(E(skin,[s*.4,1.46,.2],[.24,.2,.24]));                                                // bochechas
  mark(E(skin,[s*.69,1.62,-.02],[.11,.18,.13]));mark(E(skinD,[s*.74,1.62,.01],[.05,.11,.07])); // orelhas
  mark(E('#150e12',[s*.25,1.66,.5],[.13,.18,.09]));                                         // olhos grandes
  mark(E('#ffffff',[s*.25+.05,1.72,.575],[.048,.06,.028]));mark(E('#ffffff',[s*.25-.045,1.6,.57],[.022,.028,.016]));
  mark(E(hair,[s*.25,1.94,.48],[.2,.045,.06],[0,0,-s*.14]));                                // sobrancelhas grossas
  mark(E(hair,[s*.14,1.46,.53],[.19,.07,.07],[0,0,-s*.4]));                                 // bigode
  mark(E('#1a1414',[s*.21,1.08,.3],[.13,.07,.06],[0,0,s*.55]));                             // gola
 }
 mark(E('#eaa583',[0,1.55,.57],[.075,.065,.065]));                                           // nariz
 mark(E(hair,[0,1.49,.54],[.1,.05,.05]));                                                    // meio do bigode
 mark(E('#8a4a40',[0,1.39,.5],[.08,.018,.03]));                                              // boca
 mark(E(hair,[0,1.27,.43],[.13,.11,.09]));                                                   // cavanhaque
 // cabelo: base escura + tres ondas grandes jogadas para o lado
 E(hair,[0,1.99,-.12],[.68,.4,.6]);E(hair,[0,1.68,-.34],[.62,.52,.38]);
 for(const s of [-1,1])E(hair,[s*.6,1.8,.0],[.14,.3,.32]);
 E(hair,[-.08,2.3,.12],[.52,.2,.4],[0,0,.28]);E(hairL,[.24,2.26,.02],[.42,.19,.34],[0,0,-.22]);
 E(hair,[-.14,2.14,.34],[.4,.13,.2],[-.35,0,.22]);E(hairL,[-.4,2.16,.1],[.22,.17,.3],[0,0,.7]);
 // corpo: cinto, botões, antebraços de manga curta, botas
 mark(E('#141010',[0,.62,0],[.5,.05,.37]));mark(E('#c4c6cc',[0,.62,.36],[.085,.06,.025]));
 for(const y of [1.0,.88,.76])mark(E('#3a3330',[0,y,.33],[.025,.025,.015]));
 for(const s of [-1,1]){
  mark(sphere(arms[(s+1)/2],skin,[s*.16,-.25,.1],[.1,.13,.1]));
  mark(sphere(arms[(s+1)/2],blk,[s*.1,-.12,.04],[.17,.07,.17]));
  sphere(legs[(s+1)/2],'#1d1816',[s*.04,-.27,.17],[.2,.14,.27]);
 }
}
/* ---------- Princesa Luana ---------- */
function buildLuana(rig,arms,legs,mark,root,red){
 root.userData.markY=3.0;
 const skin='#f9d0a8',gold='#e6b83a';
 const E=(c,p,sc,r)=>{const m=sphere(rig,c,p,sc);if(r)m.rotation.set(r[0]||0,r[1]||0,r[2]||0);return m};
 const C=(c,rt,rb,h,p)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,36),mat(c));m.position.set(...p);m.castShadow=true;rig.add(m);return m};
 E(skin,[0,1.7,0],[.68,.62,.6]);E(skin,[0,1.2,.04],[.2,.2,.2]);                              // cabeça e pescoço
 for(const s of [-1,1]){
  mark(E('#150e12',[s*.26,1.64,.52],[.14,.19,.09]));                                        // olhos grandes
  mark(E('#ffffff',[s*.26+.05,1.71,.6],[.05,.065,.03]));mark(E('#ffffff',[s*.26-.05,1.57,.595],[.024,.03,.018]));
  mark(E('#2a1a14',[s*.26,1.84,.5],[.17,.028,.045],[0,0,-s*.12]));                          // cílios superiores
  mark(E('#2a1a14',[s*.41,1.74,.45],[.09,.024,.03],[0,0,-s*.55]));
  mark(E('#a66a35',[s*.26,1.99,.48],[.17,.028,.045],[0,0,-s*.14]));                         // sobrancelhas
  mark(E('#f2a1a1',[s*.44,1.46,.34],[.12,.075,.04]));                                       // bochechas rosadas
  mark(E(gold,[s*.69,1.46,.0],[.05,.06,.05]));                                              // brincos
  E(red,[s*.2,1.2,.2],[.04,.17,.05],[0,0,s*.1]);                                            // alças do vestido
  sphere(arms[(s+1)/2],skin,[s*.09,-.14,.05],[.12,.15,.12]).userData.noOutline=true;
 }
 mark(E('#e3a583',[0,1.52,.58],[.045,.04,.04]));                                             // nariz
 const sm=new THREE.Mesh(new THREE.TorusGeometry(.1,.02,8,20,Math.PI),mat('#a0524a'));sm.position.set(0,1.4,.55);sm.rotation.z=Math.PI;sm.userData.noOutline=true;rig.add(sm);
 // cabelo volumoso e ondulado
 E('#c28a48',[0,1.5,-.34],[.95,.95,.52]);E('#9a6633',[0,2.02,-.08],[.7,.46,.62]);
 for(let k=0;k<6;k++){const y=2.05-k*.27,r=Math.sqrt(Math.max(.05,1-((y-1.5)/.95)**2));E(k%2?'#e9bd6a':'#d9a455',[0,y,-.34-.5*r],[.72*r,.07,.08],[0,0,(k%2?.06:-.06)])} // ondas nas costas
 for(const s of [-1,1]){
  E('#dfae62',[s*.36,2.16,.18],[.4,.21,.32],[0,0,-s*.55]);E('#e9bd6a',[s*.6,1.95,.16],[.24,.36,.3],[0,0,-s*.25]); // franja ondulada
  E('#d9a455',[s*.78,1.25,-.02],[.3,.85,.4]);                                               // massa lateral
  for(let k=0;k<6;k++){const y=1.68-k*.2,x=.76+.04*Math.sin(k*1.7);E(k%2?'#ecc277':'#dfae62',[s*x,y,.1],[.24,.13,.22],[0,0,s*(k%2?.4:-.4)])} // ondas
  E('#ecc277',[s*.8,.42,.06],[.2,.14,.2]);
 }
 // vestido: colo, colar, saia rodada, sapatos com tira
 mark(E(skin,[0,1.1,.2],[.3,.22,.2]));
 for(const k of [-2,-1,0,1,2])mark(E(gold,[k*.055,.99+.012*k*k,.37],[.02,.02,.02]));mark(E(gold,[0,.92,.38],[.035,.045,.02]));
 C(red,.34,.68,.44,[0,.52,0]);C('#bd1c24',.69,.73,.1,[0,.3,0]);
 for(const s of [-1,1]){
  sphere(legs[(s+1)/2],'#d2232a',[s*.04,-.27,.17],[.2,.13,.26]);
  const strap=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,8,18),mat('#c11d25'));strap.rotation.x=Math.PI/2;strap.position.set(s*.04,-.17,.05);strap.userData.noOutline=true;legs[(s+1)/2].add(strap);
 }
}
function makeCharacter(type,color,accent){
 const root=new THREE.Group(),rig=new THREE.Group();root.add(rig);
 const mark=m=>{m.userData.noOutline=true;return m};
 const human=type==='fabola'||type==='luana';   // têm modelos próprios (buildFabola/buildLuana)
 const put=(c,p,sc)=>sphere(rig,c,p,sc);
 const skin=type==='fabola'?'#f3b890':type==='luana'?'#f7cba4':'#ffe9cf';
 const headColor=['monkey','dragon','fox','frog'].includes(type)?color:type==='panda'?'#fbf8f2':type==='astronaut'?'#efe9df':skin;
 const handCol=type==='panda'||type==='frog'?color:type==='fox'?'#5a301c':accent;
 const footCol=type==='fabola'?'#1d1816':type==='luana'?'#d2232a':handCol;
 const armCol=type==='luana'?skin:color,legCol=type==='luana'?skin:color;
 // olhos grandes, pretos e brilhantes (usados por vários personagens)
 const bigEyes=(y,z,sx=.19,k=1)=>{for(const s of [-1,1]){
  mark(put('#1a1018',[s*sx,y,z],[.095*k,.125*k,.07]));
  mark(put('#ffffff',[s*sx+.03,y+.04*k,z+.055],[.032,.04,.02]));
  mark(put('#ffffff',[s*sx-.03,y-.04*k,z+.053],[.016,.02,.012]));
 }};

 sphere(rig,color,[0,.83,0],[.48,.59,.34]);
 if(type==='panda'||type==='fox'||type==='dragon'||type==='frog')mark(sphere(rig,accent,[0,.82,.28],type==='panda'?[.37,.46,.14]:[.32,.4,.12])); // barriga grande
 else if(type==='monkey')sphere(rig,accent,[0,.85,.305],[.3,.36,.09]);
 if(!human)put(headColor,[0,1.48,0],[.52,.49,.45]);
 // sorriso (alguns personagens têm o próprio)
 const smilePos={monkey:[1.3,.5],dragon:[1.3,.5],fox:[1.3,.5],frog:[1.3,.5],panda:[1.3,.421],luana:[1.31,.435]}[type]||[1.32,.421];
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,20,Math.PI),mat('#573049'));smile.position.set(0,smilePos[0],smilePos[1]);smile.rotation.z=Math.PI;rig.add(smile);
 if(type==='astronaut'||human)smile.visible=false;

 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.05,0);rig.add(arm);
  limb(arm,armCol,[0,0,0],[side*.18,-.3,.12],.13,.11);
  sphere(arm,handCol,[side*.18,-.31,.12],[.14,.13,.14]);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.22,.38,0);rig.add(leg);
  limb(leg,legCol,[0,0,0],[side*.04,-.25,.06],.15,.12);
  sphere(leg,footCol,[side*.04,-.28,.12],[.17,.11,.21]);
  if(type==='monkey'||type==='dragon'||type==='frog')for(const dx of [-.075,0,.075])sphere(leg,footCol,[side*.04+dx,-.29,.315],[.055,.05,.055]); // dedinhos
  if(type==='panda')for(const dx of [-.06,0,.06])sphere(leg,'#ece8df',[side*.04+dx,-.3,.325],[.026,.026,.032]); // garrinhas
  legs.push(leg);
 }

 if(type==='fox'){
  mark(sphere(rig,'#ffe6bf',[0,1.38,.18],[.45,.30,.30]));
  bigEyes(1.50,.455);
  for(const s of [-1,1]){
   mark(sphere(rig,'#ffe6bf',[s*.40,1.36,.05],[.15,.11,.14]));
   sphere(rig,color,[s*.3,2.02,0],[.17,.34,.1]).rotation.z=-s*.35;
   const tip=mark(sphere(rig,'#5a301c',[s*.4,2.27,0],[.11,.12,.08]));tip.rotation.z=-s*.35;
   const inn=mark(sphere(rig,'#ffe6bf',[s*.31,2.0,.06],[.1,.24,.05]));inn.rotation.z=-s*.35;
  }
  mark(sphere(rig,'#6b3a23',[0,1.40,.485],[.06,.04,.04]));
  sphere(rig,color,[0,.72,-.42],[.24,.24,.4]).rotation.x=.5;
  sphere(rig,color,[0,.98,-.6],[.22,.22,.32]).rotation.x=.9;
  mark(sphere(rig,'#ffe6bf',[0,1.22,-.72],[.17,.17,.22]));
 }
 if(type==='frog'){
  const cream='#f7e2b0';
  mark(sphere(rig,cream,[0,1.33,.14],[.5,.24,.34]));                                   // boca/queixo creme
  for(const x of [-.09,.09])mark(sphere(rig,'#2a7a38',[x,1.6,.43],[.022,.028,.02]));   // narinas
  for(const s of [-1,1]){
   sphere(rig,color,[s*.27,1.8,.05],[.25,.25,.23]);                                    // bolha do olho
   mark(sphere(rig,cream,[s*.27,1.8,.17],[.19,.19,.15]));                              // parte clara
   mark(sphere(rig,'#1a1018',[s*.27,1.79,.3],[.11,.13,.06]));                          // pupila
   mark(sphere(rig,'#ffffff',[s*.27+.04,1.84,.345],[.035,.04,.02]));
   mark(sphere(rig,'#ffffff',[s*.27-.04,1.74,.34],[.016,.02,.012]));
  }
 }
 if(type==='panda'){
  for(const s of [-1,1]){
   sphere(rig,'#1d1822',[s*.37,1.8,0],[.17,.17,.1]);
   mark(sphere(rig,'#3a3440',[s*.37,1.8,.07],[.105,.105,.05]));
   const patch=mark(sphere(rig,'#1d1822',[s*.21,1.52,.38],[.15,.19,.08]));patch.rotation.z=-s*.4;
   mark(sphere(rig,'#ffffff',[s*.19,1.53,.455],[.075,.09,.045]));
   mark(sphere(rig,'#14101a',[s*.19,1.52,.49],[.045,.06,.03]));
   mark(sphere(rig,'#ffffff',[s*.19+.016,1.545,.515],[.016,.02,.01]));
  }
  mark(sphere(rig,'#1a161d',[0,1.4,.445],[.075,.05,.05]));
 }
 if(type==='monkey'){
  mark(sphere(rig,'#ffe3b3',[0,1.40,.16],[.40,.34,.33]));
  bigEyes(1.50,.455);
  for(const s of [-1,1]){
   sphere(rig,color,[s*.56,1.56,-.03],[.19,.21,.1]).rotation.y=s*.5;
   sphere(rig,'#ffd9a0',[s*.585,1.56,.04],[.145,.165,.07]).rotation.y=s*.5;
  }
  for(let k=0;k<9;k++){const t=k/8,r=.085-.02*t;sphere(rig,color,[.34*Math.sin(t*2.9),.55+.8*t-.12*t*t,-.3-.12*Math.sin(t*3)],[r,r,r])}
 }
 if(type==='dragon'){
  const dark='#2f8a3a',tan='#f0c56a';
  mark(sphere(rig,accent,[0,1.40,.17],[.43,.36,.32]));
  bigEyes(1.50,.455);
  for(const s of [-1,1]){
   const horn=mark(sphere(rig,accent,[s*.3,2.04,.02],[.09,.2,.09]));horn.rotation.z=-s*.4;
   const fin=mark(sphere(rig,color,[s*.56,1.55,-.03],[.14,.2,.08]));fin.rotation.y=s*.5;
   const mem=mark(sphere(rig,tan,[s*.6,1.55,.02],[.1,.15,.05]));mem.rotation.y=s*.5;
   const wing=mark(sphere(rig,tan,[s*.5,1.02,-.4],[.32,.26,.04]));wing.rotation.z=-s*.45;wing.rotation.y=-s*.35;
   const bone=mark(sphere(rig,color,[s*.38,1.25,-.36],[.3,.06,.06]));bone.rotation.z=-s*.45;
   mark(sphere(rig,dark,[s*.13,2.0,-.16],[.09,.12,.09]));
  }
  for(let k=0;k<9;k++){
   const t=k/8,r=.14-.08*t,y=.5+.5*t*t+.1*t,x=.3*Math.sin(t*2.4),z=-.32-.38*t;
   sphere(rig,color,[x,y,z],[r,r,r]);
   if(k===2||k===4||k===6)mark(sphere(rig,dark,[x,y+r*.9,z],[.05,.06,.05]));
  }
 }
 if(type==='astronaut'){
  const blue='#2f63d8',cream='#efe9df';
  sphere(rig,cream,[0,1.5,-.01],[.6,.56,.52]);                                          // capacete
  mark(sphere(rig,'#d7d0c2',[0,1.5,.27],[.47,.38,.3]));                                 // aro do visor
  mark(sphere(rig,'#141a45',[0,1.5,.3],[.43,.34,.28]));                                 // visor escuro
  mark(sphere(rig,blue,[0,2.04,-.02],[.09,.04,.42]));                                   // faixa azul no topo
  for(const s of [-1,1]){
   mark(sphere(rig,'#07050c',[s*.17,1.5,.535],[.09,.125,.06]));                         // olhos dentro do visor
   mark(sphere(rig,'#ffffff',[s*.17+.03,1.55,.585],[.03,.04,.018]));
   mark(sphere(rig,'#ffffff',[s*.17-.03,1.46,.58],[.015,.02,.01]));
   sphere(rig,cream,[s*.6,1.5,0],[.13,.2,.2]);                                          // fones
   mark(sphere(rig,blue,[s*.69,1.5,0],[.05,.15,.15]));
   mark(sphere(rig,'#5bd7ff',[s*.72,1.5,0],[.022,.1,.1]));
   mark(sphere(rig,blue,[s*.3,.85,-.34],[.07,.08,.04]));                                // detalhe da mochila
   const i=(s+1)/2;
   mark(sphere(arms[i],blue,[s*.09,-.15,.06],[.15,.05,.15]));                           // listras dos braços
   mark(sphere(legs[i],blue,[s*.02,-.14,.03],[.17,.05,.17]));                           // listras das pernas
   mark(sphere(legs[i],blue,[s*.04,-.345,.12],[.18,.045,.22]));                         // sola azul das botas
  }
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.26,.05,10,24),mat(blue));collar.position.set(0,1.16,0);collar.rotation.x=Math.PI/2;collar.userData.noOutline=true;rig.add(collar);
  mark(sphere(rig,'#e8e1d4',[0,.95,.3],[.2,.15,.08]));                                  // painel do peito
  mark(sphere(rig,'#2b8cff',[-.07,.97,.37],[.055,.055,.025]));
  mark(sphere(rig,'#ff9a2b',[.08,.99,.37],[.04,.02,.02]));
  mark(sphere(rig,'#e8423a',[.08,.92,.37],[.04,.02,.02]));
  mark(sphere(rig,'#8b8d93',[0,.82,.33],[.08,.04,.03]));
  sphere(rig,'#e5ded2',[0,.95,-.34],[.3,.38,.16]);                                      // mochila
 }
 if(type==='fabola')buildFabola(rig,arms,legs,mark,root);
 if(type==='luana')buildLuana(rig,arms,legs,mark,root,color);
 return {root,rig,arms,legs,body:null,phase:Math.random()*6,finished:false,throwAt:0,type};
}
const specs=[
 {name:'ASTRONAUTA',type:'astronaut',color:'#efe9df',accent:'#f1ece2',angle:-Math.PI/2},
 {name:'RAPOSA',type:'fox',color:'#f4721f',accent:'#ffe6bf',angle:-Math.PI/2+Math.PI*2/8},
 {name:'SAPO',type:'frog',color:'#55bd3f',accent:'#f7e2b0',angle:-Math.PI/2+Math.PI*4/8},
 {name:'PANDA',type:'panda',color:'#26222c',accent:'#fbf8f2',angle:-Math.PI/2+Math.PI*6/8},
 {name:'MACACO',type:'monkey',color:'#a8683f',accent:'#ffe0ad',angle:-Math.PI/2+Math.PI*8/8},
 {name:'DRAGÃO',type:'dragon',color:'#58b043',accent:'#f6e2b0',angle:-Math.PI/2+Math.PI*10/8},
 {name:'FABOLA',type:'fabola',color:'#2a2220',accent:'#f2c29b',angle:-Math.PI/2+Math.PI*12/8},
 {name:'LUANA',type:'luana',color:'#d6212a',accent:'#f5cba2',angle:-Math.PI/2+Math.PI*14/8}
];
const players=specs.map((s,i)=>{const c=makeCharacter(s.type,s.color,s.accent);c.name=s.name;c.count=0;c.delay=[0,195,235,270,220,250,210,240][i];c.angle=s.angle;c.root.position.set(Math.cos(s.angle)*5.2,0,Math.sin(s.angle)*4.5);c.root.rotation.y=Math.atan2(-c.root.position.x,-c.root.position.z);scene.add(c.root);return c});
