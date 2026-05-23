import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { syncContacts } from "../controllers/contactController.js";

const router = express.Router();

// 👇 THIS is where your line goes
router.post("/sync", authMiddleware, syncContacts);

export default router;