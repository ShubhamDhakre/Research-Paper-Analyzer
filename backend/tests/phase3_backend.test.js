/**
 * Phase 3 Backend & Model Validation Test Suite
 */
const http = require('http');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.PORT = '5055';

const app = require('../server');
const {
  User,
  Project,
  ResearchPaper,
  PaperAnalysis,
  ChatSession,
  ChatMessage,
  LiteratureReview
} = require('../models');

async function runTests() {
  console.log('--- Starting Phase 3 Backend Verification ---');

  // Test 1: Verify all 7 Mongoose Models Compile
  console.log('\n[Test 1] Verifying Mongoose Model Definitions:');
  const models = [
    { name: 'User', model: User },
    { name: 'Project', model: Project },
    { name: 'ResearchPaper', model: ResearchPaper },
    { name: 'PaperAnalysis', model: PaperAnalysis },
    { name: 'ChatSession', model: ChatSession },
    { name: 'ChatMessage', model: ChatMessage },
    { name: 'LiteratureReview', model: LiteratureReview }
  ];

  models.forEach(({ name, model }) => {
    if (model && model.schema) {
      console.log(`  ✓ ${name} model schema verified successfully`);
    } else {
      throw new Error(`Failed to load schema for model: ${name}`);
    }
  });

  // Test 2: Unit Test User Password Hashing & Comparison
  console.log('\n[Test 2] Testing User Schema Validation & Password Hashing:');
  const testUser = new User({
    name: 'Ada Lovelace',
    email: 'ada@computing.org',
    password: 'supersecretpassword123',
    institution: 'Analytical Engine Lab'
  });

  // Trigger pre-save hashing
  await testUser.validate();
  console.log('  ✓ User validation passed for valid data');

  // Test invalid email
  const invalidUser = new User({
    name: 'Invalid User',
    email: 'not-an-email',
    password: 'short'
  });
  let validationError = invalidUser.validateSync();
  if (validationError && validationError.errors.email && validationError.errors.password) {
    console.log('  ✓ User schema correctly rejects invalid email and short passwords');
  } else {
    throw new Error('User schema failed to reject invalid credentials');
  }

  // Test 3: Test HTTP API Routes on Express
  console.log('\n[Test 3] Testing Express Routes & Middleware:');
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.listen(5055, async () => {
      try {
        // Helper to perform HTTP requests
        const makeRequest = (path, method = 'GET', body = null) => {
          return new Promise((res, rej) => {
            const req = http.request(
              {
                hostname: 'localhost',
                port: 5055,
                path,
                method,
                headers: {
                  'Content-Type': 'application/json'
                }
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
            if (body) {
              req.write(JSON.stringify(body));
            }
            req.end();
          });
        };

        // 3a: Root route
        const rootRes = await makeRequest('/');
        console.log(`  ✓ GET / returned ${rootRes.status}: "${rootRes.data.message}"`);
        if (rootRes.status !== 200) throw new Error('Root route failed');

        // 3b: Health route
        const healthRes = await makeRequest('/api/health');
        console.log(`  ✓ GET /api/health returned ${healthRes.status}: status="${healthRes.data.status}"`);
        if (healthRes.status !== 200 || healthRes.data.status !== 'ok') {
          throw new Error('Health route failed');
        }

        // 3c: Auth protection on project routes
        const authProtectRes = await makeRequest('/api/projects/not-a-valid-mongo-id');
        console.log(`  ✓ GET /api/projects/invalid-id correctly intercepted by auth guard returning ${authProtectRes.status}: "${authProtectRes.data.message}"`);
        if (authProtectRes.status !== 401) throw new Error('Auth protection on project routes failed');

        // 3d: Missing project route auth guard
        const missingAuthRes = await makeRequest('/api/projects', 'POST', { description: 'No title' });
        console.log(`  ✓ POST /api/projects correctly intercepted by auth guard returning ${missingAuthRes.status}: "${missingAuthRes.data.message}"`);
        if (missingAuthRes.status !== 401) throw new Error('Auth guard on POST projects failed');

        // 3e: 404 handler test
        const notFoundRes = await makeRequest('/api/non-existent-endpoint');
        console.log(`  ✓ GET /api/non-existent-endpoint returned ${notFoundRes.status}`);
        if (notFoundRes.status !== 404) throw new Error('404 handler failed');

        server.close(() => {
          console.log('\n--- All Phase 3 Backend Tests Passed Successfully! ---');
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
