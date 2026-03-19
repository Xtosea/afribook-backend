import express from "express";
import { sendEmail } from "../utils/mailer.js";

const router = express.Router();

router.get("/test-email", async (req, res) => {
  try {
    const result = await sendEmail({
      to: "yourrealemail@gmail.com", // 👈 replace with your email
      subject: "Test Email 🚀",
      html: "<h1>Hello from Globelynks via Resend</h1>",
      text: "Hello from Globelynks",
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;