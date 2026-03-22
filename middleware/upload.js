import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fetch from "node-fetch";

// ---------- TEMP STORAGE ----------
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
export const uploadLocal = multer({ storage });

// ---------- CLOUDINARY SETUP ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------- CLOUNDINARY + R2 UPLOAD MIDDLEWARE ----------
export const uploadMediaCloudinaryR2 = multer({ storage }).any(); // use multer before middleware

export const mediaHandler = async (req, res, next) => {
  if (!req.files) return next();

  const processed = [];

  for (const file of req.files) {
    const mime = file.mimetype;

    if (mime.startsWith("image/")) {
      // Cloudinary upload
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "posts",
        use_filename: true,
        unique_filename: false,
      });

      processed.push({ url: result.secure_url, type: "image" });

    } else if (mime.startsWith("video/")) {
      // Cloudflare R2 upload
      const R2_BUCKET = process.env.R2_BUCKET;
      const R2_URL = `https://${R2_BUCKET}.r2.cloudflarestorage.com/${file.filename}`;
      const R2_AUTH = `Bearer ${process.env.R2_TOKEN}`;

      const form = new FormData();
      form.append("file", fs.createReadStream(file.path), file.filename);

      await fetch(R2_URL, { method: "PUT", body: fs.createReadStream(file.path), headers: { Authorization: R2_AUTH } });

      processed.push({ url: R2_URL, type: "video" });
    }

    // Delete temp file
    fs.unlinkSync(file.path);
  }

  req.files = processed;
  next();
};

// ---------- IMAGEKIT FOR PROFILE/COVER ----------
import ImageKit from "imagekit";
export const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

export const uploadProfileCover = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const response = await imageKit.upload({
      file: req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: "/profiles",
    });

    res.json({ url: response.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ImageKit upload failed" });
  }
};