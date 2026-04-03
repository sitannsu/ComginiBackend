-- LLP / Company MCA credentials + bulk campaign logs. Run on MySQL after main schema.

CREATE TABLE IF NOT EXISTS secretarial_llp_mca_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    llpin VARCHAR(50) NOT NULL,
    llp_name VARCHAR(500),
    user_id VARCHAR(255),
    password VARCHAR(500),
    pan VARCHAR(20),
    email VARCHAR(255),
    contact_no VARCHAR(50),
    partner_mail_id VARCHAR(255),
    partner_name_for_otp VARCHAR(255),
    partner_ph_no VARCHAR(50),
    hint_question VARCHAR(500),
    hint_answer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_llp_mca_llpin (llpin)
);

CREATE TABLE IF NOT EXISTS secretarial_company_mca_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cin VARCHAR(50) NOT NULL,
    company_name VARCHAR(500),
    user_id VARCHAR(255),
    password VARCHAR(500),
    pan VARCHAR(20),
    email VARCHAR(255),
    contact_no VARCHAR(50),
    director_name_for_otp VARCHAR(255),
    director_mail_id VARCHAR(255),
    director_ph_no VARCHAR(50),
    hint_question VARCHAR(500),
    hint_answer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_mca_cin (cin)
);

CREATE TABLE IF NOT EXISTS bulk_whatsapp_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    message TEXT,
    contacts_json JSON NOT NULL,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    attachment_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bulk_gmail_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    subject VARCHAR(500),
    body TEXT,
    emails_json JSON NOT NULL,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    attachment_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
