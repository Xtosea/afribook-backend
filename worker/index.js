import { ObjectId } from "mongodb";
import { SocketRoom } from "./socketRoom.js";

import {
  createRequestId,
  getRequestInfo,
  logRequestStart,
  logRequestEnd,
  logRequestError,
  logSlowRequest,
  addRequestId,
} from "./utils/debug.js";


import {
  register,
  login,
} from "./routes/auth.js";

import {
  getWallet,
  convertPoints,
  getTransactions,
  adminAdjustPoints,
  adminAdjustmentHistory,
  adminSearchUsers,
} from "./routes/wallet.js";

import {
  getUsers,
  getUser,
  updateUser,
  getMutualFriends,
  getFollowers,
  getFollowing,
  toggleFollow,
} from "./routes/users.js";

import {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  getFriendSuggestions,
  getFriendList,
  syncFriendContacts,
} from "./routes/friends.js";

import {
  syncContacts,
} from "./routes/contacts.js";

import {
  getNotifications,
  markNotificationsRead,
  getUnreadNotificationCount,
} from "./routes/notifications.js";

import {
  createPost,
  getPosts,
  getUserPosts,
  getTrending,
  getPost,
  likePost,
  sharePost,
  savePost,
  editPost,
  deletePost,
  viewPost,
  commentPost,
  getSavedPosts,
  sharePostToFeed,
  createReel,
  getReels,
  viewReel,
} from "./routes/posts.js";
import {
  getListings,
  getListing,
  createListing,
  getMyListings,
  getSavedListings,
  toggleSaveListing,
  updateListing,
  deleteListing,
} from "./routes/marketplace.js";

import {
  imageKitAuth,
} from "./routes/imagekit.js";

import {
  getMyKycStatus,
  createKycUploadSignature,
  submitKyc,
  getPendingKyc,
  getAdminKyc,
  approveKyc,
  rejectKyc,
} from "./routes/kyc.js";

import {
  createStory,
  getStories,
  getStoryFeed,
  viewStory,
  reactToStory,
  shareStory,
  replyToStory,
  getStoryAnalytics,
  likeStory,
  markStoryViewed,
} from "./routes/stories.js";

import { getDatabase, withFreshDatabase } from "./utils/db.js";

import { ensureApplicationIndexes } from "./utils/indexes.js";
import { listProducts } from "./utils/products.js";
import {
  listCurrencies,
  normalizeCurrency,
} from "./utils/currencies.js";

import {
  getLeaderboardTop,
} from "./routes/leaderboard.js";

let applicationIndexesPromise = null;

async function ensureIndexes(env) {
  if (!applicationIndexesPromise) {
    applicationIndexesPromise = (async () => {
      const db = await getDatabase(env);
      await ensureApplicationIndexes(db);
      return true;
    })().catch((error) => {
      applicationIndexesPromise = null;
      throw error;
    });
  }

  return await applicationIndexesPromise;
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
  async fetch(request, env, ctx) {
    const requestId = createRequestId();
    const info = getRequestInfo(request, requestId);
    const startedAt = Date.now();

    logRequestStart(info);

    try {
      const response = await handleRequest(
        request,
        env,
        ctx
      );

      const durationMs = Date.now() - startedAt;

      logSlowRequest(
        info,
        durationMs
      );

      logRequestEnd(
        info,
        response.status,
        durationMs
      );

      return addRequestId(
        response,
        requestId
      );
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      logRequestError(
        info,
        error,
        durationMs
      );

      return addRequestId(
        json({
          error: "Internal server error",
          requestId,
        }, 500),
        requestId
      );
    }
  },
};

