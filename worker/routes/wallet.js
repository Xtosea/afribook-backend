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
      points: -points,
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

/* ================= TRANSACTION HISTORY ================= */

export async function getTransactions(request, env, db) {
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

    if (!payload.id || !ObjectId.isValid(payload.id)) {
      return json({
        success: false,
        error: "Invalid authentication token",
      }, 401);
    }

    const userId = new ObjectId(payload.id);

    const url = new URL(request.url);

    const page = Math.max(
      Number(url.searchParams.get("page") || 1),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(url.searchParams.get("limit") || 20),
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {
      user: userId,
    };

    const [transactions, total] = await Promise.all([
      db.collection("transactions")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection("transactions")
        .countDocuments(filter),
    ]);

    return json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error(
      "GET TRANSACTIONS ERROR:",
      error
    );

    return json({
      success: false,
      error: error.message,
    }, 500);
  }
}

/* ================= ADMIN POINTS ADJUSTMENT ================= */

export async function adminAdjustPoints(request, env, db) {
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

    if (!payload.id || !ObjectId.isValid(payload.id)) {
      return json({
        success: false,
        error: "Invalid authentication token",
      }, 401);
    }

    const adminUserId = new ObjectId(payload.id);

    /* ================= VERIFY ADMIN ================= */

    const adminUser = await db.collection("users").findOne(
      { _id: adminUserId },
      { projection: { role: 1 } }
    );

    if (adminUser?.role !== "admin") {
      return json({
        success: false,
        error: "Admin access required",
      }, 403);
    }

    /* ================= READ REQUEST ================= */

    let body;

    try {
      body = await request.json();
    } catch {
      return json({
        success: false,
        error: "Invalid JSON request body",
      }, 400);
    }

    const { userId, action, points, reason } = body;

    if (!userId || !ObjectId.isValid(userId)) {
      return json({
        success: false,
        error: "Valid target userId is required",
      }, 400);
    }

    if (action !== "add" && action !== "deduct") {
      return json({
        success: false,
        error: "Action must be either add or deduct",
      }, 400);
    }

    const amount = Number(points);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return json({
        success: false,
        error: "Points must be a positive whole number",
      }, 400);
    }

    if (
      !reason ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return json({
        success: false,
        error: "Reason is required",
      }, 400);
    }

    const targetUserId = new ObjectId(userId);

    /* ================= VERIFY TARGET USER ================= */

    const targetUser = await db.collection("users").findOne(
      { _id: targetUserId },
      { projection: { _id: 1 } }
    );

    if (!targetUser) {
      return json({
        success: false,
        error: "Target user not found",
      }, 404);
    }

    /* ================= CALCULATE CHANGE ================= */

    const pointsChange =
      action === "add"
        ? amount
        : -amount;

    /* ================= UPDATE WALLET ================= */

    let updateResult;

    if (action === "deduct") {
      updateResult = await db.collection("wallets").findOneAndUpdate(
        {
          user: targetUserId,
          points: { $gte: amount },
        },
        {
          $inc: {
            points: -amount,
          },
          $set: {
            updatedAt: new Date(),
          },
          $setOnInsert: {
            user: targetUserId,
            balance: 0,
            lifetimeEarned: 0,
            pending: 0,
            createdAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        }
      );
    } else {
      updateResult = await db.collection("wallets").findOneAndUpdate(
        { user: targetUserId },
        {
          $inc: {
            points: amount,
          },
          $set: {
            updatedAt: new Date(),
          },
          $setOnInsert: {
            user: targetUserId,
            balance: 0,
            lifetimeEarned: 0,
            pending: 0,
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );
    }

    const updatedWallet =
      updateResult?.value || updateResult;

    if (!updatedWallet) {
      return json({
        success: false,
        error: "Insufficient points for deduction",
      }, 400);
    }

    const newPoints = Number(
      updatedWallet.points || 0
    );

    /* ================= RECORD TRANSACTION ================= */

    await db.collection("transactions").insertOne({
      user: targetUserId,
      type: "points",
      category: "admin_adjustment",
      points: pointsChange,
      amount: 0,
      currency: "NGN",
      paymentMethod: "admin",
      reference: `ADMIN-POINTS-${Date.now()}`,
      status: "success",
      description: reason.trim(),
      metadata: {
        action,
        reason: reason.trim(),
        adminUser: adminUserId.toString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    /* ================= NOTIFY USER ================= */

    await db.collection("notifications").insertOne({
      recipient: targetUserId,
      type: "POINT_ADJUSTMENT",
      text:
        action === "add"
          ? `AfricSocial added ${amount} points to your wallet`
          : `AfricSocial deducted ${amount} points from your wallet`,
      count: 1,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return json({
      success: true,
      message:
        action === "add"
          ? "Points added successfully"
          : "Points deducted successfully",
      userId: targetUserId.toString(),
      pointsChanged: pointsChange,
      points: newPoints,
    });

  } catch (error) {
    console.error(
      "ADMIN POINTS ADJUSTMENT ERROR:",
      error
    );

    return json({
      success: false,
      error: error.message,
    }, 500);
  }
}

/* ================= ADMIN WALLET USER SEARCH ================= */

export async function adminSearchUsers(request, env, db) {
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

    if (!payload.id || !ObjectId.isValid(payload.id)) {
      return json({
        success: false,
        error: "Invalid authentication token",
      }, 401);
    }

    const adminUserId = new ObjectId(payload.id);

    /* ================= VERIFY ADMIN ================= */

    const adminUser = await db.collection("users").findOne(
      { _id: adminUserId },
      { projection: { role: 1 } }
    );

    if (adminUser?.role !== "admin") {
      return json({
        success: false,
        error: "Admin access required",
      }, 403);
    }

    /* ================= READ SEARCH ================= */

    const url = new URL(request.url);

    const search =
      (url.searchParams.get("search") || "").trim();

    if (search.length < 2) {
      return json({
        success: true,
        users: [],
      });
    }

    const regex =
      new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

    /* ================= FIND USERS ================= */

    const users = await db.collection("users")
      .find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex },
        ],
      })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        profilePic: 1,
        intro: 1,
      })
      .limit(10)
      .toArray();

    /* ================= GET WALLET POINTS ================= */

    const userIds =
      users.map(user => user._id);

    const wallets =
      userIds.length
        ? await db.collection("wallets")
            .find({
              user: {
                $in: userIds,
              },
            })
            .project({
              user: 1,
              points: 1,
            })
            .toArray()
        : [];

    const walletMap =
      new Map(
        wallets.map(wallet => [
          wallet.user.toString(),
          Number(wallet.points || 0),
        ])
      );

    /* ================= FORMAT RESULTS ================= */

    const results =
      users.map(user => ({
        _id: user._id.toString(),
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        profilePic: user.profilePic || "",
        intro: user.intro || "",
        points:
          walletMap.get(
            user._id.toString()
          ) || 0,
      }));

    return json({
      success: true,
      users: results,
    });

  } catch (error) {
    console.error(
      "ADMIN SEARCH USERS ERROR:",
      error
    );

    return json({
      success: false,
      error: error.message,
    }, 500);
  }
}
