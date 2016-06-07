/* global module */
// Set a configurable with the open callback
var EncodeQueryData = function(data) {
  var ret = [];
  for (var d in data) {
    console.log(d, data[d]);
    ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
  }
  return ret.join("&");
};

var generateConfigUrl = function(baseConfigUrl) {
  var generatedUrl;
  var settings = JSON.parse(localStorage.getItem("settings"));
  console.log(settings);
  if (! settings || settings.length === 0) {
    generatedUrl = baseConfigUrl;
  } else {
    generatedUrl = baseConfigUrl + EncodeQueryData(settings);
    console.log(generatedUrl);
  }

  return generatedUrl;
};

var settingsOpen = function (e) {  
  // Callback when config webview is opened
  console.log("Opening Config");
};

var settingsClose = function(e, settings, runApp, configureAppCard) {
  // Callback when config webview is closed
  try {
    settings = JSON.parse(decodeURIComponent(e.response));
    localStorage.clear();
    localStorage.setItem("settings", JSON.stringify(settings));
    console.log("Settings saved to localStorage");
    runApp(settings);
  } catch(err) {
    if (! settings || settings.length === 0) {
      settings = null;
      console.log("No JSON response or received Cancel event");
      configureAppCard.subtitle('Welcome!');
      configureAppCard.body('Add your home and work stop in the Pebble phone app to get started');
      configureAppCard.show();
    } else {
      console.log("Cancelled config page");
      runApp(settings);
    }
  }
};

module.exports =  {
  generateConfigUrl: generateConfigUrl,
  settingsOpen: settingsOpen,
  settingsClose: settingsClose
};
