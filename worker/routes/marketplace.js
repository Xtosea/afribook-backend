import { ObjectId } from "mongodb";
import { getDatabase } from "../utils/db.js";
import { hasActivePremium } from "../utils/premium.js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function getToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function verifyJWT(token, secret) {
  try {
    if (!token || !secret) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    const data = new TextEncoder().encode(`${header}.${payload}`);

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      data
    );

    if (!valid) return null;

    return JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload))
    );
  } catch {
    return null;
  }
}

async function authenticate(request, env, db) {
  const token = getToken(request);

  if (!token) {
    return null;
  }

  const payload = await verifyJWT(
    token,
    env.JWT_SECRET || env.JWT_KEY
  );

  if (!payload) return null;

  const userId =
    payload.id ||
    payload._id ||
    payload.userId ||
    payload.sub;

  if (!userId || !ObjectId.isValid(userId)) {
    return null;
  }

  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        password: 0,
        verifyToken: 0,
        resetToken: 0,
        resetTokenExpiry: 0,
      },
    }
  );

  return user || null;
}

function cleanListing(listing) {
  if (!listing) return listing;

  return {
    ...listing,
    _id: listing._id?.toString?.() || listing._id,
    seller:
      listing.seller && typeof listing.seller === "object"
        ? {
            ...listing.seller,
            _id:
              listing.seller._id?.toString?.() ||
              listing.seller._id,
          }
        : listing.seller?.toString?.() || listing.seller,
    likes: Array.isArray(listing.likes)
      ? listing.likes.map(id => id?.toString?.() || id)
      : [],
    savedBy: Array.isArray(listing.savedBy)
      ? listing.savedBy.map(id => id?.toString?.() || id)
      : [],
  };
}

async function populateSeller(db, listing, includeEmail = false) {
  if (!listing?.seller) return listing;

  const sellerId =
    typeof listing.seller === "object"
      ? listing.seller._id
      : listing.seller;

  if (!sellerId || !ObjectId.isValid(sellerId.toString())) {
    return listing;
  }

  const projection = {
    name: 1,
    profilePic: 1,
  };

  if (includeEmail) {
    projection.email = 1;
  }

  const seller = await db.collection("users").findOne(
    { _id: new ObjectId(sellerId.toString()) },
    { projection }
  );

  return {
    ...listing,
    seller: seller || null,
  };
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];

  return images.map(image => {
    if (typeof image === "string") {
      return { url: image, public_id: "" };
    }

    return {
      url: image?.url || "",
      public_id: image?.public_id || "",
    };
  });
}

/* ============================================================
   GET ALL LISTINGS
   GET /api/marketplace
   ============================================================ */

export async function getListings(request, env, db) {
  try {
    const url = new URL(request.url);

    const page = Math.max(
      1,
      Number(url.searchParams.get("page")) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(url.searchParams.get("limit")) || 20
      )
    );

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      db
        .collection("marketplaces")
        .find({ status: "Available" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection("marketplaces").countDocuments({
        status: "Available",
      }),
    ]);

    const populated = [];

    for (const listing of listings) {
      populated.push(
        await populateSeller(db, listing, false)
      );
    }

    return json({
      success: true,
      listings: populated.map(cleanListing),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET MARKETPLACE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to fetch listings.",
      },
      500
    );
  }
}

/* ============================================================
   GET SINGLE LISTING
   GET /api/marketplace/:id
   ============================================================ */

export async function getListing(request, env, db, id) {
  try {
    if (!ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    const listing = await db.collection("marketplaces").findOne({
      _id: new ObjectId(id),
    });

    if (!listing) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    await db.collection("marketplaces").updateOne(
      { _id: listing._id },
      { $inc: { views: 1 } }
    );

    listing.views = (listing.views || 0) + 1;

    const populated = await populateSeller(
      db,
      listing,
      true
    );

    return json({
      success: true,
      listing: cleanListing(populated),
    });
  } catch (err) {
    console.error("GET MARKETPLACE LISTING ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to fetch listing.",
      },
      500
    );
  }
}

/* ============================================================
   CREATE LISTING
   POST /api/marketplace
   ============================================================ */

