#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE kmsdb;
    CREATE USER kmsuser WITH PASSWORD 'kmspassword';
    GRANT ALL PRIVILEGES ON DATABASE kmsdb TO kmsuser;
EOSQL 