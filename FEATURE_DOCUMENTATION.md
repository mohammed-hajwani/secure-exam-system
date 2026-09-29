# ExamShield — Comprehensive System & Implementation Blueprint 🛡️

> **Platform Overview:** ExamShield is an enterprise-grade, highly resilient proctored examination platform designed for universities and certification bodies. It delivers a distraction-free examination experience for students, comprehensive question authoring and forensic evaluation tools for faculty, and governance controls for administrators.

---

## 📑 Table of Contents

1. [Architecture & System Design](#1-architecture--system-design)
2. [Authentication & Security Engine](#2-authentication--security-engine)
3. [Student Examination Experience](#3-student-examination-experience)
4. [Proctoring & Anti-Cheat Watchdog](#4-proctoring--anti-cheat-watchdog)
5. [Automatic Deadline Sweeper Daemon](#5-automatic-deadline-sweeper-daemon)
6. [Faculty Authoring & Evaluation Suite](#6-faculty-authoring--evaluation-suite)
7. [Administrator Governance & Audit Engine](#7-administrator-governance--audit-engine)
8. [Standalone Showcase Suite (`frontend-demo`)](#8-standalone-showcase-suite)
9. [Database Schema & Entity Relationships](#9-database-schema--entity-relationships)
10. [Engineering Implementation Matrix (Feature-by-Feature)](#10-engineering-implementation-matrix)

---

## 1. Architecture & System Design

ExamShield operates on a decoupled client-server architecture with an uncompromising zero-trust security perimeter.

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 18 + Vite + Tailwind)"]
        UI_Student["Student Portal (/student)"]
        UI_Faculty["Faculty Portal (/faculty)"]
        UI_Admin["Admin Portal (/admin)"]
        ProctorHook["useProctoring Watchdog"]
    end

    subgraph Server["Backend Layer (Express.js + Node.js)"]
        AuthMW["RBAC & Token Verifier"]
        ExamSvc["Exam & Deadline Engine"]
        Sweeper["30s Background Sweeper"]
        AuditSvc["Forensic Audit Logger"]
    end

    subgraph Database["Data Persistence (PostgreSQL + Prisma)"]
        DB_Users[("Users & Refresh Tokens")]
        DB_Exams[("Exams & Questions")]
        DB_Attempts[("Attempts & Answers")]
        DB_Logs[("System Audit Logs")]
    end

    Client -->|HTTPS + HttpOnly Cookies| AuthMW
    AuthMW --> ExamSvc
    ExamSvc --> DB_Attempts
    ExamSvc --> DB_Exams
    Sweeper -.->|Auto-finalizes expired attempts| DB_Attempts
    AuditSvc --> DB_Logs
```

### Technical Stack
* **Frontend:** React 18, Vite, React Router v6, Tailwind CSS (minimalist dark Zinc theme), Lucide Icons.
* **Backend:** Node.js, Express.js, Prisma ORM, Zod Schema Validation.
* **Database:** PostgreSQL with relational integrity, foreign keys, and unique composite constraints.
* **Security Standards:** HttpOnly/SameSite cookies, SHA-256 token hashing, BCrypt password hashing (12 rounds).

---

## 2. Authentication & Security Engine

### Feature Objective
Provide secure, non-forgeable, role-gated session management with two-factor authentication, ensuring complete immunity against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).

### Technical Implementation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React as React Client (AuthContext)
    participant API as Express API (/auth)
    participant DB as PostgreSQL (Prisma)

    User->>React: Enters Email & Password
    React->>API: POST /api/v1/auth/login
    API->>DB: Query User & verify BCrypt hash
    alt 2FA OTP Enabled
        API->>DB: Store hashed OTP (expires in 10m)
        API-->>React: 200 OK { requiresOtp: true, tempToken }
        User->>React: Enters 6-digit OTP code
        React->>API: POST /api/v1/auth/verify-otp { tempToken, otp }
        API->>DB: Verify OTP hash & mark isUsed = true
    end
    API->>DB: Save SHA-256 hashed Refresh Token
    API-->>React: Set-Cookie: refreshToken (HttpOnly, SameSite=Strict)<br/>Response: { accessToken (15m), user }
    React->>React: Store accessToken in JS memory only
```

#### 1. In-Memory Access Token + HttpOnly Refresh Token
* **Implementation:** 
  * Access tokens expire in 15 minutes and are kept **in memory** via React `AuthContext` state. They are never written to `localStorage` or `sessionStorage`.
  * Refresh tokens expire in 7 days and are set via `res.cookie('refreshToken', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/v1/auth' })`.
  * The database stores only the `SHA-256` hash of the refresh token (`prisma.refreshToken.create({ data: { tokenHash: sha256(token) } })`), ensuring database leaks do not expose reusable sessions.

#### 2. Axios Request & Response Interceptors (`services/api.js`)
* **Request Interceptor:** Automatically attaches `Authorization: Bearer <inMemoryToken>` to every outbound API request.
* **Response Interceptor:** Detects `401 Unauthorized` responses on protected routes, pauses queued requests using a promise lock (`isRefreshing`), calls `POST /auth/refresh`, updates the in-memory token, and transparently replays the original requests.

#### 3. Administrative Account Provisioning (No Public Registration)
* **Implementation:** The `/api/v1/auth/register` endpoint is intentionally hard-coded to return `403 Forbidden`:
  ```javascript
  // server/src/routes/authRoutes.js
  router.post('/register', (req, res) => {
    return res.status(403).json({
      success: false,
      error: 'Public registration is disabled. User accounts must be provisioned by the institutional administrator.'
    });
  });
  ```
* All users (`STUDENT`, `FACULTY`, `ADMIN`) must be provisioned through the Administrator Dashboard via `adminService.createUser`.

---

## 3. Student Examination Experience

### Feature Objective
Provide students with a focused, low-latency, resilient exam interface that prevents answer loss during network hiccups, eliminates cheating via DevTools inspection, and provides instant evaluation feedback.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Browser as Exam Player (Client)
    participant Server as Exam API (Server)
    participant Sweeper as Background Sweeper

    Student->>Browser: Opens Exam Briefing
    Browser->>Server: GET /exams/:id (Check eligibility)
    Server-->>Browser: Exam metadata (Questions HIDDEN)
    Student->>Browser: Agrees to terms & Enters Fullscreen
    Browser->>Server: POST /exams/:id/start
    Server-->>Browser: Sanitized questions (NO answer keys) + attemptId
    loop Exam Session
        Student->>Browser: Selects answer / Types text
        Browser->>Server: PATCH /attempts/:id/answer (Debounced auto-save)
        Server-->>Browser: 200 OK (Saved)
    end
    alt Student Submits On-Time
        Student->>Browser: Clicks "Submit Exam"
        Browser->>Server: POST /attempts/:id/submit
        Server-->>Browser: Final Objective Score + Results
    else Time Limit Reached (Client or Disconnected)
        Sweeper->>Server: Heartbeat detects deadline passed
        Server-->>Server: Auto-submits attempt as AUTO_SUBMITTED
    end
```

### Technical Implementation

#### 1. Zero-Leak Sanitization Engine (`examService.js -> startExam`)
* When an exam begins, questions are loaded from the database, but **all grading metadata is completely stripped** before serialization:
  ```javascript
  // Strips isCorrect so it cannot be inspected in Chrome DevTools Network Tab
  const sanitizedQuestions = attempt.exam.questions.map((eq, index) => ({
    id: eq.question.id,
    displayOrder: index + 1,
    subject: eq.question.subject,
    type: eq.question.type,
    text: eq.question.text,
    marks: eq.question.marks,
    options: eq.question.options.map(opt => ({
      id: opt.id,
      text: opt.text
      // isCorrect is EXCLUDED from payload!
    })),
    selectedOptionId: studentAnswerMap[eq.question.id]?.selectedOptionId || null,
    textAnswer: studentAnswerMap[eq.question.id]?.textAnswer || null
  }));
  ```

#### 2. Seeded Fisher-Yates Randomization
* **Implementation:** Questions and options are shuffled per student attempt using a deterministic Fisher-Yates shuffle algorithm. The student's pre-seeded question order is persisted in `StudentAnswer.displayOrder` (1 through N), ensuring that refreshing the browser maintains their personalized shuffled order while preventing adjacent students from copying answers.

#### 3. Real-Time Debounced Autosave (`ExamPlayer.jsx`)
* **Implementation:** Answer selections trigger local React state immediately for instantaneous UI responsiveness (`setAnswers(...)`).
* In the background, a debounced handler dispatches `PATCH /api/v1/exams/:examId/attempts/:attemptId/answer` after a 300ms idle window.
* A status pill transitions dynamically:
  * `[Saving...]` (amber pulse) during network flight.
  * `[All changes saved]` (emerald checkmark) on HTTP 200 confirmation.
* If a network error occurs, answers remain cached in local component state and retry upon reconnection.

#### 4. Monospace Countdown Timer Backed by Server Clock
* **Implementation:** The client timer does not run on arbitrary client clocks. Upon starting, the server returns `remainingSeconds = Math.max(0, Math.floor((effectiveDeadline - Date.now()) / 1000))`.
* A client `setInterval` decrements `remainingSeconds` every 1000ms.
* When `remainingSeconds <= 0`, the client automatically locks input fields and fires the submission routine.

---

## 4. Proctoring & Anti-Cheat Watchdog

### Feature Objective
Enforce strict digital exam integrity directly within the student's browser without requiring invasive third-party kernel software or browser extensions.

```mermaid
flowchart TD
    subgraph BrowserWatchdog["Browser Proctoring Watchdog (useProctoring.js)"]
        FS_Event["fullscreenchange Event"]
        Tab_Event["visibilitychange / blur Events"]
        Debounce["2000ms Cooldown Gate"]
    end

    subgraph Violations["Violation Decision Engine"]
        Modal["Full-Screen Warning Modal"]
        Counter["Increment Local Counter"]
        API_Call["POST /violations (Telemetry)"]
    end

    subgraph ServerIntegrity["Server Integrity & Enforcement"]
        AtomicInc["Prisma atomic: violationCount + 1"]
        CheckMax{"violationCount >= maxViolations?"}
        AutoTerm["Update status: AUTO_SUBMITTED<br/>isFlagged: true"]
        AuditTrail["Log to AuditLog Table"]
    end

    FS_Event --> Debounce
    Tab_Event --> Debounce
    Debounce --> Modal
    Debounce --> Counter
    Counter --> API_Call
    API_Call --> AtomicInc
    AtomicInc --> AuditTrail
    AtomicInc --> CheckMax
    CheckMax -- Yes --> AutoTerm
    CheckMax -- No --> Continue["Keep Exam In Progress"]
```

### Technical Implementation

#### 1. Browser Event Listeners (`useProctoring.js`)
* **Fullscreen Exit:** Attached to `document.addEventListener('fullscreenchange', ...)`:
  * If `!document.fullscreenElement`, the student has escaped fullscreen mode.
* **Tab / Window Switch:** Attached to `document.addEventListener('visibilitychange', ...)` and `window.addEventListener('blur', ...)`:
  * Triggers when the tab is hidden (`document.hidden === true`) or when focus shifts to another desktop application (e.g., Discord, ChatGPT, IDE).
* **Debounce Gate:** A 2000ms timestamp cooldown (`Date.now() - lastViolationTime < 2000`) prevents multiple alerts triggered by a single OS notification or momentary window resize.

#### 2. Atomic Server-Side Violation Counter (`examService.js -> recordViolation`)
* To prevent race conditions from concurrent rapid events, the backend uses PostgreSQL atomic increments:
  ```javascript
  const updatedAttempt = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      violationCount: { increment: 1 } // Atomic database-level increment
    }
  });

  // If threshold exceeded, terminate immediately
  if (updatedAttempt.violationCount >= exam.maxViolations) {
    return executeExamSubmission(attemptId, 'AUTO_SUBMITTED', true);
  }
  ```

#### 3. Forensic Audit Trail Attribution
* Every violation generates an immutable row in the `AuditLog` table containing:
  * `userId`: Authenticated student ID
  * `attemptId`: Current exam session ID
  * `eventType`: `TAB_SWITCH` or `FULLSCREEN_EXIT`
  * `details`: Human-readable context and elapsed duration
  * `ipAddress`: Client IPv4/IPv6 address
  * `timestamp`: Precise UTC timestamp

---

## 5. Automatic Deadline Sweeper Daemon

### Feature Objective
Guarantee that no student can ever submit an exam past the hard deadline, even if they disconnect their internet, close their browser, freeze their laptop clock, or abandon the session.

### Technical Implementation

```mermaid
sequenceDiagram
    autonumber
    participant Daemon as 30s Sweeper Daemon (server.js)
    participant ExamSvc as Exam Service (autoSubmitExpiredAttempts)
    participant DB as PostgreSQL (Prisma)
    participant Grade as Auto-Grading Engine

    loop Every 30 Seconds
        Daemon->>ExamSvc: Trigger Sweeper Tick
        ExamSvc->>DB: Query attempts WHERE status = 'IN_PROGRESS'
        loop For Each Active Attempt
            ExamSvc->>ExamSvc: Calculate effectiveDeadline = min(startedAt + duration, exam.endTime)
            alt Current Time > (effectiveDeadline + 5s Grace)
                ExamSvc->>Grade: Compute objective score for answered questions
                ExamSvc->>DB: UPDATE ExamAttempt SET status = 'AUTO_SUBMITTED', submittedAt = NOW()
                ExamSvc->>DB: INSERT into AuditLog (eventType: 'EXAM_AUTO_SUBMITTED')
                ExamSvc-->>Daemon: Log auto-finalization summary
            end
        end
    end
```

#### 1. Background Sweeper Setup (`server.js`)
* Initialized upon Express server boot with an unref'd recurring interval:
  ```javascript
  // server/src/server.js
  const SWEEPER_INTERVAL_MS = 30 * 1000; // 30 seconds
  setInterval(async () => {
    try {
      await autoSubmitExpiredAttempts();
    } catch (err) {
      console.error('Sweeper error:', err);
    }
  }, SWEEPER_INTERVAL_MS);
  ```

#### 2. Deadline Math & Grace Buffer (`examService.js`)
* The exact deadline is computed mathematically:
  ```javascript
  const effectiveDeadline = Math.min(
    attempt.startedAt.getTime() + attempt.exam.durationMinutes * 60 * 1000,
    attempt.exam.endTime.getTime()
  );
  const GRACE_BUFFER_MS = 5000; // 5 seconds for network latency
  
  if (Date.now() > effectiveDeadline + GRACE_BUFFER_MS) {
    // Force auto-submission & grading
    await executeExamSubmission(attempt.id, 'AUTO_SUBMITTED', attempt.isFlagged);
  }
  ```

#### 3. Strict Enforcement in Manual Submissions (`submitExam`)
* If a student's client sends a manual `POST /submit` past the deadline, the server overrides the requested status and records it as `AUTO_SUBMITTED` with an audit notice, ensuring late submissions cannot be disguised as on-time.

---

## 6. Faculty Authoring & Evaluation Suite

### Feature Objective
Empower instructors with complete control over question design, assessment scheduling, and forensic evaluation with side-by-side question-key comparisons.

### Technical Implementation

#### 1. Question Bank Authoring (`/faculty/questions`)
* **Model Schema:** Questions support `MCQ`, `TRUE_FALSE`, and `SHORT_ANSWER`.
* **Live Student Preview Mode:** The authoring modal includes a real-time reactive preview pane. As the instructor types question text, options, and selects correct keys, the right-hand panel renders the exact student-facing component using the same CSS classes and typography.
* **Validation:** Enforces at least 2 options for MCQs, exactly 1 correct answer, non-empty prompts, and positive marks attribution via Zod schema (`createQuestionSchema`).

#### 2. Three-Step Assessment Wizard (`/faculty/exams`)
* **Step 1 (Metadata):** Title, subject, target batch (e.g. `CS-2026-A`), duration (minutes), max violations.
* **Step 2 (Scheduling):** Start and end datetime-local pickers. Validates that `startTime < endTime`.
* **Step 3 (Question Selector):** Displays the question bank with live mark summation:
  $$\text{Total Marks} = \sum_{i=1}^{n} \text{marks}(Q_i)$$
* **Publishing Lock:** Publishing an exam (`PATCH /exams/:id/publish`) changes status to `PUBLISHED`, locking the question set and activating visibility for the assigned student cohort.

#### 3. Submissions Dashboard (`/faculty/exams/:id/submissions`)
* Queries all attempts for the exam including student profiles:
  ```javascript
  const attempts = await prisma.examAttempt.findMany({
    where: { examId },
    include: {
      student: { select: { id: true, name: true, email: true, batch: true } }
    },
    orderBy: { startedAt: 'desc' }
  });
  ```
* Displays class performance metrics: Total Candidates, Evaluated Count, Flagged Violations Count, and Average Score.

#### 4. Candidate Audit Inspector Modal (`AttemptInspectorModal.jsx`)
* **Split Question Comparison:**
  * Iterates over `StudentAnswer` records linked to `Attempt`.
  * For each question, displays:
    * The question prompt and marks available.
    * The student's selected option highlighted in Green (if correct) or Red (if incorrect).
    * The instructor's official correct answer key.
    * Points awarded for that question.
* **Forensic Event Trail:** Displays all rows from `AuditLog` linked to `attemptId`, sorted chronologically, showing exact timestamps of tab switches, fullscreen escapes, and IP addresses.

---

## 7. Administrator Governance & Audit Engine

### Feature Objective
Provide institutional administrators with total governance over accounts, security policies, and an immutable trail of all platform activities.

### Technical Implementation

#### 1. User Management & Session Revocation (`/admin/users`)
* **Account Creation:** Provision accounts with specific roles (`STUDENT`, `FACULTY`, `ADMIN`) and batch tags.
* **Status Toggling:** When an admin toggles an account from active to deactivated:
  ```javascript
  // server/src/services/adminService.js
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isActive } }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } })
  ]);
  ```
  Revoking the refresh tokens ensures the user is ejected from active sessions immediately upon their next token refresh cycle.
* **Self-Deactivation Guard:** Frontend and backend reject deactivation requests if `targetUserId === currentAdminId`.

#### 2. System Audit Log Explorer (`/admin/audit-logs`)
* **Centralized Security Stream:** High-speed queries with pagination (`limit`, `offset`) and event type filtering:
  * `LOGIN_SUCCESS` / `LOGIN_FAILURE`
  * `2FA_VERIFIED`
  * `EXAM_CREATED` / `EXAM_PUBLISHED` / `EXAM_DELETED`
  * `VIOLATION_RECORDED`
  * `EXAM_SUBMITTED` / `EXAM_AUTO_SUBMITTED`
  * `USER_CREATED` / `USER_STATUS_TOGGLED`
* **JSON Details Viewer:** Expandable accordion view parsing `details` payloads to display forensic event metadata.

---

## 8. Standalone Showcase Suite (`frontend-demo`)

### Feature Objective
Allow instantaneous demonstration, UI review, and stakeholder presentations without requiring backend services, PostgreSQL, or SMTP configurations.

### Technical Implementation

#### 1. In-Memory Mock API Adapter (`frontend-demo/src/services/api.js`)
* Replaces the Axios network transport with an in-memory stateful router.
* Simulates natural network latency (120ms) using `setTimeout`.
* Implements full state persistence in `localStorage`:
  * Submitting an exam updates the attempt state.
  * Adding a question in the Question Bank adds it to the mock store.
  * Toggling a user's active status updates the User Directory.

#### 2. Top Showcase Navigator (`DemoBar.jsx`)
* **Instant Role Switcher:** Modifies the mock user session in `AuthContext` with a single click, instantly switching between `STUDENT`, `FACULTY`, and `ADMIN`.
* **Jump to Page Dropdown:** Direct programmatic routing to any screen across all three portals.
* **Hide Bar:** Collapses into a minimal floating bubble in the bottom corner for clean, presentation-ready screenshots.
* **Reset Data:** Flushes `localStorage` and restores pre-seeded sample data (`mockData.js`).

---

## 9. Database Schema & Entity Relationships

```mermaid
erDiagram
    User ||--o{ ExamAttempt : "submits"
    User ||--o{ Exam : "authors"
    User ||--o{ Question : "creates"
    User ||--o{ RefreshToken : "holds"
    User ||--o{ OtpCode : "receives"
    User ||--o{ AuditLog : "triggers"

    Exam ||--o{ ExamQuestion : "contains"
    Question ||--o{ ExamQuestion : "included in"
    Question ||--o{ Option : "has"

    Exam ||--o{ ExamAttempt : "undergoes"
    ExamAttempt ||--o{ StudentAnswer : "records"
    Question ||--o{ StudentAnswer : "answers"
    Option ||--o{ StudentAnswer : "selects"
    ExamAttempt ||--o{ AuditLog : "generates violations in"
```

### Relational Table Definitions (Prisma)

| Table | Primary Key | Key Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- |
| **`User`** | `id` (UUID) | - | User identities, BCrypt hashes, roles, batch cohorts |
| **`RefreshToken`**| `id` (UUID) | `userId` → `User.id` | SHA-256 hashed 7-day refresh tokens |
| **`OtpCode`** | `id` (UUID) | `userId` → `User.id` | Hashed 6-digit 2FA codes with 10-minute expiry |
| **`Exam`** | `id` (UUID) | `createdById` → `User.id` | Assessment schedule, duration, batch, max violations |
| **`Question`** | `id` (UUID) | `createdBy` → `User.id` | Question bank items, formats, point weights |
| **`Option`** | `id` (UUID) | `questionId` → `Question.id` | Multiple-choice options with `isCorrect` flags |
| **`ExamQuestion`**| Composite (`examId`, `questionId`) | `examId`, `questionId` | Many-to-many join table between Exams and Questions |
| **`ExamAttempt`** | `id` (UUID) | `examId`, `studentId` | Attempt sessions, scores, status, violation counter |
| **`StudentAnswer`**| `id` (UUID) | `attemptId`, `questionId` | Student selections, text answers, display order |
| **`AuditLog`** | `id` (UUID) | `userId`, `attemptId` | Forensic event logs, IP addresses, incident timestamps |

---

## 10. Engineering Implementation Matrix

This matrix provides a technical reference detailing how every major feature is implemented across the stack:

| Feature | Frontend Implementation | Backend API & Service | Database Mechanism | Security & Integrity Control |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & 2FA** | `Login.jsx`, `AuthContext.jsx` with in-memory token state | `POST /auth/login`<br/>`POST /auth/verify-otp`<br/>`authService.js` | `User`, `OtpCode`, `RefreshToken` | Access tokens in JS memory only; refresh token in `HttpOnly, SameSite=Strict` cookie |
| **Public Registration Block** | N/A (Admin only) | `POST /auth/register`<br/>Returns explicit `403 Forbidden` | N/A | Fails closed; prevents unauthorized account creation |
| **Student Dashboard** | `StudentDashboard.jsx` with tabs for Available, Upcoming, Completed | `GET /exams`<br/>`examService.listExams` | `Exam` filtered by `targetBatch = user.batch` | Cohort isolation; students cannot see exams outside their batch |
| **Pre-Flight Briefing** | `ExamBriefing.jsx` with resolution and Fullscreen API checks | `GET /exams/:id`<br/>`examService.getExamById` | `Exam` joined with `createdById` | Questions remain completely hidden until explicit exam start |
| **Live Exam Player** | `ExamPlayer.jsx` with question palette grid and hotkeys | `POST /exams/:id/start`<br/>`examService.startExam` | `ExamAttempt`, `StudentAnswer` | Payload strips all `isCorrect` keys; Fisher-Yates per-attempt question shuffling |
| **Debounced Autosave** | `ExamPlayer.jsx` with 300ms debounce buffer | `PATCH /attempts/:id/answer`<br/>`examService.saveAnswer` | `StudentAnswer` upsert on `(attemptId, questionId)` | Checks attempt status is `IN_PROGRESS` and deadline has not expired |
| **Anti-Cheat Watchdog** | `useProctoring.js` (`fullscreenchange`, `visibilitychange`, `blur`) | `POST /violations`<br/>`examService.recordViolation` | Atomic update: `violationCount: { increment: 1 }` | Auto-submits exam when `violationCount >= maxViolations`; logs client IP |
| **Automatic Deadline Sweeper** | N/A (Server background daemon) | `setInterval` in `server.js` calling `autoSubmitExpiredAttempts` | `ExamAttempt` status update to `AUTO_SUBMITTED` | Auto-finalizes expired attempts every 30s even if student is disconnected |
| **Exam Scorecard** | `ExamResult.jsx` with score breakdown & integrity badge | `GET /exams/:id/my-attempt`<br/>`examService.getMyAttempt` | `ExamAttempt` joined with `Exam` | IDOR prevention: verifies attempt belongs to authenticated student |
| **Question Bank Authoring** | `QuestionBank.jsx` with Live Student Preview pane | `POST /questions`<br/>`PATCH /questions/:id`<br/>`questionService.js` | `Question` joined with `Option` records | Zod validation ensures at least 2 options for MCQ and exactly 1 correct key |
| **3-Step Assessment Builder** | `ExamManager.jsx` wizard with live point tallying | `POST /exams`<br/>`PATCH /exams/:id/publish`<br/>`examService.createExam` | `Exam`, `ExamQuestion` join table | Publishing locks exam questions and enables student cohort access |
| **Class Submissions Review** | `ExamSubmissions.jsx` candidate table with metrics | `GET /exams/:id/attempts`<br/>`examService.getExamSubmissions` | `ExamAttempt` joined with `student` | Restricted to `FACULTY` author or `ADMIN` role |
| **Candidate Audit Inspector** | `AttemptInspectorModal.jsx` side-by-side comparison | `GET /attempts/:id`<br/>`examService.getAttemptDetails` | `StudentAnswer`, `Option`, `AuditLog` | Displays student selection vs official key and proctoring forensic logs |
| **User Management** | `UserManagement.jsx` with live status toggling | `GET /admin/users`<br/>`PATCH /users/:id/status`<br/>`adminService.js` | `User.isActive` update; revokes `RefreshToken` | Self-deactivation guard; revoking refresh tokens kills active sessions |
| **Audit Log Explorer** | `AuditLogExplorer.jsx` with event category filtering | `GET /admin/audit-logs`<br/>`adminService.getAuditLogs` | `AuditLog` table with IP, timestamp, details | Immutable forensic log of all critical platform and proctoring incidents |
| **Standalone Showcase** | `frontend-demo/` with `DemoBar.jsx` role switcher | In-memory mock adapter (`services/api.js`) | `localStorage` state persistence | 100% decoupled from backend; runs on port 5174 for clean presentations |
