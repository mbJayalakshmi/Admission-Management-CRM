const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const DEFAULT_DOCS = [
  '10th Marksheet',
  '12th / Diploma Marksheet',
  'Transfer Certificate',
  'Migration Certificate',
  'Caste Certificate',
  'KCET / COMEDK Rank Card',
  'Passport Photo',
];

// GET all applicants
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, p.name AS program_name, p.course_type, p.academic_year
      FROM applicants a
      LEFT JOIN programs p ON a.program_id = p.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single applicant with documents
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const applicant = await pool.query(
      `SELECT a.*, p.name AS program_name, p.course_type, p.academic_year, i.code AS institution_code
       FROM applicants a
       LEFT JOIN programs p ON a.program_id = p.id
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN campuses c ON d.campus_id = c.id
       LEFT JOIN institutions i ON c.institution_id = i.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!applicant.rows[0]) return res.status(404).json({ message: 'Applicant not found.' });

    const docs = await pool.query(
      'SELECT * FROM documents WHERE applicant_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({ ...applicant.rows[0], documents: docs.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create applicant
router.post('/', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  const {
    name, email, mobile, date_of_birth, gender, category,
    entry_type, quota, program_id, qualifying_marks, allotment_number, state,
  } = req.body;

  if (!name || !email || !mobile || !category || !quota || !program_id) {
    return res.status(400).json({ message: 'Required fields missing.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO applicants
        (name, email, mobile, date_of_birth, gender, category, entry_type, quota, program_id,
         qualifying_marks, allotment_number, state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, email, mobile, date_of_birth || null, gender, category,
       entry_type, quota, program_id, qualifying_marks || null,
       allotment_number || null, state || null]
    );

    const applicant = result.rows[0];

    // Insert default document checklist
    for (const docName of DEFAULT_DOCS) {
      await client.query(
        'INSERT INTO documents (applicant_id, document_name, status) VALUES ($1, $2, $3)',
        [applicant.id, docName, 'Pending']
      );
    }

    await client.query('COMMIT');
    res.status(201).json(applicant);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// PATCH update document status
router.patch('/:id/documents/:docId', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Submitted', 'Verified'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }
  try {
    await pool.query(
      'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2 AND applicant_id = $3',
      [status, req.params.docId, req.params.id]
    );
    res.json({ message: 'Document status updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update fee status
router.patch('/:id/fee', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  const { fee_status } = req.body;
  if (!['Pending', 'Paid'].includes(fee_status)) {
    return res.status(400).json({ message: 'Invalid fee status.' });
  }
  try {
    await pool.query('UPDATE applicants SET fee_status = $1 WHERE id = $2', [fee_status, req.params.id]);
    res.json({ message: 'Fee status updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
