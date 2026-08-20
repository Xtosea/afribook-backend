import { ObjectId } from "mongodb";

function json(data, status = 200) {
  return Response.json(data, { status });
}


/* ================= TOKEN ================= */

function getToken(request) {
  const authorization =
    request.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

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


/* ================= BASE64URL ================= */

function base64UrlDecode(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    base64 +
    "=".repeat(
      (4 - (base64.length % 4)) % 4
    );

  return atob(padded);
}


/* ================= VERIFY JWT ================= */

async function verifyJWT(token, secret) {

  if (!token) {
    throw new Error("Authentication required");
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

  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
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
      encoder.encode(
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

  return payload;
}


/* ================= AUTH ================= */

async function authenticate(request, env) {

  if (!env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured"
    );
  }

  const token =
    getToken(request);

  const payload =
    await verifyJWT(
      token,
      env.JWT_SECRET
    );

  if (!payload.id) {
    throw new Error(
      "Invalid authentication token"
    );
  }

  if (!ObjectId.isValid(payload.id)) {
    throw new Error(
      "Invalid user ID"
    );
  }

  return new ObjectId(payload.id);
}


/* ================= PUBLIC USER FIELDS ================= */

function cleanUser(user) {

  if (!user) {
    return null;
  }

  const {
    password,
    verifyToken,
    verifyTokenExpiry,
    resetToken,
    resetTokenExpiry,
    ...safeUser
  } = user;

  return {
    ...safeUser,

    _id: user._id,

    email: user.email || "",
    phone: user.phone || "",

    profilePic:
      user.profilePic || "",

    coverPhoto:
      user.coverPhoto || "",

    bio:
      user.bio || "",

    intro:
      user.intro || "",

    followers:
      user.followers || [],

    following:
      user.following || [],

    friends:
      user.friends || [],
  };
}


/* ================= POPULATE USER IDS ================= */

async function populateUsers(
  db,
  ids
) {

  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const validIds =
    ids
      .filter(id => ObjectId.isValid(id))
      .map(id =>
        id instanceof ObjectId
          ? id
          : new ObjectId(id)
      );

  if (!validIds.length) {
    return [];
  }

  return await db
    .collection("users")
    .find({
      _id: {
        $in: validIds,
      },
    })
    .project({
      password: 0,
      verifyToken: 0,
      verifyTokenExpiry: 0,
      resetToken: 0,
      resetTokenExpiry: 0,
      name: 1,
      profilePic: 1,
      coverPhoto: 1,
    })
    .toArray();
}


/* ================= GET USER PROFILE ================= */

export async function getUser(
  request,
  env,
  db,
  userId
) {

  try {

    if (!ObjectId.isValid(userId)) {
      return json({
        error: "Invalid user ID",
      }, 400);
    }

    const user =
      await db
        .collection("users")
        .findOne({
          _id: new ObjectId(userId),
        });

    if (!user) {
      return json({
        error: "User not found",
      }, 404);
    }

    const result =
      cleanUser(user);


    /* ================= FOLLOWERS ================= */

    result.followers =
      await populateUsers(
        db,
        user.followers || []
      );


    /* ================= FOLLOWING ================= */

    result.following =
      await populateUsers(
        db,
        user.following || []
      );


    /* ================= FRIENDS ================= */

    result.friends =
      await populateUsers(
        db,
        user.friends || []
      );


    return json(result);

  } catch (error) {

    console.error(
      "GET USER ERROR:",
      error
    );

    return json({
      error: error.message,
    }, 500);
  }
}


/* ================= MUTUAL FRIENDS ================= */

export async function getMutualFriends(
  request,
  env,
  db,
  userId
) {

  try {

    const currentUserId =
      await authenticate(
        request,
        env
      );

    if (!ObjectId.isValid(userId)) {
      return json({
        error: "Invalid user ID",
      }, 400);
    }

    const otherUserId =
      new ObjectId(userId);


    const [
      currentUser,
      otherUser,
    ] = await Promise.all([

      db.collection("users").findOne(
        {
          _id: currentUserId,
        },
        {
          projection: {
            following: 1,
          },
        }
      ),

      db.collection("users").findOne(
        {
          _id: otherUserId,
        },
        {
          projection: {
            following: 1,
          },
        }
      ),

    ]);


    if (!currentUser || !otherUser) {
      return json({
        error: "User not found",
      }, 404);
    }


    const currentFollowing =
      (currentUser.following || [])
        .map(id => id.toString());

    const otherFollowing =
      (otherUser.following || [])
        .map(id => id.toString());


    const mutualIds =
      currentFollowing.filter(
        id =>
          otherFollowing.includes(id)
      );


    if (!mutualIds.length) {
      return json([]);
    }


    const mutualUsers =
      await populateUsers(
        db,
        mutualIds
      );


    return json(mutualUsers);

  } catch (error) {

    console.error(
      "GET MUTUAL FRIENDS ERROR:",
      error
    );

    if (
      error.message ===
        "Authentication required" ||
      error.message ===
        "Invalid token" ||
      error.message ===
        "Token expired" ||
      error.message ===
        "Invalid user ID"
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


/* ================= UPDATE PROFILE ================= */

export async function updateUser(
  request,
  env,
  db,
  userId
) {

  try {

    const currentUserId =
      await authenticate(
        request,
        env
      );


    if (!ObjectId.isValid(userId)) {
      return json({
        error: "Invalid user ID",
      }, 400);
    }


    const targetUserId =
      new ObjectId(userId);


    /* ================= AUTHORIZATION ================= */

    if (
      currentUserId.toString() !==
      targetUserId.toString()
    ) {

      return json({
        error: "Unauthorized",
      }, 403);

    }


    const body =
      await request.json();


    /* ================= ALLOWED FIELDS ================= */

    const allowedFields = [
      "name",
      "bio",
      "intro",
      "dob",
      "phone",
      "education",
      "origin",
      "maritalStatus",
      "spouse",
      "gender",
      "email",
      "hubby",
      "profilePic",
      "coverPhoto",
    ];


    const updates = {};


    for (const field of allowedFields) {

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {

        updates[field] =
          body[field];

      }

    }


    /* ================= NORMALIZE ================= */

    if (
      typeof updates.name ===
      "string"
    ) {
      updates.name =
        updates.name.trim();
    }


    if (
      typeof updates.email ===
      "string"
    ) {
      updates.email =
        updates.email
          .trim()
          .toLowerCase();
    }


    if (
      typeof updates.phone ===
      "string"
    ) {
      updates.phone =
        updates.phone.trim();
    }


    updates.updatedAt =
      new Date();


    /* ================= UPDATE ================= */

    await db
      .collection("users")
      .updateOne(
        {
          _id: targetUserId,
        },
        {
          $set: updates,
        }
      );


    /* ================= GET UPDATED USER ================= */

    const updatedUser =
      await db
        .collection("users")
        .findOne({
          _id: targetUserId,
        });


    if (!updatedUser) {
      return json({
        error: "User not found",
      }, 404);
    }


    return json(
      cleanUser(updatedUser)
    );


  } catch (error) {

    console.error(
      "UPDATE USER ERROR:",
      error
    );


    if (
      error.message ===
        "Authentication required" ||
      error.message ===
        "Invalid token" ||
      error.message ===
        "Token expired" ||
      error.message ===
        "Invalid user ID"
    ) {

      return json({
        error: error.message,
      }, 401);

    }


    /* ================= DUPLICATE EMAIL/PHONE ================= */

    if (
      error.code === 11000
    ) {

      return json({
        error:
          "Email or phone number already exists",
      }, 400);

    }


    return json({
      error: error.message,
    }, 500);

  }
}