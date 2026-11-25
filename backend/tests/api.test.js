import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app, {
  cleanStringInput,
  validateEmail,
  escapeHtml,
  signToken,
  verifyToken,
} from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '..', 'users.json');

describe('Backend Security & JWT Helpers', () => {
  it('sanitizes control characters and trims strings', () => {
    assert.equal(cleanStringInput('  hello\x00world\x1F  '), 'helloworld');
    assert.equal(cleanStringInput(null), '');
    assert.equal(cleanStringInput(undefined), '');
  });

  it('validates email addresses strictly', () => {
    assert.equal(validateEmail('auditor@clint-envo.in'), true);
    assert.equal(validateEmail('invalid-email'), false);
    assert.equal(validateEmail('missing@domain'), false);
  });

  it('escapes HTML entities to prevent XSS', () => {
    assert.equal(
      escapeHtml('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('signs and verifies HMAC-SHA256 JWT tokens', () => {
    const token = signToken({ name: 'Test Auditor', email: 'test@example.com' });
    const decoded = verifyToken(token);
    assert.ok(decoded);
    assert.equal(decoded.email, 'test@example.com');
    assert.equal(verifyToken(token + 'tampered'), null);
    assert.equal(verifyToken('malformed.token'), null);
  });
});

describe('Backend API Endpoints', () => {
  let server;
  let baseUrl;
  let usersBackup = null;
  let usersExisted = false;

  before(async () => {
    usersExisted = fs.existsSync(USERS_FILE);
    if (usersExisted) {
      usersBackup = fs.readFileSync(USERS_FILE, 'utf8');
    }

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (usersExisted && usersBackup !== null) {
      fs.writeFileSync(USERS_FILE, usersBackup, 'utf8');
    } else if (!usersExisted && fs.existsSync(USERS_FILE)) {
      fs.unlinkSync(USERS_FILE);
    }
  });

  it('GET / returns online health metadata', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'online');
    assert.equal(data.founder, 'Siddharth Gopal Dubey');
  });

  it('registers a user with an isolated empty ledger and isolates accounts', async () => {
    const uniqueEmail1 = `user1.${Date.now()}@test.in`;
    const uniqueEmail2 = `user2.${Date.now()}@test.in`;

    // Register User 1
    const reg1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aarav Sharma',
        email: uniqueEmail1,
        password: 'StrongPassword123',
      }),
    });
    assert.equal(reg1.status, 200);
    const reg1Data = await reg1.json();
    assert.equal(reg1Data.success, true);
    assert.ok(reg1Data.token);
    assert.deepEqual(reg1Data.user.ledger, []);
    assert.equal(reg1Data.user.budget, 400);

    // Sync a ledger item for User 1
    const sampleLedger = [
      {
        id: 'evt-1',
        source: 'plaid',
        timestamp: new Date().toISOString(),
        title: 'Blue Tokai Coffee',
        amount: 350,
        unit: 'INR',
        category: 'Dining',
        subcategory: 'dining.coffee',
        carbonFactor: 0.007,
        carbonFootprint: 2.45,
        reasoning: 'Coffee coefficient applied',
      },
    ];
    const syncRes = await fetch(`${baseUrl}/api/user/ledger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${reg1Data.token}`,
      },
      body: JSON.stringify({ ledger: sampleLedger, budget: 350 }),
    });
    assert.equal(syncRes.status, 200);

    // Register User 2 and confirm empty ledger (no cross-account leakage)
    const reg2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Nair',
        email: uniqueEmail2,
        password: 'AnotherPassword123',
      }),
    });
    assert.equal(reg2.status, 200);
    const reg2Data = await reg2.json();
    assert.deepEqual(reg2Data.user.ledger, []);

    const user2LedgerRes = await fetch(`${baseUrl}/api/user/ledger`, {
      headers: { Authorization: `Bearer ${reg2Data.token}` },
    });
    const user2LedgerData = await user2LedgerRes.json();
    assert.deepEqual(user2LedgerData.ledger, []);

    // Verify User 1 retains its own ledger
    const user1LedgerRes = await fetch(`${baseUrl}/api/user/ledger`, {
      headers: { Authorization: `Bearer ${reg1Data.token}` },
    });
    const user1LedgerData = await user1LedgerRes.json();
    assert.equal(user1LedgerData.ledger.length, 1);
    assert.equal(user1LedgerData.ledger[0].title, 'Blue Tokai Coffee');
    assert.equal(user1LedgerData.budget, 350);
  });

  it('rejects unauthenticated access to protected endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/user/ledger`);
    assert.equal(res.status, 401);
  });

  it('GET /api/integrations/status returns platform telemetry status', async () => {
    const res = await fetch(`${baseUrl}/api/integrations/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.services.geminiAI);
    assert.ok(data.services.openMeteo);
  });

  it('POST /api/chat responds using heuristic carbon advisor when no key is set', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Explain my budget status',
        stats: { totalCarbon: 120, carbonBudget: 400, weeklySavingRate: 70, isNormal: true },
        ledgerSummary: [],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.reply === 'string' && data.reply.length > 10);
  });

  it('POST /api/aqi/assistant returns winter smog routines, IAQ hacks, and direct impact', async () => {
    const res = await fetch(`${baseUrl}/api/aqi/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Delhi',
        state: 'Delhi',
        usAqi: 240,
        pm25: 118,
        householdProfile: 'family_kids',
        commuteMode: 'car_cab',
        cookingHeating: 'lpg',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.match(data.advice, /Delhi/i);
    assert.match(data.advice, /PM2\.5|CO2e/i);
  });
});
