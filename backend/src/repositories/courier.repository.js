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
