const GET = (url) =>
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const decoder = new TextDecoder('windows-1252');
      const text = decoder.decode(buffer);
      return text;
    });

const getParada = (parada) => {
  return GET(`http://www.auvasa.es/parada.asp?codigo=${parada}`);
};

module.exports = { GET, getParada };
