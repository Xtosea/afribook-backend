import express from "express";

const router = express.Router();

const stickers = [
  {
    _id: "1",
    name: "Smile",
    url: "/stickers/smile.webp",
    category: "emoji",
  },
  {
    _id: "2",
    name: "Love",
    url: "/stickers/love.webp",
    category: "love",
  },
  {
    _id: "3",
    name: "Fire",
    url: "/stickers/fire.webp",
    category: "emoji",
  },
];

router.get("/", (req, res) => {
  res.json(stickers);
});

export default router;