-- 002: Add batch storage columns to enrichment_jobs
-- Adds csv_path (input CSV location) and result_path (output CSV location)
-- for local filesystem batch storage (Phase 4).

ALTER TABLE enrichment_jobs ADD COLUMN IF NOT EXISTS csv_path TEXT;
ALTER TABLE enrichment_jobs ADD COLUMN IF NOT EXISTS result_path TEXT;

INSERT INTO schema_migrations (version) VALUES ('002_batch_storage')
ON CONFLICT (version) DO NOTHING;
