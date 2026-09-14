import { MongoClient } from "mongodb";

let client;
let db;
let connectingPromise;

function isTransientMongoError(error) {
  const message =
    error?.message ||
    String(error || "");

  const name =
    error?.name ||
    "";

  const code =
    error?.code;

  const transientCodes = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ENETUNREACH",
    "EHOSTUNREACH",
  ];

  if (transientCodes.includes(code)) {
    return true;
  }

  const text =
    `${name} ${message}`.toLowerCase();

  return (
    text.includes("timed out") ||
    text.includes("timeout") ||
    text.includes("server selection") ||
    text.includes("connection") ||
    text.includes("socket") ||
    text.includes("network") ||
    text.includes("econnreset") ||
    text.includes("econnrefused") ||
    text.includes("enetunreach") ||
    text.includes("hostunreachable") ||
    text.includes("pool cleared") ||
    text.includes("topology was destroyed")
  );
}

async function resetDatabaseConnection() {
  const oldClient = client;

  client = undefined;
  db = undefined;

  if (!oldClient) {
    return;
  }

  try {
    console.log(
      "[DB] Closing stale MongoDB client"
    );

    await oldClient.close();

    console.log(
      "[DB] Stale MongoDB client closed"
    );

  } catch (error) {
    console.error(
      "[DB] Failed to close stale MongoDB client",
      {
        name:
          error?.name ||
          "Error",
        message:
          error?.message ||
          String(error),
      }
    );
  }
}

export async function getDatabase(env) {
  const startedAt = Date.now();

  console.log(
    "[DB] getDatabase called"
  );

  if (!env.MONGO_URI) {
    console.error(
      "[DB] MONGO_URI is not configured"
    );

    throw new Error(
      "MONGO_URI is not configured"
    );
  }

  // Reuse an already-established MongoDB client.
  if (client && db) {
    console.log(
      "[DB] Reusing existing MongoDB client",
      {
        durationMs:
          Date.now() - startedAt,
      }
    );

    return db;
  }

  // If another request is already establishing
  // the connection, wait for that same connection.
  if (connectingPromise) {
    console.log(
      "[DB] Waiting for existing MongoDB connection"
    );

    try {
      await connectingPromise;

      if (client && db) {
        console.log(
          "[DB] Existing MongoDB connection is ready",
          {
            durationMs:
              Date.now() - startedAt,
          }
        );

        return db;
      }

      throw new Error(
        "MongoDB connection completed without a database"
      );

    } catch (error) {
      console.error(
        "[DB] Existing MongoDB connection failed",
        {
          durationMs:
            Date.now() - startedAt,
          name:
            error?.name ||
            "Error",
          message:
            error?.message ||
            String(error),
        }
      );

      throw error;
    }
  }

  console.log(
    "[DB] Creating MongoDB client"
  );

  connectingPromise = (async () => {
    const newClient =
      new MongoClient(
        env.MONGO_URI,
        {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 10000,

          // Let the MongoDB driver retry
          // retryable reads when possible.
          retryReads: true,

          // Keep the connection pool controlled
          // for the Worker environment.
          maxPoolSize: 10,
          minPoolSize: 0,
          maxIdleTimeMS: 30000,
        }
      );

    try {
      console.log(
        "[DB] Connecting to MongoDB..."
      );

      await newClient.connect();

      const newDb =
        newClient.db();

      client = newClient;
      db = newDb;

      console.log(
        "[DB] MongoDB connected",
        {
          durationMs:
            Date.now() - startedAt,
        }
      );

      console.log(
        "[DB] Database ready",
        {
          durationMs:
            Date.now() - startedAt,
        }
      );

      return newDb;

    } catch (error) {
      console.error(
        "[DB] MongoDB connection failed",
        {
          durationMs:
            Date.now() - startedAt,
          name:
            error?.name ||
            "Error",
          message:
            error?.message ||
            String(error),
          stack:
            error?.stack ||
            null,
        }
      );

      client = undefined;
      db = undefined;

      try {
        await newClient.close();

      } catch (closeError) {
        console.error(
          "[DB] Failed to close MongoDB client",
          {
            name:
              closeError?.name ||
              "Error",
            message:
              closeError?.message ||
              String(closeError),
          }
        );
      }

      throw error;
    }
  })();

  try {
    return await connectingPromise;

  } finally {
    connectingPromise = undefined;
  }
}

/*
 * Execute a MongoDB operation with one automatic
 * recovery attempt when the existing connection
 * has become stale or a transient network failure
 * occurs.
 *
 * The callback receives the active database.
 */
export async function withDatabaseRetry(
  env,
  operation
) {
  let attempt = 0;

  while (attempt < 2) {
    attempt++;

    try {
      const database =
        await getDatabase(env);

      return await operation(
        database
      );

    } catch (error) {
      const transient =
        isTransientMongoError(error);

      console.error(
        "[DB] Operation failed",
        {
          attempt,
          transient,
          name:
            error?.name ||
            "Error",
          message:
            error?.message ||
            String(error),
        }
      );

      // Only reconnect/retry once for
      // transient MongoDB/network failures.
      if (
        !transient ||
        attempt >= 2
      ) {
        throw error;
      }

      console.warn(
        "[DB] Resetting MongoDB connection and retrying operation"
      );

      await resetDatabaseConnection();

      // Small delay gives the runtime/network
      // a moment before creating a new connection.
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            250
          )
      );
    }
  }

  throw new Error(
    "MongoDB operation failed after retry"
  );
}

export async function debugDbOperation(
  name,
  operation
) {
  const startedAt = Date.now();

  console.log(
    "[DB OP START]",
    {
      name,
    }
  );

  try {
    const result =
      await operation();

    console.log(
      "[DB OP END]",
      {
        name,
        durationMs:
          Date.now() - startedAt,
      }
    );

    return result;

  } catch (error) {
    console.error(
      "[DB OP ERROR]",
      {
        name,
        durationMs:
          Date.now() - startedAt,
        error: {
          name:
            error?.name ||
            "Error",
          message:
            error?.message ||
            String(error),
          stack:
            error?.stack ||
            null,
        },
      }
    );

    throw error;
  }
}
