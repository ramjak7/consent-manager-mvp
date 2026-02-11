# ============================================================================
# generate-encryption-keys.ps1
# 
# Generates encryption keys and SSL certificates for Consent Manager (Windows)
# 
# Requirements: OpenSSL for Windows (https://slproweb.com/products/Win32OpenSSL.html)
# 
# Usage:
#   .\generate-encryption-keys.ps1 [OutputDirectory]
# 
# Output:
#   - encryption.key: 256-bit encryption key for column-level encryption
#   - root-ca.pem/key: Root certificate authority
#   - server-cert.pem/key: PostgreSQL server certificate
#   - client-cert.pem/key: Application client certificate
# ============================================================================

param(
    [string]$OutputDir = ".\keys"
)

$ErrorActionPreference = "Stop"

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Consent Manager - Key Generation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Check for OpenSSL
# ============================================================================
try {
    $null = & openssl version 2>&1
} catch {
    Write-Host "ERROR: OpenSSL not found" -ForegroundColor Red
    Write-Host "Please install OpenSSL for Windows:" -ForegroundColor Yellow
    Write-Host "https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# 1. Generate encryption key for column-level encryption
# ============================================================================
Write-Host "📝 Generating encryption key..." -ForegroundColor Green
$encryptionKey = & openssl rand -hex 32
$encryptionKey | Out-File -FilePath "$OutputDir\encryption.key" -Encoding ASCII -NoNewline
Write-Host "✅ Encryption key saved to: $OutputDir\encryption.key" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 2. Generate SSL certificates for PostgreSQL
# ============================================================================
Write-Host "📝 Generating SSL certificates..." -ForegroundColor Green

# Certificate metadata
$Country = "IN"
$State = "Maharashtra"
$City = "Mumbai"
$Org = "Consent Manager"
$Days = 3650  # 10 years

# Root CA
Write-Host "  - Generating Root CA..." -ForegroundColor Yellow
& openssl req -new -x509 -days $Days -nodes `
    -out "$OutputDir\root-ca.pem" `
    -keyout "$OutputDir\root-ca.key" `
    -subj "/C=$Country/ST=$State/L=$City/O=$Org/CN=ConsentManager-CA" `
    2>$null
Write-Host "    ✅ Root CA: $OutputDir\root-ca.pem" -ForegroundColor Green

# Server certificate
Write-Host "  - Generating PostgreSQL server certificate..." -ForegroundColor Yellow
& openssl req -new -nodes `
    -out "$OutputDir\server-req.pem" `
    -keyout "$OutputDir\server-key.pem" `
    -subj "/C=$Country/ST=$State/L=$City/O=$Org/CN=consent-manager-db" `
    2>$null

& openssl x509 -req -in "$OutputDir\server-req.pem" -days $Days `
    -CA "$OutputDir\root-ca.pem" -CAkey "$OutputDir\root-ca.key" `
    -CAcreateserial `
    -out "$OutputDir\server-cert.pem" `
    2>$null

Remove-Item "$OutputDir\server-req.pem" -Force
Write-Host "    ✅ Server cert: $OutputDir\server-cert.pem" -ForegroundColor Green

# Client certificate
Write-Host "  - Generating application client certificate..." -ForegroundColor Yellow
& openssl req -new -nodes `
    -out "$OutputDir\client-req.pem" `
    -keyout "$OutputDir\client-key.pem" `
    -subj "/C=$Country/ST=$State/L=$City/O=$Org/CN=consent-manager-app" `
    2>$null

& openssl x509 -req -in "$OutputDir\client-req.pem" -days $Days `
    -CA "$OutputDir\root-ca.pem" -CAkey "$OutputDir\root-ca.key" `
    -CAcreateserial `
    -out "$OutputDir\client-cert.pem" `
    2>$null

Remove-Item "$OutputDir\client-req.pem" -Force
Write-Host "    ✅ Client cert: $OutputDir\client-cert.pem" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Key generation complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Display summary
# ============================================================================
Write-Host "📋 Generated files:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Column-level encryption:"
Write-Host "  - $OutputDir\encryption.key (256-bit AES key)"
Write-Host ""
Write-Host "SSL certificates:"
Write-Host "  - $OutputDir\root-ca.pem (Root CA certificate)"
Write-Host "  - $OutputDir\root-ca.key (Root CA private key)"
Write-Host "  - $OutputDir\server-cert.pem (PostgreSQL server certificate)"
Write-Host "  - $OutputDir\server-key.pem (PostgreSQL server private key)"
Write-Host "  - $OutputDir\client-cert.pem (Application client certificate)"
Write-Host "  - $OutputDir\client-key.pem (Application client private key)"
Write-Host ""

# ============================================================================
# Display next steps
# ============================================================================
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy certificates to PostgreSQL data directory:"
Write-Host "   Copy-Item $OutputDir\server-cert.pem C:\PostgreSQL\data\"
Write-Host "   Copy-Item $OutputDir\server-key.pem C:\PostgreSQL\data\"
Write-Host "   Copy-Item $OutputDir\root-ca.pem C:\PostgreSQL\data\"
Write-Host ""
Write-Host "2. Enable SSL in postgresql.conf:"
Write-Host "   Add these lines to C:\PostgreSQL\data\postgresql.conf:"
Write-Host "   ssl = on"
Write-Host "   ssl_cert_file = 'server-cert.pem'"
Write-Host "   ssl_key_file = 'server-key.pem'"
Write-Host "   ssl_ca_file = 'root-ca.pem'"
Write-Host ""
Write-Host "3. Update application .env:"
$encKey = Get-Content "$OutputDir\encryption.key" -Raw
Write-Host "   ENCRYPTION_KEY=$encKey"
Write-Host "   PG_SSL=true"
Write-Host "   PG_SSL_CA=$(Resolve-Path $OutputDir\root-ca.pem)"
Write-Host "   PG_SSL_CERT=$(Resolve-Path $OutputDir\client-cert.pem)"
Write-Host "   PG_SSL_KEY=$(Resolve-Path $OutputDir\client-key.pem)"
Write-Host ""
Write-Host "4. Run encryption migration:"
Write-Host "   cd backend"
Write-Host "   `$env:ENCRYPTION_KEY=`"$encKey`""
Write-Host "   npm run db:migrate"
Write-Host ""
Write-Host "5. Test SSL connection:"
Write-Host "   psql `"sslmode=require sslcert=$OutputDir\client-cert.pem ``"
Write-Host "        sslkey=$OutputDir\client-key.pem ``"
Write-Host "        sslrootcert=$OutputDir\root-ca.pem ``"
Write-Host "        host=localhost port=5432 dbname=consent_manager`" ``"
Write-Host "     -c `"\conninfo`""
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Store metadata
# ============================================================================
@"
Consent Manager - Encryption Keys and SSL Certificates
Generated: $(Get-Date)

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
"@ | Out-File -FilePath "$OutputDir\README.txt" -Encoding UTF8

Write-Host "📄 Metadata saved to: $OutputDir\README.txt" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  SECURITY WARNING:" -ForegroundColor Yellow
Write-Host "   - Store keys in a secure location (Vault, AWS Secrets Manager, etc.)"
Write-Host "   - Do NOT commit keys to version control"
Write-Host "   - Add $OutputDir/ to .gitignore"
Write-Host ""
