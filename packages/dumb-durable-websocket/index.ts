export type WebSocketServer = {
  sessions: WebSocket[];
};

export const ws = (): WebSocketServer => {
  return {
    sessions: [],
  };
};

export const disconnectAll = (
  ws: WebSocketServer,
  { code, reason }: Partial<WebSocketDisconnect> = {}
) => {
  const closing = ws.sessions;
  ws.sessions = [];

  for (const session of closing) {
    session.close(code, reason);
  }
};

export const connect = (
  ws: WebSocketServer,
  request: Request,
  { onAccept, onMessage, onOpen, onClose, onError }: ConnectHandlerConfig
): Response => {
  if (isNotWebSocketUpgrade(request)) {
    return new Response("Expected header 'Upgrade' to equal 'websocket' ", {
      status: 400,
    });
  }

  const pair = new WebSocketPair();
  const websocket = pair[1];

  websocket.accept();
  ws.sessions.push(websocket);
  onAccept?.(pair[1]);

  const handleOnMessage = (ev: MessageEvent) => onMessage?.(pair[1], ev);
  const handleOnOpen = (ev: Event) => onOpen?.(pair[1], ev);
  const handleOnError = (ev: ErrorEvent) => onError?.(pair[1], ev);
  const handleOnClose = (ev: CloseEvent) => {
    websocket.removeEventListener("message", handleOnMessage);
    websocket.removeEventListener("open", handleOnOpen);
    websocket.removeEventListener("error", handleOnError);
    websocket.removeEventListener("close", handleOnClose);
    onClose?.(pair[1], ev);
  };

  websocket.addEventListener("message", handleOnMessage);
  websocket.addEventListener("open", handleOnOpen);
  websocket.addEventListener("error", handleOnError);
  websocket.addEventListener("close", handleOnClose);

  return new Response(null, { status: 101, webSocket: pair[0] });
};

export const disconnect = (
  ws: WebSocketServer,
  websocket: WebSocket,
  { code, reason }: Partial<WebSocketDisconnect> = {}
) => {
  websocket.close(code, reason);
  ws.sessions = ws.sessions.filter((w) => w !== websocket);
};

export const broadcast = (
  ws: WebSocketServer,
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

const isNotWebSocketUpgrade = (request: Request) => {
  return request.headers.get("Upgrade") !== "websocket";
};

export type SocketController = ReturnType<typeof ws>;

export type ConnectHandlerConfig = {
  onAccept?: (websocket: WebSocket) => Promise<void> | void;
  onMessage?: (websocket: WebSocket, ev: MessageEvent) => Promise<void> | void;
  onError?: (websocket: WebSocket, ev: ErrorEvent) => Promise<void> | void;
  onClose?: (websocket: WebSocket, ev: CloseEvent) => Promise<void> | void;
  onOpen?: (websocket: WebSocket, ev: Event) => Promise<void> | void;
};

export type WebSocketDisconnect = { code: number; reason: string };
