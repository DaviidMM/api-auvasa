const cheerio = require('cheerio');

const GET = async (url) => {
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const decoder = new TextDecoder('windows-1252');
      const text = decoder.decode(buffer);
      return text;
    });
};

const getParada = (parada) => {
  return GET(`http://www.auvasa.es/parada.asp?codigo=${parada}`);
};

const getBuses = async (parada) => {
  const page = await getParada(parada);
  const $ = cheerio.load(page);
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

const getClosestBus = (buses, linea) => {
  return buses
    .filter((bus) => bus.linea === linea)
    .sort((a, b) => {
      if (a.tiempoRestante < b.tiempoRestante) return -1;
      if (a.tiempoRestante > b.tiempoRestante) return 1;
      return 0;
    });
};

module.exports = { GET, getBuses, getClosestBus, getParada };
