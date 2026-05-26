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
