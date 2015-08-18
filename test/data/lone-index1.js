var assert = require('assert');
var self = require('./lone-index');

function doCheck() {
  module.hot.check(function(err, outdated) {
    if (err) {
      //console.error('Check error', err);
    }
    if (outdated) {
      module.hot.apply(function(err, updated) {
        if (updated) {
          console.error('Should not happen', err, updated);
          process.exit(1);
        }
      });
    } else {
      setTimeout(doCheck, 20);
    }
  });
}
doCheck();
