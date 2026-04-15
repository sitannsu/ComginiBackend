-- =============================================
-- COMGINI BACKEND - FULL DATABASE SCHEMA
-- =============================================

-- 1. AUTH & SECURITY
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar VARCHAR(32) DEFAULT 'blue',
    gender VARCHAR(20) DEFAULT NULL,
    company_name VARCHAR(255) DEFAULT NULL,
    gst_number VARCHAR(32) DEFAULT NULL,
    role ENUM('admin','manager','employee','hr','finance') DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. DASHBOARD
-- =============================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    position INT DEFAULT 0,
    config JSON,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    color VARCHAR(20) DEFAULT '#FFFF00',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_feed (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT NOT NULL,
    sr_no INT,
    particular VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    checklist_id INT NOT NULL,
    maker_id INT NOT NULL,
    checker_id INT NOT NULL,
    due_date DATE,
    status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
    FOREIGN KEY (maker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (checker_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    client_id INT NOT NULL,
    assignment_id INT NULL,
    task VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE,
    end_time TIME,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES checklist_assignments(id) ON DELETE SET NULL
);

-- 3. CLIENT & COMPANY MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company_name VARCHAR(255),
    cin VARCHAR(50),
    pan VARCHAR(20),
    gstin VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    client_group VARCHAR(100),
    risk_score ENUM('low','medium','high') DEFAULT 'low',
    status ENUM('active','inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 4. MASTERS DATA MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cin VARCHAR(50) UNIQUE,
    llpin VARCHAR(50),
    company_type ENUM('company','llp') DEFAULT 'company',
    status VARCHAR(50),
    roc VARCHAR(100),
    registration_date DATE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    authorized_capital DECIMAL(15,2),
    paid_up_capital DECIMAL(15,2),
    mca_sync_status ENUM('synced','pending','error') DEFAULT 'pending',
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS directors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    din VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    appointment_date DATE,
    cessation_date DATE,
    tenure_years INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rta_masters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    isin_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_rta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    rta_id INT NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (rta_id) REFERENCES rta_masters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auditors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    category ENUM('statutory','secretarial','cost','internal') NOT NULL,
    firm_registration_number VARCHAR(100),
    firm_name VARCHAR(255),
    pan VARCHAR(20),
    firm_email VARCHAR(255),
    address TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    membership_number VARCHAR(100),
    auditor_name VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    designation VARCHAR(100),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS auditor_adt1_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auditor_id INT NULL,
    file_v2_name VARCHAR(255),
    file_v2_url VARCHAR(500),
    file_v3_name VARCHAR(255),
    file_v3_url VARCHAR(500),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auditor_id) REFERENCES auditors(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_no VARCHAR(20),
    email VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mis_report_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    mis_date DATE,
    type ENUM('company','llp') DEFAULT 'company',
    generated_by INT,
    origin VARCHAR(100) DEFAULT 'manual',
    export_link VARCHAR(500),
    generated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shareholders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    under_sub_category VARCHAR(100),
    cin_llpin VARCHAR(100),
    registration_no VARCHAR(100),
    incorporation_date DATE,
    pan VARCHAR(20),
    email VARCHAR(255),
    mobile VARCHAR(20),
    address_line1 TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    aadhaar VARCHAR(20),
    nationality VARCHAR(100),
    marital_status VARCHAR(50),
    spouse_name VARCHAR(255),
    occupation VARCHAR(100),
    guardian_name VARCHAR(255),
    documents JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS debenture_holders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    under_sub_category VARCHAR(100),
    address_line1 TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    gender VARCHAR(20),
    pan VARCHAR(20),
    dob DATE,
    aadhaar VARCHAR(20),
    nationality VARCHAR(100),
    voter_id VARCHAR(50),
    email VARCHAR(255),
    mobile VARCHAR(20),
    marital_status VARCHAR(50),
    spouse_name VARCHAR(255),
    occupation VARCHAR(100),
    guardian_name VARCHAR(255),
    cin_registration_no VARCHAR(100),
    incorporation_date DATE,
    documents JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pcs_firms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firm_name VARCHAR(255) NOT NULL,
    urn VARCHAR(50),
    address TEXT,
    gstin VARCHAR(20),
    pan VARCHAR(20),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    firm_type ENUM('pcs','ca') DEFAULT 'pcs',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. INCORPORATION SERVICES
-- =============================================

CREATE TABLE IF NOT EXISTS incorporations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_type ENUM('RUN-LLP','SPICe+','INC-32','FiLLiP') NOT NULL,
    proposed_name_1 VARCHAR(255),
    proposed_name_2 VARCHAR(255),
    purpose VARCHAR(255),
    srn VARCHAR(50),
    mca_user VARCHAR(100),
    submission_status ENUM('draft','submitted','approved','rejected','expired') DEFAULT 'draft',
    approval_date DATE,
    expiry_date DATE,
    fee_paid DECIMAL(10,2),
    remarks TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. TASK & WORKFLOW
-- =============================================

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INT,
    company_id INT,
    assigned_to INT,
    assigned_by INT,
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    status ENUM('todo','in_progress','review','completed','cancelled') DEFAULT 'todo',
    is_starred BOOLEAN DEFAULT false,
    collaborators JSON,
    approver INT,
    labels JSON,
    start_date DATE,
    recurring BOOLEAN DEFAULT false,
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approver) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    contact_person VARCHAR(255),
    mobile_number VARCHAR(20),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    duration_minutes INT,
    notes TEXT,
    logged_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. EVENTS & CALENDAR
-- =============================================

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('meeting','deadline','hearing','agm','board_meeting','other') DEFAULT 'other',
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NULL,
    location VARCHAR(255),
    is_all_day BOOLEAN DEFAULT false,
    company_id INT,
    client_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending','accepted','declined') DEFAULT 'pending',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. DOCUMENT MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    category VARCHAR(100),
    client_id INT,
    company_id INT,
    uploaded_by INT,
    status ENUM('requested','uploaded','approved','rejected') DEFAULT 'uploaded',
    magic_link_token VARCHAR(255),
    magic_link_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_title VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INT NOT NULL,
    requested_by INT NOT NULL,
    status ENUM('pending','uploaded','overdue') DEFAULT 'pending',
    due_date DATE,
    magic_link_token VARCHAR(255) UNIQUE,
    magic_link_expires_at TIMESTAMP NULL,
    document_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- 9. REPORTING & ANALYTICS
-- =============================================

CREATE TABLE IF NOT EXISTS report_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    filters JSON,
    schedule_cron VARCHAR(100),
    email_recipients TEXT,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    company_name VARCHAR(255),
    status VARCHAR(100),
    owner_id INT,
    source VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(20),
    website VARCHAR(255),
    gstin VARCHAR(20),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. HRMS & TEAM MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    employee_code VARCHAR(50),
    department VARCHAR(100),
    designation VARCHAR(100),
    date_of_joining DATE,
    date_of_leaving DATE,
    salary DECIMAL(12,2),
    bank_account VARCHAR(50),
    ifsc_code VARCHAR(20),
    pan VARCHAR(20),
    aadhar VARCHAR(20),
    emergency_contact VARCHAR(20),
    status ENUM('active','on_leave','resigned','terminated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS salary_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    salary_in_hand DECIMAL(12,2),
    overtime_per_day DECIMAL(10,2),
    leave_deduction DECIMAL(10,2),
    paid_leave INT DEFAULT 0,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    in_time TIMESTAMP NULL,
    out_time TIMESTAMP NULL,
    working_hours DECIMAL(4,2),
    status ENUM('present','absent','half_day','leave','holiday') DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type ENUM('casual','sick','paid','unpaid','maternity','paternity') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. BUSINESS MANAGER
-- =============================================

CREATE TABLE IF NOT EXISTS registrations_licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    status ENUM('active','expired','renewal_pending') DEFAULT 'active',
    file_url VARCHAR(500),
    alert_days_before INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS business_insurance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    insurance_company VARCHAR(255),
    broker_name VARCHAR(255),
    policy_type VARCHAR(100),
    policy_number VARCHAR(100),
    sum_insured DECIMAL(15,2),
    policy_commencement_date DATE,
    renewal_date DATE,
    start_from DATE,
    expiry_date DATE,
    amount_paid DECIMAL(15,2),
    mode_of_payment VARCHAR(100),
    asset_insured VARCHAR(255),
    payment_date DATE,
    key_terms TEXT,
    alert_user VARCHAR(255),
    alert_before VARCHAR(50),
    remarks TEXT,
    file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS business_contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    category VARCHAR(100),
    contract_name VARCHAR(255),
    contract_value DECIMAL(15,2),
    contract_period VARCHAR(100),
    name_of_party VARCHAR(255),
    date_of_execution DATE,
    start_from DATE,
    expiry_date DATE,
    key_terms TEXT,
    alert_user VARCHAR(255),
    alert_before VARCHAR(50),
    remarks TEXT,
    file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- 12. FINANCE
-- =============================================

CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT NOT NULL,
    company_id INT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_status ENUM('unpaid','partial','paid','overdue') DEFAULT 'unpaid',
    payment_date DATE,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    rate DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url VARCHAR(500),
    payment_mode ENUM('cash','bank','upi','card') DEFAULT 'cash',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. HELP & SUPPORT
-- =============================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('bug','feature','question','other') DEFAULT 'question',
    priority ENUM('low','medium','high') DEFAULT 'medium',
    status ENUM('open','in_progress','resolved','closed') DEFAULT 'open',
    screenshot_url VARCHAR(500),
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. SECRETARIAL PRACTICE
-- =============================================

CREATE TABLE IF NOT EXISTS filing_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    status ENUM('pending','in_progress','filed','overdue') DEFAULT 'pending',
    filing_date DATE,
    due_date DATE,
    srn VARCHAR(50),
    agm_date DATE,
    receipt_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compliance_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    compliance_type VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    reminder_date DATE NOT NULL,
    email_recipients TEXT,
    email_subject VARCHAR(255),
    email_body TEXT,
    send_whatsapp BOOLEAN DEFAULT false,
    status ENUM('pending','sent','cancelled') DEFAULT 'pending',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dsc_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    holder_name VARCHAR(255) NOT NULL,
    din VARCHAR(20),
    company_id INT,
    client_group VARCHAR(100),
    token_serial VARCHAR(100),
    provider VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    box_location VARCHAR(100),
    current_status ENUM('in','out') DEFAULT 'in',
    last_status_change TIMESTAMP NULL,
    checked_out_to VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dsc_boxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    capacity INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. MCA SERVICES INTEGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS mca_downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    srn VARCHAR(50),
    download_type VARCHAR(50),
    financial_year VARCHAR(10),
    file_url VARCHAR(500),
    status ENUM('queued','downloading','completed','failed') DEFAULT 'queued',
    error_message TEXT,
    requested_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. WEB-BASED E-FILING
-- =============================================

CREATE TABLE IF NOT EXISTS eform_filings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    financial_year VARCHAR(10),
    charge_id VARCHAR(50),
    charge_amount DECIMAL(15,2),
    charge_date DATE,
    signing_director_id INT,
    status ENUM('draft','generated','dsc_affixed','uploaded','filed') DEFAULT 'draft',
    pdf_url VARCHAR(500),
    srn VARCHAR(50),
    remarks TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (signing_director_id) REFERENCES directors(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
