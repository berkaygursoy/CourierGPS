# Infrastructure & Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boot a working Node.js/Express server with PostgreSQL + Redis connections, environment-validated configuration, the full SQL schema migrated, and a `/health` endpoint that proves both data stores are reachable.

**Architecture:** Single-process Express server. PostgreSQL accessed via `pg` connection pool (TLS to Supabase). Redis accessed via `ioredis` (separate publisher + subscriber instances ready for Sub-Project 4) over TLS to Upstash. Configuration loaded from `.env` and validated at boot with Zod — process refuses to start if a required var is missing. SQL schema applied via `node-pg-migrate`.

**Tech Stack:** Node.js 20+, Express 4, pg, ioredis, zod, dotenv, winston, node-pg-migrate, jest, supertest. **Hosted services:** Supabase (Postgres free tier) + Upstash (Redis free tier).

**Working directory:** `d:\Projeler\kuryeTakip` (Windows + PowerShell). All bash code blocks below are PowerShell-compatible unless noted.

**Reference:** Blueprint at `C:\Users\Berkay\.claude\plans\frolicking-beaming-avalanche.md`.

---

## File Structure

This sub-project creates the entire `backend/` skeleton. Each file has one focused responsibility:

```
kuryeTakip/
├── .gitignore                          # Root gitignore (node_modules, .env, logs, etc.)
└── backend/
    ├── CLOUD_SETUP.md                  # Manual Supabase + Upstash setup walkthrough
    ├── package.json                    # Dependencies + npm scripts
    ├── jest.config.js                  # Jest config (node env, testMatch)
    ├── .env.example                    # Documented env template (committed)
    ├── .env                            # Local env file (NOT committed — created during Task 3)
    ├── migrations/
    │   └── 1748169600000_initial-schema.cjs   # node-pg-migrate file with all tables
    ├── src/
    │   ├── config/
    │   │   ├── env.js                  # Zod-validated env loader (throws if invalid)
    │   │   ├── database.js             # pg Pool factory (single shared pool)
    │   │   └── redis.js                # ioredis factory (publisher + subscriber)
    │   ├── utils/
    │   │   └── logger.js               # Winston logger (JSON in prod, pretty in dev)
    │   ├── middleware/
    │   │   └── errorHandler.js         # Global Express error handler
    │   ├── controllers/
    │   │   └── health.controller.js    # GET /health handler
    │   ├── routes/
    │   │   └── health.routes.js        # Health router (mounts controller)
    │   └── app.js                      # Express app factory (wires middleware + routes)
    ├── server.js                       # HTTP bootstrap (calls createApp, listens on PORT)
    └── tests/
        ├── unit/
        │   ├── env.test.js             # Validates Zod env schema
        │   └── logger.test.js          # Validates logger interface
        └── integration/
            ├── database.test.js        # Verifies pg pool can SELECT 1
            ├── redis.test.js           # Verifies Redis PING returns PONG
            └── health.test.js          # Full HTTP test of GET /health
```

---

## Task 1: Initialize repo + Cloud Setup Guide (Supabase + Upstash)

**Files:**
- Create: `d:\Projeler\kuryeTakip\.gitignore`
- Create: `d:\Projeler\kuryeTakip\backend\CLOUD_SETUP.md`

**Manual prerequisite (user action, no automation possible):** You must create free-tier accounts on Supabase and Upstash and obtain two connection strings before Task 5/6 will work. Tasks 1–4 can run without them.

- [ ] **Step 1: Initialize git repo (skip if already initialized)**

Run from `d:\Projeler\kuryeTakip`:

```powershell
git init
git config core.autocrlf true
```

Expected output: `Initialized empty Git repository in d:/Projeler/kuryeTakip/.git/`

- [ ] **Step 2: Create root `.gitignore`**

Path: `d:\Projeler\kuryeTakip\.gitignore`

```gitignore
# Dependencies
node_modules/

# Env files
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Build outputs
dist/
build/
coverage/
```

- [ ] **Step 3: Create `backend/CLOUD_SETUP.md` (committed setup walkthrough)**

Path: `d:\Projeler\kuryeTakip\backend\CLOUD_SETUP.md`

