# OAuth2 & RBAC Implementation Guide

## Overview

This implementation provides JWT-based authentication and role-based access control (RBAC) for the Consent Manager API. It replaces the legacy API key authentication with a more secure, flexible, and standards-compliant approach.

## Architecture

### Components

1. **Database Schema** (`db/migrations/006-add-rbac.sql`)
   - `users` - OAuth2 user identities
   - `roles` - System and custom roles
   - `permissions` - Granular resource-action permissions
   - `role_permissions` - Many-to-many role-permission mapping
   - `user_roles` - User role assignments with expiration support

2. **Middleware**
   - `middleware/jwtAuth.ts` - JWT token validation and user provisioning
   - `middleware/rbac.ts` - Permission-based access control

3. **Repositories**
   - `repositories/userRepo.ts` - User and role management

4. **Routes**
   - `routes/userRoutes.ts` - User management endpoints

5. **Scripts**
   - `scripts/generateJwtToken.ts` - JWT token generator for testing
   - `scripts/bootstrapAdmin.ts` - First admin user setup

## Roles & Permissions

### Predefined Roles

| Role | Description | Use Case |
|------|-------------|----------|
| `SUPER_ADMIN` | Full system access | System administrators |
| `ADMIN` | Administrative access | Application administrators |
| `AUDITOR` | Read-only audit access | Compliance officers |
| `OPERATOR` | Operational tasks | Support staff |
| `DF_CLIENT` | Data Fiduciary client | External integrations |
| `DP_USER` | Data Principal user | End users |

### Permissions

Permissions follow the `RESOURCE_ACTION` pattern:

**Consent Management:**
- `CONSENT_CREATE` - Create new consents
- `CONSENT_READ` - View consent details
- `CONSENT_UPDATE` - Modify consents
- `CONSENT_DELETE` - Delete consents
- `CONSENT_REVOKE` - Revoke consents
- `CONSENT_FORCE_EXPIRE` - Force-expire consents (admin)

**Audit & Compliance:**
- `AUDIT_READ` - View audit logs
- `AUDIT_EXPORT` - Export audit reports
- `COMPLIANCE_READ` - View compliance reports

**User Management:**
- `USER_CREATE` - Create new users
- `USER_READ` - View user details
- `USER_UPDATE` - Modify user accounts
- `USER_DELETE` - Delete user accounts
- `USER_ASSIGN_ROLE` - Assign roles to users

**Webhook Management:**
- `WEBHOOK_CREATE` - Create webhook subscriptions
- `WEBHOOK_READ` - View webhook configurations
- `WEBHOOK_UPDATE` - Modify webhooks
- `WEBHOOK_DELETE` - Delete webhooks

**Processing:**
- `PROCESSING_VALIDATE` - Validate data processing requests
- `PROCESSING_EXECUTE` - Execute data processing

**Notices:**
- `NOTICE_CREATE` - Create privacy notices
- `NOTICE_READ` - View privacy notices
- `NOTICE_UPDATE` - Modify privacy notices
- `NOTICE_DELETE` - Delete privacy notices

**System:**
- `SYSTEM_ADMIN` - Full system administration
- `SYSTEM_BACKUP` - Backup/restore operations
- `SYSTEM_CONFIG` - System configuration

## Setup Instructions

### 1. Environment Configuration

Update your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-at-least-32-characters-long-change-this-in-production

# OAuth2 Provider (optional - for external OAuth2 integration)
OAUTH2_ISSUER=https://your-oauth-provider.com
OAUTH2_AUDIENCE=consent-manager-api
OAUTH2_JWKS_URI=https://your-oauth-provider.com/.well-known/jwks.json
```

**Important:**
- `JWT_SECRET` must be at least 32 characters
- Use a cryptographically secure random string
- Rotate secrets regularly in production
- Never commit secrets to version control

#### Generating a Secure JWT Secret

```powershell
# PowerShell (Windows)
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

```bash
# Linux/Mac
openssl rand -base64 64
```

### 2. Database Migration

The RBAC schema is automatically applied via migration `006-add-rbac.sql`:

```bash
cd backend
npm run db:migrate
```

This creates:
- 6 predefined roles
- 27 granular permissions
- 58 role-permission mappings
- Helper functions for permission checks

### 3. Bootstrap First Admin User

Create your first admin user:

