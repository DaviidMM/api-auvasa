const gtfs = require('gtfs-realtime-bindings');

const formatGtfsRoute = (route) => {
  return {
    gtfsRouteId: route.route_id,
    linea: route.route_short_name,
    destino: route.route_long_name,
    color: route.route_color,
  };
};

const getAlertsFromGtfs = async () => {
  // URLs y rutas de archivos para la configuración
  const GTFS_ROUTES_PATH = '../../../gtfs-files/routes.json';
  const GTFS_STOPS_PATH = '../../../gtfs-files/stops.json';
  const ALERTS_API_URL = 'http://212.170.201.204:50080/GTFSRTapi/api/alert';

  try {
    // Carga de archivos GTFS para lineas y paradas
    const gtfsRoutes = require(GTFS_ROUTES_PATH);
    const gtfsStops = require(GTFS_STOPS_PATH);

    // Recuperación de datos de alertas desde la API
    const response = await fetch(ALERTS_API_URL);
    const buffer = await response.arrayBuffer();
    const feed = gtfs.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    // Procesamiento de entidades de feed para construir avisos
    return feed.entity.map((entity) => {
      const { headerText, descriptionText } = entity.alert;
      const routeId = entity.alert.informedEntity[0].routeId || 'none';
      const stopId = entity.alert.informedEntity[0].stopId || 'none';

      // Búsqueda de detalles de ruta y parada, o asignación de valores predeterminados
      const route =
        routeId !== 'none' && gtfsRoutes.find((r) => r.route_id === routeId);
      const stop =
        stopId !== 'none' && gtfsStops.find((s) => s.stop_id === stopId);

      return {
        ruta: {
          gtfsRouteId: route ? route.route_id : null,
          linea: route ? route.route_short_name : null,
          parada: stop ? stop.stop_code : null,
          destino: route ? route.route_long_name : null,
        },
        resumen: headerText.translation[0].text,
        descripcion: descriptionText.translation[0].text,
      };
    });
  } catch (error) {
    console.error(error);
    // Si hay algún error devolvemos un array vacío. TODO: Dar más detalles del error
    return [];
  }
};

module.exports = {
  getAlertsFromGtfs,
  formatGtfsRoute,
};
