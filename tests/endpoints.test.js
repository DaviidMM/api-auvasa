const { GenericContainer } = require("testcontainers");
const request = require("supertest");

describe("Endpoints Tests", () => {
 jest.setTimeout(30000); // Increase the timeout
 let container;
 let appUrl;

 beforeAll(async () => {
    try {
      container = await new GenericContainer("apiauvasa")
        .withExposedPorts(3000)
        .start();
      appUrl = `http://localhost:${container.getMappedPort(3000)}`;
    } catch (error) {
      console.error("Failed to start container:", error);
      throw error; // Rethrow the error to fail the test suite
    }
 });

 afterAll(async () => {
    if (container) {
      await container.stop();
    }
 });
 it("should respond with a valid home page", async () => {
    const response = await request(appUrl).get(`/`);
 });
 it("should respond with parada information for a valid stopCode", async () => {
    const stopCode = "999"; // Example stop code
    const response = await request(appUrl).get(`/v2/parada/${stopCode}`);
    expect(response.statusCode).toBe(200);
    // Check the structure of the response
    expect(response.body).toHaveProperty("parada");
    expect(response.body.parada).toBeInstanceOf(Array);
    expect(response.body.parada[0]).toHaveProperty("parada");
    expect(response.body.parada[0]).toHaveProperty("numeroParada");
    expect(response.body.parada[0]).toHaveProperty("latitud");
    expect(response.body.parada[0]).toHaveProperty("longitud");
    expect(response.body.parada[0]).toHaveProperty("url");
    expect(response.body.parada[0]).toHaveProperty("datosFecha");
    // Check the structure of the 'lineas' property
    expect(response.body).toHaveProperty("lineas");
    expect(response.body.lineas).toBeInstanceOf(Array);
    expect(response.body.lineas[0]).toHaveProperty("linea");
    expect(response.body.lineas[0]).toHaveProperty("destino");
    expect(response.body.lineas[0]).toHaveProperty("horarios");
    expect(response.body.lineas[0].horarios).toBeInstanceOf(Array);
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("trip_id");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("llegada");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("tiempoRestante");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("destino");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("fechaHoraLlegada");
    expect(response.body.lineas[0].realtime).toBeInstanceOf(Array);
    // Add more assertions based on the expected response structure
 });
 it("should respond with parada information for a valid stopCode and lineNumber", async () => {
    const stopCode = "999"; // Example stop code
    const lineNumber = "1";
    const response = await request(appUrl).get(`/v2/parada/${stopCode}/${lineNumber}`);
    expect(response.statusCode).toBe(200);
    // Check the structure of the response
    expect(response.body).toHaveProperty("parada");
    expect(response.body.parada).toBeInstanceOf(Array);
    expect(response.body.parada[0]).toHaveProperty("parada");
    expect(response.body.parada[0]).toHaveProperty("numeroParada");
    expect(response.body.parada[0]).toHaveProperty("latitud");
    expect(response.body.parada[0]).toHaveProperty("longitud");
    expect(response.body.parada[0]).toHaveProperty("url");
    expect(response.body.parada[0]).toHaveProperty("datosFecha");
    // Check the structure of the 'lineas' property
    expect(response.body).toHaveProperty("lineas");
    expect(response.body.lineas).toBeInstanceOf(Array);
    expect(response.body.lineas[0]).toHaveProperty("linea");
    expect(response.body.lineas[0]).toHaveProperty("destino");
    expect(response.body.lineas[0]).toHaveProperty("horarios");
    expect(response.body.lineas[0].horarios).toBeInstanceOf(Array);
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("trip_id");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("llegada");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("tiempoRestante");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("destino");
    expect(response.body.lineas[0].horarios[0]).toHaveProperty("fechaHoraLlegada");
    expect(response.body.lineas[0].realtime).toBeInstanceOf(Array);
    // Add more assertions based on the expected response structure
 });
 it("should respond with a list of paradas", async () => {
    const response = await request(appUrl).get("/v2/paradas/");
    expect(response.statusCode).toBe(200);
    // Check the structure of the response
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty("parada");
    expect(response.body[0].parada).toHaveProperty("nombre");
    expect(response.body[0].parada).toHaveProperty("numero");
    expect(response.body[0]).toHaveProperty("lineas");
    expect(response.body[0].lineas).toHaveProperty("ordinarias");
    expect(response.body[0].lineas.ordinarias).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty("ubicacion");
    expect(response.body[0].ubicacion).toHaveProperty("x");
    expect(response.body[0].ubicacion).toHaveProperty("y");
    // Add more assertions based on the expected response structure
 });
});