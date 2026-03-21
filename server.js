import "./config/env.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import multer from "multer";
import { WebSocketServer } from "ws";

/* ================= ROUTES ================= */
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import imagekitRoutes from "./routes/imagekitRoutes.js";
import cloudinaryRoutes from "./routes/cloudinaryRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";

const app = express();

/* ================= MULTER SETUP ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });

/* ================= STATIC FILES ================= */
// Serve profile pics and media
app.use("/uploads/profiles", express.static("public/uploads/profiles"));
app.use("/uploads/media", express.static("public/uploads/media"));

/*/* ================= CORS ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_BACKUP_URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow non-browser requests (like Postman)
      if (!allowedOrigins.includes(origin)) return callback(new Error("CORS not allowed"), false);
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());
app.options("*", cors());

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ================= RATE LIMIT ================= */
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many email requests. Try again later." },
});

app.use("/api/auth/resend-verification", emailLimiter);
app.use("/api/auth/forgot-password", emailLimiter);

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api", searchRoutes);
app.use("/api/imagekit", imagekitRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/videos", videoRoutes);

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("Afribook API is running...");
});

/* ================= MONGODB ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ Mongo Error:", err));

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));

/* ================= WEBSOCKET ================= */
const wss = new WebSocketServer({ server });

let clients = [];
let users = {}; // userId -> ws mapping

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket connected");
  clients.push(ws);

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "REGISTER") {
        users[data.userId] = ws;
        ws.userId = data.userId;
        console.log("✅ Registered user:", data.userId);
      }
      if (data.type === "SEND_MESSAGE") {
        const target = users[data.to];
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({ type: "RECEIVE_MESSAGE", message: data.message, from: data.from }));
        }
      }
    } catch (err) {
      console.log("❌ WS Error:", err.message);
    }
  });

  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
    if (ws.userId) delete users[ws.userId];
    console.log("❌ WebSocket disconnected");
  });
});

/* ================= BROADCAST FUNCTION ================= */
export const broadcast = (data) => {
  clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(data));
  });
};

/* ================= TEST UPLOAD ================= */
app.post("/test-upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ message: "File uploaded!", url: `/uploads/${req.file.filename}` });
});