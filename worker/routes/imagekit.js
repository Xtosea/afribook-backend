import crypto from "crypto";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders(),
  });
}

export async function imageKitAuth(request, env) {
  try {
    if (!env.IMAGEKIT_PRIVATE_KEY) {
      return json(
        {
          error:
            "IMAGEKIT_PRIVATE_KEY is not configured",
        },
        500
      );
    }

    const token = crypto.randomUUID();

    const expire =
      Math.floor(Date.now() / 1000) + 3600;

    const data = `${token}${expire}`;

    const signature = crypto
      .createHmac(
        "sha1",
        env.IMAGEKIT_PRIVATE_KEY
      )
      .update(data)
      .digest("hex");

    return json({
      token,
      expire,
      signature,
    });
  } catch (error) {
    console.error(
      "IMAGEKIT AUTH ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "ImageKit authentication failed",
      },
      500
    );
  }
}
