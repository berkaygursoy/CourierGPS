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
