# api-auvasa

API RESTful para devolver la información de paradas y líneas de [AUVASA](https://auvasa.es/), empresa municipal de transportes de Valladolid, España, usando los datos abiertos GTFS.

## Configuración del entorno de desarrollo

Antes de ejecutar la aplicación, asegúrate de tener instalado [Node.js](https://nodejs.org/). También necesitarás configurar las variables de entorno en un archivo `.env` basado en el archivo `.env.example` proporcionado.

Para desplegar en producción revisa [cómo ejecutarlo con Docker y Nginx](#despliegue-en-producción).

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

# Actualización automática de datos en tiempo real

La aplicación se actualiza automáticamente con los datos en tiempo real de GTFS. Por defecto los datos GTFS estáticos se actualizan dos veces al día.

## Documentación de la API

En esta sección listamos los endpoints de la versión más modera del API, que use los datos abiertos GTFS de la web de [AUVASA](http://auvasa.es/auv_opendata.asp).

### Consulta el listado de paradas

Información de las líneas que van a pasar por una parada.

```
curl -X GET http://localhost:3000/v2/paradas/
```

### Consulta de información de una parada

Información de las líneas que van a pasar por una parada.

```
curl -X GET http://localhost:3000/v2/parada/811
```


### Consulta de una línea en una parada

Información de una línea en una parada.

```
curl -X GET http://localhost:3000/v2/parada/811/3
```


### Consulta de alertas

Para obtener las alertas activas, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:3000/alertas
```


### Consulta de posición de un autobús

Para obtener la posición de un autobús en tiempo real, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:3000/v2/busPosition/:tripId
```

Reemplaza `:tripId` con el ID del viaje del autobús que deseas consultar, por ejemplo `L4A2_L4A1_13`.

### Consulta de geojson de ubicación de paradas para un viaje

Para obtener el geojson de las paradas de un viaje, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:3000/v2/geojson/paradas/:tripId
```

Reemplaza `:tripId` con el ID del viaje del autobús que deseas consultar, por ejemplo `L4A2_L4A1_13`.

### Consulta de geojson de la ruta un viaje

Para obtener el geojson de un viaje, utiliza el siguiente endpoint:

```
curl -X GET http://localhost:3000/v2/geojson/:tripId
```

Reemplaza `:tripId` con el ID del viaje del autobús que deseas consultar, por ejemplo `L4A2_L4A1_13`.

## Actualización de archivos estáticos de GTFS en GitHub Pages

La actualización de los archivos estáticos de GTFS se realiza automáticamente a través de un workflow de GitHub Actions que se ejecuta diariamente a las 7 AM. Puedes ver el archivo de configuración del workflow en [.github/workflows/static.yml](.github/workflows/static.yml).

## Despliegue en producción

Se ha añadido la posibilidad de ejecutar esta api en un contenedor docker con las dependencias necesarias. 

Aasegúrate de tener instalado [Docker](https://www.docker.com/). También necesitarás configurar las variables de entorno en un archivo `.env` basado en el archivo `.env.example` proporcionado.

Para ejecutar la api en un contenedor docker se debe ejecutar el siguiente comando:

```bash
docker compose up -d
```

Si se han bajado nuevos cambios, debemos siempre re-crear el contendor
```bash
docker compose up --build -d
```

Por defecto, la api se ejecuta en el puerto 3000 de `localhost`. Si es necesario hacer alguna modificación, habrá que editar el archivo `docker-compose.yml`.

### Servir el api con HTTPS via Nginx

Primero generamos un certificado para nuestro dominio

```
certbot certonly --standalone --preferred-challenges http -d api.yourdomain.com
```

Puedes usar la siguiente configuración para servir el api mediante conexión HTTPS en NGINX. Incluye algunas configuraciones recomendadas de caché de los endpoints.

```
server {
    listen 80;
    server_name api.yourdomain.com;

    access_log /var/log/nginx/api.yourdomain.com.access.log;
    error_log /var/log/nginx/api.yourdomain.com.error.log;
	  return 301 https://$host$request_uri;
}

server {
    listen 443;
    server_name api.yourdomain.com;

    access_log /var/log/nginx/api.yourdomain.com.access.log;
    error_log /var/log/nginx/api.yourdomain.com.error.log;

    ssl_certificate      /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key  /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/api.yourdomain.com/chain.pem;

    ## SSL options
    ssl_session_timeout 1d;
    # modern configuration. tweak to your needs.
    ssl_protocols TLSv1.2;
    ssl_prefer_server_ciphers off;

    # HSTS (ngx_http_headers_module is required) (15768000 seconds = 6 months)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options 'nosniff';
    add_header X-Frame-Options 'SAMEORIGIN';
    add_header X-XSS-Protection '1; mode=block';
    # OCSP Stapling ---
    # fetch OCSP records from URL in ssl_certificate and cache them
    ssl_stapling on;
    ssl_stapling_verify on;

    ## verify chain of trust of OCSP response using Root CA and Intermediate certs
    resolver 208.67.222.222 208.67.220.220;
   
    # Cacheamos endpoints que no cambian mucho, como mucho 1 vez al día
    location /v2/paradas/ {
        proxy_pass http://localhost:3000;
        proxy_cache my_cache;
        proxy_cache_valid 200 302 1h;
        proxy_set_header Cache-Control "max-age=3600";
    }
    location /alertas/ {
        proxy_pass http://localhost:3000;
        proxy_cache my_cache;
        proxy_cache_valid 200 302 1h;
        proxy_set_header Cache-Control "max-age=3600";
    }

   # La ubicación en tiempo real nunca se cachea
   location /v2/busPosition/ {
        proxy_pass http://localhost:3000;
        proxy_cache my_cache;
        proxy_cache_valid 200 302 10s;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        expires off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

   # Los geojson no deberían cambiar casi nunca, una vez al día como mucho
   location /v2/geojson/ {
        proxy_pass http://localhost:3000;
        proxy_cache my_cache;
        proxy_cache_valid 200 302 1h;
        proxy_set_header Cache-Control "max-age=3600";
    }

    # El resto de la info debería actualizarse a menudo, cada 20-30s
    location / {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Upgrade $http_upgrade;
        proxy_cache my_cache;
        proxy_cache_valid 200 302 25s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_set_header Cache-Control "max-age=25";
    }
}
```

## Colaborar en el desarrollo

Las colaboraciones para mejorar el código son bienvenidas. Por favor, asegúrate de seguir las pautas de contribución y de abrir un issue antes de enviar un pull request.

## Licencia

Este proyecto está licenciado bajo la [AGPL v3](LICENSE.md), los datos GTFS son proporcionados y son propiedad de [AUVASA](http://auvasa.es/auv_opendata.asp).
