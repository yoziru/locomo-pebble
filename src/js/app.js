// includes
var MessageQueue = require("./libs/js-message-queue.min");
var date = require("./libs/date");
var geo = require("./libs/geo");
var http = require("./libs/http");
var api_token = require("./libs/key");

// Custom settings and variables
var debug = false;
var patternTime = new RegExp("(([01][0-9]|2[0-3]):[0-5][0-9])");
var app_message_operation = "init";
var geoData = {
  "curPositionHome": true,
  "walkingDuration": 0
};
var switch_state = false;
var station_to;

// TransportAPI
var api_base = "https://locomo.apphb.com";
var settings = JSON.parse(localStorage.getItem("settings"));

// Construct URL
var constructUrl = function(settings, curPositionHome, debug) {
  // Construct fetch URL
  if (debug === true) {
    console.log("debug mode = true");
    return "http://localhost:5000/transport/" + curPositionHome;
  } else {
    // Home to work or vise versa
    var station_from = settings.station_home;
    station_to = settings.station_work;
    if (geoData.curPositionHome === false) {
      station_from = settings.station_work;
      station_to = settings.station_home;
    }

    if (switch_state === true) {
      var station_to_tmp = station_to;
      var station_from_tmp = station_from;
      station_from = station_to_tmp;
      station_to = station_from_tmp;
    }

    var endpoint = "/departures/" + station_from + "/to/" + station_to;
    var endpoint_params = ("?accessToken=" + api_token + "&expand=true");
    return api_base + endpoint + endpoint_params;
  }
};
var walkingDuration = 0;

function locationSuccess(coor) {
  if (app_message_operation == "init") {
    MessageQueue.sendAppMessage({
      group: "TRAIN",
      operation: "INFO",
      data: "Geolocation found"
    });
  }
  console.log("accuracy = " + coor.coords.accuracy);
  var accuracy_km = coor.coords.accuracy / 1000;
  //console.log("lat= " + coor.coords.latitude + " lon= " + coor.coords.longitude);
  var distanceToHome = geo.calculateCircleDistance(coor.coords.latitude, coor.coords.longitude,
    settings.station_home_lat, settings.station_home_lon, "K") - (accuracy_km);
  var distanceToWork = geo.calculateCircleDistance(coor.coords.latitude, coor.coords.longitude,
    settings.station_work_lat, settings.station_work_lon, "K") - (accuracy_km);
  console.log("distance to home station: " + Math.round(distanceToHome * 10) / 10 + " km");
  console.log("distance to work station: " + Math.round(distanceToWork * 10) / 10 + " km");
  var curPositionHome = distanceToHome < distanceToWork;
  console.log("curPositionHome = " + curPositionHome);

  // calculate minimum walking duration based on 5.6 km/h walking speed
  var walkingSpeed = 5.6;
  var curlocation_txt;
  if (curPositionHome === true) {
    walkingDuration = Math.floor(distanceToHome / walkingSpeed * 60);
    curlocation_txt = "Home to Work";
  } else {
    walkingDuration = Math.floor(distanceToWork / walkingSpeed * 60);
    curlocation_txt = "Work to Home";
  }
  if (app_message_operation == "init") {
    MessageQueue.sendAppMessage({
      group: "TRAIN",
      operation: "INFO",
      data: curlocation_txt
    });
  }
  // handle extreme low accuracy
  if (walkingDuration < 0) {
    walkingDuration = 0;
  }
  console.log("Walking duration = " + walkingDuration + " min");
  geoData = {
    "curPositionHome": curPositionHome,
    "walkingDuration": walkingDuration
  };

  fetchData(geoData);
}

