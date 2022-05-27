# api-auvasa

API que devuelve la información reportada en la [web de auvasa](https://auvasa.es/).

## Despliegue

`npm install` sobre la raíz del proyecto para instalar dependencias.
`npm start` arranca el servidor en el puerto indicado.

Para recuperar información se hará a través de una petición `GET` al servidor. Por ejemplo, para solicitar información de la línea 3 en la parada número 811, la petición debe ir contra la URL `<servidor>/811/3`.