```bash
cd backend

# Create admin user
npx ts-node src/scripts/bootstrapAdmin.ts \
  --subject "admin-001" \
  --email "admin@example.com" \
  --name "System Administrator" \
  --issuer "consent-manager-dev"
```

This will:
- Create a user in the database
- Assign the `SUPER_ADMIN` role
- Display all assigned permissions
- Provide next steps for token generation

### 4. Generate JWT Token

Generate a JWT token for testing:

```bash
cd backend

# Generate token for admin user
npx ts-node src/scripts/generateJwtToken.ts \
  --subject "admin-001" \
  --issuer "consent-manager-dev" \
  --email "admin@example.com" \
  --name "System Administrator" \
  --expiry "7d"
```

Options:
- `--subject` - OAuth2 subject (user ID)
- `--issuer` - OAuth2 issuer
- `--email` - User email
- `--name` - Display name
- `--expiry` - Token expiry (e.g., "1h", "7d", "30d")
- `--algorithm` - JWT algorithm (default: HS256)

The script outputs:
- Token details (subject, issuer, expiry)
- Full JWT token string
- Usage examples with curl

### 5. Test Authentication

Test the authentication flow:

```bash
# Get current user profile
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/users/me

# Test admin access (audit logs)
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/audit

# Test permission-protected endpoint
curl -H "Authorization: Bearer <your-token>" \
  -X POST \
  http://localhost:3000/admin/consents/some-id/expire
```

## API Endpoints

### User Management (`/api/users/*`)

#### Get Current User Profile
```http
GET /api/users/me
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "userId": "uuid",
    "email": "admin@example.com",
    "name": "System Administrator",
    "isActive": true,
    "isServiceAccount": false,
    "createdAt": "2025-01-15T10:00:00Z",
    "lastLoginAt": "2025-01-15T10:00:00Z"
  },
  "roles": [
    {
      "roleName": "SUPER_ADMIN",
      "description": "Full system access"
    }
  ],
  "permissions": [
    {
      "permissionName": "CONSENT_CREATE",
      "resource": "CONSENT",
      "action": "CREATE"
    },
    ...
  ]
}
```

#### Get User by ID (Admin)
```http
GET /api/users/:id
Authorization: Bearer <admin-token>
```

Requires: `USER_READ` permission

#### Assign Role to User (Admin)
```http
POST /api/users/:id/roles
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "roleName": "ADMIN",
  "expiresAt": "2026-01-15T00:00:00Z" // optional
}
```

Requires: `USER_ASSIGN_ROLE` permission

#### Remove Role from User (Admin)
```http
DELETE /api/users/:id/roles/:roleName
Authorization: Bearer <admin-token>
```

Requires: `USER_ASSIGN_ROLE` permission

#### Create Service Account (Super Admin)
```http
POST /api/users/service-accounts
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "email": "api-client@example.com",
  "name": "External API Client",
  "roleName": "DF_CLIENT",
  "metadata": {
    "clientId": "ext-client-001",
    "purpose": "Data processing integration"
  }
}
```

Requires: `USER_CREATE` + `USER_ASSIGN_ROLE` permissions

#### Deactivate/Activate User (Admin)
```http
POST /api/users/:id/deactivate
POST /api/users/:id/activate
Authorization: Bearer <admin-token>
```

Requires: `USER_UPDATE` permission

### Protected Admin Endpoints

#### Audit Logs (Admin)
```http
GET /audit
Authorization: Bearer <token>
```

Requires: `AUDIT_READ` permission

#### Force Expire Consent (Admin)
```http
POST /admin/consents/:id/expire
Authorization: Bearer <token>
```

Requires: `CONSENT_FORCE_EXPIRE` permission

## Middleware Usage

### JWT Authentication

Add `authenticateJWT` middleware to protect routes:

```typescript
import { authenticateJWT, AuthenticatedRequest } from "./middleware/jwtAuth";

app.get("/protected", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const user = req.user; // TypeScript-safe user object
  res.json({ userId: user.userId, permissions: user.permissions });
});
```

The middleware:
- Validates Bearer token
- Verifies JWT signature (HS256/RS256)
- Checks required claims (sub, iss)
- Creates/updates user in database
- Loads user permissions
- Attaches user to `req.user`

### RBAC Permission Checks

Add permission checks to routes:

