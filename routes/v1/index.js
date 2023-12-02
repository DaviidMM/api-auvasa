const express = require('express');
const { getBuses, getLineas, getParada, getParadas } = require('../../lib/v1');
const routes = express.Router();
const { swaggerDocs: v1SwaggerDocs } = require('./swagger');
require('./swagger/schemas');

const apicache = require('apicache');
const { getAlertsFromGtfs } = require('../../lib/v1/gtfs');
const cache = apicache.middleware;

routes.get('/', (req, res) => {
  return res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: https://${req.hostname}/Nº parada/Línea.<br/><br/>Por ejemplo: https://${req.hostname}/811/3<br/><br/><br/>Fuente: AUVASA`,
  );
});

// Setup v1 API docs
v1SwaggerDocs(routes, 3000);

/**
 * @swagger
 * /v1/lineas:
 *   get:
 *     tags:
 *       - Lineas
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *               $ref: '#/components/schemas/Linea'
 */
routes.get('/lineas', cache('1 day'), async (req, res) => {
  const lineas = await getLineas();
  return res.status(200).send(lineas);
});

/**
 * @swagger
 * /v1/paradas:
 *   get:
 *     tags:
 *       - Paradas
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Paradas'
 */
routes.get('/paradas', cache('1 day'), async (req, res) => {
  const paradas = await getParadas();
  return res.status(200).send(paradas);
});

/**
 * @swagger
 * /v1/alertas:
 *   get:
 *     tags:
 *       - Alertas
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alerta'
 */
routes.get('/alertas', cache('15 minutes'), async (req, res) => {
  const alerts = await getAlertsFromGtfs();
  return res.status(200).send(alerts);
});

/**
 * @swagger
 * /v1/{numParada}:
 *   description: Devuelve información acerca de una parada
 *   get:
 *     tags:
 *       - Paradas
 *     parameters:
 *       - in: path
 *         name: numParada
 *         required: true
 *         schema:
 *           type: string
 *           description: Número de parada
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Parada'
 *       404:
 *         description: Parada no encontrada
 *         content:
 *          application/json:
 *           schema:
 *            type: object
 *            $ref: '#/components/schemas/ParadaNoEncontrada'
 */
routes.get('/:numParada', cache('15 seconds'), async (req, res) => {
  const { numParada } = req.params;
  req.apicacheGroup = numParada;

  const { parada, html } = await getParada(numParada);
  if (!parada.nombre) {
    return res.status(404).json({
      message: `No se ha encontrado la parada nº ${numParada}.`,
    });
  }

  const buses = await getBuses(html);

  if (!buses) {
    return res
      .status(404)
      .json({ error: 'No se han encontrado buses en la parada indicada' });
  }

  return res.json({
    parada,
    buses,
  });
});

/**
 * @swagger
 * /v1/{numParada}/{linea}:
 *   description: Devuelve información acerca de una parada filtrando por línea de bus
 *   get:
 *     tags:
 *       - Paradas
 *     parameters:
 *       - in: path
 *         name: numParada
 *         required: true
 *         schema:
 *           type: string
 *           description: Número de parada
 *       - in: path
 *         name: linea
 *         required: true
 *         schema:
 *           type: string
 *           description: Línea de bus
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Parada'
 *       404:
 *         description: Parada no encontrada
 *         content:
 *          application/json:
 *           schema:
 *            type: object
 *            $ref: '#/components/schemas/LineaNoEncontradaEnParada'
 */
routes.get('/:numParada/:linea', cache('15 seconds'), async (req, res) => {
  const { numParada, linea } = req.params;
  req.apicacheGroup = numParada;

  const { parada, html } = await getParada(numParada);
  const allBuses = await getBuses(html);
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
