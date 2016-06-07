/* global module */
var UI = require('ui');
var Feature = require('platform/feature');
var Vector2 = require('vector2');
var res = Feature.resolution();

// Reusable card template
var card = new UI.Card({
  status: {
    color: 'white',
    backgroundColor: Feature.color('electric-ultramarine', 'black'),
    separator: 'none',
  },
  title: 'LOCOMO',
  icon: 'images/train.png',
  subtitle: 'Loading data..',
  subtitleColor: Feature.color('electric-ultramarine', 'black'),
  body: ''
});

// Main UI
var window = new UI.Window({
  status: {
    color: 'white',
    backgroundColor: Feature.color('electric-ultramarine', 'black'),
    separator: 'none'
  },
  size: Feature.resolution()
});

var journeyBg = new UI.Rect({
  backgroundColor: 'white',
  position: new Vector2(0, 0),
  size: Feature.resolution()
});

var journeyFrom = new UI.Text({
  text: 'From station',
  color: 'black',
  font: 'gothic-18-bold',
  position: new Vector2(4, 0),
  size: new Vector2(res.x - 8, 22),
  textOverflow: 'ellipsis',
  textAlign: 'left'
});

var journeyTo = new UI.Text({
  text: 'To station',
  color: 'black',
  font: 'gothic-14',
  position: new Vector2(4, 18),
  size: new Vector2(res.x - 8, 18),
  textOverflow: 'ellipsis',
  textAlign: 'left'
});

var journeyBgAccent = new UI.Rect({
  backgroundColor: Feature.color('electric-ultramarine', 'black'),
  position: new Vector2(0, 40),
  size: new Vector2(res.x, 56)
});

var journeyPlatformDsc = new UI.Text({
  text: 'PLATFORM',
  font: 'gothic-18',
  color: 'white',
  position: new Vector2(res.x / 2, 40),
  size: new Vector2(res.x / 2, 22),
  textAlign: 'center'
});

var journeyPlatform = new UI.Text({
  text: '-',
  font: 'gothic-28-bold',
  color: 'white',
  position: new Vector2(res.x / 2 , 60),
  size: new Vector2(res.x / 2, 30),
  textAlign: 'center'
});

var journeyDepartureTimeDsc = new UI.Text({
  text: 'TIME LEFT',
  font: 'gothic-18',
  color: 'white',
  position: new Vector2(0, 40),
  size: new Vector2(res.x / 2, 22),
  textAlign: 'center'

});
var journeyDepartureTime = new UI.Text({
  text: '- min',
  font: 'gothic-28-bold',
  color: 'white',
  position: new Vector2(0, 60),
  size: new Vector2(res.x / 2, 30),
  textAlign: 'center'
});

var journeyStatusBgAccent = new UI.Rect({
  backgroundColor: 'white',
  position: new Vector2(0, 96),
  size: new Vector2(res.x, 28)
});

var journeyStatus = new UI.Text({
  text: '',
  font: 'gothic-18',
  color: 'black',
  position: new Vector2(0, 98),
  size: new Vector2(res.x, 20),
  textAlign: 'center'
});


var journeyDeparture = new UI.Text({
  text: '',
  font: 'gothic-18',
  color: 'black',
  position: new Vector2(0, 124),
  size: new Vector2(res.x, 20),
  textAlign: 'center'
});

// Small button icons to show/hide when needed
var imageArrowUp = new UI.Image({
  position: new Vector2(126, 4),
  size: new Vector2(14, 14),
  backgroundColor: 'clear',
  image: 'images/arrow_up.png'
});

var imageArrowDown = new UI.Image({
  position: new Vector2(126, 134),
  size: new Vector2(14, 14),
  backgroundColor: 'clear',
  image: 'images/arrow_down.png'
});

var imageRefresh = new UI.Image({
  position: new Vector2(126, 4),
  size: new Vector2(14, 14),
  backgroundColor: 'clear',
  image: 'images/refresh.png'
});

// Compose main UI
window.add(journeyBg);
window.add(journeyBgAccent);
window.add(journeyStatusBgAccent);
window.add(journeyFrom);
window.add(journeyTo);
window.add(journeyPlatform);
window.add(journeyPlatformDsc);
window.add(journeyStatus);
window.add(journeyDeparture);
window.add(journeyDepartureTime);
window.add(journeyDepartureTimeDsc);

var elements = {
  'journeyBg': journeyBg,
  'journeyBgAccent': journeyBgAccent,
  'journeyStatusBgAccent': journeyStatusBgAccent,
  'journeyFrom': journeyFrom,
  'journeyTo': journeyTo,
  'journeyPlatform': journeyPlatform,
  'journeyPlatformDsc': journeyPlatformDsc,
  'journeyStatus': journeyStatus,
  'journeyDeparture': journeyDeparture,
  'journeyDepartureTime': journeyDepartureTime,
  'journeyDepartureTimeDsc': journeyDepartureTimeDsc,
  'imageArrowUp': imageArrowUp,
  'imageArrowDown': imageArrowDown,
  'imageRefresh': imageRefresh
};

module.exports = {
  card: card,
  window: window,
  elements: elements
};
