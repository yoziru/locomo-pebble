/**
 * Locomo Commute app
 * By: Yasir Ekinci
 * <ekinci.yasir@gmail.com>
 * https://github.com/yoziru-desu/locomo-pebble
 */

// INCLUDE
var Settings = require('settings');
var config = require('config');
var journey = require('journey');
var geo = require('geo');
var uiInit = require('ui/init');

// Show config info on first run
var configureAppCard = uiInit.card;
var baseConfigUrl = 'http://yoziru-desu.github.io/locomo-pebble/?';
var debug = false;

// Function to render main view or first run card
var renderMain = function(settings, curPositionHome, walkingDuration) {
  // render all
  console.log('Rendering Main UI');
  journey.renderView(settings, curPositionHome, walkingDuration, debug);
  configureAppCard.hide();
};

var runApp = function(settings) {
  // get GPS location first
  console.log('Waiting for geolocation');
  configureAppCard.body('');
  configureAppCard.subtitle('Triangulating...');
  configureAppCard.show();
  navigator.geolocation.getCurrentPosition(
    function(e) {
      geo.geo_success(e, settings, renderMain);
    },
    function(e) {
      geo.geo_error(e, settings, renderMain);
    },
    geo.geo_options
  );
};

// Settings
console.log('Loading settings');
var settings = JSON.parse(localStorage.getItem("settings"));
Settings.config(
  { url: config.generateConfigUrl(baseConfigUrl) },
  function(e) {
    config.settingsOpen(e);
  },
  function(e) {
    config.settingsClose(e, settings, runApp, configureAppCard);
  }
);

// Initiate app: onboarding and runapp
if (! settings || settings.length === 0) {
  console.log('No settings found, showing configure card.');
  configureAppCard.show();
} else {
  console.log('Settings found, running app.');
  runApp(settings);
}
