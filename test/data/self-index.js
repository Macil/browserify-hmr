var assert = require('assert');
assert(!global.hasRun);
global.hasRun = true;

require('./self-dep');

function doCheck() {
  module.hot.check(function(err, outdated) {
    if (err) {
      //console.error('Check error', err);
    }
    if (outdated) {
      module.hot.apply(function(err, outdatedModules) {
        console.error('Should not happen', err);
        process.exit(1);
      });
    } else {
      setTimeout(doCheck, 20);
    }
  });
}
doCheck();
