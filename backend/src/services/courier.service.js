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
