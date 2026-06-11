FROM node:24-alpine AS build

RUN apk add --no-cache git
WORKDIR /app

COPY package*.json tsconfig*.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:24-alpine

RUN apk add --no-cache git
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/lib ./lib
COPY pipe/entrypoint.sh /pipe/entrypoint.sh

ENTRYPOINT ["sh", "/pipe/entrypoint.sh"]
