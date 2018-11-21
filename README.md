# General course assignment

Build a map-based application, which lets the user see geo-based data on a map and filter/search through it in a meaningfull way. Specify the details and build it in your language of choice. The application should have 3 components:

1. Custom-styled background map, ideally built with [mapbox](http://mapbox.com). Hard-core mode: you can also serve the map tiles yourself using [mapnik](http://mapnik.org/) or similar tool.
2. Local server with [PostGIS](http://postgis.net/) and an API layer that exposes data in a [geojson format](http://geojson.org/).
3. The user-facing application (web, android, ios, your choice..) which calls the API and lets the user see and navigate in the map and shows the geodata. You can (and should) use existing components, such as the Mapbox SDK, or [Leaflet](http://leafletjs.com/).

## Example projects

- Showing nearby landmarks as colored circles, each type of landmark has different circle color and the more interesting the landmark is, the bigger the circle. Landmarks are sorted in a sidebar by distance to the user. It is possible to filter only certain landmark types (e.g., castles).

- Showing bicykle roads on a map. The roads are color-coded based on the road difficulty. The user can see various lists which help her choose an appropriate road, e.g. roads that cross a river, roads that are nearby lakes, roads that pass through multiple countries, etc.

## Data sources

- [Open Street Maps](https://www.openstreetmap.org/)

## My project

Fill in (either in English, or in Slovak):

**Application description**: SmartRouter is tourist application which allows users to search historical objects, such as historical buildings and monuments, nearby their marker on map. When user clicks on route button, the effective path between historical objects and user displays. There is option for user to click optional points of interest, such as restaurants, ATMs and pubs, which are displayed near the path between historical objects.

**Data source**: OSM

**Technologies used**: PostGIS, pgRouting, node.js, express.js, Mapbox, Bootstrap, jQuery

## Setup
#### Prerequisities
1. Installed node.js [Download link](https://nodejs.org/en/download/)
2. PostgreSQL databse with PostGIS and pgRouting extension:
    `CREATE EXTENSION postgis;`
    `CREATE EXTENSION pgrouting;`
#### Steps
1. Clone this repository. Open cmd, navigate to cloned repository.
2. Run `npm install`
3. Run `npm start`
#### Data import

1. Download OSM data from [Open Street Maps](https://www.openstreetmap.org/)
2. Change extension of downloaded file to .osm file
3. Download and extract osm2pgsql from [here](https://wiki.openstreetmap.org/wiki/Osm2pgsql#Windows)
4. Open cmd, navigate to extracted folder, copy .osm file here
5. Run `osm2pgsql.exe -U postgres -W -H localhost -d <your_database_name> <your_osm_file> -l`
6. pgRouting is part of PostGIS. To import data for route queries, please follow this [documentation](https://github.com/pgRouting/osm2pgrouting/wiki/Documentation-for-osm2pgrouting-v2.2)