// swaggerOptions.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'api-auvasa',
      version: '2.0.0',
      description:
        '<p>API para acceder a información GTFS de autobuses en Valladolid y alrededores.<p><a href="https://github.com/VallaBus/api-auvasa">Código en GitHub</a> - <a href="https://github.com/VallaBus/api-auvasa?tab=readme-ov-file#licencia">Bajo licencia AGPL v3</a></p><p>Origen de los datos: <a href="https://www.auvasa.es/empresa/datos-abiertos/">GTFS de AUVASA</a> (CC BY 3.0) y elaboración propia proporcionados de forma no oficial sin ninguna garantía.',
    },
  },
  apis: ['./routes/*/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
