/**
 * Permission Service Unit Tests
 */

const permissionService = require('../../src/services/permission.service');
const prisma = require('../../src/prismaClient');

// Mock Prisma
jest.mock('../../src/prismaClient', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  case: {
    findUnique: jest.fn(),
  },
  team: {
    findUnique: jest.fn(),
  },
  teamMember: {
    findFirst: jest.fn(),
  },
}));

describe('PermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canViewCase', () => {
    it('should allow global admin to view any case', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        organizationId: null,
      });

      const result = await permissionService.canViewCase('user1', 'case1');
      expect(result).toBe(true);
    });

    it('should allow organization member to view case in their organization', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'COORDINATOR',
        organizationId: 'org1',
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: 'org1',
        createdBy: 'user2',
      });

      const result = await permissionService.canViewCase('user1', 'case1');
      expect(result).toBe(true);
    });

    it('should deny access to case from different organization', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'COORDINATOR',
        organizationId: 'org1',
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: 'org2',
        createdBy: 'user2',
      });

      const result = await permissionService.canViewCase('user1', 'case1');
      expect(result).toBe(false);
    });

    it('should allow public user to view their own case', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'PUBLIC',
        organizationId: null,
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: null,
        createdBy: 'user1',
      });

      const result = await permissionService.canViewCase('user1', 'case1');
      expect(result).toBe(true);
    });
  });

  describe('canEditCase', () => {
    it('should allow organization admin to edit cases in their organization', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'ORGANIZATION_ADMIN',
        organizationId: 'org1',
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: 'org1',
        createdBy: 'user2',
        assignedToUserId: null,
      });

      const result = await permissionService.canEditCase('user1', 'case1');
      expect(result).toBe(true);
    });

    it('should allow assigned user to edit their case', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'VOLUNTEER',
        organizationId: 'org1',
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: 'org1',
        createdBy: 'user2',
        assignedToUserId: 'user1',
      });

      const result = await permissionService.canEditCase('user1', 'case1');
      expect(result).toBe(true);
    });

    it('should deny volunteer from editing unassigned case', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'VOLUNTEER',
        organizationId: 'org1',
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: 'org1',
        createdBy: 'user2',
        assignedToUserId: null,
      });

      const result = await permissionService.canEditCase('user1', 'case1');
      expect(result).toBe(false);
    });
  });

  describe('canAssignCase', () => {
    it('should allow coordinator to assign cases', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'COORDINATOR',
        organizationId: 'org1',
      });

      prisma.case.findUnique.mockResolvedValue({
        organizationId: 'org1',
      });

      const result = await permissionService.canAssignCase('user1', 'case1');
      expect(result).toBe(true);
    });

    it('should deny volunteer from assigning cases', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'VOLUNTEER',
        organizationId: 'org1',
      });

      const result = await permissionService.canAssignCase('user1', 'case1');
      expect(result).toBe(false);
    });
  });

  describe('canManageTeam', () => {
    it('should allow organization admin to manage teams', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'ORGANIZATION_ADMIN',
        organizationId: 'org1',
      });

      prisma.team.findUnique.mockResolvedValue({
        organizationId: 'org1',
      });

      const result = await permissionService.canManageTeam('user1', 'team1');
      expect(result).toBe(true);
    });

    it('should allow team leader to manage their team', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'VOLUNTEER',
        organizationId: 'org1',
      });

      prisma.team.findUnique.mockResolvedValue({
        organizationId: 'org1',
      });

      prisma.teamMember.findFirst.mockResolvedValue({
        teamId: 'team1',
        userId: 'user1',
        roleInTeam: 'LEADER',
      });

      const result = await permissionService.canManageTeam('user1', 'team1');
      expect(result).toBe(true);
    });
  });

  describe('canViewStatistics', () => {
    it('should allow organization admin to view statistics', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'ORGANIZATION_ADMIN',
        organizationId: 'org1',
      });

      const result = await permissionService.canViewStatistics('user1', 'org1');
      expect(result).toBe(true);
    });

    it('should allow data analyst to view statistics', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'DATA_ANALYST',
        organizationId: 'org1',
      });

      const result = await permissionService.canViewStatistics('user1', 'org1');
      expect(result).toBe(true);
    });

    it('should deny volunteer from viewing statistics', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'VOLUNTEER',
        organizationId: 'org1',
      });

      const result = await permissionService.canViewStatistics('user1', 'org1');
      expect(result).toBe(false);
    });
  });

  describe('verifyOrganizationAccess', () => {
    it('should allow access to same organization', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'COORDINATOR',
        organizationId: 'org1',
      });

      const result = await permissionService.verifyOrganizationAccess('user1', 'org1');
      expect(result).toBe(true);
    });

    it('should deny access to different organization', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'COORDINATOR',
        organizationId: 'org1',
      });

      const result = await permissionService.verifyOrganizationAccess('user1', 'org2');
      expect(result).toBe(false);
    });

    it('should deny public user access to organization data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'PUBLIC',
        organizationId: null,
      });

      const result = await permissionService.verifyOrganizationAccess('user1', 'org1');
      expect(result).toBe(false);
    });
  });
});
