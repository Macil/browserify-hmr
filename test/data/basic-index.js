var assert = require('assert');

assert.strictEqual(require('./basic-dep'), 1);

module.hot.accept('./basic-dep', function() {
  assert.strictEqual(require('./basic-dep'), 2);
  process.exit(0);
});

function doCheck() {
  module.hot.check(function(err, outdated) {
    if (err) {
      //console.error('Check error', err);
    }
    if (outdated) {
      module.hot.apply(function(err, outdatedModules) {
        console.error('Should not happen');
        process.exit(1);
      });
    } else {
      setTimeout(doCheck, 20);
    }
  });
}
doCheck();