```markdown
# Cloud Setup — Supabase + Upstash

This project uses hosted free-tier services in place of local Docker.

## 1. Supabase (PostgreSQL)

1. Go to https://supabase.com and sign up (GitHub login works).
2. Click **New Project**.
   - Name: `kurye-takip` (or whatever)
   - Database password: generate a strong one and save it
   - Region: choose the closest to you
   - Plan: **Free**
3. Wait ~2 minutes for provisioning.
4. In the project dashboard, click **Project Settings** → **Database**.
5. Under **Connection string**, select **URI** mode and copy the value. It looks like:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   - Use the **Transaction pooler** URI (port 6543) for application traffic.
   - Use the **Session pooler** or **Direct connection** for migrations (port 5432 direct, or 5432 session pooler).
6. You'll have TWO URLs:
   - `DATABASE_URL` → transaction pooler (port 6543) for app runtime
   - `MIGRATION_DATABASE_URL` → direct connection or session pooler (port 5432) for `node-pg-migrate` (it needs session mode for DDL transactions)

## 2. Upstash (Redis)

1. Go to https://upstash.com and sign up (GitHub login works).
2. Click **Create Database**.
   - Name: `kurye-takip`
   - Region: pick the closest
   - Type: **Regional** (Global is overkill for a portfolio project)
   - Enable **TLS** (default on)
3. Once created, open the database details page.
4. Scroll to the **REST API** and **Redis CLI** sections, then locate the **Redis URL** under "Connect to your database" → copy the value starting with `rediss://`.
   It looks like:
   ```
   rediss://default:<token>@<endpoint>.upstash.io:6379
   ```

## 3. Paste both into `backend/.env`

After Task 3 creates the `.env` file, replace its placeholder values with the two real strings above.

## Security note

Both URLs contain credentials. They are in `.env` (gitignored) — never commit them.
```

- [ ] **Step 4: Commit**

```powershell
git add .gitignore backend/CLOUD_SETUP.md
git commit -m "chore: bootstrap repo with cloud setup guide (supabase + upstash)"
```

> **Out-of-band action required before Task 5:** Follow `CLOUD_SETUP.md` and capture `DATABASE_URL`, `MIGRATION_DATABASE_URL`, and `REDIS_URL`. They go into `.env` during Task 3 (or any time before Task 5).

---

## Task 2: Initialize `backend/package.json` + install dependencies

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\package.json` (via `npm init`)

- [ ] **Step 1: Initialize package.json**

Run from `d:\Projeler\kuryeTakip\backend`:

```powershell
npm init -y
```

- [ ] **Step 2: Install runtime dependencies**

```powershell
npm install express@^4.19.0 pg@^8.12.0 ioredis@^5.4.0 zod@^3.23.0 dotenv@^16.4.0 winston@^3.13.0 node-pg-migrate@^7.6.0
```

- [ ] **Step 3: Install dev dependencies**

```powershell
npm install --save-dev jest@^29.7.0 supertest@^7.0.0 nodemon@^3.1.0
```

- [ ] **Step 4: Replace generated `package.json` scripts + metadata**

Path: `d:\Projeler\kuryeTakip\backend\package.json`

Replace the file contents with:

```json
{
  "name": "kurye-takip-backend",
  "version": "0.1.0",
  "description": "Real-time courier tracking backend (Express + Redis + PostgreSQL)",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "migrate:up": "node-pg-migrate up --migrations-dir migrations --database-url-var MIGRATION_DATABASE_URL",
    "migrate:down": "node-pg-migrate down --migrations-dir migrations --database-url-var MIGRATION_DATABASE_URL",
    "migrate:create": "node-pg-migrate create --migrations-dir migrations"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "ioredis": "^5.4.0",
    "node-pg-migrate": "^7.6.0",
    "pg": "^8.12.0",
    "winston": "^3.13.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "supertest": "^7.0.0"
  }
}
```

Note: keep version numbers `npm install` recorded — only adjust `name`, `description`, `scripts`, `main`, `type`, `engines`. If your installed versions differ slightly, leave them as installed.

- [ ] **Step 5: Create `jest.config.js`**

