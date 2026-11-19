# Nusapeta demo

Interactive map for the Nusapeta routing and geocoding engines, served by
nginx with the API proxied to the gateway container.

    web/index.html      map page, {{ASSET_VERSION}} stamped at image build
    web/lab/index.html  raw API console for the same endpoints
    web/assets/         app.css, app.js, lab.css, lab.js, vendored Leaflet
    deploy/nginx.conf   static serving, API paths proxied to the gateway

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

## Route options and map tools

- `Opsi rute` holds the `avoid` checkboxes (toll, ferry, unpaved, motorway) and
  the `alt` count (0–3). Both are part of the URL state, so a link reproduces the
  request; unknown `avoid` keys from a hand-edited link are dropped.
- Alternatives come back as `alternatives[].points`, so switching between them
  never issues a second route request. The list starts with `Rute utama`, the
  route line and the metrics both follow the selected row, and the animation
  replays because the geometry is redrawn from the pick.
- `Rute alternatif` is hidden unless the response actually carries alternatives:
  the engine bans every edge already used, then drops any candidate overlapping
  the main route above 0.8, so a short or empty list is a real answer, not a
  failure.
- `Jalan terdekat` calls `/nearest` for point A, else B, else the map centre and
  lists the snapped candidates; a row recentres the map. `Area terjangkau` calls
  `/isochrone` for 10 or 15 minutes and reports the returned area and node count.
  A `422` clears the overlay, resets the select and shows the engine's reason, so
  an oversized area never leaves a stale polygon on the map.
- `Alamat dari koordinat` calls `/place/reverse` for the entered latitude and
  longitude and shows the nearest named feature with its administrative context.
  House numbers are never interpolated, so this is a feature name, not a postal
  address; `Jadikan A`/`Jadikan B` reuse the returned coordinates. The tool
  disables itself when the gateway has no `/place` bundle (`/place/healthz`).
- `/lab/` exposes the same endpoints as raw forms (`/route` with `via` and
  `format`, `/matrix`, `/nearest`, `/isochrone`, `/place/reverse`) and prints
  status, elapsed time and the JSON body.

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
  asset URL carries `?v=<commit>`. Every `*.html` gets the same stamp, so the lab
  page cannot pair new markup with a cached script either.
- `/route`, `/place/`, `/matrix`, `/nearest` and `/isochrone` are proxied
  unchanged. `CF-Connecting-IP` is forwarded, because the gateway rate limits per
  client and runs with `-trust-proxy`.
- `/lab/` is a second document, not a SPA route: `/lab` redirects to `/lab/`
  relatively (`absolute_redirect off`), and neither path falls back to
  `index.html`.
- `/healthz` answers for this container only. The gateway health lives in the
  engine deployment.

## License

MIT. Map data from OpenStreetMap, ODbL 1.0.
