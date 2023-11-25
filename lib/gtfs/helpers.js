const fs = require('fs');
const csv = require('csv-parser');

const downloadGtfsStatic = async () => {
  await fetch('http://212.170.201.204:50080/GTFSRTapi/api/GTFSFile')
    .then(async (response) => {
      // Obtener el cuerpo de la respuesta como ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Crear un Buffer desde el ArrayBuffer
      const buffer = Buffer.from(arrayBuffer);

      // Escribir el buffer en el archivo zip
      fs.writeFileSync('tmp/gtfs.zip', buffer);
    })
    .catch((err) => {
      console.error(err);
    });
};

const convertTxtToJSON = async (file) => {
  const tripsFilePath = `tmp/gtfs/${file}`;
  const jsonFilePath = `tmp/gtfs/${file.split('.')[0]}.json`;

  const trips = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(tripsFilePath)
      .pipe(csv())
      .on('data', (data) => {
        trips.push(data);
      })
      .on('end', () => {
        fs.writeFile(jsonFilePath, JSON.stringify(trips, null, 2), (err) => {
          if (err) reject(err);
          resolve();
        });
      });
  });
};

const convertAllTxtToJSON = async () => {
  const txtFiles = fs.readdirSync('tmp/gtfs');
  // Wait for all files to be converted
  await Promise.all(
    txtFiles.map((file) => {
      if (file.split('.')[1] === 'txt') {
        return convertTxtToJSON(file);
      }
    }),
  );
};

const moveJSONFiles = async (to) => {
  const jsonFiles = fs.readdirSync('tmp/gtfs');
  jsonFiles.forEach((file) => {
    if (file.split('.')[1] === 'json') {
      fs.renameSync(`tmp/gtfs/${file}`, `${to}/${file}`);
    }
  });
};

module.exports = {
  downloadGtfsStatic,
  convertAllTxtToJSON,
  moveJSONFiles,
};
