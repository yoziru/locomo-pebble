/* global Pebble */
/* exported http */

var http = (function() {

  return {
    get: get
  };

  function get(url, callback) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.setRequestHeader('X-Pebble-ID', Pebble.getAccountToken());
    req.onload = function() {
      if (req.readyState === 4 && req.status === 200) {
        if (req.status === 200) {
          try {
            var response = JSON.parse(req.responseText);
            if (response.trainServices !== null) {
              return callback(null, response);
            } else {
              return callback(new Error('NO_DEPARTURES'));
            }
          } catch (ex) {
            return callback(ex);
          }
        }
      } else {
        return callback(new Error(req.status));
      }
    };
    req.onerror = function() {
      switch (req.status) {
        case 0:
          return callback(new Error('NOT_CONNECTED'));
        case 404:
          return callback(new Error('NOT_FOUND'));
        default:
          return callback(new Error('UNKNOWN_ERROR_' + req.status));
      }
    };
    req.ontimeout = function() {
      console.error('Request timed out!');
      console.log(req.status);
      return callback(new Error('REQUEST_TIMEOUT'));
    };
    req.send();

    function serialize(obj) {
      var str = [];
      for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
        }
      }
      return str.join('&');
    }
  }

}());

module.exports = http;
