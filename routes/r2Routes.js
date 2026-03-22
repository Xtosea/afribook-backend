import express from "express";
import multer from "multer";
import { uploadR2 } from "../controllers/r2Controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadR2);

export default router;