\c kmsdb;

-- Add domain column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='questionnaires' AND column_name='domain'
    ) THEN
        ALTER TABLE questionnaires ADD COLUMN domain TEXT;
        CREATE INDEX IF NOT EXISTS idx_questionnaires_domain ON questionnaires(domain);
    END IF;
END $$; 