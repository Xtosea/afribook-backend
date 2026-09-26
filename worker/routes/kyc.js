import { ObjectId } from "mongodb";
import { getDatabase } from "../utils/db.js";

/* ============================================================
   CORS
   ============================================================ */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
  };
}

/* ============================================================
   JSON
   ============================================================ */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

/* ============================================================
   JWT
   ============================================================ */

function getToken(request) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  return auth.slice(7);
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");

  while (str.length % 4) {
    str += "=";
  }

  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function verifyJWT(token, secret) {
  try {
    if (!token || !secret) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;

    const data = new TextEncoder().encode(
      `${header}.${payload}`
    );

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      data
    );

    if (!valid) {
      return null;
    }

    return JSON.parse(
      new TextDecoder().decode(
        base64UrlDecode(payload)
      )
    );
  } catch (error) {
    console.error("JWT VERIFY ERROR:", error);
    return null;
  }
}

/* ============================================================
   AUTHENTICATE USER
   ============================================================ */

async function authenticate(request, env, db) {
  const token = getToken(request);

  if (!token) {
    return null;
  }

  const payload = await verifyJWT(
    token,
    env.JWT_SECRET || env.JWT_KEY
  );

  if (!payload) {
    return null;
  }

  const userId =
    payload.id ||
    payload._id ||
    payload.userId ||
    payload.sub;

  if (!userId || !ObjectId.isValid(userId)) {
    return null;
  }

  const user = await db.collection("users").findOne(
    {
      _id: new ObjectId(userId),
    },
    {
      projection: {
        password: 0,
        verifyToken: 0,
        verifyTokenExpiry: 0,
        resetToken: 0,
        resetTokenExpiry: 0,
      },
    }
  );

  return user || null;
}

/* ============================================================
   ADMIN AUTHENTICATION
   ============================================================ */

