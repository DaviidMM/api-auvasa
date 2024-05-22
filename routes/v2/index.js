const express = require('express');
const routes = express.Router();
const {
  getParada,
  getParadas,
  getAlerts,
  getBusPosition,
  getShapesForTrip,
  getStopsElementsForTrip,
  getSuspendedStops,
} = require('../../lib/v2');
const { getAllCacheKeys } = require('../../lib/utils');

const apicache = require('apicache');
const cache = apicache.middleware;

// Data validation
const Joi = require('joi');

// Esquema para stopCode
const stopCodeSchema = Joi.string()
  .regex(/^[a-zA-Z0-9:]+$/)
  .required()
  .messages({
    'string.base': 'El número de parada debe ser una cadena de texto.',
    'string.pattern.base':
      'El número de parada solo puede contener caracteres alfanuméricos y dos puntos (:).',
    'any.required': 'El número de parada es un campo obligatorio.',
  });

// Esquema para routeShortName
const routeShortNameSchema = Joi.string().alphanum().required().messages({
  'string.base': 'El código de la línea debe ser una cadena de texto.',
  'string.alphanum':
    'El código de la línea solo puede contener caracteres alfanuméricos.',
  'any.required': 'El código de la línea es un campo obligatorio.',
});

// Esquema para date en formato YYYYMMDD
const dateSchema = Joi.string()
  .pattern(/^\d{4}\d{2}\d{2}$/)
  .required()
  .messages({
    'string.base': 'La fecha debe ser una cadena de texto.',
    'string.pattern.base': 'La fecha debe tener el formato YYYYMMDD.',
    'any.required': 'La fecha es un campo obligatorio.',
  });

// Esquema para tripID
const tripIdSchema = Joi.string()
  .regex(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    'string.base': 'El tripID debe ser una cadena de texto.',
    'string.pattern.base':
      'El tripID solo puede contener caracteres alfanuméricos, guiones medios (-) y barras bajas (_).',
    'any.required': 'El tripID es un campo obligatorio.',
  });

// Redirecciona a /api-docs desde /
routes.get('/', function (req, res) {
  res.redirect('/api-docs');
});

/**
 * @openapi
 * /alertas:
 *   get:
 *     tags:
 *       - Alertas
 *     summary: Obtiene todas las alertas disponibles
 *     responses:
 *       200:
 *         description: Lista de alertas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alerta'
 */
routes.get('/alertas', cache('15 minutes'), async (req, res) => {
  const alerts = await getAlerts();
  return res.status(200).send(alerts);
});

routes.get('/getAllCache', (req, res) => {
  return res.json(getAllCacheKeys());
});

/**
 * @openapi
 * /parada/{stopCode}:
 *   get:
 *     tags:
 *       - Parada
 *     summary: Obtiene información detallada de una parada específica
 *     parameters:
 *       - name: stopCode
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/StopCode'
 *     responses:
 *       200:
 *         description: Detalles de la parada solicitada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParadaDetails'
 */
routes.get('/parada/:stopCode', async (req, res) => {
  const { stopCode } = req.params;

  // Valida stopCode
  const stopCodeValidation = stopCodeSchema.validate(stopCode);
  if (stopCodeValidation.error) {
    return res.status(400).send(stopCodeValidation.error.details[0].message);
  }

  const response = await getParada(stopCode);
  return res.json(response);
});

/**
 * @openapi
 * /parada/{stopCode}/{routeShortName}:
 *   get:
 *     tags:
 *       - Parada
 *     summary: Obtiene información detallada de una parada específica para una línea determinada
 *     parameters:
 *       - name: stopCode
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/StopCode'
 *       - name: routeShortName
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/RouteShortName'
 *     responses:
 *       200:
 *         description: Detalles de la parada y la línea solicitada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParadaDetailsByLine'
 */
routes.get('/parada/:stopCode/:routeShortName', async (req, res) => {
  const { stopCode, routeShortName } = req.params;

  // Valida stopCode
  const stopCodeValidation = stopCodeSchema.validate(stopCode);
  if (stopCodeValidation.error) {
    return res.status(400).send(stopCodeValidation.error.details[0].message);
  }

  // Valida routeShortName
  const routeShortNameValidation = routeShortNameSchema.validate(routeShortName);
  if (routeShortNameValidation.error) {
    return res
      .status(400)
      .send(routeShortNameValidation.error.details[0].message);
  }

  const response = await getParada(stopCode, routeShortName);
  return res.json(response);
});

