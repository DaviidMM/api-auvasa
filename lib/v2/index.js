const {
  gtfsGetStop,
  gtfsGetStops,
  gtfsGetAlerts,
  gtfsGetBusPosition,
  fetchShapesForTrip,
  fetchStopsForTrip,
  suspendedStops,
  gtfsGetTripSequence,
} = require('../gtfs');

const getParada = async (stopCode, routeShortName = null, date = null) => {
  const result = await gtfsGetStop(stopCode, routeShortName, date);
  return result;
};

const getParadas = async () => {
  const result = await gtfsGetStops();
  return result;
};

const getAlerts = async () => {
  const result = await gtfsGetAlerts();
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

const getStopsElementsForTrip = async (tripId) => {
  const result = await fetchStopsForTrip(tripId);
  return result;
};

const getSuspendedStops = async () => {
  const result = await suspendedStops();
  return result;
};

const getTripSequence = async (tripId) => {
  const result = await gtfsGetTripSequence(tripId);
  return result;
};

module.exports = {
  getParada,
  getParadas,
  getAlerts,
  getBusPosition,
  getShapesForTrip,
  getStopsElementsForTrip,
  getTripSequence,
  getSuspendedStops,
};
