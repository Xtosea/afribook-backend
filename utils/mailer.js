// utils/mailer.js
import { sendBrevo } from "../services/email/brevo.js";
import { sendResend } from "../services/email/resend.js";
import { sendSES } from "../services/email/ses.js";
import { sendMailrelay } from "../services/email/mailrelay.js";

/**
 * Sends an email using multiple providers for fallback.
 * Supports HTML and plain text automatically.
 *
 * @param {Object} data
 * @param {string} data.to - recipient email
 * @param {string} data.subject - email subject
 * @param {string} [data.html] - email HTML body
 * @param {string} [data.text] - email plain text body (optional)
 */
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
    return await sendResend(emailData);
  } catch (err) {
    console.log("Resend failed:", err.message);
  }

  try {
    console.log("Trying SES...");
    return await sendSES(emailData);
  } catch (err) {
    console.log("SES failed:", err.message);
  }

  try {
    console.log("Trying Mailrelay...");
    return await sendMailrelay(emailData);
  } catch (err) {
    console.log("Mailrelay failed:", err.message);
  }

  console.error("❌ All email providers failed");
  throw new Error("All email providers failed");
}


import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResend = async ({ to, subject, html, text }) => {
  try {
    const response = await resend.emails.send({
      from: `Afribook <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject,
      html,
      text,
    });

    console.log("Resend success:", response);
    return response;
  } catch (error) {
    console.error("Resend error:", error.message);
    throw new Error("Resend failed");
  }
};