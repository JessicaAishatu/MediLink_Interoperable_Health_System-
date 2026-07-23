// Basic backend linting and integration verification script
const express = require('express');
const db = require('../config/db');

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');
  
  try {
    // 1. Test database connection
    console.log('Testing MySQL database connection...');
    const [result] = await db.query('SELECT 1 + 1 AS test');
    if (result[0].test === 2) {
      console.log('✓ Database connection check passed.');
    } else {
      throw new Error('Database connection returned invalid result');
    }

    // 2. Validate tables exist
    console.log('Checking existence of schema tables...');
    const [tables] = await db.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    console.log('Found tables in database:', tableNames);
    
    const requiredTables = ['users', 'patients', 'doctors', 'appointments', 'medical_histories', 'lab_results', 'prescriptions'];
    const missingTables = requiredTables.filter(tab => !tableNames.includes(tab));

    if (missingTables.length === 0) {
      console.log('✓ All required tables are present.');
    } else {
      console.warn('⚠️ Missing tables: ', missingTables);
      console.log('Make sure to run: npm run db:setup');
    }

    // 3. Test user fetch query
    console.log('Testing basic queries...');
    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`✓ Query test: found ${users[0].count} users registered.`);

    console.log('--- BACKEND INTEGRATION TESTS COMPLETED SUCCESSFULLY ---');
    process.exit(0);

  } catch (error) {
    console.error('❌ INTEGRATION TEST FAILED:', error.message);
    console.log('Verify MySQL is running and credentials in .env are correct.');
    process.exit(1);
  }
}

// Only run if triggered directly
if (require.main === module) {
  runTests();
}
