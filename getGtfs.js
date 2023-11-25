const fs = require('fs');
const decompress = require('decompress');
const {
  downloadGtfsStatic,
  convertAllTxtToJSON,
  moveJSONFiles,
} = require('./lib/gtfs/helpers');

(async () => {
  try {
    // Create tmp dir
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
    // Create gtfs-files dir
    if (!fs.existsSync('gtfs-files')) fs.mkdirSync('gtfs-files');
    // Descargar el archivo zip
    await downloadGtfsStatic();
    // Descomprimir el archivo zip
    await decompress('tmp/gtfs.zip', 'tmp/gtfs');
    // Convertir el archivos .txt a .json
    await convertAllTxtToJSON('tmp/gtfs');
    // Move json files to gtfs-files dir
    moveJSONFiles('gtfs-files');
    // Remove tmp dir
    fs.rm('tmp', { recursive: true }, (err) => {
      if (err) throw err;
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
