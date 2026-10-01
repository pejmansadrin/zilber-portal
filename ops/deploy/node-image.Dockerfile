FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS vips
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    build-essential pkg-config meson ninja-build python3 ca-certificates \
    libglib2.0-dev libexpat1-dev libjpeg62-turbo-dev libpng-dev libwebp-dev \
    librsvg2-dev libexif-dev libtiff-dev liblcms2-dev liborc-0.4-dev \
    && rm -rf /var/lib/apt/lists/*
COPY vips-8.18.6.tar.xz /tmp/vips.tar.xz
RUN echo '3c41e1d5458081bfa4a5bc54e116c46259c75c6760a18027764555632b9dda3e  /tmp/vips.tar.xz' | sha256sum -c - \
    && mkdir /tmp/vips && tar -xf /tmp/vips.tar.xz -C /tmp/vips --strip-components=1 \
    && cd /tmp/vips && CFLAGS='-O2 -march=x86-64 -mtune=generic' CXXFLAGS='-O2 -march=x86-64 -mtune=generic' \
    meson setup build --prefix=/opt/vips --libdir=lib -Dintrospection=disabled -Dexamples=false -Dmodules=disabled \
    && meson compile -C build -j 2 && meson install -C build \
    && rm -rf /tmp/vips /tmp/vips.tar.xz
ENV PKG_CONFIG_PATH=/opt/vips/lib/pkgconfig LD_LIBRARY_PATH=/opt/vips/lib

FROM vips AS builder
RUN npm install --global --ignore-scripts --no-audit --no-fund node-addon-api@8.9.2 node-gyp@12.4.0
ENV NODE_PATH=/usr/local/lib/node_modules SHARP_FORCE_GLOBAL_LIBVIPS=1 npm_config_nodedir=/usr/local

FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    libglib2.0-0 libexpat1 libjpeg62-turbo libpng16-16 libwebp7 libwebpdemux2 libwebpmux3 \
    librsvg2-2 libexif12 libtiff6 liblcms2-2 liborc-0.4-0 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=vips /opt/vips /opt/vips
ENV LD_LIBRARY_PATH=/opt/vips/lib
