import { pool } from "../db";
import { v7 as uuidv7 } from "uuid";
import { recordAudit } from "../repositories/auditRepo";

export async function expireDueConsents() {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE'
      AND valid_until < NOW()
    RETURNING *
    `
  );

  for (const row of result.rows) {
    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_EXPIRED",
      consentId: row.consent_id,
      userId: row.user_id,
      timestamp: new Date().toISOString(),
      details: {
        version: row.version,
        validUntil: row.valid_until,
        expiredVia: "SCHEDULED_JOB",
      },
    });
  }
}