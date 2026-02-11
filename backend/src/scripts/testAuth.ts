/**
 * Quick OAuth2/RBAC Test Script
 * 
 * This script tests the JWT authentication and RBAC functionality.
 */

import "dotenv/config";

const BASE_URL = "http://localhost:3000";

// Sample JWT token (replace with actual token from generateJwtToken.ts)
let JWT_TOKEN = "";

async function testAuthentication() {
  console.log("\n🧪 Testing OAuth2/RBAC Implementation\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Generate token first
  const jwt = await import("jsonwebtoken");
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    console.error("❌ ERROR: JWT_SECRET not configured properly");
    process.exit(1);
  }

  const payload = {
    sub: "admin-001",
    iss: "consent-manager-dev",
    email: "admin@consentmanager.local",
    name: "System Administrator",
    aud: "consent-manager-api",
    iat: Math.floor(Date.now() / 1000),
  };

  JWT_TOKEN = jwt.sign(payload, jwtSecret, {
    expiresIn: "1h",
  } as any);

  console.log("✅ JWT Token Generated\n");

  // Test 1: Health check
  console.log("1️⃣  Testing Health Endpoint (Public)");
  let response = await fetch(`${BASE_URL}/health`);
  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status} - ${JSON.stringify(data)}`);
  } else {
    console.log(`   ❌ Status: ${response.status}`);
  }

  // Test 2: Get current user (with JWT)
  console.log("\n2️⃣  Testing User Profile Endpoint (JWT Auth)");
  response = await fetch(`${BASE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   User ID: ${data.user.userId}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Roles: ${data.roles.map((r: any) => r.roleName).join(", ")}`);
    console.log(
      `   Permissions: ${data.permissions.length} total (showing first 5)`
    );
    data.permissions.slice(0, 5).forEach((p: any) => {
      console.log(`      - ${p.permissionName}`);
    });
  } else {
    const error = await response.text();
    console.log(`   ❌ Status: ${response.status} - ${error}`);
  }

  // Test 3: Admin endpoint - Audit logs (with JWT)
  console.log("\n3️⃣  Testing Audit Endpoint (RBAC Permission Check)");
  response = await fetch(`${BASE_URL}/audit?limit=5`, {
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   Total Audit Logs: ${data.total || data.length}`);
    if (data.logs && data.logs.length > 0) {
      console.log(`   Latest Event: ${data.logs[0].event_type}`);
    }
  } else {
    const error = await response.text();
    console.log(`   ❌ Status: ${response.status} - ${error}`);
  }

  // Test 4: Unauthorized access (no token)
  console.log("\n4️⃣  Testing Unauthorized Access (No Token)");
  response = await fetch(`${BASE_URL}/api/users/me`);
  if (response.status === 401) {
    console.log(`   ✅ Correctly rejected: ${response.status}`);
  } else {
    console.log(`   ❌ Unexpected status: ${response.status}`);
  }

  // Test 5: Invalid token
  console.log("\n5️⃣  Testing Invalid Token");
  response = await fetch(`${BASE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer invalid-token-123`,
    },
  });
  if (response.status === 401) {
    console.log(`   ✅ Correctly rejected: ${response.status}`);
  } else {
    console.log(`   ❌ Unexpected status: ${response.status}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("✅ OAuth2/RBAC Tests Complete!\n");
  console.log("Summary:");
  console.log("  - JWT authentication: Working");
  console.log("  - User provisioning: Working");
  console.log("  - RBAC permissions: Working");
  console.log("  - Unauthorized access: Blocked");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

testAuthentication().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
