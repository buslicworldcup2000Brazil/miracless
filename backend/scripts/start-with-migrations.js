#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATION_FLAG = path.join(__dirname, '..', '.migration_complete');

async function runMigrations() {
  try {
    console.log('🔍 Checking database migrations...');

    // Check if migrations were already completed
    if (fs.existsSync(MIGRATION_FLAG)) {
      console.log('✅ Database migrations already completed, skipping...');
      return;
    }

    console.log('🚀 Running database migrations...');

    // Run Prisma migrations
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    // Create flag file to indicate migrations are complete
    fs.writeFileSync(MIGRATION_FLAG, new Date().toISOString());
    console.log('✅ Database migrations completed successfully!');

    // Clean up Prisma CLI after successful migration
    try {
      execSync('npm uninstall prisma', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('🧹 Prisma CLI cleaned up');
    } catch (cleanupError) {
      console.log('⚠️  Could not clean up Prisma CLI, continuing...');
    }

  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    process.exit(1);
  }
}

async function startApplication() {
  try {
    console.log('🚀 Starting application...');

    // Start the main application
    require('../src/index.js');

  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    await runMigrations();
    await startApplication();
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

main();