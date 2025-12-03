const sessionService = require('./session.service');
const AppError = require('../../utils/errors');

class SessionController {
  /**
   * Get active sessions for the current user
   */
  async getMySessions(req, res, next) {
    try {
      const sessions = await sessionService.getActiveSessions(req.user.id);
      
      res.status(200).json({
        status: 'success',
        results: sessions.length,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(req, res, next) {
    try {
      const { id } = req.params;
      
      // Ensure session belongs to user (or user is admin)
      // For now, let's restrict to own sessions
      // Ideally we should check if session exists and belongs to user first
      // But sessionService.revokeSession handles revocation by ID.
      // We should probably add a check in service or here.
      // Let's trust the service to handle cleanup, but for security we should verify ownership if not admin.
      // For simplicity in this iteration:
      
      await sessionService.revokeSession(id, req.user.id);

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke all sessions for the current user (Logout all devices)
   */
  async revokeAll(req, res, next) {
    try {
      await sessionService.revokeAllUserSessions(req.user.id);

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SessionController();
