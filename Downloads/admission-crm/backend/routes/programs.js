const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all programs with seat matrix
router.get('/', verifyToken, async (req, res) => {
  try {
    const programs = await pool.query(`
      SELECT p.*,
        d.name AS department_name,
        c.name AS campus_name,
        i.name AS institution_name,
        i.code AS institution_code
      FROM programs p
      JOIN departments d ON p.department_id = d.id
      JOIN campuses c ON d.campus_id = c.id
      JOIN institutions i ON c.institution_id = i.id
      ORDER BY p.created_at DESC
    `);

    // Attach seat matrix + filled counts for each program
    const result = await Promise.all(
      programs.rows.map(async (prog) => {
        const matrix = await pool.query(
          'SELECT * FROM seat_matrix WHERE program_id = $1',
          [prog.id]
        );
        const filled = await pool.query(`
          SELECT quota, COUNT(*) AS filled
          FROM applicants
          WHERE program_id = $1 AND seat_locked = TRUE
          GROUP BY quota
        `, [prog.id]);

        const filledMap = {};
        filled.rows.forEach(r => { filledMap[r.quota] = parseInt(r.filled); });

        const quotas = {};
        matrix.rows.forEach(m => {
          quotas[m.quota] = {
            total: m.total_seats,
            filled: filledMap[m.quota] || 0,
            available: m.total_seats - (filledMap[m.quota] || 0),
          };
        });

        return { ...prog, quotas };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single program
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const prog = await pool.query(
      `SELECT p.*, d.name AS department_name, i.code AS institution_code
       FROM programs p
       JOIN departments d ON p.department_id = d.id
       JOIN campuses c ON d.campus_id = c.id
       JOIN institutions i ON c.institution_id = i.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!prog.rows[0]) return res.status(404).json({ message: 'Program not found.' });
    res.json(prog.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create program
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { department_id, name, course_type, entry_type, admission_mode, academic_year, total_intake, quotas } = req.body;

  if (!department_id || !name || !course_type || !entry_type || !admission_mode || !academic_year || !total_intake) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Validate quota sum equals intake
  const quotaSum = (quotas?.KCET || 0) + (quotas?.COMEDK || 0) + (quotas?.Management || 0);
  if (quotaSum !== parseInt(total_intake)) {
    return res.status(400).json({ message: `Quota sum (${quotaSum}) must equal total intake (${total_intake}).` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const progResult = await client.query(
      `INSERT INTO programs (department_id, name, course_type, entry_type, admission_mode, academic_year, total_intake)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [department_id, name, course_type, entry_type, admission_mode, academic_year, total_intake]
    );
    const prog = progResult.rows[0];

    // Insert seat matrix rows
    for (const [quota, seats] of Object.entries(quotas)) {
      await client.query(
        'INSERT INTO seat_matrix (program_id, quota, total_seats) VALUES ($1, $2, $3)',
        [prog.id, quota, seats]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(prog);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// PUT update seat matrix quotas
router.put('/:id/quotas', verifyToken, requireRole('admin'), async (req, res) => {
  const { quotas } = req.body; // { KCET: n, COMEDK: n, Management: n }

  const prog = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
  if (!prog.rows[0]) return res.status(404).json({ message: 'Program not found.' });

  const quotaSum = Object.values(quotas).reduce((s, v) => s + parseInt(v), 0);
  if (quotaSum !== prog.rows[0].total_intake) {
    return res.status(400).json({ message: `Quota sum (${quotaSum}) must equal intake (${prog.rows[0].total_intake}).` });
  }

  try {
    for (const [quota, seats] of Object.entries(quotas)) {
      await pool.query(
        `INSERT INTO seat_matrix (program_id, quota, total_seats)
         VALUES ($1, $2, $3)
         ON CONFLICT (program_id, quota) DO UPDATE SET total_seats = $3`,
        [req.params.id, quota, seats]
      );
    }
    res.json({ message: 'Seat matrix updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE program
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
