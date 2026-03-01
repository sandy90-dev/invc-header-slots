const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-memory store ─────────────────────────────────────────────────────────
let state = freshState();

function freshState() {
  return {
    currentRound: 0,
    revealed: false,
    done: false,
    participants: [],  // [{ name, avatar }]
    votes: {},         // { roundId: { name: [fieldId, ...] } }
    consensus: {},     // { roundId: [fieldId, ...] }
  };
}

// ─── SSE ─────────────────────────────────────────────────────────────────────
let clients = [];

function broadcast() {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  clients.forEach(c => c.res.write(data));
}

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  const client = { id: Date.now(), res };
  clients.push(client);
  req.on('close', () => { clients = clients.filter(c => c.id !== client.id); });
});

// ─── API ─────────────────────────────────────────────────────────────────────

app.get('/api/state', (req, res) => res.json(state));

app.post('/api/join', (req, res) => {
  const { name, avatar } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (!state.participants.find(p => p.name === name)) {
    state.participants.push({ name, avatar: avatar || '🙂' });
    broadcast();
  }
  res.json({ ok: true });
});

app.post('/api/vote', (req, res) => {
  const { roundId, name, picks } = req.body;
  if (!roundId || !name || !picks) return res.status(400).json({ error: 'Missing fields' });
  if (!state.votes[roundId]) state.votes[roundId] = {};
  state.votes[roundId][name] = picks;
  broadcast();
  res.json({ ok: true });
});

app.post('/api/reveal', (req, res) => {
  const { roundId, consensus } = req.body;
  if (!roundId || !consensus) return res.status(400).json({ error: 'Missing fields' });
  state.consensus[roundId] = consensus;
  state.revealed = true;
  broadcast();
  res.json({ ok: true });
});

app.post('/api/next', (req, res) => {
  state.currentRound++;
  state.revealed = false;
  if (state.currentRound >= 12) state.done = true;
  broadcast();
  res.json({ ok: true, currentRound: state.currentRound });
});

app.post('/api/reset', (req, res) => {
  state = freshState();
  broadcast();
  res.json({ ok: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const serverInstance = app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) { localIP = iface.address; break; }
    }
  }
  console.log(`\n✅  INVC Header Slots`);
  console.log(`   Facilitator: http://localhost:${PORT}`);
  console.log(`   Participants: http://${localIP}:${PORT}\n`);
});

module.exports = serverInstance;
