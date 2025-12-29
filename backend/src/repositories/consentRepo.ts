import { pool } from "../db";

export type Consent = {
  consentId: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  status: "ACTIVE" | "REVOKED";
};

export async function createConsent(consent: Consent) {
  const query = `
    INSERT INTO consents
    (consent_id, user_id, purpose, data_types, valid_until, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  await pool.query(query, [
    consent.consentId,
    consent.userId,
    consent.purpose,
    JSON.stringify(consent.dataTypes),
    consent.validUntil,
    consent.status,
  ]);
}

export async function getConsentById(consentId: string): Promise<Consent | null> {
  const result = await pool.query(
    "SELECT * FROM consents WHERE consent_id = $1",
    [consentId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    consentId: row.consent_id,
    userId: row.user_id,
    purpose: row.purpose,
    dataTypes: row.data_types,
    validUntil: row.valid_until,
    status: row.status,
  };
}

export async function revokeConsent(consentId: string) {
  const result = await pool.query(
    "UPDATE consents SET status = 'REVOKED' WHERE consent_id = $1",
    [consentId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function expireConsentIfNeeded(consentId: string): Promise<Consent | null> {
  const query = `
    UPDATE consents
    SET status = 'REVOKED'
    WHERE consent_id = $1
      AND status = 'ACTIVE'
      AND valid_until < NOW()
    RETURNING *
  `;

  const result = await pool.query(query, [consentId]);

  if (!result.rows.length) return null;

  const row = result.rows[0];

  return {
    consentId: row.consent_id,
    userId: row.user_id,
    purpose: row.purpose,
    dataTypes: row.data_types,
    validUntil: row.valid_until,
    status: row.status,
  };
}