// server.js
import "./config/env.js";
import express from "express";
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import fileUpload from "express-fileupload";
import helmet from "helmet";

/* ================= MODELS ================= */
import Message from "./models/Message.js";
import Post from "./models/Post.js";

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
import messageRoutes from "./routes/messageRoutes.js";
import r2StoryRoutes from "./routes/r2StoryRoutes.js";

import r2Routes from "./routes/r2Routes.js";
import storyFeedRoutes from "./routes/storyFeedRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import socialCardRoutes
from "./routes/socialCardRoutes.js";
import storyMusicRoutes
from "./routes/storyMusicRoutes.js";

import storyMusicAdminRoutes
from "./routes/storyMusicAdminRoutes.js";

import storyR2Routes from "./routes/storyR2Routes.js";
import adRoutes
from "./routes/adRoutes.js";
import creatorRoutes
from "./routes/creatorRoutes.js";
import adminRoutes
from "./routes/adminRoutes.js";
import earningRoutes
from "./routes/earningRoutes.js";
import adminStatsRoutes from "./routes/adminStatsRoutes.js";
import r2StoryMusicRoutes from "./routes/r2StoryMusicRoutes.js";
import storyCloudinaryRoutes from "./routes/storyCloudinaryRoutes.js";
import marketplaceRoutes from "./routes/marketplaceRoutes.js";
import socialPreviewRoutes from "./routes/socialPreviewRoutes.js";









const app = express();
app.set("trust proxy", 1);

/* ================= CORS ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_BACKUP_URL,
  "https://africsocial.globelynks.com",
   "https://africbook.globelynks.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy does not allow access from this origin"), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* ================= HELMET + CSP ================= */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "data:", "blob:", "https:"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://africsocial.globelynks.com",
          "https://static.cloudflareinsights.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          "https://africsocial.globelynks.com",
          process.env.FRONTEND_URL,
          process.env.FRONTEND_BACKUP_URL,
          process.env.BACKEND_URL || "https://afribook-backend.onrender.com",
        ],
        fontSrc: ["'self'", "https:", "data:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        frameSrc: ["'self'", "https:"],
      },
    },
  })
);

// Allow images to be used cross-origin
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= FILEUPLOAD ================= */
app.use(
  fileUpload({
    useTempFiles: false,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  })
);


/* ================= RATE LIMIT ================= */
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});
app.use("/api/auth/resend-verification", emailLimiter);
app.use("/api/auth/forgot-password", emailLimiter);


/* ================= STATIC FILES ================= */
// Profile images
app.use("/uploads/profiles", express.static(path.join(process.cwd(), "public/uploads/profiles")));
// Media uploads
app.use("/uploads/media", express.static(path.join(process.cwd(), "public/uploads/media")));
// Default profile/cover images
app.use("/profile", express.static(path.join(process.cwd(), "public/profile")));



/* ================= API ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/imagekit", imagekitRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/videos", videoRoutes);

app.use("/api/r2", r2Routes);
app.use("/api/r2stories", r2StoryRoutes);
app.use("/api/stories", storyFeedRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/post-card",socialCardRoutes);
app.use(
  "/api/story-music",
  storyMusicRoutes
);

app.use(
  "/api/story-music-admin",
  storyMusicAdminRoutes
);
        
app.use("/api/storyR2", storyR2Routes);

app.use("/api/ad", adRoutes);

app.use("/api/creator", creatorRoutes);

app.use("/api/admin", adminRoutes);

app.use(
  "/api/earnings",
  earningRoutes
);

app.use(
  "/api/admin",
  adminStatsRoutes
);
app.use("/api/storyCloudinary", storyCloudinaryRoutes);
app.use("/api/r2StoryMusic", r2StoryMusicRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/", socialPreviewRoutes);




  

                   

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("AfricSocial API running 🚀");
});

/* ================= CREATE HTTP SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  path: "/socket.io",
});

import { setIO } from "./utils/socket.js";

setIO(io);

/* ================= SOCKET AUTH ================= */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log("❌ No token provided");
    return next(new Error("No token provided"));
  }
  next();
});

