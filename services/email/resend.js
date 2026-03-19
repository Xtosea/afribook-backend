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