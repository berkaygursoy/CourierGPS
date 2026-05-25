const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'CLIENT_ERROR');
  const message = status >= 500 ? 'Internal server error' : err.message;

  logger.error('Request failed', {
    method: req.method,
    url: req.originalUrl,
    status,
    code,
    error: err.message,
    stack: err.stack,
  });

  res.status(status).json({
    error: { code, message },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };
