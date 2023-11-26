/**
 * @swagger
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
