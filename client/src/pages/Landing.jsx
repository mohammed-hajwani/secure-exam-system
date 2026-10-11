import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Clock, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Wordmark } from '../components/layout/Navbar';
import { Stamp, cx } from '../components/ui';
import OptionList from '../components/exam/OptionList';
import { PRACTICE_EXAM } from '../data/practiceExam';

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const LinkButton = ({ to, variant = 'ink', children, className }) => (
  <Link
    to={to}
    className={cx(
      'inline-flex min-h-12 items-center justify-center gap-2 rounded-[5px] px-5 text-base font-semibold',
      'transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.96]',
      variant === 'ink' && 'bg-ink text-white hover:bg-[#0c1529]',
      variant === 'paper' && 'border border-paper-rule bg-paper text-ink hover:border-ink-faint',
      variant === 'onBoard' && 'bg-paper text-ink hover:bg-paper-tint',
      className
    )}
  >
    {children}
  </Link>
);

const PAPER = {
  canary: 'bg-stock-canary',
  salmon: 'bg-stock-salmon',
  white: 'bg-paper'
};

// A claim, pinned as a notice
const Notice = ({ paper = 'white', tilt = 0, title, children }) => (
  <div
    className={cx('relative rounded-[2px] px-6 pb-6 pt-7 text-ink shadow-pinned', PAPER[paper])}
    style={{ transform: `rotate(${tilt}deg)` }}
  >
    <span className="pin" aria-hidden="true" />
    <h3 className="display text-[2rem] sm:text-[2.3rem]">{title}</h3>
    <p className="mt-3 text-[16px] leading-snug text-ink-soft">{children}</p>
  </div>
);

// The interface fragment that proves the claim
const Proof = ({ children, caption }) => (
  <figure className="sheet relative overflow-hidden">
    <span className="caps absolute right-3 top-3 rounded-[3px] bg-paper-tint px-1.5 py-1 text-[10px] text-ink-faint">Example</span>
    <div className="px-5 pb-5 pt-9 sm:px-6">{children}</div>
    {caption && <figcaption className="border-t border-paper-line bg-paper-tint px-5 py-3 text-sm text-ink-soft sm:px-6">{caption}</figcaption>}
  </figure>
);

const Code = ({ children }) => (
  <pre className="overflow-x-auto rounded-[4px] bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-[#E6EBF5]">{children}</pre>
);

/* ------------------------------------------------------------------ */
/* Proof fragments                                                     */
/* ------------------------------------------------------------------ */

const ClockProof = () => (
  <Proof caption="The browser only displays the clock. The deadline is checked by the server on every save and at submission.">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-paper-line px-4 py-3">
      <div>
        <div className="font-bold text-ink">Midterm: Data Structures</div>
        <div className="num text-sm text-ink-faint">12 of 20 answered</div>
      </div>
      <div className="num flex items-center gap-1.5 text-ink">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span className="text-[1.7rem] font-bold leading-none">41:07</span>
        <span className="text-sm font-semibold">left</span>
      </div>
    </div>
    <ol className="num mt-4 space-y-2 text-[15px]">
      <li className="flex items-center justify-between rule-b pb-2">
        <span className="text-ink-soft">10:18:40 · page refreshed</span>
        <span className="font-bold text-ink">41:09 left</span>
      </li>
      <li className="flex items-center justify-between">
        <span className="text-ink-soft">10:18:42 · back on the paper</span>
        <span className="font-bold text-ink">41:07 left</span>
      </li>
    </ol>
  </Proof>
);

const KeyProof = () => (
  <Proof caption="What a student's browser receives when the exam starts. The answer key stays on the server, so there is nothing to find in developer tools.">
    <Code>
      {`{
  "text": "Which structure gives O(1) lookup?",
  "options": [
    { "id": "a91f…", "text": "Linked list" },
    { "id": "3c07…", "text": "Hash table" },
    { "id": "e5d2…", "text": "Binary tree" }
  ]
}`}
    </Code>
    <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
      <span className="rounded-[3px] bg-stock-salmon px-1.5 py-0.5 font-mono text-[13px] text-stock-salmon-ink line-through">"isCorrect": true</span>
      never leaves the server
    </p>
  </Proof>
);