/* ================= SOCKET EVENTS ================= */
const onlineUsers = new Map();

const activeCalls = new Set();

const callSessions = new Map();

io.on("connection", (socket) => {

  console.log(
    "🟢 Socket connected:",
    socket.id
  );

  // JOIN USER ROOM
  socket.on("join", (userId) => {

  socket.join(userId);

  socket.userId = userId;

  onlineUsers.set(userId, socket.id);

  io.emit(
    "online-users",
    Array.from(onlineUsers.keys())
  );

  console.log(`👤 ${userId} is online`);

});

  // SEND MESSAGE
  socket.on(
    "send-message",
    async (data) => {

      try {

        const message =
          await Message.create(data);

        io.to(
          data.receiver
        ).emit(
          "receive-message",
          message
        );

        io.to(
          data.sender
        ).emit(
          "receive-message",
          message
        );

      } catch (error) {

        console.error(
          "Message error:",
          error
        );
      }
    }
  );

// MESSAGE EDITED
socket.on(
  "message-edited",
  (updatedMessage) => {

    io.emit(
      "message-edited",
      updatedMessage
    );

  }
);

// MESSAGE DELETED
socket.on(
  "message-deleted",
  ({ messageId }) => {

    io.emit(
      "message-deleted",
      { messageId }
    );

  }
);

  // ================= CALL EVENTS =================

// CALL USER 
  socket.on("call-user", (data) => {

  console.log("📞 call-user received");

  const receiverSocket = onlineUsers.get(data.to);

  if (!receiverSocket) {
    io.to(data.from).emit("user-offline");
    return;
  }

  if (activeCalls.has(data.to)) {
    io.to(data.from).emit("call-busy");
    return;
  }

  activeCalls.add(data.from);
  activeCalls.add(data.to);

callSessions.set(data.from, data.to);
callSessions.set(data.to, data.from);

  io.to(receiverSocket).emit("incoming-call", {
  from: data.from,
  signal: data.signal,
  callType: data.callType,
  name: data.name,
  profilePic: data.profilePic,
});

}); // <-- THIS IS MISSING

 // ANSWER CALL
  socket.on("answer-call", (data) => {

  console.log("✅ ANSWER CALL");
  console.log(data);

  io.to(data.to).emit("call-accepted", data.signal);

  console.log("✅ call-accepted emitted");
});


socket.on("reject-call", (data) => {

  activeCalls.delete(socket.userId);
  activeCalls.delete(data.to);

  callSessions.delete(socket.userId);
  callSessions.delete(data.to);

  io.to(data.to).emit("call-rejected");

});

// ICE CANDIDATE 
socket.on("ice-candidate", (data) => {

  console.log("🧊 ICE");
  console.log(data);

  io.to(data.to).emit("ice-candidate", {
    candidate: data.candidate,
    from: data.from,
  });
});




// END CALL
  socket.on("end-call", (data) => {

  activeCalls.delete(socket.userId);
  activeCalls.delete(data.to);

  callSessions.delete(socket.userId);
  callSessions.delete(data.to);

  io.to(data.to).emit("call-ended");

});

  // DISCONNECT
  socket.on(
    "disconnect",
    () => {

      console.log(
        "🔴 Socket disconnected:",
        socket.id
      );

      if (socket.userId) {

  onlineUsers.delete(socket.userId);

  io.emit(
    "online-users",
    Array.from(onlineUsers.keys())
  );

activeCalls.delete(socket.userId);

const partner = callSessions.get(socket.userId);

if (partner) {

  io.to(partner).emit("call-ended");

  activeCalls.delete(partner);

  callSessions.delete(partner);

}

callSessions.delete(socket.userId);

  console.log(
    `👤 ${socket.userId} went offline`
  );

}
    }
  );
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`⚠️ Server running WITHOUT DB on port ${PORT}`);
    });
  }
};

startServer();
