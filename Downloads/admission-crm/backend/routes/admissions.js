const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Helper: generate admission number
// Format: INST/YEAR/COURSETYPE/BRANCH/QUOTA/0001
async function generateAdmissionNumber(client, programId, quota) {
  const prog = await client.query(
    `SELECT p.*, d.name AS dept_name, i.code AS inst_code
     FROM programs p
     JOIN departments d ON p.department_id = d.id
     JOIN campuses c ON d.campus_id = c.id
     JOIN institutions i ON c.institution_id = i.id
     WHERE p.id = $1`,
    [programId]
  );
  if (!prog.rows[0]) throw new Error('Program not found');

  const { inst_code, academic_year, course_type, dept_name } = prog.rows[0];
  const year = academic_year.split('-')[0];
  const branch = dept_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

  // Count existing admissions for this program+quota
  const countResult = await client.query(
    `SELECT COUNT(*) FROM applicants
     WHERE program_id = $1 AND quota = $2 AND admission_number IS NOT NULL`,
    [programId, quota]
  );
  const seq = parseInt(countResult.rows[0].count) + 1;
  const seqStr = String(seq).padStart(4, '0');

  return `${inst_code}/${year}/${course_type}/${branch}/${quota}/${seqStr}`;
}

// POST /api/admissions/allocate — lock a seat
router.post('/allocate', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  const { applicant_id } = req.body;
  if (!applicant_id) return res.status(400).json({ message: 'applicant_id is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock row to prevent race conditions
    const applicant = await client.query(
      'SELECT * FROM applicants WHERE id = $1 FOR UPDATE',
      [applicant_id]
    );
    if (!applicant.rows[0]) return res.status(404).json({ message: 'Applicant not found.' });

    const app = applicant.rows[0];
    if (app.seat_locked) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Seat already allocated for this applicant.' });
    }

    // Check quota availability
    const matrix = await client.query(
      'SELECT * FROM seat_matrix WHERE program_id = $1 AND quota = $2',
      [app.program_id, app.quota]
    );
    if (!matrix.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No seat matrix configured for this quota.' });
    }

    const filled = await client.query(
      `SELECT COUNT(*) FROM applicants
       WHERE program_id = $1 AND quota = $2 AND seat_locked = TRUE`,
      [app.program_id, app.quota]
    );
    const filledCount = parseInt(filled.rows[0].count);
    const totalSeats = matrix.rows[0].total_seats;

    if (filledCount >= totalSeats) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Quota full. ${app.quota} has ${totalSeats} seats, all allocated.`,
      });
    }

    // Lock the seat
    await client.query(
      'UPDATE applicants SET seat_locked = TRUE WHERE id = $1',
      [applicant_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Seat locked successfully.', remaining: totalSeats - filledCount - 1 });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/admissions/confirm — confirm admission & generate number
router.post('/confirm', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  const { applicant_id } = req.body;
  if (!applicant_id) return res.status(400).json({ message: 'applicant_id is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const applicant = await client.query(
      'SELECT * FROM applicants WHERE id = $1 FOR UPDATE',
      [applicant_id]
    );
    if (!applicant.rows[0]) return res.status(404).json({ message: 'Applicant not found.' });

    const app = applicant.rows[0];

    if (!app.seat_locked) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Seat must be locked before confirming admission.' });
    }
    if (app.fee_status !== 'Paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Fee must be Paid before confirming admission.' });
    }
    if (app.admission_number) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Admission already confirmed. Number: ' + app.admission_number });
    }

    const admissionNumber = await generateAdmissionNumber(client, app.program_id, app.quota);

    await client.query(
      'UPDATE applicants SET admission_number = $1 WHERE id = $2',
      [admissionNumber, applicant_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Admission confirmed!', admission_number: admissionNumber });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admissions/dashboard — summary stats
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const totalIntake = await pool.query('SELECT COALESCE(SUM(total_intake), 0) AS total FROM programs');
    const totalAdmitted = await pool.query(`SELECT COUNT(*) AS total FROM applicants WHERE admission_number IS NOT NULL`);
    const pendingDocs = await pool.query(`SELECT COUNT(*) AS total FROM applicants WHERE doc_status = 'Pending'`);
    const feePending = await pool.query(`SELECT COUNT(*) AS total FROM applicants WHERE seat_locked = TRUE AND fee_status = 'Pending'`);

    const quotaStats = await pool.query(`
      SELECT sm.quota,
        SUM(sm.total_seats) AS total,
        COUNT(a.id) FILTER (WHERE a.seat_locked = TRUE) AS filled
      FROM seat_matrix sm
      LEFT JOIN applicants a ON a.program_id = sm.program_id AND a.quota = sm.quota
      GROUP BY sm.quota
    `);

    const programStats = await pool.query(`
      SELECT p.id, p.name, p.total_intake,
        COUNT(a.id) FILTER (WHERE a.seat_locked = TRUE) AS seated,
        COUNT(a.id) FILTER (WHERE a.admission_number IS NOT NULL) AS admitted
      FROM programs p
      LEFT JOIN applicants a ON a.program_id = p.id
      GROUP BY p.id, p.name, p.total_intake
      ORDER BY p.name
    `);

    const feePendingList = await pool.query(`
      SELECT a.name, a.quota, a.fee_status, p.name AS program_name
      FROM applicants a
      JOIN programs p ON a.program_id = p.id
      WHERE a.seat_locked = TRUE AND a.fee_status = 'Pending'
      ORDER BY a.created_at DESC
    `);

    res.json({
      total_intake: parseInt(totalIntake.rows[0].total),
      total_admitted: parseInt(totalAdmitted.rows[0].total),
      pending_docs: parseInt(pendingDocs.rows[0].total),
      fee_pending: parseInt(feePending.rows[0].total),
      quota_stats: quotaStats.rows,
      program_stats: programStats.rows,
      fee_pending_list: feePendingList.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
