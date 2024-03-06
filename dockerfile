FROM node:18.15.0
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
WORKDIR /usr/src/app
COPY ./ /usr/src/app/

# Crear el archivo .env desde .env.template si no se creó antes
RUN if [ ! -f .env ] || [ ! -s .env ]; then cp .env.template .env; fi

# Instalar dependencias
RUN npm install

# Importar GTFS
RUN npm run gtfsImport

# Iniciar Cron, generar lista de carreras y ejecutar el scrapper
CMD npm start
