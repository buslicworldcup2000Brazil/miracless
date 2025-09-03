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

    // Ensure DATABASE_URL is available
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable is not set!');
      console.log('📋 Available environment variables:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('DB')));

      // In development/test environments, skip migrations if DB is not configured
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.log('⚠️  Skipping migrations in development/test environment');
        fs.writeFileSync(MIGRATION_FLAG, 'skipped-' + new Date().toISOString());
        return;
      }

      throw new Error('DATABASE_URL environment variable is required for migrations');
    }

    console.log('✅ DATABASE_URL is available');

    // Run Prisma migrations
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl }
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
    console.error('💡 Make sure DATABASE_URL is set in Railway environment variables');
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