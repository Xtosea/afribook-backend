import express from "express";

import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  getMyListings,
  getSavedListings,
  toggleSaveListing,
} from "../controllers/marketplaceController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getListings);

// Protected
router.get("/me", verifyToken, getMyListings);

router.get("/saved/me", verifyToken, getSavedListings);

router.post("/:id/save", verifyToken, toggleSaveListing);

router.post("/", verifyToken, createListing);

router.put("/:id", verifyToken, updateListing);

router.delete("/:id", verifyToken, deleteListing);

// Keep this LAST
router.get("/:id", getListing);

export default router;