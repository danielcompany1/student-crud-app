-- Run only after confirming that student_crud_db does not already exist.
-- This file intentionally uses CREATE (not IF NOT EXISTS) so a name conflict
-- fails instead of silently reusing an existing database or table.
CREATE DATABASE student_crud_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE student_crud_db;

CREATE TABLE students (
  student_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(30) NULL,
  program VARCHAR(120) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  enrollment_date DATE NOT NULL,
  status ENUM('Active', 'On Leave', 'Graduated') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_students_email (email),
  CONSTRAINT chk_students_year_level CHECK (year_level BETWEEN 1 AND 6)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
