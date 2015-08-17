var assert = require('assert');

assert.strictEqual(require('./deep-dep-a'), 1);

module.hot.accept('./deep-dep-a', function() {
  assert.strictEqual(require('./deep-dep-a'), 2);
  process.exit(0);
});

function doCheck() {
  module.hot.check(function(err, outdated) {
    if (err) {
      //console.error('Check error', err);
    }
    if (outdated) {
      module.hot.apply(function(err, updated) {
        console.error('Should not happen', err);
        process.exit(1);
      });
    } else {
      setTimeout(doCheck, 20);
    }
  });
}
doCheck();
