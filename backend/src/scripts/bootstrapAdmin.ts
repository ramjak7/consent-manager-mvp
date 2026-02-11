/**
 * Bootstrap First Admin User
 * 
 * This script creates the first admin user and assigns them the SUPER_ADMIN role.
 * Use this script after setting up the database and before testing authentication.
 * 
 * Usage:
 *   ts-node src/scripts/bootstrapAdmin.ts [options]
 * 
 * Options:
 *   --subject <string>     OAuth subject (user ID) - REQUIRED
 *   --issuer <string>      OAuth issuer - default: "consent-manager-dev"
 *   --email <string>       User email - REQUIRED
 *   --name <string>        User display name - default: "System Administrator"
 *   --role <string>        Role to assign - default: "SUPER_ADMIN"
 * 
 * Examples:
 *   # Create admin with OAuth subject and email
 *   ts-node src/scripts/bootstrapAdmin.ts --subject "admin-001" --email "admin@example.com"
 * 
 *   # Create admin with custom name and issuer
 *   ts-node src/scripts/bootstrapAdmin.ts \
 *     --subject "admin-001" \
 *     --email "admin@example.com" \
 *     --name "John Doe" \
 *     --issuer "https://keycloak.example.com"
 */

import "dotenv/config";
import { pool } from "../db";
import { 
  findOrCreateOAuthUser, 
  getRoleByName, 
  assignRoleToUser, 
  getUserRoles,
  getUserPermissions 
} from "../repositories/userRepo";

interface BootstrapOptions {
  subject: string | null;
  issuer: string;
  email: string | null;
  name: string;
  role: string;
}

function parseArgs(): BootstrapOptions {
  const args = process.argv.slice(2);
  const options: BootstrapOptions = {
    subject: null,
    issuer: "consent-manager-dev",
    email: null,
    name: "System Administrator",
    role: "SUPER_ADMIN",
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
      case "--role":
        options.role = value;
        break;
      default:
        console.warn(`Unknown option: ${key}`);
    }
  }

  return options;
}

async function bootstrapAdmin() {
  const options = parseArgs();

  // Validate required fields
  if (!options.subject) {
    console.error("❌ ERROR: --subject is required");
    console.error("   Example: --subject 'admin-001'");
    process.exit(1);
  }

  if (!options.email) {
    console.error("❌ ERROR: --email is required");
    console.error("   Example: --email 'admin@example.com'");
    process.exit(1);
  }

  try {
    console.log("\n🔄 Bootstrapping Admin User...\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 1. Find or create user
    console.log(`1️⃣  Creating user: ${options.email}`);
    const user = await findOrCreateOAuthUser({
      oauthSubject: options.subject,
      oauthIssuer: options.issuer,
      email: options.email,
      name: options.name,
    });

    console.log(`   ✅ User created: ${user.userId}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Name: ${user.name}`);
    console.log(`      OAuth Subject: ${user.oauthSubject}`);
    console.log(`      OAuth Issuer: ${user.oauthIssuer}`);

    // 2. Get role
    console.log(`\n2️⃣  Looking up role: ${options.role}`);
    const role = await getRoleByName(options.role);

    if (!role) {
      console.error(`\n❌ ERROR: Role '${options.role}' not found`);
      console.error("   Available roles:");
      const rolesResult = await pool.query(`SELECT role_name FROM roles ORDER BY role_name`);
      rolesResult.rows.forEach((r) => console.error(`     - ${r.role_name}`));
      process.exit(1);
    }

    console.log(`   ✅ Role found: ${role.roleName}`);
    console.log(`      Description: ${role.description}`);

    // 3. Check if user already has this role
    const existingRoles = await getUserRoles(user.userId);
    const hasRole = existingRoles.some((r) => r.roleId === role.roleId);

    if (hasRole) {
      console.log(`\n⚠️  User already has role: ${role.roleName}`);
    } else {
      // 4. Assign role
      console.log(`\n3️⃣  Assigning role to user...`);
      await assignRoleToUser({
        userId: user.userId,
        roleId: role.roleId,
        assignedBy: user.userId, // Self-assignment for bootstrap
      });
      console.log(`   ✅ Role assigned: ${role.roleName}`);
    }

    // 5. Display user permissions
    const permissions = await getUserPermissions(user.userId);
    console.log(`\n4️⃣  User permissions (${permissions.length} total):`);
    
    const permissionsByResource: Record<string, string[]> = {};
    permissions.forEach((p) => {
      if (!permissionsByResource[p.resource]) {
        permissionsByResource[p.resource] = [];
      }
      permissionsByResource[p.resource].push(p.action);
    });

    Object.entries(permissionsByResource)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([resource, actions]) => {
        console.log(`\n   ${resource}:`);
        actions.forEach((action) => console.log(`      - ${action}`));
      });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("✅ Admin User Bootstrap Complete!\n");
    console.log("Next Steps:");
    console.log("  1. Generate a JWT token for this user:");
    console.log(`     ts-node src/scripts/generateJwtToken.ts \\`);
    console.log(`       --subject "${options.subject}" \\`);
    console.log(`       --issuer "${options.issuer}" \\`);
    console.log(`       --email "${options.email}" \\`);
    console.log(`       --name "${options.name}"`);
    console.log("\n  2. Test authentication:");
    console.log(`     curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/users/me`);
    console.log("\n  3. Test admin access:");
    console.log(`     curl -H 'Authorization: Bearer <token>' http://localhost:3000/audit`);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await pool.end();
  } catch (error) {
    console.error("\n❌ Bootstrap failed:", error);
    await pool.end();
    process.exit(1);
  }
}

bootstrapAdmin();
