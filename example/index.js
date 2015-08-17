global.runCount = (global.runCount||0) + 1;

console.log('index start');
require('./a');
console.log('index end');

if (module.hot) {
  module.hot.accept('./a', function() {
    console.log('index accepted new a');
    console.log('exports of a', require('./a'));
  });

  if (global.runCount === 1) {
    setInterval(function() {
      module.hot.check(function(err, outdatedModules) {
        console.log('check callback', err, outdatedModules);
        if (outdatedModules) {
          module.hot.apply(function(err, outdatedModules) {
            console.log('apply callback', err, outdatedModules);
          });
        }
      });
    }, 1000);
  }
}
