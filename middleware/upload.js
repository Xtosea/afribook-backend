import path from "path";
import fs from "fs";
import multer from "multer";

/* ================= UPLOAD DIRECTORIES ================= */
const profileDir = path.join(process.cwd(), "public/uploads/profiles");
const mediaDir = path.join(process.cwd(), "public/uploads/media");

// Make sure folders exist
[profileDir, mediaDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ================= STORAGE ================= */
export const storageProfile = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

export const storageMedia = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

/* ================= FILE FILTERS ================= */
const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only images allowed"), false);
  }
  cb(null, true);
};

const mediaFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
    return cb(new Error("Only images/videos allowed"), false);
  }
  cb(null, true);
};

/* ================= EXPORT UPLOADS ================= */
export const uploadProfile = multer({ storage: storageProfile, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadMedia = multer({ storage: storageMedia, fileFilter: mediaFilter, limits: { fileSize: 50 * 1024 * 1024 } });