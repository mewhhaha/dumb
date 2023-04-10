export type WebSocketPool = {
  sessions: WebSocket[];
};

export const ws = (): WebSocketPool => {
  return {
    sessions: [],
  };
};

export const close = (
  ws: WebSocketPool,
  { code, reason }: Partial<WebSocketDisconnect> = {}
) => {
  const closing = ws.sessions;
  ws.sessions = [];

  for (const session of closing) {
    session.close(code, reason);
  }
};

export const connect = (
  ws: WebSocketPool,
  setup: (socket: WebSocket) => void | Promise<void>
): Response => {
  const pair = new WebSocketPair();
  const websocket = pair[1];

  websocket.accept();
  ws.sessions.push(websocket);

  setup(pair[1]);

  return new Response(null, { status: 101, webSocket: pair[0] });
};

export const disconnect = (
  ws: WebSocketPool,
  websocket: WebSocket,
  { code, reason }: Partial<WebSocketDisconnect> = {}
) => {
  websocket.close(code, reason);
  ws.sessions = ws.sessions.filter((w) => w !== websocket);
};

export const broadcast = (
  ws: WebSocketPool,
  message: string,
  options: { exclude: WebSocket[] } = { exclude: [] }
) => {
  ws.sessions = ws.sessions.filter((session) => {
    if (options.exclude.includes(session)) {
      return true;
    }

    try {
      session.send(message);
      return true;
    } catch (_err) {
      return false;
    }
  });
};

export const isWebSocketUpgrade = (request: Request) => {
  return (
    request.headers.get("Upgrade")?.toLowerCase() === "websocket" &&
    request.method.toLowerCase() === "get"
  );
};

export type WebSocketDisconnect = { code: number; reason: string };
