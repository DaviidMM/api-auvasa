const express = require('express');
const cors = require('cors');
const { getBuses, getClosestBus } = require('./utils');

const app = express();

// Configuraciones
app.set('port', process.env.PORT || 3000);
app.set('json spaces', 2);

app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
  res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: http://${req.hostname}/Nº parada/Línea.<br/><br/>Por ejemplo: http://${req.hostname}/811/3`,
  );
});

app.get('/:parada', async (req, res) => {
  const { parada } = req.params;

  const buses = await getBuses(parada);

  if (!buses) {
    return res
      .status(404)
      .json({ error: 'No se ha encontrado la parada indicada' });
  }

  return res.json(buses);
});

app.get('/:parada/:linea', async (req, res) => {
  const { parada, linea } = req.params;

  const buses = await getBuses(parada);
  const bus = await getClosestBus(buses, linea);

  if (!bus.length) {
    return res.status(404).json({
      error: `No se ha encontrado la línea ${linea} en la parada nº ${parada}`,
    });
  }

  return res.json(bus);
});

// Iniciando el servidor, escuchando...
app.listen(app.get('port'), () => {
  console.log(`Server listening on port ${app.get('port')}`);
});

// Export the Express API
module.exports = app;
