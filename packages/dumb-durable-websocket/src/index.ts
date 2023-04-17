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
  { code, reason, exclude = [] }: Partial<WebSocketClose> = {}
) => {
  const closing = ws.sessions;
  const kept = ws.sessions.filter((w) => exclude.includes(w));
  ws.sessions = kept;

  for (const session of closing) {
    if (kept.includes(session)) continue;
    session.close(code, reason);
  }
};

/**
 *
 * @example
 * ```ts
 * const pool = ws();
 * const s = accept(pool, () => {});
 * return new Response(null, { status: 101, webSocket: s });
 * ```
 */
export const accept = (
  ws: WebSocketPool,
  setup: (socket: WebSocket) => void | Promise<void>
): WebSocket => {
  const pair = new WebSocketPair();
  const socket = pair[1];

  socket.accept();
  ws.sessions.push(socket);

  setup(pair[1]);

  return pair[0];
};

export const disconnect = (
  ws: WebSocketPool,
  websocket: WebSocket | WebSocket[],
  { code, reason }: Partial<WebSocketDisconnect> = {}
) => {
  const sockets = Array.isArray(websocket) ? websocket : [websocket];
  sockets.forEach((w) => w.close(code, reason));
  ws.sessions = ws.sessions.filter((w) => !sockets.includes(w));
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

export type WebSocketClose = {
  code: number;
  reason: string;
  exclude?: WebSocket[];
};
