const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Seed default consent types
 */
async function seedConsents() {
  console.log('🌱 Seeding consent types...');

  const consentTypes = [
    {
      name: 'terms_of_service',
      displayName: 'Terms of Service',
      description: 'General terms and conditions for using the platform.',
      version: '1.0',
      content: 'Full text of Terms of Service v1.0...',
      required: true,
    },
    {
      name: 'privacy_policy',
      displayName: 'Privacy Policy',
      description: 'How we handle your data.',
      version: '1.0',
      content: 'Full text of Privacy Policy v1.0...',
      required: true,
    },
    {
      name: 'data_processing',
      displayName: 'Data Processing Agreement',
      description: 'Consent for processing sensitive data.',
      version: '1.0',
      content: 'Full text of DPA v1.0...',
      required: true,
    },
    {
      name: 'marketing_communications',
      displayName: 'Marketing Communications',
      description: 'Receive updates and newsletters.',
      version: '1.0',
      content: 'I agree to receive marketing communications...',
      required: false,
    },
  ];

  for (const type of consentTypes) {
    await prisma.consentType.upsert({
      where: { name: type.name },
      update: type,
      create: type,
    });
  }

  console.log(`✅ Seeded ${consentTypes.length} consent types`);
}

// Run if called directly
if (require.main === module) {
  seedConsents()
    .then(() => {
      console.log('✅ Consent seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Consent seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = seedConsents;
