/* Conexão direta (WebRTC) entre o anfitrião e cada convidado do modo online comum: menos atraso que passar pelo servidor.
   O servidor só faz a "apresentação" (ofertas/respostas); se a conexão direta não abrir (ex.: alguns 4G), tudo continua pelo servidor.
   - 'ev' (confiável): comandos do convidado -> anfitrião. - 'sn' (sem retransmissão): fotos do jogo anfitrião -> convidado. */
const P2P_ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
const p2pH={};                                   // anfitrião: vaga -> {pc,ev,sn,q,rd}
const p2pC={pc:null,ev:null,sn:null,q:[],rd:false,lastSnap:0,opened:0};
/* ---------- ANFITRIÃO ---------- */
function p2pHostClose(slot){const P=p2pH[slot];if(!P)return;try{P.ev&&P.ev.close()}catch(e){}try{P.sn&&P.sn.close()}catch(e){}try{P.pc.close()}catch(e){}delete p2pH[slot]}
function p2pHostSignal(slot,d){
 if(!window.RTCPeerConnection||net.role!=='host'||net.tv)return;
 let P=p2pH[slot];
 if(d.t==='offer'){
  p2pHostClose(slot);
  let pc;try{pc=new RTCPeerConnection(P2P_ICE)}catch(e){return}
  P=p2pH[slot]={pc,ev:null,sn:null,q:[],rd:false};
  pc.onicecandidate=e=>{if(e.candidate&&p2pH[slot]===P)netBroadcast({k:'rtc',to:slot,t:'ice',c:e.candidate.toJSON()})};
  pc.ondatachannel=e=>{
   const ch=e.channel;
   if(ch.label==='ev'){P.ev=ch;ch.onmessage=ev=>{try{const m=JSON.parse(ev.data);if(m.k==='png'){ch.send(JSON.stringify({k:'pong',ts:m.ts}));return}netHostInput(slot,m)}catch(_){}}}
   else if(ch.label==='sn')P.sn=ch;
  };
  pc.setRemoteDescription({type:'offer',sdp:d.sdp}).then(()=>{P.rd=true;P.q.forEach(c=>pc.addIceCandidate(c).catch(()=>{}));P.q=[];return pc.createAnswer()})
   .then(a=>pc.setLocalDescription(a)).then(()=>{if(p2pH[slot]===P)netBroadcast({k:'rtc',to:slot,t:'answer',sdp:pc.localDescription.sdp})}).catch(()=>{});
 }else if(d.t==='ice'&&P&&d.c){
  if(P.rd)P.pc.addIceCandidate(d.c).catch(()=>{});else P.q.push(d.c);
 }
}
const p2pHostOpen=()=>Object.keys(p2pH).some(k=>p2pH[k].sn&&p2pH[k].sn.readyState==='open');
function p2pHostSend(S){
 const slots=Object.keys(p2pH);if(!slots.length)return;
 const s=JSON.stringify(S);
 slots.forEach(k=>{const ch=p2pH[k].sn;if(ch&&ch.readyState==='open'&&ch.bufferedAmount<65536){try{ch.send(s)}catch(e){}}});
}
/* ---------- CONVIDADO ---------- */
function p2pClientClose(){try{p2pC.ev&&p2pC.ev.close()}catch(e){}try{p2pC.sn&&p2pC.sn.close()}catch(e){}try{p2pC.pc&&p2pC.pc.close()}catch(e){}p2pC.pc=p2pC.ev=p2pC.sn=null;p2pC.q=[];p2pC.rd=false;p2pC.lastSnap=0}
function p2pClientStart(){
 p2pClientClose();
 if(!window.RTCPeerConnection||net.role!=='client'||new URLSearchParams(location.search).get('p2p')==='0')return;
 let pc;try{pc=p2pC.pc=new RTCPeerConnection(P2P_ICE)}catch(e){return}
 p2pC.ev=pc.createDataChannel('ev',{ordered:true});
 p2pC.sn=pc.createDataChannel('sn',{ordered:false,maxRetransmits:0});
 p2pC.sn.onmessage=e=>{if(p2pC.pc!==pc)return;try{const S=JSON.parse(e.data);p2pC.lastSnap=performance.now();if(S.k==='snap')netApplySnap(S)}catch(_){}};
 pc.onicecandidate=e=>{if(e.candidate&&p2pC.pc===pc)netSendRaw({t:'relay',d:{k:'rtc',t:'ice',c:e.candidate.toJSON()}})};
 pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>{if(p2pC.pc===pc)netSendRaw({t:'relay',d:{k:'rtc',t:'offer',sdp:pc.localDescription.sdp}})}).catch(()=>{});
}
function p2pClientSignal(d){
 const pc=p2pC.pc;if(!pc)return;
 if(d.t==='answer'){pc.setRemoteDescription({type:'answer',sdp:d.sdp}).then(()=>{p2pC.rd=true;p2pC.q.forEach(c=>pc.addIceCandidate(c).catch(()=>{}));p2pC.q=[]}).catch(()=>{})}
 else if(d.t==='ice'&&d.c){if(p2pC.rd)pc.addIceCandidate(d.c).catch(()=>{});else p2pC.q.push(d.c)}
}
const p2pFresh=()=>p2pC.lastSnap>0&&performance.now()-p2pC.lastSnap<700;     // chegando fotos pelo canal direto
function p2pClientSend(d){
 const ch=p2pC.ev;
 if(ch&&ch.readyState==='open'&&p2pC.lastSnap>0&&performance.now()-p2pC.lastSnap<2500){try{ch.send(JSON.stringify(d));return true}catch(e){}}
 return false;
}
function p2pReset(){p2pClientClose();Object.keys(p2pH).forEach(k=>p2pHostClose(k))}
