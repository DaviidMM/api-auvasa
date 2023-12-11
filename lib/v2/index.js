const { gtfsGetStop, gtfsGetStops } = require('../gtfs');

const getParada = async (stopCode, routeShortName = null) => {
  const result = await gtfsGetStop(stopCode, routeShortName);
  return result;
};

const getParadas = async () => {
  const result = await gtfsGetStops();
  return result;
};

module.exports = { getParada, getParadas };
