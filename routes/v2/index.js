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

routes.get('/', (req, res) => {
  return res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: https://${req.hostname}/parada/Nº parada/Línea.<br/><br/>Por ejemplo: https://${req.hostname}/parada/811/3<br/><br/><br/>Fuente: AUVASA`,
  );
});

routes.get('/alertas', cache('15 minutes'), async (req, res) => {
  const alerts = await getAlerts();
  return res.status(200).send(alerts);
});

routes.get('/getAllCache', (req, res) => {
  return res.json(getAllCacheKeys());
});

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

routes.get('/paradas/suprimidas', async (req, res) => {
  const response = await getSuspendedStops();
  return res.json(response);
});

routes.get('/paradas', async (req, res) => {
  const response = await getParadas();
  return res.json(response);
});

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
