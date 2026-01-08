import { pool } from "../db";
import { computeAuditHash } from "../utils/auditHash";

export type AuditEventType =
  | "CONSENT_REQUESTED"
  | "CONSENT_APPROVED"
  | "CONSENT_REJECTED"
  | "CONSENT_CREATED"
  | "CONSENT_REVOKED"
  | "CONSENT_EXPIRED"
  | "PROCESSING_ALLOWED"
  | "PROCESSING_DENIED";

export type AuditLog = {
  auditId: string;
  eventType: AuditEventType;
  consentId: string;
  userId: string;
  timestamp: string;
  details: any;

  prevHash: string | null;
  hash: string;
};

export async function recordAudit(
  log: Omit<AuditLog, "hash" | "prevHash">
) {
  // 1️⃣ Fetch previous hash
  const prevResult = await pool.query(
    "SELECT hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1"
  );

  const prevHash =
    prevResult.rows.length > 0 ? prevResult.rows[0].hash : null;

  // 2️⃣ Compute hash
  const hash = computeAuditHash({
    prevHash,
    auditId: log.auditId,
    eventType: log.eventType,
    consentId: log.consentId,
    userId: log.userId,
    timestamp: log.timestamp,
    details: log.details,
  });

  // 3️⃣ Insert
  const query = `
    INSERT INTO audit_logs
    (audit_id, event_type, consent_id, user_id, timestamp, details, prev_hash, hash)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `;

  await pool.query(query, [
    log.auditId,
    log.eventType,
    log.consentId,
    log.userId,
    log.timestamp,
    JSON.stringify(log.details),
    prevHash,
    hash,
  ]);
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  const result = await pool.query(
    "SELECT * FROM audit_logs ORDER BY timestamp ASC"
  );

  return result.rows.map(row => ({
    auditId: row.audit_id,
    eventType: row.event_type,
    consentId: row.consent_id,
    userId: row.user_id,
    timestamp: row.timestamp,
    details: row.details,
    prevHash: row.prev_hash,
    hash: row.hash,
  }));
}
