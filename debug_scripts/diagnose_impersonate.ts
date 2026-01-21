
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const SECRET = process.env.JWT_SECRET || 'saudePublica';
const AUDIENCE = process.env.JWT_TOKEN_AUDIENCE || 'https://www.saude.simplescity.com.br';
const ISSUER = process.env.JWT_TOKEN_ISSUER || 'https://www.saude.simplescity.com.br';

function signJwt(payload: any, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 30 * 24 * 60 * 60; // 30 days

  const fullPayload = {
    ...payload,
    iat: now,
    exp: exp,
    aud: AUDIENCE,
    iss: ISSUER
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

async function main() {
  try {
    console.log('🔍 Finding admin_master user...');

    // 1. Find an admin_master
    const admin = await prisma.professional.findFirst({
      where: { role: 'admin_manager' }
    });

    if (!admin) {
      console.error('❌ No admin_master user found in database!');
      const anyUser = await prisma.professional.findFirst();
      if (anyUser) {
        console.log(`⚠️ Using fallback user ${anyUser.email} (role: ${anyUser.role})`);
        await executeTest(anyUser);
        return;
      }
      process.exit(1);
    } else {
      console.log(`✅ Found admin: ${admin.email} (ID: ${admin.id})`);
      await executeTest(admin);
    }

  } catch (error) {
    console.error('Crash:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function executeTest(user: any) {
  // 2. Generate Token
  const token = signJwt({
    user_id: user.id,
    sub_id: user.subscriber_id,
    role: user.role
  }, SECRET);

  console.log('🔑 Generated Test Token');

  // 3. Find a target subscriber to impersonate
  const targetSub = await prisma.subscriber.findFirst({
    where: { id: { not: user.subscriber_id } }
  });

  const targetId = targetSub ? targetSub.id : (user.subscriber_id || 1);
  console.log(`🎯 Target Subscriber ID: ${targetId}`);

  // 4. Request
  const url = 'http://localhost:3000/auth/impersonate';
  console.log(`🚀 Sending POST to ${url}...`);

  try {
    const response = await axios.post(url, { subscriber_id: targetId }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response Body:', response.data);
    console.log('✅ SUCCESS! Endpoint is working.');

  } catch (err: any) {
    if (err.response) {
      console.error(`❌ Request Failed: ${err.response.status} ${err.response.statusText}`);
      console.error('Data:', err.response.data);
    } else {
      console.error('❌ Network Error:', err.message);
    }
  }
}

main();
