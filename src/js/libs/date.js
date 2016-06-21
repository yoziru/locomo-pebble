var date = (function() {

  return {
    parseTime: parseTime,
    dateTotimeString: dateTotimeString,
    subtractDates: subtractDates
  };

  function parseTime(timeString, request_time, uk_timezone_str) {
    if (timeString === null) {
      return null;
    } else {
      var requestDate = new Date(Date.parse(request_time));
      var requestUnixtime = requestDate.getTime();
      var uk_offset = +1 * 60 * 60 * 1000;
      requestUnixtime += uk_offset;
      var requestDateTz = new Date(requestUnixtime);
      var dateString = (requestDateTz.toISOString().slice(0, 10) + 'T' + timeString + uk_timezone_str);
      var timeDate = new Date(Date.parse(dateString));

      console.log(requestDate + ' ' + timeDate);
      console.log(requestDate.toISOString() + ' > ' + requestDateTz.toISOString());

      var offset = new Date().getTimezoneOffset();
      // Calculate hour difference to add day or not
      var timeUTCHours = timeDate.getUTCHours() - (offset / 60);
      if (timeUTCHours >= 24) {
        timeUTCHours = timeUTCHours - 24;
      }
      var requestUTCHours = requestDate.getUTCHours() - (offset / 60);
      if (requestUTCHours >= 24) {
        requestUTCHours = requestUTCHours - 24;
        requestDate.setDate(requestDate.getUTCDate() + 1);
      }
      if (timeUTCHours < requestUTCHours) {
        timeDate.setDate(requestDate.getUTCDate() + 1);
      }
      return timeDate;
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
