/**
 * Homeless Validator
 * Zod schemas for request validation
 */

const { z } = require('zod');

// Create homeless schema
const createHomelessSchema = z.object({
  body: z.object({
    // Required fields
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    
    // Optional basic fields
    apodo: z.string().optional(),
    fotoUrl: z.string().url().optional(),
    ultimaVezVisto: z.string().datetime().optional(),
    
    // Optional sensitive fields (require consent or COORDINATOR role)
    nombre: z.string().optional(),
    apellido: z.string().optional(),
    edad: z.coerce.number().int().min(0).max(150).optional(),
    estadoFisico: z.string().optional(),
    adicciones: z.string().optional(),
    estadoMental: z.string().optional(),
    atencionMedicaUrgente: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    consentimientoVerbal: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
  }),
});

// Update homeless schema
const updateHomelessSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    apodo: z.string().optional(),
    fotoUrl: z.string().url().optional(),
    ultimaVezVisto: z.string().datetime().optional(),
    nombre: z.string().optional(),
    apellido: z.string().optional(),
    edad: z.coerce.number().int().min(0).max(150).optional(),
    estadoFisico: z.string().optional(),
    adicciones: z.string().optional(),
    estadoMental: z.string().optional(),
    atencionMedicaUrgente: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    consentimientoVerbal: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
  }),
});

// Get homeless by ID schema
const getHomelessByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Get nearby services schema
const getNearbyServicesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    radius: z.string().optional().transform(val => val ? parseFloat(val) : 5),
  }),
});

// List homeless schema
const listHomelessSchema = z.object({
  query: z.object({
    consentimientoVerbal: z.enum(['true', 'false']).optional(),
    atencionMedicaUrgente: z.enum(['true', 'false']).optional(),
    registradoPor: z.string().uuid().optional(),
    desde: z.string().datetime().optional(),
    hasta: z.string().datetime().optional(),
  }),
});

/**
 * Validate request middleware
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Apply transformations back to req
      req.body = result.body;
      req.query = result.query;
      req.params = result.params;
      
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.errors,
      });
    }
  };
};

module.exports = {
  createHomelessSchema,
  updateHomelessSchema,
  getHomelessByIdSchema,
  getNearbyServicesSchema,
  listHomelessSchema,
  validate,
};
