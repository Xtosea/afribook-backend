const TICKET_TTL_MS = 60 * 1000;

export class SocketRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (
      url.pathname === "/ticket" &&
      request.method === "POST"
    ) {
      return this.createTicket(request);
    }

    if (
      url.pathname === "/connect" &&
      request.method === "GET"
    ) {
      return this.handleWebSocket(request);
    }

    return new Response("SocketRoom OK", {
      status: 200,
    });
  }

  async createTicket(request) {
    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid request body", {
        status: 400,
      });
    }

    const userId = body?.userId;

    if (!userId) {
      return new Response("Missing user ID", {
        status: 401,
      });
    }

    const ticketBytes = new Uint8Array(32);

    crypto.getRandomValues(ticketBytes);

    const ticket = Array.from(
      ticketBytes,
      byte => byte.toString(16).padStart(2, "0")
    ).join("");

    await this.ctx.storage.put(
      `ticket:${ticket}`,
      {
        userId,
        createdAt: Date.now(),
      },
      {
        expirationTtl: 60,
      }
    );

    return Response.json({
      ticket,
      expiresIn: TICKET_TTL_MS,
    });
  }

  async handleWebSocket(request) {
    if (
      request.headers.get("Upgrade") !== "websocket"
    ) {
      return new Response(
        "Expected WebSocket upgrade",
        { status: 426 }
      );
    }

    const url = new URL(request.url);
    const ticket = url.searchParams.get("ticket");

    if (!ticket) {
      return new Response(
        "Missing WebSocket ticket",
        { status: 401 }
      );
    }

    const key = `ticket:${ticket}`;

    const stored = await this.ctx.storage.get(key);

    if (!stored) {
      return new Response(
        "Invalid or expired WebSocket ticket",
        { status: 401 }
      );
    }

    // One-time ticket.
    await this.ctx.storage.delete(key);

    const pair = new WebSocketPair();

    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    server.serializeAttachment({
      userId: stored.userId,
      connectedAt: Date.now(),
    });

    server.send(JSON.stringify({
      event: "connected",
      data: {
        message: "WebSocket connected",
      },
    }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  getOnlineUsers() {
    const sockets = this.ctx.getWebSockets();

    return [
      ...new Set(
        sockets
          .map(ws => {
            const attachment = ws.deserializeAttachment();

            return attachment?.userId || null;
          })
          .filter(Boolean)
      )
    ];
  }

  broadcast(event, data) {
    const message = JSON.stringify({
      event,
      data,
    });

    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch (error) {
        console.error(
          "SOCKET BROADCAST ERROR:",
          error
        );
      }
    }
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      if (data.event === "ping") {
        ws.send(JSON.stringify({
          event: "pong",
          data: {
            timestamp: Date.now(),
          },
        }));

        return;
      }

      if (data.event === "join") {
        const attachment = ws.deserializeAttachment();

        if (!attachment?.userId) {
          ws.send(JSON.stringify({
            event: "error",
            data: {
              message: "Socket user identity missing",
            },
          }));

          return;
        }

        const onlineUsers = this.getOnlineUsers();

        this.broadcast(
          "online-users",
          onlineUsers
        );

        return;
      }

      if (data.event === "send-message") {
        this.broadcast(
          "receive-message",
          data.data
        );

        return;
      }

      if (data.event === "message-edited") {
        this.broadcast(
          "message-edited",
          data.data
        );

        return;
      }

      if (data.event === "message-deleted") {
        this.broadcast(
          "message-deleted",
          data.data
        );

        return;
      }

      ws.send(JSON.stringify({
        event: "message",
        data,
      }));

    } catch (error) {
      console.error(
        "SOCKET MESSAGE ERROR:",
        error
      );

      try {
        ws.send(JSON.stringify({
          event: "error",
          data: {
            message: "Invalid WebSocket message",
          },
        }));
      } catch {}
    }
  }

  async webSocketClose(ws) {
    try {
      ws.close();
    } catch {}

    this.broadcast(
      "online-users",
      this.getOnlineUsers()
    );
  }

  async webSocketError(ws) {
    try {
      ws.close();
    } catch {}

    this.broadcast(
      "online-users",
      this.getOnlineUsers()
    );
  }
}
