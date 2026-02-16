import { pool } from '../db';

// ============================================================
// Organization Branding Repository (White-label)
// ============================================================

export interface OrgBranding {
  orgId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss: string | null;
  portalTitle: string | null;
  supportEmail: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  footerText: string | null;
  updatedAt: string;
}

function mapRow(row: any): OrgBranding {
  return {
    orgId: row.org_id,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    fontFamily: row.font_family,
    customCss: row.custom_css,
    portalTitle: row.portal_title,
    supportEmail: row.support_email,
    privacyPolicyUrl: row.privacy_policy_url,
    termsUrl: row.terms_url,
    footerText: row.footer_text,
    updatedAt: row.updated_at,
  };
}

export async function getBranding(orgId: string): Promise<OrgBranding | null> {
  const { rows } = await pool.query('SELECT * FROM org_branding WHERE org_id = $1', [orgId]);
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function upsertBranding(
  orgId: string,
  params: Partial<Omit<OrgBranding, 'orgId' | 'updatedAt'>>
): Promise<OrgBranding> {
  const setClauses: string[] = [];
  const insertCols: string[] = ['org_id'];
  const insertVals: string[] = ['$1'];
  const values: unknown[] = [orgId];
  let paramIndex = 2;

  const fieldMap: Record<string, string> = {
    logoUrl: 'logo_url',
    faviconUrl: 'favicon_url',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    accentColor: 'accent_color',
    fontFamily: 'font_family',
    customCss: 'custom_css',
    portalTitle: 'portal_title',
    supportEmail: 'support_email',
    privacyPolicyUrl: 'privacy_policy_url',
    termsUrl: 'terms_url',
    footerText: 'footer_text',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((params as any)[key] !== undefined) {
      insertCols.push(col);
      insertVals.push(`$${paramIndex}`);
      setClauses.push(`${col} = $${paramIndex}`);
      values.push((params as any)[key]);
      paramIndex++;
    }
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');

  const { rows } = await pool.query(
    `INSERT INTO org_branding (${insertCols.join(', ')})
     VALUES (${insertVals.join(', ')})
     ON CONFLICT (org_id) DO UPDATE SET ${setClauses.join(', ')}
     RETURNING *`,
    values
  );
  return mapRow(rows[0]);
}