async function handleRequest(request, env, ctx) {
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

  // ================= PRODUCT CATALOG =================

    // GET PRODUCT CATALOG
    if (
      request.method === "GET" &&
      url.pathname === "/api/products"
    ) {
      try {
        const currencyParam =
          url.searchParams.get("currency") || "NGN";

        const currency = normalizeCurrency(currencyParam);

        if (!currency) {
          return json({
            success: false,
            message: "Unsupported currency.",
          }, 400);
        }

        const typeParam =
          url.searchParams.get("type") || null;

        const allowedTypes = [
          "premium",
          "boost",
          "advertisement",
        ];

        if (
          typeParam &&
          !allowedTypes.includes(typeParam)
        ) {
          return json({
            success: false,
            message: "Invalid product type.",
          }, 400);
        }

        return json({
          success: true,
          currency,
          products: listProducts({
            type: typeParam,
            currency,
          }),
        });
      } catch (error) {
        console.error(
          "PRODUCT CATALOG ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          message: "Failed to load product catalog.",
        }, 500);
      }
    }

    // GET SUPPORTED CURRENCIES
    if (
      request.method === "GET" &&
      url.pathname === "/api/currencies"
    ) {
      try {
        return json({
          success: true,
          currencies: listCurrencies(),
        });
      } catch (error) {
        console.error(
          "CURRENCY ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          message: "Failed to load currencies.",
        }, 500);
      }
    }

