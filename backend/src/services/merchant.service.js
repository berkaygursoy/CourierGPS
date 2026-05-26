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
