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
const { exec } = require('child_process');
const getGtfs = require('../../getGtfs');
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
        await updateGtfsCache();
      }, GTFS_REFRESH_RATE || 10000);

      // Ejecutar getGtfs.js dos veces al día y luego gtfs.importGtfs
      setInterval(() => {
        exec('node getGtfs.js', async (error, stdout, stderr) => {
          if (error) {
            console.error(`Error al ejecutar getGtfs.js: ${error.message}`);
            return;
          }

          // Luego de ejecutar getGtfs.js, ejecutar gtfs.importGtfs
          try {
            await gtfs.importGtfs(gtfsConfig);
            console.log('gtfs.importGtfs ejecutado correctamente después de getGtfs.js');
          } catch (error) {
            console.error('Error al ejecutar gtfs.importGtfs:', error);
          }
        });
      }, 43200000); // 12 horas

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

// Función para limpiar la hora cuando vienen fuera de rango (tipo 26:15)
// Calcula las horas ajustadas al rango 00-23
const adjustTime = (time) => {
  // Separa las horas y los minutos de la cadena de tiempo
  const [hours, minutes] = time.split(':');
  // Utiliza el operador módulo para asegurar que el resultado esté dentro del rango de 0 a 23
  // Suma 24 al resultado para manejar correctamente los casos donde las horas son negativas
  // Luego, utiliza el módulo de nuevo para asegurar que el resultado esté dentro del rango de 0 a 23
  const adjustedHours = ((parseInt(hours) % 24) + 24) % 24;

  // Formatea las horas ajustadas como una cadena de dos dígitos, rellenando con ceros a la izquierda si es necesario
  // Esto es para asegurar que el formato de la hora sea consistente con el esperado (HH:mm)
  return `${adjustedHours.toString().padStart(2, '0')}:${minutes}`;
};

// Obtenemos los horarios de una parada específica
// Esta función filtra los horarios de llegada de los autobuses en una parada dada,
// considerando solo los servicios activos para el día actual.
const getStopSchedule = async ({ stop_id, route_id }) => {
 // Obtiene los service_id activos para el día actual
 const activeServiceIds = await getActiveServiceIds();

 // Recupera todos los viajes para la ruta especificada
 const allTrips = await gtfs.getTrips({ route_id });

 // Filtra los viajes para incluir solo aquellos con service_id activo
 const activeTrips = allTrips.filter(trip => activeServiceIds.has(trip.service_id));

 // Obtiene los tiempos de parada para la parada especificada
 const stopTimes = await gtfs.getStoptimes({ stop_id });

 // Crea un mapa de trip_headsigns por trip_id para buscar el destino más rápido
 const tripHeadsignMap = new Map(activeTrips.map(trip => [trip.trip_id, trip.trip_headsign]));

 // Filtra los tiempos de parada para incluir solo aquellos que corresponden a viajes activos
 // y mapea los tiempos de parada a un formato más legible, incluyendo el tiempo restante y el destino
 const filteredStopTimes = stopTimes.filter(stopTime =>
    activeTrips.some(trip => trip.trip_id === stopTime.trip_id)
 ).map(stopTime => ({
    trip_id: stopTime.trip_id,
    llegada: adjustTime(stopTime.arrival_time), // Ajusta la hora de llegada al rango 00-23
    tiempoRestante: getRemainingMinutes(stopTime.arrival_time), // Calcula los minutos restantes hasta la llegada
    destino: tripHeadsignMap.get(stopTime.trip_id) || "", // Obtiene el destino del viaje
 })).sort((a, b) => a.tiempoRestante - b.tiempoRestante); // Ordena los tiempos de parada por tiempo restante


 // Devuelve los tiempos de parada filtrados y ordenados
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
        llegada: adjustTime(arrivalTime), // Se limpia la hora
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
