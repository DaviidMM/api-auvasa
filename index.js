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
app.use('/updateParadas', async (req, res) => {
  const { updateParadas } = require('./lib');
  await updateParadas();
  return res.send({ message: 'Base de datos de paradas actualizada' });
});
app.use('/v1', v1Routes);
app.use('/', defaultRoutes);

// Iniciando el servidor, escuchando...
app.listen(app.get('port'), () => {
  console.log(`Server listening on port ${app.get('port')}`);
});

// Export the Express API
module.exports = app;
