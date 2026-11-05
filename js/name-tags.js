/* Nomes sobre os personagens no modo online (o nome que cada jogador digitou). O seu personagem já tem a seta "VOCÊ";
   na TV os nomes ficam na silhueta colorida (self-marker.js). Bots não têm nome na sala, então ficam sem etiqueta. */
const nameTagSprites=players.map(()=>({sp:null,key:''}));
function updateNameTags(){
 const on=net.role!=='offline'&&!net.tv&&typeof podiumActive!=='undefined'&&!podiumActive;
 players.forEach((p,i)=>{
  const T=nameTagSprites[i],nm=on&&i!==humanIndex&&isActive(i)&&p.root.visible?(net.names[i]||''):'';
  if(!nm){if(T.sp)T.sp.visible=false;return}
  const col=(typeof TV_COLORS!=='undefined'?TV_COLORS[i%TV_COLORS.length]:'#ffffff'),txt=nm.toUpperCase().slice(0,10),key=txt+col;
  if(T.key!==key){
   if(T.sp){scene.remove(T.sp);T.sp.material.map.dispose();T.sp.material.dispose();T.sp=null}
   const sp=makeSelfLabelSprite(txt,col,'#111');if(!sp)return;
   scene.add(sp);T.sp=sp;T.key=key;
  }
  const s=p.root.scale.y||1,sp=T.sp;sp.visible=true;
  sp.position.set(p.root.position.x,p.root.position.y+2.3*s+.55,p.root.position.z);
 });
}
