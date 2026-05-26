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
