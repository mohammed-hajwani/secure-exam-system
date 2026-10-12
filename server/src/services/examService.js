import prisma from '../config/db.js';

/**
 * Deterministic pseudo-random number generator for seeded shuffling
 */
function createSeededRng(seedString) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates question shuffle
 */
function shuffleArrayWithSeed(array, seedString) {
  const result = [...array];
  const rng = createSeededRng(seedString);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Student-facing options for a question, without isCorrect.
 * MCQ options are shuffled per student and question (stable across resumes);
 * True/False keeps its natural order. Options are sorted by id first because
 * the database does not guarantee row order, and the seeded shuffle needs a fixed input.
 */
function formatOptionsForStudent(question, seedPrefix) {
  const options = question.options.map((opt) => ({ id: opt.id, text: opt.text }));

  if (question.type !== 'MCQ') {
    return options;
  }

  options.sort((a, b) => a.id.localeCompare(b.id));
  return shuffleArrayWithSeed(options, `${seedPrefix}-${question.id}`);
}

/**
 * Shared helper function to auto-grade objective questions and finalize an exam attempt
 */
export const executeExamSubmission = async ({ attemptId, status = 'SUBMITTED', isFlagged = false }) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: {
            include: {
              question: {
                include: { options: true }
              }
            }
          }
        }
      },
      answers: true
    }
  });

  if (!attempt) {
    const error = new Error('Exam attempt not found');
    error.statusCode = 404;
    throw error;
  }

  let objectiveScore = 0.0;
  const answerMap = new Map();
  attempt.answers.forEach((ans) => {
    answerMap.set(ans.questionId, ans);
  });

  attempt.exam.questions.forEach((eq) => {
    const q = eq.question;
    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      const studentAns = answerMap.get(q.id);
      if (studentAns && studentAns.selectedOptionId) {
        const correctOption = q.options.find((opt) => opt.isCorrect);
        if (correctOption && correctOption.id === studentAns.selectedOptionId) {
          objectiveScore += q.marks;
        }
      }
    }
  });

  const now = new Date();
  const updatedAttempt = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status,
      submittedAt: now,
      score: objectiveScore,
      ...(isFlagged ? { isFlagged: true } : {})
    }
  });

  return {
    attemptId: updatedAttempt.id,
    status: updatedAttempt.status,
    submittedAt: updatedAttempt.submittedAt,
    objectiveScore
  };
};

/**
 * Lazy deadline check: if time has expired, immediately auto-submits and throws an error
 */
const checkAndHandleTimeExpired = async ({ attempt, userId, ipAddress }) => {
  if (attempt.status !== 'IN_PROGRESS') {
    return attempt;
  }

  const now = new Date();
  const attemptDeadline = new Date(new Date(attempt.startedAt).getTime() + attempt.exam.durationMinutes * 60 * 1000);
  const hardDeadline = new Date(attempt.exam.endTime);
  const effectiveDeadline = new Date(Math.min(attemptDeadline.getTime(), hardDeadline.getTime()));

  if (now > effectiveDeadline) {
    // 1. Auto-submit immediately using shared submission helper
    const result = await executeExamSubmission({ attemptId: attempt.id, status: 'AUTO_SUBMITTED' });

    // 2. Audit log the auto-submit event
    await prisma.auditLog.create({
      data: {
        userId,
        attemptId: attempt.id,
        eventType: 'AUTO_SUBMIT',
        details: JSON.stringify({ reason: 'Time expired (duration or window exceeded)', deadline: effectiveDeadline }),
        ipAddress: ipAddress || null
      }
    });

    const error = new Error('Time expired. Exam has been auto-submitted.');
    error.statusCode = 400;
    error.data = { autoSubmitted: true, status: 'AUTO_SUBMITTED', score: result.objectiveScore };
    throw error;
  }

  return attempt;
};

/**
 * Create a new exam linking selected Question IDs
 */
