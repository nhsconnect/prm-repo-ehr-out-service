FROM node:14.19.0-alpine AS builder

# install python and postgres native requirements
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

# Install sequelize postgress native dependencies so that libpq addon.node can be built under node_modules
RUN apk add --no-cache postgresql-dev g++ make

COPY package*.json /app/

WORKDIR /app

RUN npm ci --only=production

# production app image
FROM alpine:3.15

# take just node without npm (including npx) or yarn
COPY --from=builder /usr/local/bin/node /usr/local/bin

# take native-install node modules
COPY --from=builder /app /app

# install python and postgres native requirements (again, as per builder)
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


COPY build/                   /app/build
COPY database/                /app/database
COPY build/config/database.js /app/src/config/
COPY .sequelizerc             /app/

COPY scripts/run-server-with-db.sh /usr/bin/run-repo-to-gp-server
COPY scripts/load-api-keys.sh      /app/scripts/load-api-keys.sh

ENV NHS_ENVIRONMENT="" \
  SERVICE_URL="" \
  DATABASE_NAME="" \
  DATABASE_USER="" \
  DATABASE_PASSWORD="" \
  DATABASE_HOST="" \
  REPO_TO_GP_SKIP_MIGRATION=""

WORKDIR /app

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/run-repo-to-gp-server"]

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

USER node
