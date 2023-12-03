const gtfsConfig = require('../config');
const { importGtfsStatics } = require('.');

(async () => {
  let gtfs;
  await import('gtfs').then((module) => {
    gtfs = module;
  });

  try {
    await importGtfsStatics();
    await gtfs.importGtfs(gtfsConfig);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
