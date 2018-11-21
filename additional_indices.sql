
DROP INDEX index_planet_osm_point_on_amenity;
CREATE INDEX index_planet_osm_point_on_amenity ON planet_osm_point(amenity);

DROP INDEX index_planet_osm_point_on_historic;
CREATE INDEX index_planet_osm_point_on_historic ON planet_osm_point(historic,name);

DROP INDEX index_planet_osm_polygon_on_historic;
CREATE INDEX index_planet_osm_polygon_on_historic ON planet_osm_polygon(historic,name);

