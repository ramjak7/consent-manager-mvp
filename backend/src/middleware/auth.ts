import { Request, Response, NextFunction } from "express";

/**
 * Basic API key authentication middleware
 * In production, use proper JWT or OAuth2
 * 
 * Usage: app.post("/admin/...", requireApiKey, handler)
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return res.status(401).json({ error: "Unauthorized: ADMIN_API_KEY not configured" });
  }

  // Strictly validate API key - reject if not exact match (no whitespace stripping)
  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }

  next();
};