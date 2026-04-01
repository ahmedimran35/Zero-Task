const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth.cjs');

let wss;
const clients = new Map(); // userId -> Set<ws>

function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'No token');
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    const userId = decoded.userId;
    ws.userId = userId;
    ws.isAlive = true;

    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(ws);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      const userClients = clients.get(userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) clients.delete(userId);
      }
    });

    ws.send(JSON.stringify({ type: 'CONNECTED', userId }));
  });

  // Heartbeat to detect dead connections
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

function broadcastToUser(userId, event) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const msg = JSON.stringify(event);
  for (const ws of userClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function broadcastToAll(event) {
  if (!wss) return;
  const msg = JSON.stringify(event);
  wss.clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

module.exports = { setupWebSocket, broadcastToUser, broadcastToAll };
