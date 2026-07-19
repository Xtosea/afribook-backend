import express from "express";
import stickers from "../data/stickers.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(stickers);
});

export default router;