-- Alter migrations for existing tables that need new columns
-- Each statement is wrapped in try/catch in migrate.js so duplicates are safely skipped

ALTER TABLE users ADD COLUMN role ENUM('admin','manager','employee','hr','finance') DEFAULT 'employee' AFTER phone
ALTER TABLE companies ADD COLUMN phone VARCHAR(20) AFTER email;
ALTER TABLE incorporations ADD COLUMN purpose VARCHAR(255) AFTER proposed_name_2;
