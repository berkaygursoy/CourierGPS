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
