import { MongoClient } from "mongodb";

let client;
let db;

async function getDatabase(env) {
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (!client) {
    client = new MongoClient(env.MONGO_URI);
    await client.connect();
    db = client.db();
  }

  return db;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "africsocial-api",
        platform: "cloudflare-workers",
        mode: "direct-mongodb",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/db-test") {
      try {
        const database = await getDatabase(env);

        const result = await database.command({
          ping: 1,
        });

        return Response.json({
          status: "ok",
          database: "mongodb-atlas",
          connected: result.ok === 1,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("MongoDB test failed:", error);

        return Response.json(
          {
            status: "error",
            database: "mongodb-atlas",
            message: error.message,
          },
          { status: 500 }
        );
      }
    }

    return Response.json(
      {
        status: "ok",
        service: "africsocial-api",
        message: "Worker is running",
      },
      { status: 200 }
    );
  },
};
