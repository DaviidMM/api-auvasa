const {
  environment,
  getCacheKey,
  storeInCache,
  checkCache,
  compareObjects,
  getAllCacheKeys,
} = require('../utils');
const { GTFS_REFRESH_RATE } = environment;
const gtfsConfig = require('./config');
const moment = require('moment-timezone');
let gtfs;

const counters = {
  changes: 0,
  total: 0,
};

// Definir la función que se ejecutará al recibir la señal SIGINT
function handleSIGINT() {
  console.log('¡Deteniendo la ejecución del script!');

  // Mostrar el número de cambios y el total de paradas
  console.log('Counters:');
  console.log(counters);

  // Puedes realizar cualquier limpieza o acciones adicionales aquí antes de salir
  process.exit();
}

// Registrar la función para manejar la señal SIGINT
process.on('SIGINT', handleSIGINT);

const initializeGtfs = async () => {
  return new Promise((resolve) => {
    import('gtfs').then(async (module) => {
      gtfs = module;
      gtfs.openDb(gtfsConfig);
      await gtfs.importGtfs(gtfsConfig);
      await updateGtfsCache();
      // Actualizar los datos cada GTFS_REFRESH_RATE segundos
      setInterval(async () => {
        return await updateGtfsCache();
      }, GTFS_REFRESH_RATE || 10000);
      resolve();
    });
  });
};

const updateGtfsCache = async () => {
  try {
    console.log('*** Iniciando actualización de datos de GTFS en caché...***');

    await gtfs.updateGtfsRealtime(gtfsConfig);

    // Recuperar los datos actualizados
    const stopTimesUpdates = await gtfs.getStopTimesUpdates();

    // Actualizar los datos de la caché
    const cacheKey = 'gtfsStopTimesUpdates';

    let hasUpdates = false;

    for (let update of stopTimesUpdates) {
      const key = `${cacheKey}:${update.trip_id}-${update.stop_sequence}`;

      // Si la clave existe en caché, comprobar si hay cambios
      if (checkCache(key)) {
        const cachedUpdate = getCacheKey(key);
        const hasChanged = compareObjects(cachedUpdate, update);
        if (hasChanged) {
          console.log(
            `La clave ${key} existe en caché y ha cambiado. Actualizando...`,
          );
          storeInCache(key, update);
          hasUpdates = true;
        }
      } else {
        // Guardar en caché
        storeInCache(key, update);
      }
    }

    if (hasUpdates) counters.changes++;
    counters.total++;

    console.log({ counters });

    console.log('*** Datos de GTFS actualizados en caché. ***');
  } catch (error) {
    console.log('[⚙] Error al actualizar los datos de GTFS en caché.');
    console.log(error);
  }
};

// Obtenemos la información de todas las paradas
const gtfsGetStops = async () => {
  const gtfsStops = await gtfs.getStops();
  
  const paradas = await Promise.all(gtfsStops.map(async (stop) => {
    const routes = await gtfs.getRoutes({ stop_id: stop.stop_id });
    const routeNames = routes.map(route => route.route_short_name || route.route_long_name);
    
    return {
      parada: {
        nombre: stop.stop_name,
        numero: stop.stop_code,
      },
      // TODO: Ver si gtfs tiene datos del tipo de parada
      lineas: {
        ordinarias: routeNames, // Aquí obtenemos las líneas para esta parada
      },
      ubicacion: {
        x: stop.stop_lon,
        y: stop.stop_lat,
      },
    };
  }));
  
  return paradas;
};

