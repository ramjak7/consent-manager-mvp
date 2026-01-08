import { pool } from "../db";
import { generateApprovalToken } from "../utils/approvalToken";

export type ConsentStatus =
  | "REQUESTED"
  | "ACTIVE"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED";

export type Consent = {
  consentId: string;
  consentGroupId: string;
  version: number;
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  status: ConsentStatus;
  approvalToken: string | null;
  approvalExpiresAt: string | null;
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

    // Determine consent_group_id (stable per user + purpose)
    const consentGroupId = `${input.userId}:${input.purpose}`;

    // 1️⃣ Revoke existing ACTIVE consent (if any)
    // Enforce invariant: only one ACTIVE consent per (userId, purpose)
    /*await client.query(
      `
      UPDATE consents
      SET status = 'REVOKED'
      WHERE user_id = $1
        AND purpose = $2
        AND status = 'ACTIVE'
      `,
      [input.userId, input.purpose]
    );*/

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

    const approvalToken = generateApprovalToken();
    const approvalExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 // 24 hours
    ).toISOString();
    // 3️⃣ Insert new REQUESTED version (awaits human approval)

    await client.query(
      `
      INSERT INTO consents
      (consent_id, consent_group_id, version, user_id, purpose, data_types, valid_until, status, approval_token, approval_expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'REQUESTED',$8,$9)
      `,
      [
        input.consentId,
        consentGroupId,
        nextVersion,
        input.userId,
        input.purpose,
        JSON.stringify(input.dataTypes),
        input.validUntil,
        approvalToken,
        approvalExpiresAt,
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
 * Fetches a specific consent version by consentId.
 * READ-ONLY. May return REVOKED or historical versions.
 */
export async function getConsentById(
  consentId: string
): Promise<Consent | null> {
  const result = await pool.query(
    `SELECT * FROM consents WHERE consent_id = $1`,
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
    approvalToken: row.approval_token,
    approvalExpiresAt: row.approval_expires_at,
  };
}

/** 
 * Fetches the latest ACTIVE consent by userId, purpose
 * Used for /process and revoke.
 */
export async function getLatestActiveConsent(
  userId: string,
  purpose: string
): Promise<Consent | null> {
  const result = await pool.query(
    `
    SELECT *
    FROM consents
    WHERE user_id = $1
      AND purpose = $2
      AND status = 'ACTIVE'
    ORDER BY version DESC
    LIMIT 1
    `,
    [userId, purpose]
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
    approvalToken: row.approval_token,
    approvalExpiresAt: row.approval_expires_at,
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
 * Enforces expiry atomically for a specific consent version.
 * Used to guarantee DPDP §6 immediate stop.
 */
export async function expireConsentIfNeeded(
  consentId: string
): Promise<Consent | null> {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'EXPIRED'
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
    approvalToken: row.approval_token,
    approvalExpiresAt: row.approval_expires_at,
  };
}

export async function approveConsentByToken(token: string): Promise<Consent | null> {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'ACTIVE',
        approval_token = NULL,
        approval_expires_at = NULL
    WHERE approval_token = $1
      AND approval_expires_at > NOW()
      AND status = 'REQUESTED'
    RETURNING *
    `,
    [token]
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
    approvalToken: null,
    approvalExpiresAt: null,
  };
}

export async function rejectConsentByToken(token: string): Promise<Consent | null> {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'REJECTED',
        approval_token = NULL,
        approval_expires_at = NULL
    WHERE approval_token = $1
      AND approval_expires_at > NOW()
      AND status = 'REQUESTED'
    RETURNING *
    `,
    [token]
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
    approvalToken: null,
    approvalExpiresAt: null,
  };
}