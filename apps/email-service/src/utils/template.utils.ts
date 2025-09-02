import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { EmailTemplateData } from "../types/types";
import helpers from "handlebars-helpers"

helpers({ handlebars })

export const compileTemplate = (
  templateName: string,
  data: EmailTemplateData
): string => {
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
