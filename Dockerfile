FROM node:14.19.0-alpine

RUN apk update && \
    apk add --no-cache bash tini postgresql-client jq && \
    rm -rf /var/cache/apk/*

RUN apk add --no-cache \
        python3 \
        py3-pip \
    && pip3 install --upgrade pip \
    && pip3 install \
        awscli \
    && rm -rf /var/cache/apk/*

# Install sequelize postgress native dependencies
RUN apk add --no-cache postgresql-dev g++ make

COPY scripts/run-server-with-db.sh /usr/bin/run-repo-to-gp-server
COPY scripts/migrate-db.sh /app/scripts/migrate-db.sh
COPY scripts/load-api-keys.sh /app/scripts/load-api-keys.sh

ENV NHS_ENVIRONMENT="" \
  SERVICE_URL="" \
  DATABASE_NAME="" \
  DATABASE_USER="" \
  DATABASE_PASSWORD="" \
  DATABASE_HOST="" \
  REPO_TO_GP_SKIP_MIGRATION=""

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

# remove npm leaving node
RUN rm -rf /root/.npm /root/.cache \
    /usr/local/lib/node_modules/npm /usr/local/bin/npm

USER node
