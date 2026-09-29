import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api/v1';

async function verifyFlow() {
  console.log('🚀 Starting Comprehensive End-to-End System Verification...\n');

  // Helper for fetching
  const post = async (url, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  const get = async (url, token) => {
    const res = await fetch(`${API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  const patch = async (url, body, token) => {
    const res = await fetch(`${API_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  // Helper to authenticate with 2FA
  const authenticateUser = async (email, password) => {
    console.log(`🔑 Step: Authenticating ${email}...`);
    const loginRes = await post('/auth/login', { email, password });
    if (!loginRes.data.success) {
      throw new Error(`Login failed: ${loginRes.data.error}`);
    }

    let token = loginRes.data.accessToken;
    if (loginRes.data.requiresOtp) {
      console.log(`   2FA OTP required. Retrieving OTP code for ${email}...`);
      const user = await prisma.user.findUnique({ where: { email } });
      const otpRecord = await prisma.otpCode.findFirst({
        where: { userId: user.id, isUsed: false },
        orderBy: { createdAt: 'desc' }
      });

      const testCode = '123456';
      const otpHash = crypto.createHash('sha256').update(testCode).digest('hex');
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { otpHash }
      });


      const verifyRes = await post('/auth/verify-otp', {
        tempToken: loginRes.data.tempToken,
        otp: testCode
      });

      if (!verifyRes.data.success) {
        throw new Error(`OTP Verification failed: ${verifyRes.data.error}`);
      }
      token = verifyRes.data.accessToken;
    }

    console.log(`✅ Authentication successful for ${email}!`);
    return token;
  };


  // ==========================================
  // 1. FACULTY FLOW
  // ==========================================
  console.log('\n--- 👨‍🏫 PHASE 1: FACULTY PORTAL ACTIONS ---');
  const facultyToken = await authenticateUser('faculty@exam.edu', 'Faculty123!');


  // Create Question 1 (MCQ)
  console.log('📝 Creating Question 1 (MCQ in Question Bank)...');
  const q1Res = await post('/questions', {
    subject: 'Computer Networks',
    type: 'MCQ',
    marks: 2.0,
    text: 'Which transport layer protocol provides reliable, connection-oriented data transfer?',
    options: [
      { text: 'UDP', isCorrect: false },
      { text: 'TCP', isCorrect: true },
      { text: 'ICMP', isCorrect: false },
      { text: 'IP', isCorrect: false }
    ]
  }, facultyToken);

  if (!q1Res.data.success) throw new Error(`Q1 creation failed: ${q1Res.data.error}`);
  const q1 = q1Res.data.data;
  console.log(`   Created Q1 (ID: ${q1.id}, Marks: ${q1.marks})`);

  // Create Question 2 (True/False)
  console.log('📝 Creating Question 2 (True/False in Question Bank)...');
  const q2Res = await post('/questions', {
    subject: 'Computer Networks',
    type: 'TRUE_FALSE',
    marks: 1.0,
    text: 'HTTP is a stateless protocol by default.',
    options: [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false }
    ]
  }, facultyToken);

  if (!q2Res.data.success) throw new Error(`Q2 creation failed: ${q2Res.data.error}`);
  const q2 = q2Res.data.data;
  console.log(`   Created Q2 (ID: ${q2.id}, Marks: ${q2.marks})`);

  // Create Exam
  console.log('📋 Creating Assessment for Batch CS-2026-A...');
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // Started 10 mins ago (active)
  const endTime = new Date(now.getTime() + 120 * 60 * 1000).toISOString(); // Closes in 2 hours

  const examRes = await post('/exams', {
    title: 'Verification Assessment: Networks Midterm',
    subject: 'Computer Networks',
    targetBatch: 'CS-2026-A',
    durationMinutes: 45,
    maxViolations: 3,
    startTime,
    endTime,
    questionIds: [q1.id, q2.id]
  }, facultyToken);

  if (!examRes.data.success) throw new Error(`Exam creation failed: ${examRes.data.error}`);
  const exam = examRes.data.data;
  console.log(`   Created Exam: "${exam.title}" (ID: ${exam.id})`);

  // Publish Exam
  console.log('🌐 Publishing Exam for student enrollment...');
  const publishRes = await patch(`/exams/${exam.id}/publish`, {}, facultyToken);
  if (!publishRes.data.success) throw new Error(`Publish failed: ${publishRes.data.error}`);
  console.log('✅ Exam successfully published!');

  // ==========================================
  // 2. STUDENT FLOW
  // ==========================================
  console.log('\n--- 🎓 PHASE 2: STUDENT PORTAL ACTIONS ---');
  const studentToken = await authenticateUser('student@exam.edu', 'Student123!');


  // List student exams
  console.log('🔍 Student fetching available examinations...');
  const studentExamsRes = await get('/exams', studentToken);
  const foundExam = studentExamsRes.data.data.find(e => e.id === exam.id);
  if (!foundExam) throw new Error('Student cannot see the published exam for their batch!');
  console.log(`   Found Exam in catalog: "${foundExam.title}" (${foundExam.questionCount} Questions)`);

  // Start exam
  console.log('🚀 Student starting proctored examination attempt...');
  const startRes = await post(`/exams/${exam.id}/start`, {}, studentToken);
  if (!startRes.data.success) throw new Error(`Exam start failed: ${startRes.data.error}`);
  const attempt = startRes.data.data;
  console.log(`   Attempt Started (ID: ${attempt.attemptId}, Remaining: ${attempt.remainingSeconds}s)`);
  console.log(`   Questions received: ${attempt.questions.length}`);

  // Find correct options to answer
  const studentQuestions = attempt.questions;
  const q1InExam = studentQuestions.find(q => q.id === q1.id);
  const q2InExam = studentQuestions.find(q => q.id === q2.id);

  // For Q1, answer correctly (TCP)
  const q1CorrectOpt = q1.options.find(o => o.text === 'TCP');
  console.log('✍️  Student answering Question 1 (TCP)...');
  const ans1Res = await patch(
    `/exams/${exam.id}/attempts/${attempt.attemptId}/answer`,
    {
      questionId: q1.id,
      selectedOptionId: q1CorrectOpt.id
    },
    studentToken
  );
  if (!ans1Res.data.success) throw new Error(`Answer 1 save failed: ${ans1Res.data.error}`);
  console.log('   Q1 Answer auto-saved.');

  // For Q2, answer correctly (True)
  const q2CorrectOpt = q2.options.find(o => o.text === 'True');
  console.log('✍️  Student answering Question 2 (True)...');
  const ans2Res = await patch(
    `/exams/${exam.id}/attempts/${attempt.attemptId}/answer`,
    {
      questionId: q2.id,
      selectedOptionId: q2CorrectOpt.id
    },
    studentToken
  );
  if (!ans2Res.data.success) throw new Error(`Answer 2 save failed: ${ans2Res.data.error}`);
  console.log('   Q2 Answer auto-saved.');

  // Simulate Proctoring Violation
  console.log('⚠️  Simulating Anti-Cheat Violation (Student switched tabs)...');
  const violationRes = await post(
    `/exams/${exam.id}/attempts/${attempt.attemptId}/violation`,
    {
      type: 'TAB_SWITCH',
      details: { reason: 'Browser visibilitychange triggered document.hidden = true' }
    },
    studentToken
  );
  if (!violationRes.data.success) throw new Error(`Violation report failed: ${violationRes.data.error}`);
  console.log(`   Violation logged! New violation count: ${violationRes.data.data.violationCount}`);

  // Submit Exam
  console.log('🏁 Student submitting examination...');
  const submitRes = await post(
    `/exams/${exam.id}/attempts/${attempt.attemptId}/submit`,
    {},
    studentToken
  );
  if (!submitRes.data.success) throw new Error(`Submission failed: ${submitRes.data.error}`);
  console.log(`   Exam successfully submitted! Auto-graded Score: ${submitRes.data.data.score}`);

  // Fetch Student Results
  console.log('📊 Student retrieving final result card...');
  const resultRes = await get(`/exams/${exam.id}/my-attempt`, studentToken);
  const myAttempt = resultRes.data.data.attempt;
  console.log(`   Final Score: ${myAttempt.score} / ${myAttempt.totalMarks}`);
  console.log(`   Status: ${myAttempt.status}`);
  console.log(`   Proctoring Violations Logged: ${myAttempt.violationCount}`);
  console.log(`   Flagged Status: ${myAttempt.isFlagged ? 'FLAGGED' : 'CLEAN'}`);

  // ==========================================
  // 3. FACULTY MONITORING & AUDIT VERIFICATION
  // ==========================================
  console.log('\n--- 🕵️‍♂️ PHASE 3: FACULTY MONITORING & AUDIT INSPECTION ---');

  // List all attempts
  console.log('📈 Faculty fetching live submissions dashboard...');
  const attemptsRes = await get(`/exams/${exam.id}/attempts`, facultyToken);
  const stats = attemptsRes.data.data.stats;
  const submissions = attemptsRes.data.data.attempts;
  console.log(`   Total Attempts: ${stats.totalAttempts}, Submitted: ${stats.submittedCount}`);
  console.log(`   Class Average: ${stats.averageScore} / ${attemptsRes.data.data.exam.totalMarks}`);

  const studentSubmission = submissions.find(s => s.id === attempt.attemptId);
  if (!studentSubmission) throw new Error('Faculty could not see student submission!');
  console.log(`   Found Student Row: ${studentSubmission.student.name} (${studentSubmission.student.email}), Score: ${studentSubmission.score}, Violations: ${studentSubmission.violationCount}`);

  // Deep inspect student attempt
  console.log('🔬 Faculty deeply inspecting student answers and audit log trail...');
  const inspectRes = await get(`/exams/${exam.id}/attempts/${attempt.attemptId}`, facultyToken);
  const inspection = inspectRes.data.data;

  console.log(`   Answers evaluated: ${inspection.answers.length}`);
  inspection.answers.forEach((ans, idx) => {
    console.log(`     Q${idx + 1}: ${ans.type} | Correct: ${ans.isCorrect} | Marks: +${ans.marksAwarded}/${ans.marks}`);
  });

  console.log(`   Proctoring Audit Trail Logs: ${inspection.auditLogs.length} events:`);
  inspection.auditLogs.forEach(log => {
    console.log(`     - [${log.eventType}] ${log.details} at ${log.timestamp}`);
  });

  console.log('\n🎉 ALL STUDENT & FACULTY FLOWS VERIFIED SUCCESSFULLY WITH ZERO ERRORS!\n');
}

verifyFlow()
  .catch(err => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
