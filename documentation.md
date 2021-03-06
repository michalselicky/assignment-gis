# Application overview

This application shows historical object on a map near user marker. After showing this objects, user is able to see a route plan to visit them all effectively. Also user can see near the route some optional points of interest such as pubs, restaurants, cafes and ATMs. Most important features are:
- search historical objects near user location by his coordinates and radius in metres
- remove some historical objects which user doesn't want to visit
- route query to visit all there historical objects on map showing user friendly labeled route
- search optional points of interest checked by user near the road between historical objects

How does it look like:

![SmartRouter](screenshot.png)

The application has 2 separate parts, the client which is a frontend web application using mapboxGL API and mapbox-gl.js and the backend application written in JavaScript ([node.js](https://nodejs.org/en/)), backed by PostGIS. The frontend application communicates with backend via AJAX calls.

# Frontend

The frontend application is a static HTML page (`index.ejs`), which shows a mapbox-gl.js widget. It is displaying historical objects, routes and optional points of interest near route. I modified the style of map to display 3D buildings and `streets-v9` style for better routes visualisation.

All relevant frontend code displaying data from AJAX calls is in `assets/javascript/script.js` which is referenced from `index.ejs`, which contains some JavaScript code too. The frontend code responsibilities are:
- setting user marker (his location) on click
- removing historical objects from map on user's click
- displaying the sidebar panel with user radius input, optional points of interest checkboxes, legend for user and buttons for displaying historical objects and planning the route
- displaying geo features by overlaying the map with a geojson layer, the geojson is provided directly by backend APIs
-- routes are color separated, labeled with length in metres and numbered
-- points of interest are shown via symbols and name label

# Backend

The backend application is written in JavaScript (node.js, express.js) and is responsible for querying geo data, formatting the geojson and data for frontend.

## Data

All used data is coming directly from Open Street Maps, imported using the `osm2pgsql` and `osm2pgrouting` tools into the standard OSM schema in SRID 4326. Indexes on geometry columns (`way`) and (`the_geom`) were created by default in all tables. To speedup some queries I created an additional indices `additional_indices.sql`. All queries are placed in `postgres/queries.js` file. GeoJSON is generated by using a standard `st_asgeojson` function. The route queries are performed using `pgr_dijkstra` pgRouting function.

## Api

**Search historical objects (monuments and buildings) in radius of user coordinates**

`GET /search?lon=17.113736460359576&lat=48.14452073047403&radius=300&monuments_checked=true&buildings_checked=true`

**Plan route to visit all showed historical objects, also returning optional points of interest near route**

`GET /route?lon=17.1130927302128&lat=48.14486435453847&radius=100&places_to_visit_geojson%5B%5D=%7B%22type%22%3A%22Polygon%22%2C%22coordinates%22%3A%5B%5B%5B17.1120416%2C48.1446468%5D%2C%5B17.112118%2C48.144614%5D%2C%5B17.1122098%2C48.1446609%5D%2C%5B17.1122108%2C48.1447042%5D%2C%5B17.1121412%2C48.1447297%5D%2C%5B17.1120502%2C48.1446867%5D%2C%5B17.1120416%2C48.1446468%5D%5D%5D%7D&places_to_visit_geojson%5B%5D=%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B17.1131719%2C48.1454222%5D%7D&places_to_visit_geojson%5B%5D=%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B17.1132506%2C48.1447642%5D%7D&osm_ids%5B%5D=88357772&osm_ids%5B%5D=1801170745&osm_ids%5B%5D=5902471670&restaurant_checked=true&pub_checked=true&cafe_checked=true&atm_checked=true`