export const createExam = async ({
  title,
  subject,
  targetBatch,
  durationMinutes,
  startTime,
  endTime,
  maxViolations,
  questionIds,
  userId,
  role
}) => {
  const existingQuestions = await prisma.question.findMany({
    where: {
      id: { in: questionIds }
    }
  });

  if (existingQuestions.length !== questionIds.length) {
    const foundIds = existingQuestions.map((q) => q.id);
    const missingIds = questionIds.filter((id) => !foundIds.includes(id));
    const error = new Error(`Invalid question IDs provided: ${missingIds.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (role !== 'ADMIN') {
    const unauthorizedQuestions = existingQuestions.filter((q) => q.createdBy !== userId);
    if (unauthorizedQuestions.length > 0) {
      const error = new Error(
        `Unauthorized question IDs (not created by you): ${unauthorizedQuestions.map((q) => q.id).join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const newExam = await prisma.exam.create({
    data: {
      title: title.trim(),
      subject: subject.trim(),
      targetBatch: targetBatch.trim(),
      durationMinutes: Number(durationMinutes),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      maxViolations: maxViolations ? Number(maxViolations) : 3,
      createdById: userId,
      questions: {
        create: questionIds.map((questionId) => ({
          questionId
        }))
      }
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      questions: {
        include: {
          question: {
            include: {
              options: {
                select: {
                  id: true,
                  text: true,
                  isCorrect: true
                }
              }
            }
          }
        }
      }
    }
  });

  return newExam;
};

/**
 * List exams
 */
export const listExams = async ({ userId, role, batch }) => {
  const where = {};

  if (role === 'STUDENT') {
    let studentBatch = batch;
    if (!studentBatch) {
      const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { batch: true } });
      studentBatch = userRecord?.batch;
    }
    where.targetBatch = studentBatch || '';
    where.isPublished = true;
  } else if (role !== 'ADMIN') {
    where.createdById = userId;
  }

  const exams = await prisma.exam.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      questions: {
        select: {
          questionId: true,
          question: {
            select: { marks: true }
          }
        }
      },
      _count: {
        select: {
          attempts: true
        }
      }
    },
    orderBy: {
      startTime: 'desc'
    }
  });

  // For students, fetch their individual attempt for each exam so the UI reflects real completion state
  let studentAttemptsMap = new Map();
  if (role === 'STUDENT' && exams.length > 0) {
    const myAttempts = await prisma.examAttempt.findMany({
      where: {
        studentId: userId,
        examId: { in: exams.map((e) => e.id) }
      },
      select: {
        id: true,
        examId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        violationCount: true,
        isFlagged: true
      }
    });
    myAttempts.forEach((att) => {
      studentAttemptsMap.set(att.examId, att);
    });
  }

  return exams.map((exam) => {
    const totalMarks = exam.questions.reduce((sum, eq) => sum + (eq.question?.marks || 0), 0);
    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      targetBatch: exam.targetBatch,
      durationMinutes: exam.durationMinutes,
      startTime: exam.startTime,
      endTime: exam.endTime,
      maxViolations: exam.maxViolations,
      isPublished: exam.isPublished,
      questionCount: exam.questions.length,
      totalMarks,
      attemptCount: exam._count.attempts,
      creator: exam.creator,
      myAttempt: studentAttemptsMap.get(exam.id) || null
    };
  });
};


/**
 * Get a single exam by ID
 */
