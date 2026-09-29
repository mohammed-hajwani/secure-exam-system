import prisma from '../config/db.js';

/**
 * Create a new question with options in the Question Bank
 */
export const createQuestion = async ({ subject, type, text, marks, options, userId }) => {
  const newQuestion = await prisma.question.create({
    data: {
      subject: subject.trim(),
      type,
      text: text.trim(),
      marks: marks !== undefined ? Number(marks) : 1.0,
      createdBy: userId,
      options: options && options.length > 0 ? {
        create: options.map(opt => ({
          text: opt.text.trim(),
          isCorrect: Boolean(opt.isCorrect)
        }))
      } : undefined
    },
    include: {
      options: {
        select: {
          id: true,
          text: true,
          isCorrect: true
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return newQuestion;
};

/**
 * List questions in Question Bank
 * FACULTY: only sees questions created by themselves
 * ADMIN: sees all questions
 */
export const listQuestions = async ({ userId, role, subject }) => {
  const where = {};

  // Restrict faculty to their own questions; Admins see everything
  if (role !== 'ADMIN') {
    where.createdBy = userId;
  }

  if (subject) {
    where.subject = {
      contains: subject.trim(),
      mode: 'insensitive'
    };
  }

  const questions = await prisma.question.findMany({
    where,
    include: {
      options: {
        select: {
          id: true,
          text: true,
          isCorrect: true
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      id: 'desc'
    }
  });

  return questions;
};

/**
 * Update an existing question (with ownership check)
 */
export const updateQuestion = async ({ id, updateData, userId, role }) => {
  const existingQuestion = await prisma.question.findUnique({
    where: { id },
    include: { options: true }
  });

  if (!existingQuestion) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification: Only creator or Admin can edit
  if (role !== 'ADMIN' && existingQuestion.createdBy !== userId) {
    const error = new Error('Forbidden: You do not have permission to modify this question');
    error.statusCode = 403;
    throw error;
  }

  const updatedQuestion = await prisma.$transaction(async (tx) => {
    // If options are supplied, replace existing options
    if (updateData.options) {
      await tx.option.deleteMany({
        where: { questionId: id }
      });

      await tx.option.createMany({
        data: updateData.options.map(opt => ({
          questionId: id,
          text: opt.text.trim(),
          isCorrect: Boolean(opt.isCorrect)
        }))
      });
    }

    return tx.question.update({
      where: { id },
      data: {
        ...(updateData.subject && { subject: updateData.subject.trim() }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.text && { text: updateData.text.trim() }),
        ...(updateData.marks !== undefined && { marks: Number(updateData.marks) })
      },
      include: {
        options: {
          select: {
            id: true,
            text: true,
            isCorrect: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  });

  return updatedQuestion;
};

/**
 * Delete a question (with ownership check)
 */
export const deleteQuestion = async ({ id, userId, role }) => {
  const existingQuestion = await prisma.question.findUnique({
    where: { id }
  });

  if (!existingQuestion) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification: Only creator or Admin can delete
  if (role !== 'ADMIN' && existingQuestion.createdBy !== userId) {
    const error = new Error('Forbidden: You do not have permission to delete this question');
    error.statusCode = 403;
    throw error;
  }

  // Check for references in student answers or exams before attempting deletion
  const answerCount = await prisma.studentAnswer.count({
    where: { questionId: id }
  });

  if (answerCount > 0) {
    const error = new Error('Cannot delete question because it is referenced in existing student exam attempts');
    error.statusCode = 400;
    throw error;
  }

  const examLinkCount = await prisma.examQuestion.count({
    where: { questionId: id }
  });

  if (examLinkCount > 0) {
    const error = new Error('Cannot delete question because it is linked to one or more exams. Remove it from the exams first.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.question.delete({
    where: { id }
  });

  return { message: 'Question deleted successfully' };
};

