const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// API meta info
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API AUVASA',
      version: '1.0.0',
      description: 'API para obtener información de la web de AUVASA',
    },
  },
  apis: ['routes/v1/**/*.js', 'routes/v1/swagger/schemas.js'],
};

// Docs in JSON format
const swaggerSpec = swaggerJSDoc(options);

const CSS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.6.2/swagger-ui.min.css';

// Function to setup our docs
const swaggerDocs = (route) => {
  // Route-Handler to visit our docs
  route.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { customCssUrl: CSS_URL }),
  );
  // Make our docs in JSON format available
  route.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = { swaggerDocs };