export const getExamById = async ({ id, userId, role, batch }) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      questions: {
        include: {
          question: {
            include: {
              options: true
            }
          }
        }
      }
    }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  if (role === 'STUDENT') {
    let studentBatch = batch;
    if (!studentBatch) {
      const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { batch: true } });
      studentBatch = userRecord?.batch;
    }

    if (studentBatch !== exam.targetBatch) {
      const error = new Error(`Forbidden: This exam is assigned to batch '${exam.targetBatch}', but you are in batch '${studentBatch || 'None'}'`);
      error.statusCode = 403;
      throw error;
    }

    if (!exam.isPublished) {
      const error = new Error('Forbidden: This exam has not been published yet');
      error.statusCode = 403;
      throw error;
    }

    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      targetBatch: exam.targetBatch,
      durationMinutes: exam.durationMinutes,
      startTime: exam.startTime,
      endTime: exam.endTime,
      maxViolations: exam.maxViolations,
      isPublished: exam.isPublished,
      questionCount: exam.questions.length,
      creator: exam.creator
    };
  }

  const isOwnerOrAdmin = role === 'ADMIN' || exam.createdById === userId;

  const formattedQuestions = exam.questions.map((eq) => {
    const q = eq.question;
    return {
      id: q.id,
      subject: q.subject,
      type: q.type,
      text: q.text,
      marks: q.marks,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        ...(isOwnerOrAdmin ? { isCorrect: opt.isCorrect } : {})
      }))
    };
  });

  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    targetBatch: exam.targetBatch,
    durationMinutes: exam.durationMinutes,
    startTime: exam.startTime,
    endTime: exam.endTime,
    maxViolations: exam.maxViolations,
    isPublished: exam.isPublished,
    creator: exam.creator,
    questions: formattedQuestions
  };
};

/**
 * Start an exam attempt (STUDENT only)
 */