const ShuffleProof = () => {
  const rows = [
    { who: 'Aisha', qs: [3, 1, 4, 2], opts: 'B · D · A · C' },
    { who: 'Ben', qs: [2, 4, 1, 3], opts: 'C · A · D · B' },
    { who: 'Chen', qs: [4, 2, 3, 1], opts: 'A · C · B · D' }
  ];
  return (
    <Proof caption="Seeded per student, so a refresh brings back the same order while neighbours see a different paper.">
      <table className="w-full text-left">
        <thead>
          <tr className="caps border-b-2 border-ink text-[12px] text-ink-faint">
            <th scope="col" className="pb-2 font-bold">Student</th>
            <th scope="col" className="pb-2 font-bold">Question order</th>
            <th scope="col" className="pb-2 font-bold">Q1 options</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.who} className="rule-b last:border-b-0">
              <td className="py-2.5 font-bold text-ink">{r.who}</td>
              <td className="py-2.5">
                <span className="flex gap-1">
                  {r.qs.map((n) => (
                    <span key={n} className="num flex h-7 w-7 items-center justify-center rounded-[3px] border border-paper-rule text-sm font-bold text-ink">
                      {n}
                    </span>
                  ))}
                </span>
              </td>
              <td className="caps py-2.5 text-[13px] text-ink-soft">{r.opts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Proof>
  );
};

const RecordProof = () => (
  <Proof caption="Each event is written with the time and IP address. At the paper's limit it submits itself and is flagged for the instructor.">
    <ol className="relative ml-2 border-l-2 border-paper-rule pl-5">
      {[
        ['10:42:07', 'Left the exam tab', 'Tab hidden for 6 s'],
        ['10:44:51', 'Exited fullscreen', 'Escape pressed'],
        ['10:51:13', 'Window lost focus', 'Another app came forward']
      ].map(([t, label, d]) => (
        <li key={t} className="relative pb-4 last:pb-0">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-paper bg-alarm" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-sm font-bold text-ink">{t}</span>
            <Stamp status="ALERT">{label}</Stamp>
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">{d}</p>
        </li>
      ))}
    </ol>
    <div className="mt-4 flex items-center gap-2">
      <Stamp status="FLAGGED">3 of 3 · submitted and flagged</Stamp>
    </div>
  </Proof>
);

const SaveProof = () => (
  <Proof caption="Answers save one question at a time, newest first. A lost connection retries on its own, and submitting waits until everything is saved.">
    <ul className="space-y-2.5 text-[15px]">
      <li className="flex items-center justify-between rounded-[4px] border border-paper-line px-3 py-2.5">
        <span className="text-ink">Q4 · Hash table</span>
        <span className="flex items-center gap-1.5 text-stock-mint-ink">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved
        </span>
      </li>
      <li className="flex items-center justify-between rounded-[4px] border border-paper-line px-3 py-2.5">
        <span className="text-ink">Q5 · “A queue removes the oldest…”</span>
        <span className="flex items-center gap-1.5 text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
        </span>
      </li>
      <li className="flex items-center justify-between rounded-[4px] border border-stock-canary-ink/30 bg-stock-canary/40 px-3 py-2.5">
        <span className="text-ink">Q6 · True</span>
        <span className="font-bold text-stock-canary-ink">Not saved yet, retrying…</span>
      </li>
    </ul>
  </Proof>
);

const LedgerProof = () => (
  <Proof caption="Enforced by the database itself, not just the app: entries can be added and read, never edited or deleted.">
    <div className="rounded-[4px] border border-paper-line">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <span className="num text-sm font-bold text-ink">09:12:44</span>
        <Stamp status="ALERT">Stolen session blocked</Stamp>
        <span className="text-sm text-ink-soft">all sessions ended</span>
      </div>
    </div>
    <div className="mt-3">
      <Code>{`UPDATE "AuditLog" SET details = '…'
→ ERROR: AuditLog is append-only:
  UPDATE is not permitted`}</Code>
    </div>
  </Proof>
);

/* ------------------------------------------------------------------ */
/* Live practice question in the first viewport                       */
/* ------------------------------------------------------------------ */

