const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Clean entire database respecting foreign key constraints
 * Order is critical: delete child tables before parent tables
 */
async function cleanDatabase() {
  // Level 5: Most dependent entities (leaf nodes)
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.emergency.deleteMany();
  await prisma.caseHistory.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.legalConsent.deleteMany();
  
  // Level 4: Entities with multiple dependencies
  await prisma.case.deleteMany();
  await prisma.homeless.deleteMany();
  
  // Level 3: Middle-tier entities
  await prisma.servicePoint.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.permission.deleteMany();
  
  // Level 2: Organizational structures
  await prisma.team.deleteMany();
  await prisma.zone.deleteMany();
  
  // Level 1: Users (referenced by many tables)
  await prisma.user.deleteMany();
  
  // Level 0: Root entities (no dependencies)
  await prisma.organization.deleteMany();
}

module.exports = { cleanDatabase, prisma };
