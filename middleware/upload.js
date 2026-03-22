// middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fetch from "node-fetch";

// TEMP STORAGE
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

export const uploadMediaCloudinaryR2 = multer({ storage }).any(); // accept multiple files

// CLOUDINARY + R2 PROCESSING
export const mediaHandler = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    req.files = []; // ensure array
    return next();
  }

  const processed = [];

  for (const file of req.files) {
    const mime = file.mimetype;

    try {
      if (mime.startsWith("image/")) {
        // Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "posts",
          use_filename: true,
          unique_filename: false,
        });
        processed.push({ url: result.secure_url, type: "image" });

      } else if (mime.startsWith("video/")) {
        // Cloudflare R2
        const R2_BUCKET = process.env.R2_BUCKET;
        const R2_URL = `https://${R2_BUCKET}.r2.cloudflarestorage.com/${file.filename}`;
        const R2_AUTH = `Bearer ${process.env.R2_TOKEN}`;

        await fetch(R2_URL, {
          method: "PUT",
          body: fs.createReadStream(file.path),
          headers: { Authorization: R2_AUTH },
        });

        processed.push({ url: R2_URL, type: "video" });
      }
    } catch (err) {
      console.error("MEDIA UPLOAD ERROR:", err);
    }

    // Remove temp file
    fs.unlinkSync(file.path);
  }

  req.files = processed; // this will now have [{url, type}, ...]
  next();
};