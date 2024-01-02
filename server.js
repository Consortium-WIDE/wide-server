require('dotenv').config();
const cors = require('cors');
const express = require('express');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:4200' }));

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDefinition = YAML.load('swaggerDef.yaml');

const options = {
    swaggerDefinition,
    apis: ['./routes/*.js'], // adjust this to point to your route files
  };
  
const swaggerSpec = swaggerJsdoc(options);
const storageRoutes = require('./routes/storage');
const siweRoutes = require('./routes/siwe');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/storage', storageRoutes);
app.use('/siwe', siweRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
