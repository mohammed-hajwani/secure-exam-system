# ExamShield: Secure Online Examination System

ExamShield is a full-stack platform for running online exams that institutions can trust. The server, not the student's browser, decides time, marks and penalties. Every sign-in uses a one-time email code, and every security-relevant event lands in an audit log that the database itself refuses to edit or delete.

- **Students** see their exams on a personal timetable and sit proctored exams on a laptop or a phone. Answers save automatically, and the score appears on submit.
- **Faculty** write a reusable question bank, schedule exams for a batch, publish them, and inspect every attempt with its full proctoring record.
- **Administrators** create every account (there is no public sign-up), deactivate accounts instantly, and read the append-only audit log.
- **Anyone** can try the no-account practice paper from the public landing page.

---

## Security features

| Area | What ExamShield does |
|---|---|
| Passwords | bcrypt with cost factor 12 (salted, deliberately slow) |
| Two-step sign-in | 6-digit email code from `crypto.randomInt`, stored only as a SHA-256 hash, single use, expires in 10 minutes |
| Sessions | 15-minute access token kept in memory only; refresh token in an `HttpOnly`, `Secure`, `SameSite` cookie, stored hashed |
| Stolen-token detection | Refresh tokens rotate on every use; replaying a retired token revokes every session for that user and is logged |
| Access control | Role checks on every route plus ownership checks on every record (no IDOR); students only see their batch's published exams |
| Answer key | `isCorrect` is stripped before questions leave the server; marking happens on the server |
| Exam timing | Server-owned deadline; late saves trigger auto-submit; a sweeper finalises expired attempts every 30 seconds |
| One attempt | Database unique constraint on (exam, student); replayed submissions are rejected |
| Shuffling | Seeded Fisher–Yates shuffle of question order and multiple-choice options per student, stable across refreshes |
| Proctoring | Tab switches, focus loss and fullscreen exits are reported, counted on the server and auto-submit the attempt at the exam's limit |
| Audit log | Append-only, enforced by PostgreSQL triggers that reject `UPDATE`, `DELETE` and `TRUNCATE` |
| API hardening | Helmet security headers, strict CORS, Zod validation of every request body, rate-limited sign-in (5 tries per 15 min per IP in production), Prisma parameterised queries |

Full details are in [FEATURE_DOCUMENTATION.md](FEATURE_DOCUMENTATION.md). The visual design system is in [DESIGN.md](DESIGN.md), and a 15-slide project presentation is in [docs/ExamShield_Presentation.pptx](docs/ExamShield_Presentation.pptx).

---

## Tech stack

- **Frontend:** React 18 (Vite), Tailwind CSS, React Router v6, Axios, lucide-react, self-hosted Archivo and Atkinson Hyperlegible Next fonts
- **Backend:** Node.js, Express, Helmet, CORS, express-rate-limit, Zod, jsonwebtoken, bcryptjs, Nodemailer
- **Database:** PostgreSQL with Prisma ORM

## Project structure

```text
secure-exam-system/
├── client/                 # React single-page app (port 5173)
│   └── src/
│       ├── components/     # Shared UI kit, layout, exam option list, attempt inspector
│       ├── pages/          # Landing, practice paper, login, student, faculty and admin screens
│       ├── hooks/          # useProctoring (browser proctoring signals)
│       └── services/       # Axios client with token refresh and session-expiry handling
├── server/                 # Express REST API (port 5000)
│   ├── prisma/             # Schema, migrations, seed scripts, security test suite
│   └── src/                # Routes, controllers, services, middleware, config
├── docs/                   # Project presentation
├── DESIGN.md               # Design system
├── FEATURE_DOCUMENTATION.md
└── README.md
```

---

## How to run it locally

### 1. Prerequisites

- **Node.js 18 or newer** (`node -v` to check)
- **PostgreSQL**, running locally (developed and tested with PostgreSQL 18)
- **Git**

### 2. Get the code

```bash
git clone https://github.com/mohammed-hajwani/secure-exam-system.git
```

```bash
cd secure-exam-system
```

### 3. Create the database

Open `psql` (or pgAdmin) as the `postgres` user and run:

```sql
CREATE DATABASE secure_exam_db;
```

### 4. Set up and start the API server

```bash
cd server
```

```bash
npm install
```

