#!/usr/bin/env node

/**
 * IAM Token Refresh Script for AWS Aurora
 *
 * This script generates a fresh IAM authentication token from AWS
 * and updates the .env file with the new token.
 *
 * Usage:
 *   node scripts/refresh-iam-token.js
 *
 * Run this BEFORE starting the backend to ensure a fresh token.
 * Tokens are valid for 15 minutes.
 */

const { Signer } = require('@aws-sdk/rds-signer');
const fs = require('fs');
const path = require('path');

// AWS Configuration - Loaded from environment or defaults
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const DB_HOSTNAME = process.env.DB_HOSTNAME || 'database-1.cluster-c1sou4002jiw.ap-south-1.rds.amazonaws.com';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_NAME = process.env.DB_NAME || 'postgres';

const ENV_FILE_PATH = path.join(__dirname, '..', '.env');

async function generateToken() {
  console.log('🔄 Generating fresh IAM authentication token...');

  const signer = new Signer({
    region: AWS_REGION,
    hostname: DB_HOSTNAME,
    port: parseInt(DB_PORT),
    username: DB_USERNAME,
  });

  try {
    const token = await signer.getAuthToken();
    console.log('✅ Token generated successfully (valid for 15 minutes)');
    return token;
  } catch (error) {
    console.error('❌ Failed to generate token:', error.message);

    if (error.message.includes('credentials')) {
      console.error('\n💡 Hint: Make sure AWS credentials are configured:');
      console.error('   Run: aws configure');
      console.error('   Or set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars');
    }

    throw error;
  }
}

function urlEncodeToken(token) {
  // The token contains special characters that need URL encoding
  // when used as a password in a connection string
  return encodeURIComponent(token);
}

function updateEnvFile(token) {
  console.log('📝 Updating .env file...');

  if (!fs.existsSync(ENV_FILE_PATH)) {
    console.error('❌ .env file not found at:', ENV_FILE_PATH);
    process.exit(1);
  }

  let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');

  // Encode the token for URL safety
  const encodedToken = urlEncodeToken(token);

  // Build new DATABASE_URL
  const newDatabaseUrl = `DATABASE_URL="postgresql://${DB_USERNAME}:${encodedToken}@${DB_HOSTNAME}:${DB_PORT}/${DB_NAME}?sslmode=require"`;

  // Replace existing DATABASE_URL line
  const databaseUrlRegex = /^DATABASE_URL=.*/m;

  if (databaseUrlRegex.test(envContent)) {
    envContent = envContent.replace(databaseUrlRegex, newDatabaseUrl);
  } else {
    envContent = newDatabaseUrl + '\n' + envContent;
  }

  fs.writeFileSync(ENV_FILE_PATH, envContent, 'utf8');
  console.log('✅ .env file updated with fresh token');
  console.log(`📍 Database: ${DB_NAME} on ${DB_HOSTNAME}`);
}

async function main() {
  console.log('🚀 AWS Aurora IAM Token Refresh');
  console.log('================================\n');

  try {
    const token = await generateToken();
    updateEnvFile(token);

    console.log('\n🎉 Done! Token will expire in 15 minutes.');
    console.log('💡 Run this script again before token expires.');
    console.log('💡 Or add it to your "npm start" script.\n');
  } catch (error) {
    console.error('\n💥 Token refresh failed:', error.message);
    process.exit(1);
  }
}

main();
