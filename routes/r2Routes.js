import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "/tmp" }); // Temp storage

const {
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_CUSTOM_DOMAIN,
} = process.env;

router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file uploaded" });

    const filePath = req.file.path;
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const fileBuffer = fs.readFileSync(filePath);

    const uploadUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fileName}`;
    const r2Response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": req.file.mimetype,
        "Authorization": "Basic " + Buffer.from(`${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}`).toString("base64"),
      },
      body: fileBuffer,
    });

    if (!r2Response.ok) throw new Error(`R2 upload failed: ${r2Response.statusText}`);

    fs.unlinkSync(filePath);

    const publicUrl = `${R2_CUSTOM_DOMAIN}/${fileName}`;

    res.json({ url: publicUrl, type: "video" });

  } catch (err) {
    console.error("R2 UPLOAD ERROR:", err);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

export default router;