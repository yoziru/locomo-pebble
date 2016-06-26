// initialize current UK timezone (because TransportAPI)
var bst = require("./bst");
var ukTimezoneISOString = "Z";
var ukTimezoneOffset = 0 * 3600 * 1000;
if (bst.calculateState()) {
  console.log("BST in UK = " + bst.calculateState());
  ukTimezoneISOString = "+01:00";
  ukTimezoneOffset = +1 * 3600 * 1000;
}

Date.prototype.toISOStringLocal = function() {
  var yyyy = this.getFullYear();
  var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
  var dd = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
  return yyyy + "-" + mm + "-" + dd;
};

var date = (function() {

  return {
    parseTime: parseTime,
    dateTotimeString: dateTotimeString,
    subtractDates: subtractDates
  };

  function currentUKDate() {
    var d = new Date();
    var now_offset = d.getTimezoneOffset() * 60 * 1000;
    return new Date(d.getTime() + now_offset + ukTimezoneOffset);
  }

  function parseTime(timeString, request_time) {
    if (timeString === null) {
      return null;
    } else {
      var ukDate = currentUKDate();

      var timeISOString = (ukDate.toISOStringLocal() + 'T' + timeString + ukTimezoneISOString);
      var parsedDate = new Date(Date.parse(timeISOString));

      // add 1 day for after midnight hours
      if (parsedDate.getHours() + 1 < ukDate.getHours() && parsedDate.getHours() < 5) {
        parsedDate.setDate(ukDate.getDate() + 1);
      } else {
        parsedDate.setDate(ukDate.getDate());
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
