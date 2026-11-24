/**
 * Phase 4: Authentication, JWT & Project Protection Test Suite
 */
const http = require('http');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.PORT = '5060';
process.env.JWT_SECRET = 'test_jwt_secret_key_minimum_32_characters_for_unit_tests';

const app = require('../server');
const { generateToken, verifyToken } = require('../utils/jwt');
const { User, Project } = require('../models');

async function runTests() {
  console.log('--- Starting Phase 4 Authentication & Protection Tests ---');

  // Test 1: JWT Signing & Verification
  console.log('\n[Test 1] Testing JWT Token Generation & Verification:');
  const dummyUserId = new mongoose.Types.ObjectId();
  const token = generateToken(dummyUserId);

  if (!token || typeof token !== 'string') {
    throw new Error('Failed to generate JWT token');
  }
  console.log(`  ✓ Token generated successfully: ${token.substring(0, 24)}...`);

  const decoded = verifyToken(token);
  if (decoded.id !== dummyUserId.toString()) {
    throw new Error('Decoded token payload ID does not match original user ID');
  }
  console.log(`  ✓ Decoded user ID matches expected payload: ${decoded.id}`);

  // Test tampered token
  try {
    verifyToken(token + 'tampered');
    throw new Error('Tampered token should have failed verification');
  } catch (err) {
    console.log('  ✓ Tampered token was correctly rejected');
  }

  // Test 2: HTTP Route Protection on Express Server
  console.log('\n[Test 2] Testing Express Authentication Guards & Route Protection:');
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.listen(5060, async () => {
      try {
        const makeRequest = (path, method = 'GET', body = null, token = null) => {
          return new Promise((res, rej) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const req = http.request(
              {
                hostname: 'localhost',
                port: 5060,
                path,
                method,
                headers
              },
              (response) => {
                let data = '';
                response.on('data', (chunk) => (data += chunk));
                response.on('end', () => {
                  try {
                    res({ status: response.statusCode, data: JSON.parse(data) });
                  } catch (e) {
                    res({ status: response.statusCode, raw: data });
                  }
                });
              }
            );
            req.on('error', rej);
            if (body) req.write(JSON.stringify(body));
            req.end();
          });
        };

        // 2a: Test /api/auth/register input validation
        const regEmpty = await makeRequest('/api/auth/register', 'POST', {});
        console.log(`  ✓ POST /api/auth/register (missing fields) returned ${regEmpty.status}: "${regEmpty.data.message}"`);
        if (regEmpty.status !== 400) throw new Error('Registration should reject missing fields');

        // 2b: Test short password rejection
        const regShortPass = await makeRequest('/api/auth/register', 'POST', {
          name: 'Scholar',
          email: 'scholar@mit.edu',
          password: 'short'
        });
        console.log(`  ✓ POST /api/auth/register (short password) returned ${regShortPass.status}: "${regShortPass.data.message}"`);
        if (regShortPass.status !== 400) throw new Error('Registration should reject passwords < 8 chars');

        // 2c: Test /api/auth/login input validation
        const loginEmpty = await makeRequest('/api/auth/login', 'POST', {});
        console.log(`  ✓ POST /api/auth/login (missing fields) returned ${loginEmpty.status}: "${loginEmpty.data.message}"`);
        if (loginEmpty.status !== 400) throw new Error('Login should reject missing fields');

        // 2d: Test /api/projects protected without token
        const projUnauth = await makeRequest('/api/projects', 'GET');
        console.log(`  ✓ GET /api/projects without token returned ${projUnauth.status}: "${projUnauth.data.message}"`);
        if (projUnauth.status !== 401) throw new Error('GET /api/projects should be blocked with 401');

        // 2e: Test /api/projects protected with invalid token
        const projBadToken = await makeRequest('/api/projects', 'GET', null, 'invalid_token_xyz');
        console.log(`  ✓ GET /api/projects with invalid token returned ${projBadToken.status}: "${projBadToken.data.message}"`);
        if (projBadToken.status !== 401) throw new Error('GET /api/projects should reject invalid token');

        // 2f: Test POST /api/projects without token
        const createProjUnauth = await makeRequest('/api/projects', 'POST', { title: 'Secret Project' });
        console.log(`  ✓ POST /api/projects without token returned ${createProjUnauth.status}: "${createProjUnauth.data.message}"`);
        if (createProjUnauth.status !== 401) throw new Error('POST /api/projects should be blocked with 401');

        // 2g: Test /api/auth/me without token
        const meUnauth = await makeRequest('/api/auth/me', 'GET');
        console.log(`  ✓ GET /api/auth/me without token returned ${meUnauth.status}: "${meUnauth.data.message}"`);
        if (meUnauth.status !== 401) throw new Error('GET /api/auth/me should be blocked with 401');

        server.close(() => {
          console.log('\n--- All Phase 4 Auth & Protection Tests Passed Successfully! ---');
          resolve();
        });
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
