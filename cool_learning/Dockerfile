FROM nginx:1.27-alpine

ARG APP_VERSION=development

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -f /usr/share/nginx/html/nginx.conf && \
    sed -i -E "s|assets/js/app.js(\?v=[^\"']*)?|assets/js/app.js?v=${APP_VERSION}|g; s|assets/js/quiz.js(\?v=[^\"']*)?|assets/js/quiz.js?v=${APP_VERSION}|g; s|assets/js/admin.js(\?v=[^\"']*)?|assets/js/admin.js?v=${APP_VERSION}|g" \
      /usr/share/nginx/html/index.html /usr/share/nginx/html/english.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost/english.html || exit 1
