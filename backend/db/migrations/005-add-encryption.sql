-- ============================================================================
-- Migration: 005-add-encryption
-- Description: Add column-level encryption for sensitive fields
-- Version: 1.0
-- Created: 2026-02-11
-- 
-- Implements P0-8: Encryption-at-Rest
-- Reference: docs/ENCRYPTION_AT_REST.md
-- 
-- This migration:
--   - Creates encryption/decryption helper functions
--   - Converts approval_token and webhook secret columns to encrypted BYTEA
--   - Migrates existing plaintext data to encrypted format
--   - Adds encryption key configuration function
-- 
-- SECURITY NOTE: Requires ENCRYPTION_KEY to be set as PostgreSQL parameter
-- Example: SET app.encryption_key = 'your-256-bit-hex-key';
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- ============================================================================
-- FUNCTION: get_encryption_key
-- Retrieves encryption key from session/config
-- SECURITY DEFINER allows non-superusers to call this
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT AS $$
DECLARE
    key TEXT;
BEGIN
    -- Try to get from runtime setting (set via application connection)
    -- Example: SET app.encryption_key = 'key';
    BEGIN
        key := current_setting('app.encryption_key', false);
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Encryption key not configured. Set app.encryption_key parameter.';
    END;
    
    IF key IS NULL OR length(key) < 32 THEN
        RAISE EXCEPTION 'Invalid encryption key. Must be at least 32 characters.';
    END IF;
    
    RETURN key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_encryption_key() 
IS 'Returns encryption key from session configuration (app.encryption_key parameter)';


-- ============================================================================
-- FUNCTION: encrypt_text
-- Encrypts plaintext using AES-256-CBC via pgcrypto
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_text(plaintext TEXT)
RETURNS BYTEA AS $$
DECLARE
    key TEXT;
