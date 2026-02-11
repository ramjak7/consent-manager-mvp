-- Migration: Add notice binding fields to consents table
-- Purpose: Track which notice was shown at time of consent (DPDP "informed consent" requirement)
-- Severity: CRITICAL (B.2)
-- Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.2

-- Add notice_id to track which notice document was shown
ALTER TABLE consents
ADD COLUMN notice_id TEXT;

-- Add notice_version to track version of notice shown  
ALTER TABLE consents
ADD COLUMN notice_version TEXT;

-- Add language to track language of notice shown
ALTER TABLE consents
ADD COLUMN language TEXT;

-- Add timestamp of when notice was shown
ALTER TABLE consents
ADD COLUMN notice_shown_at TIMESTAMP WITH TIME ZONE;

-- Create index for notice lookups
CREATE INDEX idx_consents_notice_id ON consents(notice_id);
CREATE INDEX idx_consents_language ON consents(language);

-- Add comment
COMMENT ON COLUMN consents.notice_id IS 'Identifier of the notice document shown to data principal (DPDP informed consent requirement)';
COMMENT ON COLUMN consents.notice_version IS 'Version of the notice document shown';
COMMENT ON COLUMN consents.language IS 'Language of notice shown to data principal';
COMMENT ON COLUMN consents.notice_shown_at IS 'Timestamp when notice was shown to data principal';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Notice binding fields added to consents table';
END
$$;
