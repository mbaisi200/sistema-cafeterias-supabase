-- Migration: Add missing iFood API fields
-- Date: 2025-01-01

ALTER TABLE ifood_config ADD COLUMN IF NOT EXISTS api_environment VARCHAR(20) DEFAULT 'sandbox';
ALTER TABLE ifood_config ADD COLUMN IF NOT EXISTS grant_type VARCHAR(30) DEFAULT 'client_credentials';
ALTER TABLE ifood_config ADD COLUMN IF NOT EXISTS callback_url VARCHAR(500);
ALTER TABLE ifood_config ADD COLUMN IF NOT EXISTS webhook_signature_key VARCHAR(500);
