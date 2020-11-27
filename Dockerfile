FROM node:12.14.0-alpine

WORKDIR /app
COPY package*.json /app/
COPY build/ /app/build

RUN apk update && \
    apk add --no-cache bash tini && \
    rm -rf /var/cache/apk/*

ENV NHS_ENVIRONMENT="" \
  SERVICE_URL="" \
  DATABASE_NAME="" \
  DATABASE_USER="" \
  DATABASE_PASSWORD="" \
  DATABASE_HOST="" \
  REPO_TO_GP_SKIP_MIGRATION="" \
  AUTHORIZATION_KEYS=""

EXPOSE 3000

COPY scripts/run-server-with-db.sh /usr/bin/run-repo-to-gp-server

RUN npm install

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/run-repo-to-gp-server"]
