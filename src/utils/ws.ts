export type WSEvent =
  | { type: 'TASK_CREATED'; payload: Record<string, unknown> }
  | { type: 'TASK_UPDATED'; payload: Record<string, unknown> }
  | { type: 'TASK_DELETED'; payload: { id: string } }
  | { type: 'NOTIFICATION'; payload: Record<string, unknown> }
  | { type: 'CONNECTED'; userId: string }
  | { type: 'PONG' };

type WSHandler = (event: WSEvent) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let handlers: WSHandler[] = [];
let token: string | null = null;
let reconnectDelay = 1000;
const maxReconnectDelay = 30000;

export function connectWS(authToken: string) {
  token = authToken;
  if (ws && ws.readyState <= 1) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`);

  ws.onopen = () => {
    reconnectDelay = 1000;
  };

  ws.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data) as WSEvent;
      handlers.forEach(h => h(event));
    } catch { /* ignore parse errors */ }
  };

  ws.onclose = () => {
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (token) connectWS(token);
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
}

export function disconnectWS() {
  token = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function onWSMessage(handler: WSHandler) {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter(h => h !== handler);
  };
}

export function getWSStatus(): 'connected' | 'connecting' | 'disconnected' {
  if (!ws) return 'disconnected';
  if (ws.readyState === 0) return 'connecting';
  if (ws.readyState === 1) return 'connected';
  return 'disconnected';
}
