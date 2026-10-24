// Operação Meia-Vida: servidor do jogo (sem dependências, só Node.js 18+)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_SALA = 300;
const arquivo = [path.join(__dirname, 'index.html'), path.join(__dirname, 'public', 'index.html')].find((f) => fs.existsSync(f));
const page = fs.readFileSync(arquivo);

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health') { res.writeHead(200); res.end('ok'); return; }
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(page);
    return;
  }
  res.writeHead(404); res.end('Não encontrado');
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (req.url.split('?')[0] !== '/ws' || !key) { socket.destroy(); return; }
  const acc = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  socket.setNoDelay(true);
  novo(socket);
});

// ---------- WebSocket mínimo ----------
function frame(op, buf) {
  const len = buf.length;
  let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, buf]);
}
function enviar(c, obj) {
  if (!c.socket.destroyed && c.socket.writable) c.socket.write(frame(1, Buffer.from(JSON.stringify(obj))));
}
function fechar(c) {
  if (c.fechado) return;
  c.fechado = true;
  try { c.socket.write(frame(8, Buffer.alloc(0))); } catch (e) {}
  c.socket.destroy();
  if (c.sala) {
    const set = salas.get(c.sala);
    if (set) { set.delete(c); if (!set.size) salas.delete(c.sala); }
    para_todos(c, { t: 'l', id: c.id });
  }
}

// ---------- Jogo ----------
const salas = new Map();
let proximoId = 1;
const limpa = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, n);
const num = (v, a, b, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };

function para_todos(de, obj) {
  const set = salas.get(de.sala);
  if (!set) return;
  for (const c of set) if (c !== de) enviar(c, obj);
}
const publico = (c) => ({ id: c.id, n: c.n, c: c.c, k: c.k, tx: c.tx, ty: c.ty, s: c.s });

function novo(socket) {
  const c = { socket, id: proximoId++, buf: Buffer.alloc(0), frag: Buffer.alloc(0), alive: true, sala: null, s: 0, ultimoChat: 0 };
  socket.on('data', (d) => { c.alive = true; dados(c, d); });
  socket.on('error', () => fechar(c));
  socket.on('close', () => fechar(c));
  socket.on('end', () => fechar(c));
}

function dados(c, chunk) {
  c.buf = Buffer.concat([c.buf, chunk]);
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const fin = !!(b[0] & 0x80), op = b[0] & 0x0f, mascara = !!(b[1] & 0x80);
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; const g = b.readBigUInt64BE(2); if (g > 4096n) { fechar(c); return; } len = Number(g); off = 10; }
    if (!mascara || len > 4096) { fechar(c); return; }
    if (b.length < off + 4 + len) return;
    const m = b.subarray(off, off + 4);
    const d = Buffer.from(b.subarray(off + 4, off + 4 + len));
    for (let i = 0; i < len; i++) d[i] ^= m[i & 3];
    c.buf = b.subarray(off + 4 + len);
    if (op === 8) { fechar(c); return; }
    if (op === 9) { c.socket.write(frame(10, d)); continue; }
    if (op === 10) continue;
    if (op === 1 || op === 0) {
      c.frag = op === 0 ? Buffer.concat([c.frag, d]) : d;
      if (c.frag.length > 4096) { fechar(c); return; }
      if (fin) { const s = c.frag.toString('utf8'); c.frag = Buffer.alloc(0); mensagem(c, s); }
    }
  }
}

function mensagem(c, texto) {
  let m;
  try { m = JSON.parse(texto); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'join') {
    if (c.sala) return;
    const sala = limpa(m.sala, 16).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'geral';
    let set = salas.get(sala);
    if (!set) { set = new Set(); salas.set(sala, set); }
    if (set.size >= MAX_SALA) { enviar(c, { t: 'full' }); fechar(c); return; }
    c.sala = sala;
    c.n = limpa(m.n, 14) || 'Aluno';
    c.c = num(m.c, 0, 3, 0) | 0;
    c.k = num(m.k, 0, 5, 0) | 0;
    c.tx = num(m.tx, 0, 660, 330);
    c.ty = num(m.ty, 0, 470, 235);
    c.s = num(m.s, 0, 40, 0);
    enviar(c, { t: 'hello', id: c.id, peers: [...set].map(publico) });
    set.add(c);
    para_todos(c, Object.assign({ t: 'j' }, publico(c)));
    return;
  }
  if (!c.sala) return;

  if (m.t === 'pos') {
    c.tx = num(m.tx, 0, 660, c.tx);
    c.ty = num(m.ty, 0, 470, c.ty);
    para_todos(c, { t: 'p', id: c.id, tx: c.tx, ty: c.ty });
  } else if (m.t === 's') {
    const s = num(m.s, 0, 40, c.s);
    if (s > c.s) { c.s = Math.min(s, c.s + 2); para_todos(c, { t: 's', id: c.id, s: c.s }); }
  } else if (m.t === 'chat') {
    const agora = Date.now();
    if (agora - c.ultimoChat < 700) return;
    c.ultimoChat = agora;
    const x = limpa(m.x, 120).trim();
    if (x) para_todos(c, { t: 'chat', n: c.n, x });
  }
}

setInterval(() => {
  for (const set of salas.values()) for (const c of set) {
    if (!c.alive) { fechar(c); continue; }
    c.alive = false;
    try { c.socket.write(frame(9, Buffer.alloc(0))); } catch (e) {}
  }
}, 25000);

server.listen(PORT, () => console.log('Operação Meia-Vida no ar: http://localhost:' + PORT));
