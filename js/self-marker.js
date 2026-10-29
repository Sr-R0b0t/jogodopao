/* Marca o SEU personagem: silhueta verde em volta do corpo + seta "VOCÊ" flutuando acima.
   Cada jogador vê a marca no próprio boneco (humanIndex), inclusive no modo online. */
const SELF_COLOR=0x62ff9a;
const selfOutlineMat=new THREE.MeshBasicMaterial({color:SELF_COLOR,side:THREE.BackSide,toneMapped:false});
const selfArrowMat=new THREE.MeshBasicMaterial({color:SELF_COLOR,toneMapped:false});
function makeSelfLabelSprite(){
 try{
  const c=document.createElement('canvas');c.width=256;c.height=96;
  const g=c.getContext&&c.getContext('2d');if(!g)return null;
  g.font='900 54px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=10;g.lineJoin='round';g.strokeStyle='#153221';g.strokeText('',128,50);
  g.fillStyle='#62ff9a';g.fillText('',128,50);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sp.scale.set(1.5,.56,1);sp.renderOrder=10;return sp;
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
 // Seta que balança acima da cabeça.
 const arrow=new THREE.Group();arrow.userData.isSelfMark=true;arrow.visible=false;
 const cone=new THREE.Mesh(new THREE.ConeGeometry(.24,.45,16),selfArrowMat);cone.rotation.x=Math.PI;arrow.add(cone);
 const label=makeSelfLabelSprite();if(label){label.position.y=.62;arrow.add(label)}
 arrow.position.y=2.35;p.root.add(arrow);
 return {outlines,arrow,setVisible(v){outlines.forEach(m=>m.visible=v);arrow.visible=v}};
});
let selfMarkerFor=-1;
function updateSelfMarker(t){
 if(selfMarkerFor!==humanIndex){
  selfMarkers.forEach((m,i)=>m.setVisible(i===humanIndex));
  selfMarkerFor=humanIndex;
 }
 const m=selfMarkers[humanIndex];
 if(m)m.arrow.position.y=2.35+Math.sin(t*4)*.12;
}
