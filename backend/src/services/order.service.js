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

  if (patch.courier_id !== undefined && patch.status === undefined) {
    if (patch.courier_id === null) {
      effective.status = 'pending';
    } else {
      effective.status = 'assigned';
      effective.assigned_at = now;
    }
  }

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
