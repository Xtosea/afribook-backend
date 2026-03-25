import express from "express";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {

const { receiver, text } = req.body;

const message = await Message.create({
sender: req.user.id,
receiver,
text
});

res.json(message);

});

router.get("/:userId", verifyToken, async (req, res) => {

const messages = await Message.find({

$or: [
{ sender: req.user.id, receiver: req.params.userId },
{ sender: req.params.userId, receiver: req.user.id }
]

});

res.json(messages);

});

export default router;