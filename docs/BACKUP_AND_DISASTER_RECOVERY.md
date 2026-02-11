# Backup and Disaster Recovery (DR) Strategy

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-11 | CMP Team | Initial DR strategy |

---

## Executive Summary

This document defines the backup and disaster recovery strategy for the Consent Management Platform (CMP) PostgreSQL database. The strategy ensures compliance with DPDP Act requirements for data protection, business continuity, and audit trail preservation.

**Key Metrics:**
- **RPO (Recovery Point Objective)**: 1 hour
- **RTO (Recovery Time Objective)**: 4 hours
- **Backup Retention**: 30 days daily, 12 months monthly
- **Testing Frequency**: Quarterly

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Backup Automation](#backup-automation)
3. [Restore Procedures](#restore-procedures)
4. [Point-In-Time Recovery (PITR)](#point-in-time-recovery-pitr)
5. [Disaster Recovery Plan](#disaster-recovery-plan)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Roles & Responsibilities](#roles--responsibilities)

---

## Backup Strategy

### 1.1 Backup Types

#### Full Database Backups (pg_dump)
- **Frequency**: Daily at 02:00 UTC
- **Method**: `pg_dump` with custom format
- **Storage**: AWS S3 / Azure Blob Storage (encrypted at rest)
- **Retention**: 
  - Daily backups: 30 days
  - Monthly backups: 12 months
- **Size Estimate**: ~500MB compressed (varies with consent volume)

#### Write-Ahead Log (WAL) Archives
- **Frequency**: Continuous streaming
- **Method**: PostgreSQL WAL archiving
- **Storage**: Same bucket as full backups, separate folder
- **Retention**: 7 days (aligned with oldest retained full backup)
- **Purpose**: Enable Point-In-Time Recovery (PITR)

#### Configuration Backups
- **Frequency**: On every change + weekly
- **Components**:
  - PostgreSQL configuration files (`postgresql.conf`, `pg_hba.conf`)
  - Environment variables (`.env` - secrets redacted)
  - Backend application configuration
  - Database migration scripts
- **Storage**: Git repository + backup storage

### 1.2 What Gets Backed Up

**Critical Tables:**
- `consents` - All consent versions and states
- `audit_logs` - Immutable audit trail (DPDP compliance)
- `webhooks` - Data Fiduciary notification configurations
- `webhook_deliveries` - Delivery history for compliance

**Database Objects:**
- All schemas, tables, indexes
- Sequences (for ID generation)
- Triggers (audit log protection)
- Functions and procedures
- Views

**NOT Backed Up:**
- Temporary tables
- Session data
- Application logs (backed up separately via Winston)

### 1.3 Backup Security

- **Encryption**: AES-256 encryption at rest
- **Access Control**: IAM roles with least-privilege principle
- **Secret Management**: Database credentials stored in HashiCorp Vault / AWS Secrets Manager
- **Network**: Backups transferred over TLS 1.3
- **Integrity**: SHA-256 checksums for all backup files

---

## Backup Automation

### 2.1 Automated Backup Script

**Location**: `backend/scripts/backup-database.sh`

```bash
#!/bin/bash
set -euo pipefail

# Configuration
DB_NAME="${DB_NAME:-consent_manager}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-s3://cmp-backups}"
RETENTION_DAYS=30

# Variables
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

echo "[$(date)] Starting database backup..." | tee -a "$LOG_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform pg_dump with custom format (supports parallel restore)
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -F c -b -v -f "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"

# Verify backup integrity
if [ ! -f "$BACKUP_FILE" ]; then
  echo "[$(date)] ERROR: Backup file not created!" | tee -a "$LOG_FILE"
  exit 1
fi

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
echo "$CHECKSUM" > "${BACKUP_FILE}.sha256"
echo "[$(date)] Backup checksum: $CHECKSUM" | tee -a "$LOG_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Upload to S3/Azure Blob Storage
echo "[$(date)] Uploading to cloud storage..." | tee -a "$LOG_FILE"
aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/daily/" --storage-class STANDARD_IA
aws s3 cp "${BACKUP_FILE}.sha256" "${S3_BUCKET}/daily/"

# Verify upload
if aws s3 ls "${S3_BUCKET}/daily/$(basename $BACKUP_FILE)" > /dev/null; then
  echo "[$(date)] Upload successful" | tee -a "$LOG_FILE"
else
  echo "[$(date)] ERROR: Upload failed!" | tee -a "$LOG_FILE"
  exit 1
fi

# Keep last month of backups
DAY_OF_MONTH=$(date +"%d")
if [ "$DAY_OF_MONTH" == "01" ]; then
  echo "[$(date)] Creating monthly backup copy..." | tee -a "$LOG_FILE"
  aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/monthly/"
fi

# Clean up local backups older than retention period
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Local cleanup completed" | tee -a "$LOG_FILE"

# Send metrics to monitoring system
curl -X POST http://localhost:3000/metrics/backup \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"success\",\"size\":$(stat -f%z "$BACKUP_FILE"),\"timestamp\":\"$TIMESTAMP\"}"

echo "[$(date)] Backup completed successfully" | tee -a "$LOG_FILE"
```

### 2.2 Cron Schedule

**Linux/macOS** (`crontab -e`):
```cron
# Daily full backup at 2 AM UTC
0 2 * * * /opt/cmp/backend/scripts/backup-database.sh >> /var/log/cmp/backup.log 2>&1

# Configuration backup weekly (Sundays at 3 AM)
0 3 * * 0 /opt/cmp/backend/scripts/backup-config.sh >> /var/log/cmp/backup-config.log 2>&1
```

**Windows Task Scheduler**:
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\cmp\backend\scripts\backup-database.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "CMP-DatabaseBackup" -Description "Daily PostgreSQL backup for Consent Manager"
```

### 2.3 PostgreSQL Continuous Archiving (WAL)

**Configure in `postgresql.conf`**:
```conf
# WAL Configuration
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://cmp-backups/wal/%f'
archive_timeout = 300  # Force segment rotation every 5 minutes

# Retention
max_wal_size = 2GB
min_wal_size = 1GB
```

**Restart PostgreSQL after configuration change**:
```bash
sudo systemctl restart postgresql
```

### 2.4 Backup Validation Script

**Location**: `backend/scripts/validate-backup.sh`

```bash
#!/bin/bash
set -euo pipefail

BACKUP_FILE=$1

echo "Validating backup: $BACKUP_FILE"

# Check file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found"
  exit 1
fi

# Verify checksum
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "Verifying checksum..."
  sha256sum -c "${BACKUP_FILE}.sha256"
else
  echo "WARNING: No checksum file found"
fi

# Test restore to temporary database
TEST_DB="cmp_test_restore_$(date +%s)"
echo "Creating test database: $TEST_DB"
createdb "$TEST_DB"

echo "Attempting restore..."
if zcat "$BACKUP_FILE" | pg_restore -d "$TEST_DB" --no-owner --no-acl; then
  echo "SUCCESS: Backup is valid"
  # Run smoke tests
  psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM consents;"
  psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM audit_logs;"
else
  echo "ERROR: Backup restore failed"
  dropdb "$TEST_DB"
  exit 1
fi

# Cleanup
dropdb "$TEST_DB"
echo "Validation complete"
```

---

## Restore Procedures

### 3.1 Full Database Restore

**When to Use**: Complete database loss, corruption, or disaster recovery scenario.

#### Step 1: Prepare Environment

```bash
# Stop application servers
sudo systemctl stop cmp-backend

# Verify database server is running
pg_isready -h localhost -p 5432

# Download backup from storage
aws s3 cp s3://cmp-backups/daily/consent_manager_20260211_020000.dump.gz /tmp/
cd /tmp
gunzip consent_manager_20260211_020000.dump.gz
```

#### Step 2: Verify Backup Integrity

```bash
# Check SHA-256 checksum
aws s3 cp s3://cmp-backups/daily/consent_manager_20260211_020000.dump.sha256 /tmp/
sha256sum -c consent_manager_20260211_020000.dump.sha256
```

#### Step 3: Drop Existing Database (if needed)

```bash
# Terminate all connections
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'consent_manager' AND pid <> pg_backend_pid();"

# Drop database
dropdb -U postgres consent_manager
```

#### Step 4: Create Fresh Database

```bash
createdb -U postgres -O postgres consent_manager
```

#### Step 5: Restore Backup

```bash
# Restore using pg_restore (parallel jobs for faster restore)
pg_restore -U postgres -d consent_manager -j 4 --no-owner --no-acl /tmp/consent_manager_20260211_020000.dump

# Verify restore
psql -U postgres -d consent_manager -c "SELECT COUNT(*) FROM consents;"
psql -U postgres -d consent_manager -c "SELECT COUNT(*) FROM audit_logs;"
```

#### Step 6: Post-Restore Tasks

```bash
# Update sequences (if needed)
psql -U postgres -d consent_manager <<EOF
SELECT setval('consents_version_seq', (SELECT MAX(version) FROM consents));
EOF

# Rebuild indexes (if corrupted)
psql -U postgres -d consent_manager -c "REINDEX DATABASE consent_manager;"

# Analyze tables for query optimizer
psql -U postgres -d consent_manager -c "ANALYZE;"

# Verify triggers are active
psql -U postgres -d consent_manager -c "SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'audit_logs'::regclass;"
```

#### Step 7: Restart Application

```bash
# Start backend server
sudo systemctl start cmp-backend

# Verify health check
curl http://localhost:3000/health
```

#### Step 8: Document Restore

```bash
# Record restore event in audit log
psql -U postgres -d consent_manager <<EOF
INSERT INTO audit_logs (audit_id, event_type, timestamp, details)
VALUES (
  gen_random_uuid(),
  'SYSTEM_RESTORE',
  NOW(),
  '{"backup_date": "2026-02-11T02:00:00Z", "restored_by": "admin", "reason": "disaster_recovery"}'::jsonb
);
EOF
```

**Estimated Time**: 1-2 hours (depending on database size)

---

### 3.2 Point-In-Time Recovery (PITR)

**When to Use**: Need to restore to specific timestamp (e.g., before accidental data deletion).

#### Prerequisites
- WAL archiving enabled
- Base backup + WAL files available

#### Step 1: Download Base Backup and WAL Files

```bash
# Download base backup
aws s3 cp s3://cmp-backups/daily/consent_manager_20260210_020000.dump.gz /tmp/base.dump.gz

# Download all WAL files since base backup
aws s3 sync s3://cmp-backups/wal/ /var/lib/postgresql/14/main/pg_wal/
```

#### Step 2: Create Recovery Configuration

Create `recovery.conf` in PostgreSQL data directory:

```conf
# Recovery settings
restore_command = 'aws s3 cp s3://cmp-backups/wal/%f %p'
recovery_target_time = '2026-02-11 14:30:00 UTC'
recovery_target_action = 'promote'
```

#### Step 3: Restore Base Backup

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
gunzip -c /tmp/base.dump.gz | pg_restore -d consent_manager_pitr --no-owner --no-acl

# Copy recovery configuration
sudo cp recovery.conf /var/lib/postgresql/14/main/
```

#### Step 4: Start Recovery

```bash
# Start PostgreSQL (will enter recovery mode)
sudo systemctl start postgresql

# Monitor recovery progress
tail -f /var/log/postgresql/postgresql-14-main.log

# Look for: "recovery complete" or "database system is ready to accept connections"
```

#### Step 5: Verify Restored State

```bash
# Check last restored transaction timestamp
psql -U postgres -d consent_manager_pitr -c "SELECT pg_last_xact_replay_timestamp();"

# Verify data at target time
psql -U postgres -d consent_manager_pitr -c "SELECT * FROM consents WHERE created_at < '2026-02-11 14:30:00';"
```

**Estimated Time**: 2-4 hours (depending on WAL volume)

---

### 3.3 Table-Level Restore

**When to Use**: Accidental deletion of specific table, need to restore without full database downtime.

```bash
# Restore single table from backup
pg_restore -U postgres -d consent_manager -t consents /tmp/backup.dump

# Or restore to temporary database, then copy
createdb temp_restore
pg_restore -U postgres -d temp_restore /tmp/backup.dump
psql -U postgres <<EOF
\c consent_manager
DROP TABLE consents CASCADE;
CREATE TABLE consents AS SELECT * FROM temp_restore.consents;
EOF
```

---

## Disaster Recovery Plan

### 4.1 RTO and RPO Targets

| Scenario | RPO | RTO | Impact |
|----------|-----|-----|--------|
| Database server failure | 1 hour | 4 hours | Service outage |
| Data corruption | 1 hour | 4 hours | Partial data loss |
| Accidental deletion | 5 minutes | 2 hours | Recoverable via PITR |
| Datacenter failure | 1 hour | 8 hours | Regional outage |
| Ransomware attack | 24 hours | 12 hours | Full restore from offline backup |

### 4.2 Disaster Scenarios & Responses

#### Scenario 1: Database Server Crash

**Detection**: Monitoring alerts, application health check failures

**Response**:
1. Verify database process status: `pg_isready`
2. Check logs: `/var/log/postgresql/postgresql-14-main.log`
3. Attempt restart: `sudo systemctl restart postgresql`
4. If restart fails: Restore from latest backup (Section 3.1)
5. Notify stakeholders: Data Fiduciaries, internal team

**Owner**: DB Administrator  
**SLA**: 4 hours

#### Scenario 2: Data Corruption

**Detection**: Application errors, checksum failures, inconsistent query results

**Response**:
1. Identify corrupted tables: `SELECT * FROM pg_stat_database WHERE datname = 'consent_manager';`
2. Stop application writes: `sudo systemctl stop cmp-backend`
3. Assess corruption scope: `VACUUM FULL; REINDEX DATABASE consent_manager;`
4. If reindex fails: Perform PITR to last known good state
5. Validate restored data with smoke tests

**Owner**: DB Administrator  
**SLA**: 4 hours

#### Scenario 3: Accidental Data Deletion

**Detection**: User report, audit log analysis

**Response**:
1. Immediately stop application: `sudo systemctl stop cmp-backend`
2. Identify deletion timestamp from audit logs
3. Perform PITR to 5 minutes before deletion (Section 3.2)
4. Export deleted records to CSV for reconciliation
5. Restore to production after validation

**Owner**: Senior Engineer  
**SLA**: 2 hours

#### Scenario 4: Ransomware Attack

**Detection**: File encryption, ransom note, monitoring alerts

**Response**:
1. **Isolate**: Disconnect database server from network
2. **Preserve Evidence**: Take disk snapshot, save logs
3. **Assess**: Check if backups are encrypted (use offline/air-gapped backup)
4. **Restore**: Use oldest uncompromised backup + WAL files
5. **Secure**: Change all credentials, patch vulnerabilities
6. **Report**: Notify CERT-In, conduct forensics

**Owner**: Security Team + DB Administrator  
**SLA**: 12 hours

### 4.3 Failover to Standby Database

**For High Availability Setup** (if replicas configured):

```bash
# Promote standby to primary
pg_ctl promote -D /var/lib/postgresql/14/standby

# Update application connection strings
# Update DNS records or load balancer

# Verify promotion
psql -h standby-host -c "SELECT pg_is_in_recovery();"  # Should return false
```

### 4.4 Communication Plan

| Stakeholder | Notification Method | SLA |
|-------------|---------------------|-----|
| Internal Engineering Team | Slack #incidents | Immediate |
| Data Fiduciaries (via webhook) | Automated alert | 15 minutes |
| Management | Email + Phone | 30 minutes |
| Data Board (if required) | Email | 4 hours |
| Users (if downtime > 2h) | Status page | 2 hours |

**Incident Communication Template**:
```
Subject: [INCIDENT] Consent Manager Database Issue - [TIMESTAMP]

Status: [INVESTIGATING | IDENTIFIED | MONITORING | RESOLVED]
Impact: [Service Availability / Data Integrity]
Affected: [Number] consents, [Number] Data Fiduciaries
ETA: [Expected Resolution Time]

Details:
[Brief description of issue]

Actions Taken:
- [Step 1]
- [Step 2]

Next Steps:
- [Action 1]
- [Action 2]

Contact: [Incident Commander Name] - [Phone/Email]
```

---

## Testing & Validation

### 5.1 Quarterly DR Test Checklist

**Schedule**: Last Sunday of each quarter (March, June, September, December)  
**Duration**: 4 hours  
**Participants**: DB Admin, Backend Engineer, QA Lead

#### Pre-Test Preparation
- [ ] Schedule test during low-traffic window
- [ ] Notify team in advance (1 week notice)
- [ ] Prepare isolated test environment
- [ ] Download latest production backup
- [ ] Review and update runbooks

#### Test Execution

**Test 1: Full Database Restore**
- [ ] Download backup from S3/Azure
- [ ] Verify checksum
- [ ] Create test database
- [ ] Restore using pg_restore
- [ ] Validate record counts match production
- [ ] Verify triggers and constraints active
- [ ] Document restore time (target: < 2 hours)

**Test 2: Point-In-Time Recovery**
- [ ] Select target timestamp (24 hours ago)
- [ ] Download base backup + WAL files
- [ ] Configure recovery.conf
- [ ] Perform PITR
- [ ] Verify data at target timestamp
- [ ] Document recovery time (target: < 4 hours)

**Test 3: Table-Level Restore**
- [ ] Restore single table (e.g., `consents`)
- [ ] Verify data integrity
- [ ] Check foreign key constraints
- [ ] Document restore time (target: < 30 minutes)

**Test 4: Backup Integrity**
- [ ] Run validation script on 5 random backups
- [ ] Verify checksums match
- [ ] Test gunzip extraction
- [ ] Validate pg_restore --list output

**Test 5: Disaster Scenario Simulation**
- [ ] Simulate database corruption (in test env)
- [ ] Execute incident response playbook
- [ ] Practice stakeholder communication
- [ ] Document deviations from runbook

#### Post-Test Activities
- [ ] Document actual vs. target RTO/RPO
- [ ] Identify gaps in procedures
- [ ] Update runbooks with lessons learned
- [ ] Create Jira tickets for improvements
- [ ] Send test report to management

**Success Criteria**:
- All restores complete successfully
- RTO/RPO within targets
- No undocumented manual steps required
- Team can execute without external help

### 5.2 DR Test Report Template

```markdown
# DR Test Report - [YYYY-MM-DD]

## Executive Summary
- Test Date: [Date]
- Participants: [Names]
- Overall Status: [PASS / FAIL / PARTIAL]
- RTO Achieved: [X hours] (Target: 4 hours)
- RPO Achieved: [X minutes] (Target: 60 minutes)

## Test Results

| Test Case | Status | Time Taken | Notes |
|-----------|--------|------------|-------|
| Full Restore | PASS | 1.5h | Within target |
| PITR | PASS | 3.2h | Within target |
| Table Restore | FAIL | N/A | Missing permissions |

## Issues Identified
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Action Item: [Jira ticket number]

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Next Test Date
[Date - Next quarter]

Sign-off:
- DB Admin: [Name] [Date]
- Engineering Manager: [Name] [Date]
```

---

## Monitoring & Alerting

### 6.1 Backup Monitoring Metrics

**Metrics to Track**:
- Backup success/failure rate
- Backup duration (trend over time)
- Backup file size (detect anomalies)
- Backup age (last successful backup)
- Storage utilization (S3/Azure)

**Prometheus Queries**:
```promql
# Backup age (hours since last backup)
(time() - backup_last_success_timestamp) / 3600

# Backup failure rate (last 7 days)
sum(rate(backup_failures_total[7d]))

# Storage growth rate
rate(backup_storage_bytes[30d])
```

### 6.2 Alerts

**Critical Alerts** (PagerDuty):

```yaml
- alert: BackupFailed
  expr: backup_last_success_timestamp < (time() - 86400)
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Database backup failed for >24 hours"
    description: "Last successful backup: {{ $value | humanizeDuration }}"

- alert: BackupSizeAnomaly
  expr: abs(backup_size_bytes - backup_size_bytes offset 1d) / backup_size_bytes > 0.5
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Backup size changed >50%"
    description: "Possible data loss or corruption"

- alert: WALArchivingFailed
  expr: pg_wal_archive_failed_count > 0
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "PostgreSQL WAL archiving failures detected"
```

### 6.3 Backup Monitoring Dashboard

**Grafana Panels**:
1. Backup Success Rate (7-day rolling average)
2. Time to Complete Backup (histogram)
3. Backup Storage Growth (line chart)
4. Last Successful Backup (single stat)
5. WAL Archive Status (gauge)
6. Restore Test History (table)

---

## Roles & Responsibilities

| Role | Primary Responsibilities | Backup Contact |
|------|-------------------------|----------------|
| **DB Administrator** | - Execute backups/restores<br>- Maintain runbooks<br>- Quarterly DR tests | Senior Backend Engineer |
| **DevOps Engineer** | - Backup infrastructure<br>- Storage management<br>- Monitoring setup | SRE Lead |
| **Security Team** | - Encryption policies<br>- Access control<br>- Incident response | CISO |
| **Compliance Officer** | - Audit trail retention<br>- Regulatory reporting<br>- DR documentation | Legal Counsel |
| **Incident Commander** | - Coordinate DR events<br>- Stakeholder communication<br>- Post-mortem | Engineering Manager |

### On-Call Rotation

```
Week 1: [DB Admin Name] - Primary
Week 2: [Backend Engineer Name] - Primary
Week 3: [DevOps Engineer Name] - Primary
Week 4: [DB Admin Name] - Primary

Escalation Path:
1. Primary On-Call (15 min response)
2. Secondary On-Call (30 min response)
3. Engineering Manager (1 hour response)
4. CTO (2 hour response)
```

---

## Appendix A: Backup Storage Structure

```
s3://cmp-backups/
├── daily/
│   ├── consent_manager_20260211_020000.dump.gz
│   ├── consent_manager_20260211_020000.dump.sha256
│   ├── consent_manager_20260210_020000.dump.gz
│   └── ... (30 days retention)
├── monthly/
│   ├── consent_manager_20260201_020000.dump.gz
│   ├── consent_manager_20260101_020000.dump.gz
│   └── ... (12 months retention)
├── wal/
│   ├── 000000010000000000000001
│   ├── 000000010000000000000002
│   └── ... (7 days retention)
└── config/
    ├── postgresql.conf
    ├── pg_hba.conf
    └── .env.backup
```

---

## Appendix B: Recovery Time Estimates

| Database Size | Full Restore | PITR | Table Restore |
|---------------|--------------|------|---------------|
| < 1 GB | 15 min | 30 min | 5 min |
| 1-10 GB | 1 hour | 2 hours | 15 min |
| 10-100 GB | 4 hours | 8 hours | 1 hour |
| > 100 GB | 12 hours | 24 hours | 4 hours |

*Based on hardware: 4 vCPU, 16GB RAM, SSD storage*

---

## Appendix C: Compliance Requirements

### DPDP Act §8 - Data Protection Impact Assessment (DPIA)
- Backup retention aligns with data retention policies
- Audit logs preserved for 3 years minimum
- Encrypted backups stored in Indian datacenter region

### DPDP Act §6 - Right to Deletion
- Backup cleanup process respects deletion requests
- Consents marked as DELETED not restored after RPO window

### ISO 27001 - Backup & Recovery Controls
- A.12.3.1: Regular backup testing
- A.17.1.2: Documented BCP/DR procedures
- A.18.1.3: Protection of personal data in backups

---

## Document Review & Approval

| Name | Role | Signature | Date |
|------|------|-----------|------|
| [DB Admin Name] | Database Administrator | _________ | _______ |
| [Manager Name] | Engineering Manager | _________ | _______ |
| [CISO Name] | Chief Information Security Officer | _________ | _______ |

**Next Review Date**: 2026-08-11 (6 months)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-11 | CMP Team | Initial release |

---

**END OF DOCUMENT**
