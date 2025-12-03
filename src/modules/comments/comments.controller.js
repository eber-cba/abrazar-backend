const commentsService = require('./comments.service');

const postComment = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const { id: authorId } = req.user;
    const { content } = req.body;

    const comment = await commentsService.createComment(caseId, authorId, content);

    res.status(201).json({
      status: 'success',
      data: { comment },
    });
  } catch (err) {
    next(err);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const { sortBy, sortOrder } = req.query;

    const comments = await commentsService.getCommentsByPersonId(caseId, { sortBy, sortOrder });

    res.status(200).json({
      status: 'success',
      results: comments.length,
      data: { comments },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postComment,
  getComments,
};
