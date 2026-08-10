// server.js
import "./config/env.js";
import express from "express";
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import {
  joinPKRoom,
  leavePKRoom,
  startPKRoom,
  getPKRoomState,
  updatePKRoomScore,
  addPKRoomScore,
  resetPKRoom,
} from "./services/pkSocketService.js";

import "./config/env.js";
import "./config/redis.js";

import fileUpload from "express-fileupload";
import helmet from "helmet";

/* ================= MODELS ================= */
import Message from "./models/Message.js";
import Post from "./models/Post.js";
import PKBattle from "./models/PKBattle.js";


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
import musicRoutes from "./routes/musicRoutes.js";
import stickerRoutes from "./routes/stickerRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import pkRoutes from "./routes/pkRoutes.js";











const app = express();
app.set("trust proxy", 1);

/* ================= CORS ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_BACKUP_URL,
  "https://africsocial.globelynks.com",
   "https://africbook.globelynks.com",
  "https://afribook-vite.vercel.app",

];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Incoming Origin:", origin);
      console.log("Allowed Origins:", allowedOrigins);

      // Allow requests with no Origin (e.g. server-to-server, Postman)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked Origin:", origin);

      return callback(
        new Error("CORS policy does not allow access from this origin"),
        false
      );
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

//DEBUGGING ONLY 
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});


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
app.use("/api/transactions", transactionRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/stickers", stickerRoutes);
app.use("/api/pk", pkRoutes);



  

                   

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

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.userId = decoded.id;

    next();

  } catch (error) {
    console.error(
      "❌ Socket authentication failed:",
      error.message
    );

    next(new Error("Invalid token"));
  }
});


// ==========================================
// PK BATTLE FINALIZER
// ==========================================

const pkTimers = new Map();

const schedulePKEnd = (battle) => {

  const battleId =
    battle._id.toString();

  // Prevent duplicate timers
  if (pkTimers.has(battleId)) {
    return;
  }

  if (
    battle.status !== "active" ||
    !battle.startedAt ||
    !battle.duration
  ) {
    return;
  }

  const startedAt =
    new Date(battle.startedAt)
      .getTime();

  const durationMs =
    Number(battle.duration) * 1000;

  const endAt =
    startedAt + durationMs;

  const remaining =
    Math.max(
      0,
      endAt - Date.now()
    );

  console.log(
    `⏱️ PK ${battleId} scheduled to end in ${remaining}ms`
  );

  const timer =
    setTimeout(
      async () => {

        try {

          await finalizePKBattle(
            battleId
          );

        } catch (error) {

          console.error(
            "❌ PK automatic finalization error:",
            error
          );

        }

      },
      remaining
    );

  pkTimers.set(
    battleId,
    timer
  );
};


// ==========================================
// FINALIZE PK BATTLE
// ==========================================

const finalizePKBattle = async (
  battleId
) => {

  try {

    const battle =
      await PKBattle.findById(
        battleId
      );

    if (!battle) {

      console.log(
        `⚠️ PK battle ${battleId} not found`
      );

      pkTimers.delete(
        battleId
      );

      return;
    }

    // Already finished
    if (
      battle.status === "completed" ||
      battle.status === "cancelled"
    ) {

      pkTimers.delete(
        battleId
      );

      return;
    }

    // --------------------------------------
    // Get final Redis score
    // --------------------------------------

    const roomState =
      await getPKRoomState(
        battleId
      );

    const finalHostAScore =
      roomState?.hostAScore ??
      battle.hostAScore ??
      0;

    const finalHostBScore =
      roomState?.hostBScore ??
      battle.hostBScore ??
      0;

    // --------------------------------------
    // Save final scores
    // --------------------------------------

    battle.hostAScore =
      finalHostAScore;

    battle.hostBScore =
      finalHostBScore;

    // --------------------------------------
    // Determine winner
    // --------------------------------------

    let winner = null;

    if (
      finalHostAScore >
      finalHostBScore
    ) {

      winner =
        battle.hostA
          ?.toString();

    } else if (
      finalHostBScore >
      finalHostAScore
    ) {

      winner =
        battle.hostB
          ?.toString();

    }

    // --------------------------------------
    // Save result
    // --------------------------------------

    battle.status =
      "completed";

    battle.completedAt =
      new Date();

    // If your PKBattle schema has a winner
    // field, save it.
    if (
      Object.prototype.hasOwnProperty.call(
        battle.toObject(),
        "winner"
      )
    ) {

      battle.winner =
        winner;
    }

    await battle.save();

    // --------------------------------------
    // Final state
    // --------------------------------------

    const finalState = {

      battleId,

      hostA:
        battle.hostA,

      hostB:
        battle.hostB,

      hostAScore:
        finalHostAScore,

      hostBScore:
        finalHostBScore,

      winner,

      draw:
        winner === null,

      startedAt:
        battle.startedAt,

      completedAt:
        battle.completedAt,

      duration:
        battle.duration,

      status:
        "completed",

    };

    const roomName =
      `pk:${battleId}`;

    // --------------------------------------
    // Broadcast final result
    // --------------------------------------

    io.to(roomName).emit(
      "pk:ended",
      finalState
    );

    // Also broadcast final room state
    io.to(roomName).emit(
      "pk:room-state",
      {
        ...finalState,

        started: false,
      }
    );

    console.log(
      `🏁 PK completed: ${battleId}`,
      finalState
    );

    // --------------------------------------
    // Remove Redis room
    // --------------------------------------

    await resetPKRoom(
      battleId
    );

    // --------------------------------------
    // Remove timer
    // --------------------------------------

    pkTimers.delete(
      battleId
    );

  } catch (error) {

    console.error(
      `❌ Failed to finalize PK ${battleId}:`,
      error
    );

    pkTimers.delete(
      battleId
    );

    throw error;
  }
};

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


// ==========================================
// PK SOCKET EVENTS
// ==========================================


// ==========================================
// JOIN PK
// ==========================================

socket.on("pk:join", async (data) => {
  try {
    const { battleId } = data;

    if (!battleId) {
      return socket.emit("pk:error", {
        message: "Battle ID is required",
      });
    }

    if (!socket.userId) {
      return socket.emit("pk:error", {
        message: "User not authenticated",
      });
    }

    // ------------------------------------------
    // Find real PK battle
    // ------------------------------------------

    const battle =
  await PKBattle.findById(battleId);

if (!battle) {
  return socket.emit("pk:error", {
    message: "PK battle not found",
  });
}

if (
  battle.status === "completed" ||
  battle.status === "cancelled"
) {
  return socket.emit("pk:error", {
    message:
      "This PK has already ended",
  });
}

    // ------------------------------------------
    // Only Host A or Host B can join
    // ------------------------------------------

    const isHostA =
      battle.hostA.toString() ===
      socket.userId.toString();

    const isHostB =
      battle.hostB.toString() ===
      socket.userId.toString();

    if (!isHostA && !isHostB) {
      return socket.emit("pk:error", {
        message: "You are not a host of this PK",
      });
    }

    // ------------------------------------------
    // Join Socket.IO room
    // ------------------------------------------

    const roomName =
      `pk:${battleId}`;

    socket.join(roomName);

    // ------------------------------------------
    // Join Redis PK room
    // ------------------------------------------

    await joinPKRoom(
      battleId,
      socket.userId
    );

    // ------------------------------------------
    // Synchronize MongoDB → Redis
    // ------------------------------------------

    if (battle.status === "active") {

      await startPKRoom(
        battleId,
        battle.startedAt
      );
    }

    // Always synchronize scores from MongoDB.
    // MongoDB remains authoritative.
    await updatePKRoomScore(
      battleId,
      battle.hostAScore || 0,
      battle.hostBScore || 0
    );

    // ------------------------------------------
    // Get final Redis room state
    // ------------------------------------------

    const state =
      await getPKRoomState(
        battleId
      );

    // ------------------------------------------
    // Broadcast synchronized state
    // ------------------------------------------

    io.to(roomName).emit(
      "pk:room-state",
      state
    );

    console.log(
      `🥊 ${socket.userId} joined PK ${battleId}`
    );

    console.log(
      "🥊 Redis PK state:",
      state
    );

  } catch (error) {

    console.error(
      "PK join error:",
      error
    );

    socket.emit("pk:error", {
      message:
        error.message ||
        "Failed to join PK",
    });
  }
});


// ==========================================
// LEAVE PK
// ==========================================

socket.on("pk:leave", async (data) => {
  try {

    const { battleId } = data;

    if (!battleId) {
      return;
    }

    if (!socket.userId) {
      return;
    }

    const roomName =
      `pk:${battleId}`;

    // Leave Socket.IO room
    socket.leave(roomName);

    // Remove from Redis room
     const state =
     await leavePKRoom(
    battleId,
    socket.userId
  );

if (state) {
  io.to(roomName).emit(
    "pk:room-state",
    state
  );
}

    console.log(
      `🚪 ${socket.userId} left PK ${battleId}`
    );

  } catch (error) {

    console.error(
      "PK leave error:",
      error
    );

    socket.emit("pk:error", {
      message:
        error.message ||
        "Failed to leave PK",
    });
  }
});


// ==========================================
// GET PK ROOM STATE
// ==========================================

socket.on("pk:get-state", async (data) => {
  try {

    const { battleId } = data;

    if (!battleId) {
      return;
    }

    const state =
  await getPKRoomState(
    battleId
  );

if (!state) {
  return socket.emit(
    "pk:error",
    {
      message:
        "PK room not found",
    }
  );
}

const battle =
  await PKBattle.findById(
    battleId
  );

if (!battle) {
  return socket.emit(
    "pk:error",
    {
      message:
        "PK battle not found",
    }
  );
}

let remainingMs = null;

if (
  battle.status === "active" &&
  battle.startedAt &&
  battle.duration
) {

  const startedAt =
    new Date(
      battle.startedAt
    ).getTime();

  const endAt =
    startedAt +
    Number(battle.duration) *
      1000;

  remainingMs =
    Math.max(
      0,
      endAt - Date.now()
    );
}

socket.emit(
  "pk:room-state",
  {
    ...state,

    status:
      battle.status,

    duration:
      battle.duration,

    remainingMs,

    hostA:
      battle.hostA,

    hostB:
      battle.hostB,

    completedAt:
      battle.completedAt ||
      null,
  }
);

  } catch (error) {

    console.error(
      "PK state error:",
      error
    );

    socket.emit("pk:error", {
      message:
        error.message ||
        "Failed to get PK state",
    });
  }
});


// ==========================================
// START PK
// ==========================================

socket.on("pk:start", async (data) => {
  try {

    const { battleId } = data;

    if (!battleId) {
      return socket.emit("pk:error", {
        message: "Battle ID is required",
      });
    }

    if (!socket.userId) {
      return socket.emit("pk:error", {
        message: "User not authenticated",
      });
    }

    // ------------------------------------------
    // Find battle
    // ------------------------------------------

    const battle =
      await PKBattle.findById(
        battleId
      );

    if (!battle) {
      return socket.emit("pk:error", {
        message: "PK battle not found",
      });
    }

    // ------------------------------------------
    // Verify host
    // ------------------------------------------

    const isHostA =
      battle.hostA.toString() ===
      socket.userId.toString();

    const isHostB =
      battle.hostB.toString() ===
      socket.userId.toString();

    if (!isHostA && !isHostB) {

      console.log(
        `🚫 Unauthorized PK start attempt: ${socket.userId}`
      );

      return socket.emit("pk:error", {
        message:
          "You are not a host of this PK",
      });
    }


    // ------------------------------------------
// Both hosts must be present
// ------------------------------------------

const currentRoom =
  await getPKRoomState(
    battleId
  );

if (!currentRoom) {
  return socket.emit("pk:error", {
    message:
      "PK room does not exist",
  });
}

const hostAJoined =
  currentRoom.users.includes(
    battle.hostA.toString()
  );

const hostBJoined =
  currentRoom.users.includes(
    battle.hostB.toString()
  );

if (
  !hostAJoined ||
  !hostBJoined
) {

  return socket.emit("pk:error", {
    message:
      "Both hosts must join the PK before starting",
  });
}

    // ------------------------------------------
    // Prevent duplicate start
    // ------------------------------------------

    if (battle.status === "active") {
      return socket.emit("pk:error", {
        message: "PK is already active",
      });
    }

    // ------------------------------------------
    // Prevent restarting finished PK
    // ------------------------------------------

    if (
      battle.status === "completed" ||
      battle.status === "cancelled"
    ) {
      return socket.emit("pk:error", {
        message:
          "This PK can no longer be started",
      });
    }

    // ------------------------------------------
    // Start MongoDB battle
    // ------------------------------------------

    battle.status = "active";
    battle.startedAt = new Date();

    await battle.save();

    schedulePKEnd(
  battle
);

    // ------------------------------------------
    // Start Redis PK room
    // ------------------------------------------

    await startPKRoom(
  battleId,
  battle.startedAt
);

    // ------------------------------------------
    // Synchronize scores
    // ------------------------------------------

    await updatePKRoomScore(
      battleId,
      battle.hostAScore || 0,
      battle.hostBScore || 0
    );

    // ------------------------------------------
    // Get complete Redis state
    // ------------------------------------------

    const roomState =
      await getPKRoomState(
        battleId
      );

    const roomName =
      `pk:${battleId}`;

    // ------------------------------------------
    // Broadcast PK started
    // ------------------------------------------

    io.to(roomName).emit(
      "pk:started",
      {
        ...roomState,

        battleId,

        startedAt:
          battle.startedAt,

        duration:
          battle.duration,

        hostA:
          battle.hostA,

        hostB:
          battle.hostB,
      }
    );

    // Also send synchronized room state
    io.to(roomName).emit(
      "pk:room-state",
      roomState
    );

    console.log(
      `🚀 PK started: ${battleId}`
    );

    console.log(
      "🥊 Redis PK state:",
      roomState
    );

  } catch (error) {

    console.error(
      "PK start error:",
      error
    );

    socket.emit("pk:error", {
      message:
        error.message ||
        "Failed to start PK",
    });
  }
});


// ==========================================
// ADD PK SCORE
// ==========================================

socket.on("pk:score", async (data) => {
  try {

    const {
      battleId,
      points,
    } = data;

    // ------------------------------------------
    // Validate battle ID
    // ------------------------------------------

    if (!battleId) {
      return socket.emit("pk:error", {
        message: "Battle ID is required",
      });
    }

    // ------------------------------------------
    // Validate authentication
    // ------------------------------------------

    if (!socket.userId) {
      return socket.emit("pk:error", {
        message: "User not authenticated",
      });
    }

    // ------------------------------------------
    // Validate points
    // ------------------------------------------

    const numericPoints = Number(points);

    if (
      !Number.isFinite(numericPoints) ||
      numericPoints <= 0
    ) {
      return socket.emit("pk:error", {
        message: "Invalid score points",
      });
    }

    // ------------------------------------------
    // Find real PK battle
    // ------------------------------------------

    const battle =
      await PKBattle.findById(battleId);

    if (!battle) {
      return socket.emit("pk:error", {
        message: "PK battle not found",
      });
    }

    // ------------------------------------------
    // PK must be active
    // ------------------------------------------

    if (battle.status !== "active") {
      return socket.emit("pk:error", {
        message: "PK is not active",
      });
    }


      // ------------------------------------------
// Check PK expiration
// ------------------------------------------

const startedAt =
  new Date(
    battle.startedAt
  ).getTime();

const durationMs =
  Number(battle.duration) * 1000;

const expiresAt =
  startedAt + durationMs;

if (
  Date.now() >= expiresAt
) {

  await finalizePKBattle(
    battleId
  );

  return socket.emit("pk:error", {
    message:
      "PK has ended",
  });
}

    // ------------------------------------------
    // Verify host
    // ------------------------------------------

    const isHostA =
      battle.hostA.toString() ===
      socket.userId.toString();

    const isHostB =
      battle.hostB.toString() ===
      socket.userId.toString();

    if (!isHostA && !isHostB) {
      return socket.emit("pk:error", {
        message: "You are not a host of this PK",
      });
    }

    // ------------------------------------------
    // ATOMIC REDIS SCORE UPDATE
    // ------------------------------------------

    const scoreState =
      await addPKRoomScore(
        battleId,
        isHostA,
        numericPoints
      );

    // ------------------------------------------
    // Persist Redis result to MongoDB
    // ------------------------------------------

    battle.hostAScore =
      scoreState.hostAScore;

    battle.hostBScore =
      scoreState.hostBScore;

    await battle.save();

    // ------------------------------------------
    // Broadcast live score
    // ------------------------------------------

    io.to(
      `pk:${battleId}`
    ).emit(
      "pk:score-updated",
      {
        battleId,

        hostAScore:
          scoreState.hostAScore,

        hostBScore:
          scoreState.hostBScore,
      }
    );

    // ------------------------------------------
    // Broadcast complete room state
    // ------------------------------------------

    io.to(
      `pk:${battleId}`
    ).emit(
      "pk:room-state",
      scoreState
    );

    // ------------------------------------------
    // Log
    // ------------------------------------------

    console.log(
      `🥊 PK score updated: ${battleId}`,
      {
        userId:
          socket.userId,

        points:
          numericPoints,

        side:
          isHostA
            ? "Host A"
            : "Host B",

        hostAScore:
          scoreState.hostAScore,

        hostBScore:
          scoreState.hostBScore,
      }
    );

  } catch (error) {

    console.error(
      "PK score socket error:",
      error
    );

    socket.emit("pk:error", {
      message:
        error.message ||
        "Failed to update PK score",
    });
  }
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


// ==========================================
// RESTORE ACTIVE PK TIMERS
// ==========================================

const activeBattles =
  await PKBattle.find({
    status: "active",
    startedAt: {
      $ne: null,
    },
  });

console.log(
  `🥊 Restoring ${activeBattles.length} active PK battle(s)`
);

for (
  const battle of activeBattles
) {

  schedulePKEnd(
    battle
  );
}


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
