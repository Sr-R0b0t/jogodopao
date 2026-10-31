/* Personagens com modelo 3D animado (.glb, rig Mixamo). Hoje: Fabola.
   O modelo simples de esferas (characters.js) continua como reserva: ele só é escondido quando o .glb
   termina de carregar. Se o arquivo faltar ou falhar, o jogo segue normalmente com o modelo simples. */
const glbReady=[]; // promessas de carregamento (as miniaturas esperam por elas)
const GLB_CHARACTERS={
 fabola:{url:'models/fabola.glb',height:2.3,modelHeight:1.7,
  clips:{idle:'Idle_02',walk:'Walking',run:'Running',dance:'FunnyDancing_01',jump:'Jump_Over_Obstacle_2'},
  once:['jump'],markY:2.8}
};
const glbOutlineMat=new THREE.MeshBasicMaterial({color:0x62ff9a,side:THREE.BackSide,toneMapped:false});
glbOutlineMat.onBeforeCompile=sh=>{ // engorda o contorno ao longo das normais (funciona com o esqueleto)
 sh.vertexShader=sh.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\n transformed += normalize(objectNormal)*0.03;');
};

function setGlbState(p,state){
 const g=p.glb;if(!g||g.state===state||!g.actions[state])return;
 const next=g.actions[state],prev=g.actions[g.state];
 next.reset().play();
 if(prev)prev.crossFadeTo(next,.25,false);
 g.state=state;
}
function loadGlbCharacter(i){
 const cfg=GLB_CHARACTERS[specs[i].type],p=players[i];
 glbReady.push(new Promise(resolve=>{
  new GLTFLoader().load(cfg.url,gltf=>{
   try{
    const model=gltf.scene;model.scale.setScalar(cfg.height/cfg.modelHeight);
    let skinned=null;
    model.traverse(o=>{
     if(!o.isSkinnedMesh)return;
     o.material=new THREE.MeshStandardMaterial({map:o.material.map,roughness:.75,metalness:0});
     o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;skinned=o;
    });
    // as animações do Mixamo vêm "no lugar", exceto o pulo: removemos o deslocamento para frente/lados
    gltf.animations.forEach(c=>c.tracks.forEach(t=>{
     if(/Hips\.position$/.test(t.name)){const v=t.values;for(let k=0;k<v.length;k+=3){v[k]=v[0];v[k+2]=v[2]}}
    }));
    p.rig.visible=false;               // esconde o modelo simples de esferas
    p.root.add(model);
    const mixer=new THREE.AnimationMixer(model),actions={};
    for(const [state,name] of Object.entries(cfg.clips)){
     const clip=gltf.animations.find(c=>c.name===name);if(!clip)continue;
     const a=mixer.clipAction(clip);
     if(cfg.once.includes(state)){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}
     actions[state]=a;
    }
    p.glb={model,mixer,actions,state:'',lastX:0,lastZ:0,speed:0};
    setGlbState(p,'idle');
    // silhueta verde "VOCÊ"
    if(skinned){
     const om=new THREE.SkinnedMesh(skinned.geometry,glbOutlineMat);
     om.bind(skinned.skeleton,skinned.bindMatrix);om.frustumCulled=false;om.userData.isOutline=true;
     skinned.parent.add(om);
     const m=typeof selfMarkers!=='undefined'?selfMarkers[i]:null;
     if(m){m.outlines.push(om);om.visible=(humanIndex===i);m.baseY=cfg.markY}
     else om.visible=false;
    }
   }catch(e){console.warn('Erro ao montar o modelo 3D de',specs[i].name,e);p.rig.visible=true}
   resolve();
  },undefined,err=>{console.warn('Modelo .glb de',specs[i].name,'não carregou; usando o modelo simples.',err);resolve()});
 }));
}
/* Escolhe a animação conforme o que está acontecendo (chamado a cada frame pelo game.js). */
function animateGlbPlayer(p,i,dt){
 const g=p.glb;if(!g)return;
 const pos=p.root.position;
 g.speed=dt>0?Math.hypot(pos.x-g.lastX,pos.z-g.lastZ)/dt:0;g.lastX=pos.x;g.lastZ=pos.z;
 let state='idle';
 if(p.finished)state='dance';                                                   // terminou a corrida do pão
 else if(gameMode==='bread'&&running)state='run';                               // clicando = correndo
 else if(gameMode==='ball'&&running&&balls[i].alive&&g.speed>.6)state='walk';  // equilibrando na bola
 else if(gameMode==='ball'&&ended&&balls[i].alive)state='dance';                // venceu a batalha
 else if(gameMode==='bowling'&&bowlingBallState&&bowlingOrder[bowlingTurn]===i)state='jump'; // lançou a bola
 setGlbState(p,state);
 g.mixer.update(dt);
}
if(typeof GLTFLoader!=='undefined')specs.forEach((s,i)=>{if(GLB_CHARACTERS[s.type])loadGlbCharacter(i)});
