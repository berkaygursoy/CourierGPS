# CRUD REST APIs (Merchants, Couriers, Orders) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship REST endpoints for Merchants, Couriers, and Orders — each with full CRUD (POST / GET-list / GET-one / PATCH / DELETE), Zod-validated request bodies, structured error responses, and end-to-end integration tests against the live Supabase database.

**Architecture:** Three clean layers per resource. **Repository** owns SQL (parameterized queries via the shared `pg` Pool). **Service** owns business rules (FK validation, status transitions, error semantics) and throws typed `HttpError`s. **Controller** owns HTTP translation (request → service call → response). Routers wire controllers to URLs and apply Zod request-validation middleware. The existing `errorHandler` middleware (from Sub-Project 1) catches `HttpError`s and emits structured JSON.

**Tech Stack:** Express 4, pg (no ORM — raw SQL), zod (validation), jest + supertest. Postgres via Supabase transaction pooler. No new runtime dependencies.

**Working directory:** `d:\Projeler\kuryeTakip` (Windows + PowerShell). All bash blocks below are PowerShell-compatible.

**Prereqs:** Sub-Project 1 complete — git tag `sub-project-1-complete` present; `npm test` passes 17/17; `.env` populated with Supabase + Upstash URLs.

---

## File Structure

This sub-project adds 17 new files and modifies one existing file. Files are split by responsibility (repo / service / controller / route / schema) with one file per resource within each layer — small, focused units.

```
backend/
├── src/
│   ├── utils/
│   │   └── errors.js                  # NEW: HttpError class
│   ├── middleware/
│   │   └── validate.js                # NEW: Zod request-validation wrapper
│   ├── schemas/
│   │   ├── merchant.schema.js         # NEW: Zod create/update schemas
│   │   ├── courier.schema.js          # NEW
│   │   └── order.schema.js            # NEW
│   ├── repositories/
│   │   ├── merchant.repository.js     # NEW: raw SQL queries
│   │   ├── courier.repository.js      # NEW
│   │   └── order.repository.js        # NEW
│   ├── services/
│   │   ├── merchant.service.js        # NEW: business logic, throws HttpError
│   │   ├── courier.service.js         # NEW
│   │   └── order.service.js           # NEW
│   ├── controllers/
│   │   ├── merchant.controller.js     # NEW: HTTP handlers
│   │   ├── courier.controller.js      # NEW
│   │   └── order.controller.js        # NEW
│   ├── routes/
│   │   ├── merchant.routes.js         # NEW
│   │   ├── courier.routes.js          # NEW
│   │   └── order.routes.js            # NEW
│   └── app.js                         # MODIFY: mount the 3 new routers
└── tests/
    ├── helpers/
    │   └── db.js                      # NEW: truncateAll() helper
    └── integration/
        ├── merchants.api.test.js      # NEW
        ├── couriers.api.test.js       # NEW
        └── orders.api.test.js         # NEW
```

**Why this split:**
- One file per (layer × resource) — when working on Couriers nothing in Merchants need be open
- Repository = SQL only; if we ever swap to an ORM, only this layer changes
- Service throws `HttpError`s the `errorHandler` already understands — controllers stay one-liner-thin
- Schemas live in their own dir so the same Zod object can be reused by both validation middleware and service-layer guards

---

## Conventions Used Throughout

| Convention | Decision |
|---|---|
| HTTP status: create | `201 Created` with the created entity in body |
| HTTP status: get/update | `200 OK` with entity in body |
| HTTP status: delete | `204 No Content` |
| HTTP status: validation fail | `400 Bad Request` with `{ error: { code: 'VALIDATION_ERROR', message, details } }` |
| HTTP status: not found | `404 Not Found` with `{ error: { code: 'NOT_FOUND', message } }` |
| HTTP status: FK violation | `400` with `{ error: { code: 'INVALID_REFERENCE', message } }` |
| Body parsing | `express.json({ limit: '100kb' })` (already in `app.js`) |
| Repository return shape | Row objects from `pg` (snake_case fields like `delivery_lat`) — no transformation; controllers send them as-is |
| Error throwing | Services throw `new HttpError(status, code, message)`; controllers `next(err)` propagates to `errorHandler` |
| Test isolation | `truncateAll()` in `beforeEach` — DELETEs from all 5 tables in FK-safe order |
| ID generation | Server-side via Postgres `gen_random_uuid()` (the migration already set this as the default) |

---

## Task 1: HttpError class

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\src\utils\errors.js`
- Test: `d:\Projeler\kuryeTakip\backend\tests\unit\errors.test.js`

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\unit\errors.test.js`

```js
const { HttpError } = require('../../src/utils/errors');

describe('HttpError', () => {
  test('is an Error instance', () => {
    const err = new HttpError(404, 'NOT_FOUND', 'missing');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(HttpError);
  });

  test('exposes status, code, and message', () => {
    const err = new HttpError(400, 'VALIDATION_ERROR', 'bad input', { field: 'name' });
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('bad input');
    expect(err.details).toEqual({ field: 'name' });
  });

  test('details default to undefined', () => {
    const err = new HttpError(404, 'NOT_FOUND', 'gone');
    expect(err.details).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
cd "d:/Projeler/kuryeTakip/backend"; npx jest tests/unit/errors.test.js
```
Expected: FAIL with `Cannot find module '../../src/utils/errors'`.

- [ ] **Step 3: Implement HttpError**

Path: `d:\Projeler\kuryeTakip\backend\src\utils\errors.js`

```js
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { HttpError };
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx jest tests/unit/errors.test.js
```
Expected: PASS (3/3).

- [ ] **Step 5: Update `errorHandler` to surface `details`**

The existing `errorHandler.js` already reads `err.status` and `err.code`, but it does not pass `details` to the client. Extend it.

Modify: `d:\Projeler\kuryeTakip\backend\src\middleware\errorHandler.js`

Replace the existing `res.status(status).json(...)` line with:

```js
  const body = { error: { code, message } };
  if (err.details !== undefined) body.error.details = err.details;
  res.status(status).json(body);
```

Full updated `errorHandler` function for clarity:

```js
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

  const body = { error: { code, message } };
  if (err.details !== undefined) body.error.details = err.details;
  res.status(status).json(body);
}
```

- [ ] **Step 6: Verify the existing health test still passes**

```powershell
npx jest tests/integration/health.test.js
```
Expected: PASS (2/2).

- [ ] **Step 7: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/utils/errors.js backend/src/middleware/errorHandler.js backend/tests/unit/errors.test.js; git commit -m "feat(backend): add HttpError class and propagate details to client"
```

---

## Task 2: Zod request-validation middleware

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\src\middleware\validate.js`
- Test: `d:\Projeler\kuryeTakip\backend\tests\unit\validate.test.js`

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\unit\validate.test.js`

```js
const { z } = require('zod');
const { validate } = require('../../src/middleware/validate');
const { HttpError } = require('../../src/utils/errors');

function runMiddleware(mw, req) {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });
}

