import Marketplace from "../models/Marketplace.js";

// ================================
// CREATE LISTING
// ================================
export const createListing = async (req, res) => {
  try {
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
} = req.body;

    if (
  !title ||
  !description ||
  !price ||
  !category ||
  !country ||
  !state ||
  !city
) {
  return res.status(400).json({
    success: false,
    message: "Please fill all required fields.",
  });
}

    if (!images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image.",
      });
    }

    // Change this according to your User model later
    const maxImages = req.user?.isPremium ? 10 : 2;

    if (images.length > maxImages) {
      return res.status(400).json({
        success: false,
        message: `Your plan allows only ${maxImages} images.`,
      });
    }

    const listing = await Marketplace.create({
  seller: req.user.id,

  title,
  description,
  price,
  currency,
  category,
  condition,

  location: {
    country,
    state,
    lga,
    city,
    area,
  },

  phone,
  whatsapp,

  negotiable,

  deliveryAvailable,
  deliveryFee,

  quantity,

  brand,
  model,

  images,
});

    res.status(201).json({
      success: true,
      listing,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to create listing.",
    });
  }
};

// ================================
// GET ALL LISTINGS
// ================================
export const getListings = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const listings = await Marketplace.find({
      status: "Available",
    })
      .populate("seller", "name profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Marketplace.countDocuments({
      status: "Available",
    });

    res.json({
      success: true,
      listings,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch listings.",
    });
  }
};

// ================================
// GET SINGLE LISTING
// ================================
export const getListing = async (req, res) => {
  try {
    const listing = await Marketplace.findById(req.params.id)
      .populate("seller", "name profilePic email");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    listing.views += 1;

    await listing.save();

    res.json({
      success: true,
      listing,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch listing.",
    });
  }
};

// ================================
// UPDATE LISTING
// ================================
export const updateListing = async (req, res) => {
  try {
    const listing = await Marketplace.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    if (
      listing.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    Object.assign(listing, req.body);

    await listing.save();

    res.json({
      success: true,
      listing,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to update listing.",
    });
  }
};

// ================================
// DELETE LISTING
// ================================
export const deleteListing = async (req, res) => {
  try {
    const listing = await Marketplace.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    if (
      listing.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    // We'll delete Cloudinary images later
    // using their public_id values.

    await listing.deleteOne();

    res.json({
      success: true,
      message: "Listing deleted successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to delete listing.",
    });
  }
};