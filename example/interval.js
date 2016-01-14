// Advanced HMR example using ud
var ud = require('ud');

var step = ud.defn(module, function() {
  // this function is live-updatable because it's wrapped with ud.defn!
  console.log('interval step');
});

function start() {
  setInterval(step, 5000);
}
module.exports = start;
