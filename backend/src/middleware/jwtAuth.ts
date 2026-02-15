import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { findOrCreateOAuthUser, getUserPermissions } from "../repositories/userRepo";

export interface JwtPayload {
  sub: string; // OAuth2 subject (user ID from provider)
  iss: string; // OAuth2 issuer (provider URL)
  email?: string;
  name?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    oauthSubject: string;
    oauthIssuer: string;
    email?: string;
    name?: string;
    permissions: string[];
  };
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header or httpOnly cookie
 * P1-7: Removed legacy API key passthrough — use requireApiKey middleware for API key auth
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized: Missing authorization header or auth cookie",
    });
  }

  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET not configured");
      return res.status(500).json({
        error: "Internal server error: JWT not configured",
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256", "RS256"],
    }) as JwtPayload;

    // Validate required claims
    if (!decoded.sub || !decoded.iss) {
      return res.status(401).json({
        error: "Unauthorized: Invalid token claims",
        message: "Token must contain 'sub' and 'iss' claims",
      });
    }

    // Find or create user in database
    const user = await findOrCreateOAuthUser({
      oauthSubject: decoded.sub,
      oauthIssuer: decoded.iss,
      email: decoded.email,
      name: decoded.name,
    });

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: "Forbidden: User account is deactivated",
      });
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.userId);
    const permissionNames = permissions.map((p) => p.permissionName);

    // Attach user to request
    req.user = {
      userId: user.userId,
      oauthSubject: user.oauthSubject!,
      oauthIssuer: user.oauthIssuer!,
      email: user.email || undefined,
      name: user.name || undefined,
      permissions: permissionNames,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Unauthorized: Invalid token",
        message: error.message,
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Unauthorized: Token expired",
        message: "Please re-authenticate",
      });
    }

    console.error("JWT authentication error:", error);
    return res.status(500).json({
      error: "Internal server error during authentication",
    });
  }
};

/**
 * Optional JWT authentication
 * Attaches user if token present, but doesn't fail if missing
 */
export const optionalJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  // Try to authenticate, but don't fail on error
  try {
    await authenticateJWT(req, res, next);
  } catch (error) {
    console.warn("Optional JWT authentication failed:", error);
    next();
  }
};
