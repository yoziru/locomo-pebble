/* global module */
var ajax = require('ajax');
var Platform = require('platform');
var Feature = require('platform/feature');
var mock = require('mock');

var isRound = Feature.round();
if (isRound) {
  var uiMain = require('ui/main-round');
} else {
  var uiMain = require('ui/main');
}

var debugStore;
var intervalID;

// TransportAPI
var app_id = '03bf8009';
var app_key = 'd9307fd91b0247c607e098d5effedc97';
var api_base = 'http://transportapi.com/v3';

// Position
var pos = 0;
var curLocationHomeStore = true;
var walkingDurationStore = 0;
var settingsStore;
var dataJourneysStore;
var numberOfDepartures = 0;
var load_mode = "init";

// Main UI window and elements
var journeyWindow = uiMain.window;
var journeyElements = uiMain.elements;
console.log(journeyElements);
console.log(journeyElements.journeyTo);

// Handy functions
function valBetween(v, min, max) {
  return (Math.min(max, Math.max(min, v)));
}

function parseTime(timeStr, request_time) {
  if (timeStr === null) {return null;}
  var d = new Date(request_time);

  var currentHour = request_time.getHours();

  console.log('current hour is:' + currentHour);
  var time = timeStr.match(/(\d+)(?::(\d\d))?\s*(p?)/);
  d.setHours(parseInt(time[1]) + (time[3] ? 12 : 0));
  // -1 because input hours are UTC+1
  d.setMinutes(parseInt(time[2]) || 0 );

  console.log('parsed hour is:' + d.getHours());

  if (d.getHours() < currentHour) {
    // add a day
    d.setDate(d.getDate() + 1);
  }

  return d;
}

function secondsToTimeStr(seconds) {
  if (secondsToTimeStr === null) {return null;}

  var d = new Date(seconds * 1000);
  var hh = d.getUTCHours();
  var mm = d.getUTCMinutes();
  var ss = d.getSeconds();
  if (hh < 10) {hh = "0"+hh;}
  if (mm < 10) {mm = "0"+mm;}
  if (ss < 10) {ss = "0"+ss;}

  if (hh > 0) {
    return hh + "h" + mm;
  } else {
    return mm + ":" + ss;
  }
}

function dateToTimeStr(d, format) {  
  if (d === null) {return null;}
  if (d instanceof Date === false) {
    return d;
  }

  var hh = d.getHours();
  var mm = d.getMinutes();
  var ss = d.getSeconds();
  if (hh < 10) {hh = "0"+hh;}
  if (mm < 10) {mm = "0"+mm;}
  if (ss < 10) {ss = "0"+ss;}

  switch(format) {
    case 'HHMM':
      return hh + ":" + mm;
    case 'MMSS':
      return mm + ":" + ss;
    default:
      return hh + ":" + mm + ":" + ss;
  }
}

function subtractDates(date1, date2, delta) {
  if (date1 === null || date2 === null) {return null;}
  var timeDiff = date1 - date2;
  console.log('calculated timeDiff = ' + timeDiff);

  switch(delta) {
    case 'day_floor':
      return Math.floor(timeDiff / (60*60*24*1000));
    case 'min_floor':
      return Math.floor(timeDiff / (60*1000));
    case 'min_ceil':
      return Math.ceil(timeDiff / (60*1000));
    case 'sec_floor':
      return Math.floor(timeDiff / 1000);
    default:
      return Math.floor(timeDiff);
  }
}

function clickAnimation(element, y_delta) {
  var posElement = element.position();
  posElement.y -= y_delta;
  element.animate('position', posElement, 50);
  posElement.y += y_delta;
  element.animate('position', posElement, 10);
}

// Show info on first load
var journeyCard = uiMain.card;

// Construct URL
var constructUrl = function(settings, curLocationHome) {
  // Construct fetch URL

  // Home to work or vise versa
  var station_from;
  var station_to;
  if (curLocationHome === true){
    station_from = settings.station_home;
    station_to = settings.station_work;
  } else {
    station_from = settings.station_work;
    station_to = settings.station_home;
  }

  var endpoint = '/uk/train/station/' + station_from + '/live.json';
  var endpoint_params = ('?app_id=' + app_id +
                         '&app_key=' + app_key +
                         '&train_status=passenger' +
                         '&calling_at=' + station_to +
                         '&station_detail=calling_at');
  return api_base + endpoint + endpoint_params;
};

