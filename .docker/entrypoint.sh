#!/bin/sh

apt-get update
apt-get install -y curl

npm ci

npx playwright install --with-deps chromium firefox

npm run build

npm start
