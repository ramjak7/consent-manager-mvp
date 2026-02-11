/**
 * Consent Receipt Generator
 * Purpose: Generate ISO/IEC 29184-compliant consent receipts
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.3
 * 
 * Implements consent receipt standard for DPDP §8 "provide records on request"
 */

import { Consent } from '../repositories/consentRepo';

/**
 * ISO/IEC 29184 Consent Receipt Schema
 * Adapted for DPDP Act compliance
 */
export interface ConsentReceipt {
  // Receipt metadata
  receiptId: string;
  version: string;
  jurisdiction: string;
  consentTimestamp: string;
  
  // Consent artefact reference
  consentId: string;
  consentVersion: number;
  
  // Data Principal information
  dataSubject: {
    userId: string;
  };
  
  // Data Fiduciary information (placeholder for multi-tenant)
  dataController: {
    name: string;
    contact: string;
    address: string;
  };
  
  // Consent specifics
  purposes: Array<{
    purpose: string;
    purposeCategory: string;
  }>;
  
  dataCategories: string[];
  
  // Notice information (DPDP informed consent requirement)
  notice: {
    noticeId: string;
    noticeVersion: string;
    language: string;
    noticeShownAt: string;
  };
  
  // Validity period
  validityPeriod: {
    from: string;
    until: string;
  };
  
  // Current status
  status: string;
  
  // Withdrawal information
  withdrawal: {
    method: string;
    endpoint: string;
  };
  
  // Compliance framework
  complianceFramework: string[];
  
  // Signature/proof (hash of consent artefact)
  proof: {
    method: string;
    value: string;
  };
}

/**
 * Generate consent receipt from consent record
 */
export function generateConsentReceipt(
  consent: Consent,
  receiptId: string
): ConsentReceipt {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  // ISO 29184 receipt structure
  const receipt: ConsentReceipt = {
    // Receipt metadata
    receiptId,
    version: '1.0',
    jurisdiction: 'IN', // India
    consentTimestamp: new Date().toISOString(),
    
    // Consent reference
    consentId: consent.consentId,
    consentVersion: consent.version,
    
    // Data Principal
    dataSubject: {
      userId: consent.userId,
    },
    
    // Data Fiduciary (placeholder)
    dataController: {
      name: process.env.DF_NAME || 'Data Fiduciary',
      contact: process.env.DF_CONTACT || 'privacy@example.com',
      address: process.env.DF_ADDRESS || 'India',
    },
    
    // Purposes (single purpose in current implementation)
    purposes: [
      {
        purpose: consent.purpose,
        purposeCategory: 'explicit', // DPDP requires explicit consent
      },
    ],
    
    // Data categories
    dataCategories: consent.dataTypes,
    
    // Notice information
    notice: {
      noticeId: consent.noticeId || 'UNKNOWN',
      noticeVersion: consent.noticeVersion || 'UNKNOWN',
      language: consent.language || 'en',
      noticeShownAt: consent.noticeShownAt?.toISOString() || new Date().toISOString(),
    },
    
    // Validity period
    validityPeriod: {
      from: new Date().toISOString(),
      until: consent.validUntil.toISOString(),
    },
    
    // Current status
    status: consent.status,
    
    // Withdrawal method
    withdrawal: {
      method: 'API',
      endpoint: `${baseUrl}/consents/${consent.consentId}/revoke`,
    },
    
    // Compliance frameworks
    complianceFramework: [
      'DPDP Act 2023 (India)',
      'ISO/IEC 29184:2020',
    ],
    
    // Proof of consent (hash)
    proof: {
      method: 'SHA-256',
      value: generateConsentHash(consent),
    },
  };
  
  return receipt;
}

/**
 * Generate cryptographic hash of consent artefact
 * Used for tamper detection
 */
function generateConsentHash(consent: Consent): string {
  const crypto = require('crypto');
  
  // Hash immutable consent fields
  const payload = JSON.stringify({
    consentId: consent.consentId,
    userId: consent.userId,
    purpose: consent.purpose,
    dataTypes: consent.dataTypes.sort(), // Normalize array order
    validUntil: consent.validUntil.toISOString(),
    version: consent.version,
    noticeId: consent.noticeId,
    noticeVersion: consent.noticeVersion,
  });
  
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Format receipt as human-readable text
 * Used for plain text receipts
 */
export function formatReceiptAsText(receipt: ConsentReceipt): string {
  return `
═══════════════════════════════════════════════════════════
              CONSENT RECEIPT
═══════════════════════════════════════════════════════════

Receipt ID: ${receipt.receiptId}
Consent ID: ${receipt.consentId}
Issued: ${receipt.consentTimestamp}
Jurisdiction: ${receipt.jurisdiction}
Compliance: ${receipt.complianceFramework.join(', ')}

───────────────────────────────────────────────────────────
DATA PRINCIPAL
───────────────────────────────────────────────────────────
User ID: ${receipt.dataSubject.userId}

───────────────────────────────────────────────────────────
DATA FIDUCIARY
───────────────────────────────────────────────────────────
Name: ${receipt.dataController.name}
Contact: ${receipt.dataController.contact}
Address: ${receipt.dataController.address}

───────────────────────────────────────────────────────────
CONSENT DETAILS
───────────────────────────────────────────────────────────
Purpose: ${receipt.purposes.map(p => p.purpose).join(', ')}
Data Types: ${receipt.dataCategories.join(', ')}
Status: ${receipt.status}

Valid From: ${receipt.validityPeriod.from}
Valid Until: ${receipt.validityPeriod.until}

───────────────────────────────────────────────────────────
NOTICE INFORMATION
───────────────────────────────────────────────────────────
Notice ID: ${receipt.notice.noticeId}
Notice Version: ${receipt.notice.noticeVersion}
Language: ${receipt.notice.language}
Shown At: ${receipt.notice.noticeShownAt}

───────────────────────────────────────────────────────────
WITHDRAWAL
───────────────────────────────────────────────────────────
Method: ${receipt.withdrawal.method}
Endpoint: ${receipt.withdrawal.endpoint}

───────────────────────────────────────────────────────────
CRYPTOGRAPHIC PROOF
───────────────────────────────────────────────────────────
Method: ${receipt.proof.method}
Hash: ${receipt.proof.value}

═══════════════════════════════════════════════════════════
This is a machine-generated receipt compliant with ISO/IEC 
29184:2020 and DPDP Act 2023 (India). This receipt serves 
as proof that consent was given on the terms specified above.
═══════════════════════════════════════════════════════════
`;
}
