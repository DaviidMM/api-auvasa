# Cómo crear un nuevo GTFS para una nueva empresa de transporte

**Introducción**
---------------

¡Bienvenido/a! Este documento te guiará paso a paso para crear un archivo GTFS para una empresa de transportes. Un archivo GTFS es un formato estándar para compartir información de transporte público, lo que significa que puedes compartir la información de las rutas y horarios de los autobuses con la comunidad y permitir que los desarrolladores creen aplicaciones y herramientas para mejorar la experiencia del usuario.

**Requisitos previos**
--------------------

No necesitas ser un experto en tecnología para crear un archivo GTFS. Solo necesitas:

* Acceso a la información de las rutas y horarios de la empresa de autobuses
* Un poco de paciencia y atención al detalle
* Un editor de texto o una hoja de cálculo para crear los archivos GTFS

**Archivos necesarios**
----------------------

Un archivo GTFS está compuesto por varios archivos de texto separados por comas (CSV). A continuación, se explicará cada archivo y sus campos necesarios.

Puedes [ver ejemplo de archivos GTFS](/lib/gtfs/static/ecsa) en nuestro repositorio.


### agency.txt

En este archivo, se definen las agencias de transporte que operan los servicios de autobús.

| Campo | Descripción |
| --- | --- |
| `agency_id` | Un identificador único para la agencia (por ejemplo, "Agency1" o "Transporte Urbano") |
| `agency_name` | El nombre de la agencia (por ejemplo, "Transporte Urbano" o "Autobuses Municipales") |
| `agency_url` | La URL de la agencia (por ejemplo, "https://transporteurbanol.com") |
| `agency_timezone` | La zona horaria de la agencia (por ejemplo, "America/New_York" o "Europe/Madrid") |
| `agency_lang` | El idioma principal de la agencia (por ejemplo, "en" para inglés o "es" para español) |

Ejemplo de fila en `agency.txt`:
```
agency_id,agency_name,agency_url,agency_timezone,agency_lang
Agency1,Transporte Urbano,https://transporteurbanol.com,America/New_York,en
Agency2,Autobuses Municipales,https://autobusesmunicipales.com,Europe/Madrid,es
...
```
En este ejemplo, se definen dos agencias: la agencia "Agency1" se llama "Transporte Urbano", tiene una URL "https://transporteurbanol.com", se encuentra en la zona horaria "America/New_York" y su idioma principal es el inglés. La agencia "Agency2" se llama "Autobuses Municipales", tiene una URL "https://autobusesmunicipales.com", se encuentra en la zona horaria "Europe/Madrid" y su idioma principal es el español.

Es importante tener en cuenta que cada agencia debe tener un identificador único (`agency_id`) que se utilizará para relacionarla con los servicios de autobús definidos en otros archivos del feed GTFS.

### routes.txt

En este archivo, se definen las líneas de autobús.

| Campo | Descripción |
| --- | --- |
| `route_id` | Un identificador único para la línea (por ejemplo, "L1" o "Ruta1") |
| `agency_id` | El identificador de la empresa de autobuses (por ejemplo, "MiEmpresaDeAutobuses") |
| `route_short_name` | Un nombre corto para la línea (por ejemplo, "L1" o "Ruta 1") |
| `route_long_name` | Un nombre más descriptivo para la línea (por ejemplo, "Línea 1: Centro - Periferia") |
| `route_type` | El tipo de ruta (por ejemplo, 3 para autobús) |

Ejemplo de fila en `routes.txt`:
```
route_id,agency_id,route_short_name,route_long_name,route_type
L1,MiEmpresaDeAutobuses,L1,Línea 1: Centro - Periferia,3
```
### trips.txt

En este archivo, se definen los viajes que se realizan en cada línea.

| Campo | Descripción |
| --- | --- |
| `route_id` | El identificador de la línea que se definió en `routes.txt` |
| `service_id` | Un identificador de servicio que se puede repetir para varios viajes (por ejemplo, "ServicioDiario") |
| `trip_id` | Un identificador único para el viaje (por ejemplo, "T1") |
| `trip_headsign` | El destino que se indica en el bus (por ejemplo, "Centro") |
| `direction_id` | El sentido del viaje (0 para saliente, 1 para entrante) |
| `shape_id` | El identificador de la ruta que se definió en `shapes.txt` (si se utiliza) |

