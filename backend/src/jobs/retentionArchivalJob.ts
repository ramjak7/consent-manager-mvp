import { pool } from "../db";
import { logger } from "../utils/logger";

/**
 * Retention Archival Job — DPDP Act §8(7)
 *
 * Runs periodically to:
 * 1. Archive EXPIRED/REVOKED/REJECTED consents past their retention_until date
 * 2. Move them to archived_consents table
 * 3. Delete originals from consents table
 *
 * This ensures compliance with the DPDP Act's data minimization requirements
 * while preserving records for the mandatory retention period.
 *
 * Recommended schedule: daily at 2 AM
 */
export async function archiveRetentionExpiredConsents(): Promise<number> {
  const client = await pool.connect();
  let archivedCount = 0;

  try {
    await client.query("BEGIN");

    // Find consents past retention_until that are terminal (not ACTIVE/REQUESTED)
    const expiredRetention = await client.query(
      `SELECT *
       FROM consents
       WHERE retention_until < NOW()
         AND status IN ('EXPIRED', 'REVOKED', 'REJECTED')
       LIMIT 500`
    );

    if (expiredRetention.rows.length === 0) {
      await client.query("COMMIT");
      return 0;
    }

    for (const row of expiredRetention.rows) {
      // Insert into archive table
      await client.query(
        `INSERT INTO archived_consents (
          consent_id, consent_group_id, version, user_id, purpose,
          data_types, valid_until, status, created_at, retention_until,
          archived_at, notice_id, notice_version, language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, $13)
        ON CONFLICT (consent_id) DO NOTHING`,
        [
          row.consent_id,
          row.consent_group_id,
          row.version,
          row.user_id,
          row.purpose,
          JSON.stringify(row.data_types),
          row.valid_until,
          row.status,
          row.created_at,
          row.retention_until,
          row.notice_id,
          row.notice_version,
          row.language,
        ]
      );

      // Delete from live table
      await client.query(
        `DELETE FROM consents WHERE consent_id = $1`,
        [row.consent_id]
      );

      archivedCount++;
    }

    await client.query("COMMIT");
    logger.info(`Retention archival: archived ${archivedCount} consents`);
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Retention archival job failed", { error: err });
    throw err;
  } finally {
    client.release();
  }

  return archivedCount;
}

/**
 * Purge archived consents that are well past retention.
 * This is a hard-delete for records that have been in the archive
 * for more than 1 year beyond their retention_until date.
 *
 * Safety margin ensures no premature deletion.
 * Recommended schedule: monthly
 */
export async function purgeOldArchivedConsents(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM archived_consents
     WHERE retention_until < NOW() - INTERVAL '1 year'
     RETURNING consent_id`
  );

  const purgedCount = result.rowCount || 0;
  if (purgedCount > 0) {
    logger.info(`Retention purge: deleted ${purgedCount} archived consents`);
  }

  return purgedCount;
}
