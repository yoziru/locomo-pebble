// initialize current UK timezone (because TransportAPI)
var bst = require("./bst");
var uk_timezone_str = "Z";
var uk_timezone_offset = 0 * 3600 * 1000;
if (bst.calculateState()) {
  console.log("BST in UK = " + bst.calculateState());
  uk_timezone_str = "+01:00";
  uk_timezone_offset = +1 * 3600 * 1000;
}

var date = (function() {

  return {
    parseTime: parseTime,
    dateTotimeString: dateTotimeString,
    subtractDates: subtractDates
  };

  function currentUKDate() {
    var d = new Date();
    var now_offset =  d.getTimezoneOffset() * 60 * 1000;
    return new Date(d.getTime() + now_offset + uk_timezone_offset);
  }

  function parseTime(timeString, request_time) {
    if (timeString === null) {
      return null;
    } else {
      var uk_date = currentUKDate();
      var timeISOString = (uk_date.toISOString().slice(0, 10) + 'T' + timeString + uk_timezone_str);
      var parsedDate = new Date(Date.parse(timeISOString));

      // add 1 day for after midnight hours
      if (parsedDate.getHours() < uk_date.getHours() && parsedDate.getHours() < 5) {
        parsedDate.setDate(uk_date.getDate() + 1);
      }

      return parsedDate;
    }
  }

  function dateTotimeString(d, format) {
    if (d === null) {
      return null;
    }
    if (d instanceof Date === false) {
      return d;
    }

    var hh = d.getHours();
    var mm = d.getMinutes();
    var ss = d.getSeconds();
    if (hh < 10) {
      hh = "0" + hh;
    }
    if (mm < 10) {
      mm = "0" + mm;
    }
    if (ss < 10) {
      ss = "0" + ss;
    }

    switch (format) {
      case 'HHMM':
        return hh + ":" + mm;
      case 'MMSS':
        return mm + ":" + ss;
      default:
        return hh + ":" + mm + ":" + ss;
    }
  }

  function subtractDates(date1, date2, delta) {
    if (date1 === null || date2 === null) {
      return null;
    }
    var timeDiff = date1 - date2;
    //console.log('calculated timeDiff = ' + timeDiff);

    switch (delta) {
      case 'day_floor':
        return Math.floor(timeDiff / (60 * 60 * 24 * 1000));
      case 'min_floor':
        return Math.floor(timeDiff / (60 * 1000));
      case 'min_ceil':
        return Math.ceil(timeDiff / (60 * 1000));
      case 'sec_floor':
        return Math.floor(timeDiff / 1000);
      default:
        return Math.floor(timeDiff);
    }
  }
}());

module.exports = date;
