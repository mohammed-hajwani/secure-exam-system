# Secure Online Examination System

A high-integrity, full-stack web platform built for secure online examinations featuring two-factor email OTP authentication, active client-side proctoring (tab-switch & fullscreen enforcement), server-authoritative timers, seeded Fisher–Yates shuffling of questions and answer options, rotating refresh tokens with theft detection, and database-enforced append-only audit logging.

---

## 🏗️ Architecture Stack

- **Frontend:** React.js (Vite), Tailwind CSS, Lucide Icons, React Router v6, Axios
- **Backend:** Node.js (Express.js REST API), Helmet, CORS, Rate Limiting, Zod
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Authentication & Security:** BCrypt (cost factor 12), SHA-256 Hashed 6-Digit Email OTP, Dual-token JWT (Access in memory, Refresh in `HttpOnly` cookie, rotated on every use with reuse detection), PostgreSQL trigger making the audit log append-only

---

## 📂 Project Structure

```text
secure-exam-system/
├── client/          # React (Vite) Single Page Application
├── server/          # Node.js + Express REST API + Prisma ORM
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Configure your DATABASE_URL and SMTP credentials in .env
npx prisma generate
npx prisma migrate dev --name init_schema
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
