/* Marca o SEU personagem: silhueta verde em volta do corpo + seta "VOCÊ" flutuando acima.
   Cada jogador vê a marca no próprio boneco (humanIndex), inclusive no modo online. */
const SELF_COLOR=0x62ff9a;
const selfOutlineMat=new THREE.MeshBasicMaterial({color:SELF_COLOR,side:THREE.BackSide,toneMapped:false});
const selfArrowMat=new THREE.MeshBasicMaterial({color:SELF_COLOR,toneMapped:false});
function makeSelfLabelSprite(text,color,stroke){
 text=text||'';color=color||'#62ff9a';stroke=stroke||'#153221';
 try{
  const c=document.createElement('canvas');c.width=256;c.height=96;
  const g=c.getContext&&c.getContext('2d');if(!g)return null;
  g.font='900 '+(text.length>7?40:54)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=10;g.lineJoin='round';g.strokeStyle='#153221';g.strokeText(text,128,50);
  g.fillStyle=color;g.fillText(text,128,50);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sp.scale.set(text.length>7?1.9:1.5,.56,1);sp.renderOrder=10;return sp;
 }catch(e){return null}
}
const selfMarkers=players.map(p=>{
 // Silhueta: cópia "de dentro para fora" das partes grandes do corpo (cabeça, corpo, braços, pernas...).
 const parts=[];
 p.root.traverse(o=>{
  if(!o.isMesh||o.userData.isOutline||o.userData.noOutline||!o.geometry)return;
  const s=o.scale,big=Math.max(s.x,s.y,s.z)>=.15&&Math.min(s.x,s.y,s.z)>=.1;
  if(o.geometry.type==='CylinderGeometry'||(o.geometry.type==='SphereGeometry'&&big))parts.push(o);
 });
 const outlines=parts.map(o=>{
  const m=new THREE.Mesh(o.geometry,selfOutlineMat);
  m.scale.setScalar(1.14);m.userData.isOutline=true;m.visible=false;o.add(m);return m;
 });
 const so=p.root.userData.spriteOutline;if(so)outlines.push(so); // sprites têm contorno pronto
 // Seta que balança acima da cabeça.
 const arrow=new THREE.Group();arrow.userData.isSelfMark=true;arrow.visible=false;
 const cone=new THREE.Mesh(new THREE.ConeGeometry(.24,.45,16),selfArrowMat);cone.rotation.x=Math.PI;arrow.add(cone);
 const label=makeSelfLabelSprite();if(label){label.position.y=.62;arrow.add(label)}
 const baseY=p.root.userData.markY||2.35;arrow.position.y=baseY;p.root.add(arrow);
 return {outlines,arrow,cone,label,baseY,tvStyled:false,setVisible(v){outlines.forEach(m=>m.visible=v);arrow.visible=v}};
});
let selfMarkerFor=-1;
/* Modo TV: todos os jogadores humanos ficam no mesmo ambiente, então cada um ganha silhueta/seta com a sua cor e nome. */
function styleMarkerTV(i,m){
 const col=tvColor(i),name=(players[i].name||'').toUpperCase().slice(0,10);
 m.outlines.forEach(o=>{
  if(!o.userData.own){o.material=o.material.clone();o.userData.own=true}
  if(o.userData.col!==col){o.userData.col=col;o.material.color.set(col)}
 });
 if(!m.coneOwn){m.cone.material=m.cone.material.clone();m.coneOwn=true}
 m.cone.material.color.set(col);
 if(m.tvLabel!==name+col){
  m.tvLabel=name+col;
  const sp=makeSelfLabelSprite(name,col,'#111');
  if(sp){if(m.label)m.arrow.remove(m.label);sp.position.y=.62;m.arrow.add(sp);m.label=sp}
 }
 m.tvStyled=true;
}
function restoreMarkerNormal(m){
 m.outlines.forEach(o=>{if(o.userData.own){o.material.color.set(SELF_COLOR);o.userData.col=''}});
 if(m.coneOwn)m.cone.material.color.set(SELF_COLOR);
 const sp=makeSelfLabelSprite();if(sp){if(m.label)m.arrow.remove(m.label);sp.position.y=.62;m.arrow.add(sp);m.label=sp}
 m.tvStyled=false;m.tvLabel='';
}
function updateSelfMarker(t){
 if(net.tv){
  selfMarkerFor=-2;
  selfMarkers.forEach((m,i)=>{
   const on=net.humans.has(i)&&tournamentCharacterLocked;
   m.setVisible(on);
   if(on){styleMarkerTV(i,m);m.arrow.position.y=m.baseY+Math.sin(t*4+i)*.12}
  });
  return;
 }
 if(selfMarkerFor===-2){selfMarkers.forEach(m=>{if(m.tvStyled)restoreMarkerNormal(m)});selfMarkerFor=-1}
 if(selfMarkerFor!==humanIndex){
  selfMarkers.forEach((m,i)=>m.setVisible(i===humanIndex));
  selfMarkerFor=humanIndex;
 }
 const m=selfMarkers[humanIndex];
 if(m)m.arrow.position.y=m.baseY+Math.sin(t*4)*.12;
}
