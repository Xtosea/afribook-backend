import express from "express";

import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
} from "../controllers/marketplaceController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

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
router.post("/", verifyToken, createListing);
router.put("/:id", verifyToken, updateListing);
router.delete("/:id", verifyToken, deleteListing);

export default router;