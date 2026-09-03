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
  const authorization =
    request.headers.get("Authorization");

  if (!authorization) return null;

  const parts =
    authorization.trim().split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0] !== "Bearer"
  ) {
    return null;
  }

  return parts[1];
}

function base64UrlDecode(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return atob(
    base64 +
    "=".repeat(
      (4 - (base64.length % 4)) % 4
    )
  );
}

async function authenticate(request, env) {
  const token = getToken(request);

  if (!token) {
    throw new Error("Authentication required");
  }

  if (!env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured"
    );
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }

  const [
    encodedHeader,
    encodedPayload,
    encodedSignature,
  ] = parts;

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        env.JWT_SECRET
      ),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

  const signature =
    Uint8Array.from(
      base64UrlDecode(encodedSignature),
      char => char.charCodeAt(0)
    );

  const valid =
    await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(
        `${encodedHeader}.${encodedPayload}`
      )
    );

  if (!valid) {
    throw new Error("Invalid token");
  }

  const payload =
    JSON.parse(
      base64UrlDecode(encodedPayload)
    );

  if (
    payload.exp &&
    payload.exp <
      Math.floor(Date.now() / 1000)
  ) {
    throw new Error("Token expired");
  }

  if (
    !payload.id ||
    !ObjectId.isValid(payload.id)
  ) {
    throw new Error(
      "Invalid authentication token"
    );
  }

  return new ObjectId(payload.id);
}

/* ================= SEND FRIEND REQUEST ================= */

