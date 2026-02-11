#!/bin/bash
# ============================================================================
# generate-encryption-keys.sh
# 
# Generates encryption keys and SSL certificates for Consent Manager
# 
# Usage:
#   ./generate-encryption-keys.sh [output_directory]
# 
# Output:
#   - encryption.key: 256-bit encryption key for column-level encryption
#   - root-ca.pem/key: Root certificate authority
#   - server-cert.pem/key: PostgreSQL server certificate
#   - client-cert.pem/key: Application client certificate
# ============================================================================

set -e

# Output directory (default: ./keys)
OUTPUT_DIR="${1:-./keys}"
mkdir -p "$OUTPUT_DIR"

echo "========================================="
echo "Consent Manager - Key Generation"
echo "========================================="
echo ""

# ============================================================================
# 1. Generate encryption key for column-level encryption
# ============================================================================
echo "📝 Generating encryption key..."
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "$ENCRYPTION_KEY" > "$OUTPUT_DIR/encryption.key"
chmod 600 "$OUTPUT_DIR/encryption.key"
echo "✅ Encryption key saved to: $OUTPUT_DIR/encryption.key"
echo ""

# ============================================================================
# 2. Generate SSL certificates for PostgreSQL
# ============================================================================
echo "📝 Generating SSL certificates..."

# Certificate metadata
COUNTRY="IN"
STATE="Maharashtra"
CITY="Mumbai"
ORG="Consent Manager"
DAYS=3650  # 10 years

# Root CA
echo "  - Generating Root CA..."
openssl req -new -x509 -days $DAYS -nodes \
  -out "$OUTPUT_DIR/root-ca.pem" \
  -keyout "$OUTPUT_DIR/root-ca.key" \
  -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=ConsentManager-CA" \
  2>/dev/null
chmod 600 "$OUTPUT_DIR/root-ca.key"
echo "    ✅ Root CA: $OUTPUT_DIR/root-ca.pem"

# Server certificate
echo "  - Generating PostgreSQL server certificate..."
openssl req -new -nodes \
  -out "$OUTPUT_DIR/server-req.pem" \
  -keyout "$OUTPUT_DIR/server-key.pem" \
  -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=consent-manager-db" \
  2>/dev/null

openssl x509 -req -in "$OUTPUT_DIR/server-req.pem" -days $DAYS \
  -CA "$OUTPUT_DIR/root-ca.pem" -CAkey "$OUTPUT_DIR/root-ca.key" \
  -CAcreateserial \
  -out "$OUTPUT_DIR/server-cert.pem" \
  2>/dev/null

rm "$OUTPUT_DIR/server-req.pem"
chmod 600 "$OUTPUT_DIR/server-key.pem"
echo "    ✅ Server cert: $OUTPUT_DIR/server-cert.pem"

# Client certificate
echo "  - Generating application client certificate..."
openssl req -new -nodes \
  -out "$OUTPUT_DIR/client-req.pem" \
  -keyout "$OUTPUT_DIR/client-key.pem" \
  -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=consent-manager-app" \
  2>/dev/null

openssl x509 -req -in "$OUTPUT_DIR/client-req.pem" -days $DAYS \
  -CA "$OUTPUT_DIR/root-ca.pem" -CAkey "$OUTPUT_DIR/root-ca.key" \
  -CAcreateserial \
  -out "$OUTPUT_DIR/client-cert.pem" \
  2>/dev/null

rm "$OUTPUT_DIR/client-req.pem"
chmod 600 "$OUTPUT_DIR/client-key.pem"
echo "    ✅ Client cert: $OUTPUT_DIR/client-cert.pem"

echo ""
echo "========================================="
echo "✅ Key generation complete!"
echo "========================================="
echo ""

