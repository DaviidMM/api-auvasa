const express = require('express');
const cors = require('cors');
const v1Routes = require('./routes/v1');
const defaultRoutes = v1Routes;
const app = express();

// Configuraciones
app.set('port', process.env.PORT || 3000);
app.set('json spaces', 2);

// Permitir todas las peticiones CORS
app.use(cors({ origin: '*' }));

// Rutas

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
  apis: ['routes/**/*.js'],
};

// Docs in JSON format
const swaggerSpec = swaggerJSDoc(options);

const CSS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.6.2/swagger-ui.min.css';

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { customCssUrl: CSS_URL }),
);
// Make our docs in JSON format available
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/v1', v1Routes);
app.use('/', defaultRoutes);

// Iniciando el servidor, escuchando...
app.listen(app.get('port'), () => {
  console.log(`Server listening on port ${app.get('port')}`);
});

// Export the Express API
module.exports = app;
