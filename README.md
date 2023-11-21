# api-auvasa

API RESTful para devolver la información de paradas y líneas mostrada en la [web de auvasa](https://auvasa.es/).

## Consulta de la API en producción

Se puede consultar la API a través de la URL [https://api-auvasa.vercel.app/](https://api-auvasa.vercel.app/).

## Uso de la API

Para recuperar información se hará a través de una petición `GET` al servidor con los siguientes parámetros:

|   Nombre    | Obligatorio |                                          Descripción                                          |
| :---------: | :---------: | :-------------------------------------------------------------------------------------------: |
|   versión   |    `No`     |            Versión de la API a consultar. Si no se indica, por defecto es la `v1`.            |
| `numParada` |    `Sí`     |                                 Número de la parada a buscar                                  |
|   `linea`   |    `No`     | Número de línea a filtrar. Si se envía, solo se devolverán los tiempos para la línea indicada |

### Petición de parada

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

### Petición de una línea en una parada

Información de una línea en una parada.

```bash
curl -X GET https://api-auvasa.vercel.app/811/3
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
