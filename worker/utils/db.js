import { MongoClient } from "mongodb";

let client;
let db;
let connectingPromise;

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

  if (connectingPromise) {
    console.log("[DB] Waiting for existing MongoDB connection");

    try {
      await connectingPromise;

      if (client && db) {
        console.log("[DB] Existing MongoDB connection is ready", {
          durationMs: Date.now() - startedAt,
        });

        return db;
      }

      throw new Error("MongoDB connection completed without a database");
    } catch (error) {
      console.error("[DB] Existing MongoDB connection failed", {
        durationMs: Date.now() - startedAt,
        name: error?.name || "Error",
        message: error?.message || String(error),
      });

      throw error;
    }
  }

  console.log("[DB] Creating MongoDB client");

  connectingPromise = (async () => {
    try {
      const newClient = new MongoClient(env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000,
      });

      console.log("[DB] Connecting to MongoDB...");

      await newClient.connect();

      const newDb = newClient.db();

      client = newClient;
      db = newDb;

      console.log("[DB] MongoDB connected", {
        durationMs: Date.now() - startedAt,
      });

      console.log("[DB] Database ready", {
        durationMs: Date.now() - startedAt,
      });

      return newDb;
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
    } finally {
      connectingPromise = undefined;
    }
  })();

  return await connectingPromise;
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
