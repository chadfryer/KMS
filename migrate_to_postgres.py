import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import json
from datetime import datetime

def connect_sqlite():
    return sqlite3.connect('./questionnaire.db')

def connect_postgres():
    return psycopg2.connect(
        dbname="kmsdb",
        user="kmsuser",
        password="kmspassword",
        host="db",
        port="5432"
    )

def create_postgres_tables(pg_conn):
    with pg_conn.cursor() as cur:
        # Create questionnaires table if it doesn't exist (for fresh installations)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS questionnaires (
                id SERIAL PRIMARY KEY,
                question TEXT NOT NULL,
                answer_key TEXT NOT NULL,
                comment TEXT,
                entity TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create processed_questionnaires table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS processed_questionnaires (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL,
                questions_count INTEGER DEFAULT 0,
                processed_count INTEGER DEFAULT 0,
                success_rate INTEGER DEFAULT 0,
                unaccepted_answers_count INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                downloaded BOOLEAN DEFAULT FALSE,
                can_download BOOLEAN DEFAULT FALSE,
                csv_content TEXT,
                low_confidence_answers TEXT,
                edited_answers TEXT
            )
        """)
        
        # Check if the comment column exists before trying to rename it
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'questionnaires' AND column_name = 'comment'
        """)
        has_comment_column = cur.fetchone() is not None

        if has_comment_column:
            # Now update the questionnaires table schema
            cur.execute("""
                -- First rename the comment column to notes
                ALTER TABLE questionnaires 
                RENAME COLUMN comment TO notes;
            """)
        else:
            # If comment column doesn't exist, check if notes column exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'questionnaires' AND column_name = 'notes'
            """)
            has_notes_column = cur.fetchone() is not None

            if not has_notes_column:
                # Add notes column if it doesn't exist
                cur.execute("""
                    ALTER TABLE questionnaires 
                    ADD COLUMN notes TEXT;
                """)

        # Add new columns
        cur.execute("""
            ALTER TABLE questionnaires 
            ADD COLUMN IF NOT EXISTS category TEXT,
            ADD COLUMN IF NOT EXISTS sub_category TEXT,
            ADD COLUMN IF NOT EXISTS compliance_answer TEXT,
            ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP,
            ADD COLUMN IF NOT EXISTS checked_out_by TEXT,
            ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP;
        """)

        # Check if entity column exists before trying to drop it
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'questionnaires' AND column_name = 'entity'
        """)
        has_entity_column = cur.fetchone() is not None

        if has_entity_column:
            cur.execute("""
                ALTER TABLE questionnaires 
                DROP COLUMN entity;
            """)

        # Set initial last_updated values to created_at
        cur.execute("""
            UPDATE questionnaires 
            SET last_updated = created_at 
            WHERE last_updated IS NULL;
        """)
        
        pg_conn.commit()

def migrate_questionnaires(sqlite_conn, pg_conn):
    print("Migrating questionnaires table...")
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Get data from SQLite - note we're using 'comment' instead of 'notes'
    sqlite_cur.execute("SELECT id, question, answer_key, comment, created_at FROM questionnaires")
    rows = sqlite_cur.fetchall()
    
    if rows:
        # Insert into PostgreSQL - modified to match new schema
        execute_values(
            pg_cur,
            """
            INSERT INTO questionnaires (id, question, answer_key, notes, created_at)
            VALUES %s
            """,
            rows,
            template="(%s, %s, %s, %s, %s)"
        )
        
        # Reset the sequence to the max id
        pg_cur.execute("""
            SELECT setval('questionnaires_id_seq', (SELECT MAX(id) FROM questionnaires))
        """)
        
        pg_conn.commit()
    print(f"Migrated {len(rows)} questionnaire entries")

def migrate_processed_questionnaires(sqlite_conn, pg_conn):
    print("Migrating processed_questionnaires table...")
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Get data from SQLite - removed entity from selection
    sqlite_cur.execute("""
        SELECT id, filename, status, questions_count, processed_count, 
               success_rate, unaccepted_answers_count, error_message,
               created_at, downloaded, can_download, csv_content,
               low_confidence_answers, edited_answers
        FROM processed_questionnaires
    """)
    rows = sqlite_cur.fetchall()
    
    if rows:
        # Convert rows to list to modify boolean values
        modified_rows = []
        for row in rows:
            # Convert row to list
            row_list = list(row)
            # Convert downloaded (index 9) and can_download (index 10) from 0/1 to boolean
            row_list[9] = bool(row_list[9])
            row_list[10] = bool(row_list[10])
            modified_rows.append(tuple(row_list))
        
        # Insert into PostgreSQL - modified to match new schema
        execute_values(
            pg_cur,
            """
            INSERT INTO processed_questionnaires (
                id, filename, status, questions_count, processed_count,
                success_rate, unaccepted_answers_count, error_message,
                created_at, downloaded, can_download, csv_content,
                low_confidence_answers, edited_answers
            )
            VALUES %s
            """,
            modified_rows,
            template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        )
        
        # Reset the sequence to the max id
        pg_cur.execute("""
            SELECT setval('processed_questionnaires_id_seq', (SELECT MAX(id) FROM processed_questionnaires))
        """)
        
        pg_conn.commit()
    print(f"Migrated {len(rows)} processed questionnaire entries")

def main():
    try:
        # Connect to both databases
        sqlite_conn = connect_sqlite()
        pg_conn = connect_postgres()
        
        # Create PostgreSQL tables
        create_postgres_tables(pg_conn)
        
        # Migrate data
        migrate_questionnaires(sqlite_conn, pg_conn)
        migrate_processed_questionnaires(sqlite_conn, pg_conn)
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    main() 