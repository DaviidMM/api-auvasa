const express = require('express');
const { getBuses, getLineas, getParada, getParadas } = require('../../lib');
const routes = express.Router();
const { swaggerDocs: v1SwaggerDocs } = require('./swagger');

const apicache = require('apicache');
const { getAlertsFromGtfs } = require('../../lib/gtfs');
const cache = apicache.middleware;

/**
 * @openapi
 * components:
 *   schemas:
 *     Linea:
 *       type: object
 *       properties:
 *         gtfsRouteId:
 *           type: string
 *           example: "1"
 *           description: Identificador de la ruta GTFS.
 *         linea:
 *           type: string
 *           example: "1"
 *           description: Número de la línea.
 *         destino:
 *           type: string
 *           example: "Barrio España - Covaresa"
 *           description: Destino de la ruta.
 *         color:
 *           type: string
 *           example: "36AD30"
 *           description: Color asociado a la ruta.
 *     Paradas:
 *       type: object
 *       properties:
 *         parada:
 *           type: object
 *           properties:
 *             nombre:
 *               type: string
 *               example: "Plaza Cruz Verde 5"
 *               description: Nombre de la parada.
 *             numero:
 *               type: string
 *               example: "811"
 *               description: Número de la parada.
 *         lineas:
 *           type: object
 *           properties:
 *             ordinarias:
 *               type: array
 *               example: ["3", "18", "19"]
 *               items:
 *                 type: string
 *             buho:
 *               type: array
 *               example: ["B2", "B5"]
 *               items:
 *                 type: string
 *             futbol:
 *               type: array
 *               example: ["F2", "F3"]
 *               items:
 *                 type: string
 *             poligonos:
 *               type: array
 *               example: ["P3"]
 *               items:
 *                 type: string
 *             matinales:
 *               type: array
 *               example: []
 *               items:
 *                 type: string
 *         ubicacion:
 *           type: object
 *           properties:
 *             x:
 *               type: float
 *               example: -4.720113
 *               description: Coordenada X de la parada.
 *             y:
 *               type: float
 *               example: 41.648088
 *               description: Coordenada Y de la parada.
 *     Alerta:
 *       type: object
 *       properties:
 *         ruta:
 *           type: object
 *           properties:
 *             gtfsRouteId:
 *               type: string
 *               example: "7"
 *               description: Identificador de la ruta GTFS.
 *             linea:
 *               type: string
 *               example: "7"
 *               description: Número de la línea.
 *             destino:
 *               type: string
 *               example: "Arturo Eyries - Los Santos Pilarica"
 *               description: Destino de la ruta.
 *         resumen:
 *           type: string
 *           example: "Desvío línea 7"
 *           description: Resumen de la alerta.
 *         descripcion:
 *           type: string
 *           example: "Línea 7 desviada entre las paradas Calle Sotavento esquina Colombia y Calle Sotavento esquina Avenida Medina del Campo"
 *           description: Descripción de la alerta.
 *     Parada:
 *       type: object
 *       properties:
 *         parada:
 *           type: object
 *           properties:
 *             nombre:
 *               type: string
 *               example: "Plaza Cruz Verde 5"
 *               description: Nombre de la parada.
 *         numero:
 *           type: string
 *           example: "811"
 *           description: Número de la parada.
 *         buses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               destino:
 *                 type: string
 *                 example: "LAS FLORES"
 *                 description: Destino de la ruta.
 *               linea:
 *                 type: string
 *                 example: "3"
 *                 description: Número de la línea.
 *               tiempoRestante:
 *                 type: number
 *                 example: 5
 *                 description: Tiempo estimado de llegada.
 *               esExacto:
 *                 type: boolean
 *                 example: true
 *                 description: Indica si el tiempo estimado es exacto.
 *     ParadaNoEncontrada:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "No se han encontrado la parada nº 999999."
 *     LineaNoEncontradaEnParada:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "No se ha encontrado la línea 111111 en la parada nº 999999"
 */

routes.get('/', (req, res) => {
  return res.send(
    `Añade un número de parada y línea a la URL para continuar. Sintaxis: https://${req.hostname}/Nº parada/Línea.<br/><br/>Por ejemplo: https://${req.hostname}/811/3<br/><br/><br/>Fuente: AUVASA`,
  );
});

// Setup v1 API docs
v1SwaggerDocs(routes, 3000);

/**
 * @openapi
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
 * @openapi
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
 * @openapi
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
 * @openapi
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
 * @openapi
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