const LivePracticeSheet = () => {
  const q = PRACTICE_EXAM.questions[0];
  const [picked, setPicked] = useState(null);
  return (
    <div className="sheet relative rotate-[0.7deg] shadow-pinned">
      <span className="pin" aria-hidden="true" />
      <div className="flex items-center justify-between border-b border-paper-line px-5 pb-3 pt-6">
        <span className="font-bold text-ink">Practice paper</span>
        <span className="num flex items-center gap-1.5 text-ink">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span className="text-xl font-bold">03:00</span>
        </span>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-baseline gap-2">
          <span className="display num text-[2.2rem] text-ink">Q1</span>
          <span className="num text-sm text-ink-faint">of {PRACTICE_EXAM.questions.length}</span>
        </div>
        <p id="hero-q" className="mt-2 text-[17px] font-semibold leading-snug text-ink">
          {q.text}
        </p>
        <div className="mt-4">
          <OptionList options={q.options} selectedId={picked} onSelect={setPicked} labelledBy="hero-q" size="sm" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-line bg-paper-tint px-5 py-3.5">
        <span className={cx('flex items-center gap-1.5 text-sm', picked ? 'text-stock-mint-ink' : 'text-ink-faint')} aria-live="polite">
          {picked ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Answer kept. Try the full paper.
            </>
          ) : (
            'Pick an answer to try it'
          )}
        </span>
        <LinkButton to="/practice" variant="ink" className="min-h-11 px-4 text-[15px]">
          Continue the paper
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const GUARANTEES = [
  {
    paper: 'canary',
    title: 'The clock belongs to the server',
    body: 'Refreshing, switching devices or changing the computer clock never buys a minute. When time is up, saved answers are submitted.',
    proof: <ClockProof />
  },
  {
    paper: 'white',
    title: 'The answer key never reaches the browser',
    body: 'Questions arrive without their answers, and marking happens on the server the moment a paper is submitted.',
    proof: <KeyProof />
  },
  {
    paper: 'white',
    title: 'Every student sits a different paper',
    body: 'Question order and multiple-choice options are shuffled per student, so the person beside you is never on the same page.',
    proof: <ShuffleProof />
  },
  {
    paper: 'salmon',
    title: 'Leaving the exam is on the record',
    body: 'Switching tabs or leaving the window is recorded on laptops and phones alike, and so is exiting fullscreen wherever the device supports it. The instructor sets the limit.',
    proof: <RecordProof />
  },
  {
    paper: 'canary',
    title: 'Bad Wi-Fi does not stop answers saving',
    body: 'Every answer saves as the student goes. If the connection drops, saving keeps retrying, and the Submit button waits until every answer is saved.',
    proof: <SaveProof />
  },
  {
    paper: 'white',
    title: 'History cannot be rewritten',
    body: 'Sign-ins need a one-time code from email, stolen sessions are detected and shut down, and every event lands in an append-only log.',
    proof: <LedgerProof />
  }
];

const ROLES = [
  {
    who: 'Students',
    before: 'See every exam on one timetable, with its rules.',
    during: 'Answer one question at a time, with time, saves and violations always in view.',
    after: 'Get the score the moment they submit.'
  },
  {
    who: 'Faculty',
    before: 'Write questions once, build exams for a batch, publish when ready.',
    during: 'See each attempt as soon as a student begins.',
    after: 'Inspect every answer and the full proctoring record of any attempt.'
  },
  {
    who: 'Administrators',
    before: 'Create every account. There is no public sign-up.',
    during: 'Deactivate an account and its sessions end within minutes.',
    after: 'Read the append-only audit log of the whole institution.'
  }
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="felt min-h-screen text-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark to="/" />
        <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
          <a href="#guarantees" className="hidden min-h-11 items-center px-3 text-[15px] font-semibold text-board-ink hover:text-white md:inline-flex">
            Guarantees
          </a>
          <a href="#roles" className="hidden min-h-11 items-center px-3 text-[15px] font-semibold text-board-ink hover:text-white md:inline-flex">
            Who it is for
          </a>
          {user ? (
            <LinkButton to="/dashboard" variant="onBoard" className="min-h-10 px-4 text-[15px]">
              Open my workspace
            </LinkButton>
          ) : (
            <LinkButton to="/login" variant="onBoard" className="min-h-10 px-4 text-[15px]">
              Sign in
            </LinkButton>
          )}
        </nav>
      </header>

      <main>
        {/* First viewport: the notice and a live practice paper */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-14">
          <div className="sheet relative rotate-[-0.6deg] px-7 pb-8 pt-10 text-ink shadow-pinned sm:px-10">
            <span className="pin" aria-hidden="true" />
            <h1 className="display text-[3.6rem] sm:text-[5rem] lg:text-[5.6rem]">
              Online exams that hold up
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-snug text-ink-soft">
              ExamShield gives students a calm, fair exam on a laptop or a phone, and gives institutions a record of exactly what happened in
              every attempt.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton to="/practice">
                Take the practice paper
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton to={user ? '/dashboard' : '/login'} variant="paper">
                {user ? 'Open my workspace' : 'Sign in'}
              </LinkButton>
            </div>
            <p className="mt-5 text-sm text-ink-faint">Accounts are created by your institution. The practice paper needs none.</p>
          </div>

          <div className="relative">
            <LivePracticeSheet />
            <div className="relative ml-auto mt-5 w-60 rotate-[-2deg] rounded-[2px] bg-stock-canary px-4 pb-3.5 pt-5 text-sm text-ink shadow-pinned sm:-mr-4">
              <span className="pin" aria-hidden="true" />
              Leave the tab during the practice paper and watch it get recorded.
            </div>
          </div>
        </section>

        {/* Guarantees: each claim pinned beside its proof */}
        <section id="guarantees" aria-labelledby="guarantees-title" className="border-t border-board-deep bg-paper-ground text-ink">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <h2 id="guarantees-title" className="display max-w-[16ch] text-[3rem] sm:text-[4rem]">
              Six things every exam can rely on
            </h2>
            <p className="mt-4 max-w-[60ch] text-lg text-ink-soft">
              Not promises in a brochure. Each one is enforced by the server or the database, and each is shown here the way it appears in the
              product.
            </p>

            <div className="mt-16 space-y-16 lg:space-y-24">
              {GUARANTEES.map((g, i) => (
                <div
                  key={g.title}
                  className={cx('grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14', i % 2 === 1 && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]')}
                >
                  <div className={cx(i % 2 === 1 && 'lg:order-2')}>
                    <Notice paper={g.paper} tilt={i % 2 === 0 ? -0.8 : 0.9} title={g.title}>
                      {g.body}
                    </Notice>
                  </div>
                  <div className={cx(i % 2 === 1 && 'lg:order-1')}>{g.proof}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it is for: set as a timetable */}
        <section id="roles" aria-labelledby="roles-title" className="bg-paper-ground pb-24 text-ink">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 id="roles-title" className="display text-[3rem] sm:text-[4rem]">
              One timetable, three desks
            </h2>
            <div className="sheet mt-10 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left">
                <thead>
                  <tr className="caps border-b-2 border-ink text-[13px] text-ink-faint">
                    <th scope="col" className="px-5 pb-3 pt-5 font-bold">Who</th>
                    <th scope="col" className="px-5 pb-3 pt-5 font-bold">Before the exam</th>
                    <th scope="col" className="px-5 pb-3 pt-5 font-bold">During</th>
                    <th scope="col" className="px-5 pb-3 pt-5 font-bold">After</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((r) => (
                    <tr key={r.who} className="rule-b align-top last:border-b-0">
                      <th scope="row" className="display px-5 py-5 text-[1.7rem] text-ink">
                        {r.who}
                      </th>
                      <td className="px-5 py-5 text-[15px] text-ink-soft">{r.before}</td>
                      <td className="px-5 py-5 text-[15px] text-ink-soft">{r.during}</td>
                      <td className="px-5 py-5 text-[15px] text-ink-soft">{r.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Close */}
        <section aria-labelledby="close-title" className="border-t border-board-deep">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <h2 id="close-title" className="display max-w-[20ch] text-[3rem] text-white sm:text-[4rem]">
              Sit the practice paper. It takes three minutes.
            </h2>
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/practice" variant="onBoard">
                Start practice paper
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
              <Link to={user ? '/dashboard' : '/login'} className="inline-flex min-h-12 items-center px-4 text-base font-semibold text-white underline">
                {user ? 'Open my workspace' : 'Sign in'}
              </Link>
            </div>
          </div>
          <footer className="border-t border-white/10">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-board-ink sm:px-6 lg:px-8">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" aria-hidden="true" />
                ExamShield · accounts by institution invitation only
              </span>
              <span>Practice paper runs only in your browser and stores nothing.</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
};

export default Landing;
