const adminService = require('./admin.service');

const getUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

const getAudits = async (req, res, next) => {
  try {
    const audits = await adminService.getAuditLogs();
    res.status(200).json({
      status: 'success',
      results: audits.length,
      data: { audits },
    });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await adminService.updateUserRole(req.params.id, role);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getAudits,
  updateUserRole,
};
