import * as examService from '../services/examService.js';

/**
 * Handle exam creation: POST /api/v1/exams
 */
export const create = async (req, res, next) => {
  try {
    const exam = await examService.createExam({
      ...req.body,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle exam listing: GET /api/v1/exams
 */
export const list = async (req, res, next) => {
  try {
    const exams = await examService.listExams({
      userId: req.user.userId,
      role: req.user.role,
      batch: req.user.batch
    });

    return res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle single exam fetch: GET /api/v1/exams/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await examService.getExamById({
      id,
      userId: req.user.userId,
      role: req.user.role,
      batch: req.user.batch
    });

    return res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle starting an exam attempt: POST /api/v1/exams/:id/start
 */
export const start = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attemptData = await examService.startExam({
      id,
      userId: req.user.userId,
      role: req.user.role,
      batch: req.user.batch,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Exam attempt started successfully',
      data: attemptData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle saving student answer: PATCH /api/v1/exams/:examId/attempts/:attemptId/answer
 */
export const saveAnswer = async (req, res, next) => {
  try {
    const { examId, attemptId } = req.params;
    const answer = await examService.saveAnswer({
      examId,
      attemptId,
      ...req.body,
      userId: req.user.userId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Answer saved successfully',
      data: answer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle recording anti-cheat violation: POST /api/v1/exams/:examId/attempts/:attemptId/violation
 */
export const recordViolation = async (req, res, next) => {
  try {
    const { examId, attemptId } = req.params;
    const result = await examService.recordViolation({
      examId,
      attemptId,
      ...req.body,
      userId: req.user.userId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: result.autoSubmitted
        ? 'Violation limit reached. Exam auto-submitted.'
        : 'Violation recorded',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle submitting exam attempt: POST /api/v1/exams/:examId/attempts/:attemptId/submit
 */
export const submit = async (req, res, next) => {
  try {
    const { examId, attemptId } = req.params;
    const result = await examService.submitExam({
      examId,
      attemptId,
      userId: req.user.userId
    });

    return res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle exam publish toggle: PATCH /api/v1/exams/:id/publish
 */
export const publish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const publishedExam = await examService.publishExam({
      id,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Exam published successfully',
      data: publishedExam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle exam update: PATCH /api/v1/exams/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await examService.updateExam({
      id,
      updateData: req.body,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle exam deletion: DELETE /api/v1/exams/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await examService.deleteExam({
      id,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetching student's own attempt & results: GET /api/v1/exams/:id/my-attempt
 */
export const getMyAttempt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await examService.getMyAttempt({
      examId: id,
      userId: req.user.userId
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle listing all student attempts & stats for an exam: GET /api/v1/exams/:id/attempts
 */
export const getExamAttempts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await examService.getExamAttempts({
      examId: id,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle inspecting detailed attempt & violation audit trail: GET /api/v1/exams/:id/attempts/:attemptId
 */
export const getAttemptDetails = async (req, res, next) => {
  try {
    const { id, attemptId } = req.params;
    const result = await examService.getAttemptDetails({
      examId: id,
      attemptId,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

