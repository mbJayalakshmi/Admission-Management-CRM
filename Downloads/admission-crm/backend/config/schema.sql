-- ============================================================
-- Admission Management CRM - PostgreSQL Schema
-- Run this file once to initialize the database
-- ============================================================

-- Users (Roles: admin, officer, management)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'officer', 'management')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Institutions
CREATE TABLE IF NOT EXISTS institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Campuses
CREATE TABLE IF NOT EXISTS campuses (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  campus_id INTEGER REFERENCES campuses(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  course_type VARCHAR(10) NOT NULL CHECK (course_type IN ('UG', 'PG')),
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('Regular', 'Lateral')),
  admission_mode VARCHAR(20) NOT NULL CHECK (admission_mode IN ('Government', 'Management')),
  academic_year VARCHAR(10) NOT NULL,
  total_intake INTEGER NOT NULL CHECK (total_intake > 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seat Matrix (quota per program)
CREATE TABLE IF NOT EXISTS seat_matrix (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
  quota VARCHAR(30) NOT NULL CHECK (quota IN ('KCET', 'COMEDK', 'Management')),
  total_seats INTEGER NOT NULL DEFAULT 0,
  UNIQUE(program_id, quota)
);

-- Applicants
CREATE TABLE IF NOT EXISTS applicants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(10),
  category VARCHAR(10) NOT NULL CHECK (category IN ('GM', 'SC', 'ST', 'OBC', 'EWS')),
  entry_type VARCHAR(20) NOT NULL,
  quota VARCHAR(30) NOT NULL CHECK (quota IN ('KCET', 'COMEDK', 'Management')),
  program_id INTEGER REFERENCES programs(id),
  qualifying_marks NUMERIC(5,2),
  allotment_number VARCHAR(100),
  state VARCHAR(100),
  doc_status VARCHAR(20) DEFAULT 'Pending' CHECK (doc_status IN ('Pending', 'Submitted', 'Verified')),
  fee_status VARCHAR(20) DEFAULT 'Pending' CHECK (fee_status IN ('Pending', 'Paid')),
  seat_locked BOOLEAN DEFAULT FALSE,
  admission_number VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document Checklist per Applicant
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
  document_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Submitted', 'Verified')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Seed: Default Users
-- Passwords are bcrypt hashed → plain text below for reference
-- admin@crm.com     → Admin@123
-- officer@crm.com   → Officer@123
-- mgmt@crm.com      → Mgmt@123
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
  ('Super Admin',      'admin@crm.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
  ('Admission Officer','officer@crm.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'officer'),
  ('Management View',  'mgmt@crm.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'management')
ON CONFLICT (email) DO NOTHING;

-- NOTE: The hash above maps to "password" for all seed users.
-- Change these in production using: bcrypt.hash('yourpassword', 10)
