//AJAX calls here
$(function(){
 $('#show').on('click', function(e){
     $('#checkbox-error').text("");
     if ($('div.custom-control.custom-checkbox.to-show :checkbox:checked').length < 1){
       $('#checkbox-error').text("Nevybrali ste žiadnu z horeuvedených možností");
       return;
     }
     unvisited = [" "];
     map.flyTo({center: [$('#coordinate_x').val(),$('#coordinate_y').val()],
                zoom: 24 - Math.log2($('#radius').val())});
     var parameters = {
      lon: $('#coordinate_x').val(),
      lat: $('#coordinate_y').val(),
      radius: $('#radius').val(),
      monuments_checked: $("#monuments").prop("checked"),
      buildings_checked: $("#buildings").prop("checked")
     };
     $.get( '/search', parameters, function(data) {
       data.forEach(extractJSON);
       if (map.getLayer('radius-border') !== undefined){
         map.removeLayer('radius-border');
       }
       if (map.getLayer('points_of_interest') !== undefined){
         map.removeLayer('points_of_interest');
       }
       if (map.getSource('poi') !== undefined){
         map.removeSource('poi');
       }

       map.addSource("poi", {
         "type": "geojson",
         "data": {
           "type": "FeatureCollection",
           "features": data
         }
       });
       map.addLayer({
           "id": "radius-border",
           "type": "fill",
           "source": "poi",
           "paint": {
               "fill-color": "#A4A4A4",
               "fill-opacity": 0.4
           },
           "filter": ["==", "$type", "Polygon"]
       });
       map.addLayer({
         "id": "points_of_interest",
         "type": "symbol",
         "source": "poi",
         "layout": {
             "symbol-z-order" : "source",
             "text-allow-overlap" : true,
             "icon-image": "{icon}-15",
             "text-field": "{title}",
             "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
             "text-offset": [0, 0.6],
             "text-anchor": "top",
             "text-size": 14
         },
         "filter": ['!in', 'title', " "]
       });
     });
 });

  $('#route').on('click', function(e){
    if (map.getSource('poi') === undefined){
      return;
    }
    pois = map.getSource('poi')._data.features.filter(item => !unvisited.includes(item.properties.title));
    if (pois.length < 1){
      return;
    }
    osm_ids = pois.map(item => item.properties.osm_id);
    pois.forEach(function(item, index, arr) {
       arr[index] = JSON.stringify(item.geometry);
     })
    var parameters = {
     lon: $('#coordinate_x').val(),
     lat: $('#coordinate_y').val(),
     radius: $('#radius').val(),
     places_to_visit_geojson: pois,
     osm_ids: osm_ids,
     restaurant_checked: $("#restaurants").prop("checked"),
     pub_checked: $("#pubs").prop("checked"),
     cafe_checked: $("#cafes").prop("checked"),
     atm_checked: $("#atms").prop("checked")
    };

    $("#loader").prop('hidden',false);
    $.get( '/route', parameters, function(data) {
      //color change
      data[0] = setRouteColorAndNumber(data[0]);
      //merge paths between points to one array for map draw
      merged = [].concat.apply([], data[0]);
      //transform data to suitable format for mapbox
      geojson_array = merged.map(item => ({geojson: item.geojson, properties: item.properties}));

      //final transform for mapbox layer
      geojson_array.forEach(extractRouteJSON);

      if (map.getLayer('lines') !== undefined){
        map.removeLayer('lines');
      }

      if (map.getLayer('lines_labels') !== undefined){
        map.removeLayer('lines_labels');
      }

      if (map.getSource('lines') !== undefined){
        map.removeSource('lines');
      }

      map.addSource("lines", {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": geojson_array
        }
      });

      map.addLayer({
        'id': 'lines',
        'type': 'line',
        'source': 'lines',
        'paint': {
            'line-width': 3,
            'line-opacity': 0.5,
            'line-color': ['get', 'color']
        }
      });

      map.addLayer({
          'id': 'lines_labels',
          'type': 'symbol',
          'source': 'lines',
          'layout': {
              'symbol-placement': "line",
              'text-font': ["Open Sans Regular"],
              'text-field': '{number}\n{length}m',
              'text-size': 16
          },
          'paint': {
            'text-color': {
              'type': 'identity', 'property': 'color'
            }
          }
      });

      if (data[1] === null){
        //nothing
      } else {
        //replace pub => bar, atm => bank due to icons
        for (var i = 0; i < data[1].length; i++){
          if (data[1][i].amenity === 'atm'){
            data[1][i].amenity = 'bank'
          }
          if (data[1][i].amenity === 'pub'){
            data[1][i].amenity = 'bar'
          }
        }
        data[1].forEach(extractOptPOIJSON);
      }

      if (map.getLayer('points_of_interest_optional') !== undefined){
        map.removeLayer('points_of_interest_optional');
      }

      if (map.getSource('poi_optional') !== undefined){
        map.removeSource('poi_optional');
      }

      map.addSource("poi_optional", {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": data[1]
        }
      });

      map.addLayer({
        "id": "points_of_interest_optional",
        "type": "symbol",
        "source": "poi_optional",
        "layout": {
            "icon-image": "{icon}-11",
            "text-field": "{title}",
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [0, 0.6],
            "text-anchor": "top",
            "text-size": 12
        }
      });

      $("#loader").prop('hidden',true);
    });

  });

  function extractJSON(item,index,arr) {
    parsed_geojson = JSON.parse(item.st_asgeojson)
    arr[index] = {type: "Feature", properties: {title: (item.name ? item.name : " "),
                                                icon: (parsed_geojson.type === "Point"? "monument" : "town-hall"),
                                                selected: true,
                                                osm_id: item.osm_id} ,geometry: parsed_geojson};
  }

  function extractRouteJSON(item,index,arr) {
    arr[index] = {type: "Feature", properties: item.properties, geometry: JSON.parse(item.geojson)};
  }

  function setRouteColorAndNumber(data){
    for (i = 0; i < data.length; i++){
      if (i % 2 == 0){
        col = '#F7455D';
      }
      else {
        col = '#4264FB';
      }
      for (j = 0; j < data[i].length; j++){
        data[i][j].properties = {};
        data[i][j].properties.color = col;
        data[i][j].properties.number = i + 1;
        data[i][j].properties.length = Math.round(data[i][j].sum);
      }
    }
    return data
  }

  function extractOptPOIJSON(item, index,arr){
      arr[index] = {type: "Feature", properties: {title: (item.name ? item.name : item.operator),
                                                  icon: item.amenity,
                                                  }, geometry: JSON.parse(item.geojson)};
  }

});