BEGIN
    IF plaintext IS NULL THEN
        RETURN NULL;
    END IF;
    
    key := public.get_encryption_key();
    RETURN pgp_sym_encrypt(plaintext, key, 'cipher-algo=aes256, compress-algo=0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.encrypt_text(TEXT) 
IS 'Encrypts plaintext using AES-256. Returns NULL if input is NULL.';


-- ============================================================================
-- FUNCTION: decrypt_text
-- Decrypts ciphertext using AES-256-CBC via pgcrypto
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decrypt_text(ciphertext BYTEA)
RETURNS TEXT AS $$
DECLARE
    key TEXT;
BEGIN
    IF ciphertext IS NULL THEN
        RETURN NULL;
    END IF;
    
    key := public.get_encryption_key();
    RETURN pgp_sym_decrypt(ciphertext, key);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Decryption failed. Check encryption key and data integrity.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.decrypt_text(BYTEA) 
IS 'Decrypts ciphertext encrypted with encrypt_text. Returns NULL if input is NULL.';


-- ============================================================================
-- MIGRATE: consents.approval_token
-- Convert approval_token from TEXT to encrypted BYTEA
-- ============================================================================

-- Step 1: Add new encrypted column
ALTER TABLE public.consents
ADD COLUMN approval_token_encrypted BYTEA;

COMMENT ON COLUMN public.consents.approval_token_encrypted 
IS 'Encrypted approval token (AES-256). Use decrypt_text() to read.';

-- Step 2: Migrate existing plaintext tokens to encrypted format
-- NOTE: This requires encryption key to be set in session
-- Example: SET app.encryption_key = 'your-key'; before running migration

DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Check if encryption key is available
    PERFORM public.get_encryption_key();
    
    -- Encrypt existing tokens
    UPDATE public.consents
    SET approval_token_encrypted = public.encrypt_text(approval_token)
    WHERE approval_token IS NOT NULL;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    RAISE NOTICE 'Migrated % approval tokens to encrypted format', migrated_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not migrate approval tokens. Encryption key may not be set.';
        RAISE WARNING 'Set encryption key: SET app.encryption_key = ''your-key'';';
        RAISE WARNING 'Then run: UPDATE consents SET approval_token_encrypted = encrypt_text(approval_token) WHERE approval_token IS NOT NULL;';
END;
$$;

-- Step 3: Drop old plaintext column and rename encrypted column
-- CAUTION: This is a destructive operation. Ensure migration was successful first.
-- Commented out by default - uncomment after verifying migration

-- ALTER TABLE public.consents DROP COLUMN approval_token;
-- ALTER TABLE public.consents RENAME COLUMN approval_token_encrypted TO approval_token;

-- For now, keep both columns to allow rollback
-- Application should use approval_token_encrypted going forward


-- ============================================================================
-- MIGRATE: webhooks.secret
-- Convert webhook secret from TEXT to encrypted BYTEA
-- ============================================================================

-- Step 1: Add new encrypted column
ALTER TABLE public.webhooks
ADD COLUMN secret_encrypted BYTEA;

COMMENT ON COLUMN public.webhooks.secret_encrypted 
IS 'Encrypted webhook HMAC secret (AES-256). Use decrypt_text() to read.';

-- Step 2: Migrate existing plaintext secrets to encrypted format
DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Check if encryption key is available
    PERFORM public.get_encryption_key();
    
    -- Encrypt existing secrets
    UPDATE public.webhooks
    SET secret_encrypted = public.encrypt_text(secret)
    WHERE secret IS NOT NULL;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    RAISE NOTICE 'Migrated % webhook secrets to encrypted format', migrated_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not migrate webhook secrets. Encryption key may not be set.';
        RAISE WARNING 'Set encryption key: SET app.encryption_key = ''your-key'';';
        RAISE WARNING 'Then run: UPDATE webhooks SET secret_encrypted = encrypt_text(secret) WHERE secret IS NOT NULL;';
END;
$$;

-- Step 3: Drop old plaintext column and rename encrypted column
-- CAUTION: Destructive operation. Uncomment after verifying migration.

-- ALTER TABLE public.webhooks DROP COLUMN secret;
-- ALTER TABLE public.webhooks RENAME COLUMN secret_encrypted TO secret;

-- For now, keep both columns to allow rollback


-- ============================================================================
-- CREATE: Indexes for encrypted columns
-- Note: Cannot create functional indexes on encrypted data
-- Application must decrypt before querying
-- ============================================================================

-- Index on encrypted approval_token not useful (cannot search ciphertext)
-- Application should query by consent_id or other non-encrypted fields

-- Index on webhook_id for joining with deliveries (already exists via FK)


-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Test encryption/decryption round-trip
-- SET app.encryption_key = 'test-key-at-least-32-characters-long';
-- SELECT decrypt_text(encrypt_text('test_value')) = 'test_value' AS encryption_works;

-- Verify approval tokens are encrypted
-- SELECT 
--     consent_id,
--     approval_token AS plaintext,
--     approval_token_encrypted AS ciphertext,
--     length(approval_token_encrypted) AS encrypted_length,
--     decrypt_text(approval_token_encrypted) AS decrypted
-- FROM consents
-- WHERE approval_token IS NOT NULL
-- LIMIT 5;

-- Verify webhook secrets are encrypted
-- SELECT 
--     webhook_id,
--     secret AS plaintext,
--     secret_encrypted AS ciphertext,
--     length(secret_encrypted) AS encrypted_length,
--     decrypt_text(secret_encrypted) AS decrypted
-- FROM webhooks
-- WHERE secret IS NOT NULL
-- LIMIT 5;


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Allow application role to use encryption functions
GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO postgres;
GRANT EXECUTE ON FUNCTION public.encrypt_text(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.decrypt_text(BYTEA) TO postgres;


-- ============================================================================
-- DOWN: Rollback changes
-- ============================================================================
-- This section is executed when rolling back the migration
-- BEGIN DOWN

-- -- Restore plaintext columns (if data still exists)
-- UPDATE public.consents
-- SET approval_token = decrypt_text(approval_token_encrypted)
-- WHERE approval_token_encrypted IS NOT NULL AND approval_token IS NULL;
--
-- UPDATE public.webhooks
-- SET secret = decrypt_text(secret_encrypted)
-- WHERE secret_encrypted IS NOT NULL AND secret IS NULL;
--
-- -- Drop encrypted columns
-- ALTER TABLE public.consents DROP COLUMN IF EXISTS approval_token_encrypted;
-- ALTER TABLE public.webhooks DROP COLUMN IF EXISTS secret_encrypted;
--
-- -- Drop functions
-- DROP FUNCTION IF EXISTS public.decrypt_text(BYTEA);
-- DROP FUNCTION IF EXISTS public.encrypt_text(TEXT);
-- DROP FUNCTION IF EXISTS public.get_encryption_key();

-- END DOWN


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 005: Encryption-at-Rest';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Status: COMPLETE';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Generate encryption key: openssl rand -hex 32';
    RAISE NOTICE '2. Store key in Vault/Secrets Manager';
    RAISE NOTICE '3. Set key in application: ENCRYPTION_KEY=your-key';
    RAISE NOTICE '4. Update application to use encrypted columns';
    RAISE NOTICE '5. Verify encryption: Run verification queries above';
    RAISE NOTICE '6. After validation: Drop old plaintext columns';
    RAISE NOTICE '';
    RAISE NOTICE 'See: docs/ENCRYPTION_AT_REST.md';
    RAISE NOTICE '========================================';
END;
$$;
