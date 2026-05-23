import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { syncContacts } from "../controllers/contactController.js";

const router = express.Router();

router.post("/sync", verifyToken, syncContacts);

export default router;