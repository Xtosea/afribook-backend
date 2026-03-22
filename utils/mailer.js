import { sendBrevo } from "../services/email/brevo.js";
import { sendResend } from "../services/email/resend.js";
import { sendSES } from "../services/email/ses.js";
import { sendMailrelay } from "../services/email/mailrelay.js";

export async function sendEmail({ to, subject, html, text }) {
  const emailData = {
    to,
    subject,
    html,
    text: text || subject,
  };

  try {
    console.log("Trying Brevo...");
    const res = await sendBrevo(emailData);
    if (res) return res;
  } catch (err) {
    console.log("Brevo failed:", err.message);
  }

  try {
    console.log("Trying Resend...");
    const res = await sendResend(emailData);
    if (res) return res;
  } catch (err) {
    console.log("Resend failed:", err.message);
  }

  try {
    console.log("Trying SES...");
    const res = await sendSES(emailData);
    if (res) return res;
  } catch (err) {
    console.log("SES failed:", err.message);
  }

  try {
    console.log("Trying Mailrelay...");
    const res = await sendMailrelay(emailData);
    if (res) return res;
  } catch (err) {
    console.log("Mailrelay failed:", err.message);
  }

  console.error("❌ All email providers failed");
  throw new Error("All email providers failed");
}