const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// ── INSTITUTIONS ──────────────────────────────────────────

// GET all institutions
router.get('/institutions', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM institutions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create institution (admin only)
router.post('/institutions', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ message: 'Name and code are required.' });
  try {
    const result = await pool.query(
      'INSERT INTO institutions (name, code) VALUES ($1, $2) RETURNING *',
      [name, code.toUpperCase()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Institution code already exists.' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE institution
router.delete('/institutions/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM institutions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CAMPUSES ──────────────────────────────────────────────

router.get('/campuses', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, i.name AS institution_name, i.code AS institution_code
      FROM campuses c
      JOIN institutions i ON c.institution_id = i.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/campuses', verifyToken, requireRole('admin'), async (req, res) => {
  const { institution_id, name } = req.body;
  if (!institution_id || !name) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const result = await pool.query(
      'INSERT INTO campuses (institution_id, name) VALUES ($1, $2) RETURNING *',
      [institution_id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/campuses/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM campuses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DEPARTMENTS ───────────────────────────────────────────

router.get('/departments', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.name AS campus_name, i.name AS institution_name
      FROM departments d
      JOIN campuses c ON d.campus_id = c.id
      JOIN institutions i ON c.institution_id = i.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/departments', verifyToken, requireRole('admin'), async (req, res) => {
  const { campus_id, name } = req.body;
  if (!campus_id || !name) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const result = await pool.query(
      'INSERT INTO departments (campus_id, name) VALUES ($1, $2) RETURNING *',
      [campus_id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/departments/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