export async function createListing(request, env, db) {
  try {
    const user = await authenticate(request, env, db);

    if (!user) {
      return json(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      price,
      currency,
      category,
      condition,
      country,
      state,
      lga,
      city,
      area,
      phone,
      whatsapp,
      negotiable,
      deliveryAvailable,
      deliveryFee,
      quantity,
      brand,
      model,
      images,
      contactMethods,
      hidePhone,
    } = body;

    if (
      !title ||
      !description ||
      !price ||
      !category ||
      !country ||
      !state ||
      !city
    ) {
      return json(
        {
          success: false,
          message: "Please fill all required fields.",
        },
        400
      );
    }

    const normalizedImages = normalizeImages(images);

/*
 * ============================================================
 * MARKETPLACE SELLER KYC REQUIREMENT
 *
 * Every Marketplace seller must have:
 *   1. KYC approved
 *   2. sellerVerified === true
 *
 * The values come from the authenticated user in MongoDB.
 * We NEVER trust isPremium/kycStatus/sellerVerified
 * values supplied by the frontend.
 * ============================================================
 */

if (
  user.kycStatus !== "approved" ||
  user.sellerVerified !== true
) {
  return json(
    {
      success: false,
      code: "KYC_REQUIRED",
      message:
        "Marketplace selling requires approved KYC and seller verification.",
      kycStatus:
        user.kycStatus || "not_submitted",
      sellerVerified:
        user.sellerVerified === true,
    },
    403
  );
}

/*
 * ============================================================
 * IMAGE LIMIT
 *
 * Approved KYC + free seller    = 1 image
 * Approved KYC + premium seller = 10 images
 *
 *  * Premium status is read from the subscriptions
 * collection using the authenticated user's ID.
 *
 ============================================================
 */

const isPremium = await hasActivePremium(
  db,
  user._id
);

const maxImages = isPremium ? 10 : 1;

if (normalizedImages.length === 0) {
  return json(
    {
      success: false,
      message:
        "Please upload at least one image.",
    },
    400
  );
}

if (
  normalizedImages.length > maxImages
) {
  return json(
    {
      success: false,
      code: "IMAGE_LIMIT_EXCEEDED",
      message:
        `Your current seller plan allows only ${maxImages} image(s) per listing.`,
      maxImages,
      isPremium,
    },
    400
  );
}

    const now = new Date();

    const listing = {
      seller: user._id,
      title,
      description,
      price: Number(price),
      currency: currency || "NGN",
      negotiable: Boolean(negotiable),
      category,
      brand: brand || "",
      model: model || "",
      condition: condition || "Used",
      quantity: Number(quantity) || 1,

      location: {
        country,
        state,
        lga: lga || "",
        city,
        area: area || "",
      },

      phone,
      whatsapp: whatsapp || "",

      contactMethods: {
        phone:
          contactMethods?.phone !== false,
        whatsapp:
          contactMethods?.whatsapp !== false,
        chat:
          contactMethods?.chat !== false,
      },

      hidePhone: Boolean(hidePhone),

      deliveryAvailable:
        Boolean(deliveryAvailable),

      deliveryFee:
        Number(deliveryFee) || 0,

      images: normalizedImages,

      status: "Available",
      featured: false,
      likes: [],
      savedBy: [],
      views: 0,

      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection("marketplaces")
      .insertOne(listing);

    listing._id = result.insertedId;

    const populated = await populateSeller(
      db,
      listing,
      false
    );

    return json(
      {
        success: true,
        listing: cleanListing(populated),
      },
      201
    );
  } catch (err) {
    console.error("CREATE MARKETPLACE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to create listing.",
      },
      500
    );
  }
}

/* ============================================================
   GET MY LISTINGS
   GET /api/marketplace/me
   ============================================================ */

export async function getMyListings(request, env, db) {
  try {
    const user = await authenticate(request, env, db);

    if (!user) {
      return json(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    const listings = await db
      .collection("marketplaces")
      .find({ seller: user._id })
      .sort({ createdAt: -1 })
      .toArray();

    const populated = [];

    for (const listing of listings) {
      populated.push(
        await populateSeller(db, listing, false)
      );
    }

    return json({
      success: true,
      listings: populated.map(cleanListing),
    });
  } catch (err) {
    console.error("GET MY MARKETPLACE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to load your listings.",
      },
      500
    );
  }
}

/* ============================================================
   GET SAVED LISTINGS
   GET /api/marketplace/saved/me
   ============================================================ */

export async function getSavedListings(request, env, db) {
  try {
    const user = await authenticate(request, env, db);

    if (!user) {
      return json(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    const listings = await db
      .collection("marketplaces")
      .find({
        savedBy: user._id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const populated = [];

    for (const listing of listings) {
      populated.push(
        await populateSeller(db, listing, false)
      );
    }

    return json({
      success: true,
      listings: populated.map(cleanListing),
    });
  } catch (err) {
    console.error("GET SAVED MARKETPLACE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to load saved listings.",
      },
      500
    );
  }
}

/* ============================================================
   SAVE / UNSAVE
   POST /api/marketplace/:id/save
   ============================================================ */

export async function toggleSaveListing(
  request,
  env,
  db,
  id
) {
  try {
    const user = await authenticate(request, env, db);

    if (!user) {
      return json(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    if (!ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    const listing = await db
      .collection("marketplaces")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!listing) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    const alreadySaved = Array.isArray(listing.savedBy)
      ? listing.savedBy.some(
          savedId =>
            savedId.toString() === user._id.toString()
        )
      : false;

    const update = alreadySaved
      ? {
          $pull: {
            savedBy: user._id,
          },
        }
      : {
          $addToSet: {
            savedBy: user._id,
          },
        };

    await db.collection("marketplaces").updateOne(
      { _id: listing._id },
      update
    );

    const savedCount = alreadySaved
      ? Math.max(0, (listing.savedBy || []).length - 1)
      : (listing.savedBy || []).length + 1;

    return json({
      success: true,
      saved: !alreadySaved,
      savedCount,
    });
  } catch (err) {
    console.error("TOGGLE MARKETPLACE SAVE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to save listing.",
      },
      500
    );
  }
}

/* ============================================================
   UPDATE LISTING
   PUT /api/marketplace/:id
   ============================================================ */

export async function updateListing(
  request,
  env,
  db,
  id
) {
  try {
    const user = await authenticate(request, env, db);

    if (!user) {
      return json(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    if (!ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    const listing = await db
      .collection("marketplaces")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!listing) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    if (
      listing.seller?.toString() !==
      user._id.toString()
    ) {
      return json(
        {
          success: false,
          message: "Unauthorized.",
        },
        403
      );
    }

    const body = await request.json();

    const allowedFields = [
      "title",
      "description",
      "price",
      "currency",
      "negotiable",
      "category",
      "brand",
      "model",
      "condition",
      "quantity",
      "phone",
      "whatsapp",
      "contactMethods",
      "hidePhone",
      "deliveryAvailable",
      "deliveryFee",
      "images",
      "status",
      "featured",
      "location",
    ];

    const update = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] =
          field === "images"
            ? normalizeImages(body[field])
            : body[field];
      }
    }

    update.updatedAt = new Date();

    await db.collection("marketplaces").updateOne(
      { _id: listing._id },
      { $set: update }
    );

    const updated = await db
      .collection("marketplaces")
      .findOne({
        _id: listing._id,
      });

    const populated = await populateSeller(
      db,
      updated,
      false
    );

    return json({
      success: true,
      listing: cleanListing(populated),
    });
  } catch (err) {
    console.error("UPDATE MARKETPLACE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to update listing.",
      },
      500
    );
  }
}

/* ============================================================
   DELETE LISTING
   DELETE /api/marketplace/:id
   ============================================================ */

export async function deleteListing(
  request,
  env,
  db,
  id
) {
  try {
    const user = await authenticate(request, env, db);

    if (!user) {
      return json(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    if (!ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    const listing = await db
      .collection("marketplaces")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!listing) {
      return json(
        {
          success: false,
          message: "Listing not found.",
        },
        404
      );
    }

    if (
      listing.seller?.toString() !==
      user._id.toString()
    ) {
      return json(
        {
          success: false,
          message: "Unauthorized.",
        },
        403
      );
    }

    await db.collection("marketplaces").deleteOne({
      _id: listing._id,
    });

    return json({
      success: true,
      message: "Listing deleted successfully.",
    });
  } catch (err) {
    console.error("DELETE MARKETPLACE ERROR:", err);

    return json(
      {
        success: false,
        message: "Failed to delete listing.",
      },
      500
    );
  }
}
