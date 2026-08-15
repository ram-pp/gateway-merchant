const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const openapiDoc = require('./openapi.json');

const v1Routes = require('./routes/v1.routes');
const merchantRoutes = require('./routes/merchant.routes');
const adminRoutes = require('./routes/admin.routes');
const publicRoutes = require('./routes/public.routes');
const forwarderDeviceRoutes = require('./routes/forwarderDevice.routes');

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === 'null') return callback(null, true);
      if (env.NODE_ENV === 'development') return callback(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ ok: true, service: 'merchant-pay-api', time: new Date().toISOString() }));
app.get('/api/v1/openapi.json', (req, res) => res.json(openapiDoc));

app.use('/api/v1', v1Routes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/forwarder', forwarderDeviceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
