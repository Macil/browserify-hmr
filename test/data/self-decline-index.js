var assert = require('assert');

assert.strictEqual(require('./self-decline-dep-a'), 1);

module.hot.accept('./self-decline-dep-a', function() {
  console.error("Dependency should not update");
  process.exit(1);
});

function doCheck() {
  module.hot.check(function(err, outdated) {
    if (err) {
      //console.error('Check error', err);
    }
    if (outdated) {
      module.hot.apply(function(err, updated) {
        assert.strictEqual(require('./self-decline-dep-a'), 1);
        if (updated) {
          console.error('Should not happen', err, updated);
          process.exit(1);
        } else {
          //console.log('success, no update');
        }
      });
    } else {
      setTimeout(doCheck, 20);
    }
  });
}
doCheck();
