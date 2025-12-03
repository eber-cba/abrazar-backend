const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.emergency.deleteMany();
  await prisma.caseHistory.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.case.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.servicePoint.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create Organizations
  console.log('🏢 Creating organizations...');
  const municipality = await prisma.organization.create({
    data: {
      type: 'MUNICIPALITY',
      name: 'Municipalidad de Córdoba',
      city: 'Córdoba',
      province: 'Córdoba',
      country: 'Argentina',
      contactEmail: 'contacto@cordoba.gob.ar',
      contactPhone: '+54 351 4285200'
    }
  });

  const ngo = await prisma.organization.create({
    data: {
      type: 'NGO',
      name: 'Fundación Abrazar',
      city: 'Córdoba',
      province: 'Córdoba',
      country: 'Argentina',
      contactEmail: 'info@abrazar.org',
      contactPhone: '+54 351 4567890'
    }
  });

  // Create Zones
  console.log('🗺️  Creating geographic zones...');
  const zoneCentro = await prisma.zone.create({
    data: {
      name: 'Centro',
      description: 'Zona céntrica de la ciudad',
      polygon: {
        type: 'Polygon',
        coordinates: [[
          [-64.18, -31.41],
          [-64.19, -31.41],
          [-64.19, -31.42],
          [-64.18, -31.42],
          [-64.18, -31.41]
        ]]
      },
      organizationId: municipality.id
    }
  });

  const zoneAlberdi = await prisma.zone.create({
    data: {
      name: 'Alberdi',
      description: 'Barrio Alberdi',
      polygon: {
        type: 'Polygon',
        coordinates: [[
          [-64.20, -31.43],
          [-64.21, -31.43],
          [-64.21, -31.44],
          [-64.20, -31.44],
          [-64.20, -31.43]
        ]]
      },
      organizationId: municipality.id
    }
  });

  // Create Users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@abrazar.org',
      password: hashedPassword,
      name: 'Administrador Global',
      role: 'ADMIN',
      acceptedTerms: true
    }
  });

  const muniAdmin = await prisma.user.create({
    data: {
      email: 'admin@cordoba.gob.ar',
      password: hashedPassword,
      name: 'Director Municipal',
      role: 'ORGANIZATION_ADMIN',
      organizationId: municipality.id,
      acceptedTerms: true
    }
  });

  const coordinator = await prisma.user.create({
    data: {
      email: 'coordinador@cordoba.gob.ar',
      password: hashedPassword,
      name: 'María González',
      role: 'COORDINATOR',
      organizationId: municipality.id,
      acceptedTerms: true
    }
  });

  const socialWorker = await prisma.user.create({
    data: {
      email: 'trabajadora@cordoba.gob.ar',
      password: hashedPassword,
      name: 'Ana Martínez',
      role: 'SOCIAL_WORKER',
      organizationId: municipality.id,
      acceptedTerms: true
    }
  });

  const volunteer = await prisma.user.create({
    data: {
      email: 'voluntario@abrazar.org',
      password: hashedPassword,
      name: 'Carlos Rodríguez',
      role: 'VOLUNTEER',
      organizationId: ngo.id,
      acceptedTerms: true
    }
  });

  // Create Teams
  console.log('👨‍👩‍👧‍👦 Creating teams...');
  const responseTeam = await prisma.team.create({
    data: {
      name: 'Equipo de Respuesta Rápida',
      description: 'Equipo especializado en atención de emergencias',
      organizationId: municipality.id,
      members: {
        create: [
          { userId: coordinator.id, roleInTeam: 'LEADER' },
          { userId: socialWorker.id, roleInTeam: 'COORDINATOR' }
        ]
      }
    }
  });

  // Create Service Points
  console.log('📍 Creating service points...');
  await prisma.servicePoint.createMany({
    data: [
      {
        type: 'HEALTH_CENTER',
        name: 'Centro de Salud Municipal',
        description: 'Atención médica primaria',
        address: 'Av. Colón 1234',
        latitude: -31.416,
        longitude: -64.183,
        openingHours: 'Lunes a Viernes 8:00-20:00',
        capacity: 50,
        servicesOffered: ['Consultas médicas', 'Vacunación', 'Enfermería'],
        contactPhone: '+54 351 4285201',
        email: 'salud@cordoba.gob.ar',
        isPublic: true,
        organizationId: municipality.id,
        zoneId: zoneCentro.id
      },
      {
        type: 'SOUP_KITCHEN',
        name: 'Comedor Comunitario Alberdi',
        description: 'Comedor para personas en situación de vulnerabilidad',
        address: 'Calle San Martín 567',
        latitude: -31.420,
        longitude: -64.190,
        openingHours: 'Lunes a Domingo 12:00-14:00, 20:00-22:00',
        capacity: 100,
        servicesOffered: ['Almuerzo', 'Cena', 'Merienda'],
        contactPhone: '+54 351 4567891',
        isPublic: true,
        organizationId: ngo.id,
        zoneId: zoneAlberdi.id
      },
      {
        type: 'TEMP_SHELTER',
        name: 'Refugio Temporal Municipal',
        description: 'Alojamiento temporal para personas sin hogar',
        address: 'Av. Vélez Sarsfield 890',
        latitude: -31.425,
        longitude: -64.195,
        openingHours: '24 horas',
        capacity: 30,
        servicesOffered: ['Alojamiento', 'Duchas', 'Ropa'],
        contactPhone: '+54 351 4285202',
        isPublic: false,
        organizationId: municipality.id
      }
    ]
  });

  // Create Cases
  console.log('📋 Creating cases...');
  const case1 = await prisma.case.create({
    data: {
      fullName: 'Juan Pérez',
      age: 45,
      description: 'Persona en situación de calle, requiere asistencia médica y alojamiento',
      lat: -31.416,
      lng: -64.183,
      status: 'REPORTED',
      reportedByConsent: true,
      organizationId: municipality.id,
      zoneId: zoneCentro.id,
      createdBy: socialWorker.id,
      assignedToUserId: socialWorker.id,
      assignedToTeamId: responseTeam.id
    }
  });

  const case2 = await prisma.case.create({
    data: {
      fullName: 'María González',
      age: 32,
      description: 'Madre con dos hijos menores, necesita asistencia alimentaria',
      lat: -31.420,
      lng: -64.190,
      status: 'ASSISTING',
      reportedByConsent: true,
      organizationId: municipality.id,
      zoneId: zoneAlberdi.id,
      createdBy: coordinator.id,
      assignedToUserId: socialWorker.id
    }
  });

  const case3 = await prisma.case.create({
    data: {
      fullName: 'Carlos Rodríguez',
      age: 58,
      description: 'Requiere atención médica urgente',
      lat: -31.425,
      lng: -64.195,
      status: 'VERIFIED',
      isEmergency: true,
      emergencyLevel: 3,
      reportedByConsent: true,
      organizationId: municipality.id,
      createdBy: socialWorker.id,
      assignedToTeamId: responseTeam.id
    }
  });

  // Create Emergency for case3
  await prisma.emergency.create({
    data: {
      caseId: case3.id,
      level: 3,
      reason: 'Requiere atención médica inmediata',
      markedBy: socialWorker.id
    }
  });

  // Create Comments
  console.log('💬 Creating comments...');
  await prisma.comment.createMany({
    data: [
      {
        content: 'Primera visita realizada, persona receptiva a la ayuda',
        authorId: socialWorker.id,
        caseId: case1.id
      },
      {
        content: 'Se coordinó derivación a centro de salud',
        authorId: coordinator.id,
        caseId: case1.id
      },
      {
        content: 'Familia asistida con alimentos y ropa',
        authorId: socialWorker.id,
        caseId: case2.id
      }
    ]
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Organizations: ${await prisma.organization.count()}`);
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`   - Zones: ${await prisma.zone.count()}`);
  console.log(`   - Teams: ${await prisma.team.count()}`);
  console.log(`   - Service Points: ${await prisma.servicePoint.count()}`);
  console.log(`   - Cases: ${await prisma.case.count()}`);
  console.log(`   - Comments: ${await prisma.comment.count()}`);
  console.log(`   - Emergencies: ${await prisma.emergency.count()}`);
  console.log('\n🔑 Test credentials:');
  console.log('   - Global Admin: admin@abrazar.org / password123');
  console.log('   - Municipal Admin: admin@cordoba.gob.ar / password123');
  console.log('   - Coordinator: coordinador@cordoba.gob.ar / password123');
  console.log('   - Social Worker: trabajadora@cordoba.gob.ar / password123');
  console.log('   - Volunteer: voluntario@abrazar.org / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
