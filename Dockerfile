FROM nginxinc/nginx-unprivileged:1.29-alpine

# COMMIT stamps the asset query string, so a deploy cannot pair new HTML with a
# cached old script. Same contract the gateway used while it embedded this UI.
ARG COMMIT=dev

COPY web/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/headers.conf deploy/nginx/proxy.conf /etc/nginx/snippets/

# The base image builds as the unprivileged user and /usr/share/nginx/html is
# root-owned, so the stamp needs one root step. The served process stays as-is.
USER root
RUN sed -i "s/{{ASSET_VERSION}}/${COMMIT}/g" /usr/share/nginx/html/index.html
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
