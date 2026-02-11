#!/bin/bash
#
# PostgreSQL Restore Script for Consent Manager
# This script performs database restoration from backup
#
# Usage: ./restore-database.sh <backup-file>
# Example: ./restore-database.sh /tmp/consent_manager_20260211_020000.dump.gz
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

DB_NAME="${DB_NAME:-consent_manager}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKEND_SERVICE="${BACKEND_SERVICE:-cmp-backend}"

# ============================================================================
# Variables
# ============================================================================

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file>"
  echo "Example: $0 /tmp/consent_manager_20260211_020000.dump.gz"
  exit 1
fi

BACKUP_FILE="$1"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/cmp/restore_${TIMESTAMP}.log"

# ============================================================================
# Functions
# ============================================================================

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
  log "ERROR: $1"
  exit 1
}

confirm_restore() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║           DATABASE RESTORE CONFIRMATION                   ║"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║ Database: $DB_NAME"
  echo "║ Host:     $DB_HOST:$DB_PORT"
  echo "║ Backup:   $BACKUP_FILE"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║ WARNING: This will OVERWRITE the existing database!       ║"
  echo "║ All current data will be PERMANENTLY LOST!                ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  read -p "Type 'RESTORE' (all caps) to confirm: " CONFIRMATION
  
  if [ "$CONFIRMATION" != "RESTORE" ]; then
    log "Restore cancelled by user"
    exit 0
  fi
}

check_backup_file() {
  log "Checking backup file..."
  
  if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "Backup file not found: $BACKUP_FILE"
  fi
  
  # Check if compressed
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Backup file is compressed, will decompress during restore"
  fi
  
  # Verify checksum if available
  CHECKSUM_FILE="${BACKUP_FILE%.gz}.sha256"
  if [ -f "$CHECKSUM_FILE" ]; then
    log "Verifying backup checksum..."
    if sha256sum -c "$CHECKSUM_FILE" 2>&1 | tee -a "$LOG_FILE"; then
      log "Checksum verification passed"
    else
      error_exit "Checksum verification failed!"
    fi
  else
    log "WARNING: No checksum file found, skipping verification"
  fi
}

stop_application() {
  log "Stopping application server..."
  
  if systemctl is-active --quiet "$BACKEND_SERVICE"; then
    sudo systemctl stop "$BACKEND_SERVICE"
    log "Application stopped"
  else
    log "Application not running"
  fi
}

terminate_connections() {
  log "Terminating all database connections..."
  
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF
  
  log "Connections terminated"
}

backup_current_database() {
  log "Creating emergency backup of current database..."
  
  EMERGENCY_BACKUP="/tmp/${DB_NAME}_pre_restore_${TIMESTAMP}.dump"
  
  if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -F c -f "$EMERGENCY_BACKUP" 2>&1 | tee -a "$LOG_FILE"; then
    log "Emergency backup created: $EMERGENCY_BACKUP"
    log "Keep this file until restore is verified!"
  else
    log "WARNING: Emergency backup failed, continuing anyway..."
  fi
}

drop_database() {
  log "Dropping existing database..."
  
  if dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"; then
    log "Database dropped"
  else
    error_exit "Failed to drop database"
  fi
}

create_database() {
  log "Creating fresh database..."
  
  if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -O "$DB_USER" "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"; then
    log "Database created"
  else
    error_exit "Failed to create database"
  fi
}

restore_backup() {
  log "Restoring backup (this may take several minutes)..."
  
  # Decompress if needed
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
      -d "$DB_NAME" -j 4 --no-owner --no-acl -v 2>&1 | tee -a "$LOG_FILE"
  else
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
      -d "$DB_NAME" -j 4 --no-owner --no-acl -v -f "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"
  fi
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "Restore completed"
  else
    error_exit "Restore failed!"
  fi
}

verify_restore() {
  log "Verifying restored data..."
  
  # Check table counts
  CONSENT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -tAc "SELECT COUNT(*) FROM consents;")
  AUDIT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -tAc "SELECT COUNT(*) FROM audit_logs;")
  
  log "Consents restored: $CONSENT_COUNT"
  log "Audit logs restored: $AUDIT_COUNT"
  
  # Verify triggers
  TRIGGER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -tAc "SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'audit_logs'::regclass;")
  
  if [ "$TRIGGER_COUNT" -gt 0 ]; then
    log "Triggers verified: $TRIGGER_COUNT active"
  else
    log "WARNING: No triggers found on audit_logs table!"
  fi
  
  # Verify sequences
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF 2>&1 | tee -a "$LOG_FILE"
SELECT sequence_name, last_value FROM information_schema.sequences
JOIN pg_sequences ON sequence_name = sequencename
WHERE sequence_schema = 'public';
EOF
}

rebuild_indexes() {
  log "Rebuilding indexes..."
  
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "REINDEX DATABASE $DB_NAME;" 2>&1 | tee -a "$LOG_FILE"
  
  log "Indexes rebuilt"
}

analyze_database() {
  log "Analyzing database for query optimizer..."
  
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "ANALYZE;" 2>&1 | tee -a "$LOG_FILE"
  
  log "Analysis complete"
}

record_restore_event() {
  log "Recording restore event in audit log..."
  
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO audit_logs (audit_id, event_type, timestamp, details)
VALUES (
  gen_random_uuid(),
  'SYSTEM_RESTORE',
  NOW(),
  jsonb_build_object(
    'backup_file', '$BACKUP_FILE',
    'restored_by', CURRENT_USER,
    'restored_at', NOW(),
    'reason', 'Manual restore operation'
  )
);
EOF
  
  log "Restore event recorded"
}

start_application() {
  log "Starting application server..."
  
  sudo systemctl start "$BACKEND_SERVICE"
  
  # Wait for service to start
  sleep 5
  
  if systemctl is-active --quiet "$BACKEND_SERVICE"; then
    log "Application started successfully"
  else
    log "WARNING: Application failed to start, check logs"
  fi
}

verify_health() {
  log "Checking application health..."
  
  HEALTH_URL="http://localhost:3000/health"
  if curl -s -f "$HEALTH_URL" > /dev/null; then
    log "Health check passed"
  else
    log "WARNING: Health check failed"
  fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  log "========================================"
  log "PostgreSQL Database Restore"
  log "========================================"
  
  confirm_restore
  check_backup_file
  stop_application
  terminate_connections
  backup_current_database
  drop_database
  create_database
  restore_backup
  verify_restore
  rebuild_indexes
  analyze_database
  record_restore_event
  start_application
  verify_health
  
  log "========================================"
  log "Restore completed successfully"
  log "Emergency backup: /tmp/${DB_NAME}_pre_restore_${TIMESTAMP}.dump"
  log "Restore log: $LOG_FILE"
  log "========================================"
}

# Run main function
main "$@"