describe('validate middleware', () => {
  const schema = z.object({
    body: z.object({ name: z.string().min(1) }),
  });

  test('passes when body matches schema', async () => {
    const req = { body: { name: 'Alice' } };
    const err = await runMiddleware(validate(schema), req);
    expect(err).toBeUndefined();
  });

  test('replaces req.body with parsed value (strips unknown keys)', async () => {
    const schema2 = z.object({
      body: z.object({ name: z.string() }), // default = strip
    });
    const req = { body: { name: 'Bob', secret: 'leak-me' } };
    await runMiddleware(validate(schema2), req);
    expect(req.body).toEqual({ name: 'Bob' });
    expect(req.body.secret).toBeUndefined();
  });

  test('calls next with HttpError(400) when body invalid', async () => {
    const req = { body: { name: '' } };
    const err = await runMiddleware(validate(schema), req);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(err.details)).toBe(true);
    expect(err.details.length).toBeGreaterThan(0);
  });

  test('can validate params too', async () => {
    const schema3 = z.object({
      params: z.object({ id: z.string().uuid() }),
    });
    const validReq = { params: { id: '00000000-0000-0000-0000-000000000000' } };
    expect(await runMiddleware(validate(schema3), validReq)).toBeUndefined();

    const invalidReq = { params: { id: 'not-a-uuid' } };
    const err = await runMiddleware(validate(schema3), invalidReq);
    expect(err.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx jest tests/unit/validate.test.js
```
Expected: FAIL with `Cannot find module '../../src/middleware/validate'`.

- [ ] **Step 3: Implement the middleware**

Path: `d:\Projeler\kuryeTakip\backend\src\middleware\validate.js`

```js
const { HttpError } = require('../utils/errors');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', details));
    }

    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.params !== undefined) req.params = result.data.params;
    if (result.data.query !== undefined) req.query = result.data.query;
    next();
  };
}

module.exports = { validate };
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx jest tests/unit/validate.test.js
```
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/middleware/validate.js backend/tests/unit/validate.test.js; git commit -m "feat(backend): add zod request-validation middleware"
```

---

## Task 3: Test DB helper (`truncateAll`)

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\tests\helpers\db.js`

No standalone unit test — exercised by every integration test in Tasks 4–6. Keeping it dependency-free.

- [ ] **Step 1: Implement the helper**

Path: `d:\Projeler\kuryeTakip\backend\tests\helpers\db.js`

```js
const { getPool } = require('../../src/config/database');

// DELETE in FK-safe order: children before parents.
// location_snapshots is CASCADE on courier, but listing it explicitly
// makes ordering bugs impossible if FK behavior changes later.
const TABLES_IN_DELETE_ORDER = [
  'location_snapshots',
  'orders',
  'couriers',
  'merchants',
  'users',
];

async function truncateAll() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of TABLES_IN_DELETE_ORDER) {
      await client.query(`DELETE FROM ${table}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { truncateAll };
```

- [ ] **Step 2: Verify the helper imports cleanly**

```powershell
node -e "require('dotenv').config(); const { truncateAll } = require('./backend/tests/helpers/db'); truncateAll().then(() => { console.log('OK'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });"
```
Run from `d:/Projeler/kuryeTakip` (repo root). Expected: prints `OK`.

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/tests/helpers/db.js; git commit -m "test(backend): add truncateAll helper for integration test isolation"
```

---

## Task 4: Merchants vertical slice

This task adds the full Merchants resource: Zod schema → repository → service → controller → router → integration tests. Sub-phases (4a–4f) each end with a commit.

**Files (all NEW):**
- `d:\Projeler\kuryeTakip\backend\src\schemas\merchant.schema.js`
- `d:\Projeler\kuryeTakip\backend\src\repositories\merchant.repository.js`
- `d:\Projeler\kuryeTakip\backend\src\services\merchant.service.js`
- `d:\Projeler\kuryeTakip\backend\src\controllers\merchant.controller.js`
- `d:\Projeler\kuryeTakip\backend\src\routes\merchant.routes.js`
- `d:\Projeler\kuryeTakip\backend\tests\integration\merchants.api.test.js`

**Files modified:**
- `d:\Projeler\kuryeTakip\backend\src\app.js` (mount router in Phase 4f)

### Phase 4a: Zod schemas

- [ ] **Step 1: Create schema file**

Path: `d:\Projeler\kuryeTakip\backend\src\schemas\merchant.schema.js`

```js
const { z } = require('zod');

const merchantCreate = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    address: z.string().min(1),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    phone: z.string().max(20).optional(),
    is_active: z.boolean().optional(),
  }),
});

const merchantUpdate = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(255).optional(),
      address: z.string().min(1).optional(),
      latitude: z.number().gte(-90).lte(90).optional(),
      longitude: z.number().gte(-180).lte(180).optional(),
      phone: z.string().max(20).optional(),
      is_active: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' }),
});

const merchantIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { merchantCreate, merchantUpdate, merchantIdParam };
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/schemas/merchant.schema.js; git commit -m "feat(backend): add zod schemas for merchant create/update"
```

### Phase 4b: Repository

- [ ] **Step 1: Write the failing test**

Path: `d:\Projeler\kuryeTakip\backend\tests\integration\merchants.api.test.js` — start the file now, even though most blocks will be filled in later phases. For now, write just the repository test block:

```js
const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool, getPool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');
const { truncateAll } = require('../helpers/db');
const merchantRepo = require('../../src/repositories/merchant.repository');

