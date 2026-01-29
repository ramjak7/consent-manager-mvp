import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export const requireApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const expectedKey = process.env.ADMIN_API_KEY;
  const apiKey = req.headers["x-api-key"];

  if (!expectedKey) {
    return res.status(401).json({
      error: "Unauthorized: ADMIN_API_KEY not configured",
    });
  }

  if (typeof apiKey !== "string") {
    return res.status(401).json({
      error: "Unauthorized: Invalid API key",
    });
  }

  if (!safeEqual(apiKey, expectedKey)) {
    return res.status(401).json({
      error: "Unauthorized: Invalid API key",
    });
  }

  next();
};