// Obtenemos la información de una parada
const gtfsGetStop = async (stopNumber, routeShortName) => {
  const gtfsStop = await gtfs.getStops({ stop_code: stopNumber });
  // Asumiendo que solo necesitas un subconjunto de los datos de la parada
  const parada = gtfsStop.map((stop) => ({
    parada: stop.stop_name,
    numeroParada: stop.stop_code,
    latitud: stop.stop_lat,
    longitud: stop.stop_lon,
    url: `http://www.auvasa.es/parada.asp?codigo=${stop.stop_code}`,
  }));
  
  const stopTimes = await gtfs.getStoptimes({ stop_id: gtfsStop[0].stop_id });
  // Utiliza Set para reducir a valores únicos y mejorar la búsqueda posterior
  const uniqueTripIds = new Set(stopTimes.map((stopTime) => stopTime.trip_id));
  
  const trips = await gtfs.getTrips({
    trip_id: Array.from(uniqueTripIds),
  });
  // Utiliza Map para acceder a las rutas por id en O(1)
  const routeMap = new Map(trips.map((trip) => [trip.route_id, trip]));
  
  const gtfsRoutes = await gtfs.getRoutes({
    route_id: Array.from(routeMap.keys()),
  });

  // Crear un mapa de trip_headsigns por route_id
  const tripHeadsignMap = new Map(trips.map(trip => [trip.route_id, trip.trip_headsign]));

  const routes = routeShortName
    ? gtfsRoutes.filter((route) => route.route_short_name === routeShortName)
    : gtfsRoutes;

  const lineas = await Promise.all(routes.map(async route => {
    const horarios = await getStopSchedule({
      stop_id: gtfsStop[0].stop_id, 
      route_id: route.route_id
    });
    const realtime = await getRTStopTimes({ stopTimes, route });
    
    const destino = tripHeadsignMap.get(route.route_id) || "";

    return {
      linea: route.route_short_name,
      destino: destino,
      horarios,
      realtime,
    };
  }));

  return {
    parada,
    lineas,
  };
};


// Caché de los service_ids activos
let activeServiceIdsCache = {
  serviceIds: new Set(),
  lastUpdate: null
};

// Obtenemos los service_id activos para el día actual
const getActiveServiceIds = async () => {
  const now = new Date();
  const lastMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Verificar si los service_id ya están actualizados para el día actual
  if (!activeServiceIdsCache.lastUpdate || activeServiceIdsCache.lastUpdate < lastMidnight) {
    const currentDate = parseInt(moment().format('YYYYMMDD'));
    const calendarDates = await gtfs.getCalendarDates();

    const activeServiceIds = calendarDates
      .filter(date => date.date === currentDate && date.exception_type === 1)
      .map(date => date.service_id);

    // Actualizar la caché
    activeServiceIdsCache = {
      serviceIds: new Set(activeServiceIds),
      lastUpdate: now
    };
  }

  return activeServiceIdsCache.serviceIds;
};

// Obtenemos los horarios de una parada
const getStopSchedule = async ({ stop_id, route_id }) => {
  const activeServiceIds = await getActiveServiceIds();
  const allTrips = await gtfs.getTrips({ route_id });
  const activeTrips = allTrips.filter(trip => activeServiceIds.has(trip.service_id));

  const stopTimes = await gtfs.getStoptimes({ stop_id });
  const filteredStopTimes = stopTimes.filter(stopTime =>
    activeTrips.some(trip => trip.trip_id === stopTime.trip_id)
  ).map(stopTime => ({
    trip_id: stopTime.trip_id,
    llegada: stopTime.arrival_time,
    tiempoRestante: getRemainingMinutes(stopTime.arrival_time),
  })).sort((a, b) => a.tiempoRestante - b.tiempoRestante);

  return filteredStopTimes;
};

