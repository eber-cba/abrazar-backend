/**
 * Zone Service
 * Handles geographic zones with GeoJSON polygon support and automatic case assignment
 */

const prisma = require('../../prismaClient');

class ZoneService {
  /**
   * Create a new zone
   * @param {string} orgId - Organization ID
   * @param {string} name - Zone name
   * @param {Object} polygon - GeoJSON polygon
   * @param {string} description - Zone description
   * @returns {Promise<Object>} Created zone
   */
  async createZone(orgId, name, polygon, description = null) {
    // Validate GeoJSON polygon structure
    if (!this.isValidGeoJSONPolygon(polygon)) {
      throw new Error('Invalid GeoJSON polygon structure');
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        description,
        polygon,
        organizationId: orgId,
      },
    });

    return zone;
  }

  /**
   * Update zone
   * @param {string} zoneId - Zone ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated zone
   */
  async updateZone(zoneId, data) {
    const updateData = {};

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.polygon) {
      if (!this.isValidGeoJSONPolygon(data.polygon)) {
        throw new Error('Invalid GeoJSON polygon structure');
      }
      updateData.polygon = data.polygon;
    }

    const zone = await prisma.zone.update({
      where: { id: zoneId },
      data: updateData,
    });

    return zone;
  }

  /**
   * Delete zone
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object>} Deleted zone
   */
  async deleteZone(zoneId) {
    const zone = await prisma.zone.delete({
      where: { id: zoneId },
    });

    return zone;
  }

  /**
   * Get zones by organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} List of zones
   */
  async getZonesByOrganization(orgId) {
    const zones = await prisma.zone.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: {
            cases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return zones;
  }

  /**
   * Get zone by ID
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object>} Zone
   */
  async getZoneById(zoneId) {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    return zone;
  }

  /**
   * Find zone by coordinates (point-in-polygon check)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object|null>} Zone or null
   */
  async findZoneByCoordinates(lat, lng, orgId) {
    const zones = await prisma.zone.findMany({
      where: { organizationId: orgId },
    });

    for (const zone of zones) {
      if (this.isPointInPolygon(lat, lng, zone.polygon)) {
        return zone;
      }
    }

    return null;
  }

  /**
   * Assign case to zone based on coordinates
   * @param {string} caseId - Case ID
   * @returns {Promise<Object>} Updated case with zone assignment
   */
  async assignCaseToZone(caseId) {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        lat: true,
        lng: true,
        organizationId: true,
      },
    });

    if (!caseData || !caseData.organizationId) {
      return null; // Public cases don't get zone assignment
    }

    const zone = await this.findZoneByCoordinates(
      caseData.lat,
      caseData.lng,
      caseData.organizationId
    );

    if (zone) {
      const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: { zoneId: zone.id },
      });

      return updatedCase;
    }

    return null;
  }

  /**
   * Get zone statistics
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object>} Zone statistics
   */
  async getZoneStatistics(zoneId) {
    const [totalCases, activeCases, resolvedCases, emergencyCases] =
      await Promise.all([
        prisma.case.count({ where: { zoneId } }),
        prisma.case.count({
          where: {
            zoneId,
            status: { in: ['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP'] },
          },
        }),
        prisma.case.count({
          where: { zoneId, status: 'RESOLVED' },
        }),
        prisma.case.count({
          where: { zoneId, isEmergency: true },
        }),
      ]);

    const casesByStatus = await prisma.case.groupBy({
      by: ['status'],
      where: { zoneId },
      _count: true,
    });

    return {
      totalCases,
      activeCases,
      resolvedCases,
      emergencyCases,
      casesByStatus: casesByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Validate GeoJSON polygon structure
   * @param {Object} polygon - GeoJSON polygon
   * @returns {boolean} Is valid
   */
  isValidGeoJSONPolygon(polygon) {
    if (!polygon || typeof polygon !== 'object') return false;
    if (polygon.type !== 'Polygon') return false;
    if (!Array.isArray(polygon.coordinates)) return false;
    if (polygon.coordinates.length === 0) return false;

    // Check that first ring has at least 4 points (3 + closing point)
    const firstRing = polygon.coordinates[0];
    if (!Array.isArray(firstRing) || firstRing.length < 4) return false;

    // Check that all points are [lng, lat] pairs
    for (const ring of polygon.coordinates) {
      for (const point of ring) {
        if (!Array.isArray(point) || point.length !== 2) return false;
        if (typeof point[0] !== 'number' || typeof point[1] !== 'number')
          return false;
      }
    }

    return true;
  }

  /**
   * Point-in-polygon algorithm (Ray Casting)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} polygon - GeoJSON polygon
   * @returns {boolean} Point is inside polygon
   */
  isPointInPolygon(lat, lng, polygon) {
    if (!this.isValidGeoJSONPolygon(polygon)) return false;

    // Use only the outer ring (first ring in coordinates)
    const ring = polygon.coordinates[0];
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0]; // longitude
      const yi = ring[i][1]; // latitude
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }
}

module.exports = new ZoneService();
