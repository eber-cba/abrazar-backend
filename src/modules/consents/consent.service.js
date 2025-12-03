const { PrismaClient } = require('@prisma/client');
const AppError = require('../../utils/errors');

const prisma = new PrismaClient();

class ConsentService {
  /**
   * Grant consent for a user
   */
  async grantConsent(userId, consentTypeId, ipAddress, userAgent) {
    const consentType = await prisma.consentType.findUnique({
      where: { id: consentTypeId },
    });

    if (!consentType) {
      throw new AppError('Consent type not found', 404);
    }

    // 1. Upsert Consent record
    const consent = await prisma.consent.upsert({
      where: {
        userId_consentTypeId: {
          userId,
          consentTypeId,
        },
      },
      update: {
        granted: true,
        grantedAt: new Date(),
        version: consentType.version,
        ipAddress,
        userAgent,
        revokedAt: null,
      },
      create: {
        userId,
        consentTypeId,
        version: consentType.version,
        granted: true,
        ipAddress,
        userAgent,
      },
    });

    // 2. Create Immutable History Record
    await prisma.consentHistory.create({
      data: {
        userId,
        consentType: consentType.name,
        version: consentType.version,
        action: 'GRANTED',
        ipAddress,
        userAgent,
        metadata: {
          consentTypeId,
          consentId: consent.id,
        },
      },
    });

    return consent;
  }

  /**
   * Revoke consent for a user
   */
  async revokeConsent(userId, consentTypeId, ipAddress, userAgent) {
    const consentType = await prisma.consentType.findUnique({
      where: { id: consentTypeId },
    });

    if (!consentType) {
      throw new AppError('Consent type not found', 404);
    }

    // 1. Update Consent record
    const consent = await prisma.consent.update({
      where: {
        userId_consentTypeId: {
          userId,
          consentTypeId,
        },
      },
      data: {
        granted: false,
        revokedAt: new Date(),
        ipAddress, // Update last IP
        userAgent,
      },
    });

    // 2. Create Immutable History Record
    await prisma.consentHistory.create({
      data: {
        userId,
        consentType: consentType.name,
        version: consent.version, // Use the version they had accepted
        action: 'REVOKED',
        ipAddress,
        userAgent,
        metadata: {
          consentTypeId,
          consentId: consent.id,
        },
      },
    });

    return consent;
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId) {
    return prisma.consent.findMany({
      where: { userId },
      include: {
        consentType: true,
      },
    });
  }

  /**
   * Check if user has valid consent
   */
  async hasValidConsent(userId, consentTypeName) {
    const consentType = await prisma.consentType.findUnique({
      where: { name: consentTypeName },
    });

    if (!consentType) return false;

    const consent = await prisma.consent.findUnique({
      where: {
        userId_consentTypeId: {
          userId,
          consentTypeId: consentType.id,
        },
      },
    });

    // Must be granted AND match current version (strict mode)
    // Or just be granted (lenient mode - usually sufficient unless major legal change)
    // Here we implement strict check: must be granted. Version check can be added if needed.
    return consent && consent.granted;
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId) {
    return prisma.consentHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all available consent types
   */
  async getConsentTypes() {
    return prisma.consentType.findMany({
      where: { required: true }, // Or all? Let's return all for now or filter by query
    });
  }

  /**
   * Create a new consent type (Admin/Seed)
   */
  async createConsentType(data) {
    return prisma.consentType.create({
      data,
    });
  }
}

module.exports = new ConsentService();
