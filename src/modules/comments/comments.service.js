const prisma = require('../../prismaClient');
const AppError = require('../../utils/errors'); // Added import

const createComment = async (caseId, authorId, content) => {
  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData) {
    throw new AppError('Case not found', 404);
  }

  return await prisma.comment.create({
    data: {
      content,
      authorId,
      caseId,
    },
    include: {
        author: {
            select: {
                id: true,
                name: true,
            }
        }
    }
  });
};

const getCommentsByPersonId = async (caseId, options) => {
  const { sortBy, sortOrder } = options;

  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData) {
    throw new AppError('Case not found', 404);
  }

  return await prisma.comment.findMany({
    where: { caseId },
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

module.exports = {
  createComment,
  getCommentsByPersonId,
};