async function authenticateAdmin(request, env, db) {
  const user = await authenticate(request, env, db);

  if (!user) {
    return {
      user: null,
      error: json(
        { error: "Authentication required" },
        401
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      user: null,
      error: json(
        { error: "Admin access required" },
        403
      ),
    };
  }

  return {
    user,
    error: null,
  };
}

/* ============================================================
   SHA-1 HEX
   Cloudinary upload signatures use SHA-1.
   ============================================================ */

async function sha1Hex(value) {
  const data = new TextEncoder().encode(value);

  const hash = await crypto.subtle.digest(
    "SHA-1",
    data
  );

  return Array.from(new Uint8Array(hash))
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

/* ============================================================
   CLOUDINARY SIGNATURE
   ============================================================ */

async function createCloudinarySignature(
  params,
  apiSecret
) {
  const entries = Object.entries(params)
    .filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
    .sort(([a], [b]) =>
      a.localeCompare(b)
    );

  const paramString = entries
    .map(
      ([key, value]) =>
        `${key}=${String(value)}`
    )
    .join("&");

  return sha1Hex(
    `${paramString}${apiSecret}`
  );
}

/* ============================================================
   CLEAN KYC FOR SELLER
   IMPORTANT:
   Never expose Cloudinary public IDs to sellers.
   ============================================================ */

function cleanKycForSeller(kyc) {
  if (!kyc) {
    return null;
  }

  return {
    _id:
      kyc._id?.toString?.() ||
      kyc._id,

    user:
      kyc.user?.toString?.() ||
      kyc.user,

    fullName: kyc.fullName || "",

    idType: kyc.idType || "",

    governmentIdUploaded:
      Boolean(kyc.idPublicId),

    selfieUploaded:
      Boolean(kyc.selfiePublicId),

    status:
      kyc.status || "pending",

    submittedAt:
      kyc.submittedAt || null,

    verifiedAt:
      kyc.verifiedAt || null,

    rejectedAt:
      kyc.rejectedAt || null,

    rejectionReason:
      kyc.rejectionReason || "",

    createdAt:
      kyc.createdAt || null,

    updatedAt:
      kyc.updatedAt || null,
  };
}

/* ============================================================
   CLEAN KYC FOR ADMIN
   Admin needs the private Cloudinary identifiers.
   ============================================================ */

function cleanKycForAdmin(kyc) {
  if (!kyc) {
    return null;
  }

  return {
    _id:
      kyc._id?.toString?.() ||
      kyc._id,

    user:
      kyc.user?.toString?.() ||
      kyc.user,

    fullName: kyc.fullName || "",

    idType: kyc.idType || "",

    idPublicId:
      kyc.idPublicId || null,

    selfiePublicId:
      kyc.selfiePublicId || null,

    status:
      kyc.status || "pending",

    submittedAt:
      kyc.submittedAt || null,

    verifiedAt:
      kyc.verifiedAt || null,

    rejectedAt:
      kyc.rejectedAt || null,

    rejectionReason:
      kyc.rejectionReason || "",

    reviewedBy:
      kyc.reviewedBy?.toString?.() ||
      kyc.reviewedBy ||
      null,

    createdAt:
      kyc.createdAt || null,

    updatedAt:
      kyc.updatedAt || null,
  };
}

/* ============================================================
   GET MY KYC STATUS
   GET /api/kyc/me
   ============================================================ */

export async function getMyKycStatus(
  request,
  env
) {
  try {
    const db = await getDatabase();

    const user = await authenticate(
      request,
      env,
      db
    );

    if (!user) {
      return json(
        { error: "Authentication required" },
        401
      );
    }

    const kyc = await db
      .collection("sellerkycs")
      .findOne({
        user: user._id,
      });

    return json({
      kyc: cleanKycForSeller(kyc),
    });
  } catch (error) {
    console.error(
      "GET MY KYC ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to get KYC status",
      },
      500
    );
  }
}

/* ============================================================
   CREATE CLOUDINARY KYC UPLOAD SIGNATURE
   POST /api/kyc/upload-signature

   Body:
   {
     "documentType": "government-id"
   }

   OR:

   {
     "documentType": "selfie"
   }
   ============================================================ */

export async function createKycUploadSignature(
  request,
  env
) {
  try {
    const db = await getDatabase();

    const user = await authenticate(
      request,
      env,
      db
    );

    if (!user) {
      return json(
        { error: "Authentication required" },
        401
      );
    }

    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      console.error(
        "Cloudinary KYC credentials are missing"
      );

      return json(
        {
          error:
            "Cloudinary is not configured",
        },
        500
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        { error: "Invalid JSON body" },
        400
      );
    }

    const documentType =
      body?.documentType;

    if (
      documentType !== "government-id" &&
      documentType !== "selfie"
    ) {
      return json(
        {
          error:
            "documentType must be government-id or selfie",
        },
        400
      );
    }

    /*
     * One fixed folder per seller.
     *
     * Example:
     * africsocial/kyc/65f.../government-id
     */

    const folder =
      `africsocial/kyc/${user._id.toString()}/${documentType}`;

    /*
     * Random public ID prevents collisions.
     */

    const publicId =
      crypto.randomUUID();

    /*
     * Cloudinary timestamp is seconds.
     */

    const timestamp =
      Math.floor(Date.now() / 1000);

    /*
     * "authenticated" means the uploaded
     * document is not publicly accessible.
     */

    const uploadParams = {
      folder,
      public_id: publicId,
      timestamp,
      type: "authenticated",
    };

    const signature =
      await createCloudinarySignature(
        uploadParams,
        env.CLOUDINARY_API_SECRET
      );

    return json({
      cloudName:
        env.CLOUDINARY_CLOUD_NAME,

      apiKey:
        env.CLOUDINARY_API_KEY,

      timestamp,

      signature,

      folder,

      publicId,

      resourceType: "image",

      type: "authenticated",

      expiresIn: 3600,
    });
  } catch (error) {
    console.error(
      "KYC UPLOAD SIGNATURE ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to create upload signature",
      },
      500
    );
  }
}

/* ============================================================
   VALIDATE KYC CLOUDINARY PUBLIC ID
   ============================================================ */

function validateKycPublicId(
  publicId,
  userId,
  documentType
) {
  if (
    typeof publicId !== "string" ||
    !publicId
  ) {
    return false;
  }

  const expectedPrefix =
    `africsocial/kyc/${userId}/${documentType}/`;

  /*
   * We deliberately require the exact folder.
   */

  if (!publicId.startsWith(expectedPrefix)) {
    return false;
  }

  return true;
}

/* ============================================================
   SUBMIT KYC
   POST /api/kyc/submit

   Body:
   {
     fullName,
     idType,
     governmentIdPublicId,
     selfiePublicId
   }
   ============================================================ */