export const startExam = async ({ id, userId, role, batch, ipAddress }) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          question: {
            include: {
              options: {
                select: {
                  id: true,
                  text: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  let studentBatch = batch;
  if (!studentBatch) {
    const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { batch: true } });
    studentBatch = userRecord?.batch;
  }

  if (studentBatch !== exam.targetBatch) {
    const error = new Error(`Forbidden: This exam is assigned to batch '${exam.targetBatch}', but you are in batch '${studentBatch || 'None'}'`);
    error.statusCode = 403;
    throw error;
  }

  if (!exam.isPublished) {
    const error = new Error('Forbidden: This exam has not been published yet');
    error.statusCode = 403;
    throw error;
  }

  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);

  if (now < startTime || now > endTime) {
    const error = new Error('Exam is not currently active');
    error.statusCode = 400;
    throw error;
  }

  const existingAttempt = await prisma.examAttempt.findUnique({
    where: {
      examId_studentId: {
        examId: id,
        studentId: userId
      }
    },
    include: {
      exam: true,
      answers: {
        include: {
          question: {
            include: {
              options: {
                select: {
                  id: true,
                  text: true
                }
              }
            }
          }
        },
        orderBy: {
          displayOrder: 'asc'
        }
      }
    }
  });

  if (existingAttempt) {
    // Check if time expired on resume
    await checkAndHandleTimeExpired({ attempt: existingAttempt, userId, ipAddress });

    if (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'AUTO_SUBMITTED') {
      const error = new Error('Exam has already been submitted');
      error.statusCode = 400;
      throw error;
    }

    const elapsedSeconds = Math.floor((now.getTime() - new Date(existingAttempt.startedAt).getTime()) / 1000);
    const totalAllowedSeconds = exam.durationMinutes * 60;
    const secondsUntilExamEnd = Math.floor((endTime.getTime() - now.getTime()) / 1000);
    const remainingSeconds = Math.max(0, Math.min(totalAllowedSeconds - elapsedSeconds, secondsUntilExamEnd));

    // Construct student's personal question list retaining displayOrder and previous answers
    let studentQuestions;
    if (existingAttempt.answers && existingAttempt.answers.length > 0) {
      studentQuestions = existingAttempt.answers.map((ans) => ({
        id: ans.question.id,
        displayOrder: ans.displayOrder,
        subject: ans.question.subject,
        type: ans.question.type,
        text: ans.question.text,
        marks: ans.question.marks,
        options: formatOptionsForStudent(ans.question, `${id}-${userId}`),
        selectedOptionId: ans.selectedOptionId || null,
        textAnswer: ans.textAnswer || null
      }));
    } else {
      // Fallback if attempt was created before answer seeding
      const shuffled = shuffleArrayWithSeed(exam.questions, `${id}-${userId}`);
      studentQuestions = shuffled.map((eq, idx) => ({
        id: eq.question.id,
        displayOrder: idx + 1,
        subject: eq.question.subject,
        type: eq.question.type,
        text: eq.question.text,
        marks: eq.question.marks,
        options: formatOptionsForStudent(eq.question, `${id}-${userId}`),
        selectedOptionId: null,
        textAnswer: null
      }));
    }

    return {
      attemptId: existingAttempt.id,
      status: existingAttempt.status,
      startedAt: existingAttempt.startedAt,
      examTitle: exam.title,
      durationMinutes: exam.durationMinutes,
      remainingSeconds,
      maxViolations: exam.maxViolations,
      violationCount: existingAttempt.violationCount,
      questions: studentQuestions
    };
  }

  // Perform deterministic Fisher-Yates question shuffle per student
  const shuffledQuestions = shuffleArrayWithSeed(exam.questions, `${id}-${userId}`);

  // Create the attempt with its StudentAnswer rows (which lock in each student's personal
  // displayOrder) in one write, so a concurrent request never sees a half-built attempt
  let newAttempt;
  try {
    newAttempt = await prisma.examAttempt.create({
      data: {
        examId: id,
        studentId: userId,
        status: 'IN_PROGRESS',
        startedAt: now,
        answers: {
          create: shuffledQuestions.map((eq, index) => ({
            questionId: eq.question.id,
            displayOrder: index + 1,
            selectedOptionId: null,
            textAnswer: null
          }))
        }
      }
    });
  } catch (err) {
    // Two start requests raced (double click, quick reload) and the other one created
    // the attempt first: the unique (examId, studentId) constraint fired, so resume it
    if (err.code === 'P2002') {
      return startExam({ id, userId, role, batch, ipAddress });
    }
    throw err;
  }

  const secondsUntilExamEnd = Math.floor((endTime.getTime() - now.getTime()) / 1000);
  const remainingSeconds = Math.min(exam.durationMinutes * 60, secondsUntilExamEnd);

  const studentQuestions = shuffledQuestions.map((eq, index) => ({
    id: eq.question.id,
    displayOrder: index + 1,
    subject: eq.question.subject,
    type: eq.question.type,
    text: eq.question.text,
    marks: eq.question.marks,
    options: formatOptionsForStudent(eq.question, `${id}-${userId}`),
    selectedOptionId: null,
    textAnswer: null
  }));

  return {
    attemptId: newAttempt.id,
    status: newAttempt.status,
    startedAt: newAttempt.startedAt,
    examTitle: exam.title,
    durationMinutes: exam.durationMinutes,
    remainingSeconds,
    maxViolations: exam.maxViolations,
    violationCount: newAttempt.violationCount,
    questions: studentQuestions
  };
};

/**
 * Save / update student's answer for a question in an active attempt
 */
