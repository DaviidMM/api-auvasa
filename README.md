# api-auvasa

API RESTful para devolver la información de paradas y líneas mostrada en la [web de auvasa](https://auvasa.es/).

## Configuración del entorno

Antes de ejecutar la aplicación, asegúrate de tener instalado [Node.js](https://nodejs.org/) y [Docker](https://www.docker.com/). También necesitarás configurar las variables de entorno en un archivo `.env` basado en el archivo `.env.example` proporcionado.

## Instalación de dependencias

Para instalar las dependencias necesarias para la aplicación, ejecuta el siguiente comando en la raíz del proyecto:


```
npm install

```

## Ejecución local

Para ejecutar la aplicación localmente, utiliza el siguiente comando:

```
npm run gtfsImport
npm start
```

La aplicación estará disponible en `http://localhost:3000`.

#### Consulta de una línea en una parada

Información de una línea en una parada.

```bash
curl -X GET http://localhost:3000/v2/parada/811/3
```

Resultado:

```json
{
  "parada": [
    {
      "parada": "Plaza Cruz Verde 5",
      "numeroParada": "811",
      "latitud": 41.6481013731797,
      "longitud": -4.71999806858758,
      "url": "http://www.auvasa.es/parada.asp?codigo=811"
    }
  ],
  "lineas": [
    {
      "linea": "3",
      "destino": "LAS FLORES",
      "horarios": [
        {
          "trip_id": "L3A5_L3A5_2",
          "llegada": "07:32",
          "tiempoRestante": -660,
          "destino": "LAS FLORES"
        }
],
      "realtime": [
        {
          "trip_id": "L3A5_L3A4_13",
          "llegada": "17:21",
          "tiempoRestante": -70,
          "desfase": 3,
          "latitud": null,
          "longitud": null,
          "velocidad": null
        }
      ]
    }
  ]
}
```

## Despliegue en producción

Se ha añadido la posibilidad de ejecutar esta api en un contenedor docker con las dependencias necesarias. Para ejecutar la api en un contenedor docker se debe ejecutar el siguiente comando:

```bash
docker compose up -d
```

Si se han bajado nuevos cambios, debemos siempre re-crear el contendor
```bash
docker compose up --build -d
```

Por defecto, la api se ejecuta en el puerto 5000 de `localhost`. Si es necesario hacer alguna modificación, habrá que editar el archivo `docker-compose.yml`.

# Actualización automática de datos en tiempo real

La aplicación se actualiza automáticamente con los datos en tiempo real de GTFS. Por defecto los datos GTFS estáticos se actualizan dos veces al día.

## Documentación de la API

En esta sección listamos los endpoints de la versión más modera del API, que use los datos abiertos GTFS de la web de [AUVASA](http://auvasa.es/auv_opendata.asp).

### Consulta el listado de paradas

Información de las líneas que van a pasar por una parada.

```
curl -X GET http://localhost:5000/v2/paradas/
```

### Consulta de información de una parada

Información de las líneas que van a pasar por una parada.

```
curl -X GET http://localhost:5000/v2/parada/811
```


### Consulta de una línea en una parada

Información de una línea en una parada.

```
curl -X GET http://localhost:5000/v2/parada/811/3
```


### Consulta de alertas

Para obtener las alertas activas, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:5000/alertas
```


### Consulta de posición de un autobús

Para obtener la posición de un autobús en tiempo real, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:5000/v2/busPosition/:tripId
```

Reemplaza `:tripId` con el ID del viaje del autobús que deseas consultar, por ejemplo `L4A2_L4A1_13`.

### Consulta de geojson de ubicación de paradas para un viaje

Para obtener el geojson de las paradas de un viaje, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:5000/v2/geojson/paradas/:tripId
```

Reemplaza `:tripId` con el ID del viaje del autobús que deseas consultar, por ejemplo `L4A2_L4A1_13`.

### Consulta de geojson de la ruta un viaje

Para obtener el geojson de un viaje, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:5000/v2/geojson/:tripId
```

Reemplaza `:tripId` con el ID del viaje del autobús que deseas consultar, por ejemplo `L4A2_L4A1_13`.

## Actualización de archivos estáticos de GTFS en GitHub Pages

La actualización de los archivos estáticos de GTFS se realiza automáticamente a través de un workflow de GitHub Actions que se ejecuta diariamente a las 7 AM. Puedes ver el archivo de configuración del workflow en [.github/workflows/static.yml](.github/workflows/static.yml).


## Contribuciones

Las contribuciones son bienvenidas. Por favor, asegúrate de seguir las pautas de contribución y de abrir un issue antes de enviar un pull request.

## Licencia

Este proyecto está licenciado bajo la [AGPL v3](LICENSE.md), los datos GTFS son proporcionados y son propiedad de [AUVASA](http://auvasa.es/auv_opendata.asp).
