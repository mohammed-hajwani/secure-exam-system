---
version: 1
slug: "client-src"
primary_target: "client/src"
related_targets: []
---

# ExamShield web app (all screens) + public landing page

Scope: every client route (login + 2FA, student dashboard, exam briefing, exam player, result, profile, faculty question bank / exam manager / submissions + attempt inspector, admin users / audit log) in Operate mode, plus a new public landing page (`/`) in Persuade mode with a browser-only practice exam (no account, nothing stored).

Audience and job: students sitting high-stakes exams on laptops and phones (priority); faculty authoring and reviewing; admins governing accounts and the audit trail. Landing visitors are institutions evaluating trust.

Constraints: preserve all behaviour and security (2FA, session handling, proctoring rules, autosave queue). No invented customers, stats or certifications. Proctoring copy only names implemented detections (tab switch, fullscreen exit, window focus loss). Avoid: childish, cold-corporate, dark/hacker, anything busy on the exam screen.

Chosen direction: The Exam Noticeboard (seed 8f86d011, assigned, first hand). Memorable moment: your own row on the timetable swiped with highlighter.

Unresolved: phone equivalent of the fullscreen rule on iPhone Safari (see PRODUCT.md).

## Direction contract

THESIS: Every exam lives on a printed exam timetable and your own row is the one highlighted. Refuses the category's illustrated purple SaaS dashboard and the old near-black console.

OWN-WORLD: Felt-green board (#2F6B4F family) as the shell bar and landing ground; work happens on white printed sheets with navy-black ink (#14213D). Status is coloured paper stock with a printed word, never colour alone: canary = Upcoming, mint = Open, sky = Submitted, salmon = Flagged / Auto-submitted, plain white = Draft. Fluorescent highlighter (#E3F24C) is reserved for you/now: your next exam row, current question, selected option, focus. Type: Archivo condensed caps for timetable heads and notice titles, Atkinson Hyperlegible Next for all reading, tabular figures with units for every quantity. States are printed marks: struck through = spent, outlined = pending, filled = chosen. Square-ish sheets (small radius), real paper shadow, pins and tilt only on the landing page and empty states.

STORY: Students see exactly what is due, when, and the rules, then sit the exam calmly knowing time, saves and violations at a glance. Institutions see integrity proven by real interface fragments.

FIRST VIEWPORT: Student home = felt-green top bar (ExamShield wordmark, nav, profile) over a white timetable sheet: columns Day / Time / Paper / Length / Status; the next exam row carries a hand-swiped highlighter band and its Start button at row end; a narrow pinned "Rules" notice beside it (violation limit, autosave). Landing = felt board, headline set as a printed notice, live practice-exam sheet pinned beside it with Start practice as the primary action; below, integrity notices each pinned next to the real UI fragment proving it.

FORM: Grounded candidate 6 of 7 (exam timetable on the corridor noticeboard); seed key 8f86d011. Raises: claim pinned beside live proof (Claim and Proof); fixed state vocabulary (transit); one question per phone screen with thumb-reach nav (vertical feed); highlighter reserved for you/now (orienteering); tabular quantities with units (exposure record); printed-mark states (centre rail). Signature interaction: highlighter swipe (clip-path wipe) marking your row / current question.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
