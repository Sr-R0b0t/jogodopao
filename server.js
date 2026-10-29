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
const SLOTS=6,CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
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
function lobby(room){
 const names=room.slots.map(s=>s?s.name:null);
 room.slots.forEach(s=>s&&send(s.ws,{t:'lobby',names,host:room.host.slot}));
}
function leave(ws){
 const room=ws.room;if(!room)return;ws.room=null;
 if(room.host===ws){
  room.slots.forEach(s=>s&&s.ws!==ws&&(send(s.ws,{t:'closed'}),s.ws.room=null));
  rooms.delete(room.code);return;
 }
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
    const r={code:newCode(),host:ws,slots:Array(SLOTS).fill(null),started:false};
    rooms.set(r.code,r);
    const slot=takeSlot(r,ws,cleanName(m.name),m.pref);
    send(ws,{t:'joined',code:r.code,slot,host:true});lobby(r);break;
   }
   case 'join':{
    if(room)leave(ws);
    const r=rooms.get(String(m.code||'').toUpperCase().trim());
    if(!r)return send(ws,{t:'err',m:'Sala não encontrada. Confira o código.'});
    if(r.started)return send(ws,{t:'err',m:'Essa partida já começou.'});
    const slot=takeSlot(r,ws,cleanName(m.name),m.pref);
    if(slot<0)return send(ws,{t:'err',m:'Sala cheia (6 jogadores).'});
    send(ws,{t:'joined',code:r.code,slot,host:false});lobby(r);break;
   }
   case 'relay': // jogador -> anfitrião
    if(room&&room.host!==ws)send(room.host,{t:'in',slot:ws.slot,d:m.d});break;
   case 'bc': // anfitrião -> todos os outros
    if(room&&room.host===ws)room.slots.forEach(s=>s&&s.ws!==ws&&send(s.ws,{t:'s',d:m.d}));break;
   case 'pick':{ // trocar de personagem enquanto está no lobby
    if(!room||room.started)return;
    const n=m.slot;
    if(!Number.isInteger(n)||n<0||n>=SLOTS)return;
    if(room.slots[n])return send(ws,{t:'pickfail'});
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
