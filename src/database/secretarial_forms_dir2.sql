-- Forms list (Secretarial) + DIR-2 records. Run after main schema / secretarial_module_tables.sql.

CREATE TABLE IF NOT EXISTS secretarial_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    form_name VARCHAR(255) NOT NULL,
    team_member_name VARCHAR(255),
    start_date DATE,
    status VARCHAR(100),
    mca_user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS secretarial_dir2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    company_name VARCHAR(500),
    appointee_name VARCHAR(255),
    din VARCHAR(20),
    pan VARCHAR(20),
    name VARCHAR(255),
    date_of_appointment DATE,
    dir2_status VARCHAR(100) DEFAULT 'draft',
    particulars JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
