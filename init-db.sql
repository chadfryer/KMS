-- Create database and user
CREATE DATABASE kmsdb;
CREATE USER kmsuser WITH PASSWORD 'kmspassword';
GRANT ALL PRIVILEGES ON DATABASE kmsdb TO kmsuser;

\c kmsdb;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO kmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kmsuser;

-- Drop existing table if it exists
DROP TABLE IF EXISTS questionnaires;

-- Create the questionnaires table with proper constraints
CREATE TABLE questionnaires (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL CHECK (length(trim(question)) > 0),
    answer_key TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    domain TEXT,
    compliance_answer TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on the category and sub_category columns
CREATE INDEX idx_questionnaires_category ON questionnaires(category);
CREATE INDEX idx_questionnaires_sub_category ON questionnaires(sub_category);
CREATE INDEX idx_questionnaires_domain ON questionnaires(domain);

-- Create a function to update the last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the last_updated timestamp
CREATE TRIGGER update_questionnaires_last_updated
    BEFORE UPDATE ON questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Insert sample data with proper formatting
INSERT INTO questionnaires (question, answer_key, category, sub_category, domain) VALUES
('What are the known vulnerabilities in WordPress MFA?', 'Details about WordPress MFA vulnerabilities...', 'Old Vulnerabilities', 'RiskRecon - Wordpress MFA', 'Security'),
('What is the attack surface of the Docker daemon?', 'Analysis of Docker daemon attack surface...', 'Security Analysis', 'Docker Daemon Attack surface', 'Container Security'),
('What are the potential secrets that could be exposed in container images?', 'List of potential secrets in container images...', 'Specific Vulnerabilities', 'Secrets in images', 'Container Security'),
('What are the current CVEs affecting Snowflake?', 'Current Snowflake CVEs and their impact...', 'Specific Vulnerabilities', 'Snowflake CVEs', 'Cloud Security'),
('What are the security implications of Palo Alto configurations?', 'Palo Alto security configuration analysis...', 'Specific Vulnerabilities', 'Palo Alto', 'Network Security'),
('What are the vulnerabilities in NGINX Controller for Kubernetes?', 'NGINX Controller vulnerability assessment...', 'Specific Vulnerabilities', 'NGINX Controller for Kubernetes', 'Container Security'),
('What are the security concerns in the MoveIT Transfer supply chain?', 'MoveIT Transfer supply chain security analysis...', 'Specific Vulnerabilities', 'MoveIT Transfer Supply Chain', 'Supply Chain Security'),
('What are the security features of MoveIT Transfer?', 'MoveIT Transfer security features overview...', 'Specific Vulnerabilities', 'MoveIT Transfer', 'Data Security'),
('What are the security considerations for Ivanti Connect Secure?', 'Ivanti Connect Secure security analysis...', 'Specific Vulnerabilities', 'Ivanti Connect Secure', 'Network Security');

-- Grant privileges
ALTER TABLE questionnaires OWNER TO kmsuser;
GRANT ALL PRIVILEGES ON TABLE questionnaires TO kmsuser;
GRANT USAGE, SELECT ON SEQUENCE questionnaires_id_seq TO kmsuser; 