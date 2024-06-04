const {
  environment,
  getCacheKey,
  storeInCache,
  checkCache,
  compareObjects,
  getAllCacheKeys,
} = require('../utils');
const { GTFS_REFRESH_RATE, CACHE } = environment;
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
      try {
        // Importar GTFS estáticos
        await gtfs.importGtfs(gtfsConfig);
        // Importar GTFS realtime
        await updateGtfsCache();
      } catch (error) {
        console.error('Error al actualizar la caché de GTFS:', error);
      }

      // Actualizar los datos cada GTFS_REFRESH_RATE milisegundos
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
            console.log(
              'gtfs.importGtfs ejecutado correctamente después de getGtfs.js',
            );
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
    await gtfs.updateGtfsRealtime(gtfsConfig);

    // Solo guardamos en caché los tiempos RT si está en el config activado
    if (CACHE === 'True') {
      console.log('*** Iniciando actualización de datos de GTFS en caché...***');
      // Recuperar los datos actualizados
      const stopTimesUpdates = gtfs.getStopTimeUpdates();

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
            // Solo actualizar el caché si el nuevo valor no está vacío
            if (update && Object.keys(update).length > 0) {
              storeInCache(key, update);
              hasUpdates = true;
            } else {
              console.log(
                `La clave ${key} vino vacía, dejamos la existente en caché`,
              );
            }
          }
        } else {
          // Solo guardar en caché si el nuevo valor no está vacío
          if (update && Object.keys(update).length > 0) {
            storeInCache(key, update);
            console.log(`Nueva clave ${key} añadida`);
          } else {
            console.log(
              `La clave ${key} vino vacía, dejamos la existente en caché`,
            );
          }
        }
      }

      if (hasUpdates) counters.changes++;
      counters.total++;

      console.log({ counters });

      console.log('*** Datos de GTFS actualizados en caché. ***');
    }
  } catch (error) {
    console.log('[⚙] Error al actualizar los datos de GTFS');
    console.log(error);
  }
};

// Obtenemos la información de todas las paradas
const gtfsGetStops = async () => {
  const gtfsStops = await gtfs.getStops();

  const paradas = await Promise.all(
    gtfsStops.map(async (stop) => {
      const routes = await gtfs.getRoutes({ stop_id: stop.stop_id });
      const routeNames = routes.map(
        (route) => route.route_short_name || route.route_long_name,
      );

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
    }),
  );
  return paradas;
};

