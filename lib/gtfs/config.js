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
  ],
  staticUrl: 'http://212.170.201.204:50080/GTFSRTapi/api/GTFSFile',
};

module.exports = config;
