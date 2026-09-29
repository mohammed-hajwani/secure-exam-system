import * as questionService from '../services/questionService.js';

/**
 * Handle question creation: POST /api/v1/questions
 */
export const create = async (req, res, next) => {
  try {
    const question = await questionService.createQuestion({
      ...req.body,
      userId: req.user.userId
    });

    return res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle question listing: GET /api/v1/questions
 */
export const list = async (req, res, next) => {
  try {
    const { subject } = req.query;
    const questions = await questionService.listQuestions({
      userId: req.user.userId,
      role: req.user.role,
      subject
    });

    return res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle question update: PATCH /api/v1/questions/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await questionService.updateQuestion({
      id,
      updateData: req.body,
      userId: req.user.userId,
      role: req.user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle question deletion: DELETE /api/v1/questions/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await questionService.deleteQuestion({
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