export const saveAnswer = async ({ examId, attemptId, questionId, selectedOptionId, textAnswer, userId, ipAddress }) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true }
  });

  if (!attempt || attempt.examId !== examId) {
    const error = new Error('Exam attempt not found');
    error.statusCode = 404;
    throw error;
  }

  if (attempt.studentId !== userId) {
    const error = new Error('Forbidden: You do not have permission to modify this attempt');
    error.statusCode = 403;
    throw error;
  }

  if (attempt.status !== 'IN_PROGRESS') {
    const error = new Error('Exam has already been submitted');
    error.statusCode = 400;
    throw error;
  }

  // Lazy check: auto-submits if time expired
  await checkAndHandleTimeExpired({ attempt, userId, ipAddress });

  // Verify that the questionId is linked to this exam
  const examQuestion = await prisma.examQuestion.findUnique({
    where: {
      examId_questionId: {
        examId,
        questionId
      }
    },
    include: {
      question: {
        include: {
          options: true
        }
      }
    }
  });

  if (!examQuestion) {
    const error = new Error('Question does not belong to this exam');
    error.statusCode = 400;
    throw error;
  }

  // If selectedOptionId is provided, verify it belongs to this question
  if (selectedOptionId) {
    const validOption = examQuestion.question.options.some((opt) => opt.id === selectedOptionId);
    if (!validOption) {
      const error = new Error('Selected option does not belong to this question');
      error.statusCode = 400;
      throw error;
    }
  }

  const existingAnswer = await prisma.studentAnswer.findUnique({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId
      }
    }
  });

  const displayOrder = existingAnswer?.displayOrder || 1;

  const answer = await prisma.studentAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId
      }
    },
    update: {
      selectedOptionId: selectedOptionId || null,
      textAnswer: textAnswer !== undefined ? textAnswer : null
    },
    create: {
      attemptId,
      questionId,
      selectedOptionId: selectedOptionId || null,
      textAnswer: textAnswer !== undefined ? textAnswer : null,
      displayOrder
    }
  });

  return answer;
};


/**
 * Record anti-cheat violation (tab-switch, fullscreen exit, etc.) and auto-submit if max reached
 */
