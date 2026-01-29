import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

// Using ZodObject<any, any> satisfies both Zod and TypeScript's strict checks
type ValidationSchema = {
  body?: ZodObject<any, any>;
  params?: ZodObject<any, any>;
  query?: ZodObject<any, any>;
};

export const validate = (schema: ValidationSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.params) {
        // We use a temporary variable to satisfy Express's internal index signature
        const parsedParams = await schema.params.parseAsync(req.params);
        Object.assign(req.params, parsedParams);
      }
      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        Object.assign(req.query, parsedQuery);
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          issues: err.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }
      return next(err);
    }
  }; 