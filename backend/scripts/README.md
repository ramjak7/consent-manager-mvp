# Database Backup & Restore Scripts

This directory contains automated backup and restore scripts for the Consent Manager PostgreSQL database.

## Scripts Overview

| Script | Platform | Purpose |
|--------|----------|---------|
| `backup-database.sh` | Linux/macOS | Automated daily backup with S3 upload |
| `backup-database.ps1` | Windows | Automated daily backup with S3 upload |
| `restore-database.sh` | Linux/macOS | Full database restore from backup |

## Prerequisites

### Linux/macOS
```bash
# Install PostgreSQL client tools
sudo apt-get install postgresql-client  # Ubuntu/Debian
brew install postgresql                  # macOS

# Install AWS CLI (for S3 storage)
pip install awscli
aws configure
```

### Windows
```powershell
# Install PostgreSQL (includes pg_dump/pg_restore)
# Download from: https://www.postgresql.org/download/windows/

# Install AWS CLI
# Download from: https://aws.amazon.com/cli/
```

## Setup

### 1. Configure Environment Variables

Create `.env` file in backend directory:

```bash
# Database
DB_NAME=consent_manager
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
POSTGRES_PASSWORD=your_secure_password

# Backup Configuration
BACKUP_DIR=/var/backups/postgresql
S3_BUCKET=s3://cmp-backups
RETENTION_DAYS=30
```

### 2. Set Script Permissions (Linux/macOS)

```bash
chmod +x backend/scripts/backup-database.sh
chmod +x backend/scripts/restore-database.sh
```

### 3. Configure S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://cmp-backups --region ap-south-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket cmp-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create folder structure
aws s3api put-object --bucket cmp-backups --key daily/
aws s3api put-object --bucket cmp-backups --key monthly/
aws s3api put-object --bucket cmp-backups --key wal/
```

## Usage

### Manual Backup

**Linux/macOS:**
```bash
./backend/scripts/backup-database.sh
```

**Windows:**
```powershell
.\backend\scripts\backup-database.ps1
```

### Automated Backup (Cron)

**Linux/macOS:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/cmp/backend/scripts/backup-database.sh >> /var/log/cmp/backup.log 2>&1
```

**Windows (Task Scheduler):**
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-File C:\cmp\backend\scripts\backup-database.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask `
  -Action $action `
  -Trigger $trigger `
  -TaskName "CMP-DatabaseBackup" `
  -Description "Daily PostgreSQL backup"
```

### Database Restore

**From local file:**
```bash
./backend/scripts/restore-database.sh /tmp/consent_manager_20260211_020000.dump.gz
```

**From S3:**
```bash
# Download backup
aws s3 cp s3://cmp-backups/daily/consent_manager_20260211_020000.dump.gz /tmp/

# Restore
./backend/scripts/restore-database.sh /tmp/consent_manager_20260211_020000.dump.gz
```

## Script Features

### Backup Script (`backup-database.sh`)
- ✅ Full database dump using `pg_dump` custom format
- ✅ SHA-256 checksum calculation
- ✅ Gzip compression
- ✅ S3/Azure upload with encryption
- ✅ Monthly backup retention
- ✅ Local cleanup (30 days)
- ✅ Metrics reporting
- ✅ Comprehensive logging

### Restore Script (`restore-database.sh`)
- ✅ Interactive confirmation prompt
- ✅ Checksum verification
- ✅ Emergency pre-restore backup
- ✅ Connection termination
- ✅ Parallel restore (4 jobs)
- ✅ Index rebuild
- ✅ Statistics analysis
- ✅ Audit trail recording
- ✅ Application restart
- ✅ Health check verification

## Monitoring

### Check Last Backup

```bash
# List recent backups
aws s3 ls s3://cmp-backups/daily/ --recursive | tail -5

# Download backup log
aws s3 cp s3://cmp-backups/daily/backup_latest.log /tmp/
```

### Verify Backup Integrity

```bash
# Download and verify
aws s3 cp s3://cmp-backups/daily/consent_manager_YYYYMMDD_HHMMSS.dump.gz /tmp/
aws s3 cp s3://cmp-backups/daily/consent_manager_YYYYMMDD_HHMMSS.dump.sha256 /tmp/

cd /tmp
sha256sum -c consent_manager_YYYYMMDD_HHMMSS.dump.sha256
```

## Troubleshooting

### Backup Fails

**Issue:** `pg_dump: connection failed`

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d consent_manager -c "SELECT 1;"

# Check environment variables
echo $DB_HOST $DB_PORT $DB_USER
```

### S3 Upload Fails

**Issue:** `aws: command not found`

**Solution:**
```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
```

**Issue:** `Access Denied`

**Solution:**
```bash
# Verify IAM permissions (required: s3:PutObject, s3:GetObject, s3:ListBucket)
aws sts get-caller-identity

# Test bucket access
aws s3 ls s3://cmp-backups/
```

### Restore Hangs

**Issue:** Restore process stuck

**Solution:**
```bash
# Check active connections
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE datname = 'consent_manager';"

# Force terminate
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'consent_manager';"
```

## Security Best Practices

1. **Encryption**: Always use encrypted S3 buckets
2. **Access Control**: Use IAM roles with least-privilege
3. **Credentials**: Store `POSTGRES_PASSWORD` in environment variables, not scripts
4. **Network**: Use VPN or private endpoints for S3 access
5. **Audit**: Review backup logs regularly
6. **Testing**: Perform quarterly restore tests

## Related Documentation

- [Backup & Disaster Recovery Strategy](../docs/BACKUP_AND_DISASTER_RECOVERY.md)
- [Monitoring & Alerting](../docs/MONITORING.md)
- [PostgreSQL Configuration](../db/README.md)

## Support

For issues or questions:
- Internal: Slack #cmp-ops
- On-call: DB Administrator (see rotation schedule)
