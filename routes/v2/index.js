const express = require('express');
const routes = express.Router();
const { getParada, getParadas } = require('../../lib/v2');
const { getAllCacheKeys } = require('../../lib/utils');

routes.get('/', (req, res) => {
  return res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: https://${req.hostname}/Nº parada/Línea.<br/><br/>Por ejemplo: https://${req.hostname}/811/3<br/><br/><br/>Fuente: AUVASA`,
  );
});

routes.get('/getAllCache', (req, res) => {
  return res.json(getAllCacheKeys());
});

routes.get('/parada/:stopCode', async (req, res) => {
  const { stopCode } = req.params;
  const response = await getParada(stopCode);
  return res.json(response);
});

routes.get('/parada/:stopCode/:routeShortName', async (req, res) => {
  const { stopCode, routeShortName } = req.params;
  const response = await getParada(stopCode, routeShortName);
  return res.json(response);
});

routes.get('/paradas', async (req, res) => {
  const response = await getParadas();
  return res.json(response);
});

module.exports = routes;
