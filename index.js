const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
const v2Routes = require('./routes/v2');
const { initializeGtfs } = require('./lib/gtfs');

const defaultRoutes = v2Routes;
const app = express();
// Configuraciones
app.set('port', process.env.PORT || 3000);
app.set('json spaces', 2);

// Permitir todas las peticiones CORS
app.use(cors({ origin: '*' }));

(async () => {
  await initializeGtfs();
  // Rutas
  app.use('/v2', v2Routes);
  // Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/', defaultRoutes);

  // Iniciando el servidor, escuchando...
  app.listen(app.get('port'), () => {
    console.log(`Server listening on port ${app.get('port')}`);
  });
})();

// Export the Express API
module.exports = app;
