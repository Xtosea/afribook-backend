import "./config/env.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import multer from "multer";
import http from "http";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import Redis from "ioredis";

/* ================= REDIS ================= */
const redis = new Redis(process.env.REDIS_URL); // For caching

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
import r2Routes from "./routes/r2Routes.js";

const app = express();
app.set("trust proxy", 1);

/* ================= CREATE SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
const io = new Server(server, {
  cors: { origin: "*" },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
  });

  socket.on("new-comment", ({ postId, comment }) => {
    io.to(postId).emit("receive-comment", comment); // Live comments
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected");
  });
});

/* ================= WEBSOCKET ================= */
const wss = new WebSocketServer({ server });
let clients = [];
let users = {};

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket connected");
  clients.push(ws);

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "REGISTER") {
        users[data.userId] = ws;
        ws.userId = data.userId;
      }

      if (data.type === "SEND_MESSAGE") {
        const target = users[data.to];
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({
            type: "RECEIVE_MESSAGE",
            message: data.message,
            from: data.from,
          }));
        }
      }
    } catch (err) {
      console.log("WS ERROR:", err.message);
    }
  });

  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
    if (ws.userId) delete users[ws.userId];
  });
});

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
export const upload = multer({ storage });

/* ================= STATIC ================= */
app.use("/uploads/profiles", express.static("public/uploads/profiles"));
app.use("/uploads/media", express.static("public/uploads/media"));

/* ================= CORS ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_BACKUP_URL,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS not allowed"));
  },
  credentials: true,
}));
app.options("*", cors());

/* ================= BODY ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= RATE LIMIT ================= */
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
app.use("/api/r2", r2Routes);

/* ================= TIKTOK-STYLE REELS ================= */
app.get("/api/reels", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const cacheKey = `reels:${page}:${limit}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const posts = await (await import("./models/Post.js")).default.find({ media: { $exists: true, $ne: [] } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name profilePic")
      .lean();

    await redis.set(cacheKey, JSON.stringify(posts), "EX", 60); // cache 60s
    res.json(posts);
  } catch (err) {
    console.error("GET REELS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= TEST ================= */
app.get("/", (req, res) => {
  res.send("Afribook API running 🚀");
});

/* ================= MONGODB ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ Mongo Error:", err));

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/* ================= BROADCAST ================= */
export const broadcast = (data) => {
  clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(data));
  });
};

/* ================= TEST UPLOAD ================= */
app.post("/test-upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  res.json({
    url: `${process.env.BACKEND_URL}/uploads/${req.file.filename}`,
  });
});