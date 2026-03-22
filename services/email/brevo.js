import SibApiV3Sdk from "sib-api-v3-sdk";

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendBrevo = async ({ to, subject, html, text }) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail({
      to: [{ email: to }],
      sender: { name: process.env.EMAIL_NAME, email: process.env.EMAIL_FROM },
      subject,
      htmlContent: html,
      textContent: text,
    });

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Brevo success:", response);
    return response;
  } catch (err) {
    console.error("Brevo failed:", err.message);
    throw err;
  }
};