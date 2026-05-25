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
