const express = require("express");
const phin = require("phin");
const cheerio = require("cheerio");

const app = express();

//Configuraciones
app.set("port", process.env.PORT || 3000);
app.set("json spaces", 2);

app.get("/", (req, res) => {
  res.send(
    "Añade un número de parada y línea a la URL para continuar. Sintaxis: URL/<Nº parada>/<Línea>"
  );
});

app.get("/:parada", (req, res) => {
  res.status(400).json({
    error: "No se ha indicado línea",
  });
});

app.get("/:parada/:linea", async (req, res) => {
  const { parada, linea } = req.params;
  console.log("[🔎] Buscando: ");
  console.log({ parada, linea });
  const pageContent = await phin({
    url: `http://www.auvasa.es/parada.asp?codigo=${parada}`,
    parse: "string",
  }).then((res) => res.body);
  const $ = cheerio.load(pageContent);
  const buses = $(".table tbody tr")
    .toArray()
    .reduce((acc, bus) => {
      const celdas = $(bus).find("td");
      const destino = celdas.eq(3).text();
      const linea = celdas.eq(0).text();
      const tiempoRestante = celdas.eq(4).text();
      return [{ destino, linea, tiempoRestante }, ...acc];
    }, []);
  const bus = buses.filter((bus) => bus.linea === linea)[0];
  if (!bus)
    return res.status(404).json({
      error: `No se ha encontrado la línea ${linea} en la parada nº ${parada}`,
    });
  res.json(bus);
});

//Iniciando el servidor, escuchando...
app.listen(app.get("port"), () => {
  console.log(`Server listening on port ${app.get("port")}`);
});

// Export the Express API
module.exports = app;
