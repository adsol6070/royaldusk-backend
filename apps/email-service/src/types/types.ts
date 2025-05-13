export interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateName?: string;
  templateData?: EmailTemplateData;
  attachments?: any[];
}
