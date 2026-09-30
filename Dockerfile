FROM node:26

WORKDIR /app

COPY .docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

VOLUME /app
VOLUME /app/node_modules

RUN npx playwright install --with-deps chromium firefox

ENTRYPOINT ["/entrypoint.sh"]
