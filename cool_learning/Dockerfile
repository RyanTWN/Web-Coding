FROM node:20-alpine AS build

WORKDIR /build

COPY package.json package-lock.json tailwind.config.js ./
RUN npm ci

COPY *.html ./
COPY assets ./assets

RUN npm run build:css

FROM nginx:1.27-alpine

ARG APP_VERSION=development

COPY . /usr/share/nginx/html
COPY --from=build /build/assets/css/tailwind.css /usr/share/nginx/html/assets/css/tailwind.css
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -f /usr/share/nginx/html/nginx.conf \
           /usr/share/nginx/html/package.json \
           /usr/share/nginx/html/package-lock.json \
           /usr/share/nginx/html/tailwind.config.js \
           /usr/share/nginx/html/assets/css/tailwind-input.css && \
    rm -rf /usr/share/nginx/html/node_modules && \
    sed -i -E "s|assets/js/app.js(\?v=[^\"']*)?|assets/js/app.js?v=${APP_VERSION}|g; s|assets/js/quiz.js(\?v=[^\"']*)?|assets/js/quiz.js?v=${APP_VERSION}|g; s|assets/js/admin.js(\?v=[^\"']*)?|assets/js/admin.js?v=${APP_VERSION}|g" \
      /usr/share/nginx/html/index.html /usr/share/nginx/html/english.html /usr/share/nginx/html/admin.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost/english.html || exit 1
