import { pool } from "../db";

export type AuditEventType =
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
};

export async function recordAudit(log: AuditLog) {
  const query = `
    INSERT INTO audit_logs
    (audit_id, event_type, consent_id, user_id, timestamp, details)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  await pool.query(query, [
    log.auditId,
    log.eventType,
    log.consentId,
    log.userId,
    log.timestamp,
    JSON.stringify(log.details),
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
  }));
}
