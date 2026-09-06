import { ObjectId } from "mongodb";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function getToken(request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

function base64UrlDecode(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  return atob(padded);
}

async function verifyJWT(token, secret) {
  if (!token) {
    throw new Error("Authentication required");
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  const signature = Uint8Array.from(
    base64UrlDecode(encodedSignature),
    char => char.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(
      `${encodedHeader}.${encodedPayload}`
    )
  );

  if (!valid) {
    throw new Error("Invalid token");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload)
  );

  if (
    payload.exp &&
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    throw new Error("Token expired");
  }

  return payload;
}

export async function getWallet(request, env, db) {
  try {
    if (!env.JWT_SECRET) {
      return json({
        error: "JWT_SECRET is not configured",
      }, 500);
    }

    const token = getToken(request);

    if (!token) {
      return json({
        error: "Authentication required",
      }, 401);
    }

    const payload = await verifyJWT(
      token,
      env.JWT_SECRET
    );

    if (!payload.id) {
      return json({
        error: "Invalid authentication token",
      }, 401);
    }

    if (!ObjectId.isValid(payload.id)) {
      return json({
        error: "Invalid user ID",
      }, 401);
    }

    const userId = new ObjectId(payload.id);

    let wallet = await db.collection("wallets").findOne({
      user: userId,
    });

    if (!wallet) {
      wallet = {
        user: userId,
        balance: 0,
        points: 0,
        storyLikes: 0,
        storyViews: 0,
        reelLikes: 0,
        reelViews: 0,
        videoLikes: 0,
        videoViews: 0,
        referralPoints: 0,
        leaderboardPoints: 0,
        lifetimeEarned: 0,
        pending: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("wallets").insertOne(wallet);
    }

    return json({
      balance: wallet.balance || 0,
      points: wallet.points || 0,
      storyLikes: wallet.storyLikes || 0,
      storyViews: wallet.storyViews || 0,
      reelLikes: wallet.reelLikes || 0,
      reelViews: wallet.reelViews || 0,
      videoLikes: wallet.videoLikes || 0,
      videoViews: wallet.videoViews || 0,
      referralPoints: wallet.referralPoints || 0,
      leaderboardPoints: wallet.leaderboardPoints || 0,
      lifetimeEarned: wallet.lifetimeEarned || 0,
      pending: wallet.pending || 0,
    });

  } catch (error) {
    console.error("GET WALLET ERROR:", error);

    if (
      error.message === "Authentication required" ||
      error.message === "Invalid token" ||
      error.message === "Token expired" ||
      error.message === "Invalid user ID"
    ) {
      return json({
        error: error.message,
      }, 401);
    }

    return json({
      error: error.message,
    }, 500);
  }
}
/* ================= CONVERT POINTS ================= */

const RATE = 0.5;

export async function convertPoints(request, env, db) {
  try {
    if (!env.JWT_SECRET) {
      return json({
        success: false,
        error: "JWT_SECRET is not configured",
      }, 500);
    }

    const token = getToken(request);

    if (!token) {
      return json({
        success: false,
        error: "Authentication required",
      }, 401);
    }

    const payload = await verifyJWT(
      token,
      env.JWT_SECRET
    );

    if (!payload.id) {
      return json({
        success: false,
        error: "Invalid authentication token",
      }, 401);
    }

    if (!ObjectId.isValid(payload.id)) {
      return json({
        success: false,
        error: "Invalid user ID",
      }, 401);
    }

    const userId = new ObjectId(payload.id);

    // ================= CHECK USER ROLE =================

    const user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { role: 1 } }
    );

    const isAdmin = user?.role === "admin";

    let wallet = await db.collection("wallets").findOne({
      user: userId,
    });

    if (!wallet) {
      wallet = {
        user: userId,
        balance: 0,
        points: 0,
        storyLikes: 0,
        storyViews: 0,
        reelLikes: 0,
        reelViews: 0,
        videoLikes: 0,
        videoViews: 0,
        referralPoints: 0,
        leaderboardPoints: 0,
        lifetimeEarned: 0,
        pending: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("wallets").insertOne(wallet);
    }

    const points = Number(wallet.points || 0);

    // Admins may convert below 10,000 points for testing.
    // Normal users must have at least 10,000 points.
    if (points <= 0) {
      return json({
        success: false,
        error: "No points available for conversion",
      }, 400);
    }

    if (points < 10000 && !isAdmin) {
      return json({
        success: false,
        error: "Minimum 10,000 points required",
      }, 400);
    }

    const cash = points * RATE;

    const newBalance =
      (wallet.balance || 0) + cash;

    const newLifetimeEarned =
      (wallet.lifetimeEarned || 0) + cash;

    await db.collection("wallets").updateOne(
      {
        _id: wallet._id,
      },
      {
        $set: {
          balance: newBalance,
          lifetimeEarned: newLifetimeEarned,
          points: 0,
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("transactions").insertOne({
      user: userId,
      type: "conversion",
      category: "points_conversion",
      amount: cash,
      currency: "NGN",
      paymentMethod: "wallet",
      reference: `POINTS-${Date.now()}`,
      gatewayReference: "",
      status: "success",
      description: "Converted points to wallet balance",
      metadata: {
        pointsConverted: points,
        conversionRate: RATE,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return json({
      success: true,
      message: "Points converted successfully",
      balance: newBalance,
      earned: cash,
      pointsConverted: points,
    });

  } catch (error) {
    console.error(
      "POINT CONVERSION ERROR:",
      error
    );

    return json({
      success: false,
      error: "Conversion failed",
    }, 500);
  }
}
