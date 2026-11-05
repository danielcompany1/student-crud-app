-- Fictional sample data. Run this file exactly once, after schema.sql.
USE student_crud_db;

INSERT INTO students
  (first_name, last_name, email, phone, program, year_level, enrollment_date, status)
VALUES
  ('Avery', 'Quill', 'avery.quill@example.com', '555-0101', 'Computer Science', 2, '2025-08-25', 'Active'),
  ('Mateo', 'Lantern', 'mateo.lantern@example.com', NULL, 'Environmental Studies', 3, '2024-08-26', 'Active'),
  ('Juniper', 'Vale', 'juniper.vale@example.com', '555-0103', 'Graphic Design', 1, '2026-01-12', 'Active'),
  ('Niko', 'Wrenfield', 'niko.wrenfield@example.com', NULL, 'Business Administration', 4, '2023-08-28', 'On Leave'),
  ('Sasha', 'Marlowe', 'sasha.marlowe@example.com', '555-0105', 'Biology', 2, '2025-01-13', 'Active'),
  ('Remy', 'Northwind', 'remy.northwind@example.com', NULL, 'Information Systems', 6, '2021-08-30', 'Graduated'),
  ('Talia', 'Pine', 'talia.pine@example.com', '555-0107', 'Psychology', 3, '2024-01-15', 'Active'),
  ('Ellis', 'Bluejay', 'ellis.bluejay@example.com', NULL, 'Mechanical Engineering', 5, '2022-08-29', 'Active'),
  ('Noor', 'Pebble', 'noor.pebble@example.com', '555-0109', 'Public Health', 1, '2026-08-24', 'Active'),
  ('Kai', 'Moss', 'kai.moss@example.com', NULL, 'Media Studies', 4, '2023-01-16', 'Graduated');
