import { MongoClient } from "mongodb";

let client;
let db;

export async function getDatabase(env) {
  const startedAt = Date.now();

  console.log("[DB] getDatabase called");

  if (!env.MONGO_URI) {
    console.error("[DB] MONGO_URI is not configured");
    throw new Error("MONGO_URI is not configured");
  }

  if (client && db) {
    console.log("[DB] Reusing existing MongoDB client", {
      durationMs: Date.now() - startedAt,
    });

    return db;
  }

  console.log("[DB] Creating MongoDB client");

  try {
    client = new MongoClient(env.MONGO_URI);

    console.log("[DB] Connecting to MongoDB...");

    await client.connect();

    console.log("[DB] MongoDB connected", {
      durationMs: Date.now() - startedAt,
    });

    db = client.db();

    console.log("[DB] Database ready", {
      durationMs: Date.now() - startedAt,
    });

    return db;
  } catch (error) {
    console.error("[DB] MongoDB connection failed", {
      durationMs: Date.now() - startedAt,
      name: error?.name || "Error",
      message: error?.message || String(error),
      stack: error?.stack || null,
    });

    client = undefined;
    db = undefined;

    throw error;
  }
}

export async function debugDbOperation(name, operation) {
  const startedAt = Date.now();

  console.log("[DB OP START]", {
    name,
  });

  try {
    const result = await operation();

    console.log("[DB OP END]", {
      name,
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    console.error("[DB OP ERROR]", {
      name,
      durationMs: Date.now() - startedAt,
      error: {
        name: error?.name || "Error",
        message: error?.message || String(error),
        stack: error?.stack || null,
      },
    });

    throw error;
  }
}
