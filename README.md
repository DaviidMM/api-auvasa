# api-auvasa (VallaBus)

API RESTful para devolver la información de paradas y líneas de:

- [AUVASA](https://auvasa.es/), empresa municipal de transportes de Valladolid, España
- [ECSA](https://www.ecsa.es/), Empresa Cabrero S.A
- [La Regional](https://www.autocareslaregional.com/) Vallisoletana S.A
- [Linecar](https://www.linecar.es/) S.A

Usando los datos abiertos GTFS, revisa la sección [Licencia](#licencia) para más información sobre su reutilización.

## Configuración del entorno de desarrollo

Antes de ejecutar la aplicación, asegúrate de tener instalado [Node.js](https://nodejs.org/). También necesitarás configurar las variables de entorno en un archivo `.env` basado en el archivo `.env.example` proporcionado.

```
cp .env.template .env
```

**Importante:** Si no quieres hacer cambios al código y sólo desplegar en producción revisa [cómo ejecutarlo con Docker y Nginx](#despliegue-en-producción).

## Instalación de dependencias

Para instalar las dependencias necesarias para la aplicación, ejecuta el siguiente comando en la raíz del proyecto:

```
npm install
```

## Ejecución local

Para ejecutar la aplicación localmente, utiliza el siguiente comando:

```
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
      "parada": "Calle Cigüeña 21",
      "numeroParada": "634",
      "latitud": 41.6455079438975,
      "longitud": -4.71118544705553,
      "url": "http://www.auvasa.es/mapa-de-servicios/?parada=61",
      "datosFecha": null
    }
  ],
  "lineas": [
    {
      "linea": "3",
      "destino": "C. CONTIENDAS",
      "horarios": [
        {
          "trip_id": "L3A7_L3A4_14",
          "stop_sequence": 11,
          "llegada": "18:22:45",
          "tiempoRestante": -25,
          "destino": "C. CONTIENDAS",
          "fechaHoraLlegada": "2024-06-04T18:22:45+02:00"
        }
],
      "realtime": [
        {
          "trip_id": "L3A7_L3A4_14",
          "vehicleId": "73",
          "matricula": "4799GPN",
          "stop_sequence": 11,
          "desfase": -4,
          "latitud": 41.65528106689453,
          "longitud": -4.747669219970703,
          "velocidad": 7.5,
          "ocupacion": "MANY_SEATS_AVAILABLE",
          "propagated_delay": "true",
          "fechaHoraLlegada": "2024-06-04T18:26:41+02:00",
          "schedule_relationship": "SCHEDULED"
        }
      ]
    }
  ]
}
```

# Actualización automática de datos

La aplicación se actualiza automáticamente con los datos estáticos y en tiempo real de GTFS si están disponibles. Los tiempos de actualización se pueden definir en el archivo ``.env``.

## Documentación de la API

Puedes consultar todos los endpoints y parámetros del API accediendo a la documentación en:

``http://localhost:3000/api-docs``

## Actualización de archivos estáticos de GTFS en GitHub Pages

La carpeta [gtfs-files](/gtfs-files/) contiene una copia de los últimos archivos GTFS estáticos. Esta carpeta se actualiza en este repositorio automáticamente a través de un workflow de GitHub Actions que se ejecuta diariamente a las 6:40AM. Puedes ver el archivo de configuración del workflow en [.github/workflows/static.yml](.github/workflows/static.yml).

## Despliegue en producción

Se ha añadido la posibilidad de ejecutar esta api en un contenedor docker con las dependencias necesarias. 

Asegúrate de tener instalado [Docker](https://www.docker.com/).

Para ejecutar la api en un contenedor docker se debe ejecutar los siguientes comandos:

```bash
git clone https://github.com/VallaBus/api-auvasa.git
cd api-auvasa
docker compose up -d
```

Si quieres cambiar los parámetros de configuración deberás editar el archivo `.env` basado en el archivo `.env.example` antes de lanzar el contenedor.

Por defecto, la api se ejecuta en el puerto 3000 de `localhost`. Si es necesario hacer alguna modificación, habrá que editar el archivo `docker-compose.yml`.

### Actualizar la imagen a la última versión

Por defecto docker usará [la imagen apivallabus ya construida](https://hub.docker.com/r/vallabus/apivallabus), si en el futuro quieres bajar nuevas versiones de esta imagen puedes hacerlo con:

```bash
docker pull
```

Y reiniciar el contenedor

```bash
docker compose stop
docker compose up -d
```

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
	  # Nunca deberíamos responder por HTTP
    return 403;
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
   
    # Agrega el encabezado CORS para todas las ubicaciones
    add_header 'Access-Control-Allow-Origin' '*';
   
    # Cacheamos endpoints que no cambian mucho, como mucho 1 vez al día
    location /paradas/suprimidas/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 10m;
            proxy_set_header Cache-Control "max-age=600";
            add_header Cache-Control "max-age=600";
    }

    location /paradas/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 1h;
            proxy_set_header Cache-Control "max-age=3600";
            add_header Cache-Control "max-age=3600";
    }

    location /v2/paradas/suprimidas/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 10m;
            proxy_set_header Cache-Control "max-age=600";
            add_header Cache-Control "max-age=600";
    }
    
    location /v2/paradas/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 1h;
            proxy_set_header Cache-Control "max-age=3600";
            add_header Cache-Control "max-age=3600";
    }

    location /alertas/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 10m;
            proxy_set_header Cache-Control "max-age=600";
            add_header Cache-Control "max-age=600";
    }

   # Cacheamos ubicación del bus 10s y 15s en clientes
   location /v2/busPosition/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 10s;
            # add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
            # expires off;
            # proxy_no_cache 1;
            # proxy_cache_bypass 1;
	    proxy_set_header Cache-Control "max-age=15";
            add_header Cache-Control "max-age=15";
    }

   # Los geojson no deberían cambiar casi nunca, una vez al día como mucho
   location /v2/geojson/ {
            proxy_pass http://localhost:3000;
            proxy_cache my_cache;
            proxy_cache_valid 200 302 1h;
            proxy_set_header Cache-Control "max-age=3600";
            add_header Cache-Control "max-age=3600";
    }

    # El resto de la info debería actualizarse a menudo, cada 25s
    location / {
        proxy_pass http://localhost:3000/;
	      proxy_http_version 1.1;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Upgrade $http_upgrade;
	      proxy_cache my_cache;
        proxy_cache_valid 200 302 25s;
	      proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
	      proxy_set_header Cache-Control "max-age=25";
        add_header Cache-Control "max-age=25";
    }
}
```

## Desarrollo local con Docker

Si estas realizando cambios al código local y quieres verlos reflejados en el contenedor Docker deberás construir la imagen e iniciar el contendor usando la config que usa una imagen local:

```bash
docker-compose -f docker-compose-dev.yml build
docker-compose -f docker-compose-dev.yml up -d
```

Si haces cambios debes siempre re-construir el contendor

```bash
docker-compose -f docker-compose-dev.yml stop
docker-compose -f docker-compose-dev.yml build
docker-compose -f docker-compose-dev.yml up -d
```

Importante: No debes tener levantado el contenedor Docker normal porque ambos usan el puesto 3000, puedes modificar el archivo ``docker-compose-dev.yml`` si quieres que el entorno de desarrollo use otro puerto, por ejemplo el 4000:

```
ports:
      - 4000:3000
```

## Colaborar en el desarrollo

Las colaboraciones para mejorar el código son bienvenidas. Por favor, asegúrate de seguir las pautas de contribución y de abrir un issue antes de enviar un pull request.

Si deseas añadir la información de un nuevo municipio o empresa de transportes, deberás crear los archivos necesarios en formato GTFS. Revisa nuestra documentación sobre [cómo crear un nuevo GTFS para una nueva empresa de transporte](GTFS.md)

## Licencia

Este proyecto está licenciado bajo la [AGPL v3](LICENSE.md), los datos GTFS son:

- [AUVASA](https://www.auvasa.es/datos-abiertos/) - [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/es/)
- ECSA - Elaboración propia por VallaBus - [AGPL v3](LICENSE.md)
- La Regional - Elaboración propia por VallaBus - [AGPL v3](LICENSE.md)
- LineCar - Elaboración propia por VallaBus - [AGPL v3](LICENSE.md)
