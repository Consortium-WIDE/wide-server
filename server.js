require('dotenv').config();
const cors = require('cors');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors(
  {
    origin: process.env.WEB_DOMAIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

app.use(session({
  secret: process.env.SESSION_SECRET, // Secret used to sign the session ID cookie
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_USE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge: parseInt(process.env.COOKIE_EXPIRY_MILLISECONDS, 10) || 3600000
  }
  // If using a store for production (recommended), configure it here
}));

console.log('starting server for CORS origin: ', process.env.WEB_DOMAIN);

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDefinition = YAML.load('swaggerDef.yaml');

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // adjust this to point to your route files
};

const swaggerSpec = swaggerJsdoc(options);
const storage = require('./routes/storage');
const storageLegacyRoutes = require('./routes/storageLegacy');
const siweRoutes = require('./routes/siwe');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/storage', storage);
app.use('/storage-legacy', storageLegacyRoutes);
app.use('/siwe', siweRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
