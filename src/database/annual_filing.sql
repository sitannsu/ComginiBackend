-- Annual filing list + status check audit. Run after main schema.

CREATE TABLE IF NOT EXISTS secretarial_annual_filing_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    client_name VARCHAR(500),
    cin VARCHAR(50),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_from VARCHAR(100) DEFAULT 'portal',
    metadata JSON,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS secretarial_annual_filing_status_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mca_user VARCHAR(255),
    company_id INT NULL,
    cin VARCHAR(50),
    result_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
