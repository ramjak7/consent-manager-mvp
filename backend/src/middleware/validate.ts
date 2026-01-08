import { ZodType } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      return res.status(400).json({
        error: "Invalid request schema",
        details: err.errors?.map((e: any) => e.message),
      });
    }
  };