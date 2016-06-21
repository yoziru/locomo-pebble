// includes
var MessageQueue = require('./libs/js-message-queue.min');
var bst = require('./libs/bst');
var date = require('./libs/date');
var geo = require('./libs/geo');
var http = require('./libs/http');
var api_token = require('./libs/key');

// Custom settings and variables
// var curPositionHome = true;
var debug = false;

// TransportAPI
var api_base = 'https://locomo.apphb.com';

// initialize current UK timezone (because TransportAPI)
var uk_timezone_str = "Z";
var uk_timezone_offset = 0;
if (bst.calculateState()) {
  console.log("BST in UK = " + bst.calculateState());
  uk_timezone_str = "+01:00";
  uk_timezone_offset = -60;
}
var settings = JSON.parse(localStorage.getItem("settings"));

// Construct URL
var constructUrl = function(settings, curPositionHome, debug) {
  // Construct fetch URL
  if (debug === true) {
    console.log('debug mode = true');
    return 'http://localhost:5000/transport/' + curPositionHome;
  } else {
    // Home to work or vise versa
    var station_from;
    var station_to;
    if (curPositionHome === true) {
      station_from = settings.station_home;
      station_to = settings.station_work;
    } else {
      station_from = settings.station_work;
      station_to = settings.station_home;
    }
    var endpoint = '/departures/' + station_from + '/to/' + station_to;
    var endpoint_params = ('?accessToken=' + api_token + '&expand=true');
    return api_base + endpoint + endpoint_params;
  }
};

function locationSuccess(coor) {
  console.log('lat= ' + coor.coords.latitude + ' lon= ' + coor.coords.longitude);
  var distanceToHome = geo.calculateCircleDistance(coor.coords.latitude, coor.coords.longitude,
    settings.station_home_lat, settings.station_home_lon, 'K');
  console.log('distance to home station: ' + Math.round(distanceToHome) + ' km');
  var distanceToWork = geo.calculateCircleDistance(coor.coords.latitude, coor.coords.longitude,
    settings.station_work_lat, settings.station_work_lon, 'K');
  console.log('distance to work station: ' + Math.round(distanceToWork) + ' km');
  var curPositionHome = distanceToHome < distanceToWork;
  console.log('curPositionHome = ' + curPositionHome);

  var walkingDuration;
  // calculate minimum walking duration based on 5 km/h walking speed
  var walkingSpeed = 5;
  if (curPositionHome === true) {
    walkingDuration = Math.floor(distanceToHome / walkingSpeed * 60);
  } else {
    walkingDuration = Math.floor(distanceToWork / walkingSpeed * 60);
  }
  console.log('Walking duration = ' + walkingDuration + ' min');

  // Construct URL
  var url = constructUrl(settings, curPositionHome, debug);
  console.log('Calling Transport API at ' + url);

  // Send request to OpenWeatherMap

  http.get(url, requestCallback.bind(this));

  function requestCallback(err, data) {
    if (err) {
      console.error("Error: " + err.message);
      switch (err.message) {
        case 'NOT_CONNECTED':
          console.error('sending not connected');
          MessageQueue.sendAppMessage({
            operation: 'ERROR',
            data: 'Not online'
          });
          return;
        case 'NO_DEPARTURES':
          console.error('no departures received');
          MessageQueue.sendAppMessage({
            operation: 'ERROR',
            data: 'No departures'
          });
          return;
        case 'REQUEST_TIMEOUT':
          console.error('request timed out');
          MessageQueue.sendAppMessage({
            operation: 'ERROR',
            data: 'Request timeout'
          });
          return;
        default:
          MessageQueue.sendAppMessage({
            operation: 'ERROR',
            data: 'Unknown HTTP error'
          });
          return;
      }
    }

    var origin_name = data.locationName;
    var request_time = new Date(data.generatedAt);
    var departures = data.trainServices;
    /*var departures = (data.trainServices
      // .filter(function(train) {return train.best_departure_estimate_mins > walkingDurationStore;})
      .sort(function(a, b) {
        return a.best_departure_estimate_mins - b.best_departure_estimate_mins;
      }));*/
    var responseData = [];
    responseData.push(departures.length);
    departures.forEach(function(departure) {
      /*jshint -W106*/
      var aimed_departure = date.parseTime(departure.std, request_time, uk_timezone_str);
      var expected_departure = aimed_departure;
      if (departure.etd != 'On time') {
        expected_departure = date.parseTime(departure.etd, request_time, uk_timezone_str);
      }
      var expected_arrival;
      try {
        expected_arrival = date.parseTime(departure.subsequentCallingPoints[0].callingPoint[0].st, request_time, uk_timezone_str);
      } catch (ex) {
        console.log('Error while parsing calling points: ' + ex);
        expected_arrival = '-';
      }
      var now = new Date();
      var delay_departure_mins = date.subtractDates(expected_departure, aimed_departure, 'min_ceil');
      var expected_departure_mins = date.subtractDates(expected_departure, now, 'min_floor');

      var platform = departure.platform;
      if (platform === null) {
        platform = '-';
      }
      responseData.push(expected_departure_mins);
      responseData.push(date.dateTotimeString(expected_departure, 'HHMM'));
      responseData.push(date.dateTotimeString(expected_arrival, 'HHMM'));
      responseData.push(departure.destination[0].locationName);
      responseData.push(platform);
      responseData.push(departure.etd);
      /*jshint +W106*/
    });
    MessageQueue.sendAppMessage({
      operation: 'DEPARTURES',
      data: responseData.join('|')
    });
  }
}