var updateView = function() {
  console.log('Parsing loaded data!');
  if (typeof dataJourneysStore == "undefined") {
    journeyCard.subtitle('Still loading..');
    journeyCard.show();
    return false;
  }

  if (debugStore === true) {
    dataJourneysStore = mock.data;
  }

  var trains = (dataJourneysStore.departures.all
                // .filter(function(train) {return train.best_departure_estimate_mins > walkingDurationStore;})
                .sort(function(a,b) {return a.best_departure_estimate_mins - b.best_departure_estimate_mins;}));


  // Reset view
  journeyElements.journeyFrom.text('From');
  journeyElements.journeyTo.text('to');
  journeyElements.journeyPlatform.text('-');
  journeyElements.journeyStatus.text('');
  journeyElements.journeyDeparture.text('');
  journeyElements.journeyDepartureTime.text('-');

  if (pos > 0) {
    journeyWindow.add(journeyElements.imageArrowUp);
    journeyWindow.remove(journeyElements.imageRefresh);
  } else {

    journeyWindow.remove(journeyElements.imageArrowUp);
    journeyWindow.add(journeyElements.imageRefresh);
  }

  if (pos + 1 === trains.length || trains.length === 0) {
    journeyWindow.remove(journeyElements.imageArrowDown);
    journeyWindow.remove(journeyElements.imageArrowDownRed);
  } else {
    journeyWindow.add(journeyElements.imageArrowDown);
  }

  // Parse AJAX data!
  numberOfDepartures = trains.length - 1;
  if (trains.length === 0) {
    journeyElements.journeyFrom.text('Error');
    journeyElements.journeyTo.text('No trains found at this hour');
    journeyElements.journeyStatus.text('No trains found');
    return false;
  }

  // Extract data
  var origin = dataJourneysStore.station_name;
  var request_time = new Date(dataJourneysStore.request_time);

  var aimed_departure = parseTime(trains[pos].aimed_departure_time, request_time);
  var expected_departure = parseTime(trains[pos].expected_departure_time, request_time);
  var expected_arrival = parseTime(trains[pos].station_detail.calling_at[0].aimed_arrival_time, request_time);
  if (expected_arrival === null) {
    expected_arrival = '-';
  }
  var now = new Date();
  var delay_departure_mins = subtractDates(expected_departure, aimed_departure, 'min_ceil');

  console.log('now = ' + now);
  console.log('expected_departure = ' + expected_departure);
  var expected_departure_mins = subtractDates(expected_departure, now, 'min_floor');

  var destination = trains[pos].destination_name;
  var platform = trains[pos].platform;
  var status = trains[pos].status;


  // Deal with missing data
  // Train is cancelled = no expected departure
  if (expected_departure === null) {
    expected_departure = aimed_departure;
  }
  if (expected_departure_mins === null) {
    journeyElements.journeyDepartureTime.text('-');
  } else if (expected_departure_mins <= 0) {
    journeyElements.journeyDepartureTime.text('now');
  } else {
    journeyElements.journeyDepartureTime.text(expected_departure_mins + ' min');
    intervalID = setInterval(
      function() {
        if (expected_departure_mins === null) {
          journeyElements.journeyDepartureTime.text('-');
          clearInterval(intervalID);
        }
        var now = new Date();
        expected_departure_mins = subtractDates(expected_departure, now, 'min_floor');

        if (expected_departure_mins < 0) {
          journeyElements.journeyDepartureTime.text('gone');
          clearInterval(intervalID);
        } else if (expected_departure_mins === 0) {
          journeyElements.journeyDepartureTime.text('now');
        } else {
          journeyElements.journeyDepartureTime.text(expected_departure_mins + ' min');
        }
      }, 10000 // update 10s
    );
  }

  // Sometimes, platform is not known
  if (platform === null) {
    platform = '-';
  }

  // Display data
  journeyElements.journeyFrom.text(origin);
  journeyElements.journeyTo.text('to ' + destination);
  journeyElements.journeyPlatform.text(platform);

  if (status == 'LATE' || status == 'CANCELLED') {
    journeyElements.journeyStatusBgAccent.backgroundColor(Feature.color('dark-candy-apple-red', 'black'));
    journeyElements.journeyStatus.color('white');
  } else {
    journeyElements.journeyStatusBgAccent.backgroundColor(Feature.color('baby-blue-eyes', 'white'));
    journeyElements.journeyStatus.color('black');
  }
  if (status == 'LATE' && delay_departure_mins > 0) {
    journeyElements.journeyStatus.text('+' + delay_departure_mins + ' min ' + status.toLowerCase());
  } else if (status == 'EARLY' && delay_departure_mins < 0) {
    journeyElements.journeyStatus.text(delay_departure_mins + ' min ' + status.toLowerCase());
  } else {
    journeyElements.journeyStatus.text(status);
  }

  var arrow_symbol;
  if (Platform.version() == 'aplite') {
    arrow_symbol = '>'
  } else {
    arrow_symbol = '\u2192'
  }
  journeyElements.journeyDeparture.text(dateToTimeStr(expected_departure, 'HHMM') +
                                        ' ' + arrow_symbol + ' ' +
                                        dateToTimeStr(expected_arrival, 'HHMM'));
};