function fetchData(geoData) {

  // Construct URL
  var url = constructUrl(settings, geoData.curPositionHome, debug);
  console.log("Calling Transport API at " + url);

  // Send request to API
  http.get(url, requestCallback.bind(this));

  if (app_message_operation == "init") {
    MessageQueue.sendAppMessage({
      group: "TRAIN",
      operation: "INFO",
      data: "Fetching data.."
    });
  }

  function requestCallback(err, data) {
    if (err) {
      console.error("Error: " + err.message);
      switch (err.message) {
        case "NOT_CONNECTED":
          console.error("sending not connected");
          MessageQueue.sendAppMessage({
            group: "TRAIN",
            operation: "ERROR",
            data: "Not online"
          });
          return;
        case "NO_DEPARTURES":
          console.error("no departures received");
          MessageQueue.sendAppMessage({
            group: "TRAIN",
            operation: "ERROR",
            data: "No departures"
          });
          return;
        case "REQUEST_TIMEOUT":
          console.error("request timed out");
          MessageQueue.sendAppMessage({
            group: "TRAIN",
            operation: "ERROR",
            data: "Request timeout"
          });
          return;
        default:
          MessageQueue.sendAppMessage({
            group: "TRAIN",
            operation: "ERROR",
            data: "Unknown HTTP error"
          });
          return;
      }
    }

    if (app_message_operation == "init") {
      MessageQueue.sendAppMessage({
        group: "TRAIN",
        operation: "INFO",
        data: "Processing data"
      });
    }

    //var origin_name = data.locationName;
    var request_time = new Date(data.generatedAt);
    //var departures = data.trainServices;
    var filter_offset = 1 * 60 * 1000; // offset filter by -1 minute

    data.trainServices.forEach(function(departure) {
      var estimatedDeparture = departure.std;
      if (patternTime.test(departure.etd)) {
        estimatedDeparture = departure.etd;
        departure.currentStatus = "Late";
      } else {
        departure.currentStatus = departure.etd;
      }
      departure.estimatedDeparture = estimatedDeparture;
    });

    var departures = (data.trainServices
      .filter(function(departure) {
        var aimedDeparture = date.parseTime(departure.estimatedDeparture);
        var now = new Date(new Date().getTime() - (filter_offset));
        var nowReachable = new Date(now.getTime() + (geoData.walkingDuration * 60 * 1000));
        var isCurrent = (aimedDeparture >= now);
        var isReachable = (aimedDeparture >= nowReachable);
        //return (isCurrent && isReachable);
        return (isCurrent);
      })
      .sort(function(a, b) {
        a_time = date.parseTime(a.estimatedDeparture);
        b_time = date.parseTime(b.estimatedDeparture);
        return a_time - b_time;
      })
    );

    console.log(departures.length + ' of ' + data.trainServices.length + ' raw departures left after filter');

    if (departures.length === 0) {
      var err_departures;
      if (data.trainServices.length === 0) {
        err_departures = "No departures";
      } else {
        err_departures = "No departures in reach";
      }
      MessageQueue.sendAppMessage({
        group: "TRAIN",
        operation: "ERROR",
        data: err_departures
      });
    } else {
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function(departure) {
        /*jshint -W106*/
        var aimed_departure = date.parseTime(departure.std);
        var expected_departure = date.parseTime(departure.estimatedDeparture);
        var status = departure.currentStatus;
        var delay = date.subtractDates(expected_departure, aimed_departure, "min_floor");
        if (delay > 0) {
          status = "+" + delay + " MIN LATE";
        } else if (delay < 0) {
          status = "-" + delay + " MIN EARLY";
        } else {
          status = status.toUpperCase();
        }

        var expected_arrival = "-";
        try {
          if (departure.subsequentCallingPoints === undefined || departure.subsequentCallingPoints.length <= 0) {
            console.log("subsequentCallingPoints is empty");
          } else {
            var callingPointProcessed = (departure.subsequentCallingPoints[0].callingPoint
              .filter(function(point) {
                return (point.crs == station_to);
              })
            );
            if (callingPointProcessed.length === 0) {
              console.log('calling point empty after filter');
            } else {
              //console.log('processing calling points : ' + callingPointProcessed.length + ' of ' + departure.subsequentCallingPoints[0].callingPoint.length + ' points remaining');
              var callingPointSt = callingPointProcessed[0].st;
              var callingPointEt = callingPointProcessed[0].et;
              if (patternTime.test(callingPointEt)) {
                expected_arrival = date.parseTime(callingPointEt);
              } else {
                expected_arrival = date.parseTime(callingPointSt);
              }
            }
          }
        } catch (ex) {
          console.log("Error while parsing calling points: " + ex);
        }
        var now = new Date();
        //var delay_departure_mins = date.subtractDates(expected_departure, aimed_departure, "min_ceil");
        var expected_departure_mins = date.subtractDates(expected_departure, now, "min_floor");

        var platform = departure.platform;
        if (platform === null) {
          platform = "-";
        }
        responseData.push(expected_departure_mins);
        responseData.push(date.dateTotimeString(expected_departure, "HHMM"));
        responseData.push(date.dateTotimeString(expected_arrival, "HHMM"));
        responseData.push(departure.destination[0].locationName);
        responseData.push(platform);
        responseData.push(status);
        /*jshint +W106*/
      });
      MessageQueue.sendAppMessage({
        group: "TRAIN",
        operation: "DEPARTURES",
        data: responseData.join("|")
      });
    }
  }
}

function locationError(err) {
  console.log("Error requesting location!");
  if (app_message_operation == "init") {
    MessageQueue.sendAppMessage({
      group: "TRAIN",
      operation: "INFO",
      data: "Geolocation not found"
    });
  }
  fetchData(geoData);
}

function getTransportData() {
  if (app_message_operation == "init") {
    MessageQueue.sendAppMessage({
      group: "TRAIN",
      operation: "INFO",
      data: "Traingulating geo.."
    });
  }
  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    // Choose options about the data returned
    {
      enableHighAccuracy: false,
      timeout: 1000,
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

var url = "http://yoziru-desu.github.io/locomo-pebble/";
var generateConfigUrl = function(baseConfigUrl) {
  var generatedUrl;
  var settings = JSON.parse(localStorage.getItem("settings"));
  console.log(settings);
  if (!settings || settings.length === 0) {
    generatedUrl = baseConfigUrl;
  } else {
    generatedUrl = baseConfigUrl + "?" + EncodeQueryData(settings);
    console.log(generatedUrl);
  }

  return generatedUrl;
};

Pebble.addEventListener("showConfiguration", function() {
  Pebble.openURL(generateConfigUrl(url));
});

Pebble.addEventListener("webviewclosed", function(e) {
  // Decode the user"s preferences
  try {
    settings = JSON.parse(decodeURIComponent(e.response));
    localStorage.clear();
    localStorage.setItem("settings", JSON.stringify(settings));
    console.log("Settings saved to localStorage");

    // Send to watchface
    MessageQueue.sendAppMessage({
      group: "TRAIN",
      operation: "CONFIG",
      data: settings
    });
    console.log("Config data sent successfully!");

    getTransportData();
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
Pebble.addEventListener("ready",
  function(e) {
    console.log("PebbleKit JS ready!");

    if (!settings || settings.length === 0) {
      // Send to watchface
      MessageQueue.sendAppMessage({
        group: "TRAIN",
        operation: "ERROR",
        data: "Configure to get started"
      });
    } else {
      // Get the initial data
      getTransportData();
    }
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener("appmessage",
  function(e) {
    console.log("AppMessage received!");
    // Get the dictionary from the message
    var dict = e.payload;
    app_message_operation = dict.operation;
    switch_state = dict.data === 'true';
    console.log("Got message: " + JSON.stringify(dict));
    getTransportData();
  }
);
