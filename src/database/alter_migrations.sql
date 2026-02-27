-- Alter migrations for existing tables that need new columns
-- Each statement is wrapped in try/catch in migrate.js so duplicates are safely skipped

ALTER TABLE users ADD COLUMN role ENUM('admin','manager','employee','hr','finance') DEFAULT 'employee' AFTER phone
