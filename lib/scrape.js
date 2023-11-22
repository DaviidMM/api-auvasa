const formatMatches = (matches) => {
  const formatted = {
    parada: {
      nombre: '',
      numero: '',
    },
    lineas: {
      ordinarias: [],
      buho: [],
      futbol: [],
      matinales: [],
      poligonos: [],
    },
    ubicacion: {
      x: 0,
      y: 0,
    },
  };

  if (matches.nombre) {
    formatted.parada.nombre = matches.nombre
      .replace(/"\s*\+\s*'<br\/>'\s*\+\s*"/g, ' ')
      .replace(/\s*"$/, '');
  }

  if (matches.numeroParada) formatted.parada.numero = matches.numeroParada;

  const splitRegex = /\b[A-Z]?\d+\b/g;

  formatted.lineas = {
    ordinarias: matches.lineasOrdinarias?.match(splitRegex),
    buho: matches.lineasBuho?.match(splitRegex),
    futbol: matches.lineasFutbol?.match(splitRegex),
    matinales: matches.lineasMatinales?.match(splitRegex),
    poligonos: matches.lineasPoligonos?.match(splitRegex),
  };

  if (matches.ubicacionX && matches.ubicacionY) {
    formatted.ubicacion = {
      x: parseFloat(matches.ubicacionX),
      y: parseFloat(matches.ubicacionY),
    };
  }

  return formatted;
};

const extraerInfoParada = (cadena) => {
  // Expresiones regulares para extraer información
  const REGEXS = {
    nombre: /<h4>'\+ "(.*?) \+ '<\/h4>/,
    numeroParada: /Nº Parada: ' \+ "(\d+)/,
    lineasOrdinarias: /Ordinarias:' \+ "([^']+)"/,
    lineasBuho: /Líneas Búho:' \+"([^']+) "\+ /,
    lineasFutbol: /Servicio Fútbol:' \+"([^']+) "\+ /,
    lineasMatinales: /Líneas Matinales:' \+"([^']+) "\+ /,
    lineasPoligonos: /Líneas a Polígonos:' \+"([^']+) "\+ /,
    ubicacionX: /var cX = "\s*(-?\d+\.\d+)";\s+/,
    ubicacionY: /var cY = "\s*(-?\d+\.\d+)";\s+/,
  };

  // Extraer información usando regex
  const MATCHES = Object.entries(REGEXS).reduce((acc, [key, regex]) => {
    const match = cadena.match(regex);
    if (match) {
      acc[key] = match[1];
    }
    return acc;
  }, {});

  return formatMatches(MATCHES);
};

module.exports = { extraerInfoParada };
