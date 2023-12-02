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
  try {
    const gtfsRoutes = require('../../../gtfs-files/routes.json');
    const response = await fetch(
      'http://212.170.201.204:50080/GTFSRTapi/api/alert',
    );
    const buffer = await response.arrayBuffer();
    const feed = gtfs.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer),
    );
    const avisos = [];
    feed.entity.forEach((entity) => {
      const { headerText, descriptionText } = entity.alert;
      const { routeId } = entity.alert.informedEntity[0];
      const route = gtfsRoutes.find((route) => route.route_id === routeId);
      avisos.push({
        ruta: {
          gtfsRouteId: route.route_id,
          linea: route.route_short_name,
          destino: route.route_long_name,
        },
        resumen: headerText.translation[0].text,
        descripcion: descriptionText.translation[0].text,
      });
    });
    return avisos;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getAlertsFromGtfs,
  formatGtfsRoute,
};
