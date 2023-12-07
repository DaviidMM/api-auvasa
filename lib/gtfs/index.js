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

  const routes = routeShortName
    ? gtfsRoutes.filter((route) => route.route_short_name === routeShortName)
    : gtfsRoutes;

  const lineasPromises = routes.map(async (route) => {
    const horarios = getStopSchedule({ trips, stopTimes, route });
    const realtime = await getRTStopTimes({ stopTimes, route });
    
    return {
      linea: route.route_short_name,
      destino: route.route_long_name,
      horarios,
      realtime,
    };
  });

  // Asegurarse de no sobrecargar el sistema con demasiadas promesas en paralelo
  // Si hay muchas rutas, podrías considerar procesarlas en lotes
  const lineas = await Promise.all(lineasPromises);

  return {
    parada,
    lineas,
  };
};

// Obtenemos los horarios de una parada
const getStopSchedule = ({ trips, stopTimes, route }) => {
  // Filtramos los horarios por línea
  return (
    stopTimes
      .filter((sT) =>
        trips
          .filter((trip) => trip.route_id === route.route_id)
          .map((t) => t.trip_id)
          .includes(sT.trip_id),
      )
      // Mapeamos los horarios a un objeto con los datos que nos interesan
      .map((sT) => {
        return {
          // sT,
          // trip: trips.find((trip) => trip.trip_id === sT.trip_id),
          trip_id: sT.trip_id,
          llegada: sT.arrival_time,
          tiempoRestante: getRemainingMinutes(sT.arrival_time),
        };
      })
      // Ordenamos los horarios por tiempo restante
      .sort((a, b) => a.tiempoRestante - b.tiempoRestante)
  );
};

// Obtenemos las actualizaciones en tiempo real de una parada
const getRTStopTimes = async ({ stopTimes, route }) => {
  // Crear un mapa para búsqueda rápida
  const stopTimesMap = new Map(stopTimes.map(sT => [`${sT.trip_id}-${sT.stop_sequence}`, sT]));

  const rtStopTimes = (await getCachedRtStopTimes())
    // Realizar todas las comprobaciones en un solo paso de filtrado
    .filter(rtSt => {
      const key = `${rtSt.trip_id}-${rtSt.stop_sequence}`;
      return rtSt.route_id === route.route_id && stopTimesMap.has(key);
    })
    // Mapear las actualizaciones en tiempo real a un objeto con los datos que nos interesan
    .map(rtSt => {
      const key = `${rtSt.trip_id}-${rtSt.stop_sequence}`;
      const scheduledStop = stopTimesMap.get(key);
      const arrivalTime = moment.tz(rtSt.arrival_timestamp, 'UTC').tz('Europe/Madrid').format('HH:mm:ss');
      return {
        trip_id: rtSt.trip_id,
        llegada: arrivalTime,
        tiempoRestante: getRemainingMinutes(arrivalTime),
        desfase: calculateTimeShift({ scheduledStop, rtSt }),
      };
    });
  // Nota: Puede que esta ordenación no sea necesaria si lo hace el cliente
  rtStopTimes.sort((a, b) => a.llegada.localeCompare(b.llegada));

  return rtStopTimes;
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

module.exports = {
  gtfsGetStop,
  initializeGtfs,
};
