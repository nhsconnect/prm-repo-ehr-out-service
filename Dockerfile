FROM node:23.9-alpine AS builder

COPY package*.json /app/

WORKDIR /app

RUN npm ci --omit=dev

# production app image
FROM alpine:3.15

# take just node without npm (including npx) or yarn
COPY --from=builder /usr/local/bin/node /usr/local/bin

# take native-install node modules
COPY --from=builder /app /app

RUN apk update && \
    apk add --no-cache bash tini && \
    rm -rf /var/cache/apk/*

RUN apk add --no-cache \
        python3 \
        py3-pip \
    && pip3 install --upgrade pip \
    && pip3 install \
        awscli \
    && rm -rf /var/cache/apk/*

COPY build/                   /app/build

COPY scripts/run-server.sh /usr/bin/run-ehr-out-service
COPY scripts/load-api-keys.sh      /app/scripts/load-api-keys.sh

ENV NHS_ENVIRONMENT="" \
  SERVICE_URL=""

WORKDIR /app

ARG UTILS_VERSION
RUN test -n "$UTILS_VERSION"
COPY utils/$UTILS_VERSION/run-with-redaction.sh ./utils/
COPY utils/$UTILS_VERSION/redactor              ./utils/

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/utils/run-with-redaction.sh", "/usr/bin/run-ehr-out-service"]

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

USER node