export async function submitKyc(
  request,
  env
) {
  try {
    const db = await getDatabase();

    const user = await authenticate(
      request,
      env,
      db
    );

    if (!user) {
      return json(
        { error: "Authentication required" },
        401
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        { error: "Invalid JSON body" },
        400
      );
    }

    const fullName =
      String(body?.fullName || "").trim();

    const idType =
      String(body?.idType || "").trim();

    const governmentIdPublicId =
      String(
        body?.governmentIdPublicId || ""
      ).trim();

    const selfiePublicId =
      String(
        body?.selfiePublicId || ""
      ).trim();

    if (!fullName) {
      return json(
        {
          error:
            "Full name is required",
        },
        400
      );
    }

    if (!idType) {
      return json(
        {
          error:
            "Government ID type is required",
        },
        400
      );
    }

    if (
      !governmentIdPublicId ||
      !selfiePublicId
    ) {
      return json(
        {
          error:
            "Government ID and selfie are both required",
        },
        400
      );
    }

    const userId =
      user._id.toString();

    /*
     * SECURITY CHECK:
     *
     * A seller can only submit Cloudinary
     * assets created inside their own KYC folders.
     */

    if (
      !validateKycPublicId(
        governmentIdPublicId,
        userId,
        "government-id"
      )
    ) {
      return json(
        {
          error:
            "Invalid government ID upload",
        },
        400
      );
    }

    if (
      !validateKycPublicId(
        selfiePublicId,
        userId,
        "selfie"
      )
    ) {
      return json(
        {
          error:
            "Invalid selfie upload",
        },
        400
      );
    }

    const existing =
      await db
        .collection("sellerkycs")
        .findOne({
          user: user._id,
        });

    /*
     * Do not allow a seller to overwrite an
     * already approved KYC application.
     */

    if (
      existing?.status === "approved"
    ) {
      return json(
        {
          error:
            "Your KYC has already been approved",
        },
        400
      );
    }

    const now = new Date();

    const kycData = {
      user: user._id,

      fullName,

      idType,

      idPublicId:
        governmentIdPublicId,

      selfiePublicId,

      status: "pending",

      submittedAt: now,

      verifiedAt: null,

      rejectedAt: null,

      rejectionReason: "",

      reviewedBy: null,

      updatedAt: now,
    };

    if (existing) {
      await db
        .collection("sellerkycs")
        .updateOne(
          {
            _id: existing._id,
          },
          {
            $set: kycData,
            $setOnInsert: {
              createdAt: now,
            },
          }
        );
    } else {
      await db
        .collection("sellerkycs")
        .insertOne({
          ...kycData,
          createdAt: now,
        });
    }

    /*
     * Marketplace security summary on users.
     */

    await db.collection("users").updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          kycStatus: "pending",
          sellerVerified: false,
          kycVerifiedAt: null,
        },
      }
    );

    const saved =
      await db
        .collection("sellerkycs")
        .findOne({
          user: user._id,
        });

    return json({
      message:
        "KYC submitted successfully and is awaiting admin review",

      kyc:
        cleanKycForSeller(saved),
    });
  } catch (error) {
    console.error(
      "SUBMIT KYC ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to submit KYC",
      },
      500
    );
  }
}

/* ============================================================
   ADMIN: PENDING KYC
   GET /api/admin/kyc/pending
   ============================================================ */

export async function getPendingKyc(
  request,
  env
) {
  try {
    const db = await getDatabase();

    const { error } =
      await authenticateAdmin(
        request,
        env,
        db
      );

    if (error) {
      return error;
    }

    const records =
      await db
        .collection("sellerkycs")
        .find({
          status: "pending",
        })
        .sort({
          submittedAt: 1,
        })
        .limit(100)
        .toArray();

    return json({
      kyc: records.map(
        cleanKycForAdmin
      ),
    });
  } catch (error) {
    console.error(
      "GET PENDING KYC ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to get pending KYC",
      },
      500
    );
  }
}

/* ============================================================
   ADMIN: GET SPECIFIC KYC
   GET /api/admin/kyc/:userId
   ============================================================ */

