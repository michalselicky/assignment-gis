const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'gis-assignment',
  password: 'postgres',
  port: 5432,
});

client.connect();
console.log("Successfully connected to Postgres database");

// PostGIS queries below

//Searching:
async function search_in_radius_query(params){
  //search points in distance of "radius" parameter
  query_string_points = 'SELECT osm_id, name, ST_AsGeoJson(way) FROM planet_osm_point p ' +
                          'WHERE ST_DWithin(p.way::geography, ST_SetSRID(ST_Point($1,$2),4326)::geography, $3) ' +
                          'AND p.historic IS NOT null AND p.name IS NOT null ';
  query_string_polygons = 'SELECT osm_id, name, ST_AsGeoJson(way) FROM planet_osm_polygon p ' +
                            'WHERE ST_DWithin(p.way::geography, ST_SetSRID(ST_Point($1,$2),4326)::geography, $3) ' +
                            'AND p.historic IS NOT null AND p.name IS NOT null ';

  query_string = "";
  if (params.monuments_checked === 'true'){
    query_string += query_string_points;
    if (params.buildings_checked === 'true'){
      query_string += 'UNION ' + query_string_polygons;
    }
  }
  else {
    query_string += query_string_polygons;
  }

  points_of_interest_json = await perform_query(query_string, [params.lon, params.lat, params.radius]);
  //to visualise circle on map create buffer
  query_string = 'SELECT ST_AsGeoJson(ST_Buffer(ST_SetSRID(ST_Point($1,$2),4326)::geography, $3))';
  radius_circle_polygon_json = await perform_query(query_string, [params.lon, params.lat, params.radius]);

  //put all together to one array
  return points_of_interest_json.concat(radius_circle_polygon_json);
};

//Routing:
async function route_query(params){

    final_route = [];

    //search pairwise distance of user and each point of interest
    query_string = 'WITH tab1 AS (' +
                   'SELECT * FROM (VALUES (1, ST_SetSRID(ST_Point($1,$2),4326))';

    for (var i = 0; i < params.places_to_visit_geojson.length; i++){
      query_string += ',(' + params.osm_ids[i] + ',' +
                    'ST_SetSRID(ST_GeomFromGeoJSON(\'' + params.places_to_visit_geojson[i] + '\'),4326))'
    }

    query_string += ') AS temp_table(osm_id, st_transform)) ' +
                    'SELECT *, ST_DISTANCE(st_transform1, st_transform2) FROM (' +
                    'SELECT tab1.osm_id AS osm_id1, tab1.st_transform AS st_transform1, tab2.osm_id AS osm_id2, tab2.st_transform AS st_transform2 from tab1 ' +
                    'CROSS JOIN tab1 AS tab2 ' +
                    'WHERE tab1.osm_id <> tab2.osm_id) AS pairs';

    all_points_pairwise_distance = await perform_query(query_string, [params.lon, params.lat]);

    count = [...new Set(all_points_pairwise_distance.map(item => item.osm_id1))].length;

    //we start with user, find for him closest point
    result = all_points_pairwise_distance.filter(item => item.osm_id1 == '1').reduce(function(res, obj) {
      return (obj.st_distance < res.st_distance) ? obj : res;
    });

    for (var i = 0; i < count - 1; i++){
      //find closest ends/starts of roads nearest routing endpoints
      //radius helps us to perform queries more efficient
      source = await get_closest_road_end_id([result.st_transform1, params.radius]);
      target = await get_closest_road_end_id([result.st_transform2, params.radius]);

      dijkstra_result = await get_dijkstra_result([source,target])

      final_route.push(dijkstra_result)

      //remove visited place
      all_points_pairwise_distance = all_points_pairwise_distance.filter(e => e.osm_id1 !== result.osm_id1 && e.osm_id2 !== result.osm_id1);

      if (all_points_pairwise_distance.length > 0){
        result = all_points_pairwise_distance.filter(word => word.osm_id1 == result.osm_id2).reduce(function(res, obj) {
          return (obj.st_distance < res.st_distance) ? obj : res;
        });
      }
    }

    checked_opt_pois = Object.keys(params).filter(key => key.includes("checked"))
                        .filter(item => params[item] === 'true');

    if (checked_opt_pois.length < 1){
      //user did not check optional route POIs
      return [final_route, null];
    }

    //user checked optional POIs near route
    query_string = 'WITH route AS (' +
                   'SELECT ST_Buffer(the_geom::geography, 25, \'endcap=round join=round\') FROM (VALUES ';
    for (var i = 0; i < final_route.length; i++){
      for (var j = 0; j < final_route[i].length; j++){
        query_string += '(geometry(\''+ final_route[i][j].the_geom +'\')),'
      }
    }
    query_string = query_string.replace(/.$/,")");

    query_string += ' AS temp_table(the_geom)) ';

    query_string += 'SELECT DISTINCT ON(osm_id) amenity, name, operator, ST_AsGeoJson(way) AS geojson ' +
                    'FROM planet_osm_point p ' +
                    'JOIN route ON (ST_Intersects(p.way, route.st_buffer)) '+
                    'WHERE (p.name IS NOT null OR p.operator IS NOT null) '+
                    'AND p.amenity IN (';

    for (var i = 0; i < checked_opt_pois.length; i++){
      query_string += '\'' + checked_opt_pois[i].split("_")[0] + '\','
    }

    query_string = query_string.replace(/.$/,")")

    optional_pois = await perform_query(query_string, []);

    return [final_route, optional_pois];
}

async function get_closest_road_end_id(params){
  //find nearest road to point of interest / user marker
  query_string = 'SELECT *, ST_Distance(w.the_geom::geography, geometry($1)::geography) AS distance FROM ' +
                 '(SELECT * FROM ways ww WHERE ST_DWithin(ww.the_geom::geography, geometry($1)::geography, $2)) AS w ' +
                 'ORDER BY distance LIMIT 1';

  closest_road = await perform_query(query_string, params);

  //find source/target of the road and set it to source_id
  query_string = 'SELECT ST_Distance(geometry($1)::geography, ST_SetSRID(ST_Point($2,$3),4326)) AS source_dist, ' +
                 'ST_Distance(geometry($1)::geography, ST_SetSRID(ST_Point($4,$5),4326)) AS target_dist;';

  source_target =  await perform_query(query_string, [params[0]]
                              .concat([closest_road[0].x1, closest_road[0].y1, closest_road[0].x2, closest_road[0].y2]));

  if (source_target[0].source_dist < source_target[0].target_dist){
    source_id = closest_road[0].source;
  }
  else {
    source_id = closest_road[0].target;
  }
  return source_id;
}

async function get_dijkstra_result(params){

  query_string = 'SELECT name, length_m, the_geom, geojson, sum(length_m) OVER () FROM (SELECT *, ST_AsGeoJson(w.the_geom) AS geojson ' +
                 'FROM pgr_dijkstra(\'SELECT gid AS id, source, target, cost_s AS cost,reverse_cost_s AS reverse_cost FROM ways\', ' +
                    'CAST($1 AS Integer),CAST($2 AS Integer),true) AS d ' +
                 'JOIN ways w ON d.edge = w.gid ORDER BY d.path_seq) AS result';
  return await perform_query(query_string, params);
}

async function perform_query(query_string, params){
  return new Promise((resolve, reject) => {
    client.query(query_string, params, (err, res) => {
      if (err !== null) {
        console.log(err)
        reject(err);
      } else {
        resolve(res.rows);
      }
    });
  });
}

module.exports.search_in_radius_query = search_in_radius_query;
module.exports.route_query = route_query;
