import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "@repo/utils/jwt";
import config from "config";

// Extend Express Request interface to include tempEmail
declare global {
    namespace Express {
        interface Request {
            tempEmail?: string;
        }
    }
}

export const validateTemporaryToken = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Temporary token is required",
                errorCode: "MISSING_TOKEN"
            });
        }

        const publicKey = Buffer.from(
            config.get<string>("accessTokenPublicKey"),
            "base64"
        ).toString("ascii");

        const payload = verifyJwt(token, publicKey) as any;

        if (payload.type !== "temporary") {
            return res.status(401).json({
                success: false,
                message: "Invalid token type",
                errorCode: "INVALID_TOKEN"
            });
        }

        req.tempEmail = payload.email;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired temporary token",
            errorCode: "INVALID_TOKEN"
        });
    }
};