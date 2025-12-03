/**
 * Service Point Service
 * Handles business logic for service points (health centers, refuges, etc.)
 */

const prisma = require('../../prismaClient');
const { logAudit } = require('../audit/audit.service');
const AppError = require('../../utils/errors');
const googlePlacesService = require('../../services/googlePlaces.service');

class ServicePointService {
  /**
   * Create a new service point
   * @param {Object} data - Service point data
   * @param {string} userId - ID of the user creating the service point
   * @param {string} organizationId - Organization ID of the user creating the service point
   */
  async createServicePoint(data, userId, organizationId) {
    const servicePoint = await prisma.servicePoint.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        openingHours: data.openingHours,
        capacity: data.capacity,
        servicesOffered: data.servicesOffered || [], // Store as JSONB
        contactPhone: data.contactPhone,
        email: data.email,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        organizationId: organizationId, // Enforced by multi-tenant middleware
        zoneId: data.zoneId,
      },
    });

    // Log audit
    await logAudit(
      userId,
      'create_service_point',
      'service_point',
      servicePoint.id,
      { name: servicePoint.name, type: servicePoint.type, organizationId },
      null // IP address is usually handled by a higher-level middleware
    );

    return servicePoint;
  }

  /**
   * Get all service points with filtering
   * @param {Object} filters - Filter options
   * @param {string} userOrganizationId - ID of the user's organization for multi-tenant filtering
   * @param {boolean} isGlobalAdmin - Flag indicating if the user is a global admin
   */
  async getServicePoints(filters, userOrganizationId = null, isGlobalAdmin = false) {
    const where = {};

    // Multi-tenant filtering logic
    if (filters.isPublic) {
      // Public view: show only public points
      where.isPublic = true;
      // Optional: filter by organization if provided in query for public points
      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }
    } else if (!isGlobalAdmin) {
      // Internal view for non-admin users: restrict to their organization
      if (userOrganizationId) {
        where.organizationId = userOrganizationId;
      } else {
        // Fallback for authenticated users without an organization (e.g., PUBLIC role users trying to access internal list)
        // Should ideally be caught by middleware (e.g., requireOrganization), but as a safeguard:
        where.isPublic = true;
      }
    } else {
      // Global admin: can see all, or filter by specific organization if requested
      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }
    }

    // Additional filters
    if (filters.type) where.type = filters.type;
    if (filters.zoneId) where.zoneId = filters.zoneId;

    const servicePoints = await prisma.servicePoint.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, type: true },
        },
        zone: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return servicePoints;
  }

  /**
   * Get service point by ID
   * @param {string} id - Service point ID
   */
  async getServicePointById(id) {
    const servicePoint = await prisma.servicePoint.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, type: true, contactPhone: true, contactEmail: true },
        },
        zone: {
          select: { id: true, name: true },
        },
      },
    });
    return servicePoint;
  }

  /**
   * Update service point
   * @param {string} id - Service point ID
   * @param {Object} data - Update data
   * @param {string} userId - ID of the user updating the service point
   */
  async updateServicePoint(id, data, userId) {
    const updateData = {
      type: data.type,
      name: data.name,
      description: data.description,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      openingHours: data.openingHours,
      capacity: data.capacity,
      servicesOffered: data.servicesOffered,
      contactPhone: data.contactPhone,
      email: data.email,
      isPublic: data.isPublic,
      zoneId: data.zoneId,
    };

    // Remove undefined fields so Prisma doesn't try to update them to null
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const servicePoint = await prisma.servicePoint.update({
      where: { id },
      data: updateData,
    });

    await logAudit(
      userId,
      'update_service_point',
      'service_point',
      id,
      updateData
    );

    return servicePoint;
  }

  /**
   * Delete service point
   * @param {string} id - Service point ID
   * @param {string} userId - ID of the user deleting the service point
   */
  async deleteServicePoint(id, userId) {
    await prisma.servicePoint.delete({
      where: { id },
    });

    await logAudit(
      userId,
      'delete_service_point',
      'service_point',
      id
    );
  }

  /**
   * Find nearby service points
   * @param {number} latitude - Latitude of the origin
   * @param {number} longitude - Longitude of the origin
   * @param {number} radiusKm - Search radius in kilometers
   * @param {Object} filters - Additional filters (type, organizationId)
   */
  async getNearbyServicePoints(latitude, longitude, radiusKm, filters = {}) {
    // This is a basic bounding box approach, not true geodesic distance
    // For production, consider PostGIS or a dedicated geo-spatial library
    const latDelta = radiusKm / 111.0; // ~111 km per degree latitude
    const lngDelta = radiusKm / (111.0 * Math.cos(latitude * (Math.PI / 180.0))); // Adjust for longitude distortion

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    const where = {
      isPublic: true, // Only public service points are discoverable by 'nearby'
      latitude: {
        gte: minLat,
        lte: maxLat,
      },
      longitude: {
        gte: minLng,
        lte: maxLng,
      },
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    const servicePoints = await prisma.servicePoint.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, type: true },
        },
        zone: {
          select: { id: true, name: true },
        },
      },
    });

    // Optionally, further filter by actual geodesic distance here if the bounding box is too coarse
    // (e.g., using a haversine formula if not using PostGIS)
    return servicePoints;
  }

  /**
   * Sync service points with Google Places
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Radius in meters
   * @param {string} type - Google Place type
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   */
  async syncWithGoogle(lat, lng, radius, type, userId, organizationId) {
    const places = await googlePlacesService.searchNearbyPlaces(lat, lng, radius, type);
    
    let createdCount = 0;
    const createdPoints = [];

    for (const place of places) {
      const existing = await prisma.servicePoint.findFirst({
        where: {
          organizationId,
          name: place.name,
          latitude: { gte: place.latitude - 0.0005, lte: place.latitude + 0.0005 },
          longitude: { gte: place.longitude - 0.0005, lte: place.longitude + 0.0005 },
        },
      });

      if (!existing) {
        const newPoint = await this.createServicePoint(
          { ...place, zoneId: null, isPublic: true },
          userId,
          organizationId
        );
        createdCount++;
        createdPoints.push(newPoint);
      }
    }

    return { count: createdCount, points: createdPoints };
  }
}
module.exports = new ServicePointService();
