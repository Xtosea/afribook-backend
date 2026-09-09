export function createRequestId() {
  return crypto.randomUUID();
}

export function getRequestInfo(request, requestId) {
  const url = new URL(request.url);

  return {
    requestId,
    method: request.method,
    pathname: url.pathname,
    timestamp: new Date().toISOString(),
  };
}

export function logRequestStart(info) {
  console.log("[REQUEST START]", info);
}

export function logRequestEnd(info, status, durationMs) {
  console.log("[REQUEST END]", {
    ...info,
    status,
    durationMs,
  });
}

export function logRequestError(info, error, durationMs) {
  console.error("[REQUEST ERROR]", {
    ...info,
    durationMs,
    error: {
      name: error?.name || "Error",
      message: error?.message || String(error),
      stack: error?.stack || null,
    },
  });
}

export function addRequestId(response, requestId) {
  const headers = new Headers(response.headers);

  headers.set("X-Request-ID", requestId);

  // Preserve Cloudflare WebSocket upgrade responses.
  if (response.status === 101 && response.webSocket) {
    return new Response(null, {
      status: 101,
      headers,
      webSocket: response.webSocket,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function logSlowRequest(info, durationMs, thresholdMs = 2000) {
  if (durationMs >= thresholdMs) {
    console.warn("[REQUEST SLOW]", {
      ...info,
      durationMs,
      thresholdMs,
    });
  }
}
