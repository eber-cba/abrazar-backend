const { calculateDistance, isValidCoordinates } = require('../../src/utils/geolocation');
const homelessService = require('../../src/modules/homeless/homeless.service');

// Mock dependencies
jest.mock('../../src/prismaClient', () => ({
  homeless: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  servicePoint: {
    findMany: jest.fn(),
  },
}));

jest.mock('../../src/modules/audit/audit.service', () => ({
  logAudit: jest.fn(),
}));

describe('Homeless Module - Unit Tests', () => {
  describe('Geolocation Utils', () => {
    test('should calculate distance correctly (Buenos Aires to Córdoba)', () => {
      // Buenos Aires: -34.6037, -58.3816
      // Córdoba: -31.4201, -64.1888
      const distance = calculateDistance(-34.6037, -58.3816, -31.4201, -64.1888);
      
      // Expected distance is approximately 642 km (allow 10km tolerance)
      expect(distance).toBeGreaterThan(630);
      expect(distance).toBeLessThan(650);
    });

    test('should return 0 for same coordinates', () => {
      const distance = calculateDistance(-34.6037, -58.3816, -34.6037, -58.3816);
      expect(distance).toBe(0);
    });

    test('should validate correct coordinates', () => {
      expect(isValidCoordinates(-34.6037, -58.3816)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });

    test('should reject invalid coordinates', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(-91, 0)).toBe(false);
      expect(isValidCoordinates(0, -181)).toBe(false);
      expect(isValidCoordinates('invalid', 0)).toBe(false);
    });
  });

  describe('Permission System', () => {
    test('VOLUNTEER should only get basic fields', () => {
      const allowedFields = homelessService.getAllowedFields('VOLUNTEER', false);
      
      expect(allowedFields).toContain('lat');
      expect(allowedFields).toContain('lng');
      expect(allowedFields).toContain('apodo');
      expect(allowedFields).toContain('fotoUrl');
      expect(allowedFields).not.toContain('nombre');
      expect(allowedFields).not.toContain('apellido');
      expect(allowedFields).not.toContain('adicciones');
    });

    test('COORDINATOR should get all fields with consent', () => {
      const allowedFields = homelessService.getAllowedFields('COORDINATOR', true);
      
      expect(allowedFields).toContain('lat');
      expect(allowedFields).toContain('lng');
      expect(allowedFields).toContain('nombre');
      expect(allowedFields).toContain('apellido');
      expect(allowedFields).toContain('adicciones');
      expect(allowedFields).toContain('estadoMental');
    });

    test('COORDINATOR without consent should get limited fields', () => {
      const allowedFields = homelessService.getAllowedFields('COORDINATOR', false);
      
      expect(allowedFields).toContain('lat');
      expect(allowedFields).toContain('lng');
      expect(allowedFields).toContain('atencionMedicaUrgente');
      expect(allowedFields).not.toContain('nombre');
      expect(allowedFields).not.toContain('apellido');
      expect(allowedFields).not.toContain('adicciones');
    });
  });
});
