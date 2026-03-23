-- Alter migrations for existing tables that need new columns
-- Each statement is wrapped in try/catch in migrate.js so duplicates are safely skipped

ALTER TABLE users ADD COLUMN role ENUM('admin','manager','employee','hr','finance') DEFAULT 'employee' AFTER phone
ALTER TABLE companies ADD COLUMN phone VARCHAR(20) AFTER email;
ALTER TABLE incorporations ADD COLUMN purpose VARCHAR(255) AFTER proposed_name_2;
ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT false AFTER status;
ALTER TABLE tasks ADD COLUMN collaborators JSON AFTER is_starred;
ALTER TABLE tasks ADD COLUMN approver INT AFTER collaborators;
ALTER TABLE tasks ADD COLUMN labels JSON AFTER approver;
ALTER TABLE tasks ADD COLUMN start_date DATE AFTER labels;
ALTER TABLE tasks ADD COLUMN recurring BOOLEAN DEFAULT false AFTER start_date;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_approver FOREIGN KEY (approver) REFERENCES users(id) ON DELETE SET NULL;
