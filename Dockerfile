FROM node:12.14.0-alpine

RUN apk update && \
    apk add --no-cache bash tini && \
    rm -rf /var/cache/apk/*

# Migration script
COPY scripts/run-server-with-db.sh /usr/bin/run-repo-to-gp-server

ENV NHS_ENVIRONMENT="" \
  SERVICE_URL="" \
  DATABASE_NAME="" \
  DATABASE_USER="" \
  DATABASE_PASSWORD="" \
  DATABASE_HOST="" \
  REPO_TO_GP_SKIP_MIGRATION=false \
  AUTHORIZATION_KEYS=""

WORKDIR /app
COPY package*.json /app/
COPY build/ /app/build
COPY database/      /app/database
COPY build/config/database.js /app/src/config/
COPY .sequelizerc   /app/

RUN npm install

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/run-repo-to-gp-server"]
