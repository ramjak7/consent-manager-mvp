import { pool } from "../db";
import { generateApprovalToken } from "../utils/approvalToken";
import { trackConsentOperation } from "../middleware/metrics";

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
  validUntil: Date;
  status: ConsentStatus;
  approvalToken: string | null;
  approvalExpiresAt: Date | null;
  // Notice binding fields (DPDP compliance)
  noticeId: string | null;
  noticeVersion: string | null;
  language: string | null;
  noticeShownAt: Date | null;
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
  validUntil: Date;
  noticeId: string;
  noticeVersion: string;
  language: string;
}): Promise<{ approvalToken: string; approvalExpiresAt: Date }> {
  const client = await pool.connect();
  if (new Date(input.validUntil) <= new Date()) {
    throw new Error("validUntil must be in the future");
  }

  try {
    await client.query("BEGIN");

    // Determine consent_group_id (stable per user + purpose)
    const consentGroupId = `${input.userId}:${input.purpose}`;

    // 1️⃣ Compute next version atomically
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
    const ttlHours = parseInt(process.env.APPROVAL_TOKEN_TTL_HOURS || "24", 10);
    const approvalExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * ttlHours
    );
    // 2️⃣ Insert new REQUESTED version (awaits human approval)

    await client.query(
      `
      INSERT INTO consents
      (consent_id, consent_group_id, version, user_id, purpose, data_types, valid_until, status, approval_token, approval_expires_at, notice_id, notice_version, language, notice_shown_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'REQUESTED',$8,$9,$10,$11,$12,NOW())
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
        input.noticeId,
        input.noticeVersion,
        input.language,
      ]
    );

    await client.query("COMMIT");

    trackConsentOperation('CREATE', 'success');
    return { approvalToken, approvalExpiresAt };
  } catch (err) {
    await client.query("ROLLBACK");
    trackConsentOperation('CREATE', 'failure');
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

  if (row.status === "ACTIVE" && new Date(row.valid_until) < new Date()) {
    await expireConsentIfNeeded(row.consent_id);
    return null;
  }

  return mapRow(row);
}

/**
 * Fetches a specific consent version by consentId without expiring it.
 * Useful for admin operations that must return a record even if time-expired.
 */
export async function getConsentByIdAllowExpired(
  consentId: string
): Promise<Consent | null> {
  const result = await pool.query(
    `SELECT * FROM consents WHERE consent_id = $1`,
    [consentId]
  );

  if (!result.rows.length) return null;

  return mapRow(result.rows[0]);
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
      AND valid_until > NOW()
    ORDER BY version DESC
    LIMIT 1
    `,
    [userId, purpose]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];

  return mapRow(row);
}

/**
 * Fetches latest ACTIVE consent regardless of valid_until.
 * Used to detect immediate expiry at request time.
 */
export async function getLatestActiveConsentAllowExpired(
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

  return mapRow(result.rows[0]);
}

/** 
 * Revokes exactly one consent version.
 * Returns null if consent is not ACTIVE, preventing idempotent revoke of already-revoked consents.
 */
