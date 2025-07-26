#!/usr/bin/env node

// Database connectivity check script
// Used by monitoring script to verify database connection

import { db } from '../server/db.js';

async function checkDatabase() {
  try {
    // Simple query to test database connectivity
    await db.execute('SELECT 1 as test');
    console.log('Database connection: OK');
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

checkDatabase();