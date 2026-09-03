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

export async function syncContacts(
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

    if (
      !contacts ||
      !Array.isArray(contacts)
    ) {
      return json({
        message: "Invalid contacts",
      }, 400);
    }

    const phones =
      contacts
        .map(c => c?.phone)
        .filter(Boolean);

    await db.collection("users").updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          contacts,
          updatedAt: new Date(),
        },
      }
    );

    const matchedUsers =
      phones.length
        ? await db.collection("users")
            .find({
              phone: {
                $in: phones,
              },
            })
            .project({
              _id: 1,
              name: 1,
              profilePic: 1,
              phone: 1,
            })
            .toArray()
        : [];

    return json({
      message:
        "Contacts synced successfully",
      matchedUsers,
    });

  } catch (error) {
    console.error(
      "SYNC CONTACTS ERROR:",
      error
    );

    return json({
      message: error.message,
    }, 500);
  }
}
