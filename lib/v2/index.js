const {
  gtfsGetStop,
  gtfsGetStops,
  gtfsGetBusPosition,
  gtfsGetBusOccupancy,
  fetchShapesForTrip,
  fetchStopsForTrip,
  suspendedStops,
} = require('../gtfs');

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

const getOccupancy = async (tripId) => {
  const result = await gtfsGetBusOccupancy(tripId);
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

const getSuspendedStops = async () => {
  const result = await suspendedStops();
  return result;
};

module.exports = {
  getParada,
  getParadas,
  getBusPosition,
  getOccupancy,
  getShapesForTrip,
  getStopsForTrip,
  getSuspendedStops,
};
