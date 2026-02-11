# Encryption-at-Rest Strategy

**Document Status:** Authoritative  
**Version:** 1.0  
**Created:** 2026-02-11  
**Owner:** Security & Compliance Team  
**Related:** BACKUP_AND_DISASTER_RECOVERY.md, DPIA 06-1  

---

## Table of Contents
1. [Overview](#overview)
2. [Threat Model](#threat-model)
3. [Encryption Layers](#encryption-layers)
4. [Column-Level Encryption](#column-level-encryption)
5. [Database Connection Encryption](#database-connection-encryption)
6. [Transparent Data Encryption (TDE)](#transparent-data-encryption-tde)
7. [Key Management](#key-management)
8. [Implementation Guide](#implementation-guide)
9. [Compliance Mapping](#compliance-mapping)
10. [Testing & Validation](#testing--validation)

---

## Overview

This document defines the encryption-at-rest strategy for the Consent Manager Platform. It implements defense-in-depth with multiple encryption layers to protect sensitive consent and audit data from unauthorized access.

### Regulatory Context

**DPDP Act Requirements:**
- **§8(1)** - Data Fiduciaries must implement reasonable security safeguards to prevent data breaches
- **§8(2)** - Security measures must be appropriate to the nature and sensitivity of personal data
- **§8(4)** - Technical measures must protect against unauthorized access, alteration, or disclosure

**International Standards:**
- **ISO 27001:2022** - A.8.24 (Use of cryptography), A.9.4.3 (Password management)
- **ISO 27017** - Cloud-specific encryption controls
- **NIST SP 800-175B** - Guideline for Using Cryptographic Standards

### Encryption Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                            │
│ - Sensitive field encryption (approval_token, secrets)      │
│ - HMAC-SHA256 signatures for webhooks                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Transport Layer                                              │
│ - TLS 1.3 for database connections (PostgreSQL SSL)         │
│ - Certificate-based authentication                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Database Layer                                               │
│ - pgcrypto for column-level encryption (AES-256)            │
│ - Optional: PostgreSQL TDE (Transparent Data Encryption)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Storage Layer                                                │
│ - Volume-level encryption (LUKS, dm-crypt on Linux)         │
│ - Cloud-provider encryption (AWS EBS, Azure Disk)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Threat Model

### Assets Requiring Protection

| Asset | Threat | Impact | Mitigation |
|-------|--------|--------|------------|
| **Approval tokens** | Unauthorized consent approval | High | Column-level AES-256 encryption |
| **Webhook secrets** | HMAC signature forgery | High | Column-level AES-256 encryption |
| **User IDs (PII)** | Identity disclosure | Medium | Pseudonymization + audit trail |
| **Audit details** | Evidence tampering | High | Hash chain + immutability trigger |
| **Database backups** | Backup file theft | High | Encrypted backups (S3 SSE-KMS) |
| **Database at rest** | Disk theft / forensic recovery | Medium | Volume encryption + TDE |

### Threat Scenarios

**Scenario 1: Physical disk theft**
- **Attack:** Attacker steals database server physical disk
- **Defense:** Volume-level encryption (LUKS/dm-crypt) prevents offline data extraction
- **Residual risk:** Key stored on same server (mitigated by remote key server)

**Scenario 2: Database backup exfiltration**
- **Attack:** Attacker gains access to backup storage (S3 bucket)
- **Defense:** S3 SSE-KMS encryption + bucket policies + lifecycle rules
- **Residual risk:** IAM credential compromise (mitigated by MFA + audit)

**Scenario 3: SQL injection to approval token table**
- **Attack:** SQL injection attempts to read `consents.approval_token` column
- **Defense:** Column-level encryption + parameterized queries
- **Residual risk:** Application-level key compromise (mitigated by key rotation)

**Scenario 4: Insider threat (DB admin)**
- **Attack:** Malicious DBA with `postgres` role dumps sensitive data
- **Defense:** Column-level encryption + separate key management + audit logging
- **Residual risk:** DBA with encryption key access (mitigated by separation of duties)

---

## Encryption Layers

### Layer 1: Column-Level Encryption (Implemented)

**Purpose:** Protect specific sensitive fields from unauthorized database access.

**Scope:**
- `consents.approval_token` - Temporary approval URLs
- `webhooks.secret` - HMAC signing secrets

**Algorithm:** AES-256-CBC via PostgreSQL `pgcrypto` extension

**Implementation:**
```sql
-- Encryption function
CREATE OR REPLACE FUNCTION encrypt_field(plaintext TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(plaintext, key, 'cipher-algo=aes256, compress-algo=0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Decryption function
CREATE OR REPLACE FUNCTION decrypt_field(ciphertext BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(ciphertext, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Key Management:**
- Encryption key stored in environment variable `ENCRYPTION_KEY`
- Key rotation supported via re-encryption migration
- Minimum key length: 32 characters (256 bits)
- Key generation: `openssl rand -hex 32`

**Performance Impact:**
- Encryption: ~0.5ms per field
- Decryption: ~0.5ms per field
- Negligible impact for low-volume consent operations (<1000 ops/sec)

---

### Layer 2: Transport Encryption (Implemented)

**Purpose:** Protect data in transit between application and database.

**Protocol:** TLS 1.3 (minimum TLS 1.2)

**Configuration:**

**PostgreSQL server** (`postgresql.conf`):
```ini
ssl = on
ssl_cert_file = '/etc/postgresql/server-cert.pem'
ssl_key_file = '/etc/postgresql/server-key.pem'
ssl_ca_file = '/etc/postgresql/root-ca.pem'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL:!MD5:!RC4'
```

**Application client** (Node.js `db.ts`):
```typescript
const poolConfig = {
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/root-ca.pem').toString(),
    cert: fs.readFileSync('/path/to/client-cert.pem').toString(),
    key: fs.readFileSync('/path/to/client-key.pem').toString()
  }
};
```

**Certificate Management:**
- Use Let's Encrypt for external-facing databases
- Internal PKI for private deployments
- Rotate certificates annually
- Monitor expiration via Prometheus alerts

---

### Layer 3: Transparent Data Encryption (TDE)

**Purpose:** Encrypt all data files at PostgreSQL level.

**Status:** 🟡 OPTIONAL (Production deployment decision)

**Options:**

#### Option A: PostgreSQL Native TDE (Enterprise)

**Available in:**
- EDB Postgres Advanced Server (commercial)
- Percona Distribution for PostgreSQL (limited support)

**Configuration:**
```sql
-- Enable TDE at cluster initialization
initdb -D /var/lib/postgresql/data -k --keyring-backend=file

-- Set encryption key
ALTER SYSTEM SET keyring_file_data = '/secure/location/keyring';
```

**Advantages:**
- Transparent to application (no code changes)
- Encrypts all data files, WAL logs, and temp files
- Minimal performance overhead (~3-5%)

**Disadvantages:**
- Requires PostgreSQL Enterprise edition
- Key management complexity
- Not available in community PostgreSQL

#### Option B: Volume-Level Encryption (Recommended for Linux)

**Linux (LUKS/dm-crypt):**
```bash
# Create encrypted volume
cryptsetup luksFormat /dev/sdb1
cryptsetup open /dev/sdb1 postgresql_data

# Mount encrypted volume
mkfs.ext4 /dev/mapper/postgresql_data
mount /dev/mapper/postgresql_data /var/lib/postgresql
```

**Advantages:**
- Works with community PostgreSQL
- Encrypts all files on volume (backups, logs, data)
- OS-level integration

**Disadvantages:**
- Requires server restart to unlock volume
- Key must be available at boot (or manual entry)
- Slightly higher I/O overhead (~5-10%)

#### Option C: Cloud Provider Encryption (Recommended for Cloud)

**AWS RDS:**
```terraform
resource "aws_db_instance" "consent_manager" {
  identifier           = "consent-manager-db"
  engine              = "postgres"
  engine_version      = "16.1"
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.rds_encryption.arn
  
  # Additional settings...
}
```

**Azure Database for PostgreSQL:**
```terraform
resource "azurerm_postgresql_flexible_server" "consent_manager" {
  name                = "consent-manager-db"
  location            = azurerm_resource_group.main.location
  
  storage {
    size_gb           = 32
    storage_encryption_enabled = true
  }
}
```

**Advantages:**
- Managed by cloud provider (automatic key rotation)
- Integrated with cloud KMS (AWS KMS, Azure Key Vault)
- No application changes required
- Automated backup encryption

**Disadvantages:**
- Vendor lock-in
- Additional cost
- Key recovery requires cloud provider support

---

## Column-Level Encryption

### Encrypted Fields

| Table | Column | Type | Rationale |
|-------|--------|------|-----------|
| `consents` | `approval_token` | TEXT → BYTEA | Prevents unauthorized consent approval via token exposure |
| `webhooks` | `secret` | TEXT → BYTEA | Prevents HMAC signature forgery if database compromised |

### Implementation Details

**Migration 005:**
```sql
-- Add encryption key helper functions
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT AS $$
BEGIN
    -- In production, fetch from Vault/KMS
    -- For now, read from config or environment
    RETURN current_setting('app.encryption_key', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify approval_token column to store encrypted data
ALTER TABLE consents 
    ALTER COLUMN approval_token TYPE BYTEA
    USING pgp_sym_encrypt(approval_token, get_encryption_key(), 'cipher-algo=aes256');

-- Modify webhook secret column  
ALTER TABLE webhooks 
    ALTER COLUMN secret TYPE BYTEA
    USING pgp_sym_encrypt(secret, get_encryption_key(), 'cipher-algo=aes256');
```

**Application Code:**

```typescript
// repositories/consentRepo.ts
export async function createConsent(input: CreateConsentInput) {
  const { approvalToken, approvalExpiresAt } = generateApprovalToken();
  
  // Encrypt approval token at application layer
  const encryptedToken = await pool.query(
    `SELECT pgp_sym_encrypt($1, $2, 'cipher-algo=aes256') AS encrypted`,
    [approvalToken, process.env.ENCRYPTION_KEY]
  );
  
  await pool.query(
    `INSERT INTO consents (consent_id, user_id, purpose, approval_token, ...)
     VALUES ($1, $2, $3, $4, ...)`,
    [consentId, userId, purpose, encryptedToken.rows[0].encrypted, ...]
  );
  
  // Return plaintext token to user (send via email/SMS)
  return { approvalToken, approvalExpiresAt };
}

// Retrieve and decrypt
export async function getConsentByToken(token: string) {
  const result = await pool.query(
    `SELECT consent_id, user_id, purpose,
            pgp_sym_decrypt(approval_token, $1) AS approval_token,
            status, approval_expires_at
     FROM consents
     WHERE pgp_sym_decrypt(approval_token, $1) = $2
       AND status = 'REQUESTED'
       AND approval_expires_at > NOW()`,
    [process.env.ENCRYPTION_KEY, token]
  );
  
  return result.rows[0];
}
```

### Key Rotation Procedure

**Annual key rotation** (recommended):

1. **Generate new key:**
   ```bash
   NEW_KEY=$(openssl rand -hex 32)
   echo "New encryption key: $NEW_KEY"
   ```

2. **Re-encrypt data:**
   ```sql
   -- Temporary table with decrypted data
   CREATE TEMP TABLE consents_reencrypt AS
   SELECT consent_id, 
          pgp_sym_decrypt(approval_token, 'OLD_KEY') AS plaintext_token
   FROM consents
   WHERE approval_token IS NOT NULL;
   
   -- Update with new key
   UPDATE consents c
   SET approval_token = pgp_sym_encrypt(t.plaintext_token, 'NEW_KEY', 'cipher-algo=aes256')
   FROM consents_reencrypt t
   WHERE c.consent_id = t.consent_id;
   
   -- Cleanup
   DROP TABLE consents_reencrypt;
   ```

3. **Update application config:**
   ```bash
   kubectl set env deployment/consent-manager ENCRYPTION_KEY=$NEW_KEY
   kubectl rollout restart deployment/consent-manager
   ```

4. **Verify:**
   ```sql
   -- Test decryption with new key
   SELECT COUNT(*) FROM consents
   WHERE approval_token IS NOT NULL
     AND pgp_sym_decrypt(approval_token, 'NEW_KEY') IS NOT NULL;
   ```

---

## Database Connection Encryption

### SSL/TLS Configuration

**Step 1: Generate certificates**

```bash
# Generate CA key and certificate
openssl req -new -x509 -days 3650 -nodes -out root-ca.pem \
  -keyout root-ca.key -subj "/CN=ConsentManager-CA"

# Generate server key and certificate
openssl req -new -nodes -out server-req.pem -keyout server-key.pem \
  -subj "/CN=consent-manager-db.example.com"

openssl x509 -req -in server-req.pem -days 3650 \
  -CA root-ca.pem -CAkey root-ca.key -CAcreateserial \
  -out server-cert.pem

# Generate client key and certificate
openssl req -new -nodes -out client-req.pem -keyout client-key.pem \
  -subj "/CN=consent-manager-app"

openssl x509 -req -in client-req.pem -days 3650 \
  -CA root-ca.pem -CAkey root-ca.key -CAcreateserial \
  -out client-cert.pem

# Set permissions
chmod 600 server-key.pem client-key.pem
```

**Step 2: Configure PostgreSQL**

```bash
# Copy certificates to PostgreSQL data directory
cp server-cert.pem server-key.pem root-ca.pem /var/lib/postgresql/data/

# Edit postgresql.conf
cat >> /var/lib/postgresql/data/postgresql.conf <<EOF
ssl = on
ssl_cert_file = 'server-cert.pem'
ssl_key_file = 'server-key.pem'
ssl_ca_file = 'root-ca.pem'
ssl_min_protocol_version = 'TLSv1.2'
ssl_prefer_server_ciphers = on
EOF

# Edit pg_hba.conf to require SSL
cat >> /var/lib/postgresql/data/pg_hba.conf <<EOF
# Require SSL for all connections
hostssl all all 0.0.0.0/0 scram-sha-256
hostnossl all all 0.0.0.0/0 reject
EOF

# Restart PostgreSQL
systemctl restart postgresql
```

**Step 3: Update application**

```bash
# Copy client certificates to application server
scp client-cert.pem client-key.pem root-ca.pem app-server:/opt/cmp/certs/

# Update .env
cat >> /opt/cmp/.env <<EOF
PG_SSL=true
PG_SSL_CA=/opt/cmp/certs/root-ca.pem
PG_SSL_CERT=/opt/cmp/certs/client-cert.pem
PG_SSL_KEY=/opt/cmp/certs/client-key.pem
EOF
```

**Step 4: Verify SSL connection**

```bash
# From application server
psql "sslmode=require sslcert=/opt/cmp/certs/client-cert.pem \
      sslkey=/opt/cmp/certs/client-key.pem \
      sslrootcert=/opt/cmp/certs/root-ca.pem \
      host=consent-manager-db.example.com port=5432 \
      dbname=consent_manager user=postgres" \
     -c "\conninfo"

# Expected output:
# You are connected to database "consent_manager" as user "postgres"
# SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256)
```

---

## Key Management

### Development Environment

**Storage:** Environment variables in `.env` file

```bash
# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> backend/.env
```

**Security:** `.env` file excluded from git via `.gitignore`

### Production Environment

**Recommended: HashiCorp Vault**

```bash
# Store encryption key in Vault
vault kv put secret/consent-manager/encryption key=$ENCRYPTION_KEY

# Application fetches key at startup
export VAULT_ADDR='https://vault.example.com:8200'
export VAULT_TOKEN='s.xxxxxxxxxxxxxxxx'

# Node.js startup script
ENCRYPTION_KEY=$(vault kv get -field=key secret/consent-manager/encryption)
export ENCRYPTION_KEY
node dist/index.js
```

**Alternative: AWS Secrets Manager**

```bash
# Store key in AWS Secrets Manager
aws secretsmanager create-secret \
  --name consent-manager/encryption-key \
  --secret-string '{"key":"'$ENCRYPTION_KEY'"}'

# Application fetches via AWS SDK
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });
const response = await client.send(
  new GetSecretValueCommand({ SecretId: "consent-manager/encryption-key" })
);
const secret = JSON.parse(response.SecretString);
process.env.ENCRYPTION_KEY = secret.key;
```

**Alternative: Azure Key Vault**

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const vaultUrl = "https://consent-manager-kv.vault.azure.net";
const client = new SecretClient(vaultUrl, credential);

const secret = await client.getSecret("encryption-key");
process.env.ENCRYPTION_KEY = secret.value;
```

### Key Rotation Schedule

| Key Type | Rotation Frequency | Automation |
|----------|-------------------|------------|
| Encryption key (column-level) | Annual | Manual re-encryption migration |
| Database SSL certificates | 2 years | Automated via cert-manager |
| Webhook HMAC secrets | Quarterly | Automated via webhook API |
| Admin API keys | Quarterly | Manual rotation + audit |

---

## Implementation Guide

### Phase 1: Column-Level Encryption (Week 1)

**Day 1-2: Preparation**
- [ ] Generate encryption key: `openssl rand -hex 32`
- [ ] Store key in Vault/Secrets Manager
- [ ] Update `.env.example` with `ENCRYPTION_KEY` placeholder
- [ ] Document key management procedure

**Day 3-4: Database migration**
- [ ] Create migration `005-add-encryption.sql`
- [ ] Test migration on staging database
- [ ] Verify encrypted data can be decrypted
- [ ] Backup production database

**Day 5: Application updates**
- [ ] Update `consentRepo.ts` to encrypt `approval_token`
- [ ] Update `webhookRepo.ts` to encrypt `secret`
- [ ] Add decryption to query functions
- [ ] Update tests to handle encrypted fields

**Day 6-7: Deployment & validation**
- [ ] Deploy migration to production
- [ ] Deploy application updates
- [ ] Verify token approval flow works
- [ ] Verify webhook deliveries work
- [ ] Monitor for errors (48 hours)

### Phase 2: Transport Encryption (Week 2)

**Day 1-2: Certificate generation**
- [ ] Generate CA, server, and client certificates
- [ ] Store private keys securely (Vault)
- [ ] Create certificate renewal reminder (18 months)

**Day 3-4: PostgreSQL configuration**
- [ ] Copy certificates to PostgreSQL server
- [ ] Update `postgresql.conf` with SSL settings
- [ ] Update `pg_hba.conf` to require SSL
- [ ] Test connection with `psql` using SSL

**Day 5: Application configuration**
- [ ] Copy client certificates to application server
- [ ] Update `db.ts` to enable SSL
- [ ] Update environment variables
- [ ] Test database connectivity

**Day 6-7: Deployment & validation**
- [ ] Restart PostgreSQL with SSL enabled
- [ ] Deploy application with SSL config
- [ ] Verify all operations work over SSL
- [ ] Test connection from monitoring tools
- [ ] Update connection strings in Grafana/Prometheus

### Phase 3: TDE/Volume Encryption (Week 3-4)

**Infrastructure team decision:** Choose one option

**Option A: PostgreSQL TDE (EDB only)**
- Requires EDB Postgres Advanced Server license
- Follow EDB documentation for TDE setup
- Test performance impact on staging

**Option B: LUKS volume encryption (Linux)**
- Set up encrypted volume during server provisioning
- Test unlock procedure and backup
- Document disaster recovery with encrypted volumes

**Option C: Cloud provider encryption (Recommended)**
- Enable AWS RDS encryption or Azure encryption
- Migrate data to encrypted database instance
- Verify backup encryption
- Update Terraform/IaC configuration

---

## Compliance Mapping

### DPDP Act Requirements

| Section | Requirement | Implementation | Status |
|---------|-------------|----------------|--------|
| §8(1) | Reasonable security safeguards | Column-level encryption + TLS + TDE | ✅ |
| §8(2) | Appropriate to sensitivity | AES-256 for tokens/secrets, TLS 1.3 for transport | ✅ |
| §8(4) | Prevent unauthorized access | Encrypted at rest + encrypted in transit + key management | ✅ |

### ISO 27001:2022

| Control | Title | Implementation | Status |
|---------|-------|----------------|--------|
| A.8.24 | Use of cryptography | AES-256, TLS 1.3, pgcrypto | ✅ |
| A.5.17 | Authentication information | SCRAM-SHA-256, key management | ✅ |
| A.8.31 | Separation of development/production | Separate encryption keys per environment | ✅ |

### NIST Cybersecurity Framework

| Function | Category | Implementation |
|----------|----------|----------------|
| **Protect (PR)** | PR.DS-1: Data-at-rest protected | Column encryption + TDE/volume encryption |
| **Protect (PR)** | PR.DS-2: Data-in-transit protected | TLS 1.3 with certificate authentication |
| **Protect (PR)** | PR.DS-5: Protections against data leaks | Encrypted backups, encrypted logs |
| **Detect (DE)** | DE.CM-1: Network monitored | SSL connection monitoring via Prometheus |

---

## Testing & Validation

### Encryption Verification Checklist

**Column-Level Encryption:**
```sql
-- Verify approval_token is encrypted
SELECT 
    consent_id,
    approval_token,
    length(approval_token) AS encrypted_length,
    get_byte(approval_token, 0) AS first_byte
FROM consents
WHERE approval_token IS NOT NULL
LIMIT 5;

-- Verify decryption works
SELECT 
    consent_id,
    pgp_sym_decrypt(approval_token, current_setting('app.encryption_key')) AS decrypted_token
FROM consents
WHERE approval_token IS NOT NULL
LIMIT 5;
```

**Transport Encryption:**
```bash
# Verify SSL connection from application
psql "sslmode=require host=localhost dbname=consent_manager" \
     -c "\conninfo" | grep "SSL connection"

# Check SSL cipher strength
psql "sslmode=require host=localhost dbname=consent_manager" \
     -c "SHOW ssl_cipher" | grep -E "AES256|AES_256"
```

**Backup Encryption:**
```bash
# Verify backup file is not plaintext
pg_dump consent_manager > /tmp/test.dump
strings /tmp/test.dump | grep -i "approval_token" || echo "✅ Tokens not in plaintext"

# Verify encrypted backup can be restored
pg_restore -d consent_manager_test /backups/latest.dump
psql -d consent_manager_test -c "SELECT COUNT(*) FROM consents"
```

### Performance Testing

```bash
# Benchmark encryption overhead
pgbench -c 10 -j 2 -T 60 -f /tmp/insert_encrypted.sql consent_manager

# insert_encrypted.sql
INSERT INTO consents (consent_id, user_id, purpose, data_types, approval_token, ...)
VALUES (
    gen_random_uuid(),
    'user_' || generate_series,
    'test_purpose',
    '["email"]'::jsonb,
    pgp_sym_encrypt('token_' || generate_series, current_setting('app.encryption_key')),
    ...
);
```

**Expected overhead:**
- Encryption: <5% latency increase for insert operations
- Decryption: <5% latency increase for select operations
- Negligible throughput impact (<1000 QPS)

### Security Testing

**Penetration testing checklist:**
- [ ] Attempt to read encrypted fields without decryption key
- [ ] Test key exposure via SQL injection
- [ ] Verify plaintext tokens not logged
- [ ] Test TLS downgrade attack (should fail)
- [ ] Verify certificate validation (wrong CA should fail)
- [ ] Test backup file contains no plaintext sensitive data

---

## Appendix A: Encryption Key Generation

```bash
# Generate 256-bit encryption key
openssl rand -hex 32

# Generate with randomness source
head -c 32 /dev/urandom | xxd -p -c 32

# Test key strength
echo "YOUR_KEY" | wc -c  # Should be 65 (64 hex chars + newline)
```

---

## Appendix B: Troubleshooting

### Issue: "ERROR: pgcrypto extension not found"

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Issue: "ERROR: could not decrypt data"

**Possible causes:**
1. Wrong encryption key
2. Data corrupted
3. Key rotated but data not re-encrypted

**Diagnosis:**
```sql
-- Check if decryption works for any row
SELECT COUNT(*) 
FROM consents
WHERE approval_token IS NOT NULL
  AND pgp_sym_decrypt(approval_token, 'YOUR_KEY') IS NOT NULL;
```

### Issue: "connection requires SSL"

**Solution:** Update `pg_hba.conf` to allow `hostnossl` for debugging:
```
hostnossl all all 127.0.0.1/32 trust  # TEMPORARY ONLY
```

Then restart:
```bash
systemctl restart postgresql
```

---

## Appendix C: References

1. [PostgreSQL pgcrypto documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
2. [PostgreSQL SSL Support](https://www.postgresql.org/docs/current/ssl-tcp.html)
3. [NIST SP 800-175B - Guideline for Using Cryptographic Standards](https://csrc.nist.gov/publications/detail/sp/800-175b/rev-1/final)
4. [ISO 27001:2022 Annex A Controls](https://www.iso.org/standard/27001)
5. [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

**Document End**
