const prisma = require('../../prismaClient');

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
};

const getAuditLogs = async () => {
  return await prisma.auditLog.findMany({
    include: {
      user: {
        select: { email: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const updateUserRole = async (userId, role) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });
};

module.exports = {
  getAllUsers,
  getAuditLogs,
  updateUserRole,
};
