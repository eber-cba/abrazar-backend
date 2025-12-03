const { z } = require('zod');

const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment content cannot be empty'),
  }),
});

const getCommentsSchema = z.object({
  query: z.object({
    sortBy: z.enum(['createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

module.exports = {
  createCommentSchema,
  getCommentsSchema,
};
