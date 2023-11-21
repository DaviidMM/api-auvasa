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

  if (numParada === '811') {
    return res.json({
      parada: {
        nombre: 'Plaza Cruz Verde 5',
        numero: '811',
      },
      buses: [
        {
          destino: 'LAS FLORES',
          linea: '3',
          tiempoRestante: 13,
          esExacto: true,
        },
        {
          destino: 'PZA.CIRCULAR',
          linea: '18',
          tiempoRestante: 12,
          esExacto: true,
        },
      ],
      api: { version: '1.0' },
    });
  }

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

  if (numParada === '811' && linea === '3') {
    return res.json({
      parada: {
        nombre: 'Plaza Cruz Verde 5',
        numero: '811',
      },
      buses: [
        {
          destino: 'LAS FLORES',
          linea: '3',
          tiempoRestante: 13,
          esExacto: true,
        },
      ],
      api: { version: '1.0' },
    });
  }

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
