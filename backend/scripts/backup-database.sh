#!/bin/bash
#
# PostgreSQL Backup Script for Consent Manager
# This script performs automated daily backups with cloud storage upload
#
# Usage: ./backup-database.sh
# Environment: Requires AWS CLI configured or PGPASSWORD set
#

set -euo pipefail

# ============================================================================
# Configuration (Override via environment variables)
# ============================================================================

DB_NAME="${DB_NAME:-consent_manager}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-s3://cmp-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
METRICS_ENDPOINT="${METRICS_ENDPOINT:-http://localhost:3000/metrics/backup}"

# ============================================================================
# Variables
# ============================================================================

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# ============================================================================
# Functions
# ============================================================================

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
  log "ERROR: $1"
  # Send failure metric
  curl -s -X POST "$METRICS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"failure\",\"error\":\"$1\",\"timestamp\":\"$TIMESTAMP\"}" || true
  exit 1
}

check_prerequisites() {
  log "Checking prerequisites..."
  
  # Check if pg_dump exists
  if ! command -v pg_dump &> /dev/null; then
    error_exit "pg_dump not found. Install PostgreSQL client tools."
  fi
  
  # Check if AWS CLI exists (if using S3)
  if [[ "$S3_BUCKET" == s3://* ]] && ! command -v aws &> /dev/null; then
    error_exit "AWS CLI not found. Install aws-cli."
  fi
  
  # Check database connectivity
  if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    error_exit "Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
  fi
  
  log "Prerequisites check passed"
}

create_backup_directory() {
  if [ ! -d "$BACKUP_DIR" ]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
  fi
}

perform_backup() {
  log "Starting pg_dump for database: $DB_NAME"
  
  # Perform backup with custom format (-F c) for flexibility
  # -b: Include large objects
  # -v: Verbose mode
  # -F c: Custom format (allows parallel restore)
  if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -F c -b -v -f "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
    log "pg_dump completed successfully"
  else
    error_exit "pg_dump failed with exit code $?"
  fi
}

verify_backup() {
  log "Verifying backup integrity..."
  
  # Check if backup file exists
  if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "Backup file not created: $BACKUP_FILE"
  fi
  
  # Check file size (should be > 1KB)
  FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
  if [ "$FILE_SIZE" -lt 1024 ]; then
    error_exit "Backup file suspiciously small: ${FILE_SIZE} bytes"
  fi
  
  log "Backup file size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo ${FILE_SIZE} bytes)"
  
  # Calculate SHA-256 checksum
  CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
  echo "$CHECKSUM" > "$CHECKSUM_FILE"
  log "Backup checksum (SHA-256): $CHECKSUM"
}

compress_backup() {
  log "Compressing backup..."
  
  if gzip -9 "$BACKUP_FILE"; then
    BACKUP_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    log "Compression complete. Compressed size: $(numfmt --to=iec-i --suffix=B $COMPRESSED_SIZE 2>/dev/null || echo ${COMPRESSED_SIZE} bytes)"
  else
    error_exit "Compression failed"
  fi
}

upload_to_cloud() {
  log "Uploading to cloud storage: $S3_BUCKET"
  
  # Upload backup file
  if aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/daily/" --storage-class STANDARD_IA 2>&1 | tee -a "$LOG_FILE"; then
    log "Backup uploaded successfully"
  else
    error_exit "S3 upload failed"
  fi
  
  # Upload checksum file
  aws s3 cp "$CHECKSUM_FILE" "${S3_BUCKET}/daily/" 2>&1 | tee -a "$LOG_FILE"
  
  # Verify upload
  if aws s3 ls "${S3_BUCKET}/daily/$(basename $BACKUP_FILE)" > /dev/null 2>&1; then
    log "Upload verification successful"
  else
    error_exit "Upload verification failed"
  fi
}

create_monthly_copy() {
  # On first day of month, create monthly backup
  DAY_OF_MONTH=$(date +"%d")
  if [ "$DAY_OF_MONTH" == "01" ]; then
    log "Creating monthly backup copy..."
    aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/monthly/" 2>&1 | tee -a "$LOG_FILE"
    log "Monthly copy created"
  fi
}

cleanup_old_backups() {
  log "Cleaning up local backups older than $RETENTION_DAYS days..."
  
  DELETED_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.dump.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
  log "Deleted $DELETED_COUNT old backup(s)"
  
  # Also cleanup old log files
  find "$BACKUP_DIR" -name "backup_*.log" -mtime +$RETENTION_DAYS -delete
}

send_metrics() {
  log "Sending backup metrics..."
  
  FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
  
  curl -s -X POST "$METRICS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
      \"status\":\"success\",
      \"size\":${FILE_SIZE},
      \"timestamp\":\"${TIMESTAMP}\",
      \"database\":\"${DB_NAME}\",
      \"checksum\":\"${CHECKSUM}\"
    }" || log "WARNING: Failed to send metrics"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  log "========================================"
  log "PostgreSQL Backup Started"
  log "Database: $DB_NAME"
  log "Host: $DB_HOST:$DB_PORT"
  log "========================================"
  
  check_prerequisites
  create_backup_directory
  perform_backup
  verify_backup
  compress_backup
  upload_to_cloud
  create_monthly_copy
  cleanup_old_backups
  send_metrics
  
  log "========================================"
  log "Backup completed successfully"
  log "Backup file: $BACKUP_FILE"
  log "========================================"
}

# Run main function
main "$@"
