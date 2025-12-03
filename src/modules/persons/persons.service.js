const prisma = require('../../prismaClient');
const AppError = require('../../utils/errors');

const createPerson = async (data, userId) => {
  return await prisma.person.create({
    data: {
      ...data,
      createdBy: userId,
      history: {
        create: {
          oldStatus: 'REPORTED', // Initial status assumption or handle logic
          newStatus: data.status || 'REPORTED',
          changedBy: userId,
        },
      },
    },
  });
};

const getAllPersons = async (query) => {
  // Add filtering logic here if needed
  return await prisma.person.findMany({
    include: {
      history: true,
    },
  });
};

const getPersonById = async (id) => {
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      history: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      creator: {
        select: { name: true, email: true },
      },
    },
  });

  if (!person) {
    throw new AppError('Person not found', 404);
  }

  return person;
};

const updatePerson = async (id, data, userId) => {
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) {
    throw new AppError('Person not found', 404);
  }

  // Handle status change history
  if (data.status && data.status !== person.status) {
    await prisma.personStatusHistory.create({
      data: {
        personId: id,
        oldStatus: person.status,
        newStatus: data.status,
        changedBy: userId,
      },
    });
  }

  return await prisma.person.update({
    where: { id },
    data: {
      ...data,
      updatedBy: userId,
    },
  });
};

const deletePerson = async (id) => {
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) {
    throw new AppError('Person not found', 404);
  }

  await prisma.person.delete({ where: { id } });
};

module.exports = {
  createPerson,
  getAllPersons,
  getPersonById,
  updatePerson,
  deletePerson,
};