export const recordViolation = async ({ examId, attemptId, type, details, userId, ipAddress }) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true }
  });

  if (!attempt || attempt.examId !== examId) {
    const error = new Error('Exam attempt not found');
    error.statusCode = 404;
    throw error;
  }

  if (attempt.studentId !== userId) {
    const error = new Error('Forbidden: You do not have permission to modify this attempt');
    error.statusCode = 403;
    throw error;
  }

  if (attempt.status !== 'IN_PROGRESS') {
    const error = new Error(`Exam has already been ${attempt.status.toLowerCase().replace('_', ' ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Check time expiration
  await checkAndHandleTimeExpired({ attempt, userId, ipAddress });

  // 1. Log violation event to AuditLog
  await prisma.auditLog.create({
    data: {
      userId,
      attemptId,
      eventType: type,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      ipAddress: ipAddress || null
    }
  });

  // 2. Increment violation count atomically in PostgreSQL
  const updatedAttempt = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      violationCount: { increment: 1 }
    },
    select: {
      violationCount: true
    }
  });

  const newCount = updatedAttempt.violationCount;
  const maxAllowed = attempt.exam.maxViolations;

  // 3. If new violationCount >= maxAllowed -> immediately auto-submit
  if (newCount >= maxAllowed) {
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { isFlagged: true }
    });

    const submissionResult = await executeExamSubmission({
      attemptId,
      status: 'AUTO_SUBMITTED',
      isFlagged: true
    });


    await prisma.auditLog.create({
      data: {
        userId,
        attemptId,
        eventType: 'AUTO_SUBMIT',
        details: JSON.stringify({ reason: 'Max violations exceeded', violationCount: newCount, maxAllowed }),
        ipAddress: ipAddress || null
      }
    });

    return {
      violationCount: newCount,
      maxAllowed,
      autoSubmitted: true,
      status: 'AUTO_SUBMITTED',
      score: submissionResult.objectiveScore
    };
  }

  // 3. Increment violation count
  const updated = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { violationCount: newCount }
  });

  return {
    violationCount: updated.violationCount,
    maxAllowed,
    autoSubmitted: false
  };
};

/**
 * Submit exam and auto-grade objective questions (MCQ / TRUE_FALSE)
 */
export const submitExam = async ({ examId, attemptId, userId }) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true }
  });

  if (!attempt || attempt.examId !== examId) {
    const error = new Error('Exam attempt not found');
    error.statusCode = 404;
    throw error;
  }

  if (attempt.studentId !== userId) {
    const error = new Error('Forbidden: You do not have permission to submit this attempt');
    error.statusCode = 403;
    throw error;
  }

  if (attempt.status !== 'IN_PROGRESS') {
    const error = new Error(`Exam has already been ${attempt.status.toLowerCase().replace('_', ' ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Strict deadline enforcement: calculate effective deadline
  const now = new Date();
  const attemptDeadline = new Date(new Date(attempt.startedAt).getTime() + attempt.exam.durationMinutes * 60 * 1000);
  const hardDeadline = new Date(attempt.exam.endTime);
  const effectiveDeadline = new Date(Math.min(attemptDeadline.getTime(), hardDeadline.getTime()));

  // Allow 5000ms grace window for in-flight network transit latency
  const isLate = now.getTime() > effectiveDeadline.getTime() + 5000;

  if (isLate) {
    await prisma.auditLog.create({
      data: {
        userId,
        attemptId: attempt.id,
        eventType: 'AUTO_SUBMIT',
        details: JSON.stringify({
          reason: 'Late submission received past deadline; auto-finalized',
          deadline: effectiveDeadline,
          submittedAt: now
        }),
        ipAddress: null
      }
    });

    return executeExamSubmission({ attemptId, status: 'AUTO_SUBMITTED' });
  }

  return executeExamSubmission({ attemptId, status: 'SUBMITTED' });
};


/**
 * Publish an exam (creator or ADMIN only)
 */
export const publishExam = async ({ id, userId, role }) => {
  const exam = await prisma.exam.findUnique({
    where: { id }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'ADMIN' && exam.createdById !== userId) {
    const error = new Error('Forbidden: You do not have permission to publish this exam');
    error.statusCode = 403;
    throw error;
  }

  const updatedExam = await prisma.exam.update({
    where: { id },
    data: { isPublished: true },
    include: {
      creator: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  return updatedExam;
};

/**
 * Update an existing exam (with ownership and live exam checks)
 */
export const updateExam = async ({ id, updateData, userId, role }) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { questions: true }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'ADMIN' && exam.createdById !== userId) {
    const error = new Error('Forbidden: You do not have permission to modify this exam');
    error.statusCode = 403;
    throw error;
  }

  if (new Date() >= new Date(exam.startTime)) {
    const error = new Error('Cannot update an exam that has already started or concluded');
    error.statusCode = 400;
    throw error;
  }

  if (updateData.questionIds) {
    const existingQuestions = await prisma.question.findMany({
      where: {
        id: { in: updateData.questionIds }
      }
    });

    if (existingQuestions.length !== updateData.questionIds.length) {
      const foundIds = existingQuestions.map((q) => q.id);
      const missingIds = updateData.questionIds.filter((qId) => !foundIds.includes(qId));
      const error = new Error(`Invalid question IDs provided: ${missingIds.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    if (role !== 'ADMIN') {
      const unauthorized = existingQuestions.filter((q) => q.createdBy !== userId);
      if (unauthorized.length > 0) {
        const error = new Error(
          `Unauthorized question IDs: ${unauthorized.map((q) => q.id).join(', ')}`
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const updatedExam = await prisma.$transaction(async (tx) => {
    if (updateData.questionIds) {
      await tx.examQuestion.deleteMany({
        where: { examId: id }
      });

      await tx.examQuestion.createMany({
        data: updateData.questionIds.map((questionId) => ({
          examId: id,
          questionId
        }))
      });
    }

    return tx.exam.update({
      where: { id },
      data: {
        ...(updateData.title && { title: updateData.title.trim() }),
        ...(updateData.subject && { subject: updateData.subject.trim() }),
        ...(updateData.targetBatch && { targetBatch: updateData.targetBatch.trim() }),
        ...(updateData.durationMinutes !== undefined && {
          durationMinutes: Number(updateData.durationMinutes)
        }),
        ...(updateData.startTime && { startTime: new Date(updateData.startTime) }),
        ...(updateData.endTime && { endTime: new Date(updateData.endTime) }),
        ...(updateData.maxViolations !== undefined && {
          maxViolations: Number(updateData.maxViolations)
        })
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true }
        },
        questions: {
          include: {
            question: {
              include: { options: true }
            }
          }
        }
      }
    });
  });

  return updatedExam;
};

/**
 * Delete an exam (with ownership and active attempts check)
 */
export const deleteExam = async ({ id, userId, role }) => {
  const exam = await prisma.exam.findUnique({
    where: { id }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'ADMIN' && exam.createdById !== userId) {
    const error = new Error('Forbidden: You do not have permission to delete this exam');
    error.statusCode = 403;
    throw error;
  }

  const attemptsCount = await prisma.examAttempt.count({
    where: { examId: id }
  });

  if (attemptsCount > 0) {
    const error = new Error('Cannot delete an exam that has existing student attempts');
    error.statusCode = 400;
    throw error;
  }

  await prisma.exam.delete({
    where: { id }
  });

  return { message: 'Exam deleted successfully' };
};

/**
 * Get student's own attempt and results for an exam
 */
export const getMyAttempt = async ({ examId, userId }) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId: userId
      }
    },
    include: {
      exam: {
        include: {
          questions: {
            include: {
              question: {
                select: { marks: true }
              }
            }
          }
        }
      },
      answers: {
        select: {
          questionId: true,
          selectedOptionId: true,
          textAnswer: true,
          displayOrder: true
        }
      }
    }
  });

  if (!attempt) {
    return {
      hasAttempt: false,
      attempt: null
    };
  }

  const totalExamMarks = attempt.exam.questions.reduce((sum, eq) => sum + (eq.question.marks || 1.0), 0);
  const totalQuestions = attempt.exam.questions.length;
  const answeredCount = attempt.answers.filter(a => a.selectedOptionId || a.textAnswer).length;

  return {
    hasAttempt: true,
    attempt: {
      id: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      subject: attempt.exam.subject,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationMinutes: attempt.exam.durationMinutes,
      score: attempt.score,
      totalMarks: totalExamMarks,
      totalQuestions,
      answeredCount,
      violationCount: attempt.violationCount,
      isFlagged: attempt.isFlagged
    }
  };
};

/**
 * List all student attempts and aggregate statistics for an exam (Faculty/Admin only)
 */
export const getExamAttempts = async ({ examId, userId, role }) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        include: {
          question: {
            select: { marks: true }
          }
        }
      }
    }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'ADMIN' && exam.createdById !== userId) {
    const error = new Error('Forbidden: You do not have permission to view attempts for this exam');
    error.statusCode = 403;
    throw error;
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true
        }
      },
      _count: {
        select: {
          answers: true
        }
      }
    },
    orderBy: {
      startedAt: 'desc'
    }
  });

  const totalExamMarks = exam.questions.reduce((sum, eq) => sum + (eq.question.marks || 1.0), 0);
  const submitted = attempts.filter((a) => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED');
  const scores = submitted.map((a) => a.score);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
  const highScore = scores.length > 0 ? Math.max(...scores) : 0;

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      targetBatch: exam.targetBatch,
      durationMinutes: exam.durationMinutes,
      startTime: exam.startTime,
      endTime: exam.endTime,
      maxViolations: exam.maxViolations,
      totalQuestions: exam.questions.length,
      totalMarks: totalExamMarks
    },
    stats: {
      totalAttempts: attempts.length,
      submittedCount: submitted.length,
      inProgressCount: attempts.filter((a) => a.status === 'IN_PROGRESS').length,
      flaggedCount: attempts.filter((a) => a.isFlagged).length,
      averageScore: Number(avgScore),
      highestScore: Number(highScore)
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      student: a.student,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      status: a.status,
      score: a.score,
      violationCount: a.violationCount,
      isFlagged: a.isFlagged,
      answeredCount: a._count.answers
    }))
  };
};

/**
 * Get deep attempt details including answers, correctness, and proctoring audit trail (Faculty/Admin only)
 */
export const getAttemptDetails = async ({ examId, attemptId, userId, role }) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        include: {
          question: {
            select: { marks: true }
          }
        }
      }
    }
  });

  if (!exam) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  const totalMarks = exam.questions.reduce((sum, eq) => sum + (eq.question?.marks || 0), 0);

  if (role !== 'ADMIN' && exam.createdById !== userId) {
    const error = new Error('Forbidden: You do not have permission to inspect this attempt');
    error.statusCode = 403;
    throw error;
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true
        }
      },
      answers: {
        include: {
          question: {
            include: {
              options: true
            }
          }
        },
        orderBy: {
          displayOrder: 'asc'
        }
      },
      auditLogs: {
        orderBy: {
          timestamp: 'asc'
        }
      }
    }
  });

  if (!attempt || attempt.examId !== examId) {
    const error = new Error('Exam attempt not found');
    error.statusCode = 404;
    throw error;
  }

  const formattedAnswers = attempt.answers.map((ans) => {
    const q = ans.question;
    const correctOpt = q.options.find((opt) => opt.isCorrect);
    const isCorrect = (q.type === 'MCQ' || q.type === 'TRUE_FALSE')
      ? (ans.selectedOptionId && correctOpt && ans.selectedOptionId === correctOpt.id)
      : null;

    const mappedOptions = q.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      isCorrect: opt.isCorrect
    }));

    return {
      questionId: q.id,
      displayOrder: ans.displayOrder,
      subject: q.subject,
      type: q.type,
      text: q.text,
      marks: q.marks,
      options: mappedOptions,
      question: {
        id: q.id,
        subject: q.subject,
        type: q.type,
        text: q.text,
        marks: q.marks,
        options: mappedOptions
      },
      selectedOptionId: ans.selectedOptionId,
      textAnswer: ans.textAnswer,
      isCorrect,
      marksAwarded: isCorrect ? q.marks : 0.0
    };
  });

  return {
    attemptId: attempt.id,
    examId: exam.id,
    examTitle: exam.title,
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      targetBatch: exam.targetBatch,
      totalMarks
    },
    student: attempt.student,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    score: attempt.score,
    violationCount: attempt.violationCount,
    isFlagged: attempt.isFlagged,
    answers: formattedAnswers,
    auditLogs: attempt.auditLogs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      details: typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || ''),
      ipAddress: log.ipAddress,
      timestamp: log.timestamp
    }))
  };
};

/**
 * Platform-wide Automated Background Sweeper:
 * Finds any orphaned or in-progress attempts whose effective deadline has passed,
 * and automatically finalizes them as AUTO_SUBMITTED with real-time audit logs.
 */
export const autoSubmitExpiredAttempts = async () => {
  const now = new Date();

  const inProgressAttempts = await prisma.examAttempt.findMany({
    where: { status: 'IN_PROGRESS' },
    include: { exam: true }
  });

  let finalizedCount = 0;

  for (const attempt of inProgressAttempts) {
    const attemptDeadline = new Date(new Date(attempt.startedAt).getTime() + attempt.exam.durationMinutes * 60 * 1000);
    const hardDeadline = new Date(attempt.exam.endTime);
    const effectiveDeadline = new Date(Math.min(attemptDeadline.getTime(), hardDeadline.getTime()));

    // If deadline has passed (+ 5s buffer), auto-submit
    if (now.getTime() > effectiveDeadline.getTime() + 5000) {
      try {
        await executeExamSubmission({ attemptId: attempt.id, status: 'AUTO_SUBMITTED' });

        await prisma.auditLog.create({
          data: {
            userId: attempt.studentId,
            attemptId: attempt.id,
            eventType: 'AUTO_SUBMIT',
            details: JSON.stringify({
              reason: 'Automatic background sweeper: deadline exceeded',
              deadline: effectiveDeadline,
              finalizedAt: now
            }),
            ipAddress: null
          }
        });

        finalizedCount++;
      } catch (err) {
        console.error(`⚠️ Failed to auto-submit expired attempt ${attempt.id}:`, err.message);
      }
    }
  }

  return finalizedCount;
};



