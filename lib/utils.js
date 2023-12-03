require('dotenv').config();

const { GTFS_CACHE_EXPIRE } = process.env;

const NodeCache = require('node-cache');
// Establecer el TTL de la caché a 10 minutos por defecto
const gtfsCache = new NodeCache({ stdTTL: GTFS_CACHE_EXPIRE || 600 });

const checkCache = (key) => gtfsCache.has(key);
const storeInCache = (key, value) => gtfsCache.set(key, value);
const getCacheKeyTtl = (key) => Math.round(gtfsCache.getTtl(key) / 1000);
const getCacheKey = (key) => {
  return gtfsCache.get(key)
    ? {
        ...gtfsCache.get(key),
        ttl: getCacheKeyTtl(key),
      }
    : {};
};

const getAllCacheKeys = (filter) => {
  const keys = gtfsCache.keys();
  return keys
    .filter((key) => (filter ? key.includes(filter) : true))
    .reduce((acc, key) => ({ ...acc, [key]: getCacheKey(key) }), {});
};

// Compara dos objetos y devuelve true si son diferentes
// Excluye la propiedad ttl
const compareObjects = (a, b) => {
  return !Object.keys(a).every((key) => key === 'ttl' || a[key] === b[key]);
};

module.exports = {
  compareObjects,
  checkCache,
  environment: process.env,
  getAllCacheKeys,
  getCacheKey,
  storeInCache,
};
