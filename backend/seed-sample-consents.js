// Seed script for creating sample consents for testing
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuid } = require('uuid');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'consent_manager',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

const SAMPLE_CONSENTS = [
  {
    purpose: 'Marketing Communications',
    dataTypes: ['email', 'name', 'phone'],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    status: 'ACTIVE',
    organization: 'Acme Corp',
  },
  {
    purpose: 'Analytics and Performance',
    dataTypes: ['usage_data', 'device_info', 'ip_address'],
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    status: 'ACTIVE',
    organization: 'Analytics Ltd',
  },
  {
    purpose: 'Personalized Recommendations',
    dataTypes: ['browsing_history', 'purchase_history', 'preferences'],
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
    status: 'ACTIVE',
    organization: 'Recommendation Engine Inc',
  },
  {
    purpose: 'Customer Support',
    dataTypes: ['email', 'phone', 'support_tickets'],
    validUntil: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
    status: 'EXPIRED',
    organization: 'Support Services',
  },
  {
    purpose: 'Third-Party Advertising',
    dataTypes: ['demographics', 'interests', 'behavioral_data'],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month
    status: 'REVOKED',
    organization: 'AdTech Solutions',
  },
];

async function seedConsents() {
  const client = await pool.connect();

  try {
    // Get the dev user ID
    const userResult = await client.query(
      `SELECT user_id FROM users WHERE oauth_subject = 'dev-user-12345' LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Dev user not found. Please log in first to create the user.');
      return;
    }

    const userId = userResult.rows[0].user_id;
    console.log(`✅ Found dev user: ${userId}`);

    // Check if consents already exist
    const existingResult = await client.query(
      `SELECT COUNT(*) as count FROM consents WHERE user_id = $1`,
      [userId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      console.log(`⚠️  User already has ${existingResult.rows[0].count} consent(s).`);
      console.log('   Do you want to add more? (Ctrl+C to cancel, or wait 3 seconds to continue)');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const now = new Date();
    let inserted = 0;

    for (const consent of SAMPLE_CONSENTS) {
      const consentId = uuid();
      const consentGroupId = `${userId}:${consent.purpose}`;

      // Get next version
      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
         FROM consents
         WHERE consent_group_id = $1`,
        [consentGroupId]
      );
      const version = versionResult.rows[0].next_version;

      // Insert consent
      await client.query(
        `INSERT INTO consents (
          consent_id, consent_group_id, version, user_id, purpose, data_types,
          valid_until, status, notice_id, notice_version, language, notice_shown_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          consentId,
          consentGroupId,
          version,
          userId,
          consent.purpose,
          JSON.stringify(consent.dataTypes),
          consent.validUntil,
          consent.status,
          'notice-' + uuid().substring(0, 8),
          '1.0',
          'en',
          now,
          now,
        ]
      );

      inserted++;
      console.log(`   ✅ Created: ${consent.purpose} (${consent.status})`);
    }

    console.log(`\n🎉 Successfully seeded ${inserted} consent(s) for testing!`);
    console.log('   Visit http://localhost:5173/consents to see them.');
    
  } catch (error) {
    console.error('❌ Error seeding consents:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedConsents();