// Obtenemos las actualizaciones en tiempo real de una parada
const getRTStopTimes = async ({ stopTimes, route }) => {
  // Crear un mapa para búsqueda rápida
  const stopTimesMap = new Map(stopTimes.map(sT => [`${sT.trip_id}-${sT.stop_sequence}`, sT]));

  const rtStopTimes = (await getCachedRtStopTimes())
    .filter(rtSt => {
      const key = `${rtSt.trip_id}-${rtSt.stop_sequence}`;
      return rtSt.route_id === route.route_id && stopTimesMap.has(key);
    })
    .map(async rtSt => {
      const key = `${rtSt.trip_id}-${rtSt.stop_sequence}`;
      const scheduledStop = stopTimesMap.get(key);
      const arrivalTime = moment.tz(rtSt.arrival_timestamp, 'UTC').tz('Europe/Madrid').format('HH:mm:ss');

      // Obtener la posición del vehículo
      const vehiclePosition = await gtfsGetBusPosition(rtSt.trip_id);

      // Comprobar si vehiclePosition existe y tiene al menos un elemento
      const hasVehiclePosition = vehiclePosition && vehiclePosition.length > 0;

      return {
        trip_id: rtSt.trip_id,
        llegada: arrivalTime,
        tiempoRestante: getRemainingMinutes(arrivalTime),
        desfase: calculateTimeShift({ scheduledStop, rtSt }),
        latitud: hasVehiclePosition ? vehiclePosition[0].latitud : null,
        longitud: hasVehiclePosition ? vehiclePosition[0].longitud : null,
        velocidad: hasVehiclePosition ? vehiclePosition[0].velocidad : null
      };
    });

  // Esperar a que todas las promesas se resuelvan
  const resolvedStopTimes = await Promise.all(rtStopTimes);

  // Ordenar si es necesario
  resolvedStopTimes.sort((a, b) => a.llegada.localeCompare(b.llegada));

  return resolvedStopTimes;
};

const getCachedRtStopTimes = async () => {
  const cacheKey = 'gtfsStopTimesUpdates';
  const cachedUpdates = getAllCacheKeys(cacheKey) || {};
  return Object.values(cachedUpdates);
};

// Obtener los minutos restantes hasta la llegada de la hora indicada
const getRemainingMinutes = (targetTime) => {
  const now = new Date();
  const targetDate = getDateFromTime(targetTime);
  return Math.floor((targetDate - now) / (1000 * 60));
};

// Obtenemos el desfase entre el horario programado y el horario en tiempo real
const calculateTimeShift = ({ scheduledStop, rtSt }) => {
  const scheduledTime = getDateFromTime(scheduledStop.arrival_time);
  const rtTime = new Date(rtSt.arrival_timestamp);
  const shiftSeconds = (rtTime - scheduledTime) / 1000;

  // Si quedan menos de 60 segundos, no hay desfase
  return shiftSeconds < 60 ? 0 : Math.floor(shiftSeconds / 60);
};

// Obtener la fecha para la hora indicada en formato HH:mm:ss
const getDateFromTime = (time) => {
  const now = new Date();
  const [hh, mm, ss] = time.split(':');
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss);
};

// Función para obtener todas las posiciones de vehículos en tiempo real
const gtfsGetBusPosition = async (tripId) => {
  try {
    // Pasar el tripId como parámetro para filtrar las posiciones de vehículos
    const vehiclePositions = await gtfs.getVehiclePositions({ trip_id: tripId });

    if (!vehiclePositions || vehiclePositions.length === 0) {
      return { error: `No hay datos disponibles en tiempo real para el viaje ${tripId}.` };
    }

    return vehiclePositions.map(position => ({
      updateId: position.update_id,
      latitud: position.latitude,
      longitud: position.longitude,
      velocidad: position.speed,
      tripId: position.trip_id,
      vehicleId: position.vehicle_id,
      timestamp: position.timestamp,
      isUpdated: position.isUpdated
    }));
  } catch (error) {
    console.error(`Error al obtener las posiciones de los vehículos para el viaje ${tripId}:`, error);
    return { error: 'Error al procesar la solicitud.' };
  }
};

// Función para recuperar el geojson de los recorridos de un trip_id
const fetchShapesForTrip = async (tripId) => {
  try {
    const shapes = await gtfs.getShapesAsGeoJSON({
      trip_id: tripId,
    });
    return shapes;
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return null;
  }
};

// Función para recuperar el geojson de las paradas de un trip_id
const fetchStopsForTrip = async (tripId) => {
  try {
    const shapes = await gtfs.getStopsAsGeoJSON({
      trip_id: tripId,
    });
    return shapes;
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return null;
  }
};

module.exports = {
  gtfsGetStop,
  gtfsGetStops,
  initializeGtfs,
  gtfsGetBusPosition,
  fetchShapesForTrip,
  fetchStopsForTrip,
};
