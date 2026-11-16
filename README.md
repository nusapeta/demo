# Nusapeta demo

Interactive map for the Nusapeta routing and geocoding engines, served by
nginx with the API proxied to the gateway container.

    web/index.html      map page, {{ASSET_VERSION}} stamped at image build
    web/assets/         app.css, app.js, vendored Leaflet
    deploy/nginx.conf   static serving, /route and /place proxied to the gateway

Separate from the engine repository on purpose: the UI changes far more often
than the engine, and a UI deploy should not rebuild a 36.8 MB gateway image or
restart the routing processes.

## Origins

`demo.nusapeta.web.id` reaches this container because the tunnel ingress targets
`http://gateway:8080` and this service holds the `gateway` alias on
`1panel-network`. The API gateway answers `routeid-gateway:8080` on the same
network, so neither Cloudflare nor DNS needs to change to move the front end.

The gateway service is named `api` for this reason: compose adds a service's own
name as a network alias, and two containers answering to `gateway` would split
the ingress between a page and a JSON API at random.

## Build and run

    CM=$(git rev-parse --short HEAD)
    docker build --build-arg COMMIT="$CM" -t demo:local .
    docker run --rm -p 127.0.0.1:8098:8080 demo:local

Locally the proxy target `routeid-gateway` will not resolve, so route and
search calls fail; static rendering and `/healthz` still work.

## Deploy

    cd deploy
    CM=$(git rev-parse --short HEAD)
    COMMIT="$CM" docker compose up -d --build

The engine's gateway must be up as `routeid-gateway`, and both containers must
share `1panel-network`.

## Map styling

- Tiles are only `tile.openstreetmap.org` (CSP `img-src`). To keep the route the
  loudest layer, `.leaflet-tile` gets `image-rendering: pixelated` plus
  `saturate(1.45) contrast(1.12) brightness(1.02)` in CSS instead of a second
  tile provider; a 1 px scanline overlay on `.map-shell` finishes the 8-bit read.
- The route is drawn as a white casing and a `#d92f14` core; the core has
  `pathLength="1"` plus a 700 ms `stroke-dashoffset` animation so a new geometry
  is drawn once. `prefers-reduced-motion` removes it.
- Pins are lettered A (origin) and B (destination) to match the panel cards; only
  B uses `--orange` (`#c9331d`), because red is the single accent in the palette.
  A swap control sits between the cards: it exchanges both points and recomputes
  the route, so the direction of a one-way street can be checked without
  re-picking anchors.
- Theme is light only, deliberately: the available tile source is light, and a
  dark mode would need a second tile set or an inverted filter that destroys map
  labels. Revisit when a dark tile source is available.
- Interface copy is Indonesian while the landing page is English on purpose: the
  demo is for local map users, the landing page for open source readers.

## Contract

- `/` and `/assets/` are static; `/assets/` is immutable-cached because every
  asset URL carries `?v=<commit>`.
- `/route` and `/place/` are proxied unchanged. `CF-Connecting-IP` is forwarded,
  because the gateway rate limits per client and runs with `-trust-proxy`.
- `/healthz` answers for this container only. The gateway health lives in the
  engine deployment.

## License

MIT. Map data from OpenStreetMap, ODbL 1.0.
