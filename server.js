require('dotenv').config();
const cors = require('cors');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { redisClient } = require('./redisClient'); // Your Redis client

const app = express();
app.set('trust proxy', 1); // Trust the first proxy
app.use(express.json());
app.use(cookieParser());

const corsOptionsDelegate = function (req, callback) {
  const openRoutes = [
    'POST /rp/config/:domain'
  ]; // Add your open routes here

  if (doesRouteMatch(req, openRoutes)) {
    callback(null, { origin: true }); // Enable CORS for all origins on open routes
  } else {
    // Restrictive CORS for other routes

    callback(null, {
      origin: process.env.WEB_DOMAIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });
  }
};

app.use(cors(corsOptionsDelegate));

let cookieConfig = {
  httpOnly: true,
  secure: process.env.COOKIE_USE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  maxAge: parseInt(process.env.COOKIE_EXPIRY_MILLISECONDS, 10) || 3600000
}

if (process.env.COOKIE_DOMAIN != 'LOCAL') {
  cookieConfig.domain = process.env.COOKIE_DOMAIN;
}

console.log('cookieConfig', cookieConfig);

app.use(session({
  name: 'wide.sid',
  secret: process.env.SESSION_SECRET, // Secret used to sign the session ID cookie
  store: new RedisStore({ client: redisClient }),
  resave: false,
  saveUninitialized: false,
  cookie: cookieConfig
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
const history = require('./routes/history');
const siweRoutes = require('./routes/siwe');
const relyingPartyRoutes = require('./routes/relyingParty');
const doesRouteMatch = require('./helpers/doesRouteMatch');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/storage', storage);
app.use('/history', history);
app.use('/siwe', siweRoutes);
app.use('/rp', relyingPartyRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
