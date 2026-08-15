
let mongoClientPromise = null;

async function getMongoClient(uri) {
  if (!mongoClientPromise) {
    const client = new MongoClient(uri);

    mongoClientPromise = client.connect().catch((error) => {
      mongoClientPromise = null;
      throw error;
    });
  }

  return mongoClientPromise;
}

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
    // API HEALTH
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
    // MONGODB HEALTH
    // ==========================================
    if (url.pathname === "/api/db-health") {
      try {
        if (!env.MONGO_URI) {
          return Response.json(
            {
              status: "error",
              database: "mongodb",
              connected: false,
              error: "MONGO_URI secret is not configured",
            },
            { status: 500 }
          );
        }

        const client = await getMongoClient(env.MONGO_URI);

        const db = client.db();

        await db.command({
          ping: 1,
        });

        return Response.json({
          status: "ok",
          database: "mongodb",
          connected: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("MongoDB connection error:", error);

        return Response.json(
          {
            status: "error",
            database: "mongodb",
            connected: false,
            error: error.message,
          },
          { status: 500 }
        );
      }
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
      { status: 404 }
    );
  },
};