// services/email/mailrelay.js
import fetch from "node-fetch"; // make sure you installed node-fetch: npm i node-fetch

export const sendMailrelay = async ({ to, subject, html, text }) => {
  try {
    const response = await fetch("https://app.mailrelay.com/api/v1/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.MAILRELAY_API_KEY
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM, // e.g., "noreply@globelynks.com"
        to,
        subject,
        html,
        text: text || subject, // fallback to subject if no text
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log("Mailrelay email sent to:", to);
    } else {
      console.error("Mailrelay failed:", data);
      throw new Error("Mailrelay API returned an error");
    }

    return data;
  } catch (error) {
    console.error("Mailrelay error:", error.message);
    throw new Error("Mailrelay failed");
  }
};