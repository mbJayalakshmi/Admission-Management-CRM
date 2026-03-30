/**
 * seed.js — Run this to insert default users into the database
 * Usage: node seed.js
 *
 * This is separate from schema.sql because bcrypt hashing
 * must be done in Node, not in SQL directly.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function seed() {
  const users = [
    { name: 'Super Admin',       email: 'admin@crm.com',   password: 'password', role: 'admin' },
    { name: 'Admission Officer', email: 'officer@crm.com', password: 'password', role: 'officer' },
    { name: 'Management View',   email: 'mgmt@crm.com',    password: 'password', role: 'management' },
  ];

  console.log('Seeding users...');

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password = $3`,
      [user.name, user.email, hash, user.role]
    );
    console.log(`  ✓ ${user.role}: ${user.email}`);
  }

  console.log('\nDone! Login with password: "password" for all accounts.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
