const express = require('express');
const routes = express.Router();
const { getParada, getParadas, getBusPosition, getShapesForTrip, getStopsForTrip } = require('../../lib/v2');
const { getAllCacheKeys } = require('../../lib/utils');

// Imports de alertas de v1
// Migrar a alertas v2
const apicache = require('apicache');
const { getAlertsFromGtfs } = require('../../lib/v1/gtfs');
const cache = apicache.middleware;

routes.get('/', (req, res) => {
  return res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: https://${req.hostname}/parada/Nº parada/Línea.<br/><br/>Por ejemplo: https://${req.hostname}/parada/811/3<br/><br/><br/>Fuente: AUVASA`,
  );
});

routes.get('/alertas', cache('15 minutes'), async (req, res) => {
  const alerts = await getAlertsFromGtfs();
  return res.status(200).send(alerts);
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

routes.get('/parada/:stopCode/:routeShortName/:date', async (req, res) => {
  const { stopCode, routeShortName, date } = req.params;
  const response = await getParada(stopCode, routeShortName, date);
  return res.json(response);
});

routes.get('/paradas', async (req, res) => {
  const response = await getParadas();
  return res.json(response);
});

routes.get('/busPosition/:tripId', async (req, res) => {
  const { tripId } = req.params;
  const response = await getBusPosition(tripId);
  return res.json(response);
});

routes.get('/geojson/paradas/:tripId', async (req, res) => {
  const { tripId } = req.params;
  const response = await getStopsForTrip(tripId);
  return res.send(response);
});

routes.get('/geojson/:tripId', async (req, res) => {
  const { tripId } = req.params;
  const response = await getShapesForTrip(tripId);
  return res.send(response);
});

module.exports = routes;