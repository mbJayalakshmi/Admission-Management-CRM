# AdmitFlow — Admission Management CRM

> edumerge Assignment — Junior Software Developer
> Built with React + Node.js/Express + PostgreSQL

---

## Project Structure

```
admission-crm/
├── backend/
│   ├── config/
│   │   ├── db.js              # PostgreSQL pool connection
│   │   └── schema.sql         # Database schema + seed users
│   ├── middleware/
│   │   └── auth.js            # JWT verify + role guard
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login
│   │   ├── masters.js         # Institutions, Campuses, Departments
│   │   ├── programs.js        # Programs + Seat Matrix
│   │   ├── applicants.js      # Applicants + Document checklist
│   │   └── admissions.js      # Seat allocation, confirmation, dashboard
│   ├── server.js              # Express entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js           # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   ├── Layout.jsx         # App shell with sidebar
│   │   │   ├── Sidebar.jsx        # Role-aware navigation
│   │   │   ├── ProtectedRoute.jsx # Auth + role guard for routes
│   │   │   └── UI.jsx             # Reusable: Button, Card, Modal, Badge…
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state (login/logout)
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login screen
│   │   │   ├── Dashboard.jsx      # Stats + charts
│   │   │   ├── Institutions.jsx   # Master: institutions
│   │   │   ├── Campuses.jsx       # Master: campuses
│   │   │   ├── Departments.jsx    # Master: departments
│   │   │   ├── Programs.jsx       # Programs + quota setup
│   │   │   ├── SeatMatrix.jsx     # Per-program quota editor
│   │   │   ├── Applicants.jsx     # Applicant list + doc checklist
│   │   │   └── Allocate.jsx       # Seat locking + admission confirm
│   │   ├── App.jsx                # Router + protected routes
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
│
└── package.json                   # Root: concurrently dev script
```

---

## Prerequisites

- Node.js v18+
- PostgreSQL 14+

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/admission-crm.git
cd admission-crm
```

### 2. Set up PostgreSQL database

```sql
-- In psql or pgAdmin:
CREATE DATABASE admission_crm;
```

Then run the schema:

```bash
psql -U postgres -d admission_crm -f backend/config/schema.sql
```

### 3. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/admission_crm
JWT_SECRET=change_this_to_a_long_random_string
```

### 4. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Run database schema

```bash
psql -U postgres -d admission_crm -f backend/config/schema.sql
```

### 6. Seed default users

```bash
cd backend
npm run seed
```

This creates 3 demo users with bcrypt-hashed passwords.

### 7. Run the application

**Option A — run both together (from root):**

```bash
npm install        # installs concurrently
npm run dev
```

**Option B — run separately:**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm start
```

Frontend: http://localhost:3000
Backend API: http://localhost:5000/api

---

## Demo Login Credentials

| Role              | Email             | Password   |
|-------------------|-------------------|------------|
| Admin             | admin@crm.com     | password   |
| Admission Officer | officer@crm.com   | password   |
| Management (View) | mgmt@crm.com      | password   |

> **Note:** Change passwords in production by re-hashing with bcrypt.

---

## Features Implemented

### Master Setup (Admin only)
- Create Institutions with short codes (used in admission numbers)
- Create Campuses under institutions
- Create Departments under campuses
- Create Programs with course type, entry type, admission mode, academic year, and total intake

### Seat Matrix & Quota
- Per-program quota configuration: KCET / COMEDK / Management
- Validates: quota sum must equal total intake (enforced on both frontend and backend)
- Real-time filled/available counter per quota
- Blocks allocation when quota is full

### Applicant Management
- 15-field application form
- Per-applicant document checklist (7 standard documents: Pending → Submitted → Verified)
- Fee status management: Pending / Paid

### Seat Allocation
- **Government Flow**: Enter allotment number, select KCET/COMEDK quota, system checks availability, locks seat
- **Management Flow**: Select program + Management quota, check availability, allocate
- Race condition protection via `SELECT FOR UPDATE` in PostgreSQL
- Blocks allocation with clear error if quota is full

### Admission Confirmation
- Generates unique, immutable admission number
- Format: `KLEIT/2025/UG/CSE/KCET/0001`
- Confirmation only possible when: seat locked AND fee = Paid

### Dashboard (All roles)
- Total intake vs admitted
- Quota-wise bar chart (Recharts)
- Program-wise fill progress
- Fee pending list

### Roles
- **Admin**: Full access to all modules
- **Admission Officer**: Applicants + Allocation only
- **Management**: Dashboard only (read-only)

---

## Key System Rules (All Implemented)

1. Quota seats cannot exceed intake — validated on create and update
2. No seat allocation if quota full — blocked at API level with PostgreSQL row lock
3. Admission number generated only once — unique constraint in DB + code check
4. Admission confirmed only if fee paid — enforced in `/api/admissions/confirm`
5. Seat counters update in real time — live DB queries on every request

---

## AI Disclosure

This project was built with assistance from **Claude (Anthropic)**. AI was used for:
- Boilerplate code structure and file scaffolding
- SQL schema design suggestions
- React component structure

All business logic (quota validation, seat locking, admission number generation, role guards) was designed based on the BRS requirements and reviewed manually.
