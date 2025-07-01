import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { ApiError } from "@repo/utils/ApiError";

interface UploadOptions {
  destinationFolder: string;
  baseUploadPath?: string;
}

export const createUploadImageMiddleware = ({
  destinationFolder,
  baseUploadPath = path.join(process.cwd(), "uploads"),
}: UploadOptions) => {
  const uploadPath = path.join(baseUploadPath, destinationFolder);

  const storage: StorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log("Upload path:", uploadPath);
      console.log("Upload file:", file);
      try {
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      } catch (error) {
        cb(
          new ApiError(
            500,
            "Failed to create upload directory: " + (error as Error).message
          ),
          uploadPath
        );
      }
    },
    filename: (req, file, cb) => {
      try {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
      } catch (error) {
        cb(
          new ApiError(
            500,
            "Failed to generate filename: " + (error as Error).message
          ),
          ""
        );
      }
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only JPEG, PNG, JPG, and WEBP files are allowed."));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
};
