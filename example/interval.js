// Advanced HMR example using ud
var ud = require('ud');

var step = ud.defn(module, function() {
  // Because this function is wrapped with `ud.defn`, the old references to the
  // function will be updated to point to the new definition here if this file
  // gets hot reloaded.
  console.log('interval step');
});

function start() {
  setInterval(step, 5000);
}
module.exports = start;