describe('Merchants', () => {
  let app;

  beforeAll(() => { app = createApp(); });
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  describe('repository', () => {
    test('create then findById returns same row', async () => {
      const created = await merchantRepo.create({
        name: 'Pizza Place',
        address: '1 Main St',
        latitude: 41.0,
        longitude: 28.9,
        phone: '+901112223344',
        is_active: true,
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.name).toBe('Pizza Place');
      const fetched = await merchantRepo.findById(created.id);
      expect(fetched).toEqual(created);
    });

    test('findAll returns rows in newest-first order', async () => {
      const a = await merchantRepo.create({ name: 'A', address: 'x', latitude: 0, longitude: 0 });
      const b = await merchantRepo.create({ name: 'B', address: 'y', latitude: 0, longitude: 0 });
      const list = await merchantRepo.findAll();
      expect(list.map((m) => m.id)).toEqual([b.id, a.id]);
    });

    test('update returns the updated row', async () => {
      const m = await merchantRepo.create({ name: 'A', address: 'x', latitude: 0, longitude: 0 });
      const updated = await merchantRepo.update(m.id, { name: 'A2', is_active: false });
      expect(updated.name).toBe('A2');
      expect(updated.is_active).toBe(false);
      expect(updated.address).toBe('x'); // unchanged
    });

    test('update returns null when id does not exist', async () => {
      const result = await merchantRepo.update(
        '00000000-0000-0000-0000-000000000000',
        { name: 'X' },
      );
      expect(result).toBeNull();
    });

    test('delete returns true when row existed, false otherwise', async () => {
      const m = await merchantRepo.create({ name: 'A', address: 'x', latitude: 0, longitude: 0 });
      expect(await merchantRepo.deleteById(m.id)).toBe(true);
      expect(await merchantRepo.deleteById(m.id)).toBe(false);
    });

    test('findById returns null when id does not exist', async () => {
      expect(await merchantRepo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx jest tests/integration/merchants.api.test.js
```
Expected: FAIL with `Cannot find module '../../src/repositories/merchant.repository'`.

- [ ] **Step 3: Implement the repository**

Path: `d:\Projeler\kuryeTakip\backend\src\repositories\merchant.repository.js`

```js
const { getPool } = require('../config/database');

const COLUMNS = 'id, name, address, latitude, longitude, phone, is_active, created_at';

async function create(data) {
  const { name, address, latitude, longitude, phone, is_active } = data;
  const { rows } = await getPool().query(
    `INSERT INTO merchants (name, address, latitude, longitude, phone, is_active)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, true))
     RETURNING ${COLUMNS}`,
    [name, address, latitude, longitude, phone ?? null, is_active ?? null],
  );
  return rows[0];
}

async function findAll() {
  const { rows } = await getPool().query(
    `SELECT ${COLUMNS} FROM merchants ORDER BY created_at DESC`,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await getPool().query(
    `SELECT ${COLUMNS} FROM merchants WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

async function update(id, patch) {
  const allowed = ['name', 'address', 'latitude', 'longitude', 'phone', 'is_active'];
  const fields = allowed.filter((k) => patch[k] !== undefined);
  if (fields.length === 0) return findById(id);

  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map((f) => patch[f]);

  const { rows } = await getPool().query(
    `UPDATE merchants SET ${setClause} WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, ...values],
  );
  return rows[0] ?? null;
}

async function deleteById(id) {
  const { rowCount } = await getPool().query(`DELETE FROM merchants WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = { create, findAll, findById, update, deleteById };
```

- [ ] **Step 4: Run test to verify pass**

```powershell
npx jest tests/integration/merchants.api.test.js
```
Expected: PASS (6/6 within the `repository` describe; other describes don't exist yet).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/repositories/merchant.repository.js backend/tests/integration/merchants.api.test.js; git commit -m "feat(backend): add merchant repository + tests"
```

### Phase 4c: Service

- [ ] **Step 1: Append service test block to the same test file**

Insert this block inside the outer `describe('Merchants', ...)`, after the `describe('repository', ...)` block:

```js
  describe('service', () => {
    const merchantSvc = require('../../src/services/merchant.service');
    const { HttpError } = require('../../src/utils/errors');

    test('getById throws 404 HttpError when not found', async () => {
      await expect(
        merchantSvc.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(HttpError);
      try {
        await merchantSvc.getById('00000000-0000-0000-0000-000000000000');
      } catch (e) {
        expect(e.status).toBe(404);
        expect(e.code).toBe('NOT_FOUND');
      }
    });

    test('update throws 404 HttpError when id does not exist', async () => {
      await expect(
        merchantSvc.update('00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('remove throws 404 HttpError when id does not exist', async () => {
      await expect(
        merchantSvc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx jest tests/integration/merchants.api.test.js
```
Expected: FAIL with `Cannot find module '../../src/services/merchant.service'`.

- [ ] **Step 3: Implement the service**

Path: `d:\Projeler\kuryeTakip\backend\src\services\merchant.service.js`

```js
const merchantRepo = require('../repositories/merchant.repository');
const { HttpError } = require('../utils/errors');

async function create(data) {
  return merchantRepo.create(data);
}

async function list() {
  return merchantRepo.findAll();
}

async function getById(id) {
  const m = await merchantRepo.findById(id);
  if (!m) throw new HttpError(404, 'NOT_FOUND', `Merchant ${id} not found`);
  return m;
}

async function update(id, patch) {
  const updated = await merchantRepo.update(id, patch);
  if (!updated) throw new HttpError(404, 'NOT_FOUND', `Merchant ${id} not found`);
  return updated;
}

async function remove(id) {
  const deleted = await merchantRepo.deleteById(id);
  if (!deleted) throw new HttpError(404, 'NOT_FOUND', `Merchant ${id} not found`);
}

module.exports = { create, list, getById, update, remove };
```

- [ ] **Step 4: Run test to verify pass**

```powershell
npx jest tests/integration/merchants.api.test.js
```
Expected: PASS (6 repo + 3 service = 9/9).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/services/merchant.service.js backend/tests/integration/merchants.api.test.js; git commit -m "feat(backend): add merchant service with HttpError on missing rows"
```

### Phase 4d: Controller

- [ ] **Step 1: Create the controller**

Path: `d:\Projeler\kuryeTakip\backend\src\controllers\merchant.controller.js`

```js
const merchantSvc = require('../services/merchant.service');

async function create(req, res, next) {
  try {
    const merchant = await merchantSvc.create(req.body);
    res.status(201).json(merchant);
  } catch (err) { next(err); }
}

async function list(_req, res, next) {
  try {
    const merchants = await merchantSvc.list();
    res.json(merchants);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const merchant = await merchantSvc.getById(req.params.id);
    res.json(merchant);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const merchant = await merchantSvc.update(req.params.id, req.body);
    res.json(merchant);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await merchantSvc.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/controllers/merchant.controller.js; git commit -m "feat(backend): add merchant controller"
```

### Phase 4e: Router

- [ ] **Step 1: Create the router**

Path: `d:\Projeler\kuryeTakip\backend\src\routes\merchant.routes.js`

```js
const express = require('express');
const controller = require('../controllers/merchant.controller');
const { validate } = require('../middleware/validate');
const {
  merchantCreate,
  merchantUpdate,
  merchantIdParam,
} = require('../schemas/merchant.schema');

const router = express.Router();

router.post('/', validate(merchantCreate), controller.create);
router.get('/', controller.list);
router.get('/:id', validate(merchantIdParam), controller.getOne);
router.patch('/:id', validate(merchantUpdate), controller.update);
router.delete('/:id', validate(merchantIdParam), controller.remove);

module.exports = router;
```

- [ ] **Step 2: Mount router in `app.js`**

Modify: `d:\Projeler\kuryeTakip\backend\src\app.js`

Replace the entire file with:

```js
const express = require('express');
const healthRoutes = require('./routes/health.routes');
const merchantRoutes = require('./routes/merchant.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRoutes);
  app.use('/api/merchants', merchantRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/routes/merchant.routes.js backend/src/app.js; git commit -m "feat(backend): mount merchant routes at /api/merchants"
```

### Phase 4f: HTTP integration tests

- [ ] **Step 1: Append HTTP test block**

Insert at the bottom of the outer `describe('Merchants', ...)` block (before the closing brace of the outer describe), still inside the same `merchants.api.test.js`:

```js
  describe('HTTP', () => {
    const validBody = () => ({
      name: 'Pizza Hub',
      address: '5 Demo Street',
      latitude: 41.0082,
      longitude: 28.9784,
      phone: '+905001112233',
    });

    test('POST /api/merchants → 201 with created entity', async () => {
      const res = await request(app).post('/api/merchants').send(validBody());
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.name).toBe('Pizza Hub');
      expect(res.body.is_active).toBe(true); // default
    });

    test('POST /api/merchants → 400 when name missing', async () => {
      const body = validBody();
      delete body.name;
      const res = await request(app).post('/api/merchants').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.path.includes('name'))).toBe(true);
    });

    test('POST /api/merchants → 400 when latitude out of range', async () => {
      const res = await request(app).post('/api/merchants').send({ ...validBody(), latitude: 200 });
      expect(res.status).toBe(400);
    });

    test('GET /api/merchants → 200 with array', async () => {
      await request(app).post('/api/merchants').send(validBody());
      await request(app).post('/api/merchants').send({ ...validBody(), name: 'Second' });
      const res = await request(app).get('/api/merchants');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    test('GET /api/merchants → 200 with empty array when none', async () => {
      const res = await request(app).get('/api/merchants');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('GET /api/merchants/:id → 200 with entity', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const res = await request(app).get(`/api/merchants/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    test('GET /api/merchants/:id → 404 when not found', async () => {
      const res = await request(app).get('/api/merchants/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('GET /api/merchants/:id → 400 when id not a uuid', async () => {
      const res = await request(app).get('/api/merchants/not-a-uuid');
      expect(res.status).toBe(400);
    });

    test('PATCH /api/merchants/:id → 200 with updated entity', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const res = await request(app)
        .patch(`/api/merchants/${created.body.id}`)
        .send({ name: 'Renamed', is_active: false });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Renamed');
      expect(res.body.is_active).toBe(false);
    });

    test('PATCH /api/merchants/:id → 400 when body empty', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const res = await request(app).patch(`/api/merchants/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });

    test('PATCH /api/merchants/:id → 404 when not found', async () => {
      const res = await request(app)
        .patch('/api/merchants/00000000-0000-0000-0000-000000000000')
        .send({ name: 'X' });
      expect(res.status).toBe(404);
    });

    test('DELETE /api/merchants/:id → 204 then 404 on second delete', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const del = await request(app).delete(`/api/merchants/${created.body.id}`);
      expect(del.status).toBe(204);

      const second = await request(app).delete(`/api/merchants/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });
```

- [ ] **Step 2: Run all merchants tests**

```powershell
npx jest tests/integration/merchants.api.test.js
```
Expected: PASS (6 repo + 3 service + 12 HTTP = 21/21).

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/tests/integration/merchants.api.test.js; git commit -m "test(backend): add merchant HTTP integration tests"
```

---

## Task 5: Couriers vertical slice

Same shape as Task 4. Sub-phases 5a–5f. Repeated code shown in full per the No-Placeholders rule.

**Files (all NEW):**
- `d:\Projeler\kuryeTakip\backend\src\schemas\courier.schema.js`
- `d:\Projeler\kuryeTakip\backend\src\repositories\courier.repository.js`
- `d:\Projeler\kuryeTakip\backend\src\services\courier.service.js`
- `d:\Projeler\kuryeTakip\backend\src\controllers\courier.controller.js`
- `d:\Projeler\kuryeTakip\backend\src\routes\courier.routes.js`
- `d:\Projeler\kuryeTakip\backend\tests\integration\couriers.api.test.js`

### Phase 5a: Zod schemas

- [ ] **Step 1: Create schema file**

Path: `d:\Projeler\kuryeTakip\backend\src\schemas\courier.schema.js`

```js
const { z } = require('zod');

const vehicleType = z.enum(['bike', 'motorcycle', 'car']);
const status = z.enum(['offline', 'idle', 'delivering']);

const courierCreate = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    phone: z.string().min(1).max(20),
    vehicle_type: vehicleType.optional(),
    status: status.optional(),
  }),
});

const courierUpdate = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(255).optional(),
      phone: z.string().min(1).max(20).optional(),
      vehicle_type: vehicleType.optional(),
      status: status.optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' }),
});

const courierIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { courierCreate, courierUpdate, courierIdParam };
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/schemas/courier.schema.js; git commit -m "feat(backend): add zod schemas for courier create/update"
```

### Phase 5b: Repository

- [ ] **Step 1: Write the failing test (start the test file)**

Path: `d:\Projeler\kuryeTakip\backend\tests\integration\couriers.api.test.js`

```js
const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');
const { truncateAll } = require('../helpers/db');
const courierRepo = require('../../src/repositories/courier.repository');

describe('Couriers', () => {
  let app;

  beforeAll(() => { app = createApp(); });
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  describe('repository', () => {
    test('create then findById returns same row', async () => {
      const created = await courierRepo.create({
        name: 'Mehmet',
        phone: '+905551112233',
        vehicle_type: 'motorcycle',
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.name).toBe('Mehmet');
      expect(created.status).toBe('offline'); // schema default
      const fetched = await courierRepo.findById(created.id);
      expect(fetched).toEqual(created);
    });

    test('findAll returns rows in newest-first order', async () => {
      const a = await courierRepo.create({ name: 'A', phone: '+901111111111' });
      const b = await courierRepo.create({ name: 'B', phone: '+902222222222' });
      const list = await courierRepo.findAll();
      expect(list.map((c) => c.id)).toEqual([b.id, a.id]);
    });

    test('update returns the updated row', async () => {
      const c = await courierRepo.create({ name: 'A', phone: '+901111111111' });
      const updated = await courierRepo.update(c.id, { status: 'idle' });
      expect(updated.status).toBe('idle');
      expect(updated.name).toBe('A');
    });

    test('update returns null when id does not exist', async () => {
      expect(await courierRepo.update(
        '00000000-0000-0000-0000-000000000000',
        { name: 'X' },
      )).toBeNull();
    });

    test('delete returns true when row existed, false otherwise', async () => {
      const c = await courierRepo.create({ name: 'A', phone: '+901111111111' });
      expect(await courierRepo.deleteById(c.id)).toBe(true);
      expect(await courierRepo.deleteById(c.id)).toBe(false);
    });

    test('findById returns null when id does not exist', async () => {
      expect(await courierRepo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });

    test('create fails when phone is duplicate', async () => {
      await courierRepo.create({ name: 'A', phone: '+905551112233' });
      await expect(
        courierRepo.create({ name: 'B', phone: '+905551112233' }),
      ).rejects.toThrow(/unique/i);
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx jest tests/integration/couriers.api.test.js
```
Expected: FAIL with `Cannot find module '../../src/repositories/courier.repository'`.

- [ ] **Step 3: Implement the repository**

Path: `d:\Projeler\kuryeTakip\backend\src\repositories\courier.repository.js`

```js
const { getPool } = require('../config/database');

const COLUMNS = 'id, name, phone, vehicle_type, status, created_at';

async function create(data) {
  const { name, phone, vehicle_type, status } = data;
  const { rows } = await getPool().query(
    `INSERT INTO couriers (name, phone, vehicle_type, status)
     VALUES ($1, $2, $3, COALESCE($4, 'offline'))
     RETURNING ${COLUMNS}`,
    [name, phone, vehicle_type ?? null, status ?? null],
  );
  return rows[0];
}

async function findAll() {
  const { rows } = await getPool().query(
    `SELECT ${COLUMNS} FROM couriers ORDER BY created_at DESC`,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await getPool().query(
    `SELECT ${COLUMNS} FROM couriers WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

async function update(id, patch) {
  const allowed = ['name', 'phone', 'vehicle_type', 'status'];
  const fields = allowed.filter((k) => patch[k] !== undefined);
  if (fields.length === 0) return findById(id);

  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map((f) => patch[f]);

  const { rows } = await getPool().query(
    `UPDATE couriers SET ${setClause} WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, ...values],
  );
  return rows[0] ?? null;
}

async function deleteById(id) {
  const { rowCount } = await getPool().query(`DELETE FROM couriers WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = { create, findAll, findById, update, deleteById };
```

- [ ] **Step 4: Run test to verify pass**

```powershell
npx jest tests/integration/couriers.api.test.js
```
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/repositories/courier.repository.js backend/tests/integration/couriers.api.test.js; git commit -m "feat(backend): add courier repository + tests"
```

### Phase 5c: Service

- [ ] **Step 1: Append service test block (inside outer `describe('Couriers', ...)`)**

```js
  describe('service', () => {
    const courierSvc = require('../../src/services/courier.service');
    const { HttpError } = require('../../src/utils/errors');

    test('getById throws 404 HttpError when not found', async () => {
      await expect(
        courierSvc.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('update throws 404 when id does not exist', async () => {
      await expect(
        courierSvc.update('00000000-0000-0000-0000-000000000000', { status: 'idle' }),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('remove throws 404 when id does not exist', async () => {
      await expect(
        courierSvc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('create surfaces duplicate phone as 400 INVALID_INPUT', async () => {
      await courierSvc.create({ name: 'A', phone: '+905551112233' });
      await expect(
        courierSvc.create({ name: 'B', phone: '+905551112233' }),
      ).rejects.toMatchObject({ status: 400, code: 'DUPLICATE_PHONE' });
    });
  });
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx jest tests/integration/couriers.api.test.js
```
Expected: FAIL with `Cannot find module '../../src/services/courier.service'`.

- [ ] **Step 3: Implement the service**

Path: `d:\Projeler\kuryeTakip\backend\src\services\courier.service.js`

```js
const courierRepo = require('../repositories/courier.repository');
const { HttpError } = require('../utils/errors');

const PG_UNIQUE_VIOLATION = '23505';

async function create(data) {
  try {
    return await courierRepo.create(data);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION && err.constraint === 'couriers_phone_key') {
      throw new HttpError(400, 'DUPLICATE_PHONE', `Phone ${data.phone} already registered`);
    }
    throw err;
  }
}

async function list() {
  return courierRepo.findAll();
}

async function getById(id) {
  const c = await courierRepo.findById(id);
  if (!c) throw new HttpError(404, 'NOT_FOUND', `Courier ${id} not found`);
  return c;
}

async function update(id, patch) {
  const updated = await courierRepo.update(id, patch);
  if (!updated) throw new HttpError(404, 'NOT_FOUND', `Courier ${id} not found`);
  return updated;
}

async function remove(id) {
  const deleted = await courierRepo.deleteById(id);
  if (!deleted) throw new HttpError(404, 'NOT_FOUND', `Courier ${id} not found`);
}

module.exports = { create, list, getById, update, remove };
```

- [ ] **Step 4: Run test to verify pass**

```powershell
npx jest tests/integration/couriers.api.test.js
```
Expected: PASS (7 repo + 4 service = 11/11).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/services/courier.service.js backend/tests/integration/couriers.api.test.js; git commit -m "feat(backend): add courier service with duplicate-phone HttpError"
```

### Phase 5d: Controller

- [ ] **Step 1: Create the controller**

Path: `d:\Projeler\kuryeTakip\backend\src\controllers\courier.controller.js`

```js
const courierSvc = require('../services/courier.service');

async function create(req, res, next) {
  try {
    const courier = await courierSvc.create(req.body);
    res.status(201).json(courier);
  } catch (err) { next(err); }
}

async function list(_req, res, next) {
  try {
    res.json(await courierSvc.list());
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await courierSvc.getById(req.params.id));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await courierSvc.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await courierSvc.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/controllers/courier.controller.js; git commit -m "feat(backend): add courier controller"
```

### Phase 5e: Router + mount

- [ ] **Step 1: Create the router**

Path: `d:\Projeler\kuryeTakip\backend\src\routes\courier.routes.js`

```js
const express = require('express');
const controller = require('../controllers/courier.controller');
const { validate } = require('../middleware/validate');
const {
  courierCreate,
  courierUpdate,
  courierIdParam,
} = require('../schemas/courier.schema');

const router = express.Router();

router.post('/', validate(courierCreate), controller.create);
router.get('/', controller.list);
router.get('/:id', validate(courierIdParam), controller.getOne);
router.patch('/:id', validate(courierUpdate), controller.update);
router.delete('/:id', validate(courierIdParam), controller.remove);

module.exports = router;
```

- [ ] **Step 2: Mount router in `app.js`**

Modify: `d:\Projeler\kuryeTakip\backend\src\app.js`

Replace the entire file with:

```js
const express = require('express');
const healthRoutes = require('./routes/health.routes');
const merchantRoutes = require('./routes/merchant.routes');
const courierRoutes = require('./routes/courier.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRoutes);
  app.use('/api/merchants', merchantRoutes);
  app.use('/api/couriers', courierRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/routes/courier.routes.js backend/src/app.js; git commit -m "feat(backend): mount courier routes at /api/couriers"
```

### Phase 5f: HTTP integration tests

- [ ] **Step 1: Append HTTP test block (inside outer `describe('Couriers', ...)`)**

```js
  describe('HTTP', () => {
    const validBody = () => ({
      name: 'Mehmet',
      phone: '+905551112233',
      vehicle_type: 'motorcycle',
    });

    test('POST /api/couriers → 201 with created entity', async () => {
      const res = await request(app).post('/api/couriers').send(validBody());
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.status).toBe('offline'); // default
    });

    test('POST /api/couriers → 400 when name missing', async () => {
      const body = validBody();
      delete body.name;
      const res = await request(app).post('/api/couriers').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /api/couriers → 400 when vehicle_type not in enum', async () => {
      const res = await request(app)
        .post('/api/couriers')
        .send({ ...validBody(), vehicle_type: 'spaceship' });
      expect(res.status).toBe(400);
    });

    test('POST /api/couriers → 400 DUPLICATE_PHONE on second create with same phone', async () => {
      await request(app).post('/api/couriers').send(validBody());
      const res = await request(app)
        .post('/api/couriers')
        .send({ ...validBody(), name: 'Other' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_PHONE');
    });

    test('GET /api/couriers → 200 with array', async () => {
      await request(app).post('/api/couriers').send(validBody());
      await request(app).post('/api/couriers').send({ ...validBody(), phone: '+905552223344' });
      const res = await request(app).get('/api/couriers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('GET /api/couriers/:id → 200 with entity', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const res = await request(app).get(`/api/couriers/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    test('GET /api/couriers/:id → 404 when not found', async () => {
      const res = await request(app).get('/api/couriers/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    test('PATCH /api/couriers/:id → 200 with updated entity', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const res = await request(app)
        .patch(`/api/couriers/${created.body.id}`)
        .send({ status: 'idle' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('idle');
    });

    test('PATCH /api/couriers/:id → 400 when body empty', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const res = await request(app).patch(`/api/couriers/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });

    test('DELETE /api/couriers/:id → 204 then 404', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const del = await request(app).delete(`/api/couriers/${created.body.id}`);
      expect(del.status).toBe(204);
      const second = await request(app).delete(`/api/couriers/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });
```

- [ ] **Step 2: Run all couriers tests**

```powershell
npx jest tests/integration/couriers.api.test.js
```
Expected: PASS (7 repo + 4 service + 10 HTTP = 21/21).

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/tests/integration/couriers.api.test.js; git commit -m "test(backend): add courier HTTP integration tests"
```

---

## Task 6: Orders vertical slice

Orders are the most complex — they reference both `merchants` (required) and `couriers` (optional, set on assignment) via FK, and they have a status state-machine. Sub-phases 6a–6f.

**Files (all NEW):**
- `d:\Projeler\kuryeTakip\backend\src\schemas\order.schema.js`
- `d:\Projeler\kuryeTakip\backend\src\repositories\order.repository.js`
- `d:\Projeler\kuryeTakip\backend\src\services\order.service.js`
- `d:\Projeler\kuryeTakip\backend\src\controllers\order.controller.js`
- `d:\Projeler\kuryeTakip\backend\src\routes\order.routes.js`
- `d:\Projeler\kuryeTakip\backend\tests\integration\orders.api.test.js`

### Phase 6a: Zod schemas

- [ ] **Step 1: Create schema file**

Path: `d:\Projeler\kuryeTakip\backend\src\schemas\order.schema.js`

```js
const { z } = require('zod');

const status = z.enum([
  'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled',
]);

const orderCreate = z.object({
  body: z.object({
    merchant_id: z.string().uuid(),
    customer_name: z.string().min(1).max(255),
    delivery_address: z.string().min(1),
    delivery_lat: z.number().gte(-90).lte(90),
    delivery_lng: z.number().gte(-180).lte(180),
  }),
});

const orderUpdate = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      courier_id: z.string().uuid().nullable().optional(),
      status: status.optional(),
      customer_name: z.string().min(1).max(255).optional(),
      delivery_address: z.string().min(1).optional(),
      delivery_lat: z.number().gte(-90).lte(90).optional(),
      delivery_lng: z.number().gte(-180).lte(180).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' }),
});

const orderIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const orderListQuery = z.object({
  query: z.object({
    status: status.optional(),
    courier_id: z.string().uuid().optional(),
  }),
});

module.exports = { orderCreate, orderUpdate, orderIdParam, orderListQuery };
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/schemas/order.schema.js; git commit -m "feat(backend): add zod schemas for order create/update/list"
```

### Phase 6b: Repository

- [ ] **Step 1: Write the failing test (start the test file)**

Path: `d:\Projeler\kuryeTakip\backend\tests\integration\orders.api.test.js`

```js
const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');
const { truncateAll } = require('../helpers/db');
const merchantRepo = require('../../src/repositories/merchant.repository');
const courierRepo = require('../../src/repositories/courier.repository');
const orderRepo = require('../../src/repositories/order.repository');

describe('Orders', () => {
  let app;
  let merchant;
  let courier;

  beforeAll(() => { app = createApp(); });

  beforeEach(async () => {
    await truncateAll();
    merchant = await merchantRepo.create({
      name: 'M1', address: 'addr', latitude: 41, longitude: 28,
    });
    courier = await courierRepo.create({
      name: 'C1', phone: '+905551112233', vehicle_type: 'bike',
    });
  });

  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  describe('repository', () => {
    const baseOrder = () => ({
      merchant_id: merchant.id,
      customer_name: 'Ali',
      delivery_address: '1 Customer St',
      delivery_lat: 41.01,
      delivery_lng: 28.98,
    });

    test('create then findById returns same row with defaults applied', async () => {
      const created = await orderRepo.create(baseOrder());
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.status).toBe('pending');
      expect(created.courier_id).toBeNull();
      const fetched = await orderRepo.findById(created.id);
      expect(fetched).toEqual(created);
    });

    test('findAll returns rows in newest-first order', async () => {
      const a = await orderRepo.create(baseOrder());
      const b = await orderRepo.create(baseOrder());
      const list = await orderRepo.findAll({});
      expect(list.map((o) => o.id)).toEqual([b.id, a.id]);
    });

    test('findAll filters by status', async () => {
      const a = await orderRepo.create(baseOrder());
      await orderRepo.create(baseOrder());
      await orderRepo.update(a.id, { status: 'delivered' });
      const delivered = await orderRepo.findAll({ status: 'delivered' });
      expect(delivered).toHaveLength(1);
      expect(delivered[0].id).toBe(a.id);
    });

    test('findAll filters by courier_id', async () => {
      const a = await orderRepo.create(baseOrder());
      await orderRepo.create(baseOrder());
      await orderRepo.update(a.id, { courier_id: courier.id });
      const filtered = await orderRepo.findAll({ courier_id: courier.id });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(a.id);
    });

    test('update sets courier_id and assigned_at when assigning', async () => {
      const o = await orderRepo.create(baseOrder());
      const updated = await orderRepo.update(o.id, {
        courier_id: courier.id,
        status: 'assigned',
        assigned_at: new Date(),
      });
      expect(updated.courier_id).toBe(courier.id);
      expect(updated.status).toBe('assigned');
      expect(updated.assigned_at).toBeInstanceOf(Date);
    });

    test('update returns null when id does not exist', async () => {
      expect(await orderRepo.update(
        '00000000-0000-0000-0000-000000000000',
        { status: 'delivered' },
      )).toBeNull();
    });

    test('delete returns true when row existed, false otherwise', async () => {
      const o = await orderRepo.create(baseOrder());
      expect(await orderRepo.deleteById(o.id)).toBe(true);
      expect(await orderRepo.deleteById(o.id)).toBe(false);
    });

    test('create fails when merchant_id does not exist', async () => {
      await expect(
        orderRepo.create({ ...baseOrder(), merchant_id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toThrow(/foreign key/i);
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx jest tests/integration/orders.api.test.js
```
Expected: FAIL with `Cannot find module '../../src/repositories/order.repository'`.

- [ ] **Step 3: Implement the repository**

Path: `d:\Projeler\kuryeTakip\backend\src\repositories\order.repository.js`

```js
const { getPool } = require('../config/database');

const COLUMNS = `id, merchant_id, courier_id, customer_name, delivery_address,
                 delivery_lat, delivery_lng, status,
                 assigned_at, picked_up_at, delivered_at, created_at`;

async function create(data) {
  const { merchant_id, customer_name, delivery_address, delivery_lat, delivery_lng } = data;
  const { rows } = await getPool().query(
    `INSERT INTO orders (merchant_id, customer_name, delivery_address, delivery_lat, delivery_lng)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [merchant_id, customer_name, delivery_address, delivery_lat, delivery_lng],
  );
  return rows[0];
}

async function findAll(filters = {}) {
  const where = [];
  const values = [];

  if (filters.status !== undefined) {
    values.push(filters.status);
    where.push(`status = $${values.length}`);
  }
  if (filters.courier_id !== undefined) {
    values.push(filters.courier_id);
    where.push(`courier_id = $${values.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await getPool().query(
    `SELECT ${COLUMNS} FROM orders ${whereClause} ORDER BY created_at DESC`,
    values,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await getPool().query(
    `SELECT ${COLUMNS} FROM orders WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

async function update(id, patch) {
  const allowed = [
    'courier_id', 'status', 'customer_name', 'delivery_address',
    'delivery_lat', 'delivery_lng',
    'assigned_at', 'picked_up_at', 'delivered_at',
  ];
  const fields = allowed.filter((k) => patch[k] !== undefined);
  if (fields.length === 0) return findById(id);

  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map((f) => patch[f]);

  const { rows } = await getPool().query(
    `UPDATE orders SET ${setClause} WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, ...values],
  );
  return rows[0] ?? null;
}

async function deleteById(id) {
  const { rowCount } = await getPool().query(`DELETE FROM orders WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = { create, findAll, findById, update, deleteById };
```

- [ ] **Step 4: Run test to verify pass**

```powershell
npx jest tests/integration/orders.api.test.js
```
Expected: PASS (8/8).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/repositories/order.repository.js backend/tests/integration/orders.api.test.js; git commit -m "feat(backend): add order repository + tests with status/courier filters"
```

### Phase 6c: Service

The service enforces business rules: assigning a courier auto-sets `status='assigned'` and `assigned_at=now()`; setting status to `picked_up` / `delivered` stamps the matching timestamp; invalid FK references surface as 400s.

- [ ] **Step 1: Append service test block (inside outer `describe('Orders', ...)`)**

```js
  describe('service', () => {
    const orderSvc = require('../../src/services/order.service');
    const { HttpError } = require('../../src/utils/errors');

    const baseOrder = () => ({
      merchant_id: merchant.id,
      customer_name: 'Ali',
      delivery_address: '1 St',
      delivery_lat: 41.01,
      delivery_lng: 28.98,
    });

    test('create surfaces missing merchant as 400 INVALID_REFERENCE', async () => {
      await expect(
        orderSvc.create({ ...baseOrder(), merchant_id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toMatchObject({ status: 400, code: 'INVALID_REFERENCE' });
    });

    test('getById throws 404 when not found', async () => {
      await expect(
        orderSvc.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('assigning a courier auto-sets status=assigned and assigned_at', async () => {
      const o = await orderSvc.create(baseOrder());
      const updated = await orderSvc.update(o.id, { courier_id: courier.id });
      expect(updated.status).toBe('assigned');
      expect(updated.courier_id).toBe(courier.id);
      expect(updated.assigned_at).not.toBeNull();
    });

    test('clearing courier_id sets status back to pending', async () => {
      const o = await orderSvc.create(baseOrder());
      await orderSvc.update(o.id, { courier_id: courier.id });
      const updated = await orderSvc.update(o.id, { courier_id: null });
      expect(updated.courier_id).toBeNull();
      expect(updated.status).toBe('pending');
    });

    test('setting status=picked_up stamps picked_up_at', async () => {
      const o = await orderSvc.create(baseOrder());
      await orderSvc.update(o.id, { courier_id: courier.id });
      const updated = await orderSvc.update(o.id, { status: 'picked_up' });
      expect(updated.status).toBe('picked_up');
      expect(updated.picked_up_at).not.toBeNull();
    });

    test('setting status=delivered stamps delivered_at', async () => {
      const o = await orderSvc.create(baseOrder());
      await orderSvc.update(o.id, { courier_id: courier.id });
      const updated = await orderSvc.update(o.id, { status: 'delivered' });
      expect(updated.delivered_at).not.toBeNull();
    });

    test('update surfaces missing courier_id as 400 INVALID_REFERENCE', async () => {
      const o = await orderSvc.create(baseOrder());
      await expect(
        orderSvc.update(o.id, { courier_id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toMatchObject({ status: 400, code: 'INVALID_REFERENCE' });
    });

    test('remove throws 404 when id does not exist', async () => {
      await expect(
        orderSvc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx jest tests/integration/orders.api.test.js
```
Expected: FAIL with `Cannot find module '../../src/services/order.service'`.

- [ ] **Step 3: Implement the service**

Path: `d:\Projeler\kuryeTakip\backend\src\services\order.service.js`

```js
const orderRepo = require('../repositories/order.repository');
const { HttpError } = require('../utils/errors');

const PG_FK_VIOLATION = '23503';

function wrapFk(err) {
  if (err.code === PG_FK_VIOLATION) {
    const which = err.constraint && err.constraint.includes('merchant') ? 'merchant_id' : 'courier_id';
    return new HttpError(400, 'INVALID_REFERENCE', `Referenced ${which} does not exist`);
  }
  return err;
}

async function create(data) {
  try {
    return await orderRepo.create(data);
  } catch (err) {
    throw wrapFk(err);
  }
}

async function list(filters) {
  return orderRepo.findAll(filters);
}

async function getById(id) {
  const o = await orderRepo.findById(id);
  if (!o) throw new HttpError(404, 'NOT_FOUND', `Order ${id} not found`);
  return o;
}

async function update(id, patch) {
  const effective = { ...patch };
  const now = new Date();

  // Auto status transitions driven by courier_id assignment / unassignment
  if (patch.courier_id !== undefined && patch.status === undefined) {
    if (patch.courier_id === null) {
      effective.status = 'pending';
    } else {
      effective.status = 'assigned';
      effective.assigned_at = now;
    }
  }

  // Timestamp stamps when status moves forward
  if (patch.status === 'picked_up') effective.picked_up_at = now;
  if (patch.status === 'delivered') effective.delivered_at = now;
  if (patch.status === 'assigned' && patch.assigned_at === undefined) {
    effective.assigned_at = now;
  }

  try {
    const updated = await orderRepo.update(id, effective);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', `Order ${id} not found`);
    return updated;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw wrapFk(err);
  }
}

async function remove(id) {
  const deleted = await orderRepo.deleteById(id);
  if (!deleted) throw new HttpError(404, 'NOT_FOUND', `Order ${id} not found`);
}

module.exports = { create, list, getById, update, remove };
```

- [ ] **Step 4: Run test to verify pass**

```powershell
npx jest tests/integration/orders.api.test.js
```
Expected: PASS (8 repo + 8 service = 16/16).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/services/order.service.js backend/tests/integration/orders.api.test.js; git commit -m "feat(backend): add order service with auto-assignment and status timestamps"
```

### Phase 6d: Controller

- [ ] **Step 1: Create the controller**

Path: `d:\Projeler\kuryeTakip\backend\src\controllers\order.controller.js`

```js
const orderSvc = require('../services/order.service');

async function create(req, res, next) {
  try {
    const order = await orderSvc.create(req.body);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json(await orderSvc.list(req.query));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await orderSvc.getById(req.params.id));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await orderSvc.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await orderSvc.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/controllers/order.controller.js; git commit -m "feat(backend): add order controller"
```

### Phase 6e: Router + mount

- [ ] **Step 1: Create the router**

Path: `d:\Projeler\kuryeTakip\backend\src\routes\order.routes.js`

```js
const express = require('express');
const controller = require('../controllers/order.controller');
const { validate } = require('../middleware/validate');
const {
  orderCreate,
  orderUpdate,
  orderIdParam,
  orderListQuery,
} = require('../schemas/order.schema');

const router = express.Router();

router.post('/', validate(orderCreate), controller.create);
router.get('/', validate(orderListQuery), controller.list);
router.get('/:id', validate(orderIdParam), controller.getOne);
router.patch('/:id', validate(orderUpdate), controller.update);
router.delete('/:id', validate(orderIdParam), controller.remove);

module.exports = router;
```

- [ ] **Step 2: Mount router in `app.js`**

Modify: `d:\Projeler\kuryeTakip\backend\src\app.js`

Replace the entire file with:

```js
const express = require('express');
const healthRoutes = require('./routes/health.routes');
const merchantRoutes = require('./routes/merchant.routes');
const courierRoutes = require('./routes/courier.routes');
const orderRoutes = require('./routes/order.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRoutes);
  app.use('/api/merchants', merchantRoutes);
  app.use('/api/couriers', courierRoutes);
  app.use('/api/orders', orderRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/src/routes/order.routes.js backend/src/app.js; git commit -m "feat(backend): mount order routes at /api/orders"
```

### Phase 6f: HTTP integration tests

- [ ] **Step 1: Append HTTP test block (inside outer `describe('Orders', ...)`)**

```js
  describe('HTTP', () => {
    const baseBody = () => ({
      merchant_id: merchant.id,
      customer_name: 'Ali',
      delivery_address: '1 Customer St',
      delivery_lat: 41.01,
      delivery_lng: 28.98,
    });

    test('POST /api/orders → 201 with created entity', async () => {
      const res = await request(app).post('/api/orders').send(baseBody());
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.status).toBe('pending');
      expect(res.body.courier_id).toBeNull();
    });

    test('POST /api/orders → 400 INVALID_REFERENCE when merchant_id unknown', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...baseBody(), merchant_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REFERENCE');
    });

    test('POST /api/orders → 400 VALIDATION_ERROR when latitude missing', async () => {
      const body = baseBody();
      delete body.delivery_lat;
      const res = await request(app).post('/api/orders').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('GET /api/orders → 200 with all orders', async () => {
      await request(app).post('/api/orders').send(baseBody());
      await request(app).post('/api/orders').send(baseBody());
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('GET /api/orders?status=delivered → filters list', async () => {
      const a = await request(app).post('/api/orders').send(baseBody());
      await request(app).post('/api/orders').send(baseBody());
      await request(app)
        .patch(`/api/orders/${a.body.id}`)
        .send({ courier_id: courier.id });
      await request(app)
        .patch(`/api/orders/${a.body.id}`)
        .send({ status: 'delivered' });

      const res = await request(app).get('/api/orders?status=delivered');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(a.body.id);
    });

    test('GET /api/orders/:id → 200 with entity', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app).get(`/api/orders/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    test('GET /api/orders/:id → 404 when not found', async () => {
      const res = await request(app).get('/api/orders/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    test('PATCH /api/orders/:id → assigns courier and auto-sets status=assigned', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ courier_id: courier.id });
      expect(res.status).toBe(200);
      expect(res.body.courier_id).toBe(courier.id);
      expect(res.body.status).toBe('assigned');
      expect(res.body.assigned_at).not.toBeNull();
    });

    test('PATCH /api/orders/:id → 400 INVALID_REFERENCE for missing courier_id', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ courier_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REFERENCE');
    });

    test('PATCH /api/orders/:id → status=delivered stamps delivered_at', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ courier_id: courier.id });
      const res = await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ status: 'delivered' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('delivered');
      expect(res.body.delivered_at).not.toBeNull();
    });

    test('PATCH /api/orders/:id → 400 when body empty', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app).patch(`/api/orders/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });

    test('PATCH /api/orders/:id → 404 when not found', async () => {
      const res = await request(app)
        .patch('/api/orders/00000000-0000-0000-0000-000000000000')
        .send({ status: 'cancelled' });
      expect(res.status).toBe(404);
    });

    test('DELETE /api/orders/:id → 204 then 404', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const del = await request(app).delete(`/api/orders/${created.body.id}`);
      expect(del.status).toBe(204);
      const second = await request(app).delete(`/api/orders/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });
```

- [ ] **Step 2: Run all orders tests**

```powershell
npx jest tests/integration/orders.api.test.js
```
Expected: PASS (8 repo + 8 service + 13 HTTP = 29/29).

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/tests/integration/orders.api.test.js; git commit -m "test(backend): add order HTTP integration tests"
```

---

## Task 7: Final verification + manual smoke test

- [ ] **Step 1: Run the full suite**

```powershell
cd "d:/Projeler/kuryeTakip/backend"; npm test
```
Expected counts:
- `tests/unit/env.test.js` — 5
- `tests/unit/logger.test.js` — 3
- `tests/unit/errors.test.js` — 3
- `tests/unit/validate.test.js` — 4
- `tests/integration/database.test.js` — 3
- `tests/integration/redis.test.js` — 4
- `tests/integration/health.test.js` — 2
- `tests/integration/merchants.api.test.js` — 21
- `tests/integration/couriers.api.test.js` — 21
- `tests/integration/orders.api.test.js` — 29

Total expected: **95/95 PASS**.

- [ ] **Step 2: Start the server**

```powershell
npm start
```
Expected log: `Server listening on http://localhost:3000`.

- [ ] **Step 3: Manual smoke — create a merchant, courier, order, then assign**

In a second PowerShell window:

```powershell
# Create merchant
$merchant = (Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/merchants -ContentType 'application/json' -Body '{"name":"Smoke Pizza","address":"5 Demo St","latitude":41.0082,"longitude":28.9784}')
$merchant

# Create courier
$courier = (Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/couriers -ContentType 'application/json' -Body '{"name":"Smoke Mehmet","phone":"+905559998877","vehicle_type":"motorcycle"}')
$courier

# Create order
$orderBody = "{`"merchant_id`":`"$($merchant.id)`",`"customer_name`":`"Smoke Customer`",`"delivery_address`":`"7 Customer St`",`"delivery_lat`":41.01,`"delivery_lng`":28.98}"
$order = (Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/orders -ContentType 'application/json' -Body $orderBody)
$order

# Assign courier
$assignBody = "{`"courier_id`":`"$($courier.id)`"}"
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/orders/$($order.id)" -ContentType 'application/json' -Body $assignBody

# List orders filtered by courier
Invoke-RestMethod -Uri "http://localhost:3000/api/orders?courier_id=$($courier.id)"
```

Expected: each step prints JSON without errors. The final PATCH response shows `status: "assigned"` and `assigned_at` non-null. The filtered list returns exactly one order.

- [ ] **Step 4: Stop server with Ctrl+C**

Expected: shutdown log lines, process exits cleanly.

- [ ] **Step 5: Tag the milestone**

```powershell
cd "d:/Projeler/kuryeTakip"; git tag -a sub-project-2-complete -m "Sub-Project 2: CRUD REST APIs (merchants, couriers, orders)"
```

---

## Acceptance Criteria

Sub-Project 2 is **done** when all of these are true:

1. `npm test` passes 95/95 tests (8 unit + 87 integration).
2. `GET /api/merchants`, `/api/couriers`, `/api/orders` return arrays.
3. `POST` to each resource creates with 201 + entity body; 400 on schema violations.
4. `GET /api/<resource>/:id` returns 200 with entity, 404 for unknown id, 400 for non-uuid id.
5. `PATCH` partial updates work; empty body returns 400; unknown id returns 404.
6. `DELETE` returns 204; second delete of same id returns 404.
7. Orders enforce FK on `merchant_id` (400 INVALID_REFERENCE) and `courier_id` (400 INVALID_REFERENCE).
8. Assigning a courier to an order auto-sets `status='assigned'` and `assigned_at`.
9. Setting status to `picked_up` / `delivered` stamps the corresponding timestamp.
10. Tag `sub-project-2-complete` exists.

---

## What's NOT in this sub-project (handled later)

- Redis GEO writes / location ingestion → **Sub-Project 3**
- Socket.io / WebSocket broadcasts of order events → **Sub-Project 4**
- OSRM route preview on assignment → **Sub-Project 5**
- Pagination, search, sort on list endpoints → future enhancement
- Authentication / JWT (Users table exists in schema but no auth flow) → future enhancement

---

## Next Step

After this plan completes and you've tagged `sub-project-2-complete`, return to `superpowers:writing-plans` and we'll write **Sub-Project 3: Location Ingestion Hot Path** (Redis GEOADD + HSET + PUBLISH, async snapshot batch writer, rate-limited `POST /api/couriers/:id/location` endpoint).