Ejemplo de fila en `trips.txt`:
```
route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
L1,ServicioDiario,T1,Centro,0,S1
```
### calendar.txt

En este archivo, se indica qué días tiene servicio cada viaje.

| Campo | Descripción |
| --- | --- |
| `service_id` | El identificador de servicio que se definió en `trips.txt` |
| `monday`, `tuesday`, ..., `sunday` | Un 1 si el servicio tiene servicio ese día, un 0 si no |

Ejemplo de fila en `calendar.txt`:
```
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
ServicioDiario,1,1,1,1,1,0,0
```
### stop_times.txt

En este archivo, se indica la secuencia de paradas y horarios para cada viaje.

| Campo | Descripción |
| --- | --- |
| `trip_id` | El identificador del viaje que se definió en `trips.txt` |
| `arrival_time` | La hora de llegada a la parada (en formato HH:MM:SS) |
| `departure_time` | La hora de salida de la parada (en formato HH:MM:SS) |
| `stop_id` | El identificador de la parada (que se definió en `stops.txt`) |
| `stop_sequence` | El número de secuencia de la parada en el viaje |

Ejemplo de fila en `stop_times.txt`:
```
trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,06:00:00,06:05:00,S1,1
T1,06:10:00,06:15:00,S2,2
T1,06:20:00,06:25:00,S3,3
```
### stops.txt

En este archivo, se definen las paradas con sus coordenadas geográficas.

| Campo | Descripción |
| --- | --- |
| `stop_id` | Un identificador único para la parada (por ejemplo, "S1") |
| `stop_name` | El nombre de la parada (por ejemplo, "Centro") |
| `stop_lat` | La latitud de la parada (en grados decimales) |
| `stop_lon` | La longitud de la parada (en grados decimales) |

Ejemplo de fila en `stops.txt`:
```
stop_id,stop_name,stop_lat,stop_lon
S1,Centro,37.7749,-122.4194
S2,Parque,37.7853,-122.4364
S3,Universidad,37.7957,-122.4573
```

### shapes.txt

En este archivo, se definen las rutas geográficas que siguen los autobuses. Cada fila en este archivo representa un punto en la ruta.

| Campo | Descripción |
| --- | --- |
| `shape_id` | Un identificador único para la ruta (por ejemplo, "S1" o "Ruta1") |
| `shape_pt_lat` | La latitud del punto en la ruta (en grados decimales) |
| `shape_pt_lon` | La longitud del punto en la ruta (en grados decimales) |
| `shape_pt_sequence` | El orden del punto en la ruta (un número entero que indica la posición del punto en la ruta) |

Ejemplo de fila en `shapes.txt`:
```
shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence
S1,37.7749,-122.4194,1
S1,37.7753,-122.4201,2
S1,37.7757,-122.4211,3
...
```
En este ejemplo, la ruta `S1` tiene tres puntos definidos: el primer punto está en la latitud 37.7749 y longitud -122.4194, el segundo punto está en la latitud 37.7753 y longitud -122.4201, y el tercer punto está en la latitud 37.7757 y longitud -122.4211. El orden de los puntos se indica en el campo `shape_pt_sequence`.

Es importante tener en cuenta que los puntos en la ruta deben estar ordenados en el sentido de la ruta, es decir, el punto 1 debe ser el primer punto en la ruta, el punto 2 debe ser el segundo punto, y así sucesivamente.

El archivo `shapes.txt` es opcional, pero es útil para proporcionar información adicional sobre la ruta que sigue el autobús. Si no se proporciona este archivo, se asumirá que la ruta es una línea recta entre los puntos de parada.

**Conclusión**
--------------

¡Felicidades Has creado un archivo GTFS completo para una empresa de autobuses. Ahora, puedes compartir este archivo con la comunidad y permitir que los desarrolladores creen aplicaciones y herramientas para mejorar la experiencia del usuario.

**Recursos adicionales**
-------------------------

* [GTFS Specification](https://gtfs.org/reference/static/) (en inglés): La documentación oficial del formato GTFS.
* [Punto de Acceso Nacionalde datos del transporte](https://nap.transportes.gob.es/): Un repositorio de archivos GTFS para diferentes sistemas de transporte público del Ministerior de Transporte de España.