// ================= APPLICATION INDEXES =================
try {
  await ensureIndexes(env);
} catch (error) {
  console.error("APPLICATION INDEX INITIALIZATION ERROR:", error);
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


if (
  request.method === "GET" &&
  url.pathname === "/api/mongodb-ping-test"
) {
  try {
    const startedAt = Date.now();

    const db = await getDatabase(env);

    await db.command({ ping: 1 });

    return json({
      ok: true,
      database: "connected",
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("DB TEST ERROR:", err);

    return json(
      {
        ok: false,
        database: "failed",
        error: err?.message || String(err),
      },
      500
    );
  }
}

// ================= FRESH DATABASE TEST =================

if (
  request.method === "GET" &&
  url.pathname === "/api/fresh-db-test"
) {
  try {
    const startedAt = Date.now();

    return await withFreshDatabase(
      env,
      async (db) => {
        await db.command({ ping: 1 });

        return json({
          ok: true,
          database: "fresh-connected",
          durationMs: Date.now() - startedAt,
        });
      }
    );
  } catch (err) {
    console.error("FRESH DB TEST ERROR:", err);

    return json(
      {
        ok: false,
        database: "fresh-failed",
        error: err?.message || String(err),
        name: err?.name || "UnknownError",
        code: err?.code ?? null,
      },
      500
    );
  }
}

if (
  request.method === "GET" &&
  url.pathname === "/api/posts-db-test"
) {
  try {
    const startedAt = Date.now();

    const db = await getDatabase(env);

    const posts = await db
      .collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return json({
      ok: true,
      database: "connected",
      postsFound: posts.length,
      durationMs: Date.now() - startedAt,
      sampleIds: posts.map((post) =>
        post?._id?.toString()
      ),
    });
  } catch (err) {
    console.error("POSTS DB TEST ERROR:", err);

    return json(
      {
        ok: false,
        database: "failed",
        error: err?.message || String(err),
      },
      500
    );
  }
}


  if (
  request.method === "GET" &&
  url.pathname === "/api/posts-projection-test"
) {
  try {
    const startedAt = Date.now();

    const db = await getDatabase(env);

    console.log("[PROJECTION TEST] database ready");

    const posts = await db
      .collection("posts")
      .find(
        {},
        {
          projection: {
            _id: 1,
            user: 1,
            originalAuthor: 1,
            isSharedPost: 1,
            sharedFrom: 1,
            title: 1,
            content: 1,
            media: 1,
            type: 1,
            isReel: 1,
            feeling: 1,
            location: 1,
            textColor: 1,
            backgroundStyle: 1,
            fontStyle: 1,
            editor: 1,
            taggedFriends: 1,
            tags: 1,
            category: 1,
            shares: 1,
            pinned: 1,
            sponsored: 1,
            sponsor: 1,
            promotionBudget: 1,
            adClicks: 1,
            aiScore: 1,
            viralScore: 1,
            viral: 1,
            multiplier: 1,
            watchTime: 1,
            engagementPoints: 1,
            earnings: 1,
            viewsCount: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log("[PROJECTION TEST] query completed", {
      postsFound: posts.length,
      durationMs: Date.now() - startedAt,
    });

    return json({
      ok: true,
      postsFound: posts.length,
      durationMs: Date.now() - startedAt,
      sampleIds: posts.map(post =>
        post?._id?.toString()
      ),
    });

  } catch (err) {
    console.error(
      "[PROJECTION TEST] ERROR:",
      err
    );

    return json({
      ok: false,
      error: err?.message || String(err),
      name: err?.name || "Error",
    }, 500);
  }
  }

    // ================= WALLET =================

if (
  request.method === "GET" &&
  url.pathname === "/api/wallet"
) {
  try {
    return await withFreshDatabase(
      env,
      async (database) => {
        return await getWallet(
          request,
          env,
          database
        );
      }
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



if (
request.method === "GET" &&
url.pathname === "/api/posts-users-db-test"
) {
try {
  const startedAt = Date.now();

  const db = await getDatabase(env);

  const posts = await db
    .collection("posts")
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const userIds = [
    ...new Set(
      posts
        .flatMap((post) => [
          post.user,
          post.originalAuthor,
          ...(Array.isArray(post.taggedFriends)
            ? post.taggedFriends
            : []),
        ])
        .filter(Boolean)
        .map(String)
        .filter((id) => ObjectId.isValid(id))
    ),
  ];

  const usersStartedAt = Date.now();

  const users = await db
    .collection("users")
    .find({
      _id: {
        $in: userIds.map(
          (id) => new ObjectId(id)
        ),
      },
    })
    .project({
      name: 1,
      profilePic: 1,
      verified: 1,
      verificationBadge: 1,
    })
    .toArray();

  return json({
    ok: true,
    database: "connected",
    postsFound: posts.length,
    userIdsFound: userIds.length,
    usersFound: users.length,
    usersQueryDurationMs:
      Date.now() - usersStartedAt,
    totalDurationMs:
      Date.now() - startedAt,
  });
} catch (err) {
  console.error(
    "POSTS USERS DB TEST ERROR:",
    err
  );

  return json(
    {
      ok: false,
      database: "failed",
      error:
        err?.message ||
        String(err),
    },
    500
  );
}
}




    // ================= WALLET TRANSACTION HISTORY =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/wallet/transactions"
    ) {
      try {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await getTransactions(
              request,
              env,
              database
            );
          }
        );

      } catch (error) {
        console.error(
          error
        );

        return json({
          success: false,
          error: error.message,
        }, 500);
      }
    }


    // ================= ADMIN WALLET ADJUSTMENT HISTORY =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/admin/wallet/history"
    ) {
      try {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await adminAdjustmentHistory(
              request,
              env,
              database
            );
          }
        );

      } catch (error) {
        console.error(
          "ADMIN WALLET ADJUSTMENT HISTORY ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          error: error.message,
        }, 500);
      }
    }

    // ================= ADMIN WALLET USER SEARCH =================

if (
  request.method === "GET" &&
  url.pathname === "/api/admin/wallet/users"
) {
  try {
      return await withFreshDatabase(
        env,
        async (database) => {
          return await adminSearchUsers(
            request,
            env,
            database
          );
        }
      );

  } catch (error) {
    console.error(
      "ADMIN WALLET USER SEARCH ROUTE ERROR:",
      error
    );

    return json({
      success: false,
      error: error.message,
    }, 500);
  }
}

// ================= ADMIN WALLET POINTS =================

    if (
      request.method === "POST" &&
      url.pathname === "/api/admin/wallet/points"
    ) {
      try {
      return await withFreshDatabase(
        env,
        async (database) => {
          return await adminAdjustPoints(
            request,
            env,
            database
          );
        }
      );

      } catch (error) {
        console.error(
          "ADMIN WALLET POINTS ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          error: error.message,
        }, 500);
      }
    }


    // ================= WALLET CONVERSION =================

    if (
      request.method === "POST" &&
      url.pathname === "/api/wallet/convert"
    ) {
      try {
      return await withFreshDatabase(
        env,
        async (database) => {
          return await convertPoints(
            request,
            env,
            database
          );
        }
      );

      } catch (error) {
        console.error(
          "WALLET CONVERSION ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          error: error.message,
        }, 500);
      }
    }


    // ================= IMAGEKIT =================

if (
  request.method === "GET" &&
  url.pathname === "/api/imagekit/auth"
) {
  return await imageKitAuth(
    request,
    env
  );
}


