const gtfs = require('gtfs-realtime-bindings');
const fs = require('fs');
const decompress = require('decompress');
const {
  downloadGtfsStatic,
  convertAllTxtToJSON,
  moveJSONFiles,
} = require('./helpers');

const updateGtfsStatics = async () => {
  try {
    // Create tmp dir
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
    // Descargar el archivo zip
    await downloadGtfsStatic();
    // Descomprimir el archivo zip
    await decompress('tmp/gtfs.zip', 'tmp/gtfs');
    // Convertir el archivos .txt a .json
    await convertAllTxtToJSON();
    // Move json files to gtfs-files dir
    moveJSONFiles('gtfs-files');
    // Remove tmp dir
    fs.rm('tmp', { recursive: true }, (err) => {
      if (err) throw err;
    });
  } catch (error) {
    console.log(error);
  }
};

const getAlertsFromGtfs = async () => {
  try {
    const gtfsRoutes = require('../../gtfs-files/routes.json');
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
        titulo: headerText.translation[0].text,
        cuerpo: descriptionText.translation[0].text,
      });
    });
    return avisos;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getAlertsFromGtfs,
};
