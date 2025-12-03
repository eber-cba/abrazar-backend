const prisma = require('../src/prismaClient');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data (in correct order to avoid foreign key constraints)
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.emergency.deleteMany();
  await prisma.caseHistory.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.case.deleteMany();
  await prisma.servicePoint.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Create Organizations
  const municipalityOrg = await prisma.organization.create({
    data: {
      type: 'MUNICIPALITY',
      name: 'Municipalidad de Córdoba',
      city: 'Córdoba',
      province: 'Córdoba',
      country: 'Argentina',
    },
  });

  const ngoOrg = await prisma.organization.create({
    data: {
      type: 'NGO',
      name: 'Manos Solidarias',
      city: 'Córdoba',
      province: 'Córdoba',
      country: 'Argentina',
    },
  });

  const genericOrg = await prisma.organization.create({
    data: {
      type: 'GENERIC',
      name: 'Organización Genérica',
      city: 'Rosario',
      province: 'Santa Fe',
      country: 'Argentina',
    },
  });

  // 3. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@abrazar.com' },
    update: {},
    create: {
      email: 'admin@abrazar.com',
      password: hashedPassword,
      name: 'Admin Global',
      role: 'ADMIN',
      acceptedTerms: true,
    },
  });

  const muniAdmin = await prisma.user.upsert({
    where: { email: 'muni.admin@cordoba.com' },
    update: {},
    create: {
      email: 'muni.admin@cordoba.com',
      password: hashedPassword,
      name: 'Admin Municipal',
      role: 'ORGANIZATION_ADMIN',
      organizationId: municipalityOrg.id,
      acceptedTerms: true,
    },
  });

  const ngoCoordinator = await prisma.user.upsert({
    where: { email: 'ngo.coord@manos.com' },
    update: {},
    create: {
      email: 'ngo.coord@manos.com',
      password: hashedPassword,
      name: 'Coordinador ONG',
      role: 'COORDINATOR',
      organizationId: ngoOrg.id,
      acceptedTerms: true,
    },
  });

  const volunteer = await prisma.user.upsert({
    where: { email: 'volunteer@abrazar.com' },
    update: {},
    create: {
      email: 'volunteer@abrazar.com',
      password: hashedPassword,
      name: 'Voluntario Activo',
      role: 'VOLUNTEER',
      organizationId: ngoOrg.id,
      acceptedTerms: true,
    },
  });

  const socialWorker = await prisma.user.upsert({
    where: { email: 'social.worker@cordoba.com' },
    update: {},
    create: {
      email: 'social.worker@cordoba.com',
      password: hashedPassword,
      name: 'Trabajador Social',
      role: 'SOCIAL_WORKER',
      organizationId: municipalityOrg.id,
      acceptedTerms: true,
    },
  });

  // 4. Create Zones
  const cordobaZone = await prisma.zone.create({
    data: {
      name: 'Zona Centro Córdoba',
      description: 'Área céntrica de la ciudad de Córdoba',
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [-64.189, -31.420],
            [-64.180, -31.420],
            [-64.180, -31.410],
            [-64.189, -31.410],
            [-64.189, -31.420],
          ],
        ],
      },
      organizationId: municipalityOrg.id,
    },
  });

  // 5. Create Teams
  const muniTeam = await prisma.team.create({
    data: {
      name: 'Equipo Municipal de Intervención',
      organizationId: municipalityOrg.id,
    },
  });

  await prisma.teamMember.create({
    data: {
      teamId: muniTeam.id,
      userId: socialWorker.id,
      roleInTeam: 'LEADER',
    },
  });

  // 6. Create Service Points
  const healthCenter = await prisma.servicePoint.create({
    data: {
      type: 'HEALTH_CENTER',
      name: 'Centro de Salud N°1',
      address: 'Av. Colón 1000, Córdoba',
      latitude: -31.418,
      longitude: -64.185,
      isPublic: true,
      organizationId: municipalityOrg.id,
      zoneId: cordobaZone.id,
    },
  });

  const soupKitchen = await prisma.servicePoint.create({
    data: {
      type: 'SOUP_KITCHEN',
      name: 'Comedor Manos Solidarias',
      address: 'Calle Falsa 123, Córdoba',
      latitude: -31.425,
      longitude: -64.195,
      isPublic: true,
      organizationId: ngoOrg.id,
    },
  });

  // 7. Create Cases
  const case1 = await prisma.case.create({
    data: {
      fullName: 'Persona 1',
      age: 45,
      description: 'Hombre con barba, necesita ropa y comida',
      lat: -31.4205,
      lng: -64.187,
      createdBy: socialWorker.id,
      organizationId: municipalityOrg.id,
      zoneId: cordobaZone.id,
      status: 'REPORTED',
      reportedByConsent: true,
    },
  });

  const case2 = await prisma.case.create({
    data: {
      fullName: 'Persona 2',
      age: 28,
      description: 'Mujer joven, embarazada, buscando refugio',
      lat: -31.424,
      lng: -64.190,
      createdBy: volunteer.id,
      organizationId: ngoOrg.id,
      status: 'VERIFIED',
      isEmergency: true,
      emergencyLevel: 4,
      reportedByConsent: true,
    },
  });

  // 8. Add Comments to Cases
  await prisma.comment.create({
    data: {
      content: 'Primer reporte recibido, se envía trabajador social.',
      authorId: socialWorker.id,
      caseId: case1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Contacto inicial realizado. Necesita asistencia médica.',
      authorId: volunteer.id,
      caseId: case2.id,
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });