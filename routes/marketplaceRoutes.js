import express from "express";

import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
} from "../controllers/marketplaceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================
// PUBLIC ROUTES
// ==========================

// Get all marketplace listings
router.get("/", getListings);

// Get a single listing
router.get("/:id", getListing);

// ==========================
// PROTECTED ROUTES
// ==========================

// Create a listing
router.post("/", authMiddleware, createListing);

// Update a listing
router.put("/:id", authMiddleware, updateListing);

// Delete a listing
router.delete("/:id", authMiddleware, deleteListing);

export default router;