const { gtfsGetStop, gtfsGetStops, gtfsGetBusPosition, fetchShapesForTrip } = require('../gtfs');

const getParada = async (stopCode, routeShortName = null) => {
  const result = await gtfsGetStop(stopCode, routeShortName);
  return result;
};

const getParadas = async () => {
  const result = await gtfsGetStops();
  return result;
};

const getBusPosition = async (tripId) => {
  const result = await gtfsGetBusPosition(tripId);
  return result;
};

const getShapesForTrip = async (tripId) => {
  const result = await fetchShapesForTrip(tripId);
  return result;  
};

module.exports = { getParada, getParadas, getBusPosition, getShapesForTrip };