```bash
cp .env.example .env
```

Open `server/.env` and set:

- `DATABASE_URL`: replace the password (and user, if different) with your PostgreSQL credentials, e.g. `postgresql://postgres:YOUR_PASSWORD@localhost:5432/secure_exam_db?schema=public`
- `SMTP_USER` and `SMTP_PASS`: **leave both empty for local development.** Sign-in codes are then printed in the server console instead of emailed. To send real emails, use a Gmail address with an [app password](https://support.google.com/accounts/answer/185833).

Then create the tables, add the test accounts and start the server:

```bash
npx prisma migrate deploy
```

```bash
npx prisma generate
```

```bash
node prisma/seed_users.js
```

```bash
npm run dev
```

You should see `Connected to PostgreSQL database via Prisma` and `Secure Exam API server running on port 5000`. Leave this terminal open.

### 5. Set up and start the web app

In a **second terminal**, from the project root:

```bash
cd client
```

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Open **http://localhost:5173**.

> On Windows PowerShell, `cp` works as written. In Command Prompt use `copy .env.example .env`.

### 6. Sign in

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@exam.edu` | `AdminSecure123!` |
| Faculty | `faculty@exam.edu` | `Faculty123!` |
| Student | `student@exam.edu` | `Student123!` |

After the password, ExamShield asks for a **6-digit code**. With SMTP left empty, the code is printed in the **API server terminal** like this:

```text
🔐 [DEV 2FA OTP CODE] Recipient: student@exam.edu
🔑 Verification Code: 123456
```

These accounts are for local development only. Running `node prisma/seed_users.js` again resets them to the passwords above.

### 7. Try it out

1. Sign in as **faculty**, add a few questions in **Question bank**, then create an exam in **Exams** for batch `CS-2026-A` with a window that is open now, and press **Publish**.
2. Sign in as **student** (batch `CS-2026-A`): the exam appears highlighted on the timetable. Start it, answer, switch tabs once to see a violation recorded, then submit.
3. Sign in as **faculty** again, open **Submissions** for the exam and press **Inspect** to see the answers and the proctoring timeline.
4. Sign in as **admin** and open **Audit log** to see every sign-in and violation.

The practice paper at **http://localhost:5173/practice** needs no account and runs entirely in the browser.

---

## Running the security test suite

With the API server running on port 5000:

```bash
cd server
```

```bash
node prisma/security_stress_test.js
```

It signs in as several test users and attempts IDOR access, answer-key leakage, option tampering, replayed submissions, batch bypass, 25 concurrent saves and password changes. Every check should print `[PASSED]`.

> The suite ends by setting `student@exam.edu`'s password to `Password123!`. Run `node prisma/seed_users.js` afterwards to restore `Student123!`.

---

## Useful settings (`server/.env`)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | If you change it, also change `VITE_API_URL` in `client/.env` |
| `CLIENT_URL` | `http://localhost:5173` | Must match the web app's address exactly, or the browser blocks requests (CORS) |
| `OTP_ENABLED` | `true` | Set to `false` to skip the email code during local testing only |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_TEMP_SECRET` | development values | **Required** when `NODE_ENV=production`; the server refuses to start with the defaults |

## Troubleshooting

- **`Can't reach database server` / `P1001`:** PostgreSQL is not running, or `DATABASE_URL` has the wrong password or port.
- **`P1003: Database does not exist`:** run step 3 (`CREATE DATABASE secure_exam_db;`).
- **No 6-digit code appears:** look in the **API** terminal, not the web one. If SMTP credentials are filled in but wrong, the code is still printed there after the email fails.
- **Sign-in says "Too many authentication attempts":** wait 15 minutes, or keep `NODE_ENV=development`, which relaxes the limit.
- **`Port 5000 (or 5173) is already in use`:** stop the other process, or change the port as described above.
- **Fonts or styles look wrong after pulling new code:** run `npm install` in `client/` again.

---

## Known limitations

- Browser proctoring deters and records, but a determined user can bypass it; the hard guarantees (time, marks, attempts) come from the server.
- iPhone Safari does not allow websites to go fullscreen; tab-switch and focus checks still apply there.
- An access token stays valid for up to 15 minutes after an account is deactivated or its password changes.
- Code guessing is rate-limited per IP address, not per account.
