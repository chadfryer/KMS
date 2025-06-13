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
        # Create questionnaires table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS questionnaires (
                id SERIAL PRIMARY KEY,
                question TEXT NOT NULL,
                answer_key TEXT NOT NULL,
                entity TEXT,
                comment TEXT,
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
                entity VARCHAR(255),
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                downloaded BOOLEAN DEFAULT FALSE,
                can_download BOOLEAN DEFAULT FALSE,
                csv_content TEXT,
                low_confidence_answers TEXT,
                edited_answers TEXT
            )
        """)
        
        pg_conn.commit()

def migrate_questionnaires(sqlite_conn, pg_conn):
    print("Migrating questionnaires table...")
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Get data from SQLite
    sqlite_cur.execute("SELECT id, question, answer_key, entity, comment, created_at FROM questionnaires")
    rows = sqlite_cur.fetchall()
    
    if rows:
        # Insert into PostgreSQL
        execute_values(
            pg_cur,
            """
            INSERT INTO questionnaires (id, question, answer_key, entity, comment, created_at)
            VALUES %s
            """,
            rows,
            template="(%s, %s, %s, %s, %s, %s)"
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
    
    # Get data from SQLite
    sqlite_cur.execute("""
        SELECT id, filename, status, questions_count, processed_count, 
               success_rate, unaccepted_answers_count, entity, error_message,
               created_at, downloaded, can_download, csv_content,
               low_confidence_answers, edited_answers
        FROM processed_questionnaires
    """)
    rows = sqlite_cur.fetchall()
    
    if rows:
        # Insert into PostgreSQL
        execute_values(
            pg_cur,
            """
            INSERT INTO processed_questionnaires (
                id, filename, status, questions_count, processed_count,
                success_rate, unaccepted_answers_count, entity, error_message,
                created_at, downloaded, can_download, csv_content,
                low_confidence_answers, edited_answers
            )
            VALUES %s
            """,
            rows,
            template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
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