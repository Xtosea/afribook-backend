import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY,
    secretAccessKey: process.env.SES_SECRET_KEY,
  },
});

export const sendSES = async ({ to, subject, html, text }) => {
  const command = new SendEmailCommand({
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        Text: { Data: text || "No content" },
      },
    },
  });

  try {
    const response = await client.send(command);
    console.log("SES success:", response);
    return response;
  } catch (error) {
    console.error("SES error:", error.message);
    throw new Error("SES failed");
  }
};