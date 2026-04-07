-- Time cards (HRMS) — API: /api/v1/time-cards
-- Run once: mysql ... < src/database/time_cards_module.sql

CREATE TABLE IF NOT EXISTS time_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mode VARCHAR(10) NOT NULL DEFAULT 'WFO',
    in_date DATE NOT NULL,
    in_time TIME NOT NULL,
    out_date DATE NULL,
    out_time TIME NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_open (user_id, in_date),
    INDEX idx_in_date (in_date)
);
