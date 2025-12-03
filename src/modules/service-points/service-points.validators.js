const { z } = require('zod');

const ServicePointTypeEnum = z.enum([
    'HEALTH_CENTER',
    'REFUGE',
    'SOUP_KITCHEN',
    'SHOWER_POINT',
    'FOOD_POINT',
    'TEMP_SHELTER',
    'SOCIAL',
    'OTHER'
]);

const createServicePointSchema = z.object({
    body: z.object({
        type: ServicePointTypeEnum,
        name: z.string().min(3, 'Name must be at least 3 characters long'),
        description: z.string().optional(),
        address: z.string().min(5, 'Address must be at least 5 characters long'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        openingHours: z.string().optional(), // Could be more complex, e.g., JSON array of objects
        capacity: z.number().int().positive().optional(),
        servicesOffered: z.array(z.string()).optional(), // Array of strings, e.g., ["food", "medical help"]
        contactPhone: z.string().optional(),
        email: z.string().email('Invalid email address').optional(),
        isPublic: z.boolean().optional().default(true),
        zoneId: z.string().uuid('Invalid UUID format for zoneId').optional(),
    }),
});

const updateServicePointSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid UUID format for service point ID'),
    }),
    body: z.object({
        type: ServicePointTypeEnum.optional(),
        name: z.string().min(3, 'Name must be at least 3 characters long').optional(),
        description: z.string().optional(),
        address: z.string().min(5, 'Address must be at least 5 characters long').optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        openingHours: z.string().optional(),
        capacity: z.number().int().positive().optional(),
        servicesOffered: z.array(z.string()).optional(),
        contactPhone: z.string().optional(),
        email: z.string().email('Invalid email address').optional(),
        isPublic: z.boolean().optional(),
        zoneId: z.string().uuid('Invalid UUID format for zoneId').optional().nullable(), // Allow null to remove from zone
    }).partial(), // All fields are optional for update
});

const getServicePointsSchema = z.object({
    query: z.object({
        type: ServicePointTypeEnum.optional(),
        zoneId: z.string().uuid('Invalid UUID format for zoneId').optional(),
        isPublic: z.boolean().optional().transform(value => value === true || value === 'true'), // Handle boolean as string from query
        organizationId: z.string().uuid('Invalid UUID format for organizationId').optional(), // For global admin or public filtering
    }).partial(),
});

const getNearbyServicePointsSchema = z.object({
    query: z.object({
        latitude: z.coerce.number({ required_error: 'Latitude is required' }).min(-90).max(90),
        longitude: z.coerce.number({ required_error: 'Longitude is required' }).min(-180).max(180),
        radius: z.coerce.number().int().positive().min(1, 'Radius must be at least 1km').optional().default(10), // Radius in km
        type: ServicePointTypeEnum.optional(),
        organizationId: z.string().uuid('Invalid UUID format for organizationId').optional(),
    }),
});

const syncWithGoogleSchema = z.object({
    body: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().int().positive().default(1000),
        type: z.string().min(1, 'Type is required'),
    }),
});

module.exports = {
    createServicePointSchema,
    updateServicePointSchema,
    getServicePointsSchema,
    getNearbyServicePointsSchema,
    syncWithGoogleSchema,
};
