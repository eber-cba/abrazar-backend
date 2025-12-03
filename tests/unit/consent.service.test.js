const consentService = require('../../src/modules/consents/consent.service');
const { PrismaClient } = require('@prisma/client');
const AppError = require('../../src/utils/errors');

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    consentType: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    consent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    consentHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

describe('ConsentService', () => {
  const prisma = new PrismaClient();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('grantConsent', () => {
    it('should grant consent and create history record', async () => {
      const userId = 'user-1';
      const consentTypeId = 'type-1';
      const ipAddress = '127.0.0.1';
      const userAgent = 'TestAgent';

      prisma.consentType.findUnique.mockResolvedValue({
        id: consentTypeId,
        name: 'terms',
        version: '1.0',
      });

      prisma.consent.upsert.mockResolvedValue({
        id: 'consent-1',
        userId,
        consentTypeId,
        granted: true,
      });

      const result = await consentService.grantConsent(userId, consentTypeId, ipAddress, userAgent);

      expect(result.granted).toBe(true);
      expect(prisma.consent.upsert).toHaveBeenCalled();
      expect(prisma.consentHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'GRANTED',
          userId,
          version: '1.0',
        }),
      }));
    });

    it('should throw error if consent type not found', async () => {
      prisma.consentType.findUnique.mockResolvedValue(null);

      await expect(
        consentService.grantConsent('user-1', 'invalid-id', 'ip', 'agent')
      ).rejects.toThrow(AppError);
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent and create history record', async () => {
      const userId = 'user-1';
      const consentTypeId = 'type-1';
      
      prisma.consentType.findUnique.mockResolvedValue({
        id: consentTypeId,
        name: 'terms',
      });

      prisma.consent.update.mockResolvedValue({
        id: 'consent-1',
        version: '1.0',
        granted: false,
      });

      await consentService.revokeConsent(userId, consentTypeId, 'ip', 'agent');

      expect(prisma.consent.update).toHaveBeenCalled();
      expect(prisma.consentHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'REVOKED',
        }),
      }));
    });
  });

  describe('hasValidConsent', () => {
    it('should return true if consent is granted', async () => {
      prisma.consentType.findUnique.mockResolvedValue({ id: 'type-1' });
      prisma.consent.findUnique.mockResolvedValue({ granted: true });

      const result = await consentService.hasValidConsent('user-1', 'terms');

      expect(result).toBe(true);
    });

    it('should return false if consent is revoked or missing', async () => {
      prisma.consentType.findUnique.mockResolvedValue({ id: 'type-1' });
      prisma.consent.findUnique.mockResolvedValue({ granted: false });

      const result = await consentService.hasValidConsent('user-1', 'terms');

      expect(result).toBe(false);
    });
  });
});
