const { environment } = require('../utils');

const { GTFS_DIR } = environment;

const config = {
  sqlitePath: `${GTFS_DIR}/database.sqlite`,
  agencies: [
    {
      agency_key: 'AUVASA',
      path: `${GTFS_DIR}/static`,
      realtimeUrls: [
        'http://212.170.201.204:50080/GTFSRTapi/api/tripupdate',
        'http://212.170.201.204:50080/GTFSRTapi/api/vehicleposition',
        'http://212.170.201.204:50080/GTFSRTapi/api/alert',
      ],
    },
    {
      agency_key: 'ECSA',
      path: `${GTFS_DIR}/static/ecsa`,
    },
    {
      agency_key: 'LaRegional',
      path: `${GTFS_DIR}/static/laregional`,
    },
    {
      agency_key: 'LINECAR',
      path: `${GTFS_DIR}/static/linecar`,
    },
  ],
  staticUrl: 'http://212.170.201.204:50080/GTFSRTapi/api/GTFSFile',
  ignoreDuplicates: true,
};

module.exports = config;
