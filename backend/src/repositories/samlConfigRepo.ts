import { pool } from '../db';

// ============================================================
// SAML Configuration Repository
// ============================================================

export interface SamlConfig {
  configId: string;
  orgId: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl: string | null;
  idpCertificate: string;
  spEntityId: string | null;
  nameIdFormat: string;
  attributeMapping: Record<string, string>;
  autoProvision: boolean;
  defaultRole: string;
  allowedDomains: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): SamlConfig {
  return {
    configId: row.config_id,
    orgId: row.org_id,
    idpEntityId: row.idp_entity_id,
    idpSsoUrl: row.idp_sso_url,
    idpSloUrl: row.idp_slo_url,
    idpCertificate: row.idp_certificate,
    spEntityId: row.sp_entity_id,
    nameIdFormat: row.name_id_format,
    attributeMapping: row.attribute_mapping || {},
    autoProvision: row.auto_provision,
    defaultRole: row.default_role,
    allowedDomains: row.allowed_domains || [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createSamlConfig(params: {
  orgId: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl?: string;
  idpCertificate: string;
  spEntityId?: string;
  nameIdFormat?: string;
  attributeMapping?: Record<string, string>;
  autoProvision?: boolean;
  defaultRole?: string;
  allowedDomains?: string[];
}): Promise<SamlConfig> {
  const { rows } = await pool.query(
    `INSERT INTO saml_configs (org_id, idp_entity_id, idp_sso_url, idp_slo_url, idp_certificate,
       sp_entity_id, name_id_format, attribute_mapping, auto_provision, default_role, allowed_domains)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      params.orgId,
      params.idpEntityId,
      params.idpSsoUrl,
      params.idpSloUrl || null,
      params.idpCertificate,
      params.spEntityId || null,
      params.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      JSON.stringify(params.attributeMapping || { email: 'email', name: 'displayName' }),
      params.autoProvision !== false,
      params.defaultRole || 'DF_CLIENT',
      JSON.stringify(params.allowedDomains || []),
    ]
  );
  return mapRow(rows[0]);
}

export async function getSamlConfigByOrg(orgId: string): Promise<SamlConfig | null> {
  const { rows } = await pool.query(
    'SELECT * FROM saml_configs WHERE org_id = $1',
    [orgId]
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getSamlConfigById(configId: string): Promise<SamlConfig | null> {
  const { rows } = await pool.query(
    'SELECT * FROM saml_configs WHERE config_id = $1',
    [configId]
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function updateSamlConfig(
  orgId: string,
  params: Partial<Omit<SamlConfig, 'configId' | 'orgId' | 'createdAt' | 'updatedAt'>>
): Promise<SamlConfig | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    idpEntityId: 'idp_entity_id',
    idpSsoUrl: 'idp_sso_url',
    idpSloUrl: 'idp_slo_url',
    idpCertificate: 'idp_certificate',
    spEntityId: 'sp_entity_id',
    nameIdFormat: 'name_id_format',
    autoProvision: 'auto_provision',
    defaultRole: 'default_role',
    isActive: 'is_active',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((params as any)[key] !== undefined) {
      setClauses.push(`${col} = $${paramIndex++}`);
      values.push((params as any)[key]);
    }
  }

  if (params.attributeMapping !== undefined) {
    setClauses.push(`attribute_mapping = $${paramIndex++}`);
    values.push(JSON.stringify(params.attributeMapping));
  }
  if (params.allowedDomains !== undefined) {
    setClauses.push(`allowed_domains = $${paramIndex++}`);
    values.push(JSON.stringify(params.allowedDomains));
  }

  if (setClauses.length === 0) return getSamlConfigByOrg(orgId);

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(orgId);

  const { rows } = await pool.query(
    `UPDATE saml_configs SET ${setClauses.join(', ')} WHERE org_id = $${paramIndex} RETURNING *`,
    values
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function deleteSamlConfig(orgId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM saml_configs WHERE org_id = $1',
    [orgId]
  );
  return (rowCount ?? 0) > 0;
}
