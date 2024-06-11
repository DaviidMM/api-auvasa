FROM node:21-slim
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
WORKDIR /usr/src/app
COPY ./ /usr/src/app/

# Crear el archivo .env desde .env.template si no se creó antes
RUN if [ ! -f .env ] || [ ! -s .env ]; then cp .env.template .env; fi

# Instalar python y otras dependencias
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential

# Instalar dependencias
RUN npm install

# Iniciar app
CMD npm start
