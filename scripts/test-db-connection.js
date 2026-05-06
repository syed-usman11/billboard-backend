#!/usr/bin/env node

/**
 * Database Connection Test Script
 *
 * Tests the connection to AWS Aurora using the current DATABASE_URL in .env
 * Usage: npm run db:test
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env');
    console.error('   Run: npm run db:token');
    process.exit(1);
  }

  // Show masked URL for security
  const url = process.env.DATABASE_URL;
  const masked = url.replace(/:(.+?)@/, ':***@');
  console.log('📍 Connection:', masked.substring(0, 100) + '...\n');

  const prisma = new PrismaClient();

  try {
    console.log('🔄 Connecting...');
    await prisma.$connect();
    console.log('✅ Connected successfully!\n');

    console.log('🔄 Running test query...');
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Query successful!');
    console.log('📊 PostgreSQL version:', result[0].version.substring(0, 80));

    console.log('\n🎉 Database connection works perfectly!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);

    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Hint: Token may be expired. Run: npm run db:token');
    } else if (error.message.includes('connect ECONNREFUSED')) {
      console.error('\n💡 Hint: Check security group allows your IP');
    } else if (error.message.includes('SSL')) {
      console.error('\n💡 Hint: SSL configuration issue, check connection string');
    }

    process.exit(1);
  }
}

testConnection();