/* ============================================================
   KYC ROUTES
   ============================================================ */

if (
  request.method === "GET" &&
  pathname === "/api/kyc/me"
) {
  return getMyKycStatus(request, env);
}

if (
  request.method === "POST" &&
  pathname === "/api/kyc/upload-signature"
) {
  return createKycUploadSignature(
    request,
    env
  );
}

if (
  request.method === "POST" &&
  pathname === "/api/kyc/submit"
) {
  return submitKyc(request, env);
}

/* ============================================================
   ADMIN KYC ROUTES
   ============================================================ */

if (
  request.method === "GET" &&
  pathname === "/api/admin/kyc/pending"
) {
  return getPendingKyc(request, env);
}

if (
  request.method === "GET" &&
  pathname.startsWith("/api/admin/kyc/")
) {
  const parts = pathname.split("/").filter(Boolean);

  /*
   * /api/admin/kyc/:userId
   */

  if (
    parts.length === 4 &&
    ObjectId.isValid(parts[3])
  ) {
    return getAdminKyc(
      request,
      env,
      parts[3]
    );
  }
}

if (
  request.method === "POST" &&
  pathname.startsWith("/api/admin/kyc/")
) {
  const parts = pathname.split("/").filter(Boolean);

  /*
   * /api/admin/kyc/:userId/approve
   */

  if (
    parts.length === 5 &&
    ObjectId.isValid(parts[3]) &&
    parts[4] === "approve"
  ) {
    return approveKyc(
      request,
      env,
      parts[3]
    );
  }

  /*
   * /api/admin/kyc/:userId/reject
   */

  if (
    parts.length === 5 &&
    ObjectId.isValid(parts[3]) &&
    parts[4] === "reject"
  ) {
    return rejectKyc(
      request,
      env,
      parts[3]
    );
  }
}
  // ================= USERS =================

// GET USER PROFILE
if (
  request.method === "GET" &&
  url.pathname.startsWith("/api/users/")
) {
  const parts =
    url.pathname.split("/").filter(Boolean);

  // /api/users/:userId/mutual
  if (
    parts.length === 4 &&
    parts[3] === "mutual"
  ) {
    const userId = parts[2];

    return await withFreshDatabase(
      env,
      async (database) => {
        return await getMutualFriends(
          request,
          env,
          database,
          userId
        );
      }
    );
  }

  // /api/users/:userId
  if (parts.length === 3) {
    const userId = parts[2];

    return await withFreshDatabase(
      env,
      async (database) => {
        return await getUser(
          request,
          env,
          database,
          userId
        );
      }
    );
  }
}


