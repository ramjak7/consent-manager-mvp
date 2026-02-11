/**
 * JWT Token Generator for Testing
 * 
 * This script generates a JWT token for testing authentication and authorization.
 * It can be used to create tokens for different users with different roles.
 * 
 * Usage:
 *   ts-node src/scripts/generateJwtToken.ts [options]
 * 
 * Options:
 *   --subject <string>     OAuth subject (user ID) - default: "test-user-001"
 *   --issuer <string>      OAuth issuer - default: "consent-manager-dev"
 *   --email <string>       User email - default: "admin@example.com"
 *   --name <string>        User display name - default: "Test Admin"
 *   --expiry <string>      Token expiry - default: "7d" (7 days)
 *   --algorithm <string>   JWT algorithm - default: "HS256"
 * 
 * Examples:
 *   # Generate token for default test admin
 *   ts-node src/scripts/generateJwtToken.ts
 * 
 *   # Generate token for specific user
 *   ts-node src/scripts/generateJwtToken.ts --subject "user123" --email "user@example.com"
 * 
 *   # Generate token with 1 hour expiry
 *   ts-node src/scripts/generateJwtToken.ts --expiry "1h"
 */

import "dotenv/config";
import jwt from "jsonwebtoken";

interface TokenOptions {
  subject: string;
  issuer: string;
  email: string;
  name: string;
  expiry: string;
  algorithm: jwt.Algorithm;
}

function parseArgs(): TokenOptions {
  const args = process.argv.slice(2);
  const options: TokenOptions = {
    subject: "test-user-001",
    issuer: "consent-manager-dev",
    email: "admin@example.com",
    name: "Test Admin",
    expiry: "7d",
    algorithm: "HS256",
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case "--subject":
        options.subject = value;
        break;
      case "--issuer":
        options.issuer = value;
        break;
      case "--email":
        options.email = value;
        break;
      case "--name":
        options.name = value;
        break;
      case "--expiry":
        options.expiry = value;
        break;
      case "--algorithm":
        options.algorithm = value as jwt.Algorithm;
        break;
      default:
        console.warn(`Unknown option: ${key}`);
    }
  }

  return options;
}

async function generateToken() {
  const options = parseArgs();

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error("❌ ERROR: JWT_SECRET must be at least 32 characters long");
    console.error("   Set JWT_SECRET in your .env file");
    console.error("   Example: JWT_SECRET=your-secret-key-at-least-32-chars-long");
    process.exit(1);
  }

  // Generate token
  const payload = {
    sub: options.subject,
    iss: options.issuer,
    email: options.email,
    name: options.name,
    aud: "consent-manager-api",
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(payload, jwtSecret, {
    algorithm: options.algorithm,
    expiresIn: options.expiry,
  } as any);

  // Decode to show expiry
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const expiryDate = decoded.exp ? new Date(decoded.exp * 1000) : null;

  console.log("\n✅ JWT Token Generated Successfully\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("Token Details:");
  console.log(`  Subject:    ${options.subject}`);
  console.log(`  Issuer:     ${options.issuer}`);
  console.log(`  Email:      ${options.email}`);
  console.log(`  Name:       ${options.name}`);
  console.log(`  Algorithm:  ${options.algorithm}`);
  console.log(`  Expires:    ${expiryDate ? expiryDate.toISOString() : "never"}`);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("JWT Token:\n");
  console.log(token);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("Usage:\n");
  console.log("  curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/users/me");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("⚠️  IMPORTANT:\n");
  console.log("  1. This token will create a new user if it doesn't exist");
  console.log("  2. Assign roles to this user via: POST /api/users/:id/roles");
  console.log("  3. Default role: None (no permissions)");
  console.log("  4. To get admin access, assign SUPER_ADMIN role to this user");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

generateToken().catch((err) => {
  console.error("Failed to generate token:", err);
  process.exit(1);
});
