const gbfsConfig = require('./config');
let GbfsPromise = import("./gbfsWrapper.mjs");

// Obtenemos la información de todas las paradas
const gbfsGetStops = async () => {
  try {
    // Check if the config is valid
    if (!gbfsConfig || !gbfsConfig.gbfsUrl) {
      throw new Error('Invalid configuration: gbfsUrl is missing');
    }

    // Import the Gbfs class
    const { Gbfs } = await GbfsPromise;

    // Create a new Gbfs instance with the auto-discovery url
    const gbfs = await Gbfs.initialize(gbfsConfig.gbfsUrl);

    // Fetch station data with a timeout
    const station_info_data = await Promise.race([
      gbfs.stationUnified(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);

    // Check if we got valid data
    if (!station_info_data) {
      throw new Error('Invalid or empty response from GBFS');
    }

    return station_info_data;
  } catch (error) {
    console.error('Error in gbfsGetStops:', error.message);
    return null; // Return null if error
  }
};

module.exports = {
  gbfsGetStops,
};