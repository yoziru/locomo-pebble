/* global module */
function distance(lat1, lon1, lat2, lon2, unit) {
  var radlat1 = Math.PI * lat1/180;
  var radlat2 = Math.PI * lat2/180;
  var theta = lon1 - lon2;
  var radtheta = Math.PI * theta/180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = dist * 180/Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit=="K") { dist = dist * 1.609344; }
  if (unit=="N") { dist = dist * 0.8684; }
  return dist;
}

var geo_success = function(pos, settings, renderMain) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  var distanceToHome = distance(pos.coords.latitude, pos.coords.longitude,
                                settings.station_home_lat, settings.station_home_lon, 'K');
  console.log('distance to home: ' + distanceToHome + 'km');
  var distanceToWork = distance(pos.coords.latitude, pos.coords.longitude,
                                settings.station_work_lat, settings.station_work_lon, 'K');
  console.log('distance to work: ' + distanceToWork + 'km');
  var curPositionHome = distanceToHome < distanceToWork;
  console.log('curLocationHome = ' + curPositionHome);
  
  var walkingDuration;
  // calculate minimum walking duration based on 5 km/h walking speed
  if (curPositionHome === true) {
    walkingDuration = distanceToHome / 5 * 60;
  } else {
    walkingDuration = distanceToWork / 5 * 60;
  }
  console.log('Walking duration = ' + walkingDuration + 'min');

  renderMain(settings, curPositionHome, walkingDuration);
};

var geo_error = function(err, settings, renderMain) {
  console.log('location error (' + err.code + '): ' + err.message);
  renderMain(settings, true, 0);
};

// Choose options about the data returned
var geo_options = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 10000
};

module.exports = {
  distance: distance,
  geo_success: geo_success,
  geo_error: geo_error,
  geo_options: geo_options
};
