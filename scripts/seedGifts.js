import mongoose from "mongoose";
import dotenv from "dotenv";
import Gift from "../models/Gift.js";

dotenv.config();

const gifts = [
  {
    name: "Heart",
    emoji: "❤️",
    coinCost: 10,
    pkPoints: 10,
    sortOrder: 1,
  },
  {
    name: "Rose",
    emoji: "🌹",
    coinCost: 50,
    pkPoints: 50,
    sortOrder: 2,
  },
  {
    name: "Gift Box",
    emoji: "🎁",
    coinCost: 100,
    pkPoints: 100,
    sortOrder: 3,
  },
  {
    name: "Diamond",
    emoji: "💎",
    coinCost: 500,
    pkPoints: 500,
    sortOrder: 4,
  },
  {
    name: "Crown",
    emoji: "👑",
    coinCost: 1000,
    pkPoints: 1000,
    sortOrder: 5,
  },
];

const seedGifts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    for (const gift of gifts) {
      await Gift.findOneAndUpdate(
        { name: gift.name },
        gift,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log("✅ Gifts seeded successfully");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Gift seed error:", error);

    await mongoose.disconnect();
    process.exit(1);
  }
};

seedGifts();