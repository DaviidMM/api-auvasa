const cheerio = require('cheerio');
const { extraerInfoParada } = require('./scrape');

const GET = async (url) => {
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const decoder = new TextDecoder('windows-1252');
      const text = decoder.decode(buffer);
      return text;
    });
};

const getBuses = async (html) => {
  const $ = cheerio.load(html);
  if (!$('.table tbody tr').length) return false;

  return $('.table tbody tr')
    .toArray()
    .reduce((acc, bus) => {
      const celdas = $(bus).find('td');
      const destino = celdas.eq(3).text();
      const linea = celdas.eq(0).text();
      const tiempoRestante = celdas.eq(4).text();
      return [
        {
          destino,
          linea,
          tiempoRestante: Number(tiempoRestante),
          esExacto: !tiempoRestante.includes('+'),
        },
        ...acc,
      ];
    }, []);
};

const getBusCercano = (buses, linea) => {
  return buses
    .filter((bus) => bus.linea === linea)
    .sort((a, b) => {
      if (a.tiempoRestante < b.tiempoRestante) return -1;
      if (a.tiempoRestante > b.tiempoRestante) return 1;
      return 0;
    })[0];
};

const getLineas = async () => {
  const gtfsRoutes = require('../gtfs-files/routes.json');
  return gtfsRoutes.map((route) => ({
    linea: route.route_short_name,
    nombre: route.route_long_name,
    color: route.route_color,
  }));
};

const getParada = async (stopNumber) => {
  const page = await GET(
    `http://www.auvasa.es/parada.asp?codigo=${stopNumber}`,
  );
  const $ = cheerio.load(page);
  const nombre = $('.col_three_fifth.col_last h5').text().split('(')[0].trim();
  return {
    parada: { nombre, numero: stopNumber },
    html: $.html(),
  };
};

const getParadas = async () => {
  const page = await GET('http://www.auvasa.es/auv_mapaparadas.asp');

  const $ = cheerio.load(page);

  const html = $('.container script').html();

  // Bloques donde se definen las paradas
  // Son fragmentos de código JS que se ejecutan en la página
  const blocks = html.split('var contentString =').slice(1);

  const paradas = [];

  // Extraer información de cada bloque (parada)
  // y añadirla al array de paradas
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const info = extraerInfoParada(block);

    paradas.push(info);
  }

  return paradas;
};

module.exports = {
  GET,
  getBuses,
  getBusCercano,
  getLineas,
  getParada,
  getParadas,
};
