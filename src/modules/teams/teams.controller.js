/**
 * Teams Controller
 */

const teamService = require('./team.service');
const { logTeamAction } = require('../audit/audit.service');

class TeamsController {
  async createTeam(req, res, next) {
    try {
      const { name, description } = req.body;
      const orgId = req.organizationId;

      const team = await teamService.createTeam(orgId, name, description);

      await logTeamAction(req.user.id, 'create_team', team.id, { name }, req.ip);

      res.status(201).json({
        status: 'success',
        data: { team },
      });
    } catch (error) {
      next(error);
    }
  }

  async listTeams(req, res, next) {
    try {
      const orgId = req.organizationId;
      const teams = await teamService.getTeamsByOrganization(orgId);

      res.status(200).json({
        status: 'success',
        results: teams.length,
        data: { teams },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTeam(req, res, next) {
    try {
      const { id } = req.params;
      const team = await teamService.getTeamById(id);

      if (!team) {
        return res.status(404).json({
          status: 'fail',
          message: 'Team not found',
        });
      }

      res.status(200).json({
        status: 'success',
        data: { team },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTeam(req, res, next) {
    try {
      const { id } = req.params;
      const team = await teamService.updateTeam(id, req.body);

      await logTeamAction(req.user.id, 'update_team', id, req.body, req.ip);

      res.status(200).json({
        status: 'success',
        data: { team },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTeam(req, res, next) {
    try {
      const { id } = req.params;
      await teamService.deleteTeam(id);

      await logTeamAction(req.user.id, 'delete_team', id, null, req.ip);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const { id } = req.params;
      const { userId, roleInTeam } = req.body;

      const member = await teamService.addTeamMember(id, userId, roleInTeam);

      await logTeamAction(req.user.id, 'add_team_member', id, { userId, roleInTeam }, req.ip);

      res.status(201).json({
        status: 'success',
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const { id, userId } = req.params;
      await teamService.removeTeamMember(id, userId);

      await logTeamAction(req.user.id, 'remove_team_member', id, { userId }, req.ip);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req, res, next) {
    try {
      const { id, userId } = req.params;
      const { roleInTeam } = req.body;

      const member = await teamService.updateMemberRole(id, userId, roleInTeam);

      await logTeamAction(req.user.id, 'update_member_role', id, { userId, roleInTeam }, req.ip);

      res.status(200).json({
        status: 'success',
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req, res, next) {
    try {
      const { id } = req.params;
      const members = await teamService.getTeamMembers(id);

      res.status(200).json({
        status: 'success',
        results: members.length,
        data: { members },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const { id } = req.params;
      const statistics = await teamService.getTeamStatistics(id);

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TeamsController();