var fetchTrains = function(settings, curLocationHome) {
  journeyCard.body('');

  if (load_mode === "switch") {
    journeyCard.subtitle('Switching mode');
  } else if (load_mode === "refresh") {
    journeyCard.subtitle('Refreshing data...');
  } else {
    journeyCard.subtitle('Loading data...');
  }
  if (curLocationHome === true) {
    journeyCard.body('Home to work');
  }
  else {
    journeyCard.body('Work to home');
  }
  journeyCard.show();


  if (! settings || settings.length === 0) {
    console.log("No settings found!");
  }
  var fetch_url = constructUrl(settings, curLocationHome);

  console.log(fetch_url);
  pos = 0;
  // Make the request
  ajax(
    {
      url: fetch_url,
      type: 'json',
      timeout: 5000  // sets timeout to 5 seconds
    },
    function(data) {
      // Success!
      console.log('Successfully loaded transport data!');
      dataJourneysStore = data;
      console.log(data.departures.all.length + ' departure(s) found');

      updateView();
      journeyWindow.show();
      journeyCard.hide();
      return true;
    },
    function(error) {
      // Failure!
      console.log('Failed fetching data: ' + error);
      journeyWindow.hide();
      journeyCard.show();

      // Show error to user
      journeyCard.subtitle('Failed fetching data');
      journeyCard.body('Press up to try again');
      journeyCard.on('click', 'up', function(e) {
        console.log('Retrying to fetch data after error');
        fetchTrains(settingsStore, curLocationHomeStore);
      });
      return false;
    }
  );
};

journeyWindow.on('longClick', 'up', function(e) {
  var newPosition = 0;
  if (pos - 1 < 0) {
    console.log('Refreshing data');
    load_mode = "refresh";
    clearInterval(intervalID);
    fetchTrains(settingsStore, curLocationHomeStore);
  } else if (newPosition != pos) {
    clickAnimation(journeyElements.imageArrowUp, 5);
    clearInterval(intervalID);
    console.log('Displaying previous train');
    pos = newPosition;
    updateView();
  }
});

journeyWindow.on('click', 'up', function(e) {
  var newPosition = valBetween(pos - 1, 0, numberOfDepartures);
  if (pos - 1 < 0) {
    console.log('Refreshing data');
    load_mode = "refresh";
    clearInterval(intervalID);
    fetchTrains(settingsStore, curLocationHomeStore);
  } else if (newPosition != pos) {
    clickAnimation(journeyElements.imageArrowUp, 5);
    clearInterval(intervalID);
    console.log('Displaying previous train');
    pos = newPosition;
    updateView();
  }  
});

journeyWindow.on('click', 'select', function(e) {
  clearInterval(intervalID);
  console.log('Switching stations');
  load_mode = "switch";

  curLocationHomeStore = !curLocationHomeStore;
  console.log(curLocationHomeStore);
  fetchTrains(settingsStore, curLocationHomeStore);
});

journeyWindow.on('click', 'down', function(e) {
  clickAnimation(journeyElements.imageArrowDown, -5);
  var newPosition = valBetween(pos + 1, 0, numberOfDepartures);
  if (newPosition != pos) {
    console.log('Displaying next train');
    clearInterval(intervalID);
    pos = newPosition;
    updateView();
  }
});

journeyWindow.on('longClick', 'down', function(e) {
  clickAnimation(journeyElements.imageArrowDown, -5);
  var newPosition = numberOfDepartures;
  if (newPosition != pos) {
    console.log('Displaying next train');
    clearInterval(intervalID);
    pos = newPosition;
    updateView();
  }
});

var renderView = function(settings, curLocationHome, walkingDuration, debug){
  // Render the journey
  console.log('Journey.js: rendering main UI');
  if (curLocationHome === true) {
    journeyCard.body('Home to work');
  }
  else {
    journeyCard.body('Work to home');
  }
  curLocationHomeStore = curLocationHome;
  walkingDurationStore = walkingDuration;
  debugStore = debug;
  settingsStore = settings;
  fetchTrains(settings, curLocationHome);
};

module.exports =  {
  renderView: renderView
};
