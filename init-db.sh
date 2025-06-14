#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
    CREATE DATABASE kmsdb;
    CREATE USER kmsuser WITH PASSWORD 'kmspassword';
    GRANT ALL PRIVILEGES ON DATABASE kmsdb TO kmsuser;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "kmsdb" <<EOSQL
    -- Create questionnaires table
    CREATE TABLE IF NOT EXISTS questionnaires (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer_key TEXT NOT NULL,
        category TEXT,
        sub_category TEXT,
        domain TEXT,
        compliance_answer TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add domain column if it doesn't exist
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'questionnaires'
            AND column_name = 'domain'
        ) THEN
            ALTER TABLE questionnaires ADD COLUMN domain TEXT;
        END IF;
    END
    \$\$;

    -- Grant privileges
    GRANT ALL PRIVILEGES ON TABLE questionnaires TO kmsuser;
    GRANT USAGE, SELECT ON SEQUENCE questionnaires_id_seq TO kmsuser;
EOSQL 