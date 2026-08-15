export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ==========================================
    // ROOT
    // ==========================================
    if (url.pathname === "/") {
      return new Response("AfricSocial Cloudflare Worker 🚀", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
        },
      });
    }

    // ==========================================
    // HEALTH CHECK
    // ==========================================
    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "africsocial-api",
        platform: "cloudflare-workers",
        timestamp: new Date().toISOString(),
      });
    }

    // ==========================================
    // 404
    // ==========================================
    return Response.json(
      {
        success: false,
        error: "Route not found",
        path: url.pathname,
      },
      {
        status: 404,
      }
    );
  },
};