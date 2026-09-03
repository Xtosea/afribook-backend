import { ObjectId } from "mongodb";

function base64UrlDecode(input) {
  const base64 = input
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  return atob(padded);
}

export function getToken(request) {
  const authHeader = request.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Authentication required");
  }

  return authHeader.slice(7);
}

export async function verifyJWT(token, secret) {
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

export async function authenticate(request, env) {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = getToken(request);

  const payload = await verifyJWT(
    token,
    env.JWT_SECRET
  );

  if (!payload.id) {
    throw new Error("Invalid authentication token");
  }

  if (!ObjectId.isValid(payload.id)) {
    throw new Error("Invalid user ID");
  }

  return new ObjectId(payload.id);
}