```typescript
import { requirePermission, requireAnyPermission, requireAllPermissions } from "./middleware/rbac";

// Single permission
app.get("/admin/users", 
  authenticateJWT, 
  requirePermission("USER_READ"), 
  handler
);

// Any of multiple permissions (OR logic)
app.get("/reports", 
  authenticateJWT, 
  requireAnyPermission(["AUDIT_READ", "COMPLIANCE_READ"]), 
  handler
);

// All permissions required (AND logic)
app.post("/backup", 
  authenticateJWT, 
  requireAllPermissions(["SYSTEM_ADMIN", "SYSTEM_BACKUP"]), 
  handler
);

// Ownership or permission check
app.delete("/consents/:id", 
  authenticateJWT, 
  requireOwnershipOrPermission("userId", "CONSENT_DELETE"), 
  handler
);

// Service account only
app.post("/bulk-import", 
  authenticateJWT, 
  requireServiceAccount(), 
  handler
);
```

## OAuth2 Provider Integration

### Keycloak Setup

1. **Create Realm**
   - Create a new realm: `consent-manager`

2. **Create Client**
   - Client ID: `consent-manager-api`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:3000/*`

3. **Configure Token Settings**
   - Access Token Lifespan: 1 hour
   - Refresh Token Lifespan: 7 days
   - Algorithm: `RS256`

4. **Update .env**
   ```env
   JWT_SECRET=<keycloak-public-key>
   OAUTH2_ISSUER=https://keycloak.example.com/realms/consent-manager
   OAUTH2_AUDIENCE=consent-manager-api
   OAUTH2_JWKS_URI=https://keycloak.example.com/realms/consent-manager/protocol/openid-connect/certs
   ```

### Auth0 Setup

1. **Create API**
   - Name: Consent Manager API
   - Identifier: `consent-manager-api`
   - Signing Algorithm: `RS256`

2. **Create Application**
   - Name: Consent Manager Client
   - Type: Machine to Machine
   - Authorized API: Consent Manager API

3. **Update .env**
   ```env
   JWT_SECRET=<auth0-public-key>
   OAUTH2_ISSUER=https://your-tenant.auth0.com/
   OAUTH2_AUDIENCE=consent-manager-api
   OAUTH2_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json
   ```

## Security Best Practices

### Token Management

1. **Token Expiry**
   - Use short-lived tokens (1 hour recommended)
   - Implement refresh token flow for long sessions
   - Rotate tokens regularly

2. **Token Storage**
   - Client: Use httpOnly cookies or secure storage
   - Never store tokens in localStorage
   - Server: Stateless validation (no token storage)

3. **Token Revocation**
   - Deactivate user accounts to revoke all tokens
   - Use short expiry times to limit revocation window
   - Consider token blacklisting for critical scenarios

### Permission Management

1. **Principle of Least Privilege**
   - Assign minimal permissions required
   - Use role expiration for temporary access
   - Audit role assignments regularly

2. **Role Hierarchies**
   - SUPER_ADMIN > ADMIN > OPERATOR
   - Higher roles inherit lower permissions
   - Separate read/write permissions

3. **Service Accounts**
   - Create dedicated service accounts for API clients
   - Use DF_CLIENT role for external integrations
   - Track service account usage in metadata

### Audit & Monitoring

1. **Authentication Events**
   - Log all authentication attempts
   - Track failed login attempts
   - Alert on suspicious patterns

2. **Permission Events**
   - Log permission checks
   - Track privilege escalation
   - Monitor admin actions

3. **Token Security**
   - Rotate JWT_SECRET regularly
   - Monitor token validation failures
   - Alert on expired/invalid tokens

## Migration from API Key

### Backward Compatibility

The JWT middleware supports legacy API key authentication:

```typescript
// Legacy API key (still works)
curl -H "X-API-Key: your-admin-api-key" \
  http://localhost:3000/audit

// New JWT auth (preferred)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/audit
```

### Migration Steps

1. **Phase 1: Parallel Operation**
   - Deploy JWT infrastructure
   - Keep API key auth active
   - Migrate clients gradually

2. **Phase 2: Client Migration**
   - Create service accounts for API clients
   - Generate JWT tokens
   - Update client integrations
   - Test thoroughly

3. **Phase 3: Deprecation**
   - Set deprecation date
   - Notify remaining API key users
   - Monitor API key usage

4. **Phase 4: Removal**
   - Remove API key middleware
   - Remove ADMIN_API_KEY environment variable
   - Update documentation

## Troubleshooting

### Token Validation Fails

**Error:** `401 Unauthorized - Invalid token`

**Causes:**
- Token expired
- Invalid signature
- Wrong JWT_SECRET
- Malformed token

**Solutions:**
1. Generate new token
2. Check JWT_SECRET matches
3. Verify token format (Bearer <token>)
4. Check token expiry:
   ```bash
   # Decode token (no verification)
   echo "<token>" | cut -d. -f2 | base64 -d | jq
   ```

### Permission Denied

**Error:** `403 Forbidden - Insufficient permissions`

**Causes:**
- User lacks required permission
- Role not assigned
- Role expired

**Solutions:**
1. Check user permissions:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/users/me
   ```

2. Assign required role:
   ```bash
   curl -H "Authorization: Bearer <admin-token>" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"roleName":"ADMIN"}' \
     http://localhost:3000/api/users/<user-id>/roles
   ```

3. Check role expiration:
   ```sql
   SELECT * FROM user_roles 
   WHERE user_id = '<user-id>' 
   AND (expires_at IS NULL OR expires_at > NOW());
   ```

### User Not Found

**Error:** `404 Not Found - User not found`

**Causes:**
- User not created
- Wrong user ID
- Deactivated account

**Solutions:**
1. Bootstrap user:
   ```bash
   npx ts-node src/scripts/bootstrapAdmin.ts \
     --subject "<subject>" \
     --email "<email>"
   ```

2. Check user exists:
   ```sql
   SELECT * FROM users WHERE oauth_subject = '<subject>';
   ```

3. Activate account:
   ```bash
   curl -H "Authorization: Bearer <admin-token>" \
     -X POST \
     http://localhost:3000/api/users/<user-id>/activate
   ```

## Testing

### Unit Tests (TODO)

```bash
npm test
```

### Integration Tests

```bash
# Start server
npm run dev

# Run integration tests
npm run test:integration
```

### Manual Testing

```bash
# 1. Bootstrap admin
npx ts-node src/scripts/bootstrapAdmin.ts \
  --subject "test-admin" \
  --email "test@example.com"

# 2. Generate token
npx ts-node src/scripts/generateJwtToken.ts \
  --subject "test-admin" \
  --email "test@example.com"

# 3. Test authentication
export TOKEN="<generated-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users/me

# 4. Test permission
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/audit

# 5. Test role assignment
curl -H "Authorization: Bearer $TOKEN" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"roleName":"AUDITOR"}' \
  http://localhost:3000/api/users/<user-id>/roles
```

## Performance Considerations

### Database Optimizations

1. **Indexes**
   - OAuth lookup: `(oauth_subject, oauth_issuer)`
   - Email lookup: `(email)`
   - Role assignment: `(user_id, role_id)`
   - Expiration: `(expires_at)`

2. **Query Optimization**
   - Use database functions for permission checks
   - Cache user permissions after authentication
   - Batch role/permission queries

3. **Connection Pooling**
   - Configure pool size based on load
   - Monitor connection usage
   - Use read replicas for queries

### Caching Strategies

1. **User Permissions**
   - Cache in req.user after authentication
   - TTL: Token expiry time
   - Invalidate on role change

2. **Role Permissions**
   - Cache in application memory
   - TTL: 5 minutes
   - Invalidate on permission update

3. **JWT Public Keys (RS256)**
   - Cache JWKS response
   - TTL: 1 hour
   - Refresh on validation failure

## Next Steps

### Phase 1 Completion (Current)
- ✅ Database schema
- ✅ JWT authentication middleware
- ✅ RBAC middleware
- ✅ User management endpoints
- ✅ Bootstrap scripts
- ✅ Documentation

### Phase 2 (Recommended)
- [ ] Unit tests for middleware
- [ ] Integration tests for auth flow
- [ ] Refresh token support
- [ ] Token blacklisting
- [ ] Rate limiting by user
- [ ] Audit logging for auth events

### Phase 3 (Future)
- [ ] Multi-factor authentication (MFA)
- [ ] OAuth2 client credentials flow
- [ ] OpenID Connect (OIDC) support
- [ ] SAML integration
- [ ] Role hierarchy system
- [ ] Custom permission builder

## References

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B - Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

## Support

For issues or questions:
1. Check troubleshooting guide above
2. Review error logs: `backend/logs/`
3. Check database state: `psql -U postgres consent_manager`
4. Open GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Log excerpts

---

**Last Updated:** 2025-01-15  
**Version:** 1.0.0  
**Status:** Production Ready
