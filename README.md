# api-auvasa

API RESTful para devolver la información de paradas y líneas mostrada en la [web de auvasa](https://auvasa.es/).

## Consulta de la API en producción

Se puede consultar la API a través de la URL [https://api-auvasa.vercel.app/](https://api-auvasa.vercel.app/).

## Documentación de la API

La documentación de la API se puede encontrar en la URL [https://api-auvasa.vercel.app/docs](https://api-auvasa.vercel.app/docs).

### Ejemplos de uso

#### Consulta de información de una parada

Información de las líneas que van a pasar por una parada.

```bash
curl -x GET https://api-auvasa.vercel.app/v1/811
```

Resultado:

```json
{
  "parada": {
    "nombre": "Plaza Cruz Verde 5",
    "numero": "811"
  },
  "buses": [
    {
      "destino": "LAS FLORES",
      "linea": "3",
      "tiempoRestante": 13,
      "esExacto": true
    },
    {
      "destino": "PZA.CIRCULAR",
      "linea": "18",
      "tiempoRestante": 12,
      "esExacto": true
    }
  ]
}
```

#### Consulta de una línea en una parada

Información de una línea en una parada.

```bash
curl -X GET https://api-auvasa.vercel.app/v1/811/3
```

Resultado:

```json
{
  "parada": {
    "nombre": "Plaza Cruz Verde 5",
    "numero": "811"
  },
  "buses": [
    {
      "destino": "LAS FLORES",
      "linea": "3",
      "tiempoRestante": 13,
      "esExacto": true
    }
  ]
}
```

## Docker compose

Se ha añadido la posibilidad de ejecutar esta api en un contenedor docker con las dependencias necesarias. Para ejecutar la api en un contenedor docker se debe ejecutar el siguiente comando:

```bash
docker-compose up -d
```

Por defecto, la api se ejecuta en el puerto 5000 de `localhost`. Si es necesario hacer alguna modificación, habrá que editar el archivo `docker-compose.yml`.
