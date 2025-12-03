/**
 * Team Service
 * Handles team management, member assignment, and team-based permissions
 */

const prisma = require('../../prismaClient');

class TeamService {
  /**
   * Create a new team
   * @param {string} orgId - Organization ID
   * @param {string} name - Team name
   * @param {string} description - Team description
   * @returns {Promise<Object>} Created team
   */
  async createTeam(orgId, name, description = null) {
    const team = await prisma.team.create({
      data: {
        name,
        description,
        organizationId: orgId,
      },
    });

    return team;
  }

  /**
   * Update team
   * @param {string} teamId - Team ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated team
   */
  async updateTeam(teamId, data) {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    return team;
  }

  /**
   * Delete team
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Deleted team
   */
  async deleteTeam(teamId) {
    const team = await prisma.team.delete({
      where: { id: teamId },
    });

    return team;
  }

  /**
   * Get teams by organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} List of teams
   */
  async getTeamsByOrganization(orgId) {
    const teams = await prisma.team.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: {
            members: true,
            assignedCases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams;
  }

  /**
   * Get team by ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Team
   */
  async getTeamById(teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedCases: true,
          },
        },
      },
    });

    return team;
  }

  /**
   * Add team member
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {string} roleInTeam - Role in team (LEADER, COORDINATOR, VOLUNTEER)
   * @returns {Promise<Object>} Created team member
   */
  async addTeamMember(teamId, userId, roleInTeam = 'VOLUNTEER') {
    // Verify user belongs to same organization as team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!team || !user) {
      throw new Error('Team or user not found');
    }

    if (team.organizationId !== user.organizationId) {
      throw new Error('User must belong to the same organization as the team');
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        roleInTeam,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return teamMember;
  }

  /**
   * Remove team member
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deleted team member
   */
  async removeTeamMember(teamId, userId) {
    const teamMember = await prisma.teamMember.deleteMany({
      where: {
        teamId,
        userId,
      },
    });

    return teamMember;
  }

  /**
   * Update member role
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {string} newRole - New role in team
   * @returns {Promise<Object>} Updated team member
   */
  async updateMemberRole(teamId, userId, newRole) {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!teamMember) {
      throw new Error('Team member not found');
    }

    const updated = await prisma.teamMember.update({
      where: { id: teamMember.id },
      data: { roleInTeam: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Get team members
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} List of team members
   */
  async getTeamMembers(teamId) {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  /**
   * Assign case to team
   * @param {string} caseId - Case ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Updated case
   */
  async assignCaseToTeam(caseId, teamId) {
    // Verify case and team belong to same organization
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { organizationId: true },
    });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    });

    if (!caseData || !team) {
      throw new Error('Case or team not found');
    }

    if (caseData.organizationId !== team.organizationId) {
      throw new Error('Case and team must belong to the same organization');
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: { assignedToTeamId: teamId },
    });

    return updatedCase;
  }

  /**
   * Get team statistics
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Team statistics
   */
  async getTeamStatistics(teamId) {
    const [totalMembers, totalCases, activeCases, resolvedCases] =
      await Promise.all([
        prisma.teamMember.count({ where: { teamId } }),
        prisma.case.count({ where: { assignedToTeamId: teamId } }),
        prisma.case.count({
          where: {
            assignedToTeamId: teamId,
            status: { in: ['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP'] },
          },
        }),
        prisma.case.count({
          where: { assignedToTeamId: teamId, status: 'RESOLVED' },
        }),
      ]);

    return {
      totalMembers,
      totalCases,
      activeCases,
      resolvedCases,
    };
  }

  /**
   * Get user's teams
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of teams user belongs to
   */
  async getUserTeams(userId) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
                assignedCases: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.team,
      roleInTeam: m.roleInTeam,
      joinedAt: m.joinedAt,
    }));
  }
}

module.exports = new TeamService();
