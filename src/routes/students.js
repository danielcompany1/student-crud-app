const express = require('express');
const pool = require('../config/database');

const router = express.Router();
const ALLOWED_STATUSES = new Set(['Active', 'On Leave', 'Graduated']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 100;

function sendError(res, status, code, message, fieldErrors) {
  const error = { code, message };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    error.fieldErrors = fieldErrors;
  }
  return res.status(status).json({ success: false, error });
}

function parseStudent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { form: 'Send student fields as a JSON object.' } };
  }

  const errors = {};
  const student = {};
  const stringField = (field, label, maxLength, required = true) => {
    const raw = body[field];
    if (raw === undefined || raw === null) {
      if (required) errors[field] = `${label} is required.`;
      else student[field] = null;
      return;
    }
    if (typeof raw !== 'string') {
      errors[field] = `${label} must be text.`;
      return;
    }
    const value = raw.trim();
    if (!value && required) errors[field] = `${label} is required.`;
    else if (value.length > maxLength) errors[field] = `${label} must be ${maxLength} characters or fewer.`;
    else student[field] = value || null;
  };

  stringField('first_name', 'First name', 100);
  stringField('last_name', 'Last name', 100);
  stringField('email', 'Email', 254);
  stringField('phone', 'Phone', 30, false);
  stringField('program', 'Program', 120);

  if (student.email) {
    student.email = student.email.toLowerCase();
    if (!EMAIL_PATTERN.test(student.email)) errors.email = 'Enter a valid email address.';
  }

  if (body.year_level === undefined || body.year_level === null || body.year_level === '') {
    errors.year_level = 'Year level is required.';
  } else {
    const rawYear = String(body.year_level).trim();
    if (!/^[1-6]$/.test(rawYear)) errors.year_level = 'Choose a whole number from 1 to 6.';
    else student.year_level = Number(rawYear);
  }

  const enrollmentDate = body.enrollment_date;
  if (typeof enrollmentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(enrollmentDate)) {
    errors.enrollment_date = 'Enter a valid enrollment date.';
  } else {
    const [year, month, day] = enrollmentDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      errors.enrollment_date = 'Enter a real calendar date.';
    } else {
      student.enrollment_date = enrollmentDate;
    }
  }

  if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status)) {
    errors.status = 'Choose Active, On Leave, or Graduated.';
  } else {
    student.status = body.status;
  }

  return { student, errors };
}

function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function publicStudent(row) {
  return {
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    program: row.program,
    year_level: row.year_level,
    enrollment_date: row.enrollment_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, PAGE_SIZE_DEFAULT);
  if (!page || !limit || limit > PAGE_SIZE_MAX) {
    return sendError(res, 400, 'INVALID_PAGINATION', `Page must be positive and limit must be between 1 and ${PAGE_SIZE_MAX}.`);
  }

  const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const whereSql = search
    ? 'WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR program LIKE ?'
    : '';
  const searchPattern = `%${search}%`;
  const whereValues = search ? [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern] : [];
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) return sendError(res, 400, 'INVALID_PAGINATION', 'The requested page is too large.');

  try {
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM students ${whereSql}`,
      whereValues
    );
    const total = Number(countRows[0].total);
    const [rows] = await pool.execute(
      `SELECT student_id, first_name, last_name, email, phone, program, year_level,
              DATE_FORMAT(enrollment_date, '%Y-%m-%d') AS enrollment_date,
              status, created_at, updated_at
       FROM students ${whereSql}
       ORDER BY last_name ASC, first_name ASC, student_id ASC
       LIMIT ? OFFSET ?`,
      [...whereValues, limit, offset]
    );

    return res.json({
      success: true,
      data: {
        students: rows.map(publicStudent),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          search
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Student ID must be a positive integer.');

  try {
    const [rows] = await pool.execute(
      `SELECT student_id, first_name, last_name, email, phone, program, year_level,
              DATE_FORMAT(enrollment_date, '%Y-%m-%d') AS enrollment_date,
              status, created_at, updated_at
       FROM students WHERE student_id = ?`,
      [id]
    );
    if (rows.length === 0) return sendError(res, 404, 'STUDENT_NOT_FOUND', 'No student was found with that ID.');
    return res.json({ success: true, data: { student: publicStudent(rows[0]) } });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { student, errors } = parseStudent(req.body);
  if (Object.keys(errors).length) return sendError(res, 400, 'VALIDATION_ERROR', 'Check the highlighted fields and try again.', errors);

  try {
    const [result] = await pool.execute(
      `INSERT INTO students
       (first_name, last_name, email, phone, program, year_level, enrollment_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student.first_name, student.last_name, student.email, student.phone, student.program,
        student.year_level, student.enrollment_date, student.status]
    );
    const [rows] = await pool.execute(
      `SELECT student_id, first_name, last_name, email, phone, program, year_level,
              DATE_FORMAT(enrollment_date, '%Y-%m-%d') AS enrollment_date,
              status, created_at, updated_at
       FROM students WHERE student_id = ?`,
      [result.insertId]
    );
    return res.status(201).json({ success: true, data: { student: publicStudent(rows[0]) } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, 409, 'EMAIL_TAKEN', 'That email address is already assigned to a student.', { email: 'Use a different email address.' });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Student ID must be a positive integer.');
  const { student, errors } = parseStudent(req.body);
  if (Object.keys(errors).length) return sendError(res, 400, 'VALIDATION_ERROR', 'Check the highlighted fields and try again.', errors);

  try {
    const [result] = await pool.execute(
      `UPDATE students
       SET first_name = ?, last_name = ?, email = ?, phone = ?, program = ?,
           year_level = ?, enrollment_date = ?, status = ?
       WHERE student_id = ?`,
      [student.first_name, student.last_name, student.email, student.phone, student.program,
        student.year_level, student.enrollment_date, student.status, id]
    );
    if (result.affectedRows === 0) {
      const [rows] = await pool.execute('SELECT student_id FROM students WHERE student_id = ?', [id]);
      if (rows.length === 0) return sendError(res, 404, 'STUDENT_NOT_FOUND', 'No student was found with that ID.');
    }
    const [rows] = await pool.execute(
      `SELECT student_id, first_name, last_name, email, phone, program, year_level,
              DATE_FORMAT(enrollment_date, '%Y-%m-%d') AS enrollment_date,
              status, created_at, updated_at
       FROM students WHERE student_id = ?`,
      [id]
    );
    return res.json({ success: true, data: { student: publicStudent(rows[0]) } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, 409, 'EMAIL_TAKEN', 'That email address is already assigned to a student.', { email: 'Use a different email address.' });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Student ID must be a positive integer.');

  try {
    const [result] = await pool.execute('DELETE FROM students WHERE student_id = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 404, 'STUDENT_NOT_FOUND', 'No student was found with that ID.');
    return res.json({ success: true, data: { student_id: id } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
