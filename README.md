# api-auvasa

API que devuelve la información de las líneas reportada en la [web de auvasa](https://auvasa.es/).

## Consulta de la API en producción

Se puede consultar la API a través de la URL [https://api-auvasa.vercel.app/](https://api-auvasa.vercel.app/).

## Uso de la API

Para recuperar información se hará a través de una petición `GET` al servidor. Por ejemplo, para solicitar información de la línea 3 en la parada número 811, la petición debe ir contra la URL `<servidor>/811/3`.

### Funciones

#### Información de las líneas que van a pasar por una parada

```bash
curl -x GET https://api-auvasa.vercel.app/<Nº parada>
curl -x GET https://api-auvasa.vercel.app/811
```

#### Información de una línea en una parada

```curl
curl -X GET https://api-auvasa.vercel.app/<Nº parada>/<Línea>
curl -X GET https://api-auvasa.vercel.app/811/3
```

## Despliegue

`npm install` sobre la raíz del proyecto para instalar dependencias.

`npm start` arranca el servidor en el puerto indicado.
