const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Seed default permissions and role mappings
 */
async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  // Define all permissions
  const permissions = [
    // Cases
    { name: 'cases:create', description: 'Create new cases', resource: 'cases', action: 'create' },
    { name: 'cases:read', description: 'View cases', resource: 'cases', action: 'read' },
    { name: 'cases:update', description: 'Update cases', resource: 'cases', action: 'update' },
    { name: 'cases:delete', description: 'Delete cases', resource: 'cases', action: 'delete' },
    { name: 'cases:assign', description: 'Assign cases to users/teams', resource: 'cases', action: 'assign' },
    
    // Users
    { name: 'users:create', description: 'Create new users', resource: 'users', action: 'create' },
    { name: 'users:read', description: 'View users', resource: 'users', action: 'read' },
    { name: 'users:update', description: 'Update users', resource: 'users', action: 'update' },
    { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },
    
    // Teams
    { name: 'teams:create', description: 'Create teams', resource: 'teams', action: 'create' },
    { name: 'teams:read', description: 'View teams', resource: 'teams', action: 'read' },
    { name: 'teams:update', description: 'Update teams', resource: 'teams', action: 'update' },
    { name: 'teams:delete', description: 'Delete teams', resource: 'teams', action: 'delete' },
    { name: 'teams:manage', description: 'Manage team members', resource: 'teams', action: 'manage' },
    
    // Organizations
    { name: 'organizations:create', description: 'Create organizations', resource: 'organizations', action: 'create' },
    { name: 'organizations:read', description: 'View organizations', resource: 'organizations', action: 'read' },
    { name: 'organizations:update', description: 'Update organizations', resource: 'organizations', action: 'update' },
    { name: 'organizations:delete', description: 'Delete organizations', resource: 'organizations', action: 'delete' },
    
    // Service Points
    { name: 'service-points:create', description: 'Create service points', resource: 'service-points', action: 'create' },
    { name: 'service-points:read', description: 'View service points', resource: 'service-points', action: 'read' },
    { name: 'service-points:update', description: 'Update service points', resource: 'service-points', action: 'update' },
    { name: 'service-points:delete', description: 'Delete service points', resource: 'service-points', action: 'delete' },
    
    // Analytics
    { name: 'analytics:view', description: 'View analytics and statistics', resource: 'analytics', action: 'view' },
    
    // Audit Logs
    { name: 'audit:read', description: 'View audit logs', resource: 'audit', action: 'read' },
  ];

  // Create permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      create: perm,
      update: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Define role-permission mappings
  const rolePermissions = {
    ADMIN: [
      // Full access to everything
      ...permissions.map(p => p.name),
    ],
    ORGANIZATION_ADMIN: [
      'cases:create', 'cases:read', 'cases:update', 'cases:assign',
      'users:create', 'users:read', 'users:update',
      'teams:create', 'teams:read', 'teams:update', 'teams:manage',
      'service-points:create', 'service-points:read', 'service-points:update', 'service-points:delete',
      'analytics:view',
      'audit:read',
    ],
    COORDINATOR: [
      'cases:create', 'cases:read', 'cases:update', 'cases:assign',
      'users:read',
      'teams:read', 'teams:update', 'teams:manage',
      'service-points:read',
      'analytics:view',
    ],
    SOCIAL_WORKER: [
      'cases:create', 'cases:read', 'cases:update',
      'users:read',
      'teams:read',
      'service-points:read',
    ],
    VOLUNTEER: [
      'cases:read',
      'service-points:read',
    ],
    DATA_ANALYST: [
      'cases:read',
      'users:read',
      'teams:read',
      'service-points:read',
      'analytics:view',
      'audit:read',
    ],
    OPERATOR: [
      'cases:create', 'cases:read', 'cases:update',
      'service-points:read',
    ],
    PUBLIC: [
      'service-points:read',
    ],
  };

  // Assign permissions to roles
  for (const [role, permNames] of Object.entries(rolePermissions)) {
    for (const permName of permNames) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role,
              permissionId: permission.id,
            },
          },
          create: {
            role,
            permissionId: permission.id,
          },
          update: {},
        });
      }
    }
    console.log(`✅ Assigned ${permNames.length} permissions to ${role}`);
  }

  console.log('🎉 Permission seeding complete!');
}

// Run if called directly
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = seedPermissions;
