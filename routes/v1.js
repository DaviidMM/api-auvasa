const express = require('express');
const { getInfoParada, getBuses } = require('../utils');
const routes = express.Router();

routes.get('/', (req, res) => {
  res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: https://${req.hostname}/Nº parada/Línea.<br/><br/>Por ejemplo: https://${req.hostname}/811/3`,
  );
});

routes.get('/:numParada', async (req, res) => {
  const { numParada } = req.params;

  const parada = await getInfoParada(numParada);
  if (!parada.nombre) {
    return res.status(404).json({
      message: `No se han encontrado la parada nº ${numParada}.`,
    });
  }

  const buses = await getBuses(numParada);

  if (!buses) {
    return res
      .status(404)
      .json({ error: 'No se ha encontrado buses en la parada indicada' });
  }

  return res.json({
    parada,
    buses,
  });
});

routes.get('/:numParada/:linea', async (req, res) => {
  const { numParada, linea } = req.params;

  const parada = await getInfoParada(numParada);
  const allBuses = await getBuses(numParada);
  if (!allBuses) {
    return res.status(404).json({
      message: `No se han encontrado buses en la parada nº ${numParada}.`,
    });
  }
  const buses = allBuses.filter((bus) => bus.linea === linea);
  if (!buses.length) {
    return res.status(404).json({
      message: `No se ha encontrado la línea ${linea} en la parada nº ${numParada}`,
    });
  }

  return res.json({
    parada,
    buses,
  });
});

module.exports = routes;
