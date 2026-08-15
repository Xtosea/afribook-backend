export default {
  async fetch(request, env) {
    try {
      const incomingUrl = new URL(request.url);

      // ----------------------------------------
      // Health check
      // ----------------------------------------
      if (incomingUrl.pathname === "/") {
        return Response.json({
          status: "ok",
          service: "africsocial-api",
          platform: "cloudflare-workers",
          mode: "api-gateway",
          timestamp: new Date().toISOString(),
        });
      }

      // ----------------------------------------
      // Make sure backend URL exists
      // ----------------------------------------
      if (!env.BACKEND_URL) {
        return Response.json(
          {
            status: "error",
            message: "BACKEND_URL is not configured",
          },
          { status: 500 }
        );
      }

      // ----------------------------------------
      // Build backend URL
      // ----------------------------------------
      const backendBase = env.BACKEND_URL.replace(/\/+$/, "");

      const backendUrl =
        backendBase +
        incomingUrl.pathname +
        incomingUrl.search;

      // ----------------------------------------
      // Forward request
      // ----------------------------------------
      const headers = new Headers(request.headers);

      // Tell backend request came through Cloudflare
      headers.set(
        "X-Forwarded-Host",
        incomingUrl.host
      );

      headers.set(
        "X-Forwarded-Proto",
        incomingUrl.protocol.replace(":", "")
      );

      headers.set(
        "X-Forwarded-For",
        request.headers.get("CF-Connecting-IP") || ""
      );

      headers.set(
        "X-AfricSocial-Gateway",
        "cloudflare-workers"
      );

      const backendRequest = new Request(
        backendUrl,
        {
          method: request.method,
          headers,
          body:
            request.method === "GET" ||
            request.method === "HEAD"
              ? undefined
              : request.body,
          redirect: "follow",
        }
      );

      const response = await fetch(
        backendRequest
      );

      // ----------------------------------------
      // Return backend response
      // ----------------------------------------
      const responseHeaders =
        new Headers(response.headers);

      responseHeaders.set(
        "X-AfricSocial-Gateway",
        "cloudflare-workers"
      );

      return new Response(
        response.body,
        {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        }
      );

    } catch (error) {

      console.error(
        "Worker gateway error:",
        error
      );

      return Response.json(
        {
          status: "error",
          message: "Backend gateway error",
        },
        { status: 502 }
      );
    }
  },
};