import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./jwtAuth";

/**
 * Role-Based Access Control Middleware
 * Checks if authenticated user has required permission
 */
export const requirePermission = (permissionName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized: Authentication required",
        message: "Please provide valid JWT token",
      });
    }

    if (!req.user.permissions.includes(permissionName)) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        message: `Required permission: ${permissionName}`,
        userPermissions: req.user.permissions,
      });
    }

    next();
  };
};

/**
 * Require ANY of the specified permissions
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized: Authentication required",
      });
    }

    const hasAnyPermission = permissionNames.some((permission) =>
      req.user!.permissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        message: `Required one of: ${permissionNames.join(", ")}`,
        userPermissions: req.user.permissions,
      });
    }

    next();
  };
};

/**
 * Require ALL of the specified permissions
 */
export const requireAllPermissions = (permissionNames: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized: Authentication required",
      });
    }

    const missingPermissions = permissionNames.filter(
      (permission) => !req.user!.permissions.includes(permission)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        message: `Missing permissions: ${missingPermissions.join(", ")}`,
        userPermissions: req.user.permissions,
      });
    }

    next();
  };
};

/**
 * Resource ownership check
 * Allows access if user owns the resource OR has admin permission
 */
export const requireOwnershipOrPermission = (
  getUserIdFromRequest: (req: AuthenticatedRequest) => string,
  adminPermission: string
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized: Authentication required",
      });
    }

    const resourceUserId = getUserIdFromRequest(req);
    const isOwner = req.user.userId === resourceUserId;
    const hasAdminPermission = req.user.permissions.includes(adminPermission);

    if (!isOwner && !hasAdminPermission) {
      return res.status(403).json({
        error: "Forbidden: Can only access your own resources",
        message: `Required: ownership or ${adminPermission} permission`,
      });
    }

    next();
  };
};

/**
 * Service account check
 * Restricts endpoint to service accounts (API clients) only
 */
export const requireServiceAccount = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized: Authentication required",
    });
  }

  // Check if user is a service account (requires database query)
  // For now, assume service accounts have DF_CLIENT role
  if (!req.user.permissions.includes("PROCESSING_VALIDATE")) {
    return res.status(403).json({
      error: "Forbidden: Service account required",
      message: "This endpoint is restricted to API clients",
    });
  }

  next();
};