export async function getAdminKyc(
  request,
  env,
  userId
) {
  try {
    const db = await getDatabase();

    const { error } =
      await authenticateAdmin(
        request,
        env,
        db
      );

    if (error) {
      return error;
    }

    if (
      !userId ||
      !ObjectId.isValid(userId)
    ) {
      return json(
        {
          error:
            "Invalid user ID",
        },
        400
      );
    }

    const kyc =
      await db
        .collection("sellerkycs")
        .findOne({
          user:
            new ObjectId(userId),
        });

    if (!kyc) {
      return json(
        {
          error:
            "KYC record not found",
        },
        404
      );
    }

    return json({
      kyc:
        cleanKycForAdmin(kyc),
    });
  } catch (error) {
    console.error(
      "GET ADMIN KYC ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to get KYC",
      },
      500
    );
  }
}

/* ============================================================
   ADMIN: APPROVE KYC
   POST /api/admin/kyc/:userId/approve
   ============================================================ */

export async function approveKyc(
  request,
  env,
  userId
) {
  try {
    const db = await getDatabase();

    const { user: admin, error } =
      await authenticateAdmin(
        request,
        env,
        db
      );

    if (error) {
      return error;
    }

    if (
      !userId ||
      !ObjectId.isValid(userId)
    ) {
      return json(
        {
          error:
            "Invalid user ID",
        },
        400
      );
    }

    const sellerId =
      new ObjectId(userId);

    const kyc =
      await db
        .collection("sellerkycs")
        .findOne({
          user: sellerId,
        });

    if (!kyc) {
      return json(
        {
          error:
            "KYC record not found",
        },
        404
      );
    }

    const now = new Date();

    await db
      .collection("sellerkycs")
      .updateOne(
        {
          _id: kyc._id,
        },
        {
          $set: {
            status: "approved",
            verifiedAt: now,
            rejectedAt: null,
            rejectionReason: "",
            reviewedBy: admin._id,
            updatedAt: now,
          },
        }
      );

    await db
      .collection("users")
      .updateOne(
        {
          _id: sellerId,
        },
        {
          $set: {
            kycStatus: "approved",
            sellerVerified: true,
            kycVerifiedAt: now,
          },
        }
      );

    const updated =
      await db
        .collection("sellerkycs")
        .findOne({
          _id: kyc._id,
        });

    return json({
      message:
        "KYC approved successfully",

      kyc:
        cleanKycForAdmin(updated),
    });
  } catch (error) {
    console.error(
      "APPROVE KYC ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to approve KYC",
      },
      500
    );
  }
}

/* ============================================================
   ADMIN: REJECT KYC
   POST /api/admin/kyc/:userId/reject
   ============================================================ */

export async function rejectKyc(
  request,
  env,
  userId
) {
  try {
    const db = await getDatabase();

    const { user: admin, error } =
      await authenticateAdmin(
        request,
        env,
        db
      );

    if (error) {
      return error;
    }

    if (
      !userId ||
      !ObjectId.isValid(userId)
    ) {
      return json(
        {
          error:
            "Invalid user ID",
        },
        400
      );
    }

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const rejectionReason =
      String(
        body?.reason || ""
      ).trim();

    if (!rejectionReason) {
      return json(
        {
          error:
            "A rejection reason is required",
        },
        400
      );
    }

    const sellerId =
      new ObjectId(userId);

    const kyc =
      await db
        .collection("sellerkycs")
        .findOne({
          user: sellerId,
        });

    if (!kyc) {
      return json(
        {
          error:
            "KYC record not found",
        },
        404
      );
    }

    const now = new Date();

    await db
      .collection("sellerkycs")
      .updateOne(
        {
          _id: kyc._id,
        },
        {
          $set: {
            status: "rejected",
            verifiedAt: null,
            rejectedAt: now,
            rejectionReason,
            reviewedBy: admin._id,
            updatedAt: now,
          },
        }
      );

    await db
      .collection("users")
      .updateOne(
        {
          _id: sellerId,
        },
        {
          $set: {
            kycStatus: "rejected",
            sellerVerified: false,
            kycVerifiedAt: null,
          },
        }
      );

    const updated =
      await db
        .collection("sellerkycs")
        .findOne({
          _id: kyc._id,
        });

    return json({
      message:
        "KYC rejected",

      kyc:
        cleanKycForAdmin(updated),
    });
  } catch (error) {
    console.error(
      "REJECT KYC ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to reject KYC",
      },
      500
    );
  }
}