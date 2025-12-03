const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const xss = require('xss-clean');
const hpp = require('hpp');
const { generalLimiter: globalLimiter } = require('./middlewares/rate-limit.middleware'); // Use advanced limiter
const errorHandler = require('./middlewares/errorHandler');
const { multiTenantMiddleware } = require('./middlewares/multi-tenant.middleware');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const personsRoutes = require('./modules/persons/persons.routes'); // Legacy route
const casesRoutes = require('./modules/cases/cases.routes'); // New cases route
const adminRoutes = require('./modules/admin/admin.routes');
const uploadRoutes = require('./modules/uploads/upload.routes');
const organizationsRoutes = require('./modules/organizations/organizations.routes');
const zonesRoutes = require('./modules/zones/zones.routes');
const teamsRoutes = require('./modules/teams/teams.routes');
const statisticsRoutes = require('./modules/statistics/statistics.routes');
const auditRoutes = require('./modules/audit/audit.routes');

require('express-async-errors');

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, 'docs/openapi.yaml'));

// Middlewares
// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting
app.use('/api', globalLimiter); // Apply rate limit to all API routes

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/persons', personsRoutes); // Legacy support
app.use('/api/cases', casesRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/service-points', require('./modules/service-points/service-points.routes'));
app.use('/api/homeless', require('./modules/homeless/homeless.routes'));
app.use('/api/realtime', require('./modules/realtime/realtime.routes'));
app.use('/api/sessions', require('./modules/sessions/session.routes'));
app.use('/api/permissions', require('./modules/permissions/permission.routes'));
app.use('/api/consents', require('./modules/consents/consent.routes'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json({ message: 'Abrazar API is running 🚀' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