export async function sendFriendRequest(
  request,
  env,
  db,
  receiverId
) {
  try {
    const senderId =
      await authenticate(request, env);

    if (!ObjectId.isValid(receiverId)) {
      return json({
        error: "Invalid user ID",
      }, 400);
    }

    const targetId =
      new ObjectId(receiverId);

    if (
      senderId.toString() ===
      targetId.toString()
    ) {
      return json({
        error: "Cannot add yourself",
      }, 400);
    }

    const [
      sender,
      receiver,
    ] = await Promise.all([
      db.collection("users").findOne({
        _id: senderId,
      }),
      db.collection("users").findOne({
        _id: targetId,
      }),
    ]);

    if (!receiver) {
      return json({
        error: "User not found",
      }, 404);
    }

    if (!sender) {
      return json({
        error: "User not found",
      }, 404);
    }

    const requests =
      (receiver.friendRequests || [])
        .map(id => id.toString());

    if (
      requests.includes(
        senderId.toString()
      )
    ) {
      return json({
        error: "Request already sent",
      }, 400);
    }

    await db.collection("users").updateOne(
      { _id: targetId },
      {
        $addToSet: {
          friendRequests: senderId,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("users").updateOne(
      { _id: senderId },
      {
        $addToSet: {
          sentRequests: targetId,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("notifications").insertOne({
      recipient: targetId,
      sender: senderId,
      senders: [senderId],
      count: 1,
      type: "FRIEND_REQUEST",
      text: "sent you a friend request",
      post: null,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return json({
      message: "Friend request sent",
    });

  } catch (error) {
    console.error(
      "SEND FRIEND REQUEST ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}

/* ================= GET REQUESTS ================= */

export async function getFriendRequests(
  request,
  env,
  db
) {
  try {
    const userId =
      await authenticate(request, env);

    const user =
      await db.collection("users").findOne(
        {
          _id: userId,
        },
        {
          projection: {
            friendRequests: 1,
          },
        }
      );

    if (!user) {
      return json({
        error: "User not found",
      }, 404);
    }

    const ids =
      user.friendRequests || [];

    if (!ids.length) {
      return json([]);
    }

    const users =
      await db.collection("users")
        .find({
          _id: {
            $in: ids,
          },
        })
        .project({
          _id: 1,
          name: 1,
          profilePic: 1,
        })
        .toArray();

    return json(users);

  } catch (error) {
    console.error(
      "GET FRIEND REQUESTS ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}

/* ================= ACCEPT REQUEST ================= */

export async function acceptFriendRequest(
  request,
  env,
  db,
  requesterId
) {
  try {
    const currentUserId =
      await authenticate(request, env);

    if (!ObjectId.isValid(requesterId)) {
      return json({
        error: "Invalid user ID",
      }, 400);
    }

    const requesterObjectId =
      new ObjectId(requesterId);

    const [
      currentUser,
      requester,
    ] = await Promise.all([
      db.collection("users").findOne({
        _id: currentUserId,
      }),
      db.collection("users").findOne({
        _id: requesterObjectId,
      }),
    ]);

    if (!currentUser || !requester) {
      return json({
        error: "User not found",
      }, 404);
    }

    await db.collection("users").updateOne(
      { _id: currentUserId },
      {
        $addToSet: {
          friends: requesterObjectId,
        },
        $pull: {
          friendRequests: requesterObjectId,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("users").updateOne(
      { _id: requesterObjectId },
      {
        $addToSet: {
          friends: currentUserId,
        },
        $pull: {
          sentRequests: currentUserId,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("notifications").insertOne({
      recipient: requesterObjectId,
      sender: currentUserId,
      senders: [currentUserId],
      count: 1,
      type: "FRIEND_ACCEPT",
      text: "accepted your friend request",
      post: null,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return json({
      message: "Friend request accepted",
    });

  } catch (error) {
    console.error(
      "ACCEPT FRIEND REQUEST ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}

/* ================= SUGGESTIONS ================= */

export async function getFriendSuggestions(
  request,
  env,
  db
) {
  try {
    const currentUserId =
      await authenticate(request, env);

    const currentUser =
      await db.collection("users").findOne({
        _id: currentUserId,
      });

    if (!currentUser) {
      return json({
        error: "User not found",
      }, 404);
    }

    const excludedIds = [
      currentUserId,
      ...(currentUser.friends || []),
      ...(currentUser.sentRequests || []),
      ...(currentUser.friendRequests || []),
    ];

    const users =
      await db.collection("users")
        .find({
          _id: {
            $nin: excludedIds,
          },
        })
        .project({
          _id: 1,
          name: 1,
          profilePic: 1,
          bio: 1,
        })
        .sort({
          createdAt: -1,
        })
        .limit(50)
        .toArray();

    return json(users);

  } catch (error) {
    console.error(
      "SUGGESTIONS ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}

/* ================= FRIEND LIST ================= */

export async function getFriendList(
  request,
  env,
  db
) {
  try {
    const currentUserId =
      await authenticate(request, env);

    const user =
      await db.collection("users").findOne(
        {
          _id: currentUserId,
        },
        {
          projection: {
            friends: 1,
          },
        }
      );

    if (!user) {
      return json({
        error: "User not found",
      }, 404);
    }

    const friends =
      user.friends || [];

    if (!friends.length) {
      return json([]);
    }

    const users =
      await db.collection("users")
        .find({
          _id: {
            $in: friends,
          },
        })
        .project({
          _id: 1,
          name: 1,
          profilePic: 1,
          bio: 1,
        })
        .toArray();

    return json(users);

  } catch (error) {
    console.error(
      "GET FRIEND LIST ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}

/* ================= SYNC FRIEND CONTACTS ================= */

export async function syncFriendContacts(
  request,
  env,
  db
) {
  try {
    const userId =
      await authenticate(request, env);

    const body =
      await request.json();

    const contacts =
      body.contacts;

    if (!Array.isArray(contacts)) {
      return json({
        error: "Invalid contacts",
      }, 400);
    }

    const phones =
      contacts
        .map(c =>
          typeof c === "string"
            ? c
            : c?.phone
        )
        .filter(Boolean);

    const users =
      await db.collection("users")
        .find({
          phone: {
            $in: phones,
          },
        })
        .project({
          _id: 1,
          name: 1,
          profilePic: 1,
        })
        .toArray();

    return json(users);

  } catch (error) {
    console.error(
      "SYNC FRIEND CONTACTS ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}
