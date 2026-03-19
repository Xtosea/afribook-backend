import fetch from "node-fetch";

export const sendBrevo = async ({ to, subject, html, text }) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        email: process.env.EMAIL_FROM, // noreply@globelynks.com
        name: "Afribook",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Brevo failed");
  }

  console.log("Brevo success:", data);
  return data;
};