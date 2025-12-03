/**
 * Homeless Service
 * Handles all homeless-related business logic with multi-tenant support
 */

const prisma = require('../../prismaClient');
const { calculateDistance } = require('../../utils/geolocation');
const { logAudit } = require('../audit/audit.service');
const logger = require('../../config/logger');

class HomelessService {
  /**
   * Create a new homeless record.
   * Filters allowed fields based on user role and consent.
   * 
   * @param {Object} data - Homeless data
   * @param {string} userId - User ID creating the record
   * @param {string} organizationId - Organization ID
   * @param {string} userRole - User role (for permission checking)
   * @returns {Promise<Object>} Created homeless record
   */
  async createHomeless(data, userId, organizationId, userRole) {
    // Role-based field filtering
    const allowedFields = this.getAllowedFields(userRole, data.consentimientoVerbal);
    
    const homelessData = {
      lat: data.lat,
      lng: data.lng,
      registradoPor: userId,
      organizationId,
    };

    // Add allowed fields
    if (allowedFields.includes('nombre')) homelessData.nombre = data.nombre;
    if (allowedFields.includes('apellido')) homelessData.apellido = data.apellido;
    if (allowedFields.includes('apodo')) homelessData.apodo = data.apodo;
    if (allowedFields.includes('edad')) homelessData.edad = data.edad;
    if (allowedFields.includes('estadoFisico')) homelessData.estadoFisico = data.estadoFisico;
    if (allowedFields.includes('adicciones')) homelessData.adicciones = data.adicciones;
    if (allowedFields.includes('estadoMental')) homelessData.estadoMental = data.estadoMental;
    if (allowedFields.includes('atencionMedicaUrgente')) homelessData.atencionMedicaUrgente = data.atencionMedicaUrgente || false;
    if (allowedFields.includes('fotoUrl')) homelessData.fotoUrl = data.fotoUrl;
    if (allowedFields.includes('ultimaVezVisto')) homelessData.ultimaVezVisto = data.ultimaVezVisto || new Date();
    if (allowedFields.includes('consentimientoVerbal')) homelessData.consentimientoVerbal = data.consentimientoVerbal || false;

    const homeless = await prisma.homeless.create({
      data: homelessData,
      include: {
        registrador: {
          select: { id: true, email: true, name: true },
        },
        organization: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    // Log audit
    await logAudit(userId, 'create_homeless', 'homeless', homeless.id);
    logger.info(`Homeless record created: ${homeless.id} by user ${userId}`);

    return homeless;
  }

  /**
   * Get all homeless records with multi-tenant filtering.
   * 
   * @param {Object} filters - Query filters (consent, urgency, date range)
   * @param {string} organizationId - Organization ID
   * @param {string} userRole - User role
   * @returns {Promise<Array>} List of homeless records
   */
  async getAllHomeless(filters, organizationId, userRole) {
    const where = { organizationId };

    // Filter by consent if needed
    if (filters.consentimientoVerbal !== undefined) {
      where.consentimientoVerbal = filters.consentimientoVerbal === 'true';
    }

    // Filter by urgent medical attention
    if (filters.atencionMedicaUrgente !== undefined) {
      where.atencionMedicaUrgente = filters.atencionMedicaUrgente === 'true';
    }

    // Filter by registrador
    if (filters.registradoPor) {
      where.registradoPor = filters.registradoPor;
    }

    // Date range filter
    if (filters.desde || filters.hasta) {
      where.ultimaVezVisto = {};
      if (filters.desde) where.ultimaVezVisto.gte = new Date(filters.desde);
      if (filters.hasta) where.ultimaVezVisto.lte = new Date(filters.hasta);
    }

    const homeless = await prisma.homeless.findMany({
      where,
      include: {
        registrador: {
          select: { id: true, email: true, name: true },
        },
        organization: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [
        { atencionMedicaUrgente: 'desc' },
        { ultimaVezVisto: 'desc' },
      ],
    });

    return homeless;
  }

  /**
   * Get homeless by ID.
   * Ensures the record belongs to the user's organization.
   * 
   * @param {string} id - Homeless ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Homeless record
   * @throws {Error} If record not found
   */
  async getHomelessById(id, organizationId) {
    const homeless = await prisma.homeless.findFirst({
      where: { id, organizationId },
      include: {
        registrador: {
          select: { id: true, email: true, name: true, role: true },
        },
        organization: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!homeless) {
      throw new Error('Homeless record not found');
    }

    return homeless;
  }

  /**
   * Update homeless record.
   * Filters allowed fields based on user role.
   * 
   * @param {string} id - Homeless ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID updating
   * @param {string} organizationId - Organization ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Updated record
   */
  async updateHomeless(id, data, userId, organizationId, userRole) {
    // Verify ownership
    const existing = await this.getHomelessById(id, organizationId);

    // Role-based field filtering
    const allowedFields = this.getAllowedFields(userRole, data.consentimientoVerbal || existing.consentimientoVerbal);
    
    const updateData = {};

    // Update allowed fields
    if (data.nombre !== undefined && allowedFields.includes('nombre')) updateData.nombre = data.nombre;
    if (data.apellido !== undefined && allowedFields.includes('apellido')) updateData.apellido = data.apellido;
    if (data.apodo !== undefined && allowedFields.includes('apodo')) updateData.apodo = data.apodo;
    if (data.edad !== undefined && allowedFields.includes('edad')) updateData.edad = data.edad;
    if (data.estadoFisico !== undefined && allowedFields.includes('estadoFisico')) updateData.estadoFisico = data.estadoFisico;
    if (data.adicciones !== undefined && allowedFields.includes('adicciones')) updateData.adicciones = data.adicciones;
    if (data.estadoMental !== undefined && allowedFields.includes('estadoMental')) updateData.estadoMental = data.estadoMental;
    if (data.atencionMedicaUrgente !== undefined && allowedFields.includes('atencionMedicaUrgente')) updateData.atencionMedicaUrgente = data.atencionMedicaUrgente;
    if (data.lat !== undefined && allowedFields.includes('lat')) updateData.lat = data.lat;
    if (data.lng !== undefined && allowedFields.includes('lng')) updateData.lng = data.lng;
    if (data.fotoUrl !== undefined && allowedFields.includes('fotoUrl')) updateData.fotoUrl = data.fotoUrl;
    if (data.ultimaVezVisto !== undefined && allowedFields.includes('ultimaVezVisto')) updateData.ultimaVezVisto = new Date(data.ultimaVezVisto);
    if (data.consentimientoVerbal !== undefined && allowedFields.includes('consentimientoVerbal')) updateData.consentimientoVerbal = data.consentimientoVerbal;

    const updated = await prisma.homeless.update({
      where: { id },
      data: updateData,
      include: {
        registrador: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Log audit
    await logAudit(userId, 'update_homeless', 'homeless', id, updateData);
    logger.info(`Homeless record updated: ${id} by user ${userId}`);

    return updated;
  }

  /**
   * Delete homeless record.
   * 
   * @param {string} id - Homeless ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteHomeless(id, organizationId) {
    // Verify ownership
    await this.getHomelessById(id, organizationId);

    await prisma.homeless.delete({
      where: { id },
    });

    logger.info(`Homeless record deleted: ${id}`);
  }

  /**
   * Get nearby service points for a homeless person.
   * 
   * @param {string} homelessId - Homeless ID
   * @param {string} organizationId - Organization ID
   * @param {number} radiusKm - Search radius in kilometers (default 5)
   * @returns {Promise<Array>} List of nearby service points with distance
   */
  async getNearbyServicePoints(homelessId, organizationId, radiusKm = 5) {
    const homeless = await this.getHomelessById(homelessId, organizationId);

    // Get all service points for the organization
    const servicePoints = await prisma.servicePoint.findMany({
      where: { organizationId },
      include: {
        zone: {
          select: { id: true, name: true },
        },
      },
    });

    // Calculate distances and filter by radius
    const nearby = servicePoints
      .map(sp => ({
        ...sp,
        distance: calculateDistance(
          homeless.lat,
          homeless.lng,
          sp.latitude,
          sp.longitude
        ),
      }))
      .filter(sp => sp.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    logger.info(`Found ${nearby.length} service points within ${radiusKm}km of homeless ${homelessId}`);

    return nearby;
  }

  /**
   * Get allowed fields based on role and consent.
   * 
   * @param {string} userRole - User role
   * @param {boolean} hasConsent - Whether consent is given
   * @returns {Array<string>} List of allowed fields
   */
  getAllowedFields(userRole, hasConsent) {
    const baseFields = ['lat', 'lng', 'apodo', 'fotoUrl', 'ultimaVezVisto'];
    
    // Volunteers can only submit basic fields
    if (userRole === 'VOLUNTEER') {
      return baseFields;
    }

    // Coordinators and above can submit all fields
    const allFields = [
      ...baseFields,
      'nombre',
      'apellido',
      'edad',
      'estadoFisico',
      'adicciones',
      'estadoMental',
      'atencionMedicaUrgente',
      'consentimientoVerbal',
    ];

    // If no consent, sensitive fields are not allowed
    if (!hasConsent) {
      return baseFields.concat(['atencionMedicaUrgente', 'consentimientoVerbal']);
    }

    return allFields;
  }
}

module.exports = new HomelessService();
