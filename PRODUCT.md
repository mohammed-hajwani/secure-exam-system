# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students (primary):** sit timed, proctored assessments set by their institution, usually under exam stress and time pressure. They also check upcoming exams and their results. They take exams on laptops **and phones**.
- **Faculty:** author question banks, build and schedule exams for a batch (cohort), publish them, review submissions, and inspect individual attempts with their proctoring timeline.
- **Administrators:** provision every account (there is no public sign-up), activate/deactivate users, and review the platform-wide audit log.

## Product Purpose

ExamShield lets institutions run online exams they can trust. Success means a student can take an exam calmly with no doubt that their answers are saved and their time is fair, and faculty/admins can show exactly what happened during any attempt.

## Positioning

Intended as a real product institutions (universities, colleges) would adopt, not a demo. Its differentiator is integrity enforced by the server rather than the browser: server-owned timer and grading, answer keys never sent to students, per-student question and option shuffling, rotating sessions with theft detection, and a database-enforced append-only audit trail.

## Operating Context

- Exams are scheduled per batch with a start/end window, a duration, and a maximum number of proctoring violations before automatic submission.
- Students: login → email one-time code (2FA) → dashboard → exam briefing → proctored exam (fullscreen, tab-switch and focus-loss detection, autosave) → result.
- Faculty and admins use the same app on desktop for authoring, review and governance.

## Capabilities and Constraints

- Stack: React 18 + Vite + Tailwind CSS (client), Express + Prisma + PostgreSQL (server). Icons: lucide-react.
- Roles: STUDENT, FACULTY, ADMIN. Question types: multiple choice, true/false, short answer.
- Proctoring must behave equivalently on laptops and phones (user requirement).
- **Open decision:** iPhone Safari does not support element fullscreen, so the fullscreen rule needs a phone-equivalent (e.g. rely on tab-switch/focus-loss detection there). Not yet decided.
- Detected violation types today: tab switch, fullscreen exit, window blur. Other listed types (devtools, faces, key combinations) are not implemented and must not be presented as features.
- All security behavior (auth, 2FA, session handling, proctoring rules, autosave guarantees) must be preserved by any UI change.

## Brand Commitments

- Name: **ExamShield** (no change requested).

## Evidence on Hand

- No customers, testimonials, institutions, usage statistics or certifications exist. None may be invented.
- Real artifacts: the codebase, FEATURE_DOCUMENTATION.md, and the security test suite (server/prisma/security_stress_test.js).

## Product Principles

1. **Calm under pressure:** the exam experience must lower stress, never add to it; time, progress and save state are always unambiguous.
2. **Trust is shown, not claimed:** surface concrete integrity facts (saved, recorded, verified) instead of marketing language.
3. **Fair and explicit rules:** students always know the rules and their current standing (time left, violations used) before and during an exam.
4. **Evidence for reviewers:** faculty and admins can reconstruct what happened in any attempt.
5. **Same rules everywhere:** a student on a phone faces the same integrity rules as one on a laptop.

## Accessibility & Inclusion

Students take high-stakes exams, so the exam flow must be fully usable by keyboard and screen reader and readable on small phone screens. No specific standard was named; WCAG 2.1 AA is the working target.