// UPDATE USER PROFILE
if (
  request.method === "PUT" &&
  url.pathname.startsWith("/api/users/")
) {
  const parts =
    url.pathname.split("/").filter(Boolean);

  if (parts.length === 3) {
    const userId = parts[2];

    return await withFreshDatabase(
      env,
      async (database) => {
        return await updateUser(
          request,
          env,
          database,
          userId
        );
      }
    );
  }
}



    // ================= USERS =================

    // GET ALL USERS
    if (
      request.method === "GET" &&
      url.pathname === "/api/users"
    ) {
      const database = await getDatabase(env);

      return await getUsers(
        request,
        env,
        database
      );
    }

    // GET FOLLOWERS
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/users/") &&
      url.pathname.endsWith("/followers")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        const userId = parts[2];

        return await withFreshDatabase(
          env,
          async (database) => {
            return await getFollowers(
              request,
              env,
              database,
              userId
            );
          }
        );
      }
    }

    // GET FOLLOWING
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/users/") &&
      url.pathname.endsWith("/following")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        const userId = parts[2];

        return await withFreshDatabase(
          env,
          async (database) => {
            return await getFollowing(
              request,
              env,
              database,
              userId
            );
          }
        );
      }
    }

    // FOLLOW / UNFOLLOW
    if (
      request.method === "PUT" &&
      url.pathname.startsWith("/api/users/") &&
      url.pathname.endsWith("/follow")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        const userId = parts[2];
        const database = await getDatabase(env);

        return await toggleFollow(
          request,
          env,
          database,
          userId
        );
      }
    }

    // ================= FRIENDS =================

    // SEND FRIEND REQUEST
    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/friends/request/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        const userId = parts[3];
        const database = await getDatabase(env);

        return await sendFriendRequest(
          request,
          env,
          database,
          userId
        );
      }
    }

    // GET FRIEND REQUESTS
    if (
      request.method === "GET" &&
      url.pathname === "/api/friends/requests"
    ) {
      const database = await getDatabase(env);

      return await getFriendRequests(
        request,
        env,
        database
      );
    }

    // ACCEPT FRIEND REQUEST
    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/friends/accept/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        const userId = parts[3];
        const database = await getDatabase(env);

        return await acceptFriendRequest(
          request,
          env,
          database,
          userId
        );
      }
    }

    // FRIEND SUGGESTIONS
    if (
      request.method === "GET" &&
      url.pathname === "/api/friends/suggestions"
    ) {
      const database = await getDatabase(env);

      return await getFriendSuggestions(
        request,
        env,
        database
      );
    }

    // FRIEND LIST
    if (
      request.method === "GET" &&
      url.pathname === "/api/friends/list"
    ) {
      const database = await getDatabase(env);

      return await getFriendList(
        request,
        env,
        database
      );
    }

    // FRIEND CONTACT SYNC
    if (
      request.method === "POST" &&
      url.pathname === "/api/friends/sync-contacts"
    ) {
      const database = await getDatabase(env);

      return await syncFriendContacts(
        request,
        env,
        database
      );
    }

    // ================= CONTACTS =================

    if (
      request.method === "POST" &&
      url.pathname === "/api/contacts/sync"
    ) {
      const database = await getDatabase(env);

      return await syncContacts(
        request,
        env,
        database
      );
    }

    // ================= NOTIFICATIONS =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/notifications"
    ) {
      return getNotifications(request, env);
    }

    if (
      request.method === "PUT" &&
      url.pathname === "/api/notifications/read"
    ) {
      return markNotificationsRead(request, env);
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/notifications/unread-count"
    ) {
      return getUnreadNotificationCount(request, env);
    }

    // ================= STORIES =================

if (
  request.method === "GET" &&
  url.pathname === "/api/stories/feed/foryou"
) {
  return getStoryFeed(request, env);
}

if (
  request.method === "POST" &&
  (
    url.pathname === "/api/stories" ||
    url.pathname === "/api/storyR2"
  )
) {
  return createStory(request, env);
}

if (
  request.method === "GET" &&
  url.pathname === "/api/stories"
) {
  return getStories(request, env);
}

if (
  request.method === "POST" &&
  url.pathname.startsWith("/api/stories/view/")
) {
  return viewStory(request, env);
}

if (
  request.method === "POST" &&
  url.pathname.startsWith("/api/stories/react/")
) {
  return reactToStory(request, env);
}

if (
  request.method === "POST" &&
  url.pathname.startsWith("/api/stories/share/")
) {
  return shareStory(request, env);
}

if (
  request.method === "POST" &&
  url.pathname.startsWith("/api/stories/reply/")
) {
  return replyToStory(request, env);
}

if (
  request.method === "POST" &&
  url.pathname.startsWith("/api/stories/like/")
) {
  return likeStory(request, env);
}


if (
  request.method === "GET" &&
  url.pathname.startsWith("/api/stories/analytics/")
) {
  return getStoryAnalytics(request, env);
}

if (
  request.method === "PUT" &&
  url.pathname.startsWith("/api/stories/") &&
  url.pathname.endsWith("/like")
) {
  return likeStory(request, env);
}

if (
  request.method === "PUT" &&
  url.pathname.startsWith("/api/stories/") &&
  url.pathname.endsWith("/view")
) {
  return markStoryViewed(request, env);
}

