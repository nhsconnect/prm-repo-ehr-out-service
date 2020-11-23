FROM node:12.14.0-alpine

WORKDIR /app
COPY package*.json /app/
COPY build/ /app/build

RUN apk update && \
    apk add --no-cache bash tini && \
    rm -rf /var/cache/apk/*

ENV NODE_ENV="" \
  NHS_ENVIRONMENT="" \
  SERVICE_URL=""

EXPOSE 3000

COPY scripts/run-server.sh /usr/bin/run-repo-to-gp-server

RUN npm install

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/run-repo-to-gp-server"]
