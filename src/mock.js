/* global module */
var data = 
    {
      date: "2016-05-12",
      time_of_day: "00:35",
      request_time: "2016-05-12T00:35:54+01:00",
      station_name: "London Liverpool Street",
      station_code: "LST",
      departures: {
        all: [
          {
            mode: "train",
            service: "21381001",
            train_uid: "G50269",
            platform: "12",
            operator: "XR",
            aimed_departure_time: "01:55",
            aimed_arrival_time: null,
            aimed_pass_time: null,
            origin_name: "London Liverpool Street",
            source: "Network Rail",
            destination_name: "Shenfield",
            status: "STARTS HERE",
            expected_arrival_time: null,
            expected_departure_time: "01:55",
            best_arrival_estimate_mins: null,
            best_departure_estimate_mins: 92
          },
          {
            mode: "train",
            service: "21939001",
            train_uid: "L84455",
            platform: "11",
            operator: "LE",
            aimed_departure_time: "01:46",
            aimed_arrival_time: null,
            aimed_pass_time: null,
            origin_name: "London Liverpool Street",
            source: "Network Rail",
            destination_name: "Witham",
            status: "LATE",
            expected_arrival_time: null,
            expected_departure_time: "01:48",
            best_arrival_estimate_mins: null,
            best_departure_estimate_mins: 90
          },
          {
            mode: "train",
            service: "21943001",
            train_uid: "L84570",
            platform: "10",
            operator: "LE",
            aimed_departure_time: "01:50",
            aimed_arrival_time: null,
            aimed_pass_time: null,
            origin_name: "London Liverpool Street",
            source: "Network Rail",
            destination_name: "Southend Victoria",
            status: "STARTS HERE",
            expected_arrival_time: null,
            expected_departure_time: "01:50",
            best_arrival_estimate_mins: null,
            best_departure_estimate_mins: 91
          },
          {
            mode: "train",
            service: "21381001",
            train_uid: "G50269",
            platform: null,
            operator: "XR",
            aimed_departure_time: "01:55",
            aimed_arrival_time: null,
            aimed_pass_time: null,
            origin_name: "London Liverpool Street",
            source: "Network Rail",
            destination_name: "Shenfield",
            status: "CANCELLED",
            expected_arrival_time: null,
            expected_departure_time: null,
            best_arrival_estimate_mins: null,
            best_departure_estimate_mins: 99
          }
        ]
      }
    };

module.exports =  {
  data: data
};