// ================= POSTS =================

    // CREATE POST
    if (
      request.method === "POST" &&
      url.pathname === "/api/posts"
    ) {
      return await createPost(request, env);
    }

    // GET REELS
    if (
      request.method === "GET" &&
      url.pathname === "/api/posts/reels"
    ) {
      return await getReels(request, env);
    }

    // CREATE REEL
    if (
      request.method === "POST" &&
      url.pathname === "/api/posts/reels"
    ) {
      return await createReel(request, env);
    }

    // GET SAVED POSTS
    if (
      request.method === "GET" &&
      url.pathname === "/api/posts/saved/all"
    ) {
      return await getSavedPosts(request, env);
    }

    // GET TRENDING POSTS
    if (
      request.method === "GET" &&
      url.pathname === "/api/posts/trending"
    ) {
      return await getTrending(request, env);
    }

    // GET USER POSTS
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/posts/user/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        return await getUserPosts(
          request,
          env,
          parts[3]
        );
      }
    }

    // VIEW REEL
    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/posts/reels/view/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 5) {
        return await viewReel(
          request,
          env,
          parts[4]
        );
      }
    }

    // POST-SPECIFIC ROUTES
    if (
      url.pathname.startsWith("/api/posts/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      // Expected:
      // /api/posts/:id/action
      // parts = ["api", "posts", "id", "action"]

      if (parts.length === 4) {
        const postId = parts[2];
        const action = parts[3];

        if (
          request.method === "POST" &&
          action === "like"
        ) {
          return await likePost(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "POST" &&
          action === "share"
        ) {
          return await sharePost(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "POST" &&
          action === "view"
        ) {
          return await viewPost(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "POST" &&
          action === "comment"
        ) {
          return await commentPost(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "POST" &&
          action === "share-to-feed"
        ) {
          return await sharePostToFeed(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "PUT" &&
          action === "save"
        ) {
          return await savePost(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "PUT" &&
          action === "edit"
        ) {
          return await editPost(
            request,
            env,
            postId
          );
        }

        if (
          request.method === "DELETE" &&
          action === "delete"
        ) {
          return await deletePost(
            request,
            env,
            postId
          );
        }
      }

      // GET /api/posts/:id
      if (
        request.method === "GET" &&
        parts.length === 3
      ) {
        return await getPost(
          request,
          env,
          parts[2]
        );
      }

      // PUT /api/posts/:id
      if (
        request.method === "PUT" &&
        parts.length === 3
      ) {
        return await editPost(
          request,
          env,
          parts[2]
        );
      }

      // DELETE /api/posts/:id
      if (
        request.method === "DELETE" &&
        parts.length === 3
      ) {
        return await deletePost(
          request,
          env,
          parts[2]
        );
      }
    }

    // GET ALL POSTS / MAIN FEED
    if (
      request.method === "GET" &&
      url.pathname === "/api/posts"
    ) {
      return await getPosts(request, env);
    }

    // ================= MARKETPLACE CACHED DB TEST =================

if (
  request.method === "GET" &&
  url.pathname === "/api/marketplace-cached-db-test"
) {
  try {
    const startedAt = Date.now();

    const db = await getDatabase(env);

    const listings = await db
      .collection("marketplaces")
      .find({ status: "Available" })
      .limit(1)
      .toArray();

    return json({
      ok: true,
      database: "cached-connected",
      collection: "marketplaces",
      listingsFound: listings.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("MARKETPLACE CACHED DB TEST ERROR:", err);

    return json(
      {
        ok: false,
        database: "cached-failed",
        error: err?.message || String(err),
        name: err?.name || "UnknownError",
        code: err?.code ?? null,
      },
      500
    );
  }
}



// ================= MARKETPLACE COLLECTION TEST =================
if (
  request.method === "GET" &&
  url.pathname === "/api/marketplace-collection-test"
) {
  try {
    const startedAt = Date.now();

    const db = await getDatabase(env);

    const collections =
      await db
        .listCollections({
          name: "marketplaces",
        })
        .toArray();

    return json({
      ok: true,
      collectionExists: collections.length > 0,
      collectionsFound: collections.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error(
      "MARKETPLACE COLLECTION TEST ERROR:",
      err
    );

    return json(
      {
        ok: false,
        error: err?.message || String(err),
        name: err?.name || "UnknownError",
        code: err?.code ?? null,
      },
      500
    );
  }
}

// ================= MARKETPLACE COUNT TEST =================
if (
  request.method === "GET" &&
  url.pathname === "/api/marketplace-count-test"
) {
  try {
    const startedAt = Date.now();

    const db = await getDatabase(env);

    const total =
      await db
        .collection("marketplaces")
        .countDocuments({});

    return json({
      ok: true,
      database: "cached-connected",
      collection: "marketplaces",
      total,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error(
      "MARKETPLACE COUNT TEST ERROR:",
      err
    );

    return json(
      {
        ok: false,
        database: "cached-failed",
        error: err?.message || String(err),
        name: err?.name || "UnknownError",
        code: err?.code ?? null,
      },
      500
    );
  }
}

// ================= MARKETPLACE DB TEST =================

if (
  request.method === "GET" &&
  url.pathname === "/api/marketplace-db-test"
) {
  try {
    const startedAt = Date.now();

    return await withFreshDatabase(
      env,
      async (db) => {
        const collection = db.collection("marketplaces");

        const listings = await collection
          .find({ status: "Available" })
          .limit(1)
          .toArray();

        return json({
          ok: true,
          database: "connected",
          collection: "marketplaces",
          listingsFound: listings.length,
          durationMs: Date.now() - startedAt,
        });
      }
    );
  } catch (err) {
    console.error("MARKETPLACE DB TEST ERROR:", err);

    return json(
      {
        ok: false,
        database: "failed",
        error: err?.message || String(err),
        name: err?.name || "UnknownError",
        code: err?.code ?? null,
      },
      500
    );
  }
}

// ================= MARKETPLACE =================

    // GET MY LISTINGS
    if (
      request.method === "GET" &&
      url.pathname === "/api/marketplace/me"
    ) {
      try {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await getMyListings(
              request,
              env,
              database
            );
          }
        );
      } catch (error) {
        console.error(
          "MARKETPLACE MY LISTINGS ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          message: "Failed to load your listings.",
        }, 500);
      }
    }

    // GET SAVED LISTINGS
    if (
      request.method === "GET" &&
      url.pathname === "/api/marketplace/saved/me"
    ) {
      try {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await getSavedListings(
              request,
              env,
              database
            );
          }
        );
      } catch (error) {
        console.error(
          "MARKETPLACE SAVED LISTINGS ROUTE ERROR:",
          error
        );

        return json({
          success: false,
          message: "Failed to load saved listings.",
        }, 500);
      }
    }

    // SAVE / UNSAVE LISTING
    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/marketplace/") &&
      url.pathname.endsWith("/save")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 4) {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await toggleSaveListing(
              request,
              env,
              database,
              parts[2]
            );
          }
        );
      }
    }

    // GET ALL LISTINGS
    if (
      request.method === "GET" &&
      url.pathname === "/api/marketplace"
    ) {
      return await withFreshDatabase(
        env,
        async (database) => {
          return await getListings(
            request,
            env,
            database
          );
        }
      );
    }

    // CREATE LISTING
    if (
      request.method === "POST" &&
      url.pathname === "/api/marketplace"
    ) {
      return await withFreshDatabase(
        env,
        async (database) => {
          return await createListing(
            request,
            env,
            database
          );
        }
      );
    }

    // UPDATE LISTING
    if (
      request.method === "PUT" &&
      url.pathname.startsWith("/api/marketplace/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 3) {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await updateListing(
              request,
              env,
              database,
              parts[2]
            );
          }
        );
      }
    }

    // DELETE LISTING
    if (
      request.method === "DELETE" &&
      url.pathname.startsWith("/api/marketplace/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 3) {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await deleteListing(
              request,
              env,
              database,
              parts[2]
            );
          }
        );
      }
    }

    // GET SINGLE LISTING
    // Keep this LAST because /me and /saved/me
    // must not be interpreted as listing IDs.
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/marketplace/")
    ) {
      const parts =
        url.pathname.split("/").filter(Boolean);

      if (parts.length === 3) {
        return await withFreshDatabase(
          env,
          async (database) => {
            return await getListing(
              request,
              env,
              database,
              parts[2]
            );
          }
        );
      }
    }

    // ================= LEADERBOARD =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/leaderboard/top"
    ) {
      try {
      return await withFreshDatabase(
        env,
        async (database) => {
          return await getLeaderboardTop(
            request,
            env,
            database
          );
        }
      );

      } catch (error) {
        console.error(
          "LEADERBOARD ROUTE ERROR:",
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
}

export { SocketRoom };
