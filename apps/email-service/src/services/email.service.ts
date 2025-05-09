import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { config } from "../config/config";

const compileTemplate = (templateName: string, data: any): string => {
  try {
    const templatePath = path.resolve(
      __dirname,
      `../templates/${templateName}.hbs`
    );
    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);
    return template(data);
  } catch (error) {
    console.error("Error compiling template:", error);
    throw new Error("Error compiling template");
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  text?: string,
  html?: string,
  templateName?: string,
  templateData?: any,
  attachments?: any
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: Number(config.email.port),
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  if (templateName && templateData) {
    html = compileTemplate(templateName, templateData);
  }

  const mailOptions = {
    from: config.email.user,
    to,
    subject,
    text,
    html,
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
