import nodemailer from "nodemailer";
import { config } from "../config/config";

export const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});
