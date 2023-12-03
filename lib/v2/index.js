const { gtfsGetStop } = require('../gtfs');

const getParada = async (stopCode, routeShortName = null) => {
  const result = await gtfsGetStop(stopCode, routeShortName);
  return result;
};

module.exports = { getParada };
