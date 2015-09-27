(function(global, _main, moduleDefs, cachedModules, _entries) {
  'use strict';

  var moduleMeta = null/*!^^moduleMeta*/;
  var originalEntries = null/*!^^originalEntries*/;
  var updateUrl = null/*!^^updateUrl*/;
  var updateMode = null/*!^^updateMode*/;
  var supportModes = null/*!^^supportModes*/;
  var ignoreUnaccepted = null/*!^^ignoreUnaccepted*/;
  var updateCacheBust = null/*!^^updateCacheBust*/;
  var bundleKey = null/*!^^bundleKey*/;
  var sioPath = null/*!^^sioPath*/;
  var incPath = null/*!^^incPath*/;

  if (!global._hmr) {
    try {
      Object.defineProperty(global, '_hmr', {value: {}});
    } catch(e) {
      global._hmr = {};
    }
  }

  if (!Object.prototype.hasOwnProperty.call(global._hmr, bundleKey)) {
    // Temporary hack so requiring modules works before the _hmr values are
    // correctly initialized.
    global._hmr[bundleKey] = {initModule: function(){}};
  }

  var main = require(incPath);
  var isFirstRun = main(
    moduleDefs, cachedModules, moduleMeta, updateUrl,
    updateMode, supportModes, ignoreUnaccepted, updateCacheBust, bundleKey,
    sioPath ? require(sioPath) : null,
    typeof __filename !== 'undefined' && __filename,
    typeof __dirname !== 'undefined' && __dirname
  );
  if (isFirstRun) {
    for (var i=0, len=originalEntries.length; i<len; i++) {
      require(originalEntries[i]);
    }
  }
}).call(
  this,
  typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},
  arguments[3], arguments[4], arguments[5], arguments[6]
);
