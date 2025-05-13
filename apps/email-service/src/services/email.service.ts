import { config } from "../config/config";
import { compileTemplate } from "../utils/template.utils";
import { EmailOptions } from "../types/types";
import { transporter } from "../transporter/transporter";

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const { to, subject, text, html, templateName, templateData, attachments } =
    options;
  let finalHtml = html;

  if (templateName && templateData) {
    finalHtml = compileTemplate(templateName, templateData);
  }

  const mailOptions = {
    from: config.email.user,
    to,
    subject,
    text,
    html: finalHtml,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};