# ============================================================================
# Display summary
# ============================================================================
echo "📋 Generated files:"
echo ""
echo "Column-level encryption:"
echo "  - $OUTPUT_DIR/encryption.key (256-bit AES key)"
echo ""
echo "SSL certificates:"
echo "  - $OUTPUT_DIR/root-ca.pem (Root CA certificate)"
echo "  - $OUTPUT_DIR/root-ca.key (Root CA private key)"
echo "  - $OUTPUT_DIR/server-cert.pem (PostgreSQL server certificate)"
echo "  - $OUTPUT_DIR/server-key.pem (PostgreSQL server private key)"
echo "  - $OUTPUT_DIR/client-cert.pem (Application client certificate)"
echo "  - $OUTPUT_DIR/client-key.pem (Application client private key)"
echo ""

# ============================================================================
# Display next steps
# ============================================================================
echo "📝 Next steps:"
echo ""
echo "1. Protect keys and certificates:"
echo "   chmod 600 $OUTPUT_DIR/*.key"
echo "   chown postgres:postgres $OUTPUT_DIR/server-*.pem"
echo ""
echo "2. Copy certificates to PostgreSQL data directory:"
echo "   sudo cp $OUTPUT_DIR/server-cert.pem /var/lib/postgresql/data/"
echo "   sudo cp $OUTPUT_DIR/server-key.pem /var/lib/postgresql/data/"
echo "   sudo cp $OUTPUT_DIR/root-ca.pem /var/lib/postgresql/data/"
echo ""
echo "3. Enable SSL in postgresql.conf:"
echo "   echo \"ssl = on\" >> /var/lib/postgresql/data/postgresql.conf"
echo "   echo \"ssl_cert_file = 'server-cert.pem'\" >> /var/lib/postgresql/data/postgresql.conf"
echo "   echo \"ssl_key_file = 'server-key.pem'\" >> /var/lib/postgresql/data/postgresql.conf"
echo "   echo \"ssl_ca_file = 'root-ca.pem'\" >> /var/lib/postgresql/data/postgresql.conf"
echo ""
echo "4. Update application .env:"
echo "   ENCRYPTION_KEY=$(cat $OUTPUT_DIR/encryption.key)"
echo "   PG_SSL=true"
echo "   PG_SSL_CA=$OUTPUT_DIR/root-ca.pem"
echo "   PG_SSL_CERT=$OUTPUT_DIR/client-cert.pem"
echo "   PG_SSL_KEY=$OUTPUT_DIR/client-key.pem"
echo ""
echo "5. Run encryption migration:"
echo "   cd backend"
echo "   ENCRYPTION_KEY=\$(cat ../$OUTPUT_DIR/encryption.key) npm run db:migrate"
echo ""
echo "6. Test SSL connection:"
echo "   psql \"sslmode=require sslcert=$OUTPUT_DIR/client-cert.pem \\"
echo "        sslkey=$OUTPUT_DIR/client-key.pem \\"
echo "        sslrootcert=$OUTPUT_DIR/root-ca.pem \\"
echo "        host=localhost port=5432 dbname=consent_manager\" \\"
echo "     -c \"\\conninfo\""
echo ""
echo "========================================="
echo ""

# ============================================================================
# Store metadata
# ============================================================================
cat > "$OUTPUT_DIR/README.txt" <<EOF
Consent Manager - Encryption Keys and SSL Certificates
Generated: $(date)

FILES:
  - encryption.key: 256-bit AES key for pgcrypto column-level encryption
  - root-ca.pem: Root certificate authority (10 year validity)
  - server-cert.pem: PostgreSQL server SSL certificate
  - server-key.pem: PostgreSQL server private key
  - client-cert.pem: Application client SSL certificate
  - client-key.pem: Application client private key

SECURITY:
  - Keep private keys (.key files) secure
  - Do NOT commit to version control
  - Rotate annually in production
  - Use Vault/KMS for production key management

ROTATION SCHEDULE:
  - Encryption key: Annual
  - SSL certificates: Every 2 years (or before expiry)

See: docs/ENCRYPTION_AT_REST.md for full documentation
EOF

echo "📄 Metadata saved to: $OUTPUT_DIR/README.txt"
echo ""
echo "⚠️  SECURITY WARNING:"
echo "   - Store keys in a secure location (Vault, AWS Secrets Manager, etc.)"
echo "   - Do NOT commit keys to version control"
echo "   - Add $OUTPUT_DIR/ to .gitignore"
echo ""
