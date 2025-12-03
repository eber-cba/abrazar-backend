#!/usr/bin/env node
/**
 * Database Backup Script
 * Creates a backup of the PostgreSQL database before major migrations
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupDir = path.join(__dirname, '..', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Database connection from .env
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@127.0.0.1:5433/abrazar_db';

console.log('🔄 Creating database backup...');
console.log(`📁 Backup file: ${backupFile}`);

const command = `pg_dump "${dbUrl}" -f "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
  
  if (stderr) {
    console.warn('⚠️  Warning:', stderr);
  }
  
  console.log('✅ Database backup created successfully!');
  console.log(`📊 Backup size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
});
