import { MongoClient } from "mongodb";
import {
  register,
  login,
} from "./routes/auth.js";

import {
  getWallet,
} from "./routes/wallet.js";

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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders(),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ================= CORS =================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ================= HEALTH =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/health"
    ) {
      return json({
        status: "ok",
        service: "africsocial-api",
        platform: "cloudflare-workers",
        mode: "direct-mongodb",
        timestamp: new Date().toISOString(),
      });
    }

    // ================= DATABASE TEST =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/db-test"
    ) {
      try {
        const database = await getDatabase(env);

        const result = await database.command({
          ping: 1,
        });

        return json({
          status: "ok",
          database: "mongodb-atlas",
          connected: result.ok === 1,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error(
          "MongoDB test failed:",
          error
        );

        return json({
          status: "error",
          database: "mongodb-atlas",
          message: error.message,
        }, 500);
      }
    }

    // ================= AUTH =================

    if (
      request.method === "POST" &&
      url.pathname === "/api/auth/register"
    ) {
      try {
        const database =
          await getDatabase(env);

        return await register(
          request,
          env,
          database
        );

      } catch (error) {
        console.error(
          "REGISTER ROUTE ERROR:",
          error
        );

        return json({
          error: error.message,
        }, 500);
      }
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/auth/login"
    ) {
      try {
        const database =
          await getDatabase(env);

        return await login(
          request,
          env,
          database
        );

      } catch (error) {
        console.error(
          "LOGIN ROUTE ERROR:",
          error
        );

        return json({
          error: error.message,
        }, 500);
      }
    }

    // ================= WALLET =================

if (
  request.method === "GET" &&
  url.pathname === "/api/wallet"
) {
  try {
    const database =
      await getDatabase(env);

    return await getWallet(
      request,
      env,
      database
    );

  } catch (error) {
    console.error(
      "WALLET ROUTE ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}

    
    // ================= DEFAULT =================

    return json({
      status: "ok",
      service: "africsocial-api",
      message: "Worker is running",
    });
  },
};
