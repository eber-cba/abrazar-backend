const prisma = require('../prismaClient');

class PersonService {
  async getAllPersons() {
    return await prisma.person.findMany({
      include: {
        location: true,
        photos: true,
        history: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPersonById(id) {
    return await prisma.person.findUnique({
      where: { id },
      include: {
        location: true,
        photos: true,
        history: true,
      },
    });
  }

  async createPerson(data) {
    const { location, ...personData } = data;
    
    return await prisma.person.create({
      data: {
        ...personData,
        location: location ? {
          create: location
        } : undefined,
        history: {
          create: {
            status: personData.status || 'MISSING',
            notes: 'Initial report'
          }
        }
      },
      include: {
        location: true,
        history: true
      }
    });
  }
}

module.exports = new PersonService();