function locationError(err) {
  console.log("Error requesting location!");
  locationSuccess(null);
}

function getTransportData() {
  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    // Choose options about the data returned
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

// CONFIG
// Set a configurable with the open callback
var EncodeQueryData = function(data) {
  var ret = [];
  for (var d in data) {
    console.log(d, data[d]);
    ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
  }
  return ret.join("&");
};

var url = 'http://yoziru-desu.github.io/locomo-pebble/';
var generateConfigUrl = function(baseConfigUrl) {
  var generatedUrl;
  var settings = JSON.parse(localStorage.getItem("settings"));
  console.log(settings);
  if (!settings || settings.length === 0) {
    generatedUrl = baseConfigUrl;
  } else {
    generatedUrl = baseConfigUrl + '?' + EncodeQueryData(settings);
    console.log(generatedUrl);
  }

  return generatedUrl;
};

Pebble.addEventListener('showConfiguration', function() {
  Pebble.openURL(generateConfigUrl(url));
});

Pebble.addEventListener('webviewclosed', function(e) {
  // Decode the user's preferences
  try {
    settings = JSON.parse(decodeURIComponent(e.response));
    localStorage.clear();
    localStorage.setItem("settings", JSON.stringify(settings));
    console.log("Settings saved to localStorage");

    // Send to watchface
    MessageQueue.sendAppMessage({
      operation: 'CONFIG',
      data: settings
    });
    console.log('Config data sent successfully!');
  } catch (err) {
    if (!settings || settings.length === 0) {
      settings = null;
      console.log("No JSON response or received Cancel event");
    } else {
      console.log("Cancelled config page");
    }
  }

});

// Listen for when the watchface is opened
Pebble.addEventListener('ready',
  function(e) {
    console.log("PebbleKit JS ready!");

    if (!settings || settings.length === 0) {
      // Send to watchface
      MessageQueue.sendAppMessage({
        operation: 'ERROR',
        data: 'No config found. Please configure first.'
      });
    } else {
      // Get the initial weather
      getTransportData();
    }
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log("AppMessage received!");
    // Get the dictionary from the message
    var dict = e.payload;

    console.log('Got message: ' + JSON.stringify(dict));
    getTransportData();
  }
);