// Obtenemos la información de una parada
const gtfsGetStop = async (stopNumber, routeShortName, date) => {
  const gtfsStop = await gtfs.getStops({ stop_code: stopNumber });

  // Comprobamos que la parada existe y tiene al menos un elemento
  if (!gtfsStop || gtfsStop.length === 0) {
    return { error: 'No existe esa parada' };
  }
  // Asumiendo que solo necesitas un subconjunto de los datos de la parada
  const parada = gtfsStop.map((stop) => ({
    parada: stop.stop_name,
    numeroParada: stop.stop_code,
    latitud: stop.stop_lat,
    longitud: stop.stop_lon,
    url: stop.stop_url,
    datosFecha: date,
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
  const tripHeadsignMap = new Map(
    trips.map((trip) => [trip.route_id, trip.trip_headsign]),
  );

  const routes = routeShortName
    ? gtfsRoutes.filter((route) => route.route_short_name === routeShortName)
    : gtfsRoutes;

  const lineas = await Promise.all(
    routes.map(async (route) => {
      const horarios = await getStopSchedule(
        {
          stop_id: gtfsStop[0].stop_id,
          route_id: route.route_id,
        },
        date,
      );

      let realtime = [];
      // Si hemos pasado fecha pasada/futura no habrá datos realtime
      // Solo sacamos realtime si no hay fecha definida (datos de hoy)
      if (!date) {
        //realtime = await getRTStopTimes({ stopTimes, route });
        realtime = await getRTStopTimes(horarios, route);
      }

      const destino = tripHeadsignMap.get(route.route_id) || '';

      return {
        linea: route.route_short_name,
        // FIXME: El destino ya no se mostrará global por línea, si no por cada trip individual. Pendiente de borrar del endpoint.
        destino: destino,
        horarios,
        realtime,
      };
    }),
  );

  return {
    parada,
    lineas,
  };
};

// Caché de los service_ids activos
let activeServiceIdsCache = {};

// Obtenemos los service_id activos para el día proporcionado u hoy
const getActiveServiceIds = async (date) => {
  const now = date ? moment(date, 'YYYYMMDD').toDate() : new Date();
  const currentDate = parseInt(moment(now).format('YYYYMMDD'));
  const lastMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  // Verificar si los service_id ya están actualizados para la fecha proporcionada o el día actual
  if (
    !activeServiceIdsCache[currentDate] ||
    activeServiceIdsCache[currentDate].lastUpdate < lastMidnight
  ) {
    // Usamos los datos en calendars y calendar_dates
    const calendarDates = await gtfs.getCalendarDates();
    const calendars = await gtfs.getCalendars();

    // Filtrar calendarDates para obtener los service_id activos para la fecha actual
    const activeServiceIdsFromDates = calendarDates
      .filter((date) => date.date === currentDate && date.exception_type === 1)
      .map((date) => date.service_id);

    // Filtrar calendars para obtener los service_id activos para el día de la semana actual
    const dayOfWeek = now.getDay(); // 0 (domingo) a 6 (sábado)
    const activeServiceIdsFromCalendars = calendars
      .filter(
        (calendar) =>
          calendar[
            [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ][dayOfWeek]
          ] === 1 &&
          // Estamos dentro de la fecha definida en el rango
          currentDate >= calendar.start_date &&
          currentDate <= calendar.end_date,
      )
      .map((calendar) => calendar.service_id);

    // Unir los service_id activos de ambos filtros
    const activeServiceIds = [
      ...new Set([
        ...activeServiceIdsFromDates,
        ...activeServiceIdsFromCalendars,
      ]),
    ];

    // Actualizar la caché para la fecha actual
    activeServiceIdsCache[currentDate] = {
      serviceIds: new Set(activeServiceIds),
      lastUpdate: now,
    };
  }

  return activeServiceIdsCache[currentDate].serviceIds;
};

// Obtenemos los horarios de una parada específica
// Esta función filtra los horarios de llegada de los autobuses en una parada dada, considerando solo los servicios activos para la fecha proponcionada.
const getStopSchedule = async ({ stop_id, route_id }, date) => {
  // Obtiene los service_id activos para la fecha proponcionada
  const activeServiceIds = await getActiveServiceIds(date);

  // Recupera todos los viajes para la linea especificada
  const allTrips = await gtfs.getTrips({ route_id });

  // Filtra los viajes para incluir solo aquellos con service_id activo
  const activeTrips = allTrips.filter((trip) =>
    activeServiceIds.has(trip.service_id),
  );

  // Obtiene los tiempos de parada para la parada especificada
  const stopTimes = await gtfs.getStoptimes({ stop_id });

  // Crea un mapa de trip_headsigns por trip_id para buscar el destino más rápido
  const tripHeadsignMap = new Map(
    activeTrips.map((trip) => [trip.trip_id, trip.trip_headsign]),
  );

  // Filtra los tiempos de parada para incluir solo aquellos que corresponden a viajes activos y mapea los tiempos de parada a un formato más legible, incluyendo el tiempo restante y el destino
  const filteredStopTimes = stopTimes
    .filter((stopTime) =>
      activeTrips.some((trip) => trip.trip_id === stopTime.trip_id),
    )
    .map((stopTime) => {
      const fullArrivalDateTime = getFullArrivalDateTime(
        stopTime.arrival_time,
        date,
      );
      return {
        trip_id: stopTime.trip_id,
        stop_sequence: stopTime.stop_sequence,
        llegada: stopTime.arrival_time,
        tiempoRestante: getRemainingMinutes(stopTime.arrival_time), // Calcula los minutos restantes hasta la llegada
        destino: tripHeadsignMap.get(stopTime.trip_id) || '', // Obtiene el destino del viaje
        fechaHoraLlegada: fullArrivalDateTime, // Incluye la fecha y hora completa de llegada
      };
    })
    .sort((a, b) => a.tiempoRestante - b.tiempoRestante); // Ordena los tiempos de parada por tiempo restante

  // Devuelve los tiempos de parada filtrados y ordenados
  return filteredStopTimes;
};

//
const getRTStopTimes = async (stopTimes, route) => {
  // Crear un mapa para búsqueda rápida

  const stopTimesMap = new Map(
    stopTimes.map((sT) => [`${sT.trip_id}-${sT.stop_sequence}`, sT]),
  );

  // Obtener las actualizaciones en tiempo real
  const rtStopTimes = gtfs
    .getStopTimeUpdates()
    .filter((rtSt) => rtSt.route_id === route.route_id);

  // Crear un mapa para las actualizaciones en tiempo real
  const rtStopTimesMap = new Map(
    rtStopTimes.map((rtSt) => [`${rtSt.trip_id}-${rtSt.stop_sequence}`, rtSt]),
  );

  // Iterar sobre los elementos en stopTimesMap
  const rtStopTimesNew = Array.from(stopTimesMap).map(
    async ([key, scheduledStop]) => {
      const rtSt = rtStopTimesMap.get(key);

      const vehiclePosition = await gtfsGetBusPosition(scheduledStop.trip_id);
      const hasVehiclePosition = vehiclePosition && vehiclePosition.length > 0;

      let updated_arrival;
      let schedule_relationship;
      let propagated = 'false';
      let delay;
      let scheduled_arrival = scheduledStop.fechaHoraLlegada;
      // Si no hay actualización RT para un trip_id programado
      if (rtSt === undefined) {
        // Si no hay datos realtime buscamos el delay más cercano
        // y lo aplicamos a la hora programada
        const propagatedDelay = await getPropagatedDelay(
          scheduledStop.trip_id,
          scheduledStop.stop_sequence,
        );
        if (propagatedDelay) {
          updated_arrival = moment
            .tz(scheduled_arrival, 'UTC')
            .tz('Europe/Madrid')
            .add(propagatedDelay, 'seconds')
            .format('YYYY-MM-DDTHH:mm:ssZ');
          propagated = 'true';
          schedule_relationship = 'SCHEDULED';
        } else {
          updated_arrival = null;
        }

        // Calculamos el delay ya que arrival_delay puede venir vacío
        if (scheduled_arrival && updated_arrival) {
          const shiftSeconds =
            (new Date(scheduled_arrival) - new Date(updated_arrival)) / 1000;
          const shiftMinutes =
            Math.sign(shiftSeconds) * Math.abs(Math.floor(shiftSeconds / 60));
          // Si es menor de 60s lo mostramos como 0
          delay = Math.abs(shiftSeconds) < 60 ? 0 : shiftMinutes;
        }

        return {
          trip_id: scheduledStop.trip_id,
          vehicleId: hasVehiclePosition ? vehiclePosition[0].vehicleId : null,
          matricula: hasVehiclePosition ? vehiclePosition[0].matricula : null,
          stop_sequence: scheduledStop.stop_sequence,
          desfase: delay !== undefined ? delay : null,
          latitud: hasVehiclePosition ? vehiclePosition[0].latitud : null,
          longitud: hasVehiclePosition ? vehiclePosition[0].longitud : null,
          velocidad: hasVehiclePosition ? vehiclePosition[0].velocidad : null,
          ocupacion: hasVehiclePosition ? vehiclePosition[0].ocupacion : null,
          propagated_delay: propagated ? propagated : null,
          fechaHoraLlegada: updated_arrival,
          schedule_relationship: schedule_relationship
            ? schedule_relationship
            : null,
        };
      }

      // Si hay datos RT los usamos directamente
      let arrivalTime;
      let fullArrivalDateTime;
      if (rtSt.arrival_timestamp) {
        let timestamp = new Date(rtSt.arrival_timestamp * 1000).toISOString();
        arrivalTime = moment
          .tz(timestamp, 'UTC')
          .tz('Europe/Madrid')
          .format('HH:mm:ss');
        fullArrivalDateTime = moment
          .tz(timestamp, 'UTC')
          .tz('Europe/Madrid')
          .format('YYYY-MM-DDTHH:mm:ssZ');
      } else {
        return null;
      }

      return {
        trip_id: rtSt.trip_id,
        vehicleId: hasVehiclePosition ? vehiclePosition[0].vehicleId : null,
        matricula: hasVehiclePosition ? vehiclePosition[0].matricula : null,
        llegada: arrivalTime,
        tiempoRestante: getRemainingMinutes(arrivalTime),
        desfase: calculateTimeShift({ scheduledStop, rtSt }),
        latitud: hasVehiclePosition ? vehiclePosition[0].latitud : null,
        longitud: hasVehiclePosition ? vehiclePosition[0].longitud : null,
        velocidad: hasVehiclePosition ? vehiclePosition[0].velocidad : null,
        ocupacion: hasVehiclePosition ? vehiclePosition[0].ocupacion : null,
        propagated_delay: propagated ? propagated : null,
        fechaHoraLlegada: fullArrivalDateTime,
        estado: rtSt.schedule_relationship ? rtSt.schedule_relationship : null,
      };
    },
  );

  // Esperar a que todas las promesas se resuelvan
  const resolvedStopTimes = await Promise.all(rtStopTimesNew);

  // Filtrar cualquier objeto que sea null
  const filteredStopTimes = resolvedStopTimes.filter(
    (stopTime) => stopTime !== null && stopTime.fechaHoraLlegada !== undefined,
  );

  // Ordenar si es necesario
  filteredStopTimes.sort((a, b) => {
    // Si alguno de los elementos es null, colócalo al final
    if (a.fechaHoraLlegada === null) return 1;
    if (b.fechaHoraLlegada === null) return -1;

    // Si ninguno es null, procede con la comparación normal
    return a.fechaHoraLlegada.localeCompare(b.fechaHoraLlegada);
  });

  return filteredStopTimes;
};

// Antigua función getRTStopTimes que hacía uso de CACHE
// TODO: Eliminar cuando ya no sea necesario para pruebas
// Obtenemos las actualizaciones en tiempo real de una parada
const getRTStopTimesLegacy = async ({ stopTimes, route }) => {
  // Crear un mapa para búsqueda rápida
  const stopTimesMap = new Map(
    stopTimes.map((sT) => [`${sT.trip_id}-${sT.stop_sequence}`, sT]),
  );

  // Iteremos los datos RT en cache para la línea indicada
  // y que el trip_id y stop_sequence exista en los datos programados
  const rtStopTimes = (await getCachedRtStopTimes())
    .filter(rtSt => {
      const key = `${rtSt.trip_id}-${rtSt.stop_sequence}`;
      return rtSt.route_id === route.route_id && stopTimesMap.has(key);
    })
    .map(async rtSt => {
      const key = `${rtSt.trip_id}-${rtSt.stop_sequence}`;
      const scheduledStop = stopTimesMap.get(key);
      let arrivalTime;
      let fullArrivalDateTime;
      // rtSt.arrival_timestamp a veces viene como null, si es así devolvemos vacío
      if (rtSt.arrival_timestamp) {
        // Convertimos el Unix timestamp a ms y luego a una cadena ISO 8601
        let timestamp = new Date(rtSt.arrival_timestamp * 1000).toISOString();
        arrivalTime = moment
          .tz(timestamp, 'UTC')
          .tz('Europe/Madrid')
          .format('HH:mm:ss');
        // Fecha completa del timestamp en zona horaria local
        fullArrivalDateTime = moment
          .tz(timestamp, 'UTC')
          .tz('Europe/Madrid')
          .format('YYYY-MM-DDTHH:mm:ssZ');
      } else {
        return [];
      }
      // Obtener la posición del vehículo
      const vehiclePosition = await gtfsGetBusPosition(rtSt.trip_id);

      // Comprobar si vehiclePosition existe y tiene al menos un elemento
      const hasVehiclePosition = vehiclePosition && vehiclePosition.length > 0;
      return {
        trip_id: rtSt.trip_id,
        vehicleId: hasVehiclePosition ? vehiclePosition[0].vehicleId : null,
        matricula: hasVehiclePosition ? vehiclePosition[0].matricula : null,
        llegada: arrivalTime,
        tiempoRestante: getRemainingMinutes(arrivalTime),
        desfase: calculateTimeShift({ scheduledStop, rtSt }),
        latitud: hasVehiclePosition ? vehiclePosition[0].latitud : null,
        longitud: hasVehiclePosition ? vehiclePosition[0].longitud : null,
        velocidad: hasVehiclePosition ? vehiclePosition[0].velocidad : null,
        ocupacion: hasVehiclePosition ? vehiclePosition[0].ocupacion : null,
        fechaHoraLlegada: fullArrivalDateTime, // Incluye la fecha y hora completa de llegada
        estado: rtSt.schedule_relationship ? rtSt.schedule_relationship : null,
      };
    });

  // Esperar a que todas las promesas se resuelvan
  const resolvedStopTimes = await Promise.all(rtStopTimes);

  // Filtrar cualquier objeto que tenga llegada como undefined
  const filteredStopTimes = resolvedStopTimes.filter(
    (stopTime) => stopTime.llegada !== undefined,
  );

  // Ordenar si es necesario
  filteredStopTimes.sort((a, b) => a.llegada.localeCompare(b.llegada));

  return filteredStopTimes;
};

const getCachedRtStopTimes = async () => {
  const cacheKey = 'gtfsStopTimesUpdates';
  const cachedUpdates = getAllCacheKeys(cacheKey) || {};
  return Object.values(cachedUpdates);
};

const gtfsGetAlerts = async () => {
  try {
    const serviceAlerts = gtfs.getServiceAlerts();
    const lineas = gtfs.getRoutes();
    const paradas = gtfs.getStops();

    // Mapear cada alerta al nuevo formato
    const formattedAlerts = serviceAlerts.map(alert => {
      // Extraer información relevante de la alerta
      const {
        cause,
        start_time,
        end_time,
        headline,
        description,
        is_updated,
        stop_id,
        route_id,
      } = alert;

      // Busca en lineas el objeto cuyo route_id coincida con el route_id de la alerta
      const lineaInfo = lineas.find(l => l.route_id === route_id);
      // Busca en paradas el objeto cuyo stop_id coincida con el stop_id de la alerta
      const paradaInfo = paradas.find(p => p.stop_id === stop_id);

      // Construir el objeto de ruta basado en la información disponible
      const ruta = {
        causa: cause || null,
        gtfsRouteId: route_id || null,
        linea: lineaInfo ? lineaInfo.route_short_name : null,
        parada: paradaInfo ? paradaInfo.stop_code : null,
        start_time: start_time || null,
        end_time: end_time || null,
        is_update: is_updated || null,
      };

      // Construir el objeto de alerta formateado
      return {
        ruta,
        resumen: headline,
        descripcion: description,
      };
    });

    return formattedAlerts;
  } catch (error) {
    console.error(error);
    // Si hay algún error devolvemos un array vacío.
    return [];
  }
};

// Obtener los minutos restantes hasta la llegada de la hora indicada
const getRemainingMinutes = (targetTime) => {
  const now = new Date();
  const targetDate = getDateFromTime(targetTime);
  return Math.floor((targetDate - now) / (1000 * 60));
};

// Función para obtener la fecha y hora completa de llegada
const getFullArrivalDateTime = (targetTime, providedDate) => {
  // Si providedDate es null, usamos la fecha de hoy
  const now = providedDate
    ? moment(providedDate).tz('Europe/Madrid')
    : moment().tz('Europe/Madrid');
  let [hh, mm, ss] = targetTime.split(':');
  hh = parseInt(hh);
  mm = parseInt(mm);
  ss = parseInt(ss);

  // Ajustar la hora si es mayor a 24 para indicar que es del día siguiente
  if (hh >= 24) {
    // Resta 24 a la hora y suma un día a la fecha
    hh -= 24;
    now.add(1, 'days');
  }

  const targetDate = now.clone().hour(hh).minute(mm).second(ss);
  // Formatear la fecha y hora sin milisegundos y en la zona horaria de Madrid
  return targetDate.format('YYYY-MM-DDTHH:mm:ssZ');
};

// Obtenemos el desfase entre el horario programado y el horario en tiempo real
const calculateTimeShift = ({ scheduledStop, rtSt }) => {
  const scheduledTime = getDateFromTime(scheduledStop.llegada);
  const rtTime = new Date(rtSt.arrival_timestamp * 1000);
  const shiftSeconds = (scheduledTime - rtTime) / 1000;

  // Calcular el desfase en minutos, manteniendo el signo
  const shiftMinutes =
    Math.sign(shiftSeconds) * Math.abs(Math.floor(shiftSeconds / 60));

  // Si el desfase es menor a 60 segundos, considerarlo como 0
  return Math.abs(shiftSeconds) < 60 ? 0 : shiftMinutes;
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
      return {
        error: `No hay datos disponibles en tiempo real para el viaje ${tripId}.`,
      };
    }

    return vehiclePositions.map(position => ({
      updateId: position.update_id,
      latitud: position.latitude,
      longitud: position.longitude,
      velocidad: position.speed,
      tripId: position.trip_id,
      vehicleId: position.vehicle_id,
      matricula: position.vehicle_license_plate,
      ocupacion: position.occupancy_status,
      timestamp: position.timestamp,
      isUpdated: position.isUpdated,
    }));
  } catch (error) {
    console.error(
      `Error al obtener las posiciones de los vehículos para el viaje ${tripId}:`,
      error,
    );
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

// Definimos términos que se usan indistintamente al referirse a los nombres de las paradas
function normalizeStopName(name) {
  // Reemplazar palabras clave por sus equivalentes
  const replacements = {
    'C/': 'calle',
    'fte': 'frente',
    'plza': 'plaza',
    'pza': 'plaza',
    'pº': 'paseo',
    'esq': 'esquina',
    'sta': 'santa',
    'Avda': 'avenida',
    'Ctra': 'carretera',
  };

  // Aplicar reemplazos
  let normalizedName = name;
  for (const [key, value] of Object.entries(replacements)) {
    // Solo reemplazar si el valor no está ya presente en el nombre normalizado
    if (!normalizedName.includes(value)) {
      normalizedName = normalizedName.replace(new RegExp(key, 'gi'), value);
    }
  }

  // Convertir a minúsculas y eliminar espacios, puntos y comas
  return normalizedName
    .toLowerCase()
    .replace(/[\s.,]+/g, ' ')
    .trim();
}

const suspendedStops = async () => {
  try {
    // Obtener las alertas
    const alerts = await gtfsGetAlerts();

    // Obtener todas las paradas
    const allStops = await gtfsGetStops();

    // Objeto para almacenar las paradas suprimidas de manera única
    const suspendedStopsMap = {};

    // Iterar sobre las alertas
    for (const alert of alerts) {
      // Extraer el nombre de la parada de la descripción de la alerta
      const match = alert.descripcion.match(
        /Paradas suprimidas:\s*(.+)|Parada suprimida:\s*(.+)|Línea \d+ sentido .+ desviada desde .+ hasta .+ Parada suprimida:\s*(.+)|Parada suprimida (\d+) (.+)/,
      );
      if (match) {
        let stopNames;
        // Comprobar si el tercer grupo capturado (el número de parada) está presente
        if (match[3]) {
          // Si el número de parada está presente, combinar el nombre de la parada sin el número
          stopNames = match[5]
            ? match[5]
                .trim()
                .split(',')
                .map((name) => name.trim())
            : [];
        } else {
          // Si el número de parada no está presente, usar el primer o segundo grupo capturado
          stopNames =
            match[1] || match[2]
              ? (match[1] || match[2])
                  .trim()
                  .split(',')
                  .map((name) => name.trim())
              : [];
        }

        // Iterar sobre cada nombre de parada y procesarlos
        for (const stopName of stopNames) {
          // Limpiar el nombre de la parada eliminando espacios, puntos y comas
          const cleanedStopName = stopName.replace(/[\s.,]+/g, ' ').trim();

          // Buscar la parada en el listado de todas las paradas
          const suspendedStop = allStops.find(
            (stop) =>
              normalizeStopName(stop.parada.nombre) ===
              normalizeStopName(cleanedStopName),
          );

          // Si la parada se encuentra y no está ya en el mapa, agregarla
          if (
            suspendedStop &&
            !suspendedStopsMap[suspendedStop.parada.nombre]
          ) {
            suspendedStopsMap[suspendedStop.parada.nombre] = {
              nombre: suspendedStop.parada.nombre,
              numero: suspendedStop.parada.numero,
            };
          }
        }
      }
    }

    // Convertir el objeto en un array y devolverlo
    return Object.values(suspendedStopsMap);
  } catch (error) {
    console.error('Error al obtener las paradas suprimidas:', error);
    return [];
  }
};

// Devuelve en segundos la diferencia de tiempo entre programado
// y tiempo real de la parada anterior más cercana, no hay anterior
// busca en la parada siguiente más cercana
const getPropagatedDelay = async (tripId, stopSequence) => {
  try {
    // Obtener las stoptimes para el tripId
    const stoptimes = gtfs.getStoptimes({ trip_id: tripId });

    // Forwards Delay Propagation
    // Iterar sobre las stoptimes en orden inverso
    for (let i = stoptimes.length - 1; i >= 0; i--) {
      const stoptime = stoptimes[i];

      if (stoptime.stop_sequence < stopSequence) {
        const realTimeArrival = gtfs.getStopTimeUpdates({
          stop_sequence: stoptime.stop_sequence,
          trip_id: stoptime.trip_id,
        });

        if (realTimeArrival.length > 0) {
          const scheduledArrival = getFullArrivalDateTime(stoptime.arrival_time);
          const realTimeArrivalTimestamp = new Date(
            realTimeArrival[0].arrival_timestamp * 1000
          ).toISOString();
          const updatedArrival = moment
            .tz(realTimeArrivalTimestamp, 'UTC')
            .tz('Europe/Madrid')
            .format('YYYY-MM-DDTHH:mm:ssZ');

          const delaySeconds =
            (new Date(updatedArrival) - new Date(scheduledArrival)) / 1000;

          return delaySeconds;
        }
      }
    }

    // Backwards Delay Propagation
    // Si no hay paradas anteriores con datos en tiempo real, buscar la primera parada posterior con datos
    for (let i = 0; i < stoptimes.length; i++) {
      const stoptime = stoptimes[i];

      if (stoptime.stop_sequence > stopSequence) {
        const realTimeArrival = gtfs.getStopTimeUpdates({
          stop_sequence: stoptime.stop_sequence,
          trip_id: stoptime.trip_id,
        });

        if (realTimeArrival.length > 0) {
          const scheduledArrival = getFullArrivalDateTime(stoptime.arrival_time);
          const realTimeArrivalTimestamp = new Date(
            realTimeArrival[0].arrival_timestamp * 1000
          ).toISOString();
          const updatedArrival = moment
            .tz(realTimeArrivalTimestamp, 'UTC')
            .tz('Europe/Madrid')
            .format('YYYY-MM-DDTHH:mm:ssZ');

          const delaySeconds =
            (new Date(updatedArrival) - new Date(scheduledArrival)) / 1000;

          return delaySeconds;
        }
      }
    }

    // Si no hay paradas anteriores ni posteriores con datos en tiempo real, devolver null
    return null;
  } catch (err) {
    console.error('Error getting propagated delay:', err);
    throw err;
  }
};

// Devuelve una lista de paradas para un tripId con su info y
// sus tiempos programados y en tiempo real de llegada
const gtfsGetTripSequence = async (tripId) => {
  try {
    // Consultamos los stop times para ese trip_id
    const stoptimes = gtfs.getStoptimes({ trip_id: tripId });

    // Si no hay stoptimes, devolvemos array vacio
    if (stoptimes.length === 0) {
      return [];
    }

    // Extraemos stop_ids de stoptimes
    const stopIds = stoptimes.map((stoptime) => stoptime.stop_id);

    // Consultamos los stops usando los stop_ids
    const stops = gtfs.getStops({ stop_id: stopIds });

    // Mapeamos los stoptimes a sus stops correspondientes y ordenmos por stop_sequence
    const stopsWithSequence = stoptimes
      .map(async (stoptime) => {
        const stop = stops.find((stop) => stop.stop_id === stoptime.stop_id);

        const scheduledArrival = gtfs.getStoptimes({
          stop_id: stop.stop_id,
          trip_id: tripId,
        });
        const realTimeArrival = await gtfs.getStopTimeUpdates({
          trip_id: tripId,
          stop_sequence: stoptime.stop_sequence,
        });

        let scheduled_arrival;
        if (scheduledArrival.length > 0) {
          scheduled_arrival = getFullArrivalDateTime(
            scheduledArrival[0].arrival_time,
          );
        }

        let updated_arrival;
        let schedule_relationship;
        let propagated = 'false';
        let delay;
        if (
          realTimeArrival.length > 0 &&
          realTimeArrival[0].arrival_timestamp
        ) {
          let timestamp = new Date(
            realTimeArrival[0].arrival_timestamp * 1000,
          ).toISOString();
          updated_arrival = moment
            .tz(timestamp, 'UTC')
            .tz('Europe/Madrid')
            .format('YYYY-MM-DDTHH:mm:ssZ');
          schedule_relationship = realTimeArrival[0].schedule_relationship;
        } else {
          // Si no hay datos realtime buscamos el delay más cercano
          // y lo aplicamos a la hora programada
          const propagatedDelay = await getPropagatedDelay(
            tripId,
            stoptime.stop_sequence,
          );
          if (scheduled_arrival && propagatedDelay) {
            updated_arrival = moment
              .tz(scheduled_arrival, 'UTC')
              .tz('Europe/Madrid')
              .add(propagatedDelay, 'seconds')
              .format('YYYY-MM-DDTHH:mm:ssZ');
            propagated = 'true';
            schedule_relationship = 'SCHEDULED';
          } else {
            updated_arrival = null;
          }
        }

        // Calculamos el delay ya que arrival_delay puede venir vacío
        if (scheduled_arrival && updated_arrival) {
          const shiftSeconds =
            (new Date(scheduled_arrival) - new Date(updated_arrival)) / 1000;
          const shiftMinutes =
            Math.sign(shiftSeconds) * Math.abs(Math.floor(shiftSeconds / 60));
          // Si es menor de 60s lo mostramos como 0
          delay = Math.abs(shiftSeconds) < 60 ? 0 : shiftMinutes;
        }

        return {
          stop_id: stop.stop_id,
          stop_code: stop.stop_code,
          stop_name: stop.stop_name,
          stop_sequence: stoptime.stop_sequence,
          stop_lat: stop.stop_lat,
          stop_lon: stop.stop_lon,
          scheduled_arrival: scheduled_arrival ? scheduled_arrival : null,
          updated_arrival: updated_arrival ? updated_arrival : null,
          delay: delay !== undefined ? delay : null,
          propagated_delay: propagated ? propagated : null,
          schedule_relationship: schedule_relationship
            ? schedule_relationship
            : null,
        };
      })
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    return await Promise.all(stopsWithSequence);
  } catch (err) {
    console.error('Error getting stops for trip:', err);
    throw err;
  }
};

module.exports = {
  gtfsGetStop,
  gtfsGetStops,
  initializeGtfs,
  gtfsGetAlerts,
  gtfsGetBusPosition,
  fetchShapesForTrip,
  fetchStopsForTrip,
  gtfsGetTripSequence,
  suspendedStops,
};
