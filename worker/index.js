export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.json({
        status: "ok",
        service: "africsocial-api",
        platform: "cloudflare-workers",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "africsocial-api",
        databaseConfigured: Boolean(env.MONGO_URI),
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json(
      {
        status: "error",
        message: "Route not found",
      },
      { status: 404 }
    );
  },
};