// testEmail.js
import dotenv from "dotenv";
dotenv.config();
import { sendEmail } from "./utils/mailer.js";

async function testEmail() {
  try {
    const response = await sendEmail({
      to: "your-work-email@example.com", // replace with your real test email
      subject: "Test Email from Afribook",
      html: `<h2>Hello!</h2><p>This is a test email from Afribook using all providers.</p>`,
      text: "Hello! This is a test email from Afribook using all providers."
    });

    console.log("Email test sent successfully:", response);
  } catch (error) {
    console.error("Email test failed:", error.message);
  }
}

testEmail();