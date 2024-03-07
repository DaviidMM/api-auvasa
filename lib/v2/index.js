const { gtfsGetStop, gtfsGetStops, gtfsGetBusPosition, fetchShapesForTrip, fetchStopsForTrip } = require('../gtfs');

const getParada = async (stopCode, routeShortName = null, date = null) => {
  const result = await gtfsGetStop(stopCode, routeShortName, date);
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

const getStopsForTrip = async (tripId) => {
  const result = await fetchStopsForTrip(tripId);
  return result;  
};

module.exports = { getParada, getParadas, getBusPosition, getShapesForTrip, getStopsForTrip };
