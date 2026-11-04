/* Servidor do Jogo do Pão: serve os arquivos do jogo e faz a ponte (WebSocket) entre os jogadores.
   Uso:  npm install  →  npm start   (porta 3000, ou a variável PORT) */
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');
const {WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,ROOT=__dirname;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
const PRIVATE=/(^|\/)(server\.js|package(-lock)?\.json|node_modules|README\.md)(\/|$)/;

const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent((req.url||'/').split('?')[0])}catch(e){res.writeHead(400);return res.end()}
 if(url==='/')url='/index.html';
 if(url==='/health'){res.writeHead(200);return res.end('ok')}
 const file=path.normalize(path.join(ROOT,url));
 if(!file.startsWith(ROOT+path.sep)||PRIVATE.test(url)){res.writeHead(404);return res.end('Not found')}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(data);
 });
});

/* ---------- Salas ---------- */
const wss=new WebSocketServer({server,maxPayload:64*1024});
const rooms=new Map(); // código -> {code,host,slots:[{ws,name}|null ×5],started}
const SLOTS=12,MAX_HUMANS=8, // SLOTS = nº de personagens; no máximo 8 pessoas por sala
CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(){let c;do{c=Array.from({length:5},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join('')}while(rooms.has(c));return c}
const send=(ws,o)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
const cleanName=n=>String(n||'').replace(/[<>&"']/g,'').trim().slice(0,12)||'Jogador';
function uniqueName(room,name){
 const used=new Set(room.slots.filter(Boolean).map(s=>s.name));let n=name,k=2;
 while(used.has(n))n=name.slice(0,10)+' '+k++;return n;
}
function takeSlot(room,ws,name,pref){
 name=uniqueName(room,name);
 let slot=Number.isInteger(pref)&&pref>=0&&pref<SLOTS&&!room.slots[pref]?pref:room.slots.findIndex(s=>!s);
 if(slot<0)return -1;
 room.slots[slot]={ws,name};ws.room=room;ws.slot=slot;return slot;
}
function pickVip(room){ // VIP = celular que pode iniciar partida/avançar rodadas na TV
 const v=room.vip;
 if(v&&room.slots[v.slot]&&room.slots[v.slot].ws===v)return;
 const s=room.slots.find(x=>x&&x.ws&&x.ws.ctrl);room.vip=s?s.ws:null;
}
function lobby(room){
 const names=room.slots.map(s=>s?s.name:null);
 if(room.tv)pickVip(room);
 const m={t:'lobby',names,host:room.tv?-1:room.host.slot,vip:room.vip?room.vip.slot:-1,tv:!!room.tv,started:!!room.started};
 room.slots.forEach(s=>s&&send(s.ws,m));
 if(room.tv)send(room.host,m);
}
function leave(ws){
 const room=ws.room;if(!room)return;ws.room=null;
 if(room.host===ws){
  room.slots.forEach(s=>s&&s.ws&&s.ws!==ws&&(send(s.ws,{t:'closed'}),s.ws.room=null));
  rooms.delete(room.code);return;
 }
 if(!room.slots[ws.slot]||room.slots[ws.slot].ws!==ws)return;
 room.slots[ws.slot]=null;
 send(room.host,{t:'left',slot:ws.slot});lobby(room);
}

wss.on('connection',ws=>{
 if(ws._socket)ws._socket.setNoDelay(true);
 ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw)}catch(e){return}
  if(!m||typeof m.t!=='string')return;
  const room=ws.room;
  switch(m.t){
   case 'create':{
    if(room)leave(ws);
    const r={code:newCode(),host:ws,slots:Array(SLOTS).fill(null),started:false,tv:!!m.tv,vip:null};
    rooms.set(r.code,r);
    let slot=-1;
    if(r.tv){ws.room=r;ws.slot=-1} // TV: anfitrião sem personagem; os celulares são os jogadores
    else slot=takeSlot(r,ws,cleanName(m.name),m.pref);
    send(ws,{t:'joined',code:r.code,slot,host:true,tv:r.tv});lobby(r);break;
   }
   case 'join':{
    if(room)leave(ws);
    const r=rooms.get(String(m.code||'').toUpperCase().trim());
    if(!r)return send(ws,{t:'err',m:'Sala não encontrada. Confira o código.'});
    const rejoin=r.tv&&Number.isInteger(m.pref)&&m.pref>=0&&m.pref<SLOTS&&!r.slots[m.pref]; // celular que caiu e volta no mesmo personagem
    if(r.started&&!rejoin)return send(ws,{t:'err',m:'Essa partida já começou.'});
    if(r.slots.filter(Boolean).length>=MAX_HUMANS&&!rejoin)return send(ws,{t:'err',m:'Sala cheia (8 jogadores).'});
    if(m.ctrl)ws.ctrl=true;
    const slot=r.started?(rejoin?takeSlot(r,ws,cleanName(m.name),m.pref):-1):takeSlot(r,ws,cleanName(m.name),m.pref);
    if(slot<0)return send(ws,{t:'err',m:'Sala cheia (8 jogadores).'});
    send(ws,{t:'joined',code:r.code,slot,host:false,tv:!!r.tv});lobby(r);break;
   }
   case 'relay': // jogador -> anfitrião
    if(room&&room.host!==ws)send(room.host,{t:'in',slot:ws.slot,d:m.d});break;
   case 'bc': // anfitrião -> todos os outros
    if(room&&room.host===ws)room.slots.forEach(s=>s&&s.ws&&s.ws!==ws&&!s.ws.ctrl&&send(s.ws,{t:'s',d:m.d}));break;
   case 'cc': // anfitrião (TV) -> celulares-controle (todos, ou só o do slot indicado)
    if(room&&room.host===ws)room.slots.forEach((s,i)=>s&&s.ws&&s.ws.ctrl&&(m.slot===undefined||m.slot===i)&&send(s.ws,{t:'c',d:m.d}));break;
   case 'local': // TV: reserva uma vaga para um controle (gamepad) ligado na própria TV
    if(room&&room.host===ws&&room.tv&&Number.isInteger(m.slot)&&m.slot>=0&&m.slot<SLOTS&&!room.slots[m.slot]){
     if(Number.isInteger(m.from)&&room.slots[m.from]&&room.slots[m.from].local)room.slots[m.from]=null;
     room.slots[m.slot]={ws:null,name:uniqueName(room,cleanName(m.name)),local:true};lobby(room);
    }break;
   case 'unlocal':
    if(room&&room.host===ws&&room.tv&&room.slots[m.slot]&&room.slots[m.slot].local){room.slots[m.slot]=null;lobby(room)}break;
   case 'pick':{ // trocar de personagem enquanto está no lobby
    if(!room||room.started)return;
    const n=m.slot;
    if(!Number.isInteger(n)||n<0||n>=SLOTS)return;
    if(room.slots[n])return send(ws,{t:'pickfail'});
    if(!room.slots[ws.slot]||room.slots[ws.slot].ws!==ws)return;
    room.slots[n]=room.slots[ws.slot];room.slots[ws.slot]=null;ws.slot=n;
    send(ws,{t:'slot',slot:n});lobby(room);break;
   }
   case 'lock':
    if(room&&room.host===ws)room.started=true;break;
  }
 });
 ws.on('close',()=>leave(ws));
 ws.on('error',()=>{});
});
setInterval(()=>wss.clients.forEach(ws=>{if(!ws.isAlive)return ws.terminate();ws.isAlive=false;ws.ping()}),30000);

server.listen(PORT,'0.0.0.0',()=>{
 console.log('\n🍞 Jogo do Pão rodando!\n');
 console.log('  Neste computador:  http://localhost:'+PORT);
 Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal)
  .forEach(i=>console.log('  Na sua rede (Wi-Fi): http://'+i.address+':'+PORT));
 console.log('');
});
