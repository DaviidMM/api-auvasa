const cheerio = require('cheerio');

const GET = async (url) => {
  console.log(`Fetching ${url}...`);
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const decoder = new TextDecoder('windows-1252');
      const text = decoder.decode(buffer);
      console.log(`Fetched ${url}`);
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

module.exports = {
  GET,
  getBuses,
  getBusCercano,
  getParada,
};
