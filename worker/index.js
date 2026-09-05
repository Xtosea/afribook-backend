import {
  register,
  login,
} from "./routes/auth.js";

import {
  getWallet,
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
  imageKitAuth,
} from "./routes/imagekit.js";
import { getDatabase } from "./utils/db.js";

import {
  getLeaderboardTop,
} from "./routes/leaderboard.js";


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

    const database =
      await getDatabase(env);

    return await getMutualFriends(
      request,
      env,
      database,
      userId
    );
  }

  // /api/users/:userId
  if (parts.length === 3) {
    const userId = parts[2];

    const database =
      await getDatabase(env);

    return await getUser(
      request,
      env,
      database,
      userId
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

    const database =
      await getDatabase(env);

    return await updateUser(
      request,
      env,
      database,
      userId
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
        const database = await getDatabase(env);

        return await getFollowers(
          request,
          env,
          database,
          userId
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
        const database = await getDatabase(env);

        return await getFollowing(
          request,
          env,
          database,
          userId
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

    // ================= LEADERBOARD =================

    if (
      request.method === "GET" &&
      url.pathname === "/api/leaderboard/top"
    ) {
      try {
        const database = await getDatabase(env);

        return await getLeaderboardTop(
          request,
          env,
          database
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
  },
};