Path: `d:\Projeler\kuryeTakip\backend\jest.config.js`

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
};
```

- [ ] **Step 6: Create test setup file**

Path: `d:\Projeler\kuryeTakip\backend\tests\setup.js`

```js
require('dotenv').config();
```

- [ ] **Step 7: Verify install succeeded**

```powershell
npm ls --depth=0
```

Expected: lists all 7 runtime and 3 dev deps with no `UNMET` warnings.

- [ ] **Step 8: Commit**

```powershell
git add backend/package.json backend/package-lock.json backend/jest.config.js backend/tests/setup.js
git commit -m "chore(backend): init package.json with express, pg, ioredis, zod"
```

---

## Task 3: Env validation with Zod (TDD)

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\.env.example`
- Create: `d:\Projeler\kuryeTakip\backend\.env`
- Test: `d:\Projeler\kuryeTakip\backend\tests\unit\env.test.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\config\env.js`

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\unit\env.test.js`

```js
describe('env config', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';

    expect(() => require('../../src/config/env')).toThrow(/DATABASE_URL/);
  });

  test('throws when REDIS_URL is missing', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    delete process.env.REDIS_URL;
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';

    expect(() => require('../../src/config/env')).toThrow(/REDIS_URL/);
  });

  test('defaults PORT to 3000 when not provided', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    delete process.env.PORT;
    process.env.NODE_ENV = 'test';

    const env = require('../../src/config/env');
    expect(env.PORT).toBe(3000);
  });

  test('parses PORT as integer', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '4567';
    process.env.NODE_ENV = 'test';

    const env = require('../../src/config/env');
    expect(env.PORT).toBe(4567);
    expect(typeof env.PORT).toBe('number');
  });

  test('rejects invalid NODE_ENV', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'invalid';

    expect(() => require('../../src/config/env')).toThrow(/NODE_ENV/);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```powershell
npx jest tests/unit/env.test.js
```

Expected: all 5 tests fail with `Cannot find module '../../src/config/env'`.

- [ ] **Step 3: Implement the env loader**

Path: `d:\Projeler\kuryeTakip\backend\src\config\env.js`

```js
const { z } = require('zod');

const pgUrl = z.string().url().refine(
  (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
  { message: 'must start with postgres:// or postgresql://' },
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: pgUrl,
  MIGRATION_DATABASE_URL: pgUrl.optional(),
  REDIS_URL: z.string().url().refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
    message: 'REDIS_URL must start with redis:// or rediss://',
  }),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

module.exports = parsed.data;
```

- [ ] **Step 4: Run the test — confirm it passes**

```powershell
npx jest tests/unit/env.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 5: Create `.env.example` (committed, documentation only)**

Path: `d:\Projeler\kuryeTakip\backend\.env.example`

```ini
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# PostgreSQL (Supabase). Replace with your project's pooler URL from CLOUD_SETUP.md.
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
# Used by node-pg-migrate (DDL needs session mode — use direct/session pooler, port 5432).
MIGRATION_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Redis (Upstash). Replace with your database's URL from CLOUD_SETUP.md.
REDIS_URL=rediss://default:TOKEN@ENDPOINT.upstash.io:6379
```

- [ ] **Step 6: Create local `.env` (NOT committed — already in .gitignore)**

Path: `d:\Projeler\kuryeTakip\backend\.env`

Same content as `.env.example` above.

- [ ] **Step 7: Commit**

```powershell
git add backend/.env.example backend/src/config/env.js backend/tests/unit/env.test.js
git commit -m "feat(backend): add zod-validated env loader"
```

---

## Task 4: Winston logger (TDD)

**Files:**
- Test: `d:\Projeler\kuryeTakip\backend\tests\unit\logger.test.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\utils\logger.js`

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\unit\logger.test.js`

```js
describe('logger', () => {
  let logger;

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'info';
    logger = require('../../src/utils/logger');
  });

  test('exposes info, warn, error, debug methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('does not throw when called', () => {
    expect(() => logger.info('test message', { ctx: 1 })).not.toThrow();
    expect(() => logger.error('err', new Error('boom'))).not.toThrow();
  });

  test('respects configured level (LOG_LEVEL=info hides debug)', () => {
    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```powershell
npx jest tests/unit/logger.test.js
```

Expected: fails with `Cannot find module '../../src/utils/logger'`.

- [ ] **Step 3: Implement the logger**

Path: `d:\Projeler\kuryeTakip\backend\src\utils\logger.js`

```js
const winston = require('winston');
const env = require('../config/env');

const isProd = env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level} ${message}${metaStr}`;
        }),
      ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
```

