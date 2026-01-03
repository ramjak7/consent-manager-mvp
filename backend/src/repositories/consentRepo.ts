import { pool } from "../db";

export type Consent = {
  consentId: string;
  consentGroupId: string;
  version: number;
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  status: "ACTIVE" | "REVOKED";
};

/** 
 * Creates a new consent version.
 * Older versions are NOT modified.
 */
export async function createConsent(input: {
  consentId: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Determine consent_group_id (stable per user + purpose)
    const consentGroupId = `${input.userId}:${input.purpose}`;

    // 1️⃣ Revoke existing ACTIVE consent (if any)
    await client.query(
      `
      UPDATE consents
      SET status = 'REVOKED'
      WHERE user_id = $1
        AND purpose = $2
        AND status = 'ACTIVE'
      `,
      [input.userId, input.purpose]
    );

    // 2️⃣ Compute next version atomically
    const versionResult = await client.query(
      `
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM consents
      WHERE consent_group_id = $1
      `,
      [consentGroupId]
    );

    const nextVersion = versionResult.rows[0].next_version;

    // 3️⃣ Insert new ACTIVE version (do NOT touch old rows)
    await client.query(
      `
      INSERT INTO consents
      (consent_id, consent_group_id, version, user_id, purpose, data_types, valid_until, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE')
      `,
      [
        input.consentId,
        consentGroupId,
        nextVersion,
        input.userId,
        input.purpose,
        JSON.stringify(input.dataTypes),
        input.validUntil,
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** 
 * Fetches the latest ACTIVE consent by consentId.
 * Used for /process and revoke.
 */
export async function getConsentById(
  consentId: string
): Promise<Consent | null> {
  const result = await pool.query(
    `
    SELECT *
    FROM consents
    WHERE consent_id = $1
    LIMIT 1
    `,
    [consentId]
  );

  if (result.rows?.length === 0) return null;

  const row = result.rows[0];

  return {
    consentId: row.consent_id,
    consentGroupId: row.consent_group_id,
    version: row.version,
    userId: row.user_id,
    purpose: row.purpose,
    dataTypes: row.data_types,
    validUntil: row.valid_until,
    status: row.status,
  };
}

/** 
 * Revokes exactly one consent version.
 */
export async function revokeConsent(consentId: string) {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'REVOKED'
    WHERE consent_id = $1
      AND status = 'ACTIVE'
    `,
    [consentId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Enforces expiry atomically.
 */
export async function expireConsentIfNeeded(
  consentId: string
): Promise<Consent | null> {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'REVOKED'
    WHERE consent_id = $1
      AND status = 'ACTIVE'
      AND valid_until < NOW()
    RETURNING *
    `,
    [consentId]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];

  return {
    consentId: row.consent_id,
    consentGroupId: row.consent_group_id,
    version: row.version,
    userId: row.user_id,
    purpose: row.purpose,
    dataTypes: row.data_types,
    validUntil: row.valid_until,
    status: row.status,
  };
}