/**
 * @openapi
 * /parada/{stopCode}/{routeShortName}/{date}:
 *   get:
 *     tags:
 *       - Parada
 *     summary: Obtiene información detallada de una parada específica para una línea y fecha determinada
 *     parameters:
 *       - name: stopCode
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/StopCode'
 *       - name: routeShortName
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/RouteShortName'
 *       - name: date
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Date'
 *     responses:
 *       200:
 *         description: Detalles de la parada, la línea y la fecha solicitada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParadaDetailsByDate'
 */
routes.get('/parada/:stopCode/:routeShortName/:date', async (req, res) => {
  const { stopCode, routeShortName, date } = req.params;

  // Valida stopCode
  const stopCodeValidation = stopCodeSchema.validate(stopCode);
  if (stopCodeValidation.error) {
    return res.status(400).send(stopCodeValidation.error.details[0].message);
  }

  // Valida routeShortName
  const routeShortNameValidation = routeShortNameSchema.validate(routeShortName);
  if (routeShortNameValidation.error) {
    return res
      .status(400)
      .send(routeShortNameValidation.error.details[0].message);
  }

  // Valida date
  const dateValidation = dateSchema.validate(date);
  if (dateValidation.error) {
    return res.status(400).send(dateValidation.error.details[0].message);
  }

  const response = await getParada(stopCode, routeShortName, date);
  return res.json(response);
});

/**
 * @openapi
 * /paradas/suprimidas:
 *   get:
 *     tags:
 *       - Paradas
 *     summary: Obtiene información sobre paradas suspendidas
 *     responses:
 *       200:
 *         description: Lista de paradas suprimidas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SuspendedStop'
 */
routes.get('/paradas/suprimidas', async (req, res) => {
  const response = await getSuspendedStops();
  return res.json(response);
});

/**
 * @openapi
 * /paradas:
 *   get:
 *     tags:
 *       - Paradas
 *     summary: Obtiene información sobre todas las paradas disponibles
 *     responses:
 *       200:
 *         description: Lista de todas las paradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Parada'
 */
routes.get('/paradas', async (req, res) => {
  const response = await getParadas();
  return res.json(response);
});

/**
 * @openapi
 * /busPosition/{tripId}:
 *   get:
 *     tags:
 *       - Bus Position
 *     summary: Obtiene la posición actual de un autobús específico
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/TripId'
 *     responses:
 *       200:
 *         description: Posición actual del autobús
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusPosition'
 */
routes.get('/busPosition/:tripId', async (req, res) => {
  const { tripId } = req.params;

  // Valida tripId
  const tripIdValidation = tripIdSchema.validate(tripId);
  if (tripIdValidation.error) {
    return res.status(400).send(tripIdValidation.error.details[0].message);
  }

  const response = await getBusPosition(tripId);
  return res.json(response);
});

/**
 * @openapi
 * /geojson/paradas/{tripId}:
 *   get:
 *     tags:
 *       - GeoJSON
 *     summary: Obtiene elementos de paradas para un viaje específico en formato GeoJSON
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/TripId'
 *     responses:
 *       200:
 *         description: Elementos de paradas en formato GeoJSON
 *         content:
 *           application/geo+json:
 *             schema:
 *               $ref: '#/components/schemas/StopsGeoJson'
 */
routes.get('/geojson/paradas/:tripId', async (req, res) => {
  const { tripId } = req.params;

  // Valida tripId
  const tripIdValidation = tripIdSchema.validate(tripId);
  if (tripIdValidation.error) {
    return res.status(400).send(tripIdValidation.error.details[0].message);
  }

  const response = await getStopsElementsForTrip(tripId);
  return res.send(response);
});

/**
 * @openapi
 * /geojson/{tripId}:
 *   get:
 *     tags:
 *       - GeoJSON
 *     summary: Obtiene formas de viajes en formato GeoJSON
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/TripId'
 *     responses:
 *       200:
 *         description: Formas de viajes en formato GeoJSON
 *         content:
 *           application/geo+json:
 *             schema:
 *               $ref: '#/components/schemas/ShapesGeoJson'
 */
routes.get('/geojson/:tripId', async (req, res) => {
  const { tripId } = req.params;

  // Valida tripId
  const tripIdValidation = tripIdSchema.validate(tripId);
  if (tripIdValidation.error) {
    return res.status(400).send(tripIdValidation.error.details[0].message);
  }

  const response = await getShapesForTrip(tripId);
  return res.send(response);
});

module.exports = routes;
