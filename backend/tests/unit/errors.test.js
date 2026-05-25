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
