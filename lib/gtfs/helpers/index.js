const fs = require('fs');
const csv = require('csv-parser');
const { staticUrl: gtfsStaticUrl } = require('../config');
const decompress = require('decompress');

const { environment } = require('../../utils');
const { GTFS_DIR } = environment;

const downloadGtfsStatic = async (targetFile) => {
  await fetch(gtfsStaticUrl)
    .then(async (response) => {
      // Obtener el cuerpo de la respuesta como ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Crear un Buffer desde el ArrayBuffer
      const buffer = Buffer.from(arrayBuffer);

      // Escribir el buffer en el archivo zip
      fs.writeFileSync(targetFile, buffer);
    })
    .catch((err) => {
      console.error(err);
    });
};

const convertTxtToJSON = async (dir, file) => {
  const tripsFilePath = `${dir}/${file}`;
  const jsonFilePath = `${dir}/${file.split('.')[0]}.json`;

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

const convertAllTxtToJSON = async (dir) => {
  const txtFiles = fs.readdirSync(dir);
  // Wait for all files to be converted
  await Promise.all(
    txtFiles.map((file) => {
      if (file.split('.')[1] === 'txt') {
        return convertTxtToJSON(dir, file);
      }
    }),
  );
};

const moveFiles = async (from, to) => {
  const jsonFiles = fs.readdirSync(from);
  jsonFiles.forEach((file) => {
    if (file.includes('agency.txt')) return;
    fs.renameSync(`${from}/${file}`, `${to}/${file}`);
  });
};

const importGtfsStatics = async () => {
  try {
    const tmpPath = `${GTFS_DIR}/tmp`;
    const staticPath = `${GTFS_DIR}/static`;
    // Create tmp dir
    if (!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath);
    // Create static files dir
    if (!fs.existsSync(staticPath)) fs.mkdirSync(staticPath);
    // Descargar el archivo zip
    await downloadGtfsStatic(`${tmpPath}/gtfs.zip`);
    // Descomprimir el archivo zip
    await decompress(`${tmpPath}/gtfs.zip`, `${tmpPath}/gtfs`);
    // Convertir el archivos .txt a .json
    // await convertAllTxtToJSON(`${tmpPath}/gtfs`);
    // Move json files to gtfs-files dir
    moveFiles(`${tmpPath}/gtfs`, staticPath);
    // Remove tmp dir
    fs.rm(tmpPath, { recursive: true }, (err) => {
      if (err) throw err;
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = {
  importGtfsStatics, downloadGtfsStatic, convertAllTxtToJSON, moveFiles
};
