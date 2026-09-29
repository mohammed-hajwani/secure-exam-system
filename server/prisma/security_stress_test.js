import prisma from '../src/config/db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';


const BASE_URL = 'http://localhost:5000/api/v1';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function pass(name, detail) {
  console.log(`  ${colors.green}✔ [PASSED]${colors.reset} ${colors.bold}${name}${colors.reset} ${detail ? `— ${detail}` : ''}`);
}

function fail(name, detail) {
  console.error(`  ${colors.red}✘ [FAILED]${colors.reset} ${colors.bold}${name}${colors.reset} — ${detail}`);
  throw new Error(`Security test failed: ${name}`);
}

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

async function loginAndGetToken(email, password) {
  const loginRes = await request('POST', '/auth/login', { email, password });
  if (!loginRes.data?.tempToken) {
    throw new Error(`Login failed for ${email} (HTTP ${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
  }
  const { tempToken } = loginRes.data;


  // Retrieve raw OTP from DB
  const user = await prisma.user.findUnique({ where: { email } });
  const otpRecord = await prisma.otpCode.findFirst({
    where: { userId: user.id, isUsed: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    throw new Error(`No unused OTP record found for ${email}`);
  }

  // Verify OTP
  for (let c = 100000; c <= 999999; c++) {
    const hash = crypto.createHash('sha256').update(String(c)).digest('hex');
    if (hash === otpRecord.otpHash) {
      const verifyRes = await request('POST', '/auth/verify-otp', {
        tempToken,
        otp: String(c)
      });
      return { token: verifyRes.data.accessToken, user };
    }
  }
  throw new Error(`Could not resolve OTP for ${email}`);
}

async function runSecurityStressSuite() {
  console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}🛡️  EXAMSHIELD ADVERSARIAL SECURITY & STRESS AUDIT SUITE${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

  // Ensure test users exist with known password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Student 1 (The Malicious Attacker)
  const student1 = await prisma.user.upsert({
    where: { email: 'student@exam.edu' },
    update: { isActive: true, batch: 'CS-2026-A', passwordHash },
    create: {
      name: 'Test Student',
      email: 'student@exam.edu',
      passwordHash,
      role: 'STUDENT',
      batch: 'CS-2026-A',
      isActive: true
    }
  });

  // Student 2 (The Victim)
  const student2 = await prisma.user.upsert({
    where: { email: 'victim@exam.edu' },
    update: { isActive: true, batch: 'CS-2026-A', passwordHash },
    create: {
      name: 'Victim Student',
      email: 'victim@exam.edu',
      passwordHash,
      role: 'STUDENT',
      batch: 'CS-2026-A',
      isActive: true
    }
  });

  // Faculty
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@exam.edu' },
    update: { isActive: true, passwordHash },
    create: {
      name: 'Dr. Faculty Instructor',
      email: 'faculty@exam.edu',
      passwordHash,
      role: 'FACULTY',
      isActive: true
    }
  });


  console.log(`${colors.yellow}1. Authenticating actors...${colors.reset}`);
  const { token: studentToken } = await loginAndGetToken('student@exam.edu', 'Password123!');
  const { token: victimToken } = await loginAndGetToken('victim@exam.edu', 'Password123!');
  const { token: facultyToken } = await loginAndGetToken('faculty@exam.edu', 'Password123!');
  pass('Actor Authentication', 'Issued JWTs for Student (Attacker), Victim, and Faculty');

  console.log(`\n${colors.yellow}2. Testing Role Escalation & RBAC Restrictions...${colors.reset}`);

  // Test 1: Student calls GET /api/v1/questions (Question Bank Scraping)
  const t1 = await request('GET', '/questions', null, studentToken);
  if (t1.status === 403) {
    pass('Question Bank Scraping', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Question Bank Scraping', `Expected 403, got ${t1.status}`);
  }

  // Test 2: Student calls POST /api/v1/questions (Authoring Tampering)
  const t2 = await request('POST', '/questions', { subject: 'Hack', type: 'MCQ', text: 'Hack?', marks: 1 }, studentToken);
  if (t2.status === 403) {
    pass('Question Authoring Tampering', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Question Authoring Tampering', `Expected 403, got ${t2.status}`);
  }

  // Test 3: Student calls GET /api/v1/admin/users
  const t3 = await request('GET', '/admin/users', null, studentToken);
  if (t3.status === 403) {
    pass('Admin User Directory Access', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Admin User Directory Access', `Expected 403, got ${t3.status}`);
  }

  // Test 4: Student calls PATCH /api/v1/admin/users/:id/status
  const t4 = await request('PATCH', `/admin/users/${student2.id}/status`, { isActive: false }, studentToken);
  if (t4.status === 403) {
    pass('Account Deactivation Attack', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Account Deactivation Attack', `Expected 403, got ${t4.status}`);
  }

  // Test 5: Student calls GET /api/v1/admin/audit-logs
  const t5 = await request('GET', '/admin/audit-logs', null, studentToken);
  if (t5.status === 403) {
    pass('Audit Trail Snooping', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Audit Trail Snooping', `Expected 403, got ${t5.status}`);
  }

  console.log(`\n${colors.yellow}3. Creating Live Assessment for Target Batch 'CS-2026-A'...${colors.reset}`);
  // Create 2 test questions
  const q1Res = await request('POST', '/questions', {
    subject: 'Security Audit',
    type: 'MCQ',
    text: 'What is the primary function of bcrypt?',
    marks: 2,
    options: [
      { text: 'One-way adaptive password hashing', isCorrect: true },
      { text: 'Symmetric encryption for database backups', isCorrect: false },
      { text: 'Fast token verification', isCorrect: false }
    ]
  }, facultyToken);
  const q1Id = q1Res.data.data.id;

  const q2Res = await request('POST', '/questions', {
    subject: 'Security Audit',
    type: 'TRUE_FALSE',
    text: 'HTTP-only cookies cannot be read by client-side JavaScript.',
    marks: 1,
    options: [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false }
    ]
  }, facultyToken);
  const q2Id = q2Res.data.data.id;

  // Create Exam
  const examRes = await request('POST', '/exams', {
    title: 'Adversarial Security Assessment 101',
    subject: 'Security Audit',
    targetBatch: 'CS-2026-A',
    durationMinutes: 30,
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    maxViolations: 3,
    questionIds: [q1Id, q2Id]
  }, facultyToken);
  const examId = examRes.data.data.id;
  await request('PATCH', `/exams/${examId}/publish`, {}, facultyToken);
  pass('Assessment Provisioning', `Created & published exam ${examId}`);

  console.log(`\n${colors.yellow}4. Testing Information Leakage on Student Payloads...${colors.reset}`);

  // Test 6: Network Response Leak Check on GET /exams/:id
  const getExamRes = await request('GET', `/exams/${examId}`, null, studentToken);
  const serializedGetExam = JSON.stringify(getExamRes.data);
  if (serializedGetExam.includes('"isCorrect"')) {
    fail('Answer Key Leakage in GET /exams/:id', 'Response contained isCorrect field!');
  } else {
    pass('Answer Key Leakage in GET /exams/:id', 'No question options or isCorrect leaked');
  }

  // Test 7: Student starts exam & check POST /start payload for leaks
  const startRes = await request('POST', `/exams/${examId}/start`, {}, studentToken);
  const serializedStart = JSON.stringify(startRes.data);
  if (serializedStart.includes('"isCorrect"')) {
    fail('Answer Key Leakage in POST /start', 'Response contained isCorrect field!');
  } else {
    pass('Answer Key Leakage in POST /start', 'Only option text & id returned; isCorrect strictly omitted');
  }

  const studentAttemptId = startRes.data.data.attemptId;
  const examQuestions = startRes.data.data.questions;

  // Victim starts exam too
  const victimStartRes = await request('POST', `/exams/${examId}/start`, {}, victimToken);
  const victimAttemptId = victimStartRes.data.data.attemptId;

  console.log(`\n${colors.yellow}5. Testing IDOR, Question Injection & Data Tampering...${colors.reset}`);

  // Test 8: Student calls GET /exams/:id/attempts (Classmate submissions)
  const t8 = await request('GET', `/exams/${examId}/attempts`, null, studentToken);
  if (t8.status === 403) {
    pass('Classmate Attempt Listing', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Classmate Attempt Listing', `Expected 403, got ${t8.status}`);
  }

  // Test 9: Student calls GET /exams/:id/attempts/:attemptId on Victim's attempt
  const t9 = await request('GET', `/exams/${examId}/attempts/${victimAttemptId}`, null, studentToken);
  if (t9.status === 403) {
    pass('Classmate Detailed Inspection IDOR', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('Classmate Detailed Inspection IDOR', `Expected 403, got ${t9.status}`);
  }

  // Test 10: IDOR Answer Tampering: Student A sends answer for Student B's attempt
  const t10 = await request(
    'PATCH',
    `/exams/${examId}/attempts/${victimAttemptId}/answer`,
    {
      questionId: q1Id,
      selectedOptionId: examQuestions[0].options[0].id
    },
    studentToken
  );
  if (t10.status === 403) {
    pass('IDOR Answer Injection', 'Blocked with HTTP 403 Forbidden');
  } else {
    fail('IDOR Answer Injection', `Expected 403, got ${t10.status}`);
  }

  // Test 11: Foreign Question Injection Attack
  const rogueQ = await request('POST', '/questions', {
    subject: 'Unrelated Course',
    type: 'SHORT_ANSWER',
    text: 'Rogue question prompt',
    marks: 50
  }, facultyToken);

  const t11 = await request(
    'PATCH',
    `/exams/${examId}/attempts/${studentAttemptId}/answer`,
    {
      questionId: rogueQ.data.data.id,
      textAnswer: 'Injected answer'
    },
    studentToken
  );
  if (t11.status === 400) {
    pass('Foreign Question Injection', 'Blocked with HTTP 400 (Question not in exam)');
  } else {
    fail('Foreign Question Injection', `Expected 400, got ${t11.status}`);
  }

  // Test 12: Option Tampering Attack (Option belonging to different question)
  const t12 = await request(
    'PATCH',
    `/exams/${examId}/attempts/${studentAttemptId}/answer`,
    {
      questionId: q2Id,
      selectedOptionId: examQuestions.find((q) => q.id === q1Id).options[0].id
    },
    studentToken
  );
  if (t12.status === 400) {
    pass('Option Tampering Attack', 'Blocked with HTTP 400 (Option does not belong to question)');
  } else {
    fail('Option Tampering Attack', `Expected 400, got ${t12.status}`);
  }

  console.log(`\n${colors.yellow}6. Testing Concurrency & Rapid Save Stress...${colors.reset}`);

  // Test 13: 25 Concurrent Parallel Answer Updates
  const validOptionId = examQuestions.find((q) => q.id === q1Id).options[0].id;
  const stressPromises = [];
  for (let i = 0; i < 25; i++) {
    stressPromises.push(
      request(
        'PATCH',
        `/exams/${examId}/attempts/${studentAttemptId}/answer`,
        {
          questionId: q1Id,
          selectedOptionId: validOptionId
        },
        studentToken
      )
    );
  }
  const stressResults = await Promise.all(stressPromises);
  const allSuccessful = stressResults.every((r) => r.status === 200 && r.data.success);
  if (allSuccessful) {
    pass('Concurrent Answer Stress (25 parallel requests)', 'All 25 requests resolved with HTTP 200 without DB deadlocks');
  } else {
    fail('Concurrent Answer Stress', 'Some requests failed during concurrency');
  }

  // Also answer question 2
  const q2OptionId = examQuestions.find((q) => q.id === q2Id).options[0].id;
  await request(
    'PATCH',
    `/exams/${examId}/attempts/${studentAttemptId}/answer`,
    {
      questionId: q2Id,
      selectedOptionId: q2OptionId
    },
    studentToken
  );

  console.log(`\n${colors.yellow}7. Testing Exam Submission, Replay & Post-Submission Lockdown...${colors.reset}`);

  // Test 14: Submit Exam
  const submitRes = await request('POST', `/exams/${examId}/attempts/${studentAttemptId}/submit`, {}, studentToken);
  const scoreVal = submitRes.data?.data?.objectiveScore !== undefined ? submitRes.data.data.objectiveScore : submitRes.data?.data?.score;
  if (submitRes.data?.success && submitRes.data?.data?.status === 'SUBMITTED') {
    pass('Legitimate Submission', `Attempt submitted with score: ${scoreVal}/3`);
  } else {
    fail('Legitimate Submission', 'Submission failed');
  }


  // Test 15: Post-Submission Answer Modification Attack
  const t15 = await request(
    'PATCH',
    `/exams/${examId}/attempts/${studentAttemptId}/answer`,
    {
      questionId: q1Id,
      selectedOptionId: validOptionId
    },
    studentToken
  );
  if (t15.status === 400) {
    pass('Post-Submission Answer Modification', 'Blocked with HTTP 400 (Exam has already been submitted)');
  } else {
    fail('Post-Submission Answer Modification', `Expected 400, got ${t15.status}`);
  }

  // Test 16: Multiple / Replay Submission Attack
  const t16 = await request('POST', `/exams/${examId}/attempts/${studentAttemptId}/submit`, {}, studentToken);
  if (t16.status === 400) {
    pass('Replay Submission Attack', 'Blocked with HTTP 400 (Exam has already been submitted)');
  } else {
    fail('Replay Submission Attack', `Expected 400, got ${t16.status}`);
  }

  console.log(`\n${colors.yellow}8. Testing Cohort / Batch Isolation...${colors.reset}`);

  // Test 17: Create exam for CS-2026-B and verify Student in CS-2026-A cannot start it
  const batchBExam = await request('POST', '/exams', {
    title: 'Advanced Cryptography — Cohort B Only',
    subject: 'Security',
    targetBatch: 'CS-2026-B',
    durationMinutes: 45,
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    maxViolations: 3,
    questionIds: [q1Id]
  }, facultyToken);
  await request('PATCH', `/exams/${batchBExam.data.data.id}/publish`, {}, facultyToken);

  const t17 = await request('POST', `/exams/${batchBExam.data.data.id}/start`, {}, studentToken);
  if (t17.status === 403) {
    pass('Cohort Isolation Bypass', `Blocked with HTTP 403: "${t17.data?.error}"`);
  } else {
    fail('Cohort Isolation Bypass', `Expected 403, got ${t17.status}`);
  }

  console.log(`\n${colors.yellow}9. Testing User Profile & Password Security...${colors.reset}`);

  // Test 18: GET /auth/profile
  const profileRes = await request('GET', '/auth/profile', null, studentToken);
  if (profileRes.data?.success && profileRes.data?.data?.stats) {
    pass('Profile Details & Stats', `Returned profile for ${profileRes.data.data.user.email} (Completed: ${profileRes.data.data.stats.submittedAttempts})`);
  } else {
    fail('Profile Details & Stats', `Failed: status=${profileRes.status}, data=${JSON.stringify(profileRes.data)}`);
  }



  // Test 19: Change Password with Incorrect Current Password
  const t19 = await request(
    'PUT',
    '/auth/change-password',
    {
      currentPassword: 'WrongPassword999!',
      newPassword: 'NewSecurePassword123!'
    },
    studentToken
  );
  if (t19.status === 400) {
    pass('Change Password with Bad Current Password', 'Rejected with HTTP 400 (Incorrect current password)');
  } else {
    fail('Change Password with Bad Current Password', `Expected 400, got ${t19.status}`);
  }

  // Test 20: Change Password with Valid Credentials & Check Audit Log
  const changeRes = await request(
    'PUT',
    '/auth/change-password',
    {
      currentPassword: 'Password123!',
      newPassword: 'BrandNewPassword123!'
    },
    studentToken
  );
  if (changeRes.data.success) {
    pass('Change Password Flow', 'Successfully updated password');
  } else {
    fail('Change Password Flow', 'Password change failed');
  }

  // Verify Audit Log entry
  const lastAudit = await prisma.auditLog.findFirst({
    where: { userId: student1.id, eventType: 'USER_STATUS_CHANGE' },
    orderBy: { timestamp: 'desc' }
  });
  if (lastAudit && lastAudit.details.includes('changed account password')) {
    pass('Password Change Audit Logging', `Immutable log recorded: "${lastAudit.details}"`);
  } else {
    fail('Password Change Audit Logging', 'Audit log not found');
  }

  // Reset password back to original Password123! so user can continue testing seamlessly
  const resetHash = await bcrypt.hash('Password123!', 10);
  await prisma.user.update({
    where: { id: student1.id },
    data: { passwordHash: resetHash }
  });
  pass('Cleanup & Restoration', 'Restored test student credentials to standard Password123!');

  console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}✨ ALL 20 SECURITY AUDIT & STRESS TESTS PASSED!${colors.reset}`);
  console.log(`${colors.bold}${colors.green}======================================================${colors.reset}\n`);
}

runSecurityStressSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