export async function revokeConsent(consentId: string): Promise<"REVOKED" | "NOT_ACTIVE" | "NOT_FOUND"> {
  const result = await pool.query(
    `
    UPDATE consents
    SET status = 'REVOKED'
    WHERE consent_id = $1
      AND status = 'ACTIVE'
    `,
    [consentId]
  );

  if (result.rowCount && result.rowCount > 0) {
    trackConsentOperation('REVOKE', 'success');
    return "REVOKED";
  }

  const check = await pool.query(
    `SELECT 1 FROM consents WHERE consent_id = $1`,
    [consentId]
  );

  if (!check.rowCount) {
    trackConsentOperation('REVOKE', 'failure');
  }

  return check.rowCount ? "NOT_ACTIVE" : "NOT_FOUND";
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
    SET status = 'EXPIRED',
        approval_token = NULL,
        approval_expires_at = NULL
    WHERE consent_id = $1
      AND status = 'ACTIVE'
      AND valid_until < NOW()
    RETURNING *
    `,
    [consentId]
  );

  if (!result.rows.length) return null;

  trackConsentOperation('EXPIRE', 'success');
  const row = result.rows[0];

  return mapRow(row);
}

export async function approveConsentByToken(token: string): Promise<Consent | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch candidate consent
    const res = await client.query(
      `
      SELECT *
      FROM consents
      WHERE approval_token = $1
        AND approval_expires_at > NOW()
        AND status = 'REQUESTED'
      FOR UPDATE
      `,
      [token]
    );

    if (!res.rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    const consent = res.rows[0];

    // 2️⃣ Prevent stale validity
    if (new Date(consent.valid_until) < new Date()) {
      await client.query(
        `
        UPDATE consents
        SET status = 'REJECTED',
            approval_token = NULL,
            approval_expires_at = NULL
        WHERE consent_id = $1
        `,
        [consent.consent_id]
      );

      await client.query("COMMIT");
      return null;
    }

    // 3️⃣ Reject all other REQUESTED in group
    await client.query(
      `
      UPDATE consents
      SET status = 'REJECTED'
      WHERE consent_group_id = $1
        AND status = 'REQUESTED'
        AND consent_id <> $2
      `,
      [consent.consent_group_id, consent.consent_id]
    );

    // 3.5️⃣ Revoke any existing ACTIVE consent in the same group
    // This enforces the invariant that only one ACTIVE consent exists per (userId, purpose)
    await client.query(
      `
      UPDATE consents
      SET status = 'REVOKED'
      WHERE consent_group_id = $1
        AND status = 'ACTIVE'
      `,
      [consent.consent_group_id]
    );

    // 4️⃣ Activate selected consent and mark token as consumed by clearing it
    const updated = await client.query(
      `
      UPDATE consents
      SET status = 'ACTIVE',
          approval_token = NULL,
          approval_expires_at = NULL
      WHERE consent_id = $1
        AND valid_until > NOW()
      RETURNING *
      `,
      [consent.consent_id]
    );

    if (!updated.rows.length) {
      await client.query("ROLLBACK");
      trackConsentOperation('APPROVE', 'failure');
      return null; // or "EXPIRED" if you later want stronger typing
    }

    await client.query("COMMIT");

    trackConsentOperation('APPROVE', 'success');
    return mapRow(updated.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");
    trackConsentOperation('APPROVE', 'failure');
    throw err;
  } finally {
    client.release();
  }
}

type ConsentRow = {
  consent_id: string;
  consent_group_id: string;
  version: number;
  user_id: string;
  purpose: string;
  data_types: any;
  valid_until: string;
  status: ConsentStatus;
  approval_token: string | null;
  approval_expires_at: string | null;
  notice_id: string | null;
  notice_version: string | null;
  language: string | null;
  notice_shown_at: string | null;
};

function mapRow(row: ConsentRow): Consent {
  return {
    consentId: row.consent_id,
    consentGroupId: row.consent_group_id,
    version: row.version,
    userId: row.user_id,
    purpose: row.purpose,
    dataTypes: Array.isArray(row.data_types)
      ? row.data_types
      : JSON.parse(row.data_types),
    validUntil: new Date(row.valid_until),
    status: row.status,
    approvalToken: row.approval_token,
    approvalExpiresAt: row.approval_expires_at
      ? new Date(row.approval_expires_at)
      : null,
    noticeId: row.notice_id || null,
    noticeVersion: row.notice_version || null,
    language: row.language || null,
    noticeShownAt: row.notice_shown_at ? new Date(row.notice_shown_at) : null,
  };
}

export async function rejectConsentByToken(token: string): Promise<Consent | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const res = await client.query(
      `
      SELECT *
      FROM consents
      WHERE approval_token = $1
        AND approval_expires_at > NOW()
        AND status = 'REQUESTED'
      FOR UPDATE
      `,
      [token]
    );

    if (!res.rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    const consent = res.rows[0];

    // Reject all REQUESTED in the group
    const updated = await client.query(
      `
      UPDATE consents
      SET status = 'REJECTED',
          approval_token = NULL,
          approval_expires_at = NULL
      WHERE consent_id = $1
        AND status = 'REQUESTED'
      RETURNING *
      `,
      [consent.consent_id]
    );

    await client.query("COMMIT");

    trackConsentOperation('REJECT', 'success');
    return mapRow(updated.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");
    trackConsentOperation('REJECT', 'failure');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get consents for a user with filtering and pagination
 * Used for Data Principal Dashboard
 */
export async function getUserConsents(params: {
  userId: string;
  status?: ConsentStatus | ConsentStatus[];
  purpose?: string;
  organizationName?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'valid_until' | 'purpose';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  consents: Consent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const {
    userId,
    status,
    purpose,
    organizationName,
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  // Build WHERE clause dynamically
  const conditions: string[] = ['user_id = $1'];
  const values: any[] = [userId];
  let paramIndex = 2;

  // Filter by status (single or multiple)
  if (status) {
    if (Array.isArray(status)) {
      conditions.push(`status = ANY($${paramIndex})`);
      values.push(status);
    } else {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
    }
    paramIndex++;
  }

  // Filter by purpose (partial match)
  if (purpose) {
    conditions.push(`purpose ILIKE $${paramIndex}`);
    values.push(`%${purpose}%`);
    paramIndex++;
  }

  // Filter by organization name (stored in metadata)
  if (organizationName) {
    conditions.push(`metadata->>'organizationName' ILIKE $${paramIndex}`);
    values.push(`%${organizationName}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM consents WHERE ${whereClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].total);
  const pages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Get paginated results
  const sortColumn = sortBy === 'created_at' ? 'created_at' : 
                     sortBy === 'valid_until' ? 'valid_until' : 
                     'purpose';
  
  const result = await pool.query(
    `
    SELECT *
    FROM consents
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}, version DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...values, limit, offset]
  );

  // Check for expired consents and update status
  const consents = result.rows.map(row => {
    const consent = mapRow(row);
    // Auto-expire if needed
    if (consent.status === 'ACTIVE' && consent.validUntil < new Date()) {
      // Note: We don't update the DB here, just mark in response
      // The cron job will handle DB updates
      return { ...consent, status: 'EXPIRED' as ConsentStatus };
    }
    return consent;
  });

  return {
    consents,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}