- [ ] **Step 4: Run the test — confirm it passes**

```powershell
npx jest tests/unit/logger.test.js
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/utils/logger.js backend/tests/unit/logger.test.js
git commit -m "feat(backend): add winston logger (env-aware format)"
```

---

## Task 5: PostgreSQL pool factory (TDD, integration)

**Prereq:** Supabase project provisioned per `CLOUD_SETUP.md`; `.env` populated with real `DATABASE_URL` (and `MIGRATION_DATABASE_URL`).

**Files:**
- Test: `d:\Projeler\kuryeTakip\backend\tests\integration\database.test.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\config\database.js`

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\integration\database.test.js`

```js
const { getPool, closePool } = require('../../src/config/database');

describe('database pool', () => {
  afterAll(async () => {
    await closePool();
  });

  test('getPool() returns a singleton pool', () => {
    const a = getPool();
    const b = getPool();
    expect(a).toBe(b);
  });

  test('pool can execute SELECT 1', async () => {
    const pool = getPool();
    const result = await pool.query('SELECT 1 AS one');
    expect(result.rows[0].one).toBe(1);
  });

  test('pool can fetch postgres version', async () => {
    const pool = getPool();
    const result = await pool.query('SELECT version()');
    expect(result.rows[0].version).toMatch(/PostgreSQL/);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```powershell
npx jest tests/integration/database.test.js
```

Expected: fails with `Cannot find module '../../src/config/database'`.

- [ ] **Step 3: Implement the pool factory**

Path: `d:\Projeler\kuryeTakip\backend\src\config\database.js`

```js
const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error', { message: err.message });
  });

  return pool;
}

async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

module.exports = { getPool, closePool };
```

- [ ] **Step 4: Run the test — confirm it passes**

```powershell
npx jest tests/integration/database.test.js
```

Expected: all 3 tests pass. If you see `ENOTFOUND` or `ETIMEDOUT`, your `DATABASE_URL` in `.env` is wrong or your network is blocking outbound 6543/5432.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/config/database.js backend/tests/integration/database.test.js
git commit -m "feat(backend): add postgres pool factory with singleton + close"
```

---

## Task 6: Redis client factory (TDD, integration)

**Prereq:** Upstash database provisioned per `CLOUD_SETUP.md`; `.env` populated with real `REDIS_URL` (must start with `rediss://` — TLS).

**Files:**
- Test: `d:\Projeler\kuryeTakip\backend\tests\integration\redis.test.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\config\redis.js`

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\integration\redis.test.js`

```js
const { getRedis, getSubscriber, getPublisher, closeRedis } = require('../../src/config/redis');

describe('redis clients', () => {
  afterAll(async () => {
    await closeRedis();
  });

  test('getRedis() returns a singleton command client', () => {
    expect(getRedis()).toBe(getRedis());
  });

  test('getPublisher() and getSubscriber() return distinct clients', () => {
    const pub = getPublisher();
    const sub = getSubscriber();
    expect(pub).not.toBe(sub);
    expect(pub).not.toBe(getRedis());
  });

  test('command client responds to PING', async () => {
    const redis = getRedis();
    const reply = await redis.ping();
    expect(reply).toBe('PONG');
  });

  test('publisher can publish and subscriber can receive', async () => {
    const pub = getPublisher();
    const sub = getSubscriber();
    const channel = 'test:channel:' + Date.now();

    const received = new Promise((resolve) => {
      sub.subscribe(channel, () => {
        sub.on('message', (ch, msg) => {
          if (ch === channel) resolve(msg);
        });
        pub.publish(channel, 'hello');
      });
    });

    await expect(received).resolves.toBe('hello');
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```powershell
npx jest tests/integration/redis.test.js
```

Expected: fails with `Cannot find module '../../src/config/redis'`.

- [ ] **Step 3: Implement the Redis factory**

Path: `d:\Projeler\kuryeTakip\backend\src\config\redis.js`

```js
const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let commandClient = null;
let publisherClient = null;
let subscriberClient = null;

function createClient(role) {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });

  client.on('error', (err) => {
    logger.error(`Redis ${role} error`, { message: err.message });
  });

  return client;
}

function getRedis() {
  if (!commandClient) commandClient = createClient('command');
  return commandClient;
}

function getPublisher() {
  if (!publisherClient) publisherClient = createClient('publisher');
  return publisherClient;
}

function getSubscriber() {
  if (!subscriberClient) subscriberClient = createClient('subscriber');
  return subscriberClient;
}

async function closeRedis() {
  const closers = [];
  if (commandClient) {
    closers.push(commandClient.quit());
    commandClient = null;
  }
  if (publisherClient) {
    closers.push(publisherClient.quit());
    publisherClient = null;
  }
  if (subscriberClient) {
    closers.push(subscriberClient.quit());
    subscriberClient = null;
  }
  await Promise.all(closers);
}

module.exports = { getRedis, getPublisher, getSubscriber, closeRedis };
```

- [ ] **Step 4: Run the test — confirm it passes**

```powershell
npx jest tests/integration/redis.test.js
```

Expected: all 4 tests pass. If `ECONNREFUSED` or auth errors, your `REDIS_URL` is wrong — it must be the full `rediss://default:TOKEN@host:6379` from Upstash, not just the host.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/config/redis.js backend/tests/integration/redis.test.js
git commit -m "feat(backend): add ioredis factory (command + publisher + subscriber)"
```

---

## Task 7: Global error handler middleware

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\src\middleware\errorHandler.js`

No test needed in isolation — this will be exercised by the integration test in Task 9.

- [ ] **Step 1: Implement the error handler**

Path: `d:\Projeler\kuryeTakip\backend\src\middleware\errorHandler.js`

```js
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'CLIENT_ERROR');
  const message = status >= 500 ? 'Internal server error' : err.message;

  logger.error('Request failed', {
    method: req.method,
    url: req.originalUrl,
    status,
    code,
    error: err.message,
    stack: err.stack,
  });

  res.status(status).json({
    error: { code, message },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };
```

- [ ] **Step 2: Commit (no test yet — covered in Task 9)**

```powershell
git add backend/src/middleware/errorHandler.js
git commit -m "feat(backend): add global error + 404 handler middleware"
```

---

## Task 8: Health controller + route (TDD)

**Files:**
- Test: `d:\Projeler\kuryeTakip\backend\tests\integration\health.test.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\controllers\health.controller.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\routes\health.routes.js`
- Create: `d:\Projeler\kuryeTakip\backend\src\app.js`

- [ ] **Step 1: Write the failing integration test**

Path: `d:\Projeler\kuryeTakip\backend\tests\integration\health.test.js`

```js
const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');

describe('GET /health', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  test('returns 200 with status ok when postgres + redis reachable', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      checks: {
        database: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
  });

  test('returns 404 with structured error for unknown routes', async () => {
    const res = await request(app).get('/this-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```powershell
npx jest tests/integration/health.test.js
```

Expected: fails with `Cannot find module '../../src/app'`.

- [ ] **Step 3: Implement the health controller**

Path: `d:\Projeler\kuryeTakip\backend\src\controllers\health.controller.js`

```js
const { getPool } = require('../config/database');
const { getRedis } = require('../config/redis');

async function checkDatabase() {
  try {
    await getPool().query('SELECT 1');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkRedis() {
  try {
    const reply = await getRedis().ping();
    return reply === 'PONG' ? { status: 'ok' } : { status: 'error', message: `Unexpected: ${reply}` };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function getHealth(_req, res) {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const overall = database.status === 'ok' && redis.status === 'ok' ? 'ok' : 'degraded';
  const httpStatus = overall === 'ok' ? 200 : 503;

  res.status(httpStatus).json({
    status: overall,
    checks: { database, redis },
  });
}

module.exports = { getHealth };
```

- [ ] **Step 4: Implement the health router**

Path: `d:\Projeler\kuryeTakip\backend\src\routes\health.routes.js`

```js
const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

router.get('/', getHealth);

module.exports = router;
```

- [ ] **Step 5: Implement the Express app factory**

Path: `d:\Projeler\kuryeTakip\backend\src\app.js`

```js
const express = require('express');
const healthRoutes = require('./routes/health.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 6: Run the test — confirm it passes**

```powershell
npx jest tests/integration/health.test.js
```

Expected: both tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/controllers/health.controller.js backend/src/routes/health.routes.js backend/src/app.js backend/tests/integration/health.test.js
git commit -m "feat(backend): add /health endpoint verifying postgres + redis"
```

---

## Task 9: HTTP server bootstrap (`server.js`)

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\server.js`

- [ ] **Step 1: Implement server bootstrap**

Path: `d:\Projeler\kuryeTakip\backend\server.js`

```js
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { createApp } = require('./src/app');
const { closePool } = require('./src/config/database');
const { closeRedis } = require('./src/config/redis');

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`, {
    env: env.NODE_ENV,
  });
});

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await closePool();
    await closeRedis();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Force exit after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

- [ ] **Step 2: Start the server manually and verify**

In one PowerShell window:

```powershell
npm start
```

Expected log: `Server listening on http://localhost:3000`.

In a second PowerShell window:

```powershell
curl http://localhost:3000/health
```

Expected JSON response (Postgres tables don't exist yet but `SELECT 1` works):

```json
{"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}
```

Verify 404 path:

```powershell
curl http://localhost:3000/nonexistent
```

Expected: HTTP 404 with `{"error":{"code":"NOT_FOUND","message":"Cannot GET /nonexistent"}}`.

Stop the server with `Ctrl+C` — log should show graceful shutdown messages.

- [ ] **Step 3: Commit**

```powershell
git add backend/server.js
git commit -m "feat(backend): add http server bootstrap with graceful shutdown"
```

---

## Task 10: Initial SQL schema migration

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\migrations\1748169600000_initial-schema.cjs`

Note: filename timestamp `1748169600000` is the Unix ms for 2026-05-25 00:00 UTC. Adjust if you regenerate with `npm run migrate:create initial-schema` — that command produces a fresh timestamp.

- [ ] **Step 1: Create the migration file**

Path: `d:\Projeler\kuryeTakip\backend\migrations\1748169600000_initial-schema.cjs`

```js
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role: {
      type: 'varchar(20)',
      notNull: true,
      check: "role IN ('admin', 'dispatcher')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('merchants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    address: { type: 'text', notNull: true },
    latitude: { type: 'double precision', notNull: true },
    longitude: { type: 'double precision', notNull: true },
    phone: { type: 'varchar(20)' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('couriers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(20)', notNull: true, unique: true },
    vehicle_type: {
      type: 'varchar(20)',
      check: "vehicle_type IN ('bike', 'motorcycle', 'car')",
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'offline',
      check: "status IN ('offline', 'idle', 'delivering')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    merchant_id: {
      type: 'uuid',
      notNull: true,
      references: '"merchants"',
    },
    courier_id: {
      type: 'uuid',
      references: '"couriers"',
      onDelete: 'SET NULL',
    },
    customer_name: { type: 'varchar(255)', notNull: true },
    delivery_address: { type: 'text', notNull: true },
    delivery_lat: { type: 'double precision', notNull: true },
    delivery_lng: { type: 'double precision', notNull: true },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'pending',
      check:
        "status IN ('pending','assigned','picked_up','in_transit','delivered','cancelled')",
    },
    assigned_at: { type: 'timestamptz' },
    picked_up_at: { type: 'timestamptz' },
    delivered_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('location_snapshots', {
    id: { type: 'bigserial', primaryKey: true },
    courier_id: {
      type: 'uuid',
      notNull: true,
      references: '"couriers"',
      onDelete: 'CASCADE',
    },
    latitude: { type: 'double precision', notNull: true },
    longitude: { type: 'double precision', notNull: true },
    heading: { type: 'double precision' },
    speed: { type: 'double precision' },
    recorded_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('location_snapshots', ['courier_id', { name: 'recorded_at', sort: 'DESC' }], {
    name: 'idx_location_courier_time',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('location_snapshots');
  pgm.dropTable('orders');
  pgm.dropTable('couriers');
  pgm.dropTable('merchants');
  pgm.dropTable('users');
};
```

- [ ] **Step 2: Apply the migration**

```powershell
npm run migrate:up
```

Expected output ends with: `Migrations complete!`

If it errors with `password authentication failed`, confirm `MIGRATION_DATABASE_URL` in `.env` is correct (must be session-mode / port 5432, not 6543).

- [ ] **Step 3: Verify tables exist in Postgres**

Open the Supabase dashboard → your project → **Table Editor** in the left nav. You should see all 5 application tables listed: `couriers`, `location_snapshots`, `merchants`, `orders`, `users` (plus the internal `pgmigrations` table under the migration schema).

Alternatively, open **SQL Editor** in Supabase and run:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected rows: `couriers`, `location_snapshots`, `merchants`, `orders`, `pgmigrations`, `users`.

- [ ] **Step 4: Verify the constraint works (sanity check)**

In the Supabase **SQL Editor**, run:

```sql
INSERT INTO couriers (name, phone, status) VALUES ('Test', '+90555', 'BOGUS');
```

Expected: error containing `violates check constraint "couriers_status_check"`. The transaction auto-rolls back — no test row persisted.

- [ ] **Step 5: Commit**

```powershell
git add backend/migrations/1748169600000_initial-schema.cjs
git commit -m "feat(backend): add initial sql schema (users, merchants, couriers, orders, snapshots)"
```

---

## Task 11: Final verification — full boot from a clean slate

**Goal:** Prove the whole stack starts cleanly with only `.env` + cloud accounts in place.

- [ ] **Step 1: Confirm cloud services are reachable**

```powershell
# DNS sanity check — both should resolve
Resolve-DnsName ((([uri]$env:DATABASE_URL).Host)) -ErrorAction SilentlyContinue
```

Or simply verify in the Supabase + Upstash dashboards that both services show "healthy" / "active". (Free-tier Supabase auto-pauses after a week of inactivity; click "Restore" if so.)

- [ ] **Step 2: Run the full test suite**

```powershell
npm test
```

Expected: all tests (unit + integration) pass. If any fail with `ETIMEDOUT` or `ENOTFOUND`, recheck `.env` URLs.

- [ ] **Step 3: Apply migrations + start server + curl health**

```powershell
npm run migrate:up
npm start
```

In a second window:

```powershell
curl http://localhost:3000/health
```

Expected: `{"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}`.

- [ ] **Step 4: Tag this milestone**

```powershell
git tag -a sub-project-1-complete -m "Sub-Project 1: Infrastructure & Backend Foundation"
```

- [ ] **Step 5: Final summary commit (if anything stragglers)**

```powershell
git status
# if clean, no commit needed
```

---

## Acceptance Criteria

Sub-Project 1 is **done** when all of these are true:

1. Supabase project and Upstash database exist; `.env` has valid `DATABASE_URL`, `MIGRATION_DATABASE_URL`, and `REDIS_URL`.
2. `npm test` from `backend/` passes all unit + integration tests with no flakes.
3. `npm run migrate:up` applies the schema; all 5 application tables visible in Supabase Table Editor.
4. `npm start` boots the server with no errors and logs `Server listening on http://localhost:3000`.
5. `curl http://localhost:3000/health` returns HTTP 200 with `status: "ok"` and both checks green.
6. `curl http://localhost:3000/nonexistent` returns HTTP 404 with `{"error":{"code":"NOT_FOUND",...}}`.
7. `Ctrl+C` on the server triggers graceful-shutdown log lines (no orphaned connections).

---

## What's NOT in this sub-project (handled later)

- Any CRUD endpoint for couriers/orders/merchants → **Sub-Project 2**
- Redis GEO writes / location ingestion → **Sub-Project 3**
- Socket.io / WebSocket layer → **Sub-Project 4**
- OSRM route service → **Sub-Project 5**
- Any frontend code → **Sub-Project 6+**

---

## Next Step

After this plan completes and you've tagged `sub-project-1-complete`, return to `superpowers:writing-plans` and we'll write the Sub-Project 2 plan (CRUD REST APIs) using the actual file layout we just established.
