import express from "express";
import { getSignedUploadUrl } from "../controllers/r2Controller.js";

const router = express.Router();

router.get("/signed-url", getSignedUploadUrl);

export default router;