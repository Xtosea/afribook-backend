import express from "express";

import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  toggleSaveListing,
  getSavedListings,
} from "../controllers/marketplaceController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================
// PUBLIC ROUTES
// ==========================

// Get all marketplace listings
router.get("/", getListings);

// Get saved listings (protected)
router.get(
  "/saved/me",
  verifyToken,
  getSavedListings
);

// Get a single listing
router.get("/:id", getListing);

// ==========================
// PROTECTED ROUTES
// ==========================

// Create listing
router.post(
  "/",
  verifyToken,
  createListing
);

// Update listing
router.put(
  "/:id",
  verifyToken,
  updateListing
);

// Delete listing
router.delete(
  "/:id",
  verifyToken,
  deleteListing
);

// Save listing
router.post(
  "/:id/save",
  verifyToken,
  saveListing
);

// Saved Listings
router.get(
  "/saved/me",
  verifyToken,
  getSavedListings
);

router.post(
  "/:id/save",
  verifyToken,
  toggleSaveListing
);

// Remove saved listing
router.delete(
  "/:id/save",
  verifyToken,
  unsaveListing
);

export default router;