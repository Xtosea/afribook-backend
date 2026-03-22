import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResend = async ({ to, subject, html, text }) => {
  const response = await resend.emails.send({
    from: `Afribook <${process.env.EMAIL_FROM}>`,
    to: [to],
    subject,
    html,
    text,
  });

  // ✅ THIS IS THE FIX
  if (response.error) {
    console.error("Resend error:", response.error.message);
    throw new Error(response.error.message);
  }

  console.log("✅ Resend success:", response.data);
  return response.data;
};